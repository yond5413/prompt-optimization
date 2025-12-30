import logging
import traceback
import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from typing import List, Dict, Any, Optional
from uuid import UUID
from db.supabase_client import supabase
from models.schemas import Evaluation, EvaluationCreate
from services.evaluation import run_full_evaluation
from services.improvement_loop import run_improvement_loop
import datetime

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", response_model=List[Evaluation])
async def list_evaluations():
    """List all evaluations"""
    response = supabase.table("evaluations").select("*").order("started_at", desc=True).execute()
    return response.data


async def run_eval_task(evaluation_id: str):
    """Background task to run evaluation with comprehensive logging"""
    logger.info(f"Starting evaluation task for {evaluation_id}")
    error_message = None
    
    try:
        # 1. Get evaluation details
        logger.debug(f"Fetching evaluation record {evaluation_id}")
        eval_resp = supabase.table("evaluations").select("*").eq("id", evaluation_id).execute()
        if not eval_resp.data:
            error_message = "Evaluation record not found"
            logger.error(error_message)
            return
        evaluation = eval_resp.data[0]
        
        # 2. Get prompt version with prompt details
        logger.debug(f"Fetching prompt version {evaluation['prompt_version_id']}")
        pv_resp = supabase.table("prompt_versions").select("*, prompts(task_type, output_schema)").eq("id", evaluation["prompt_version_id"]).execute()
        if not pv_resp.data:
            error_message = "Prompt version not found"
            logger.error(error_message)
            _update_evaluation_failed(evaluation_id, error_message)
            return
        prompt_version = pv_resp.data[0]
        prompt = prompt_version["prompts"]
        
        logger.info(f"Evaluating prompt version {prompt_version['version']} for task type: {prompt['task_type']}")
        
        # 3. Get dataset info and samples
        dataset_resp = supabase.table("datasets").select("*").eq("id", evaluation["dataset_id"]).execute()
        if not dataset_resp.data:
            error_message = "Dataset not found"
            logger.error(error_message)
            _update_evaluation_failed(evaluation_id, error_message)
            return
        dataset = dataset_resp.data[0]
        
        samples_resp = supabase.table("dataset_samples").select("*").eq("dataset_id", evaluation["dataset_id"]).execute()
        if not samples_resp.data:
            error_message = f"No samples found for dataset '{dataset['name']}'"
            logger.error(error_message)
            _update_evaluation_failed(evaluation_id, error_message)
            return
            
        samples = samples_resp.data
        logger.info(f"Found {len(samples)} samples in dataset '{dataset['name']}'")
        
        # Get evaluation strategy from evaluation record (fallback to dataset, then to exact_match)
        eval_strategy = evaluation.get("evaluation_strategy") or dataset.get("evaluation_strategy", "exact_match")
        logger.info(f"Using evaluation strategy: {eval_strategy}")
        
        # Get variable mapping if present
        variable_mapping = evaluation.get("variable_mapping")
        if variable_mapping:
            logger.info(f"Using variable mapping: {variable_mapping}")
        
        # 4. Run evaluation
        logger.info(f"Starting evaluation of {len(samples)} samples...")
        results = await run_full_evaluation(
            prompt_version_id=evaluation["prompt_version_id"],
            dataset_id=evaluation["dataset_id"],
            prompt_template=prompt_version["content"],
            samples=samples,
            output_schema=prompt.get("output_schema"),
            task_type=prompt.get("task_type", "generation"),
            eval_strategy=eval_strategy,
            variable_mapping=variable_mapping
        )
        
        # 5. Store per-example results (even if some have errors)
        successful_results = 0
        error_results = 0
        
        for i, res in enumerate(results.get("results", [])):
            try:
                result_data = {
                    "evaluation_id": evaluation_id,
                    "example_index": i,
                    "input": res.get("input"),
                    "expected_output": res.get("expected_output"),
                    "actual_output": res.get("actual_output"),
                    "scores": res.get("scores", {})
                }
                
                # Add error field if present
                if "error" in res:
                    result_data["scores"]["error"] = res["error"]
                    error_results += 1
                else:
                    successful_results += 1
                
                supabase.table("evaluation_results").insert(result_data).execute()
                
            except Exception as insert_err:
                logger.warning(f"Failed to insert result {i}: {str(insert_err)}")
                error_results += 1
        
        logger.info(f"Stored {successful_results} successful results, {error_results} with errors")
        
        # 6. Calculate and store aggregate results with confidence intervals
        aggregate_scores = results.get("aggregate_scores", {})
        confidence_intervals = results.get("confidence_intervals")
        
        # Log aggregate scores
        logger.info(f"Aggregate scores: {aggregate_scores}")
        
        # Determine final status based on results
        total_samples = len(samples)
        if error_results == total_samples:
            status = "failed"
            error_message = "All samples failed evaluation"
        elif error_results > 0:
            status = "completed"  # Partial success
            error_message = f"{error_results}/{total_samples} samples had errors"
        else:
            status = "completed"
        
        # Update evaluation record
        update_data = {
            "status": status,
            "aggregate_scores": aggregate_scores,
            "completed_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "samples_processed": successful_results,
            "samples_failed": error_results
        }
        
        if confidence_intervals:
            update_data["confidence_intervals"] = confidence_intervals
        
        if error_message:
            update_data["error_message"] = error_message
            
        supabase.table("evaluations").update(update_data).eq("id", evaluation_id).execute()
        
        logger.info(f"Evaluation {evaluation_id} completed with status: {status}")
        if error_message:
            logger.warning(f"Evaluation notes: {error_message}")
            
    except Exception as e:
        error_message = f"Evaluation failed: {str(e)}"
        logger.error(f"Evaluation task failed for {evaluation_id}: {error_message}")
        logger.error(traceback.format_exc())
        _update_evaluation_failed(evaluation_id, error_message)


def _update_evaluation_failed(evaluation_id: str, error_message: str):
    """Helper to update evaluation status to failed with error message"""
    try:
        supabase.table("evaluations").update({
            "status": "failed",
            "completed_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "error_message": error_message,
            "aggregate_scores": {}
        }).eq("id", evaluation_id).execute()
    except Exception as update_err:
        logger.error(f"Failed to update evaluation status: {str(update_err)}")


async def run_improvement_after_eval(prompt_id: str, dataset_id: str, evaluation_id: str):
    """Background task to run improvement loop after evaluation completes"""
    logger.info(f"Starting auto-improvement for prompt {prompt_id} after evaluation {evaluation_id}")
    
    try:
        # Wait for evaluation to complete (poll with timeout)
        max_wait = 300  # 5 minutes
        wait_interval = 5  # seconds
        elapsed = 0
        
        while elapsed < max_wait:
            eval_resp = supabase.table("evaluations").select("status").eq("id", evaluation_id).execute()
            if eval_resp.data and eval_resp.data[0]["status"] in ["completed", "failed"]:
                break
            await asyncio.sleep(wait_interval)
            elapsed += wait_interval
        
        # Check if evaluation succeeded
        eval_resp = supabase.table("evaluations").select("status").eq("id", evaluation_id).execute()
        if not eval_resp.data or eval_resp.data[0]["status"] != "completed":
            logger.warning(f"Evaluation {evaluation_id} did not complete successfully, skipping auto-improvement")
            return
        
        # Run improvement loop
        result = await run_improvement_loop(
            prompt_id=prompt_id,
            dataset_id=dataset_id,
            num_candidates=3,
            auto_promote=False,  # Don't auto-promote, let user decide
            method="meta_prompting"
        )
        
        # Link candidates to evaluation
        if result.get("all_candidates"):
            for candidate in result["all_candidates"]:
                supabase.table("candidates").update({
                    "evaluation_id": evaluation_id
                }).eq("id", candidate["id"]).execute()
        
        logger.info(f"Auto-improvement completed for evaluation {evaluation_id}, generated {result.get('candidates_evaluated', 0)} candidates")
        
    except Exception as e:
        logger.error(f"Auto-improvement failed for evaluation {evaluation_id}: {str(e)}")
        logger.error(traceback.format_exc())


@router.post("", response_model=Evaluation)
async def create_evaluation(
    evaluation: EvaluationCreate, 
    background_tasks: BackgroundTasks,
    auto_improve: bool = Query(default=False, description="Automatically generate improvement candidates after evaluation")
):
    """Start a new evaluation"""
    logger.info(f"Creating new evaluation for prompt_version={evaluation.prompt_version_id}, dataset={evaluation.dataset_id}")
    
    # Create evaluation record
    eval_data = evaluation.model_dump(mode='json')
    eval_data["status"] = "running"
    eval_data["started_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    response = supabase.table("evaluations").insert(eval_data).execute()
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create evaluation")
    
    new_eval = response.data[0]
    logger.info(f"Created evaluation {new_eval['id']}, starting background task")
    
    # Start background task
    background_tasks.add_task(run_eval_task, str(new_eval["id"]))
    
    # Optionally trigger improvement generation after evaluation
    if auto_improve:
        # Get prompt_id from version
        pv_resp = supabase.table("prompt_versions").select("prompt_id").eq("id", str(evaluation.prompt_version_id)).execute()
        if pv_resp.data:
            prompt_id = pv_resp.data[0]["prompt_id"]
            background_tasks.add_task(
                run_improvement_after_eval,
                str(prompt_id),
                str(evaluation.dataset_id),
                str(new_eval["id"])
            )
    
    return new_eval


@router.get("/{evaluation_id}")
async def get_evaluation(evaluation_id: UUID):
    """Get a specific evaluation with results"""
    eval_resp = supabase.table("evaluations").select("*").eq("id", str(evaluation_id)).execute()
    if not eval_resp.data:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    
    results_resp = supabase.table("evaluation_results").select("*").eq("evaluation_id", str(evaluation_id)).order("example_index").execute()
    
    return {
        **eval_resp.data[0],
        "results": results_resp.data
    }


@router.delete("/{evaluation_id}")
async def delete_evaluation(evaluation_id: UUID):
    """Delete an evaluation and its results"""
    logger.info(f"Deleting evaluation {evaluation_id}")
    
    # Delete results first (foreign key constraint)
    supabase.table("evaluation_results").delete().eq("evaluation_id", str(evaluation_id)).execute()
    
    # Delete evaluation
    response = supabase.table("evaluations").delete().eq("id", str(evaluation_id)).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    
    return {"message": "Evaluation deleted successfully"}
