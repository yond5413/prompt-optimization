from fastapi import APIRouter, HTTPException, Depends
from typing import List, Any, Dict
from uuid import UUID
from db.supabase_client import supabase
from models.schemas import Prompt, PromptCreate, PromptVersion, PromptVersionCreate
from dependencies import get_current_user
from services.prompt_utils import extract_variables

router = APIRouter()


@router.get("", response_model=List[Prompt])
async def list_prompts(current_user: Any = Depends(get_current_user)):
    """List all prompts"""
    response = supabase.table("prompts").select("*").order("created_at", desc=True).execute()
    return response.data


@router.post("", response_model=Prompt)
async def create_prompt(prompt: PromptCreate, current_user: Any = Depends(get_current_user)):
    """Create a new prompt"""
    prompt_data = prompt.model_dump()
    # Extract content as it's not part of the prompts table
    content = prompt_data.pop("content", "")
    
    # Set user_id from authenticated user for RLS policy
    prompt_data["user_id"] = current_user.id
    
    # Auto-detect variables from content
    variables = extract_variables(content)
    prompt_data["variables"] = variables
    
    response = supabase.table("prompts").insert(prompt_data).execute()
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create prompt")
    
    # Create initial version
    prompt_id = response.data[0]["id"]
    version_data = {
        "prompt_id": prompt_id,
        "version": 1,
        "content": content,
        "is_active": True  # Make the first version active by default
    }
    supabase.table("prompt_versions").insert(version_data).execute()
    
    return response.data[0]


@router.get("/{prompt_id}", response_model=Prompt)
async def get_prompt(prompt_id: UUID, current_user: Any = Depends(get_current_user)):
    """Get a specific prompt"""
    response = supabase.table("prompts").select("*").eq("id", str(prompt_id)).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return response.data[0]


@router.get("/{prompt_id}/versions", response_model=List[PromptVersion])
async def list_versions(prompt_id: UUID, current_user: Any = Depends(get_current_user)):
    """List all versions of a prompt"""
    # Check ownership
    prompt_response = supabase.table("prompts").select("id").eq("id", str(prompt_id)).execute()
    if not prompt_response.data:
        raise HTTPException(status_code=404, detail="Prompt not found")
        
    response = supabase.table("prompt_versions").select("*").eq("prompt_id", str(prompt_id)).order("version", desc=True).execute()
    return response.data


@router.post("/{prompt_id}/versions", response_model=PromptVersion)
async def create_version(prompt_id: UUID, version: PromptVersionCreate, current_user: Any = Depends(get_current_user)):
    """Create a new version of a prompt"""
    # Check ownership
    prompt_response = supabase.table("prompts").select("id").eq("id", str(prompt_id)).execute()
    if not prompt_response.data:
        raise HTTPException(status_code=404, detail="Prompt not found")

    # Get current max version
    versions_response = supabase.table("prompt_versions").select("version").eq("prompt_id", str(prompt_id)).order("version", desc=True).limit(1).execute()
    next_version = 1
    if versions_response.data:
        next_version = versions_response.data[0]["version"] + 1
    
    version_data = {
        "prompt_id": str(prompt_id),
        "version": next_version,
        "content": version.content,
        "parent_version_id": str(version.parent_version_id) if version.parent_version_id else None,
        "generation_method": version.generation_method,
        "rationale": version.rationale,
        "is_active": False
    }
    
    response = supabase.table("prompt_versions").insert(version_data).execute()
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create version")
    return response.data[0]


@router.post("/{prompt_id}/versions/{version_id}/activate")
async def activate_version(prompt_id: UUID, version_id: UUID, current_user: Any = Depends(get_current_user)):
    """Set a version as active (deactivates others)"""
    # Check ownership
    prompt_response = supabase.table("prompts").select("id").eq("id", str(prompt_id)).execute()
    if not prompt_response.data:
        raise HTTPException(status_code=404, detail="Prompt not found")

    # Deactivate all versions for this prompt
    supabase.table("prompt_versions").update({"is_active": False}).eq("prompt_id", str(prompt_id)).execute()
    
    # Activate this version
    response = supabase.table("prompt_versions").update({"is_active": True}).eq("id", str(version_id)).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Version not found")
    return {"message": "Version activated", "version_id": str(version_id)}


@router.get("/{prompt_id}/variables")
async def get_prompt_variables(prompt_id: UUID, current_user: Any = Depends(get_current_user)):
    """Get variables detected in the active version of a prompt"""
    # Get prompt to check ownership and get stored variables
    prompt_response = supabase.table("prompts").select("*").eq("id", str(prompt_id)).execute()
    if not prompt_response.data:
        raise HTTPException(status_code=404, detail="Prompt not found")
    
    prompt = prompt_response.data[0]
    
    # Also get the active version to detect variables from content
    version_response = supabase.table("prompt_versions").select("content").eq("prompt_id", str(prompt_id)).eq("is_active", True).execute()
    
    detected_variables = []
    if version_response.data:
        detected_variables = extract_variables(version_response.data[0]["content"])
    
    return {
        "prompt_id": str(prompt_id),
        "stored_variables": prompt.get("variables", []),
        "detected_variables": detected_variables
    }


@router.patch("/{prompt_id}/variables")
async def update_prompt_variables(prompt_id: UUID, variables: List[str], current_user: Any = Depends(get_current_user)):
    """Manually update the list of variables for a prompt"""
    # Check ownership
    prompt_response = supabase.table("prompts").select("id").eq("id", str(prompt_id)).execute()
    if not prompt_response.data:
        raise HTTPException(status_code=404, detail="Prompt not found")
    
    # Update variables
    response = supabase.table("prompts").update({"variables": variables}).eq("id", str(prompt_id)).execute()
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to update variables")
    
    return {"message": "Variables updated", "variables": variables}
