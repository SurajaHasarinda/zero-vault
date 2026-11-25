from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.models import User
from app.dependencies.auth import hash_login_hash, verify_login_hash, create_access_token


def register_user(
    username: str,
    login_hash: str,
    encrypted_dek: str,
    db: Session,
) -> User:
    existing = db.query(User).filter(User.username == username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken.",
        )

    user = User(
        username=username,
        login_hash=hash_login_hash(login_hash),
        encrypted_dek=encrypted_dek,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(username: str, login_hash: str, db: Session) -> tuple[str, str]:
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_login_hash(login_hash, user.login_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    return create_access_token(user.id), user.encrypted_dek
