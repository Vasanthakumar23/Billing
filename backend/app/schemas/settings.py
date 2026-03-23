from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.enums import PaymentCycle


class BillingSettingsRead(BaseModel):
    cycle_mode: PaymentCycle
    cycle_months: int
    updated_at: datetime
    updated_by: uuid.UUID | None


class BillingSettingsUpdate(BaseModel):
    cycle_mode: PaymentCycle


class DatabaseResetRequest(BaseModel):
    confirmation_text: str


class DatabaseResetRead(BaseModel):
    students_deleted: int
    payments_deleted: int
    billing_periods_deleted: int
    fee_records_deleted: int
    receipt_sequence_reset: bool
    billing_cycle_reset_to_default: bool
