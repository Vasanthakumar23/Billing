from __future__ import annotations

from datetime import UTC, date, datetime, time
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.enums import StudentStatus
from app.models.payment import Payment
from app.models.student import Student
from app.models.user import User
from app.services.billing import get_student_billing_overview, normalize_month, pending_amount


router = APIRouter()


@router.get("/summary", response_model=dict)
def summary(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    from_dt: datetime | None = Query(default=None, alias="from"),
    to_dt: datetime | None = Query(default=None, alias="to"),
    month: date | None = Query(default=None),
) -> dict:
    selected_month = normalize_month(month or datetime.now(UTC).date())
    month_start = datetime.combine(selected_month, time.min, tzinfo=UTC)
    if selected_month.month == 12:
        next_month = date(selected_month.year + 1, 1, 1)
    else:
        next_month = date(selected_month.year, selected_month.month + 1, 1)
    next_month_start = datetime.combine(next_month, time.min, tzinfo=UTC)

    stmt = select(func.coalesce(func.sum(Payment.amount), 0))
    if from_dt:
        stmt = stmt.where(Payment.paid_at >= from_dt)
    if to_dt:
        stmt = stmt.where(Payment.paid_at <= to_dt)
    if month is not None:
        stmt = stmt.where(Payment.paid_at >= month_start).where(Payment.paid_at < next_month_start)
    total_collected = db.execute(stmt).scalar_one()

    now = datetime.now(UTC)
    today_start = datetime.combine(now.date(), time.min, tzinfo=UTC)
    today_total = db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.paid_at >= today_start)
    ).scalar_one()
    month_total = db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0))
        .where(Payment.paid_at >= month_start)
        .where(Payment.paid_at < next_month_start)
    ).scalar_one()

    students = db.execute(select(Student)).scalars().all()
    paid_students = 0
    unpaid_students = 0
    pending_total = Decimal("0")
    active_students = 0
    for student in students:
        if student.status == StudentStatus.active:
            overview = get_student_billing_overview(db, student)
            target_month = next((item for item in overview.months if item["month"] == selected_month), None)
            if target_month is None:
                continue
            active_students += 1
            if target_month["is_paid"]:
                paid_students += 1
            else:
                unpaid_students += 1
                pending_total += overview.monthly_fee
    return {
        "total_collected": str(total_collected),
        "today_total": str(today_total),
        "month_total": str(month_total),
        "pending_total": str(pending_total),
        "paid_students": paid_students,
        "unpaid_students": unpaid_students,
        "active_students": active_students,
        "selected_month": selected_month.isoformat(),
    }


@router.get("/pending", response_model=list[dict])
def pending(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    status: StudentStatus | None = None,
) -> list[dict]:
    stmt = select(Student)
    if status is not None:
        stmt = stmt.where(Student.status == status)
    rows = db.execute(stmt.order_by(Student.student_code)).scalars().all()
    items = []
    for student in rows:
        overview = get_student_billing_overview(db, student)
        pending_value = pending_amount(overview)
        if pending_value == 0:
            continue
        paid_total = db.execute(
            select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.student_id == student.id)
        ).scalar_one()
        items.append(
            {
                "student_id": student.id,
                "student_code": student.student_code,
                "name": student.name,
                "expected_fee": str(overview.monthly_fee),
                "paid_total": str(paid_total),
                "pending": str(pending_value),
            }
        )
    items.sort(key=lambda item: Decimal(item["pending"]), reverse=True)
    return items


@router.get("/monthly-students", response_model=list[dict])
def monthly_students(
    month: date = Query(...),
    payment_state: str = Query("unpaid", pattern="^(paid|unpaid|all)$"),
    search: str | None = None,
    class_code: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[dict]:
    selected_month = normalize_month(month)
    stmt = select(Student).where(Student.status == StudentStatus.active).order_by(Student.student_code)
    if search:
        s = f"%{search.lower()}%"
        stmt = stmt.where(
            func.lower(Student.student_code).like(s) | func.lower(Student.name).like(s) | func.lower(Student.class_name).like(s)
        )
    if class_code:
        stmt = stmt.where(Student.student_code.like(f"{class_code.strip()}%"))
    students = db.execute(stmt).scalars().all()
    items: list[dict] = []
    for student in students:
        overview = get_student_billing_overview(db, student)
        target_month = next((item for item in overview.months if item["month"] == selected_month), None)
        if target_month is None:
            continue
        is_paid = bool(target_month["is_paid"])
        if payment_state == "paid" and not is_paid:
            continue
        if payment_state == "unpaid" and is_paid:
            continue
        items.append(
            {
                "student_id": student.id,
                "student_code": student.student_code,
                "name": student.name,
                "class_name": student.class_name,
                "section": student.section,
                "payment_period": overview.cycle_label,
                "monthly_fee": str(overview.monthly_fee),
                "month": selected_month.isoformat(),
                "month_label": target_month["label"],
                "is_paid": is_paid,
                "receipt_no": target_month["receipt_no"],
            }
        )
    return items


@router.get("/daily", response_model=list[dict])
def daily(
    report_date: date = Query(alias="date"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[dict]:
    start = datetime.combine(report_date, time.min, tzinfo=UTC)
    end = datetime.combine(report_date, time.max, tzinfo=UTC)
    rows = (
        db.execute(
            select(Payment.mode, func.coalesce(func.sum(Payment.amount), 0).label("total"))
            .where(Payment.paid_at >= start)
            .where(Payment.paid_at <= end)
            .group_by(Payment.mode)
        )
        .all()
    )
    return [{"mode": mode.value, "total": str(total)} for mode, total in rows]
