from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User
from app.schemas.schemas import SecretCreateRequest, SecretResponse, MessageResponse
from app.dependencies.auth import get_current_user
from app.services.secrets_service import (
    get_user_secrets,
    upsert_secret,
    delete_secret,
)

router = APIRouter(prefix="/secrets", tags=["Secrets"])


@router.get(
    "",
    response_model=list[SecretResponse],
    summary="List all secrets for the authenticated user",
)
def list_secrets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_user_secrets(current_user.id, db)


@router.post(
    "",
    response_model=SecretResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add or update a secret",
)
def create_or_update_secret(
    payload: SecretCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return upsert_secret(current_user.id, payload.title, payload.encrypted_blob, db)


@router.delete(
    "/{secret_id}",
    response_model=MessageResponse,
    summary="Delete a secret by ID",
)
def remove_secret(
    secret_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    delete_secret(str(secret_id), current_user.id, db)
    return MessageResponse(message="Secret deleted successfully.")
