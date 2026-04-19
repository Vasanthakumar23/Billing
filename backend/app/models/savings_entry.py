from __future__ import annotations

import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, Numeric, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import PaymentMode


class SavingsEntry(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "savings_entries"
    __table_args__ = (CheckConstraint("amount <> 0", name="ck_savings_entries_amount_nonzero"),)

    student_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("students.id"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    mode: Mapped[PaymentMode] = mapped_column(Enum(PaymentMode, name="payment_mode"), nullable=False)
    reference_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    created_by: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    retracted_from_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("savings_entries.id"), unique=True, nullable=True
    )
    is_edited: Mapped[bool] = mapped_column(default=False, nullable=False)

    student: Mapped["Student"] = relationship(back_populates="savings_entries")
    retracted_from: Mapped["SavingsEntry | None"] = relationship(remote_side="SavingsEntry.id")
