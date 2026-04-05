"""payment bill numbers by academic period

Revision ID: 0006_payment_bill_numbers
Revises: 0005_expense_entries
Create Date: 2026-04-03
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0006_payment_bill_numbers"
down_revision = "0005_expense_entries"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("payments", sa.Column("academic_period", sa.String(length=20), nullable=True))
    op.add_column("payments", sa.Column("bill_no", sa.Integer(), nullable=True))

    op.execute(
        """
        WITH payment_periods AS (
            SELECT
                p.id,
                COALESCE(NULLIF(TRIM(s.batch), ''), CONCAT(EXTRACT(YEAR FROM p.paid_at)::int, '-', EXTRACT(YEAR FROM p.paid_at)::int)) AS academic_period
            FROM payments p
            JOIN students s ON s.id = p.student_id
        ),
        numbered AS (
            SELECT
                id,
                academic_period,
                ROW_NUMBER() OVER (PARTITION BY academic_period ORDER BY paid_at, id) AS bill_no
            FROM (
                SELECT p.id, p.paid_at, pp.academic_period
                FROM payments p
                JOIN payment_periods pp ON pp.id = p.id
            ) x
        )
        UPDATE payments p
        SET academic_period = n.academic_period,
            bill_no = n.bill_no
        FROM numbered n
        WHERE p.id = n.id
        """
    )

    op.alter_column("payments", "academic_period", nullable=False)
    op.alter_column("payments", "bill_no", nullable=False)
    op.create_index("ix_payments_academic_period", "payments", ["academic_period"], unique=False)
    op.create_index("ux_payments_academic_period_bill_no", "payments", ["academic_period", "bill_no"], unique=True)


def downgrade() -> None:
    op.drop_index("ux_payments_academic_period_bill_no", table_name="payments")
    op.drop_index("ix_payments_academic_period", table_name="payments")
    op.drop_column("payments", "bill_no")
    op.drop_column("payments", "academic_period")
