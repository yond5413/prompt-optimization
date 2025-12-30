from typing import Dict, Any, List, Optional
from uuid import UUID
from db.supabase_client import supabase
from services.evaluation import run_full_evaluation
from services.candidate_generator import generate_candidates
from services.llm_client import call_llm
from models.schemas import Evaluation
import datetime
import json


async def generate_promotion_explanation(
    baseline_scores: Dict[str, float],
    candidate_scores: Dict[str, float],
    candidate_content: str,
    baseline_content: str,
    should_promote: bool,
    rejection_reason: str = "",
    per_example_deltas: Optional[List[Dict[str, Any]]] = None
) -> str:
    """Generate natural language explanation for promotion/rejection decision"""
    
    metric_deltas = {k: candidate_scores[k] - baseline_scores[k] for k in baseline_scores}
    
    # Format per-example context if available
    example_context = ""
    if per_example_deltas:
        improved_count = sum(1 for ex in per_example_deltas if ex.get("delta", 0) > 0)
        regressed_count = sum(1 for ex in per_example_deltas if ex.get("delta", 0) < 0)
        example_context = f"\n\nPer-example analysis: {improved_count} samples improved, {regressed_count} regressed."
    
    explanation_prompt = f"""You are explaining a prompt optimization decision to a prompt engineer.

**Decision**: {"PROMOTED" if should_promote else "REJECTED"}
{f"**Reason**: {rejection_reason}" if rejection_reason else ""}

**Baseline Prompt**:
```
{baseline_content[:500]}...
```

**Candidate Prompt**:
```
{candidate_content[:500]}...
```

**Metric Changes** (candidate vs baseline):
{json.dumps(metric_deltas, indent=2)}

**Baseline Scores**:
{json.dumps(baseline_scores, indent=2)}

**Candidate Scores**:
{json.dumps(candidate_scores, indent=2)}
{example_context}

Provide a clear, concise explanation (2-3 sentences) of:
1. What changed in the prompt
2. Why the decision was made based on the metrics
3. Key insights about the improvement or failure

Respond in plain text, no JSON."""

    try:
        explanation = await call_llm(
            [{"role": "user", "content": explanation_prompt}],
            temperature=0.3,
            max_tokens=300
        )
        return explanation.strip()
    except Exception as e:
        print(f"Failed to generate explanation: {str(e)}")
        if should_promote:
            return f"Promoted due to {max(metric_deltas.items(), key=lambda x: x[1])[0]} improvement of {max(metric_deltas.values()):.1%}."
        else:
            return rejection_reason or "Rejected due to insufficient improvement."


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
    
    # 6. Evaluate candidates and store them in DB
    candidate_results = []
    stored_candidates = []
    
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
        
        candidate_data = {
            "content": content,
            "rationale": rationale,
            "scores": eval_results["aggregate_scores"],
            "per_example_results": eval_results.get("per_example_results", [])
        }
        candidate_results.append(candidate_data)
        
        # Store candidate in database immediately
        cand_db = {
            "prompt_id": prompt_id,
            "parent_version_id": active_version["id"],
            "content": content,
            "generation_method": method,
            "rationale": rationale,
            "status": "pending",
            "evaluation_scores": eval_results["aggregate_scores"]
        }
        cand_resp = supabase.table("candidates").insert(cand_db).execute()
        if cand_resp.data:
            candidate_data["candidate_id"] = cand_resp.data[0]["id"]
            stored_candidates.append(cand_resp.data[0])
        
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
            
    # 9. Generate explanation for best candidate
    explanation = ""
    if best_candidate:
        explanation = await generate_promotion_explanation(
            baseline_scores=baseline_scores,
            candidate_scores=best_candidate["scores"],
            candidate_content=best_candidate["content"],
            baseline_content=active_version["content"],
            should_promote=should_promote,
            rejection_reason=rejection_reason
        )
    
    # 10. Log results and handle promotion
    result = {
        "baseline_scores": baseline_scores,
        "best_candidate": best_candidate,
        "best_improvement": best_improvement,
        "should_promote": should_promote,
        "rejection_reason": rejection_reason,
        "explanation": explanation,
        "candidates_evaluated": len(candidate_results),
        "all_candidates": stored_candidates
    }
    
    if should_promote and best_candidate:
        # Update the best candidate's status
        best_candidate_id = best_candidate.get("candidate_id")
        if best_candidate_id:
            supabase.table("candidates").update({
                "status": "promoted" if auto_promote else "accepted"
            }).eq("id", best_candidate_id).execute()
        
        if auto_promote:
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
                
                # Log promotion history with explanation
                supabase.table("promotion_history").insert({
                    "prompt_id": prompt_id,
                    "from_version_id": active_version["id"],
                    "to_version_id": new_v_resp.data[0]["id"],
                    "reason": explanation or f"Auto-promoted: {best_candidate['rationale']}",
                    "metric_deltas": {k: best_candidate["scores"][k] - baseline_scores[k] for k in baseline_scores},
                    "promoted_by": "system"
                }).execute()
                
                result["promoted_version_id"] = new_v_resp.data[0]["id"]
    else:
        # Mark rejected candidates
        for cand in stored_candidates:
            if cand["id"] != best_candidate.get("candidate_id"):
                supabase.table("candidates").update({
                    "status": "rejected"
                }).eq("id", cand["id"]).execute()
                
    return result
