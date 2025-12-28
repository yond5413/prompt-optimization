from fastapi import APIRouter, Depends
from typing import Dict
from db.supabase_client import supabase
from dependencies import get_current_user
from typing import Any

router = APIRouter()

@router.get("", response_model=Dict[str, int])
async def get_stats(current_user: Any = Depends(get_current_user)):
    """Get dashboard statistics"""
    
    # Get counts from Supabase
    prompts_count = supabase.table("prompts").select("*", count="exact", head=True).execute()
    datasets_count = supabase.table("datasets").select("*", count="exact", head=True).execute()
    evaluations_count = supabase.table("evaluations").select("*", count="exact", head=True).execute()
    
    return {
        "prompts": prompts_count.count or 0,
        "datasets": datasets_count.count or 0,
        "evaluations": evaluations_count.count or 0
    }

