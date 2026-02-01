from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.enums import StudentStatus


class StudentCreate(BaseModel):
    student_code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=200)
    class_name: str | None = Field(default=None, max_length=100)
    section: str | None = Field(default=None, max_length=50)


class StudentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    class_name: str | None = Field(default=None, max_length=100)
    section: str | None = Field(default=None, max_length=50)
    status: StudentStatus | None = None


class StudentRead(BaseModel):
    id: uuid.UUID
    student_code: str
    name: str
    class_name: str | None
    section: str | None
    status: StudentStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StudentFeeRead(BaseModel):
    student_id: uuid.UUID
    expected_fee_amount: Decimal
    last_fee_updated_at: datetime | None
    last_fee_updated_by: uuid.UUID | None

    class Config:
        from_attributes = True


class StudentListItem(BaseModel):
    id: uuid.UUID
    student_code: str
    name: str
    class_name: str | None
    section: str | None
    status: StudentStatus
    expected_fee: Decimal
    paid_total: Decimal
    pending: Decimal

    class Config:
        from_attributes = True


class StudentFeeUpdate(BaseModel):
    expected_fee_amount: Decimal = Field(ge=0)


class StudentBalanceRead(BaseModel):
    student_id: uuid.UUID
    student_code: str
    name: str
    expected_fee: Decimal
    paid_total: Decimal
    pending: Decimal

    class Config:
        from_attributes = True
