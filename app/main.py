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

# Routers (Mount API routes under /api so they don't conflict with frontend routing)
# Note: For now we'll leave them at root since the frontend might be expecting them there,
# but we have to be careful about path conflicts. 
app.include_router(auth.router)
app.include_router(secrets.router)
app.include_router(settings_controller.router)
app.include_router(files.router)

# Health check
@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "Zero-Knowledge Secret Manager"}

# Serve Frontend
STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static")

if os.path.isdir(STATIC_DIR):
    # Mount the /assets folder (which Vite generates)
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")
    
    # Catch-all route to serve the SPA's index.html
    @app.get("/{full_path:path}", response_class=HTMLResponse, include_in_schema=False)
    async def serve_spa(request: Request, full_path: str):
        # Ignore API routes that somehow fell through
        if full_path.startswith("api/") or full_path in ["health", "docs", "openapi.json", "redoc"]:
            return HTMLResponse(status_code=404, content="Not Found")
            
        index_file = os.path.join(STATIC_DIR, "index.html")
        if os.path.exists(index_file):
            with open(index_file, 'r', encoding='utf-8') as f:
                return f.read()
            
        return HTMLResponse(status_code=404, content="Static frontend not found.")
else:
    logger.warning(f"Static directory not found at {STATIC_DIR}. Frontend will not be served.")
