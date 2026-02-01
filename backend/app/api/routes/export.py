from __future__ import annotations

import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.payment import Payment
from app.models.student import Student
from app.models.student_balance_view import StudentBalanceView
from app.models.user import User


router = APIRouter()


def _csv_response(filename: str, rows: list[list[str]]) -> Response:
    buf = io.StringIO()
    writer = csv.writer(buf)
    for row in rows:
        writer.writerow(row)
    content = buf.getvalue()
    return Response(
        content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/students.csv")
def export_students_csv(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Response:
    students = db.execute(select(Student).order_by(Student.student_code)).scalars().all()
    rows = [
        ["student_code", "name", "class_name", "section", "status", "created_at"],
        *[
            [
                s.student_code,
                s.name,
                s.class_name or "",
                s.section or "",
                s.status.value,
                s.created_at.isoformat(),
            ]
            for s in students
        ],
    ]
    return _csv_response("students.csv", rows)


@router.get("/payments.csv")
def export_payments_csv(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    student_id: str | None = None,
    from_dt: datetime | None = Query(default=None, alias="from"),
    to_dt: datetime | None = Query(default=None, alias="to"),
) -> Response:
    stmt = select(Payment).order_by(Payment.paid_at.desc())
    if student_id:
        stmt = stmt.where(Payment.student_id == student_id)
    if from_dt:
        stmt = stmt.where(Payment.paid_at >= from_dt)
    if to_dt:
        stmt = stmt.where(Payment.paid_at <= to_dt)
    payments = db.execute(stmt).scalars().all()
    rows = [
        [
            "receipt_no",
            "student_id",
            "amount",
            "mode",
            "reference_no",
            "notes",
            "paid_at",
            "created_by",
        ],
        *[
            [
                p.receipt_no,
                str(p.student_id),
                str(p.amount),
                p.mode.value,
                p.reference_no or "",
                p.notes or "",
                p.paid_at.isoformat(),
                str(p.created_by),
            ]
            for p in payments
        ],
    ]
    return _csv_response("payments.csv", rows)


@router.get("/pending.csv")
def export_pending_csv(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Response:
    rows_data = db.execute(select(StudentBalanceView).order_by(StudentBalanceView.pending.desc())).scalars().all()
    rows = [
        ["student_code", "name", "expected_fee", "paid_total", "pending"],
        *[
            [
                r.student_code,
                r.name,
                str(r.expected_fee),
                str(r.paid_total),
                str(r.pending),
            ]
            for r in rows_data
            if r.pending != 0
        ],
    ]
    return _csv_response("pending.csv", rows)
