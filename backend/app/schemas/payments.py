from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.enums import PaymentCycle, PaymentMode


class PaymentCreate(BaseModel):
    student_id: uuid.UUID | None = None
    student_code: str = Field(min_length=1, max_length=50)
    mode: PaymentMode
    billing_start_month: date
    cycle_mode: PaymentCycle | None = None
    paid_at: datetime | None = None
    reference_no: str | None = Field(default=None, max_length=100)
    notes: str | None = Field(default=None, max_length=500)


class PaymentRead(BaseModel):
    id: uuid.UUID
    receipt_no: str
    student_id: uuid.UUID
    student_name: str | None = None
    student_code: str | None = None
    amount: Decimal
    mode: PaymentMode
    reference_no: str | None
    notes: str | None
    paid_at: datetime
    created_by: uuid.UUID
    created_at: datetime
    billing_start_month: date | None
    billing_cycle_months: int | None
    cycle_mode: PaymentCycle | None = None
    fee_period_label: str | None

    class Config:
        from_attributes = True


class PaymentReverseRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=300)
    amount: Decimal | None = None
