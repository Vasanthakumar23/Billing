from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric
from sqlalchemy import Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class StudentFee(Base):
    __tablename__ = "student_fee"
    __table_args__ = (
        CheckConstraint("expected_fee_amount >= 0", name="ck_student_fee_expected_fee_nonnegative"),
    )

    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("students.id", ondelete="CASCADE"),
        primary_key=True,
    )
    expected_fee_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, server_default="0"
    )
    last_fee_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_fee_updated_by: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=True)

    student: Mapped["Student"] = relationship(back_populates="fee")

