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
from app.services.billing import (
    assign_periods_to_payment,
    cycle_months_for,
    fee_period_label,
    get_billing_settings,
    get_student_monthly_fee,
    release_payment_periods,
)


router = APIRouter()


def _generate_receipt_no(db: Session) -> str:
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

    seq.current_number += 1
    seq.updated_at = datetime.now(UTC)
    receipt_no = f"{seq.prefix}{seq.current_number}"
    return receipt_no


@router.post("", response_model=PaymentRead, status_code=201)
def create_payment(
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaymentRead:
    student = db.get(Student, payload.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    settings = get_billing_settings(db)
    cycle_months = cycle_months_for(settings.cycle_mode)
    monthly_fee = get_student_monthly_fee(db, student.id)
    amount = monthly_fee * Decimal(cycle_months)
    if amount == 0:
        raise HTTPException(status_code=422, detail="Monthly fee must be greater than zero")

    receipt_no = _generate_receipt_no(db)
    payment = Payment(
        receipt_no=receipt_no,
        student_id=payload.student_id,
        amount=amount,
        mode=payload.mode,
        reference_no=payload.reference_no,
        notes=payload.notes,
        billing_start_month=payload.billing_start_month,
        billing_cycle_months=cycle_months,
        paid_at=payload.paid_at or datetime.now(UTC),
        created_by=current_user.id,
    )
    db.add(payment)
    try:
        assign_periods_to_payment(db, payment, payload.billing_start_month, cycle_months)
        db.commit()
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc))
    db.refresh(payment)
    return _payment_read(payment)


@router.get("", response_model=dict)
def list_payments(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    student_id: uuid.UUID | None = None,
    mode: PaymentMode | None = None,
    receipt_no: str | None = None,
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
    if receipt_no:
        stmt = stmt.where(Payment.receipt_no == receipt_no)
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
    return {"items": [_payment_read(p) for p in items], "total": total}


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
    reason_note = f"REVERSAL of {original.receipt_no}: {payload.reason}"
    notes = reason_note if not original.notes else f"{reason_note} | orig_notes: {original.notes}"
    reversal = Payment(
        receipt_no=receipt_no,
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
    release_payment_periods(original)
    db.commit()
    db.refresh(reversal)
    return _payment_read(reversal)


@router.get("/{payment_id}/receipt", response_model=PaymentRead)
def get_payment_receipt(
    payment_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> PaymentRead:
    payment = db.get(Payment, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return _payment_read(payment)


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
    period_label = fee_period_label(payment.billing_start_month, payment.billing_cycle_months) or "N/A"
    pdf = _render_receipt_pdf(
        receipt_no=payment.receipt_no,
        student_name=student.name if student else "Unknown Student",
        fee_period=period_label,
        amount=str(payment.amount),
        payment_date=payment.paid_at.strftime("%Y-%m-%d %H:%M:%S UTC"),
        payment_reference=payment.reference_no or "-",
    )
    headers = {"Content-Disposition": f'attachment; filename="{payment.receipt_no}.pdf"'}
    return Response(content=pdf, media_type="application/pdf", headers=headers)


def _payment_read(payment: Payment) -> PaymentRead:
    data = PaymentRead.model_validate(payment).model_dump()
    data["student_name"] = payment.student.name if payment.student else None
    data["student_code"] = payment.student.student_code if payment.student else None
    data["fee_period_label"] = fee_period_label(payment.billing_start_month, payment.billing_cycle_months)
    return PaymentRead.model_validate(data)


def _render_receipt_pdf(
    *,
    receipt_no: str,
    student_name: str,
    fee_period: str,
    amount: str,
    payment_date: str,
    payment_reference: str,
) -> bytes:
    lines = [
        "Institution Billing Receipt",
        f"Receipt: {receipt_no}",
        f"Student: {student_name}",
        f"Fee Period: {fee_period}",
        f"Amount Paid: {amount}",
        f"Payment Date: {payment_date}",
        f"Reference: {payment_reference}",
    ]
    escaped = [line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)") for line in lines]
    content = ["BT", "/F1 18 Tf", "50 780 Td"]
    for index, line in enumerate(escaped):
        if index == 0:
            content.append(f"({line}) Tj")
        else:
            content.append("0 -28 Td")
            content.append("/F1 12 Tf")
            content.append(f"({line}) Tj")
    content.append("ET")
    stream = "\n".join(content).encode("ascii")
    objects: list[bytes] = []
    objects.append(b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n")
    objects.append(b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n")
    objects.append(
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n"
    )
    objects.append(b"4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n")
    objects.append(f"5 0 obj << /Length {len(stream)} >> stream\n".encode("ascii") + stream + b"\nendstream endobj\n")

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objects:
        offsets.append(len(pdf))
        pdf.extend(obj)
    xref_start = len(pdf)
    pdf.extend(f"xref\n0 {len(offsets)}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    pdf.extend(
        f"trailer << /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref_start}\n%%EOF".encode("ascii")
    )
    return bytes(pdf)
