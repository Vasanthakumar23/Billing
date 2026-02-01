from __future__ import annotations

from datetime import UTC, date, datetime, time

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.enums import StudentStatus
from app.models.payment import Payment
from app.models.student import Student
from app.models.student_balance_view import StudentBalanceView
from app.models.user import User


router = APIRouter()


@router.get("/summary", response_model=dict)
def summary(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    from_dt: datetime | None = Query(default=None, alias="from"),
    to_dt: datetime | None = Query(default=None, alias="to"),
) -> dict:
    stmt = select(func.coalesce(func.sum(Payment.amount), 0))
    if from_dt:
        stmt = stmt.where(Payment.paid_at >= from_dt)
    if to_dt:
        stmt = stmt.where(Payment.paid_at <= to_dt)
    total_collected = db.execute(stmt).scalar_one()

    now = datetime.now(UTC)
    today_start = datetime.combine(now.date(), time.min, tzinfo=UTC)
    month_start = datetime(now.year, now.month, 1, tzinfo=UTC)
    today_total = db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.paid_at >= today_start)
    ).scalar_one()
    month_total = db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.paid_at >= month_start)
    ).scalar_one()

    pending_total = db.execute(select(func.coalesce(func.sum(StudentBalanceView.pending), 0))).scalar_one()
    return {
        "total_collected": str(total_collected),
        "today_total": str(today_total),
        "month_total": str(month_total),
        "pending_total": str(pending_total),
    }


@router.get("/pending", response_model=list[dict])
def pending(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    status: StudentStatus | None = None,
) -> list[dict]:
    stmt = select(StudentBalanceView).join(Student, Student.id == StudentBalanceView.student_id)
    if status is not None:
        stmt = stmt.where(Student.status == status)
    rows = db.execute(stmt.order_by(StudentBalanceView.pending.desc())).scalars().all()
    return [
        {
            "student_id": r.student_id,
            "student_code": r.student_code,
            "name": r.name,
            "expected_fee": str(r.expected_fee),
            "paid_total": str(r.paid_total),
            "pending": str(r.pending),
        }
        for r in rows
        if r.pending != 0
    ]


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
