# Institution Billing Software — Feature Audit Report

> Audited: 2026-03-14

---

## 1. Student / User Data Management

| Feature | Status | Notes |
|---|---|---|
| Import from Excel | ✅ Present | `POST /students/import` — supports `.xlsx`, upsert/create-only modes, flexible column mapping |
| Add / Update / Remove users | ⚠️ Partial | Add ✅, Update ✅ (`PATCH`), Remove ❌ — only soft-delete via `status=inactive`, no hard delete endpoint |
| Annual bulk updates | ✅ Present | Excel import with `upsert` mode handles bulk re-import for new academic year |

---

## 2. Fee Structure Management

| Feature | Status | Notes |
|---|---|---|
| Configure fee per user | ✅ Present | `PATCH /students/{id}/fee` sets `expected_fee_amount` per student |
| Monthly / bi-monthly / multi-month payment | ❌ Missing | No concept of months — fee is a single flat amount, not broken into monthly installments |
| Auto-determine next payable month | ❌ Missing | No monthly fee schedule or installment tracking exists anywhere |

---

## 3. Payment Processing

| Feature | Status | Notes |
|---|---|---|
| Record & track payments | ✅ Present | `POST /payments`, full ledger with receipt, mode, and date |
| Auto-update payment status per month | ❌ Missing | No monthly status — pending is just `expected_fee - sum(payments)`, not month-aware |
| Prevent duplicate payments for paid months | ❌ Missing | No month-level tracking, so no duplicate prevention at that granularity |

---

## 4. Receipt Generation

| Feature | Status | Notes |
|---|---|---|
| Digital receipt after payment | ✅ Present | Receipt shown immediately on collect page after payment |
| Download / Print receipt | ⚠️ Partial | Print ✅ (`window.print()`), Download ❌ — no PDF generation or download link |

---

## 5. Transaction & Billing History

| Feature | Status | Notes |
|---|---|---|
| Complete transaction history per user | ✅ Present | `GET /payments?student_id=...` + transactions page |
| All payments view | ✅ Present | Transactions page with date / mode / receipt filters |
| Pending fees view | ✅ Present | Reports page + `/reports/pending` |
| Payment history | ✅ Present | Transactions page with full ledger |
| Monthly collection summaries | ⚠️ Partial | Daily collection by mode ✅ — monthly shows only a single `month_total`, no breakdown by student or class |

---

## 6. Reporting

| Feature | Status | Notes |
|---|---|---|
| Monthly fee collection | ⚠️ Partial | `month_total` on dashboard is a single number — no detailed monthly breakdown |
| Outstanding dues | ✅ Present | `/reports/pending` + pending CSV export |
| Payment history by student | ✅ Present | Filter payments by `student_id` |
| Annual revenue summary | ❌ Missing | No year-level aggregation or report |

---

## Summary

| Category | ✅ Present | ⚠️ Partial | ❌ Missing |
|---|---|---|---|
| Student Management | 2 | 1 | 0 |
| Fee Structure | 1 | 0 | 2 |
| Payment Processing | 1 | 0 | 2 |
| Receipt Generation | 1 | 1 | 0 |
| Transaction History | 4 | 1 | 0 |
| Reporting | 2 | 1 | 1 |
| **Total** | **11** | **4** | **5** |

---

## Key Gaps

The **monthly installment model is entirely absent**. The current system treats fees as a single flat amount per student with no concept of months, schedules, or installment periods. This is a foundational gap that cascades into:

- Fee structure (no monthly/bi-monthly config)
- Payment processing (no per-month status or duplicate prevention)
- Reporting (no month-wise breakdown or annual summary)
