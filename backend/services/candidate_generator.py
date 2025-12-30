import json
import random
from typing import List, Dict, Any, Tuple
from services.llm_client import call_llm

async def generate_candidates(
    prompt_content: str,
    task_type: str,
    method: str = "meta_prompting",
    num_candidates: int = 3,
    evaluation_results: Dict[str, Any] = None,
    dataset_samples: List[Dict[str, Any]] = None
) -> List[Tuple[str, str]]:
    """Generate prompt candidates using various algorithms"""
    
    if method == "meta_prompting":
        return await generate_meta_prompting_candidates(
            prompt_content, task_type, num_candidates, evaluation_results, dataset_samples
        )
    elif method == "cot":
        return await generate_cot_candidates(prompt_content, task_type, num_candidates)
    elif method == "few_shot":
        return await generate_few_shot_candidates(
            prompt_content, task_type, num_candidates, dataset_samples
        )
    else:
        # Default to meta-prompting if method not recognized
        return await generate_meta_prompting_candidates(
            prompt_content, task_type, num_candidates, evaluation_results, dataset_samples
        )

async def generate_meta_prompting_candidates(
    prompt_content: str,
    task_type: str,
    num_candidates: int,
    evaluation_results: Dict[str, Any],
    dataset_samples: List[Dict[str, Any]]
) -> List[Tuple[str, str]]:
    """Use Meta-Prompting/Reflection to improve the prompt"""
    
    samples_context = ""
    if dataset_samples:
        samples_context = "\nHere are some examples of inputs and expected outputs:\n"
        for i, sample in enumerate(dataset_samples[:3]):
            samples_context += f"Example {i+1}:\nInput: {json.dumps(sample['input'])}\nExpected: {json.dumps(sample['expected_output'])}\n"

    eval_context = ""
    if evaluation_results:
        eval_context = f"\nPrevious evaluation results (0.0 to 1.0):\n{json.dumps(evaluation_results, indent=2)}"

    meta_prompt = f"""You are an expert Prompt Engineer. Your task is to improve an LLM prompt to achieve better performance on a specific task.

Task Type: {task_type}
Current Prompt:
\"\"\"
{prompt_content}
\"\"\"
{samples_context}
{eval_context}

Please propose {num_candidates} improved versions of this prompt. For each version, provide:
1. The new prompt content.
2. A short rationale for why this version should perform better (e.g., more specific instructions, better formatting, added constraints, etc.).

Respond in JSON format as a list of objects, each with 'content' and 'rationale' keys.
[
  {{"content": "...", "rationale": "..."}},
  ...
]
"""

    try:
        response = await call_llm(
            [{"role": "user", "content": meta_prompt}],
            temperature=0.7,
            response_format={"type": "json_object"}
        )
        
        data = json.loads(response)
        # Handle different potential JSON structures from LLM
        if isinstance(data, dict):
            if "candidates" in data:
                candidates = data["candidates"]
            elif "prompts" in data:
                candidates = data["prompts"]
            else:
                # Try to find a list in the dict
                for val in data.values():
                    if isinstance(val, list):
                        candidates = val
                        break
                else:
                    candidates = []
        else:
            candidates = data

        return [(c["content"], c["rationale"]) for c in candidates[:num_candidates]]
    except Exception as e:
        print(f"Candidate generation failed: {str(e)}")
        return []

async def generate_cot_candidates(
    prompt_content: str,
    task_type: str,
    num_candidates: int
) -> List[Tuple[str, str]]:
    """Generate candidates by adding Chain-of-Thought reasoning"""
    
    meta_prompt = f"""Modify the following prompt to incorporate Chain-of-Thought (CoT) reasoning. The new prompt should encourage the LLM to think step-by-step before providing the final answer.

Current Prompt:
\"\"\"
{prompt_content}
\"\"\"

Provide {num_candidates} different ways to add CoT to this prompt.
Respond in JSON format as a list of objects, each with 'content' and 'rationale' keys.
"""

    try:
        response = await call_llm(
            [{"role": "user", "content": meta_prompt}],
            temperature=0.7,
            response_format={"type": "json_object"}
        )
        data = json.loads(response)
        candidates = data if isinstance(data, list) else data.get("candidates", [])
        return [(c["content"], c["rationale"]) for c in candidates[:num_candidates]]
    except:
        return []

async def generate_few_shot_candidates(
    prompt_content: str,
    task_type: str,
    num_candidates: int,
    dataset_samples: List[Dict[str, Any]]
) -> List[Tuple[str, str]]:
    """Generate candidates by adding Few-Shot examples"""
    if not dataset_samples:
        return []
        
    candidates = []
    
    # Try different combinations of examples
    for i in range(num_candidates):
        try:
            # Select 3 random examples
            k = min(len(dataset_samples), 3)
            selected_samples = random.sample(dataset_samples, k)
            
            examples_context = ""
            for j, sample in enumerate(selected_samples):
                examples_context += f"Example {j+1}:\nInput: {json.dumps(sample['input'])}\nOutput: {json.dumps(sample['expected_output'])}\n\n"
            
            meta_prompt = f"""You are an expert Prompt Engineer. Rewrite the prompt to include the provided few-shot examples effectively. 
The goal is to improve performance on the task by showing the model exactly what is expected.

Current Prompt:
\"\"\"
{prompt_content}
\"\"\"

Examples to add:
{examples_context}

Return a JSON object with 'content' (the new full prompt) and 'rationale' (why these examples were chosen or how they are integrated).
"""
            response = await call_llm(
                [{"role": "user", "content": meta_prompt}],
                temperature=0.7,
                response_format={"type": "json_object"}
            )
            data = json.loads(response)
            
            # Handle potentially different formats
            if isinstance(data, dict):
                 candidates.append((data.get("content", ""), data.get("rationale", "Added few-shot examples")))
            elif isinstance(data, list) and len(data) > 0:
                 candidates.append((data[0].get("content", ""), data[0].get("rationale", "Added few-shot examples")))
                 
        except Exception as e:
            print(f"Few-shot generation failed: {e}")
            continue
            
    return candidates
