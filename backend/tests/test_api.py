from decimal import Decimal
from io import BytesIO

from .conftest import auth_header


def test_login_works(client):
    resp = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["access_token"]
    assert data["token_type"] == "bearer"


def test_create_student_and_update_fee(client):
    headers = auth_header(client)
    s = client.post(
        "/api/students",
        json={"student_code": "S001", "name": "Alice", "class_name": "10", "section": "A"},
        headers=headers,
    )
    assert s.status_code == 201
    student_id = s.json()["id"]

    fee = client.patch(
        f"/api/students/{student_id}/fee",
        json={"expected_fee_amount": 1000},
        headers=headers,
    )
    assert fee.status_code == 200
    assert Decimal(fee.json()["expected_fee_amount"]) == Decimal("1000")


def test_payment_generates_unique_receipt(client):
    headers = auth_header(client)
    s = client.post(
        "/api/students",
        json={"student_code": "S002", "name": "Bob"},
        headers=headers,
    )
    student_id = s.json()["id"]

    p1 = client.post(
        "/api/payments",
        json={"student_id": student_id, "amount": 100, "mode": "cash"},
        headers=headers,
    )
    p2 = client.post(
        "/api/payments",
        json={"student_id": student_id, "amount": 50, "mode": "upi"},
        headers=headers,
    )
    assert p1.status_code == 201
    assert p2.status_code == 201
    assert p1.json()["receipt_no"] != p2.json()["receipt_no"]


def test_reverse_payment_creates_negative_entry(client):
    headers = auth_header(client)
    s = client.post(
        "/api/students",
        json={"student_code": "S003", "name": "Carol"},
        headers=headers,
    )
    student_id = s.json()["id"]

    p = client.post(
        "/api/payments",
        json={"student_id": student_id, "amount": 250, "mode": "bank"},
        headers=headers,
    )
    payment_id = p.json()["id"]

    rev = client.post(
        f"/api/payments/{payment_id}/reverse",
        json={"reason": "Entered twice"},
        headers=headers,
    )
    assert rev.status_code == 201
    assert Decimal(rev.json()["amount"]) == Decimal("-250")
    assert "REVERSAL" in rev.json()["notes"]


def test_pending_calculation_correct(client):
    headers = auth_header(client)
    s = client.post(
        "/api/students",
        json={"student_code": "S004", "name": "Dan"},
        headers=headers,
    )
    student_id = s.json()["id"]

    client.patch(
        f"/api/students/{student_id}/fee",
        json={"expected_fee_amount": 1000},
        headers=headers,
    )
    client.post(
        "/api/payments",
        json={"student_id": student_id, "amount": 400, "mode": "cash"},
        headers=headers,
    )

    pending = client.get("/api/reports/pending", headers=headers)
    assert pending.status_code == 200
    rows = pending.json()
    row = next(r for r in rows if r["student_code"] == "S004")
    assert Decimal(row["pending"]) == Decimal("600")


def test_import_students_from_excel(client):
    from openpyxl import Workbook

    headers = auth_header(client)
    wb = Workbook()
    ws = wb.active
    ws.append(["rollno", "name", "std", "section", "fees"])
    ws.append(["S010", "Eve", "10", "B", 1200])
    ws.append(["S011", "Frank", "9", "A", "900.50"])
    buf = BytesIO()
    wb.save(buf)
    payload = buf.getvalue()

    resp = client.post(
        "/api/students/import",
        headers=headers,
        files={
            "file": (
                "students.xlsx",
                payload,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["created"] == 2
    assert data["updated"] == 0
    assert data["fee_updated"] == 2
