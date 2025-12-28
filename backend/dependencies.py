from fastapi import Header, HTTPException
from typing import Optional
from db.supabase_client import supabase

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

