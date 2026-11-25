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
    token, encrypted_dek = authenticate_user(payload.username, payload.login_hash, db)
    set_session_cookie(response, token)
    return LoginResponse(encrypted_dek=encrypted_dek)


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Close the session",
)
def logout(response: Response):
    """Always succeeds so clients can discard stale/expired cookies."""
    clear_session_cookie(response)
    return MessageResponse(message="Logged out.")
