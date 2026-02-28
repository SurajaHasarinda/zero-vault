"""
Encrypted Files service — business logic for CRUD operations on encrypted files.
"""

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.models import EncryptedFile


def get_user_files(user_id: str, db: Session) -> list[EncryptedFile]:
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
    user_id: str,
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


def delete_file(file_id: str, user_id: str, db: Session) -> None:
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


def rename_group_title(
    user_id: str, old_title: str, new_title: str, db: Session
) -> int:
    """
    Rename all files belonging to a user from ``old_title`` to ``new_title``.

    Returns the number of updated rows.

    Raises:
        HTTPException 404 if no files exist with the old title.
        HTTPException 409 if another group already uses the new title.
    """
    files_with_old = (
        db.query(EncryptedFile)
        .filter(
            EncryptedFile.user_id == user_id,
            EncryptedFile.title == old_title,
        )
        .all()
    )

    if not files_with_old:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'No file group found with title "{old_title}".',
        )

    # Check if new_title already exists (and is different from old_title)
    if old_title != new_title:
        conflict = (
            db.query(EncryptedFile)
            .filter(
                EncryptedFile.user_id == user_id,
                EncryptedFile.title == new_title,
            )
            .first()
        )
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f'A file group with title "{new_title}" already exists.',
            )

    now = datetime.now(timezone.utc)
    for f in files_with_old:
        f.title = new_title
        f.updated_at = now

    db.commit()
    return len(files_with_old)
