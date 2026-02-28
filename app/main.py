"""
Zero-Knowledge Secret Manager — FastAPI Application Entry Point.
"""

from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.models import User, Secret, EncryptedFile
from app.controllers import auth, secrets, settings_controller, files

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Lifespan: create tables on startup
@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Create database tables on startup."""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")

    yield

# App instance
app = FastAPI(
    title="Zero-Knowledge Secret Manager",
    description=(
        "A backend API that stores encrypted secrets without ever seeing "
        "the plaintext content or the user's master password."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(secrets.router)
app.include_router(settings_controller.router)
app.include_router(files.router)

# Health check
@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "Zero-Knowledge Secret Manager"}
