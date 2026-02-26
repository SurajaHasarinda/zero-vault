"""
Encrypted Files controller — thin route handlers for file CRUD.
All business logic lives in app.services.files_service.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User
from app.schemas.schemas import (
    EncryptedFileCreateRequest,
    EncryptedFileResponse,
    MessageResponse,
)
from app.dependencies.auth import get_current_user
from app.services.files_service import (
    get_user_files,
    upsert_file,
    delete_file,
)

router = APIRouter(prefix="/files", tags=["Encrypted Files"])


@router.get(
    "",
    response_model=list[EncryptedFileResponse],
    summary="List all encrypted files for the authenticated user",
)
def list_files(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return every encrypted file belonging to the authenticated user.

    The response contains plaintext metadata (filename, size, mime_type)
    and the **encrypted_data** (which only the client can decrypt).
    """
    return get_user_files(current_user.id, db)


@router.post(
    "",
    response_model=EncryptedFileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload or update an encrypted file",
)
def create_or_update_file(
    payload: EncryptedFileCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new encrypted file or **update** an existing one if a file with
    the same ``filename`` already exists for this user.

    The server stores only the **encrypted_data** — it cannot read the
    file content (zero-knowledge).
    """
    return upsert_file(
        user_id=current_user.id,
        title=payload.title,
        filename=payload.filename,
        encrypted_data=payload.encrypted_data,
        file_size=payload.file_size,
        mime_type=payload.mime_type,
        db=db,
    )


@router.delete(
    "/{file_id}",
    response_model=MessageResponse,
    summary="Delete an encrypted file by ID",
)
def remove_file(
    file_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Permanently remove an encrypted file entry.

    Only the **owner** of the file can delete it.
    """
    delete_file(file_id, current_user.id, db)
    return MessageResponse(message="File deleted successfully.")
