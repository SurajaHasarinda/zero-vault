"""
Settings controller — routes for account management.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User
from app.schemas.schemas import (
    ChangePasswordRequest,
    ChangeUsernameRequest,
    MessageResponse,
)
from app.dependencies.auth import get_current_user
from app.services.settings_service import (
    change_user_password,
    change_username,
)

router = APIRouter(prefix="/settings", tags=["Settings"])


# ─── Account ─────────────────────────────────────────────────────────────────

@router.put(
    "/password",
    response_model=MessageResponse,
    summary="Change password (login hash)",
)
def update_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Change the user's login hash.
    Requires the current login hash for verification.
    """
    change_user_password(
        current_user,
        payload.current_login_hash,
        payload.new_login_hash,
        db,
    )
    return MessageResponse(message="Password changed successfully.")


@router.put(
    "/username",
    response_model=MessageResponse,
    summary="Change username",
)
def update_username(
    payload: ChangeUsernameRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Change the user's username.
    Requires the current login hash for verification.
    """
    change_username(
        current_user,
        payload.new_username,
        payload.current_login_hash,
        db,
    )
    return MessageResponse(message="Username changed successfully.")
