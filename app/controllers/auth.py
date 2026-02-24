"""
Authentication controller — thin route handlers for register & login.
All business logic lives in app.services.auth_service.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    MessageResponse,
)
from app.services.auth_service import register_user, authenticate_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
def register(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new user.

    The client sends a **login_hash** (derived from the master password on the
    client side).  The server *never* sees the plaintext master password.  The
    login_hash is then hashed again with bcrypt before being persisted
    (double-hashing).
    """
    user = register_user(payload.username, payload.login_hash, db)
    return MessageResponse(message=f"User '{user.username}' registered successfully.")


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate and receive a JWT",
)
def login(payload: UserLoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate a user with their **login_hash** and return a signed JWT.

    The client never sends the plaintext master password — only the
    client-derived login_hash which is verified against the stored
    bcrypt-hashed version (double hashing).
    """
    token = authenticate_user(payload.username, payload.login_hash, db)
    return TokenResponse(access_token=token)
