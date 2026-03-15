from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.settings import BillingSettingsRead, BillingSettingsUpdate
from app.services.billing import cycle_months_for, get_billing_settings


router = APIRouter()


@router.get("/billing", response_model=BillingSettingsRead)
def get_billing_settings_route(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> BillingSettingsRead:
    settings = get_billing_settings(db)
    return BillingSettingsRead(
        cycle_mode=settings.cycle_mode,
        cycle_months=cycle_months_for(settings.cycle_mode),
        updated_at=settings.updated_at,
        updated_by=settings.updated_by,
    )


@router.patch("/billing", response_model=BillingSettingsRead)
def update_billing_settings_route(
    payload: BillingSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_user),
) -> BillingSettingsRead:
    settings = get_billing_settings(db)
    settings.cycle_mode = payload.cycle_mode
    settings.updated_at = datetime.now(UTC)
    settings.updated_by = current_user.id
    db.commit()
    db.refresh(settings)
    return BillingSettingsRead(
        cycle_mode=settings.cycle_mode,
        cycle_months=cycle_months_for(settings.cycle_mode),
        updated_at=settings.updated_at,
        updated_by=settings.updated_by,
    )
