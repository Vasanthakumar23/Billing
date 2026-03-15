from __future__ import annotations

import enum


class UserRole(str, enum.Enum):
    admin = "admin"


class StudentStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"


class PaymentCycle(str, enum.Enum):
    monthly = "monthly"
    bi_monthly = "bi_monthly"
    tri_monthly = "tri_monthly"


class PaymentMode(str, enum.Enum):
    cash = "cash"
    upi = "upi"
    bank = "bank"
