from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy import Numeric, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class StudentBalanceView(Base):
    __tablename__ = "student_balance_vw"

    student_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    student_code: Mapped[str] = mapped_column(String)
    name: Mapped[str] = mapped_column(String)
    expected_fee: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    paid_total: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    pending: Mapped[Decimal] = mapped_column(Numeric(12, 2))
