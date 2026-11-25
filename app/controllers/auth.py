"""
Authentication controller — thin route handlers for register, login & logout.
All business logic lives in app.services.auth_service.
"""

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import set_session_cookie, clear_session_cookie
from app.schemas.schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    LoginResponse,
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
    user = register_user(
        payload.username,
        payload.login_hash,
        payload.encrypted_dek,
        db,
    )
    return MessageResponse(message=f"User '{user.username}' registered successfully.")


@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Authenticate and open a session",
)
def login(
    payload: UserLoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Authenticate a user with their **login_hash** and return the stored
    `encrypted_dek`.

    The signed JWT is delivered as an httpOnly session cookie rather than in the
    response body, so it is never readable from JavaScript.  The client never
    sends the plaintext master password — only the client-derived login_hash
    which is verified against the stored bcrypt-hashed version (double
    hashing). The `encrypted_dek` is opaque to the server; the client unwraps it
    with the key derived from that password.
    """
    token, encrypted_dek = authenticate_user(payload.username, payload.login_hash, db)
    set_session_cookie(response, token)
    return LoginResponse(encrypted_dek=encrypted_dek)


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Close the session",
)
def logout(response: Response):
    """
    Expire the session cookie.

    Deliberately does not require a valid token: a client must always be able to
    discard a stale or expired cookie.
    """
    clear_session_cookie(response)
    return MessageResponse(message="Logged out.")
