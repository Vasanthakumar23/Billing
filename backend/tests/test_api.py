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
        json={"student_code": "S002", "name": "Bob", "batch": "2026-2027", "batch_start_month": 5},
        headers=headers,
    )
    student_id = s.json()["id"]

    p1 = client.post(
        "/api/payments",
        json={"student_id": student_id, "student_code": "S002", "billing_start_month": "2026-01-01", "mode": "cash"},
        headers=headers,
    )
    p2 = client.post(
        "/api/payments",
        json={"student_id": student_id, "student_code": "S002", "billing_start_month": "2026-04-01", "mode": "upi"},
        headers=headers,
    )
    assert p1.status_code == 201
    assert p2.status_code == 201
    assert p1.json()["receipt_no"] != p2.json()["receipt_no"]
    assert p1.json()["bill_no"] == "0001"
    assert p2.json()["bill_no"] == "0002"


def test_bill_no_resets_for_new_academic_period(client):
    headers = auth_header(client)
    s1 = client.post(
        "/api/students",
        json={"student_code": "S002A", "name": "Bob A", "batch": "2026-2027", "batch_start_month": 5},
        headers=headers,
    )
    s2 = client.post(
        "/api/students",
        json={"student_code": "S002B", "name": "Bob B", "batch": "2027-2028", "batch_start_month": 5},
        headers=headers,
    )

    p1 = client.post(
        "/api/payments",
        json={"student_id": s1.json()["id"], "student_code": "S002A", "billing_start_month": "2026-05-01", "mode": "cash"},
        headers=headers,
    )
    p2 = client.post(
        "/api/payments",
        json={"student_id": s2.json()["id"], "student_code": "S002B", "billing_start_month": "2027-05-01", "mode": "cash"},
        headers=headers,
    )

    assert p1.status_code == 201
    assert p2.status_code == 201
    assert p1.json()["academic_period"] == "2026-2027"
    assert p2.json()["academic_period"] == "2027-2028"
    assert p1.json()["bill_no"] == "0001"
    assert p2.json()["bill_no"] == "0001"


def test_list_payments_filters_by_bill_no(client):
    headers = auth_header(client)
    student = client.post(
        "/api/students",
        json={"student_code": "S002C", "name": "Bob C", "batch": "2026-2027", "batch_start_month": 5},
        headers=headers,
    )
    student_id = student.json()["id"]

    first = client.post(
        "/api/payments",
        json={"student_id": student_id, "student_code": "S002C", "billing_start_month": "2026-05-01", "mode": "cash"},
        headers=headers,
    )
    second = client.post(
        "/api/payments",
        json={"student_id": student_id, "student_code": "S002C", "billing_start_month": "2026-06-01", "mode": "upi"},
        headers=headers,
    )

    assert first.status_code == 201
    assert second.status_code == 201

    filtered = client.get("/api/payments?bill_no=0002", headers=headers)
    assert filtered.status_code == 200
    data = filtered.json()
    assert data["total"] == 1
    assert data["items"][0]["bill_no"] == "0002"


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
        json={"student_id": student_id, "student_code": "S003", "billing_start_month": "2026-01-01", "mode": "bank"},
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
        json={"student_id": student_id, "student_code": "S004", "billing_start_month": "2026-01-01", "mode": "cash"},
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
    ws.append(["S.NO", "R.NO", "NAME", "CLASS", "FEE", "PERIOD", "JOINED DATE", "START", "END"])
    ws.append([1, "S010", "Eve", "10-B", 1200, "MONTHLY", "2026-05-20", "JUN", "APR"])
    ws.append([2, "S011", "Frank", "9-A", "900.50", "QUARTERLY", "2026-05-20", "NOV", "APR"])
    buf = BytesIO()
    wb.save(buf)
    payload = buf.getvalue()

    resp = client.post(
        "/api/students/import",
        headers=headers,
        data={"batch": "2026-2027", "batch_start_month": "May"},
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

    students = client.get("/api/students?search=S011", headers=headers)
    assert students.status_code == 200
    student = students.json()["items"][0]
    assert student["billing_start_month"] == 11
    assert student["billing_end_month"] == 4

    overview = client.get(f"/api/students/{student['id']}/billing-overview", headers=headers)
    assert overview.status_code == 200
    overview_data = overview.json()
    assert overview_data["batch_start_label"] == "Nov 2026"
    assert overview_data["batch_end_label"] == "Apr 2027"
    assert [item["label"] for item in overview_data["months"]] == [
        "Nov 2026",
        "Dec 2026",
        "Jan 2027",
        "Feb 2027",
        "Mar 2027",
        "Apr 2027",
    ]


def test_duplicate_month_payment_is_blocked(client):
    headers = auth_header(client)
    s = client.post("/api/students", json={"student_code": "S012", "name": "Grace"}, headers=headers)
    student_id = s.json()["id"]
    client.patch(f"/api/students/{student_id}/fee", json={"expected_fee_amount": 500}, headers=headers)

    first = client.post(
        "/api/payments",
        json={"student_id": student_id, "student_code": "S012", "billing_start_month": "2026-01-01", "mode": "cash"},
        headers=headers,
    )
    second = client.post(
        "/api/payments",
        json={"student_id": student_id, "student_code": "S012", "billing_start_month": "2026-02-01", "mode": "upi"},
        headers=headers,
    )

    assert first.status_code == 201
    assert second.status_code == 409
    assert "already paid" in second.json()["detail"].lower()


def test_expense_rows_include_created_at(client):
    headers = auth_header(client)

    saved = client.put(
        "/api/expenses/monthly",
        json={
            "month": "2026-04-01",
            "items": [
                {
                    "title": "Internet",
                    "amount": 850,
                    "notes": "April bill",
                }
            ],
        },
        headers=headers,
    )
    assert saved.status_code == 200
    saved_data = saved.json()
    assert saved_data["items"][0]["created_at"]

    fetched = client.get("/api/expenses/monthly?month=2026-04-01", headers=headers)
    assert fetched.status_code == 200
    fetched_data = fetched.json()
    assert fetched_data["items"][0]["created_at"]


def test_admin_can_generate_random_bill_pdf(client):
    headers = auth_header(client)
    response = client.post(
        "/api/settings/random-bill.pdf",
        json={
            "file_name": "manual-demo",
            "fields": [
                {"label": "Bill No", "value": "25"},
                {"label": "Student", "value": "Demo Student"},
                {"label": "Amount", "value": "1000.00"},
            ],
        },
        headers=headers,
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "manual-demo.pdf" in response.headers["content-disposition"]
    assert response.content.startswith(b"%PDF")


def test_reversal_reopens_billing_periods(client):
    headers = auth_header(client)
    s = client.post("/api/students", json={"student_code": "S013", "name": "Hari"}, headers=headers)
    student_id = s.json()["id"]
    client.patch(f"/api/students/{student_id}/fee", json={"expected_fee_amount": 600}, headers=headers)

    payment = client.post(
        "/api/payments",
        json={"student_id": student_id, "student_code": "S013", "billing_start_month": "2026-01-01", "mode": "cash"},
        headers=headers,
    )
    payment_id = payment.json()["id"]
    reverse = client.post(f"/api/payments/{payment_id}/reverse", json={"reason": "Customer refund"}, headers=headers)
    retry = client.post(
        "/api/payments",
        json={"student_id": student_id, "student_code": "S013", "billing_start_month": "2026-01-01", "mode": "cash"},
        headers=headers,
    )

    assert reverse.status_code == 201
    assert retry.status_code == 201


def test_inactive_student_without_payments_can_be_hard_deleted(client):
    headers = auth_header(client)
    s = client.post("/api/students", json={"student_code": "S014", "name": "Ivy"}, headers=headers)
    student_id = s.json()["id"]
    client.patch(f"/api/students/{student_id}", json={"status": "inactive"}, headers=headers)

    deleted = client.delete(f"/api/students/{student_id}", headers=headers)
    lookup = client.get(f"/api/students/{student_id}", headers=headers)

    assert deleted.status_code == 204
    assert lookup.status_code == 404


def test_hard_delete_fails_when_payment_history_exists(client):
    headers = auth_header(client)
    s = client.post("/api/students", json={"student_code": "S015", "name": "Jill"}, headers=headers)
    student_id = s.json()["id"]
    client.patch(f"/api/students/{student_id}/fee", json={"expected_fee_amount": 700}, headers=headers)
    client.post(
        "/api/payments",
        json={"student_id": student_id, "student_code": "S015", "billing_start_month": "2026-01-01", "mode": "cash"},
        headers=headers,
    )
    client.patch(f"/api/students/{student_id}", json={"status": "inactive"}, headers=headers)

    deleted = client.delete(f"/api/students/{student_id}", headers=headers)

    assert deleted.status_code == 409
    assert "payment history" in deleted.json()["detail"].lower()


def test_savings_entries_support_negative_values_and_retraction(client):
    headers = auth_header(client)
    student = client.post("/api/students", json={"student_code": "S016", "name": "Kavi"}, headers=headers)
    student_id = student.json()["id"]

    add = client.post(
        "/api/savings",
        json={"student_id": student_id, "student_code": "S016", "amount": 500, "mode": "cash", "notes": "Initial savings"},
        headers=headers,
    )
    minus = client.post(
        "/api/savings",
        json={"student_id": student_id, "student_code": "S016", "amount": -100, "mode": "cash", "notes": "Student withdrew"},
        headers=headers,
    )

    assert add.status_code == 201
    assert minus.status_code == 201
    assert Decimal(minus.json()["amount"]) == Decimal("-100")

    balances = client.get("/api/savings/balances?search=S016", headers=headers)
    assert balances.status_code == 200
    assert Decimal(balances.json()["items"][0]["total_savings"]) == Decimal("400")

    retract = client.post(
        f"/api/savings/{minus.json()['id']}/retract",
        json={"reason": "Wrong entry"},
        headers=headers,
    )
    assert retract.status_code == 201
    assert Decimal(retract.json()["amount"]) == Decimal("100")
    assert retract.json()["is_retraction"] is True

    balances_after = client.get("/api/savings/balances?search=S016", headers=headers)
    assert balances_after.status_code == 200
    assert Decimal(balances_after.json()["items"][0]["total_savings"]) == Decimal("500")
