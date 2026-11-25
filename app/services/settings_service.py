import logging

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.models import User
from app.dependencies.auth import hash_login_hash, verify_login_hash

logger = logging.getLogger(__name__)


def change_user_password(
    user: User,
    current_login_hash: str,
    new_login_hash: str,
    encrypted_dek: str,
    db: Session,
) -> User:
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
    """Username is the PBKDF2 salt, so login_hash and encrypted_dek must be rewritten together."""
    if not verify_login_hash(current_login_hash, user.login_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password is incorrect.",
        )

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
