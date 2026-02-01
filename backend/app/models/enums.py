from __future__ import annotations

import enum


class UserRole(str, enum.Enum):
    admin = "admin"


class StudentStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"


class PaymentMode(str, enum.Enum):
    cash = "cash"
    upi = "upi"
    bank = "bank"

