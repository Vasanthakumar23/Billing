from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.enums import StudentStatus


class StudentCreate(BaseModel):
    serial_no: int | None = None
    student_code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=200)
    class_name: str | None = Field(default=None, max_length=100)
    section: str | None = Field(default=None, max_length=50)
    payment_period: str | None = Field(default=None, max_length=50)
    joined_date: date | None = None
    batch: str | None = Field(default=None, max_length=20)
    batch_start_month: int | None = Field(default=None, ge=1, le=12)


class StudentUpdate(BaseModel):
    serial_no: int | None = None
    name: str | None = Field(default=None, min_length=1, max_length=200)
    class_name: str | None = Field(default=None, max_length=100)
    section: str | None = Field(default=None, max_length=50)
    payment_period: str | None = Field(default=None, max_length=50)
    joined_date: date | None = None
    batch: str | None = Field(default=None, max_length=20)
    batch_start_month: int | None = Field(default=None, ge=1, le=12)
    status: StudentStatus | None = None


class StudentRead(BaseModel):
    id: uuid.UUID
    serial_no: int | None = None
    student_code: str
    name: str
    class_name: str | None
    section: str | None
    payment_period: str | None = None
    joined_date: date | None = None
    batch: str | None = None
    batch_start_month: int | None = None
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
    serial_no: int | None = None
    student_code: str
    name: str
    class_name: str | None
    section: str | None
    payment_period: str | None = None
    joined_date: date | None = None
    batch: str | None = None
    batch_start_month: int | None = None
    status: StudentStatus
    expected_fee: Decimal
    paid_total: Decimal
    pending: Decimal
    last_paid_label: str | None = None
    next_due_label: str | None = None
    next_due_state: str | None = None

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


class StudentBillingMonthStatus(BaseModel):
    month: date
    label: str
    is_paid: bool
    receipt_no: str | None = None


class StudentBillingOverviewRead(BaseModel):
    student_id: uuid.UUID
    monthly_fee: Decimal
    cycle_label: str
    cycle_months: int
    payable_amount: Decimal
    batch: str | None = None
    batch_start_month: int
    batch_start_label: str
    batch_end_label: str
    next_unpaid_month: date
    next_unpaid_label: str
    pending_months: list[StudentBillingMonthStatus]
    months: list[StudentBillingMonthStatus]


class StudentImportMapping(BaseModel):
    serial_no: str | None = None
    student_code: str | None = None
    name: str | None = None
    class_name: str | None = None
    expected_fee: str | None = None
    payment_period: str | None = None
    joined_date: str | None = None


class StudentImportPreviewRead(BaseModel):
    headers: list[str]
    suggested_mapping: StudentImportMapping
    sample_rows: list[dict[str, str | None]]
    required_fields: list[str]


class StudentImportResult(BaseModel):
    created: int
    updated: int
    fee_updated: int
    errors: list[dict]
