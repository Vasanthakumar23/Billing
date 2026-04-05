from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin_user
from app.core.database import get_db
from app.models.billing_settings import BillingSettings
from app.models.enums import PaymentCycle
from app.models.payment import Payment
from app.models.receipt_sequence import ReceiptSequence
from app.models.student import Student
from app.models.student_billing_period import StudentBillingPeriod
from app.models.student_fee import StudentFee
from app.models.user import User
from app.schemas.settings import (
    BillingSettingsRead,
    BillingSettingsUpdate,
    DatabaseResetRead,
    DatabaseResetRequest,
    RandomBillRequest,
)
from app.services.bill_pdf import render_custom_bill_pdf
from app.services.billing import cycle_months_for, get_billing_settings


router = APIRouter()

RESET_CONFIRMATION_TEXT = "DELETE ALL DATA"


@router.get("/billing", response_model=BillingSettingsRead)
def get_billing_settings_route(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> BillingSettingsRead:
    settings = get_billing_settings(db)
    return BillingSettingsRead(
        cycle_mode=settings.cycle_mode,
        cycle_months=cycle_months_for(settings.cycle_mode),
        updated_at=settings.updated_at,
        updated_by=settings.updated_by,
    )


@router.patch("/billing", response_model=BillingSettingsRead)
def update_billing_settings_route(
    payload: BillingSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_user),
) -> BillingSettingsRead:
    settings = get_billing_settings(db)
    settings.cycle_mode = payload.cycle_mode
    settings.updated_at = datetime.now(UTC)
    settings.updated_by = current_user.id
    db.commit()
    db.refresh(settings)
    return BillingSettingsRead(
        cycle_mode=settings.cycle_mode,
        cycle_months=cycle_months_for(settings.cycle_mode),
        updated_at=settings.updated_at,
        updated_by=settings.updated_by,
    )


@router.post("/database/reset", response_model=DatabaseResetRead)
def reset_database_route(
    payload: DatabaseResetRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_user),
) -> DatabaseResetRead:
    if payload.confirmation_text.strip() != RESET_CONFIRMATION_TEXT:
        raise HTTPException(status_code=422, detail=f'Type "{RESET_CONFIRMATION_TEXT}" to confirm this action')

    students_deleted = db.execute(select(func.count()).select_from(Student)).scalar_one()
    payments_deleted = db.execute(select(func.count()).select_from(Payment)).scalar_one()
    billing_periods_deleted = db.execute(select(func.count()).select_from(StudentBillingPeriod)).scalar_one()
    fee_records_deleted = db.execute(select(func.count()).select_from(StudentFee)).scalar_one()

    settings = get_billing_settings(db)
    receipt_sequence = db.get(ReceiptSequence, 1)
    try:
        db.execute(delete(StudentBillingPeriod))
        db.execute(delete(Payment))
        db.execute(delete(StudentFee))
        db.execute(delete(Student))

        if receipt_sequence is None:
            receipt_sequence = ReceiptSequence(id=1, current_number=0)
            db.add(receipt_sequence)
        else:
            receipt_sequence.current_number = 0
            receipt_sequence.updated_at = datetime.now(UTC)

        settings.cycle_mode = PaymentCycle.tri_monthly
        settings.updated_at = datetime.now(UTC)
        settings.updated_by = current_user.id

        db.commit()
    except Exception:
        db.rollback()
        raise

    return DatabaseResetRead(
        students_deleted=students_deleted,
        payments_deleted=payments_deleted,
        billing_periods_deleted=billing_periods_deleted,
        fee_records_deleted=fee_records_deleted,
        receipt_sequence_reset=True,
        billing_cycle_reset_to_default=True,
    )


@router.post("/random-bill.pdf")
def generate_random_bill_pdf(
    payload: RandomBillRequest,
    _: User = Depends(require_admin_user),
) -> Response:
    pdf = render_custom_bill_pdf(fields=[(field.label.strip(), field.value.strip()) for field in payload.fields])
    filename = (payload.file_name.strip() if payload.file_name else "random-bill") or "random-bill"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}.pdf"'},
    )
