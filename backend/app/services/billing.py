from __future__ import annotations

from calendar import month_abbr
from dataclasses import dataclass
from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.billing_settings import BillingSettings
from app.models.enums import PaymentCycle
from app.models.payment import Payment
from app.models.student import Student
from app.models.student_billing_period import StudentBillingPeriod
from app.models.student_fee import StudentFee


def normalize_month(value: date) -> date:
    return date(value.year, value.month, 1)


def add_months(value: date, months: int) -> date:
    total = (value.year * 12 + (value.month - 1)) + months
    return date(total // 12, total % 12 + 1, 1)


def month_label(value: date) -> str:
    return f"{month_abbr[value.month]} {value.year}"


def cycle_months_for(mode: PaymentCycle) -> int:
    mapping = {
        PaymentCycle.monthly: 1,
        PaymentCycle.bi_monthly: 2,
        PaymentCycle.tri_monthly: 3,
    }
    return mapping[mode]


def get_billing_settings(db: Session) -> BillingSettings:
    settings = db.get(BillingSettings, 1)
    if not settings:
        settings = BillingSettings(id=1, cycle_mode=PaymentCycle.tri_monthly)
        db.add(settings)
        db.flush()
    return settings


def get_student_monthly_fee(db: Session, student_id) -> Decimal:
    fee = db.get(StudentFee, student_id)
    if not fee:
        fee = StudentFee(student_id=student_id, expected_fee_amount=Decimal("0"))
        db.add(fee)
        db.flush()
    return Decimal(fee.expected_fee_amount)


@dataclass
class BillingOverview:
    monthly_fee: Decimal
    cycle_mode: PaymentCycle
    cycle_months: int
    payable_amount: Decimal
    next_unpaid_month: date
    pending_months: list[dict]
    months: list[dict]


def get_student_billing_overview(
    db: Session,
    student: Student,
    *,
    window_past: int = 12,
    window_future: int = 12,
) -> BillingOverview:
    settings = get_billing_settings(db)
    monthly_fee = get_student_monthly_fee(db, student.id)
    cycle_months = cycle_months_for(settings.cycle_mode)
    payable_amount = monthly_fee * Decimal(cycle_months)

    today_month = normalize_month(datetime.now(UTC).date())
    rows = (
        db.execute(
            select(StudentBillingPeriod)
            .where(StudentBillingPeriod.student_id == student.id)
            .order_by(StudentBillingPeriod.period_month)
        )
        .scalars()
        .all()
    )
    paid_map = {normalize_month(row.period_month): row for row in rows if row.payment_id is not None}

    start_candidates = [today_month, *(paid_map.keys())]
    end_candidates = [today_month, *(paid_map.keys())]
    range_start = add_months(min(start_candidates), -window_past)
    range_end = add_months(max(end_candidates), window_future)

    months: list[dict] = []
    cursor = range_start
    while cursor <= range_end:
        period = paid_map.get(cursor)
        months.append(
            {
                "month": cursor,
                "label": month_label(cursor),
                "is_paid": period is not None,
                "receipt_no": period.payment.receipt_no if period and period.payment else None,
            }
        )
        cursor = add_months(cursor, 1)

    all_unpaid_months = [m for m in months if not m["is_paid"]]
    next_unpaid = all_unpaid_months[0]["month"] if all_unpaid_months else today_month
    pending_months = [m for m in months if m["month"] >= next_unpaid and not m["is_paid"]][:12]

    return BillingOverview(
        monthly_fee=monthly_fee,
        cycle_mode=settings.cycle_mode,
        cycle_months=cycle_months,
        payable_amount=payable_amount,
        next_unpaid_month=next_unpaid,
        pending_months=pending_months[:12],
        months=months,
    )


def validate_cycle_window_unpaid(
    db: Session,
    student_id,
    start_month: date,
    cycle_months: int,
) -> list[StudentBillingPeriod]:
    normalized_start = normalize_month(start_month)
    target_months = [add_months(normalized_start, idx) for idx in range(cycle_months)]
    existing = (
        db.execute(
            select(StudentBillingPeriod).where(
                StudentBillingPeriod.student_id == student_id,
                StudentBillingPeriod.period_month.in_(target_months),
            )
        )
        .scalars()
        .all()
    )
    existing_map = {normalize_month(row.period_month): row for row in existing}

    conflicting = [month_label(m) for m in target_months if existing_map.get(m) and existing_map[m].payment_id]
    if conflicting:
        conflict_text = ", ".join(conflicting)
        raise ValueError(f"Billing period already paid for: {conflict_text}")

    rows: list[StudentBillingPeriod] = []
    for month in target_months:
        row = existing_map.get(month)
        if not row:
            row = StudentBillingPeriod(student_id=student_id, period_month=month)
            db.add(row)
        rows.append(row)
    return rows


def assign_periods_to_payment(
    db: Session,
    payment: Payment,
    start_month: date,
    cycle_months: int,
) -> None:
    paid_at = payment.paid_at
    for row in validate_cycle_window_unpaid(db, payment.student_id, start_month, cycle_months):
        row.payment = payment
        row.paid_at = paid_at


def release_payment_periods(original_payment: Payment) -> None:
    for row in original_payment.billing_periods:
        row.payment = None
        row.paid_at = None


def fee_period_label(start_month: date | None, cycle_months: int | None) -> str | None:
    if not start_month or not cycle_months:
        return None
    end_month = add_months(start_month, cycle_months - 1)
    if start_month == end_month:
        return month_label(start_month)
    return f"{month_label(start_month)} - {month_label(end_month)}"


def pending_amount(overview: BillingOverview) -> Decimal:
    return overview.monthly_fee * Decimal(len(overview.pending_months))
