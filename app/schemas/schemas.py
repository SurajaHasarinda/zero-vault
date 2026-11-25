"""
Pydantic schemas for request validation and response serialization.
"""

from datetime import datetime

from pydantic import BaseModel, Field



class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=150, examples=["alice"])
    login_hash: str = Field(
        ...,
        min_length=8,
        description="Client-derived hash of the master password (never the plaintext password).",
        examples=["a1b2c3d4e5f6..."],
    )
    encrypted_dek: str = Field(
        ...,
        min_length=1,
        description="Data encryption key, wrapped under a key derived from the master password.",
    )


class UserLoginRequest(BaseModel):
    username: str = Field(..., examples=["alice"])
    login_hash: str = Field(..., examples=["a1b2c3d4e5f6..."])


class LoginResponse(BaseModel):
    """
    Login response.

    The JWT itself is not part of the body: it is set as an httpOnly cookie so
    that no script can read it. Only the wrapped DEK is returned, because the
    client must unwrap it locally to unlock the vault.
    """

    encrypted_dek: str



class SecretCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, examples=["GitHub SSH Key"])
    encrypted_blob: str = Field(
        ...,
        min_length=1,
        description="Client-side encrypted secret content.",
    )


class SecretResponse(BaseModel):
    id: str
    title: str
    encrypted_blob: str
    updated_at: datetime

    class Config:
        from_attributes = True



class EncryptedFileCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, examples=["SSH Keys"])
    filename: str = Field(..., min_length=1, max_length=255, examples=["id_rsa"])
    encrypted_data: str = Field(
        ...,
        min_length=1,
        description="Client-side encrypted file content (base64).",
    )
    file_size: int = Field(..., ge=0, description="Original file size in bytes.")
    mime_type: str = Field(
        default="application/octet-stream",
        max_length=100,
        description="MIME type of the original file.",
    )


class EncryptedFileResponse(BaseModel):
    id: str
    title: str
    filename: str
    encrypted_data: str
    file_size: int
    mime_type: str
    updated_at: datetime

    class Config:
        from_attributes = True


class FileGroupRenameRequest(BaseModel):
    old_title: str = Field(..., min_length=1, max_length=255, examples=["SSH Keys"])
    new_title: str = Field(..., min_length=1, max_length=255, examples=["Server Keys"])



class ChangePasswordRequest(BaseModel):
    current_login_hash: str = Field(..., min_length=8)
    new_login_hash: str = Field(..., min_length=8)
    encrypted_dek: str = Field(
        ...,
        min_length=1,
        description="Data encryption key, re-wrapped under the new password-derived key.",
    )


class ChangeUsernameRequest(BaseModel):
    new_username: str = Field(..., min_length=3, max_length=150)
    current_login_hash: str = Field(..., min_length=8)
    new_login_hash: str = Field(
        ...,
        min_length=8,
        description="Login hash re-derived against the new username (the PBKDF2 salt).",
    )
    encrypted_dek: str = Field(
        ...,
        min_length=1,
        description="Data encryption key, re-wrapped under the new username's KEK.",
    )



class MessageResponse(BaseModel):
    message: str
