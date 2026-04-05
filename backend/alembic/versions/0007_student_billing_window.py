"""student billing window

Revision ID: 0007_student_billing_window
Revises: 0006_payment_bill_numbers
Create Date: 2026-04-05

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0007_student_billing_window"
down_revision = "0006_payment_bill_numbers"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("students", sa.Column("billing_start_month", sa.Integer(), nullable=True))
    op.add_column("students", sa.Column("billing_end_month", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("students", "billing_end_month")
    op.drop_column("students", "billing_start_month")
