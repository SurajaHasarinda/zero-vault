"""
Secrets service — business logic for CRUD operations on secrets.
"""

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.models import Secret


def get_user_secrets(user_id: str, db: Session) -> list[Secret]:
    """
    Retrieve all secrets belonging to a user, ordered by most recently updated.
    """
    return (
        db.query(Secret)
        .filter(Secret.user_id == user_id)
        .order_by(Secret.updated_at.desc())
        .all()
    )


def upsert_secret(
    user_id: str,
    title: str,
    encrypted_blob: str,
    db: Session,
) -> Secret:
    """
    Create a new secret or update an existing one if a secret with the same
    ``title`` already exists for this user.

    Returns the created or updated Secret object.
    """
    existing = (
        db.query(Secret)
        .filter(
            Secret.user_id == user_id,
            Secret.title == title,
        )
        .first()
    )

    if existing:
        existing.encrypted_blob = encrypted_blob
        existing.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        return existing

    secret = Secret(
        user_id=user_id,
        title=title,
        encrypted_blob=encrypted_blob,
    )
    db.add(secret)
    db.commit()
    db.refresh(secret)
    return secret


def delete_secret(secret_id: str, user_id: str, db: Session) -> None:
    """
    Delete a secret by its ID, ensuring it belongs to the given user.

    Raises:
        HTTPException 404 if the secret is not found or doesn't belong to the user.
    """
    secret = (
        db.query(Secret)
        .filter(Secret.id == secret_id, Secret.user_id == user_id)
        .first()
    )
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Secret not found.",
        )

    db.delete(secret)
    db.commit()
