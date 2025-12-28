from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Dict, Any
from uuid import UUID
from db.supabase_client import supabase
from models.schemas import Evaluation, EvaluationCreate
from services.evaluation import run_full_evaluation
import datetime

router = APIRouter()


@router.get("", response_model=List[Evaluation])
async def list_evaluations():
    """List all evaluations"""
    response = supabase.table("evaluations").select("*").order("started_at", desc=True).execute()
    return response.data


async def run_eval_task(evaluation_id: str):
    """Background task to run evaluation"""
    try:
        # 1. Get evaluation details
        eval_resp = supabase.table("evaluations").select("*").eq("id", evaluation_id).execute()
        if not eval_resp.data:
            return
        evaluation = eval_resp.data[0]
        
        # 2. Get prompt version
        pv_resp = supabase.table("prompt_versions").select("*, prompts(task_type, output_schema)").eq("id", evaluation["prompt_version_id"]).execute()
        if not pv_resp.data:
            return
        prompt_version = pv_resp.data[0]
        prompt = prompt_version["prompts"]
        
        # 3. Get dataset samples
        samples_resp = supabase.table("dataset_samples").select("*").eq("dataset_id", evaluation["dataset_id"]).execute()
        if not samples_resp.data:
            # Fallback to old file-based logic if samples table is empty
            dataset_resp = supabase.table("datasets").select("*").eq("id", evaluation["dataset_id"]).execute()
            if not dataset_resp.data:
                return
            # For now, if no samples, we can't run real eval
            supabase.table("evaluations").update({
                "status": "failed",
                "completed_at": datetime.datetime.now().isoformat()
            }).eq("id", evaluation_id).execute()
            return
            
        samples = samples_resp.data
        
        # 4. Run evaluation
        results = await run_full_evaluation(
            prompt_version_id=evaluation["prompt_version_id"],
            dataset_id=evaluation["dataset_id"],
            prompt_template=prompt_version["content"],
            samples=samples,
            output_schema=prompt["output_schema"],
            task_type=prompt["task_type"],
            eval_strategy="exact_match" # Default for now
        )
        
        # 5. Store aggregate results
        supabase.table("evaluations").update({
            "status": "completed",
            "aggregate_scores": results["aggregate_scores"],
            "completed_at": datetime.datetime.now().isoformat()
        }).eq("id", evaluation_id).execute()
        
        # 6. Store per-example results
        for i, res in enumerate(results["results"]):
            if "error" in res:
                continue
            supabase.table("evaluation_results").insert({
                "evaluation_id": evaluation_id,
                "example_index": i,
                "input": res["input"],
                "expected_output": res["expected_output"],
                "actual_output": res["actual_output"],
                "scores": res["scores"]
            }).execute()
            
    except Exception as e:
        print(f"Evaluation task failed: {str(e)}")
        supabase.table("evaluations").update({
            "status": "failed",
            "completed_at": datetime.datetime.now().isoformat()
        }).eq("id", evaluation_id).execute()


@router.post("", response_model=Evaluation)
async def create_evaluation(evaluation: EvaluationCreate, background_tasks: BackgroundTasks):
    """Start a new evaluation"""
    # Create evaluation record
    eval_data = evaluation.model_dump()
    eval_data["status"] = "processing"
    eval_data["started_at"] = datetime.datetime.now().isoformat()
    
    response = supabase.table("evaluations").insert(eval_data).execute()
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create evaluation")
    
    new_eval = response.data[0]
    
    # Start background task
    background_tasks.add_task(run_eval_task, str(new_eval["id"]))
    
    return new_eval


@router.get("/{evaluation_id}")
async def get_evaluation(evaluation_id: UUID):
    """Get a specific evaluation with results"""
    eval_resp = supabase.table("evaluations").select("*").eq("id", str(evaluation_id)).execute()
    if not eval_resp.data:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    
    results_resp = supabase.table("evaluation_results").select("*").eq("evaluation_id", str(evaluation_id)).execute()
    
    return {
        **eval_resp.data[0],
        "results": results_resp.data
    }
