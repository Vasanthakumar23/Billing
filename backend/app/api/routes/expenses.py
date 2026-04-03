from __future__ import annotations

from datetime import UTC, date, datetime, time
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin_user
from app.core.database import get_db
from app.models.expense_entry import ExpenseEntry
from app.models.payment import Payment
from app.models.student_billing_period import StudentBillingPeriod
from app.models.user import User
from app.schemas.expenses import ExpenseItemRead, ExpenseMonthlyRead, ExpenseMonthlyUpsert


router = APIRouter()


def _normalize_month(value: date) -> date:
    return date(value.year, value.month, 1)


def _month_label(value: date) -> str:
    return value.strftime("%b %Y")


@router.get("/monthly", response_model=ExpenseMonthlyRead)
def get_monthly_expenses(
    month: date = Query(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ExpenseMonthlyRead:
    normalized_month = _normalize_month(month)
    billed_rows = (
        db.execute(
            select(StudentBillingPeriod, Payment)
            .join(Payment, StudentBillingPeriod.payment_id == Payment.id)
            .where(StudentBillingPeriod.period_month == normalized_month)
        )
        .all()
    )
    income_total = sum(
        (
            Decimal(payment.amount) / Decimal(payment.billing_cycle_months or 1)
            for _, payment in billed_rows
        ),
        start=Decimal("0"),
    )
    items = (
        db.execute(
            select(ExpenseEntry)
            .where(ExpenseEntry.expense_month == normalized_month)
            .order_by(ExpenseEntry.created_at.asc(), ExpenseEntry.id.asc())
        )
        .scalars()
        .all()
    )
    expense_total = sum((Decimal(item.amount) for item in items), start=Decimal("0"))
    return ExpenseMonthlyRead(
        month=normalized_month,
        month_label=_month_label(normalized_month),
        income_total=income_total,
        expense_total=expense_total,
        net_total=income_total - expense_total,
        items=[ExpenseItemRead.model_validate(item) for item in items],
    )


@router.put("/monthly", response_model=ExpenseMonthlyRead)
def upsert_monthly_expenses(
    payload: ExpenseMonthlyUpsert,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_user),
) -> ExpenseMonthlyRead:
    normalized_month = _normalize_month(payload.month)
    db.execute(delete(ExpenseEntry).where(ExpenseEntry.expense_month == normalized_month))
    for item in payload.items:
        db.add(
            ExpenseEntry(
                expense_month=normalized_month,
                title=item.title.strip(),
                amount=item.amount,
                notes=item.notes.strip() if item.notes else None,
                created_by=current_user.id,
            )
        )
    db.commit()
    return get_monthly_expenses(month=normalized_month, db=db, _=current_user)
