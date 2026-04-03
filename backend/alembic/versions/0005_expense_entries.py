"""expense entries

Revision ID: 0005_expense_entries
Revises: 0004_student_batch_start_month
Create Date: 2026-03-29

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0005_expense_entries"
down_revision = "0004_student_batch_start_month"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "expense_entries",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("expense_month", sa.Date(), nullable=False),
        sa.Column("title", sa.String(length=150), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("notes", sa.String(length=300), nullable=True),
        sa.Column("created_by", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("amount >= 0", name="ck_expense_entries_amount_nonnegative"),
    )
    op.create_index("ix_expense_entries_expense_month", "expense_entries", ["expense_month"])


def downgrade() -> None:
    op.drop_index("ix_expense_entries_expense_month", table_name="expense_entries")
    op.drop_table("expense_entries")
