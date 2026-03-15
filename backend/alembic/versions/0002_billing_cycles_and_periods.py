"""billing cycles and billing periods

Revision ID: 0002_billing_cycles_and_periods
Revises: 0001_init_schema
Create Date: 2026-03-14

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0002_billing_cycles_and_periods"
down_revision = "0001_init_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            CREATE TYPE payment_cycle AS ENUM ('monthly', 'bi_monthly', 'tri_monthly');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
        """
    )

    payment_cycle = postgresql.ENUM(
        "monthly", "bi_monthly", "tri_monthly", name="payment_cycle", create_type=False
    )

    op.create_table(
        "billing_settings",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("cycle_mode", payment_cycle, nullable=False, server_default="tri_monthly"),
        sa.Column("updated_by", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.execute(
        sa.text(
            "INSERT INTO billing_settings (id, cycle_mode, updated_at) VALUES (1, 'tri_monthly', NOW())"
        )
    )

    op.add_column("payments", sa.Column("billing_start_month", sa.Date(), nullable=True))
    op.add_column("payments", sa.Column("billing_cycle_months", sa.Integer(), nullable=True))

    op.create_table(
        "student_billing_periods",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "student_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("students.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("period_month", sa.Date(), nullable=False),
        sa.Column(
            "payment_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("payments.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("student_id", "period_month", name="uq_student_period_month"),
    )


def downgrade() -> None:
    op.drop_table("student_billing_periods")
    op.drop_column("payments", "billing_cycle_months")
    op.drop_column("payments", "billing_start_month")
    op.drop_table("billing_settings")
    sa.Enum("monthly", "bi_monthly", "tri_monthly", name="payment_cycle").drop(op.get_bind(), checkfirst=True)
