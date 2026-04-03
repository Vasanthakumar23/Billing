from __future__ import annotations

from datetime import UTC, date, datetime

from sqlalchemy import Date, DateTime, Enum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import StudentStatus


class Student(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "students"

    serial_no: Mapped[int | None] = mapped_column(Integer, nullable=True)
    student_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    class_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    section: Mapped[str | None] = mapped_column(String(50), nullable=True)
    payment_period: Mapped[str | None] = mapped_column(String(50), nullable=True)
    joined_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    batch: Mapped[str | None] = mapped_column(String(20), nullable=True)
    batch_start_month: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[StudentStatus] = mapped_column(
        Enum(StudentStatus, name="student_status"), nullable=False, default=StudentStatus.active
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    fee: Mapped["StudentFee"] = relationship(
        back_populates="student", cascade="all, delete-orphan", uselist=False
    )
    payments: Mapped[list["Payment"]] = relationship(back_populates="student")
    billing_periods: Mapped[list["StudentBillingPeriod"]] = relationship(
        back_populates="student", cascade="all, delete-orphan"
    )
