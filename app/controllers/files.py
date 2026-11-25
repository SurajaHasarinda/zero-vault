from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.schemas import (
    EncryptedFileCreateRequest,
    EncryptedFileResponse,
    FileGroupRenameRequest,
    MessageResponse,
)
from app.dependencies.auth import get_current_user_id
from app.services.files_service import (
    get_user_files,
    upsert_file,
    delete_file,
    rename_group_title,
)

router = APIRouter(prefix="/files", tags=["Encrypted Files"])


@router.get(
    "",
    response_model=list[EncryptedFileResponse],
    summary="List all encrypted files for the authenticated user",
)
def list_files(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return get_user_files(user_id, db)


@router.post(
    "",
    response_model=EncryptedFileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload or update an encrypted file",
)
def create_or_update_file(
    payload: EncryptedFileCreateRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return upsert_file(
        user_id=user_id,
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
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    delete_file(str(file_id), user_id, db)
    return MessageResponse(message="File deleted successfully.")


@router.patch(
    "/group-title",
    response_model=MessageResponse,
    summary="Rename a file group title",
)
def rename_group(
    payload: FileGroupRenameRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    count = rename_group_title(
        user_id=user_id,
        old_title=payload.old_title,
        new_title=payload.new_title,
        db=db,
    )
    return MessageResponse(message=f"Renamed {count} file(s) to \"{payload.new_title}\".")
