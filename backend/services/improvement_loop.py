from typing import Dict, Any, List, Optional
from uuid import UUID
from db.supabase_client import supabase
from services.evaluation import run_full_evaluation
from services.candidate_generator import generate_candidates
from models.schemas import Evaluation
import datetime


async def run_improvement_loop(
    prompt_id: str,
    dataset_id: str,
    num_candidates: int = 3,
    auto_promote: bool = False,
    method: str = "meta_prompting"
) -> Dict[str, Any]:
    """Run the full self-improvement loop with PRD guardrails"""
    
    # 1. Get active prompt version
    pv_resp = supabase.table("prompt_versions").select("*").eq("prompt_id", prompt_id).eq("is_active", True).execute()
    if not pv_resp.data:
        raise ValueError("No active version found for prompt")
    active_version = pv_resp.data[0]
    
    # 2. Get prompt details
    p_resp = supabase.table("prompts").select("*").eq("id", prompt_id).execute()
    if not p_resp.data:
        raise ValueError("Prompt not found")
    prompt = p_resp.data[0]
    
    # 3. Get dataset samples
    s_resp = supabase.table("dataset_samples").select("*").eq("dataset_id", dataset_id).execute()
    if not s_resp.data:
        raise ValueError("Dataset has no samples")
    samples = s_resp.data
    
    # 4. Baseline evaluation
    print(f"Running baseline evaluation for prompt {prompt_id}...")
    baseline_results = await run_full_evaluation(
        prompt_version_id=active_version["id"],
        dataset_id=dataset_id,
        prompt_template=active_version["content"],
        samples=samples,
        output_schema=prompt["output_schema"],
        task_type=prompt["task_type"]
    )
    baseline_scores = baseline_results["aggregate_scores"]
    
    # 5. Generate candidates
    print(f"Generating {num_candidates} candidates using {method}...")
    candidates_data = await generate_candidates(
        prompt_content=active_version["content"],
        task_type=prompt["task_type"],
        method=method,
        num_candidates=num_candidates,
        evaluation_results=baseline_scores,
        dataset_samples=samples
    )
    
    # 6. Evaluate candidates
    candidate_results = []
    for content, rationale in candidates_data:
        print(f"Evaluating candidate: {rationale[:50]}...")
        eval_results = await run_full_evaluation(
            prompt_version_id=None, # Not saved yet
            dataset_id=dataset_id,
            prompt_template=content,
            samples=samples,
            output_schema=prompt["output_schema"],
            task_type=prompt["task_type"]
        )
        candidate_results.append({
            "content": content,
            "rationale": rationale,
            "scores": eval_results["aggregate_scores"]
        })
        
    # 7. Compare and find the best candidate
    best_candidate = None
    best_improvement = -1.0 # Initialize with a low value
    
    # Simple aggregate improvement metric: average of all scores
    def get_avg_score(scores):
        return sum(scores.values()) / len(scores) if scores else 0.0

    baseline_avg = get_avg_score(baseline_scores)
    
    for candidate in candidate_results:
        cand_avg = get_avg_score(candidate["scores"])
        improvement = cand_avg - baseline_avg
        
        if improvement > best_improvement:
            best_improvement = improvement
            best_candidate = candidate
            
    # 8. Check PRD Promotion Guardrails
    should_promote = False
    rejection_reason = ""
    
    if best_candidate:
        # Guardrail 1: Minimum aggregate improvement (5%)
        improvement_threshold = 0.05
        if best_improvement < improvement_threshold:
            rejection_reason = f"Improvement ({best_improvement:.2%}) below threshold ({improvement_threshold:.2%})"
        
        # Guardrail 2: No regression on critical metrics (Format Adherence > -2%)
        elif best_candidate["scores"]["format_adherence"] < baseline_scores["format_adherence"] - 0.02:
            rejection_reason = "Significant regression in format adherence"
            
        # Guardrail 3: Minimum format pass-rate (90%)
        elif best_candidate["scores"]["format_adherence"] < 0.9:
            rejection_reason = f"Format adherence ({best_candidate['scores']['format_adherence']:.2%}) below 90%"
            
        else:
            should_promote = True
            
    # 9. Log results and handle promotion
    result = {
        "baseline_scores": baseline_scores,
        "best_candidate": best_candidate,
        "best_improvement": best_improvement,
        "should_promote": should_promote,
        "rejection_reason": rejection_reason,
        "candidates_evaluated": len(candidate_results)
    }
    
    if should_promote:
        # Store as candidate in DB
        cand_resp = supabase.table("candidates").insert({
            "prompt_id": prompt_id,
            "parent_version_id": active_version["id"],
            "content": best_candidate["content"],
            "generation_method": method,
            "rationale": best_candidate["rationale"],
            "status": "promoted" if auto_promote else "pending"
        }).execute()
        
        if auto_promote and cand_resp.data:
            # Create new version
            new_v_resp = supabase.table("prompt_versions").insert({
                "prompt_id": prompt_id,
                "version": active_version["version"] + 1,
                "content": best_candidate["content"],
                "parent_version_id": active_version["id"],
                "generation_method": method,
                "rationale": best_candidate["rationale"],
                "is_active": True
            }).execute()
            
            if new_v_resp.data:
                # Deactivate old version
                supabase.table("prompt_versions").update({"is_active": False}).eq("id", active_version["id"]).execute()
                
                # Log promotion history
                supabase.table("promotion_history").insert({
                    "prompt_id": prompt_id,
                    "from_version_id": active_version["id"],
                    "to_version_id": new_v_resp.data[0]["id"],
                    "reason": f"Auto-promoted: {best_candidate['rationale']}",
                    "metric_deltas": {k: best_candidate["scores"][k] - baseline_scores[k] for k in baseline_scores},
                    "promoted_by": "system"
                }).execute()
                
    return result
