from fastapi import APIRouter, HTTPException, UploadFile, File, Query, Depends
from typing import List, Optional, Any
from uuid import UUID
from db.supabase_client import supabase
from models.schemas import Dataset, DatasetCreate, ManualDatasetCreate, DatasetRowCreate, DatasetColumnUpdate
from services.datasets import DatasetService
from dependencies import get_current_user

router = APIRouter()


@router.get("", response_model=List[Dataset])
async def list_datasets():
    """List all datasets"""
    response = supabase.table("datasets").select("*").order("created_at", desc=True).execute()
    return response.data


@router.post("", response_model=Dataset)
async def create_dataset(dataset: DatasetCreate):
    """Create a new dataset"""
    if dataset.source == "starter" and dataset.starter_id:
        try:
            return await DatasetService.create_starter_dataset(dataset.starter_id)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    dataset_data = dataset.model_dump(exclude={"starter_id"})
    response = supabase.table("datasets").insert(dataset_data).execute()
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
    
    # Process the file and extract samples
    try:
        await DatasetService.process_uploaded_file(str(dataset_id), content, file.filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")
    
    return {"message": "File uploaded and processed", "file_path": file_path}


@router.post("/manual", response_model=Dataset)
async def create_manual_dataset(dataset: ManualDatasetCreate, current_user: Any = Depends(get_current_user)):
    """Create a new dataset with custom columns for manual data entry"""
    dataset_data = {
        "name": dataset.name,
        "description": dataset.description,
        "source": "manual",
        "column_schema": dataset.column_schema,
        "user_id": current_user.id
    }
    
    response = supabase.table("datasets").insert(dataset_data).execute()
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create dataset")
    
    return response.data[0]


@router.put("/{dataset_id}/columns")
async def update_dataset_columns(
    dataset_id: UUID, 
    column_update: DatasetColumnUpdate,
    current_user: Any = Depends(get_current_user)
):
    """Update the column schema for a dataset"""
    # Check ownership
    dataset_response = supabase.table("datasets").select("id").eq("id", str(dataset_id)).execute()
    if not dataset_response.data:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    response = supabase.table("datasets").update({
        "column_schema": column_update.column_schema
    }).eq("id", str(dataset_id)).execute()
    
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to update columns")
    
    return {"message": "Columns updated", "column_schema": column_update.column_schema}


@router.post("/{dataset_id}/rows")
async def add_dataset_rows(
    dataset_id: UUID,
    row_data: DatasetRowCreate,
    current_user: Any = Depends(get_current_user)
):
    """Add or update rows in a manual dataset"""
    # Check ownership
    dataset_response = supabase.table("datasets").select("column_schema").eq("id", str(dataset_id)).execute()
    if not dataset_response.data:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    dataset = dataset_response.data[0]
    column_schema = dataset.get("column_schema", {})
    
    # Validate rows against column schema
    if column_schema and "columns" in column_schema:
        columns = column_schema["columns"]
        for row in row_data.rows:
            # Check required columns
            for col_name, col_def in columns.items():
                if col_def.get("required", False) and col_name not in row:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Missing required column: {col_name}"
                    )
    
    # Insert rows as dataset samples
    samples_to_insert = []
    for row in row_data.rows:
        sample = {
            "dataset_id": str(dataset_id),
            "input": row,  # Store entire row in input field
            "expected_output": row.get("expected_output"),  # If present
            "metadata": {}
        }
        samples_to_insert.append(sample)
    
    if samples_to_insert:
        response = supabase.table("dataset_samples").insert(samples_to_insert).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to insert rows")
    
    return {"message": f"{len(samples_to_insert)} rows added"}


@router.delete("/{dataset_id}/rows/{row_id}")
async def delete_dataset_row(
    dataset_id: UUID,
    row_id: UUID,
    current_user: Any = Depends(get_current_user)
):
    """Delete a specific row from a dataset"""
    # Check ownership
    dataset_response = supabase.table("datasets").select("id").eq("id", str(dataset_id)).execute()
    if not dataset_response.data:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Delete the row
    response = supabase.table("dataset_samples").delete().eq("id", str(row_id)).eq("dataset_id", str(dataset_id)).execute()
    
    return {"message": "Row deleted", "row_id": str(row_id)}
