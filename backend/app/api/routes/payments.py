from __future__ import annotations

import uuid
from datetime import UTC, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
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
    if payload.amount == 0:
        raise HTTPException(status_code=422, detail="amount must be non-zero")

    student = db.get(Student, payload.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    receipt_no = _generate_receipt_no(db)
    payment = Payment(
        receipt_no=receipt_no,
        student_id=payload.student_id,
        amount=payload.amount,
        mode=payload.mode,
        reference_no=payload.reference_no,
        notes=payload.notes,
        paid_at=payload.paid_at or datetime.now(UTC),
        created_by=current_user.id,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return PaymentRead.model_validate(payment)


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
    return {"items": [PaymentRead.model_validate(p) for p in items], "total": total}


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
        paid_at=datetime.now(UTC),
        created_by=current_user.id,
    )
    db.add(reversal)
    db.commit()
    db.refresh(reversal)
    return PaymentRead.model_validate(reversal)
