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

app = FastAPI(title="Prompt Optimization API")

# Custom middleware to log all requests and add CORS headers
@app.middleware("http")
async def log_and_cors_middleware(request: Request, call_next):
    logger.info(f"Incoming request: {request.method} {request.url}")
    logger.info(f"Origin header: {request.headers.get('origin', 'No origin')}")
    
    # Handle preflight OPTIONS requests
    if request.method == "OPTIONS":
        response = Response()
        response.headers["Access-Control-Allow-Origin"] = request.headers.get("origin", "*")
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        return response
    
    response = await call_next(request)
    
    # Add CORS headers to all responses
    origin = request.headers.get("origin")
    if origin in ["http://localhost:3000", "http://127.0.0.1:3000"]:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    
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
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
