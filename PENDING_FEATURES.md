# Pending Features

> As of 2026-03-14 — after billing cycle implementation

---

## 1. Reporting Gaps

### Annual Revenue Summary
- No year-level aggregation exists anywhere (backend or frontend).
- Need: `GET /reports/annual?year=2026` returning total collected, total pending, month-by-month breakdown.
- Frontend: a dedicated report card or page section.

### Monthly Fee Collection Breakdown
- `month_total` on the dashboard is a single number — no breakdown by student, class, or section.
- Need: a report showing per-student or per-class collection for a selected month.

---

## 2. Student Management

### Hard Delete for Students with Payment History
- `DELETE /students/{id}` is blocked (409) if any payment history exists.
- There is no way to permanently remove a student who has ever made a payment.
- Need: either an admin override with explicit confirmation, or an archive/anonymise flow.

---

## 3. Receipt

### Receipt Does Not Show Institution Name / Logo
- The PDF receipt and print view show no institution name, address, or branding.
- Need: configurable institution details in settings, rendered on receipt.

---

## 4. Settings

### No User Management
- Only a single hardcoded `admin` user seeded at migration time.
- No UI or API to create additional admin users, change passwords, or deactivate accounts.

---

## 5. Exports

### No Pagination on Exports
- `students.csv`, `payments.csv`, and `pending.csv` fetch all rows in one query.
- Could cause memory issues or timeouts on large datasets.
- Need: streaming or chunked export, or at minimum a row-count warning.

---

## 6. Auth

### No Token Refresh
- JWT expires after 24 hours with no refresh mechanism.
- Users are silently logged out with no warning.
- Need: either a refresh token flow or a session-expiry warning in the UI.

### Edge Middleware Does Not Verify JWT
- The Next.js middleware only checks cookie presence, not JWT validity or expiry.
- An expired or tampered token passes the middleware and only fails at the backend.
- Need: JWT expiry check in middleware (or rely on backend 401 and redirect).

---

## Summary

| # | Area | Gap |
|---|---|---|
| 1 | Reporting | Annual revenue summary missing |
| 2 | Reporting | Monthly collection breakdown missing |
| 3 | Student Management | No way to delete a student with payment history |
| 4 | Receipt | No institution branding on receipt / PDF |
| 5 | Settings | No user management (add/change password/deactivate) |
| 6 | Exports | No pagination — risk of OOM on large data |
| 7 | Auth | No JWT refresh / session expiry warning |
| 8 | Auth | Middleware does not verify JWT validity |
