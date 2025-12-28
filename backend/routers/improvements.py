from fastapi import APIRouter, HTTPException
from uuid import UUID
from db.supabase_client import supabase
from models.schemas import ImprovementRequest, PromotionRequest, Candidate
from services.improvement_loop import run_improvement_loop

router = APIRouter()


@router.post("/improve")
async def improve_prompt(request: ImprovementRequest):
    """Run self-improvement loop"""
    try:
        result = await run_improvement_loop(
            prompt_id=request.prompt_id,
            dataset_id=request.dataset_id,
            num_candidates=request.num_candidates,
            auto_promote=request.auto_promote
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/promote")
async def promote_candidate(request: PromotionRequest):
    """Manually promote a candidate to active version"""
    # Get candidate
    candidate_response = supabase.table("candidates").select("*").eq("id", str(request.candidate_id)).execute()
    if not candidate_response.data:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    candidate = candidate_response.data[0]
    
    # Get current active version
    active_response = supabase.table("prompt_versions").select("*").eq("prompt_id", str(request.prompt_id)).eq("is_active", True).execute()
    if not active_response.data:
        raise HTTPException(status_code=404, detail="No active version found")
    
    active_version = active_response.data[0]
    
    # Create new version from candidate
    version_response = supabase.table("prompt_versions").select("version").eq("prompt_id", str(request.prompt_id)).order("version", desc=True).limit(1).execute()
    next_version = 1
    if version_response.data:
        next_version = version_response.data[0]["version"] + 1
    
    version_data = {
        "prompt_id": str(request.prompt_id),
        "version": next_version,
        "content": candidate["content"],
        "parent_version_id": active_version["id"],
        "generation_method": candidate["generation_method"],
        "rationale": candidate["rationale"] or request.reason,
        "is_active": False
    }
    
    new_version_response = supabase.table("prompt_versions").insert(version_data).execute()
    if not new_version_response.data:
        raise HTTPException(status_code=500, detail="Failed to create version")
    
    # Deactivate old version
    supabase.table("prompt_versions").update({"is_active": False}).eq("prompt_id", str(request.prompt_id)).execute()
    
    # Activate new version
    supabase.table("prompt_versions").update({"is_active": True}).eq("id", new_version_response.data[0]["id"]).execute()
    
    # Log promotion
    promotion_data = {
        "prompt_id": str(request.prompt_id),
        "from_version_id": active_version["id"],
        "to_version_id": new_version_response.data[0]["id"],
        "reason": request.reason or "Manual promotion",
        "promoted_by": "user"
    }
    supabase.table("promotion_history").insert(promotion_data).execute()
    
    return {"message": "Candidate promoted", "version_id": new_version_response.data[0]["id"]}


@router.get("/promotions")
async def list_promotions(prompt_id: UUID = None):
    """List promotion history"""
    query = supabase.table("promotion_history").select("*")
    if prompt_id:
        query = query.eq("prompt_id", str(prompt_id))
    response = query.order("created_at", desc=True).execute()
    return response.data

