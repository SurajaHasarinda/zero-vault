"""
Zero-Knowledge Secret Manager — FastAPI Application Entry Point.
"""

from contextlib import asynccontextmanager
import logging

import os
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.models import User, Secret, EncryptedFile
from app.controllers import auth, secrets, settings_controller, files

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Create database tables on startup."""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")

    yield

app = FastAPI(
    title="Zero-Knowledge Secret Manager",
    description=(
        "A backend API that stores encrypted secrets without ever seeing "
        "the plaintext content or the user's master password."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import APIRouter
api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(secrets.router)
api_router.include_router(settings_controller.router)
api_router.include_router(files.router)

app.include_router(api_router)

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "Zero-Knowledge Secret Manager"}

STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static")

if os.path.isdir(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")
    
    from fastapi.responses import HTMLResponse, FileResponse
    
    @app.get("/{full_path:path}", response_class=HTMLResponse, include_in_schema=False)
    async def serve_spa(request: Request, full_path: str):
        if full_path.startswith("api/") or full_path in ["health", "docs", "openapi.json", "redoc"]:
            return HTMLResponse(status_code=404, content="Not Found")
            
        file_path = os.path.join(STATIC_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
            
        index_file = os.path.join(STATIC_DIR, "index.html")
        if os.path.exists(index_file):
            with open(index_file, 'r', encoding='utf-8') as f:
                return f.read()
            
        return HTMLResponse(status_code=404, content="Static frontend not found.")
else:
    logger.warning(f"Static directory not found at {STATIC_DIR}. Frontend will not be served.")
