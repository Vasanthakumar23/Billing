from __future__ import annotations

import uuid
from datetime import UTC, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.enums import PaymentMode
from app.models.payment import Payment
from app.models.receipt_sequence import ReceiptSequence
from app.models.student import Student
from app.models.user import User
from app.schemas.payments import PaymentCreate, PaymentRead, PaymentReverseRequest
from app.services.bill_pdf import format_bill_no, render_bill_pdf
from app.services.billing import (
    add_months,
    assign_periods_to_payment,
    batch_range_for,
    billing_list_snapshot,
    cycle_mode_for_months,
    fee_period_label,
    fee_period_label_for_months,
    get_student_billing_overview,
    get_student_monthly_fee,
    payment_period_months,
    pending_amount,
    release_payment_periods,
)


router = APIRouter()


def _lock_receipt_sequence(db: Session) -> ReceiptSequence:
    seq = (
        db.execute(
            select(ReceiptSequence).where(ReceiptSequence.id == 1).with_for_update()
        )
        .scalars()
        .one_or_none()
    )
    if not seq:
        seq = ReceiptSequence(id=1)
        db.add(seq)
        db.flush()
        db.refresh(seq)
    return seq


def _generate_receipt_no(db: Session) -> str:
    seq = _lock_receipt_sequence(db)
    seq.current_number += 1
    seq.updated_at = datetime.now(UTC)
    receipt_no = f"{seq.prefix}{seq.current_number}"
    return receipt_no


def _academic_period_for_student(student: Student) -> str:
    batch_start, batch_end = batch_range_for(student)
    return f"{batch_start.year}-{batch_end.year}"


def _generate_bill_no(db: Session, academic_period: str) -> int:
    seq = _lock_receipt_sequence(db)
    seq.updated_at = datetime.now(UTC)
    current = (
        db.execute(select(func.max(Payment.bill_no)).where(Payment.academic_period == academic_period))
        .scalar_one()
    )
    next_bill_no = (current or 0) + 1
    if next_bill_no > 4000:
        raise HTTPException(status_code=409, detail=f"Bill number limit reached for academic period {academic_period}")
    return next_bill_no


def _parse_bill_no(value: str) -> int:
    normalized = value.strip()
    if not normalized.isdigit():
        raise HTTPException(status_code=422, detail="bill_no must be numeric")
    return int(normalized)


@router.post("", response_model=PaymentRead, status_code=201)
def create_payment(
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaymentRead:
    student = db.execute(select(Student).where(Student.student_code == payload.student_code)).scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found for the provided roll number")
    if payload.student_id and student.id != payload.student_id:
        raise HTTPException(status_code=409, detail="Student ID and roll number do not match")

    selected_months = sorted({month for month in payload.selected_months})
    if not selected_months and payload.billing_start_month:
        cycle_months = payment_period_months(student.payment_period)
        selected_months = [add_months(payload.billing_start_month, offset) for offset in range(cycle_months)]
    if not selected_months:
        raise HTTPException(status_code=422, detail="Select at least one month to record payment")
    cycle_months = len(selected_months)
    monthly_fee = get_student_monthly_fee(db, student.id)
    amount = monthly_fee * Decimal(cycle_months)
    if amount == 0:
        raise HTTPException(status_code=422, detail="Monthly fee must be greater than zero")

    academic_period = _academic_period_for_student(student)
    receipt_no = _generate_receipt_no(db)
    bill_no = _generate_bill_no(db, academic_period)
    payment = Payment(
        receipt_no=receipt_no,
        academic_period=academic_period,
        bill_no=bill_no,
        student_id=student.id,
        amount=amount,
        mode=payload.mode,
        reference_no=payload.reference_no,
        notes=payload.notes,
        billing_start_month=selected_months[0],
        billing_cycle_months=cycle_months,
        paid_at=payload.paid_at or datetime.now(UTC),
        created_by=current_user.id,
    )
    db.add(payment)
    try:
        assign_periods_to_payment(db, student, payment, selected_months)
        db.flush()
        db.refresh(payment)
        response = _payment_read(db, payment)
        db.commit()
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc))
    except Exception:
        db.rollback()
        raise
    return response


@router.get("", response_model=dict)
def list_payments(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    student_id: uuid.UUID | None = None,
    mode: PaymentMode | None = None,
    bill_no: str | None = None,
    from_dt: datetime | None = Query(default=None, alias="from"),
    to_dt: datetime | None = Query(default=None, alias="to"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
) -> dict:
    stmt = select(Payment)
    if student_id:
        stmt = stmt.where(Payment.student_id == student_id)
    if mode is not None:
        stmt = stmt.where(Payment.mode == mode)
    if bill_no:
        stmt = stmt.where(Payment.bill_no == _parse_bill_no(bill_no))
    if from_dt:
        stmt = stmt.where(Payment.paid_at >= from_dt)
    if to_dt:
        stmt = stmt.where(Payment.paid_at <= to_dt)

    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    items = (
        db.execute(
            stmt.order_by(Payment.paid_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        .scalars()
        .all()
    )
    return {"items": [_payment_read(db, p) for p in items], "total": total}


@router.post("/{payment_id}/reverse", response_model=PaymentRead, status_code=201)
def reverse_payment(
    payment_id: uuid.UUID,
    payload: PaymentReverseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaymentRead:
    original = db.get(Payment, payment_id)
    if not original:
        raise HTTPException(status_code=404, detail="Payment not found")

    if payload.amount is not None and payload.amount == 0:
        raise HTTPException(status_code=422, detail="amount must be non-zero")

    sign = Decimal("-1") if Decimal(original.amount) > 0 else Decimal("1")
    reversal_amount = (
        sign * abs(payload.amount)
        if payload.amount is not None
        else Decimal(original.amount) * Decimal("-1")
    )

    receipt_no = _generate_receipt_no(db)
    bill_no = _generate_bill_no(db, original.academic_period)
    reason_note = f"REVERSAL of {original.receipt_no}: {payload.reason}"
    notes = reason_note if not original.notes else f"{reason_note} | orig_notes: {original.notes}"
    reversal = Payment(
        receipt_no=receipt_no,
        academic_period=original.academic_period,
        bill_no=bill_no,
        student_id=original.student_id,
        amount=reversal_amount,
        mode=original.mode,
        reference_no=original.reference_no,
        notes=notes,
        billing_start_month=original.billing_start_month,
        billing_cycle_months=original.billing_cycle_months,
        paid_at=datetime.now(UTC),
        created_by=current_user.id,
    )
    db.add(reversal)
    try:
        release_payment_periods(original)
        db.flush()
        db.refresh(reversal)
        response = _payment_read(db, reversal)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return response


@router.get("/{payment_id}/receipt", response_model=PaymentRead)
def get_payment_receipt(
    payment_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> PaymentRead:
    payment = db.get(Payment, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return _payment_read(db, payment)


@router.get("/{payment_id}/receipt.pdf")
def download_receipt_pdf(
    payment_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Response:
    payment = db.get(Payment, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    student = db.get(Student, payment.student_id)
    overview = get_student_billing_overview(db, student) if student else None
    snapshot = billing_list_snapshot(overview) if overview else None
    selected_months = [period.period_month for period in payment.billing_periods]
    period_label = fee_period_label_for_months(selected_months) or fee_period_label(payment.billing_start_month, payment.billing_cycle_months) or "N/A"
    pdf = render_bill_pdf(
        bill_no=payment.bill_no,
        student_name=student.name if student else "Unknown Student",
        student_code=student.student_code if student else "-",
        fee_period=period_label,
        amount=str(payment.amount),
        payment_date=payment.paid_at.strftime("%d-%m-%Y"),
        next_due=snapshot.next_due_label if snapshot and snapshot.next_due_label else "-",
        pending=str(pending_amount(overview)) if overview else "-",
        remarks=payment.reference_no or payment.notes or "-",
    )
    headers = {"Content-Disposition": f'attachment; filename="{payment.receipt_no}.pdf"'}
    return Response(content=pdf, media_type="application/pdf", headers=headers)


def _payment_read(db: Session, payment: Payment) -> PaymentRead:
    data = PaymentRead.model_validate(payment).model_dump()
    data["bill_no"] = format_bill_no(payment.bill_no)
    data["student_name"] = payment.student.name if payment.student else None
    data["student_code"] = payment.student.student_code if payment.student else None
    data["cycle_mode"] = cycle_mode_for_months(payment.billing_cycle_months)
    selected_months = [period.period_month for period in payment.billing_periods]
    data["fee_period_label"] = fee_period_label_for_months(selected_months) or fee_period_label(payment.billing_start_month, payment.billing_cycle_months)
    if payment.student:
        overview = get_student_billing_overview(db, payment.student)
        snapshot = billing_list_snapshot(overview)
        data["next_due_label"] = snapshot.next_due_label
        data["pending_amount"] = pending_amount(overview)
    return PaymentRead.model_validate(data)
