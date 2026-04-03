from __future__ import annotations

import re
from calendar import month_abbr, month_name
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

_BATCH_RE = re.compile(r"^\s*(\d{4})\s*-\s*(\d{4})\s*$")


def normalize_month(value: date) -> date:
    return date(value.year, value.month, 1)


def add_months(value: date, months: int) -> date:
    total = (value.year * 12 + (value.month - 1)) + months
    return date(total // 12, total % 12 + 1, 1)


def month_label(value: date) -> str:
    return f"{month_abbr[value.month]} {value.year}"


def month_name_label(month: int) -> str:
    return month_name[month]


def cycle_months_for(mode: PaymentCycle) -> int:
    mapping = {
        PaymentCycle.monthly: 1,
        PaymentCycle.bi_monthly: 2,
        PaymentCycle.tri_monthly: 3,
    }
    return mapping[mode]


def payment_period_months(value: str | None) -> int:
    normalized = "" if value is None else value.strip().lower()
    compact = normalized.replace(" ", "").replace("-", "").replace("_", "")
    mapping = {
        "monthly": 1,
        "month": 1,
        "bimonthly": 2,
        "twomonthly": 2,
        "quarterly": 3,
        "quarter": 3,
        "trimonthly": 3,
        "halfyearly": 6,
        "halfyear": 6,
        "semiannual": 6,
        "semiyearly": 6,
        "annual": 12,
        "annually": 12,
        "yearly": 12,
        "fullyear": 12,
    }
    return mapping.get(compact, 1)


def payment_period_label(value: str | None) -> str:
    months = payment_period_months(value)
    normalized = "" if value is None else value.strip()
    if normalized:
        compact = normalized.lower().replace(" ", "").replace("-", "").replace("_", "")
        if compact in {"monthly", "month"}:
            return "Monthly"
        if compact in {"bimonthly", "twomonthly"}:
            return "Bi-Monthly"
        if compact in {"quarterly", "quarter", "trimonthly"}:
            return "Quarterly"
        if compact in {"halfyearly", "halfyear", "semiannual", "semiyearly"}:
            return "Half Yearly"
        if compact in {"annual", "annually", "yearly", "fullyear"}:
            return "Full Year"
        return normalized
    defaults = {
        1: "Monthly",
        2: "Bi-Monthly",
        3: "Quarterly",
        6: "Half Yearly",
        12: "Full Year",
    }
    return defaults.get(months, f"{months} Months")


def cycle_mode_for_months(months: int | None) -> PaymentCycle | None:
    if months == 1:
        return PaymentCycle.monthly
    if months == 2:
        return PaymentCycle.bi_monthly
    if months == 3:
        return PaymentCycle.tri_monthly
    return None


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
    cycle_label: str
    cycle_months: int
    payable_amount: Decimal
    batch: str | None
    batch_start_month: int
    batch_start_label: str
    batch_end_label: str
    next_unpaid_month: date
    pending_months: list[dict]
    months: list[dict]


@dataclass
class BillingListSnapshot:
    last_paid_label: str | None
    next_due_label: str | None
    next_due_state: str | None


def batch_start_month_for(student: Student) -> int:
    value = student.batch_start_month or 1
    return min(max(value, 1), 12)


def batch_range_for(student: Student) -> tuple[date, date]:
    start_month = batch_start_month_for(student)
    if student.batch:
        match = _BATCH_RE.match(student.batch)
        if match:
            start_year = int(match.group(1))
            end_year = int(match.group(2))
            expected_end_year = start_year + (1 if start_month != 1 else 0)
            if end_year == expected_end_year:
                start = date(start_year, start_month, 1)
                return start, add_months(start, 11)
    anchor = student.joined_date or datetime.now(UTC).date()
    start_year = anchor.year if anchor.month >= start_month else anchor.year - 1
    start = date(start_year, start_month, 1)
    return start, add_months(start, 11)


def cycle_start_months(batch_start: date, cycle_months: int) -> list[date]:
    starts: list[date] = []
    cursor = batch_start
    while cursor <= add_months(batch_start, 11):
        starts.append(cursor)
        cursor = add_months(cursor, cycle_months)
    return starts


def _compress_month_ranges(months: list[date]) -> list[tuple[date, date]]:
    if not months:
        return []
    ordered = sorted({normalize_month(month) for month in months})
    ranges: list[tuple[date, date]] = []
    range_start = ordered[0]
    previous = ordered[0]
    for current in ordered[1:]:
        if current == add_months(previous, 1):
            previous = current
            continue
        ranges.append((range_start, previous))
        range_start = current
        previous = current
    ranges.append((range_start, previous))
    return ranges


def fee_period_label_for_months(months: list[date]) -> str | None:
    if not months:
        return None
    parts: list[str] = []
    for start, end in _compress_month_ranges(months):
        if start == end:
            parts.append(month_label(start))
        else:
            parts.append(f"{month_label(start)} - {month_label(end)}")
    return ", ".join(parts)


def compact_fee_period_label_for_months(months: list[date]) -> str | None:
    if not months:
        return None
    parts: list[str] = []
    for start, end in _compress_month_ranges(months):
        if start == end:
            parts.append(month_label(start))
        elif start.year == end.year:
            parts.append(f"{month_abbr[start.month]}-{month_abbr[end.month]} {start.year}")
        else:
            parts.append(f"{month_label(start)} - {month_label(end)}")
    return ", ".join(parts)


def get_student_billing_overview(
    db: Session,
    student: Student,
    *,
    window_past: int = 12,
    window_future: int = 12,
) -> BillingOverview:
    monthly_fee = get_student_monthly_fee(db, student.id)
    cycle_months = payment_period_months(student.payment_period)
    cycle_label = payment_period_label(student.payment_period)
    payable_amount = monthly_fee * Decimal(cycle_months)
    batch_start, batch_end = batch_range_for(student)
    rows = (
        db.execute(
            select(StudentBillingPeriod)
            .where(StudentBillingPeriod.student_id == student.id)
            .order_by(StudentBillingPeriod.period_month)
        )
        .scalars()
        .all()
    )
    paid_map = {
        normalize_month(row.period_month): row
        for row in rows
        if row.payment_id is not None and batch_start <= normalize_month(row.period_month) <= batch_end
    }

    months: list[dict] = []
    cursor = batch_start
    while cursor <= batch_end:
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

    cycle_starts = cycle_start_months(batch_start, cycle_months)
    months_by_value = {item["month"]: item for item in months}
    next_unpaid = batch_start
    for cycle_start in cycle_starts:
        window = [months_by_value.get(add_months(cycle_start, offset)) for offset in range(cycle_months)]
        if all(item is not None and not item["is_paid"] for item in window):
            next_unpaid = cycle_start
            break
    else:
        next_unpaid = cycle_starts[-1] if cycle_starts else batch_start
    pending_months = [m for m in months if not m["is_paid"]]

    return BillingOverview(
        monthly_fee=monthly_fee,
        cycle_label=cycle_label,
        cycle_months=cycle_months,
        payable_amount=payable_amount,
        batch=student.batch,
        batch_start_month=batch_start.month,
        batch_start_label=month_label(batch_start),
        batch_end_label=month_label(batch_end),
        next_unpaid_month=next_unpaid,
        pending_months=pending_months,
        months=months,
    )


def billing_list_snapshot(overview: BillingOverview) -> BillingListSnapshot:
    paid_months = [item["month"] for item in overview.months if item["is_paid"]]
    pending_months = [item["month"] for item in overview.pending_months]
    last_paid_label = month_label(paid_months[-1]) if paid_months else None

    if not pending_months:
        return BillingListSnapshot(
            last_paid_label=last_paid_label,
            next_due_label=None,
            next_due_state=None,
        )

    batch_start = overview.months[0]["month"]
    first_pending = pending_months[0]
    month_offset = ((first_pending.year - batch_start.year) * 12) + (first_pending.month - batch_start.month)
    carry_forward_count = month_offset % overview.cycle_months
    if carry_forward_count > 0:
        due_months = pending_months[:carry_forward_count]
        next_due_state = "pending"
    else:
        due_months = pending_months[: overview.cycle_months]
        next_due_state = "upcoming"

    return BillingListSnapshot(
        last_paid_label=last_paid_label,
        next_due_label=compact_fee_period_label_for_months(due_months),
        next_due_state=next_due_state,
    )


def validate_selected_months_unpaid(
    db: Session,
    student: Student,
    selected_months: list[date],
) -> list[StudentBillingPeriod]:
    batch_start, batch_end = batch_range_for(student)
    target_months = sorted({normalize_month(month) for month in selected_months})
    if not target_months:
        raise ValueError("Select at least one month to record payment")
    invalid = [month_label(month) for month in target_months if month < batch_start or month > batch_end]
    if invalid:
        raise ValueError(
            f"Selected months must be within the batch period {month_label(batch_start)} - {month_label(batch_end)}: {', '.join(invalid)}"
        )
    existing = (
        db.execute(
            select(StudentBillingPeriod).where(
                StudentBillingPeriod.student_id == student.id,
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
            row = StudentBillingPeriod(student_id=student.id, period_month=month)
            db.add(row)
        rows.append(row)
    return rows


def assign_periods_to_payment(
    db: Session,
    student: Student,
    payment: Payment,
    selected_months: list[date],
) -> None:
    paid_at = payment.paid_at
    for row in validate_selected_months_unpaid(db, student, selected_months):
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
