from datetime import datetime

from pydantic import BaseModel, Field



class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=150, examples=["alice"])
    login_hash: str = Field(
        ...,
        min_length=64,
        max_length=64,
        pattern=r"^[0-9a-f]{64}$",
        description="Client-derived hash of the master password (never the plaintext password).",
        examples=["a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"],
    )
    encrypted_dek: str = Field(
        ...,
        min_length=80,
        max_length=80,
        pattern=r"^[A-Za-z0-9+/]{80}$",
        description="Data encryption key, wrapped under a key derived from the master password.",
    )


class UserLoginRequest(BaseModel):
    username: str = Field(..., examples=["alice"])
    login_hash: str = Field(
        ...,
        min_length=64,
        max_length=64,
        pattern=r"^[0-9a-f]{64}$",
        examples=["a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"],
    )


class LoginResponse(BaseModel):
    """JWT is set as an httpOnly cookie; only the wrapped DEK is returned in the body."""

    encrypted_dek: str



class SecretCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, examples=["GitHub SSH Key"])
    encrypted_blob: str = Field(
        ...,
        min_length=1,
        max_length=7_000_000,
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
        max_length=7_000_000,
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
    current_login_hash: str = Field(
        ...,
        min_length=64,
        max_length=64,
        pattern=r"^[0-9a-f]{64}$",
    )
    new_login_hash: str = Field(
        ...,
        min_length=64,
        max_length=64,
        pattern=r"^[0-9a-f]{64}$",
    )
    encrypted_dek: str = Field(
        ...,
        min_length=80,
        max_length=80,
        pattern=r"^[A-Za-z0-9+/]{80}$",
        description="Data encryption key, re-wrapped under the new password-derived key.",
    )


class ChangeUsernameRequest(BaseModel):
    new_username: str = Field(..., min_length=3, max_length=150)
    current_login_hash: str = Field(
        ...,
        min_length=64,
        max_length=64,
        pattern=r"^[0-9a-f]{64}$",
    )
    new_login_hash: str = Field(
        ...,
        min_length=64,
        max_length=64,
        pattern=r"^[0-9a-f]{64}$",
        description="Login hash re-derived against the new username (the PBKDF2 salt).",
    )
    encrypted_dek: str = Field(
        ...,
        min_length=80,
        max_length=80,
        pattern=r"^[A-Za-z0-9+/]{80}$",
        description="Data encryption key, re-wrapped under the new username's KEK.",
    )



class MessageResponse(BaseModel):
    message: str
