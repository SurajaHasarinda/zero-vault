"""
JWT utilities and the ``get_current_user`` FastAPI dependency.
"""

from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import bcrypt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.models import User

# ─── Password / Hash helpers ─────────────────────────────────────────────────

security_scheme = HTTPBearer()


def hash_login_hash(plain_login_hash: str) -> str:
    """Double-hash: bcrypt the client-derived login_hash before storing."""
    salt = bcrypt.gensalt()
    hashed_bytes = bcrypt.hashpw(plain_login_hash.encode('utf-8'), salt)
    return hashed_bytes.decode('utf-8')


def verify_login_hash(plain_login_hash: str, hashed: str) -> bool:
    """Verify client-supplied login_hash against stored bcrypt hash."""
    return bcrypt.checkpw(
        plain_login_hash.encode('utf-8'),
        hashed.encode('utf-8')
    )


# ─── JWT helpers ──────────────────────────────────────────────────────────────

def create_access_token(user_id: str) -> str:
    """Create a signed JWT containing the user's UUID as the ``sub`` claim."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=settings.JWT_EXPIRATION_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT. Raises HTTPException on failure."""
    try:
        return jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired.",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token.",
        )


# ─── FastAPI dependency ──────────────────────────────────────────────────────

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Extract and validate the Bearer token, then return the corresponding
    ``User`` ORM object.  Used as a dependency on protected routes.
    """
    payload = decode_access_token(credentials.credentials)
    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload invalid.",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )
    return user
