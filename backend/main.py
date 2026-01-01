import os
from fastapi import FastAPI, Depends, HTTPException, Header, Request

from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from routers import prompts, datasets, evaluations, improvements, stats
from db.supabase_client import supabase
from typing import Optional
from dependencies import get_current_user
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.info("Backend server starting...")

app = FastAPI(title="Prompt Optimization API")

# Configure CORS
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
origins = [
    frontend_url,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom middleware to log requests
@app.middleware("http")
async def log_requests_middleware(request: Request, call_next):
    logger.info(f"Incoming request: {request.method} {request.url}")
    logger.info(f"Origin header: {request.headers.get('origin', 'No origin')}")
    
    response = await call_next(request)
    return response

# Health check (unprotected)
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Include routers - auth is handled within each endpoint
app.include_router(prompts.router, prefix="/api/prompts", tags=["prompts"])
app.include_router(datasets.router, prefix="/api/datasets", tags=["datasets"])
app.include_router(evaluations.router, prefix="/api/evaluations", tags=["evaluations"])
app.include_router(improvements.router, prefix="/api/improvements", tags=["improvements"])
app.include_router(stats.router, prefix="/api/stats", tags=["stats"])

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
