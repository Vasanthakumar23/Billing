from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.student import Student
from app.models.student_balance_view import StudentBalanceView
from app.models.student_fee import StudentFee
from app.models.user import User
from app.models.enums import StudentStatus
from app.schemas.students import (
    StudentCreate,
    StudentListItem,
    StudentBalanceRead,
    StudentFeeRead,
    StudentFeeUpdate,
    StudentRead,
    StudentUpdate,
)


router = APIRouter()


@router.get("", response_model=dict)
def list_students(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    search: str | None = None,
    status: StudentStatus | None = None,
    class_name: str | None = None,
    section: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
) -> dict:
    stmt = select(Student)

    if search:
        s = f"%{search.lower()}%"
        stmt = stmt.where(
            or_(func.lower(Student.student_code).like(s), func.lower(Student.name).like(s))
        )
    if status is not None:
        stmt = stmt.where(Student.status == status)
    if class_name:
        stmt = stmt.where(Student.class_name == class_name)
    if section:
        stmt = stmt.where(Student.section == section)

    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    items = (
        db.execute(
            stmt.order_by(Student.student_code)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        .scalars()
        .all()
    )
    return {"items": [StudentRead.model_validate(s) for s in items], "total": total}


@router.get("/balances", response_model=dict)
def list_student_balances(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    search: str | None = None,
    status: StudentStatus | None = None,
    class_name: str | None = None,
    section: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
) -> dict:
    stmt = (
        select(
            Student.id,
            Student.student_code,
            Student.name,
            Student.class_name,
            Student.section,
            Student.status,
            StudentBalanceView.expected_fee,
            StudentBalanceView.paid_total,
            StudentBalanceView.pending,
        )
        .join(StudentBalanceView, StudentBalanceView.student_id == Student.id)
    )

    if search:
        s = f"%{search.lower()}%"
        stmt = stmt.where(
            or_(func.lower(Student.student_code).like(s), func.lower(Student.name).like(s))
        )
    if status is not None:
        stmt = stmt.where(Student.status == status)
    if class_name:
        stmt = stmt.where(Student.class_name == class_name)
    if section:
        stmt = stmt.where(Student.section == section)

    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    rows = (
        db.execute(
            stmt.order_by(Student.student_code)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        .all()
    )
    items = [
        StudentListItem(
            id=r.id,
            student_code=r.student_code,
            name=r.name,
            class_name=r.class_name,
            section=r.section,
            status=r.status,
            expected_fee=r.expected_fee,
            paid_total=r.paid_total,
            pending=r.pending,
        )
        for r in rows
    ]
    return {"items": items, "total": total}


@router.post("", response_model=StudentRead, status_code=201)
def create_student(
    payload: StudentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> StudentRead:
    existing = db.execute(select(Student).where(Student.student_code == payload.student_code)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="student_code already exists")

    student = Student(
        student_code=payload.student_code,
        name=payload.name,
        class_name=payload.class_name,
        section=payload.section,
    )
    student.fee = StudentFee(expected_fee_amount=0)
    db.add(student)
    db.commit()
    db.refresh(student)
    return StudentRead.model_validate(student)


@router.get("/{student_id}", response_model=StudentRead)
def get_student(
    student_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> StudentRead:
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return StudentRead.model_validate(student)


@router.get("/{student_id}/balance", response_model=StudentBalanceRead)
def get_student_balance(
    student_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> StudentBalanceRead:
    row = (
        db.execute(
            select(StudentBalanceView).where(StudentBalanceView.student_id == student_id)
        )
        .scalars()
        .one_or_none()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Student not found")
    return StudentBalanceRead.model_validate(row)


@router.patch("/{student_id}", response_model=StudentRead)
def update_student(
    student_id: uuid.UUID,
    payload: StudentUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> StudentRead:
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(student, key, value)

    db.commit()
    db.refresh(student)
    return StudentRead.model_validate(student)


@router.patch("/{student_id}/fee", response_model=StudentFeeRead)
def update_student_fee(
    student_id: uuid.UUID,
    payload: StudentFeeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StudentFeeRead:
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    fee = db.get(StudentFee, student_id)
    if not fee:
        fee = StudentFee(student_id=student_id)
        db.add(fee)

    fee.expected_fee_amount = payload.expected_fee_amount
    fee.last_fee_updated_at = datetime.now(UTC)
    fee.last_fee_updated_by = current_user.id

    db.commit()
    db.refresh(fee)
    return StudentFeeRead.model_validate(fee)


@router.get("/{student_id}/fee", response_model=StudentFeeRead)
def get_student_fee(
    student_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> StudentFeeRead:
    fee = db.get(StudentFee, student_id)
    if not fee:
        fee = StudentFee(student_id=student_id)
        db.add(fee)
        db.commit()
        db.refresh(fee)
    return StudentFeeRead.model_validate(fee)
