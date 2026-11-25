"""
Application configuration loaded from environment variables.
"""

from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str

    JWT_SECRET_KEY: str = "change-me-to-a-random-secret-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 60

    # The session JWT is delivered in an httpOnly cookie. Set this to true
    # whenever the app is served over HTTPS; browsers silently drop Secure
    # cookies on plain-http origins other than localhost.
    COOKIE_SECURE: bool = False

    CORS_ORIGINS: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip()
        ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
