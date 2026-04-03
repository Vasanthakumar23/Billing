"""student import metadata

Revision ID: 0003_student_import_metadata
Revises: 0002_billing_cycles_and_periods
Create Date: 2026-03-23

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0003_student_import_metadata"
down_revision = "0002_billing_cycles_and_periods"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("students", sa.Column("serial_no", sa.Integer(), nullable=True))
    op.add_column("students", sa.Column("payment_period", sa.String(length=50), nullable=True))
    op.add_column("students", sa.Column("joined_date", sa.Date(), nullable=True))
    op.add_column("students", sa.Column("batch", sa.String(length=20), nullable=True))


def downgrade() -> None:
    op.drop_column("students", "batch")
    op.drop_column("students", "joined_date")
    op.drop_column("students", "payment_period")
    op.drop_column("students", "serial_no")
