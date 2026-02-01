"""init schema

Revision ID: 0001_init_schema
Revises: 
Create Date: 2026-02-01

"""

from __future__ import annotations

import os
import uuid

from alembic import op
import sqlalchemy as sa
from passlib.context import CryptContext


revision = "0001_init_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    user_role = sa.Enum("admin", name="user_role")
    student_status = sa.Enum("active", "inactive", name="student_status")
    payment_mode = sa.Enum("cash", "upi", "bank", name="payment_mode")
    user_role.create(op.get_bind(), checkfirst=True)
    student_status.create(op.get_bind(), checkfirst=True)
    payment_mode.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("username", sa.String(length=100), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    op.create_table(
        "students",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("student_code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("class_name", sa.String(length=100), nullable=True),
        sa.Column("section", sa.String(length=50), nullable=True),
        sa.Column("status", student_status, nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_students_student_code", "students", ["student_code"], unique=True)

    op.create_table(
        "student_fee",
        sa.Column(
            "student_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("students.id", ondelete="CASCADE"),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "expected_fee_amount",
            sa.Numeric(12, 2),
            nullable=False,
            server_default="0",
        ),
        sa.Column("last_fee_updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "last_fee_updated_by",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.CheckConstraint("expected_fee_amount >= 0", name="ck_student_fee_expected_fee_nonnegative"),
    )

    op.create_table(
        "receipt_sequence",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("prefix", sa.String(length=20), nullable=False, server_default="FEE-"),
        sa.Column("current_number", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "payments",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("receipt_no", sa.String(length=50), nullable=False),
        sa.Column("student_id", sa.Uuid(as_uuid=True), sa.ForeignKey("students.id"), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("mode", payment_mode, nullable=False),
        sa.Column("reference_no", sa.String(length=100), nullable=True),
        sa.Column("notes", sa.String(length=500), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_by", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("amount <> 0", name="ck_payments_amount_nonzero"),
    )
    op.create_index("ix_payments_receipt_no", "payments", ["receipt_no"], unique=True)
    op.execute(
        "CREATE INDEX ix_payments_student_paid_at ON payments (student_id, paid_at DESC)"
    )

    receipt_prefix = os.getenv("RECEIPT_PREFIX") or "FEE-"
    op.execute(
        sa.text(
            "INSERT INTO receipt_sequence (id, prefix, current_number, updated_at) VALUES (1, :prefix, 0, NOW())"
        ).bindparams(prefix=receipt_prefix)
    )

    pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
    admin_id = uuid.uuid4()
    admin_hash = pwd.hash("admin123")
    op.execute(
        sa.text(
            "INSERT INTO users (id, username, password_hash, role, created_at) VALUES (:id, 'admin', :ph, 'admin', NOW())"
        ).bindparams(id=admin_id, ph=admin_hash)
    )

    op.execute(
        """
        CREATE OR REPLACE VIEW student_balance_vw AS
        SELECT
            s.id AS student_id,
            s.student_code,
            s.name,
            COALESCE(sf.expected_fee_amount, 0)::numeric(12,2) AS expected_fee,
            COALESCE(p.paid_total, 0)::numeric(12,2) AS paid_total,
            (COALESCE(sf.expected_fee_amount, 0) - COALESCE(p.paid_total, 0))::numeric(12,2) AS pending
        FROM students s
        LEFT JOIN student_fee sf ON sf.student_id = s.id
        LEFT JOIN (
            SELECT student_id, SUM(amount) AS paid_total
            FROM payments
            GROUP BY student_id
        ) p ON p.student_id = s.id;
        """
    )


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS student_balance_vw")
    op.drop_index("ix_payments_student_paid_at", table_name="payments")
    op.drop_index("ix_payments_receipt_no", table_name="payments")
    op.drop_table("payments")
    op.drop_table("receipt_sequence")
    op.drop_table("student_fee")
    op.drop_index("ix_students_student_code", table_name="students")
    op.drop_table("students")
    op.drop_index("ix_users_username", table_name="users")
    op.drop_table("users")

    sa.Enum("cash", "upi", "bank", name="payment_mode").drop(op.get_bind(), checkfirst=True)
    sa.Enum("active", "inactive", name="student_status").drop(op.get_bind(), checkfirst=True)
    sa.Enum("admin", name="user_role").drop(op.get_bind(), checkfirst=True)
