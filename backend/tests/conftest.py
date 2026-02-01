import os

# Ensure settings are resolvable during import.
os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.database import SessionLocal, engine
from app.core.security import hash_password
from app.main import create_app
from app.models import Base
from app.models.enums import UserRole
from app.models.user import User


@pytest.fixture(scope="function")
def db_session():
    tables = [t for t in Base.metadata.sorted_tables if t.name != "student_balance_vw"]
    Base.metadata.create_all(bind=engine, tables=tables)
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE VIEW student_balance_vw AS
                SELECT
                    s.id AS student_id,
                    s.student_code,
                    s.name,
                    COALESCE(sf.expected_fee_amount, 0) AS expected_fee,
                    COALESCE(p.paid_total, 0) AS paid_total,
                    (COALESCE(sf.expected_fee_amount, 0) - COALESCE(p.paid_total, 0)) AS pending
                FROM students s
                LEFT JOIN student_fee sf ON sf.student_id = s.id
                LEFT JOIN (
                    SELECT student_id, SUM(amount) AS paid_total
                    FROM payments
                    GROUP BY student_id
                ) p ON p.student_id = s.id;
                """
            )
        )

    db = SessionLocal()
    try:
        admin = User(username="admin", password_hash=hash_password("admin123"), role=UserRole.admin)
        db.add(admin)
        db.commit()
        yield db
    finally:
        db.close()
        with engine.begin() as conn:
            conn.execute(text("DROP VIEW IF EXISTS student_balance_vw"))
        Base.metadata.drop_all(bind=engine, tables=tables)


@pytest.fixture(scope="function")
def client(db_session):
    app = create_app()
    return TestClient(app)


def auth_header(client: TestClient) -> dict[str, str]:
    resp = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

