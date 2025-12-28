from fastapi import APIRouter, HTTPException
from typing import List
from uuid import UUID
from db.supabase_client import supabase
from models.schemas import Prompt, PromptCreate, PromptVersion, PromptVersionCreate

router = APIRouter()


@router.get("", response_model=List[Prompt])
async def list_prompts():
    """List all prompts"""
    response = supabase.table("prompts").select("*").order("created_at", desc=True).execute()
    return response.data


@router.post("", response_model=Prompt)
async def create_prompt(prompt: PromptCreate):
    """Create a new prompt"""
    response = supabase.table("prompts").insert(prompt.model_dump()).execute()
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create prompt")
    
    # Create initial version
    prompt_id = response.data[0]["id"]
    version_data = {
        "prompt_id": prompt_id,
        "version": 1,
        "content": "",
        "is_active": False
    }
    supabase.table("prompt_versions").insert(version_data).execute()
    
    return response.data[0]


@router.get("/{prompt_id}", response_model=Prompt)
async def get_prompt(prompt_id: UUID):
    """Get a specific prompt"""
    response = supabase.table("prompts").select("*").eq("id", str(prompt_id)).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return response.data[0]


@router.get("/{prompt_id}/versions", response_model=List[PromptVersion])
async def list_versions(prompt_id: UUID):
    """List all versions of a prompt"""
    response = supabase.table("prompt_versions").select("*").eq("prompt_id", str(prompt_id)).order("version", desc=True).execute()
    return response.data


@router.post("/{prompt_id}/versions", response_model=PromptVersion)
async def create_version(prompt_id: UUID, version: PromptVersionCreate):
    """Create a new version of a prompt"""
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
async def activate_version(prompt_id: UUID, version_id: UUID):
    """Set a version as active (deactivates others)"""
    # Deactivate all versions for this prompt
    supabase.table("prompt_versions").update({"is_active": False}).eq("prompt_id", str(prompt_id)).execute()
    
    # Activate this version
    response = supabase.table("prompt_versions").update({"is_active": True}).eq("id", str(version_id)).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Version not found")
    return {"message": "Version activated", "version_id": str(version_id)}

