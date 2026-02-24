"""
Pydantic schemas for request validation and response serialization.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ─── Auth ────────────────────────────────────────────────────────────────────

class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=150, examples=["alice"])
    login_hash: str = Field(
        ...,
        min_length=8,
        description="Client-derived hash of the master password (never the plaintext password).",
        examples=["a1b2c3d4e5f6..."],
    )


class UserLoginRequest(BaseModel):
    username: str = Field(..., examples=["alice"])
    login_hash: str = Field(..., examples=["a1b2c3d4e5f6..."])


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ─── Secrets ─────────────────────────────────────────────────────────────────

class SecretCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, examples=["GitHub SSH Key"])
    encrypted_blob: str = Field(
        ...,
        min_length=1,
        description="Client-side encrypted secret content.",
    )


class SecretResponse(BaseModel):
    id: str | UUID
    title: str
    encrypted_blob: str
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Settings ────────────────────────────────────────────────────────────────

class ChangePasswordRequest(BaseModel):
    current_login_hash: str = Field(..., min_length=8)
    new_login_hash: str = Field(..., min_length=8)


class ChangeUsernameRequest(BaseModel):
    new_username: str = Field(..., min_length=3, max_length=150)
    current_login_hash: str = Field(..., min_length=8)


# ─── Generic ─────────────────────────────────────────────────────────────────

class MessageResponse(BaseModel):
    message: str
