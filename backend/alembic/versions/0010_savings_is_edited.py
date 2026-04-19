"""add is_edited to savings_entries

Revision ID: 0010_savings_is_edited
Revises: 0009_add_updated_at
Create Date: 2026-04-19

"""

from alembic import op
import sqlalchemy as sa


revision = "0010_savings_is_edited"
down_revision = "0009_add_updated_at"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("savings_entries", sa.Column("is_edited", sa.Boolean(), nullable=False, server_default="false"))


def downgrade() -> None:
    op.drop_column("savings_entries", "is_edited")
