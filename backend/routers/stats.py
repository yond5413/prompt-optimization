from fastapi import APIRouter, Depends
from typing import Dict, Any, List, Optional
from db.supabase_client import supabase
from dependencies import get_current_user

router = APIRouter()

@router.get("")
async def get_stats(current_user: Any = Depends(get_current_user)):
    """Get enhanced dashboard statistics"""
    
    # Get counts from Supabase - removed head=True as it was returning 0 counts in this environment
    prompts_count = supabase.table("prompts").select("*", count="exact").execute()
    datasets_count = supabase.table("datasets").select("*", count="exact").execute()
    evaluations_count = supabase.table("evaluations").select("*", count="exact").execute()
    candidates_count = supabase.table("candidates").select("*", count="exact").execute()
    
    # Get completed evaluations with scores
    completed_evals = supabase.table("evaluations")\
        .select("aggregate_scores")\
        .eq("status", "completed")\
        .not_.is_("aggregate_scores", "null")\
        .execute()
    
    # Calculate average scores
    average_scores = {
        "correctness": 0.0,
        "format_adherence": 0.0,
        "clarity": 0.0,
        "safety": 0.0
    }
    
    if completed_evals.data:
        # Filter out evaluations where all core metrics are 0 (likely noise or failed-but-marked-complete)
        valid_scores = []
        for eval_data in completed_evals.data:
            scores = eval_data.get("aggregate_scores")
            if scores and any(scores.get(m, 0) > 0 for m in ["correctness", "format_adherence", "clarity", "safety"]):
                valid_scores.append(scores)
        
        if valid_scores:
            for metric in average_scores.keys():
                # Only average scores that actually have the metric
                values = [s.get(metric) for s in valid_scores if s.get(metric) is not None]
                if values:
                    average_scores[metric] = sum(values) / len(values)
    
    # Get recent evaluations with context
    recent_evals = supabase.table("evaluations")\
        .select("id, prompt_version_id, dataset_id, status, aggregate_scores, started_at, completed_at")\
        .order("started_at", desc=True)\
        .limit(5)\
        .execute()
    
    # Get promotion history for improvement rate
    promotions = supabase.table("promotion_history").select("*", count="exact").execute()
    total_candidates = candidates_count.count or 0
    total_promotions = promotions.count or 0
    improvement_rate = (total_promotions / total_candidates * 100) if total_candidates > 0 else 0
    
    # Get recent promotions with details
    recent_promotions = supabase.table("promotion_history")\
        .select("*, prompts(name), to_version_id, from_version_id, metric_deltas, created_at")\
        .order("created_at", desc=True)\
        .limit(5)\
        .execute()
    
    return {
        "counts": {
            "prompts": prompts_count.count or 0,
            "datasets": datasets_count.count or 0,
            "evaluations": evaluations_count.count or 0,
            "candidates": total_candidates,
            "promotions": total_promotions
        },
        "average_scores": average_scores,
        "recent_evaluations": recent_evals.data or [],
        "recent_promotions": recent_promotions.data or [],
        "improvement_rate": round(improvement_rate, 1)
    }


@router.get("/candidates")
async def get_candidate_stats(current_user: Any = Depends(get_current_user)):
    """Get candidate generation analytics"""
    
    # Get all candidates
    candidates = supabase.table("candidates").select("generation_method, status").execute()
    
    # Count by method
    by_method = {}
    by_status = {"pending": 0, "evaluating": 0, "accepted": 0, "rejected": 0}
    
    for candidate in candidates.data or []:
        method = candidate.get("generation_method", "unknown")
        status = candidate.get("status", "pending")
        by_method[method] = by_method.get(method, 0) + 1
        by_status[status] = by_status.get(status, 0) + 1
    
    return {
        "total": len(candidates.data or []),
        "by_method": by_method,
        "by_status": by_status
    }


@router.get("/prompt-performance/{prompt_id}")
async def get_prompt_performance(prompt_id: str, current_user: Any = Depends(get_current_user)):
    """Get performance metrics for a specific prompt across all versions"""
    
    # Get all versions for this prompt
    versions = supabase.table("prompt_versions")\
        .select("id, version, created_at")\
        .eq("prompt_id", prompt_id)\
        .order("version", desc=False)\
        .execute()
    
    if not versions.data:
        return {
            "prompt_id": prompt_id,
            "versions": 0,
            "performance_history": []
        }
    
    # Get evaluations for each version
    performance_history = []
    for version in versions.data:
        evals = supabase.table("evaluations")\
            .select("aggregate_scores, completed_at")\
            .eq("prompt_version_id", version["id"])\
            .eq("status", "completed")\
            .not_.is_("aggregate_scores", "null")\
            .order("completed_at", desc=True)\
            .limit(1)\
            .execute()
        
        if evals.data and evals.data[0].get("aggregate_scores"):
            performance_history.append({
                "version": version["version"],
                "scores": evals.data[0]["aggregate_scores"],
                "evaluated_at": evals.data[0].get("completed_at")
            })
    
    # Calculate improvement over time
    improvement = 0.0
    if len(performance_history) >= 2:
        first_scores = performance_history[0]["scores"]
        last_scores = performance_history[-1]["scores"]
        
        # Average improvement across all metrics
        improvements = []
        for metric in ["correctness", "format_adherence"]:
            if metric in first_scores and metric in last_scores:
                improvements.append(last_scores[metric] - first_scores[metric])
        
        if improvements:
            improvement = sum(improvements) / len(improvements)
    
    return {
        "prompt_id": prompt_id,
        "versions": len(versions.data),
        "performance_history": performance_history,
        "improvement_over_time": round(improvement * 100, 2)  # as percentage
    }



