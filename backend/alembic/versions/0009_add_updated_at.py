"""add updated_at to tables missing it

Revision ID: 0009_add_updated_at
Revises: 0008_savings_entries
Create Date: 2026-04-19

"""

from alembic import op
import sqlalchemy as sa


revision = "0009_add_updated_at"
down_revision = "0008_savings_entries"
branch_labels = None
depends_on = None

TABLES = ["users", "payments", "student_billing_periods", "expense_entries"]


def upgrade() -> None:
    for table in TABLES:
        op.add_column(table, sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True))
        op.execute(f"UPDATE {table} SET updated_at = created_at")
        op.alter_column(table, "updated_at", nullable=False)


def downgrade() -> None:
    for table in TABLES:
        op.drop_column(table, "updated_at")
