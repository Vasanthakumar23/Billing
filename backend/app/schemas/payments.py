from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator

from app.models.enums import PaymentCycle, PaymentMode


class PaymentCreate(BaseModel):
    student_id: uuid.UUID | None = None
    student_code: str = Field(min_length=1, max_length=50)
    mode: PaymentMode
    billing_start_month: date | None = None
    selected_months: list[date] = Field(default_factory=list)
    cycle_mode: PaymentCycle | None = None
    paid_at: datetime | None = None
    reference_no: str | None = Field(default=None, max_length=100)
    notes: str | None = Field(default=None, max_length=500)


class PaymentRead(BaseModel):
    id: uuid.UUID
    receipt_no: str
    academic_period: str
    bill_no: str
    student_id: uuid.UUID
    student_name: str | None = None
    student_code: str | None = None
    amount: Decimal
    mode: PaymentMode
    reference_no: str | None = None
    notes: str | None = None
    paid_at: datetime
    created_by: uuid.UUID
    created_at: datetime
    billing_start_month: date | None = None
    billing_cycle_months: int | None = None
    cycle_mode: PaymentCycle | None = None
    fee_period_label: str | None = None
    next_due_label: str | None = None
    pending_amount: Decimal | None = None

    @field_validator("bill_no", mode="before")
    @classmethod
    def _format_bill_no(cls, value: object) -> str:
        if value is None:
            return ""
        if isinstance(value, int):
            return str(value).zfill(4)
        return str(value)

    class Config:
        from_attributes = True


class PaymentReverseRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=300)
    amount: Decimal | None = None
