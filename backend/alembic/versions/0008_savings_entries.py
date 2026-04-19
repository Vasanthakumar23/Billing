"""savings entries

Revision ID: 0008_savings_entries
Revises: 0007_student_billing_window
Create Date: 2026-04-18 15:10:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0008_savings_entries"
down_revision = "0007_student_billing_window"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "savings_entries",
        sa.Column("student_id", sa.Uuid(as_uuid=True), sa.ForeignKey("students.id"), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("mode", postgresql.ENUM("cash", "upi", "bank", name="payment_mode", create_type=False), nullable=False),
        sa.Column("reference_no", sa.String(length=100), nullable=True),
        sa.Column("notes", sa.String(length=500), nullable=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_by", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("retracted_from_id", sa.Uuid(as_uuid=True), sa.ForeignKey("savings_entries.id"), nullable=True),
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("amount <> 0", name="ck_savings_entries_amount_nonzero"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("retracted_from_id"),
    )


def downgrade() -> None:
    op.drop_table("savings_entries")
