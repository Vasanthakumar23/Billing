from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.enums import PaymentMode


class SavingsEntryCreate(BaseModel):
    student_id: uuid.UUID | None = None
    student_code: str = Field(min_length=1, max_length=50)
    amount: Decimal
    mode: PaymentMode
    reference_no: str | None = Field(default=None, max_length=100)
    notes: str | None = Field(default=None, max_length=500)
    recorded_at: datetime | None = None


class SavingsEntryEdit(BaseModel):
    amount: Decimal = Field(description="New amount (positive = plus, negative = minus)")
    notes: str | None = Field(default=None, max_length=500)


class SavingsEntryRead(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    student_name: str | None = None
    student_code: str | None = None
    amount: Decimal
    mode: PaymentMode
    reference_no: str | None = None
    notes: str | None = None
    recorded_at: datetime
    created_by: uuid.UUID
    created_at: datetime
    retracted_from_id: uuid.UUID | None = None
    is_retraction: bool = False
    is_edited: bool = False

    class Config:
        from_attributes = True


class StudentSavingsBalanceRead(BaseModel):
    student_id: uuid.UUID
    student_code: str
    student_name: str
    total_savings: Decimal
