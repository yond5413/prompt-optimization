from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from routers import prompts, datasets, evaluations, improvements
from db.supabase_client import supabase
from typing import Optional

app = FastAPI(title="Prompt Optimization API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def get_current_user(authorization: Optional[str] = Header(None)):
    """Verify Supabase JWT and return user info"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    try:
        # Expected format: Bearer <token>
        token = authorization.split(" ")[1]
        user_response = supabase.auth.get_user(token)
        return user_response.user
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

# Health check (unprotected)
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Include routers (protected by default in production)
# For now, we'll keep them open for development but add the dependency where needed
app.include_router(prompts.router, prefix="/api/prompts", tags=["prompts"], dependencies=[Depends(get_current_user)])
app.include_router(datasets.router, prefix="/api/datasets", tags=["datasets"], dependencies=[Depends(get_current_user)])
app.include_router(evaluations.router, prefix="/api/evaluations", tags=["evaluations"], dependencies=[Depends(get_current_user)])
app.include_router(improvements.router, prefix="/api/improvements", tags=["improvements"], dependencies=[Depends(get_current_user)])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
