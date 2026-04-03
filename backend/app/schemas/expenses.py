from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class ExpenseItemWrite(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    amount: Decimal = Field(ge=0)
    notes: str | None = Field(default=None, max_length=300)


class ExpenseMonthlyUpsert(BaseModel):
    month: date
    items: list[ExpenseItemWrite]


class ExpenseItemRead(BaseModel):
    id: uuid.UUID
    expense_month: date
    title: str
    amount: Decimal
    notes: str | None = None
    created_by: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True


class ExpenseMonthlyRead(BaseModel):
    month: date
    month_label: str
    income_total: Decimal
    expense_total: Decimal
    net_total: Decimal
    items: list[ExpenseItemRead]
