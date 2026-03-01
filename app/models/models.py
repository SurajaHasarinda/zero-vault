"""
SQLAlchemy ORM models for the Zero-Knowledge Secret Manager.

Uses String-based UUIDs for cross-database compatibility (SQLite + PostgreSQL).
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship

from app.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    username = Column(String(150), unique=True, nullable=False, index=True)
    login_hash = Column(String(256), nullable=False)  # bcrypt-hashed login_hash
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    secrets = relationship(
        "Secret", back_populates="owner", cascade="all, delete-orphan"
    )
    files = relationship(
        "EncryptedFile", back_populates="owner", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User {self.username}>"


class Secret(Base):
    __tablename__ = "secrets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title = Column(String(255), nullable=False)
    encrypted_blob = Column(Text, nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    owner = relationship("User", back_populates="secrets")

    def __repr__(self) -> str:
        return f"<Secret {self.title}>"


class EncryptedFile(Base):
    __tablename__ = "encrypted_files"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title = Column(String(255), nullable=False)            # group name, e.g. "SSH Keys"
    filename = Column(String(255), nullable=False)
    encrypted_data = Column(Text, nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False, default="application/octet-stream")
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    owner = relationship("User", back_populates="files")

    def __repr__(self) -> str:
        return f"<EncryptedFile {self.title}/{self.filename}>"
