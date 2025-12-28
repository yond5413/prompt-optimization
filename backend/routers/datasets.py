from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from typing import List, Optional
from uuid import UUID
from db.supabase_client import supabase
from models.schemas import Dataset, DatasetCreate
from services.datasets import DatasetService

router = APIRouter()


@router.get("", response_model=List[Dataset])
async def list_datasets():
    """List all datasets"""
    response = supabase.table("datasets").select("*").order("created_at", desc=True).execute()
    return response.data


@router.post("", response_model=Dataset)
async def create_dataset(dataset: DatasetCreate):
    """Create a new dataset"""
    response = supabase.table("datasets").insert(dataset.model_dump()).execute()
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create dataset")
    return response.data[0]


@router.get("/hf/search")
async def search_hf_datasets(query: str = Query(..., min_length=1)):
    """Search Hugging Face datasets"""
    try:
        return await DatasetService.search_hf_datasets(query)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/hf/info/{repo_id:path}")
async def get_hf_dataset_info(repo_id: str):
    """Get info about a Hugging Face dataset"""
    try:
        return await DatasetService.get_hf_dataset_info(repo_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/hf/import")
async def import_hf_dataset(
    repo_id: str,
    config_name: Optional[str] = None,
    split: str = "train",
    sample_limit: int = 100
):
    """Import a Hugging Face dataset"""
    try:
        dataset_id = await DatasetService.import_hf_dataset(repo_id, config_name, split, sample_limit)
        return {"id": dataset_id, "message": "Dataset imported successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{dataset_id}", response_model=Dataset)
async def get_dataset(dataset_id: UUID):
    """Get a specific dataset"""
    response = supabase.table("datasets").select("*").eq("id", str(dataset_id)).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return response.data[0]


@router.get("/{dataset_id}/samples")
async def get_dataset_samples(dataset_id: UUID, limit: int = 50):
    """Get samples for a dataset"""
    try:
        return await DatasetService.get_dataset_samples(str(dataset_id), limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{dataset_id}/upload")
async def upload_dataset_file(dataset_id: UUID, file: UploadFile = File(...)):
    """Upload a dataset file to Supabase Storage"""
    content = await file.read()
    
    file_path = f"datasets/{dataset_id}/{file.filename}"
    supabase.storage.from_("datasets").upload(file_path, content)
    
    supabase.table("datasets").update({"file_path": file_path}).eq("id", str(dataset_id)).execute()
    
    return {"message": "File uploaded", "file_path": file_path}
