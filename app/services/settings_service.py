"""
Settings service — business logic for account management.
"""

import logging

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.models import User
from app.dependencies.auth import hash_login_hash, verify_login_hash

logger = logging.getLogger(__name__)

# ─── Account Management ──────────────────────────────────────────────────────

def change_user_password(
    user: User,
    current_login_hash: str,
    new_login_hash: str,
    encrypted_dek: str,
    db: Session,
) -> User:
    """
    Change the user's login hash (password) and re-wrapped DEK.
    Requires verifying the current login hash first.
    """
    if not verify_login_hash(current_login_hash, user.login_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect.",
        )

    user.login_hash = hash_login_hash(new_login_hash)
    user.encrypted_dek = encrypted_dek
    db.commit()
    db.refresh(user)
    return user


def change_username(
    user: User,
    new_username: str,
    current_login_hash: str,
    new_login_hash: str,
    encrypted_dek: str,
    db: Session,
) -> User:
    """
    Change the user's username.

    The username is the PBKDF2 salt, so the stored login hash and the wrapped
    DEK must be rewritten together with it. Requires verifying the current
    login hash first.
    """
    if not verify_login_hash(current_login_hash, user.login_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password is incorrect.",
        )

    # Check if new username is already taken
    existing = db.query(User).filter(User.username == new_username).first()
    if existing and existing.id != user.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken.",
        )

    user.username = new_username
    user.login_hash = hash_login_hash(new_login_hash)
    user.encrypted_dek = encrypted_dek
    db.commit()
    db.refresh(user)
    return user
