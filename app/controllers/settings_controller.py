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
    change_user_password(
        current_user,
        payload.current_login_hash,
        payload.new_login_hash,
        payload.encrypted_dek,
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
    """Username is the PBKDF2 salt, so login_hash and encrypted_dek must be re-derived together."""
    change_username(
        current_user,
        payload.new_username,
        payload.current_login_hash,
        payload.new_login_hash,
        payload.encrypted_dek,
        db,
    )
    return MessageResponse(message="Username changed successfully.")
