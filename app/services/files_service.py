"""
Encrypted Files service — business logic for CRUD operations on encrypted files.
"""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.models import EncryptedFile


def get_user_files(user_id: UUID, db: Session) -> list[EncryptedFile]:
    """
    Retrieve all encrypted files belonging to a user, ordered by title then filename.
    """
    return (
        db.query(EncryptedFile)
        .filter(EncryptedFile.user_id == user_id)
        .order_by(EncryptedFile.title, EncryptedFile.updated_at.desc())
        .all()
    )


def upsert_file(
    user_id: UUID,
    title: str,
    filename: str,
    encrypted_data: str,
    file_size: int,
    mime_type: str,
    db: Session,
) -> EncryptedFile:
    """
    Create a new encrypted file or update an existing one if a file with the same
    ``title`` and ``filename`` already exists for this user.

    Returns the created or updated EncryptedFile object.
    """
    existing = (
        db.query(EncryptedFile)
        .filter(
            EncryptedFile.user_id == user_id,
            EncryptedFile.title == title,
            EncryptedFile.filename == filename,
        )
        .first()
    )

    if existing:
        existing.encrypted_data = encrypted_data
        existing.file_size = file_size
        existing.mime_type = mime_type
        existing.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        return existing

    enc_file = EncryptedFile(
        user_id=user_id,
        title=title,
        filename=filename,
        encrypted_data=encrypted_data,
        file_size=file_size,
        mime_type=mime_type,
    )
    db.add(enc_file)
    db.commit()
    db.refresh(enc_file)
    return enc_file


def delete_file(file_id: UUID, user_id: UUID, db: Session) -> None:
    """
    Delete an encrypted file by its ID, ensuring it belongs to the given user.

    Raises:
        HTTPException 404 if the file is not found or doesn't belong to the user.
    """
    enc_file = (
        db.query(EncryptedFile)
        .filter(EncryptedFile.id == file_id, EncryptedFile.user_id == user_id)
        .first()
    )
    if not enc_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encrypted file not found.",
        )

    db.delete(enc_file)
    db.commit()
