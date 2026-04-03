"""student batch start month

Revision ID: 0004_student_batch_start_month
Revises: 0003_student_import_metadata
Create Date: 2026-03-29

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0004_student_batch_start_month"
down_revision = "0003_student_import_metadata"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("students", sa.Column("batch_start_month", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("students", "batch_start_month")
