import json
import jsonschema
from typing import Dict, Any, List, Optional
from services.llm_client import call_llm
import tiktoken
import asyncio

encoding = tiktoken.get_encoding("cl100k_base")


def score_correctness(expected: Any, actual: Any, strategy: str = "exact_match") -> float:
    """Score correctness based on strategy"""
    if actual is None:
        return 0.0
        
    if strategy == "exact_match":
        return 1.0 if str(expected).strip() == str(actual).strip() else 0.0
    elif strategy == "numeric_match":
        try:
            expected_num = float(expected)
            actual_num = float(actual)
            return 1.0 if abs(expected_num - actual_num) < 0.001 else 0.0
        except (ValueError, TypeError):
            return 0.0
    return 0.0


async def score_correctness_llm(expected: Any, actual: Any, task_description: str) -> float:
    """Use LLM to judge correctness"""
    prompt = f"""You are evaluating a task output. Determine if the actual output is correct given the expected output.

Task: {task_description}

Expected output: {json.dumps(expected)}
Actual output: {json.dumps(actual)}

Respond with only a number between 0.0 and 1.0, where 1.0 means completely correct and 0.0 means completely incorrect. No other text."""
    
    try:
        response = await call_llm(
            [{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=10
        )
        score_str = response.strip()
        # Extract number if LLM added extra text
        import re
        match = re.search(r"(\d+\.?\d*)", score_str)
        if match:
            score = float(match.group(1))
            return max(0.0, min(1.0, score))
        return 0.5
    except:
        return 0.5


def score_format_adherence(output: Any, schema: Optional[Dict[str, Any]]) -> float:
    """Validate output against JSON schema"""
    if not schema:
        return 1.0
    
    try:
        # If output is string, try to parse it
        if isinstance(output, str):
            try:
                output = json.loads(output)
            except:
                return 0.0
                
        jsonschema.validate(instance=output, schema=schema)
        return 1.0
    except jsonschema.ValidationError:
        return 0.0


async def score_clarity(prompt_content: str, output: str) -> float:
    """LLM-based clarity and specificity scoring"""
    evaluation_prompt = f"""Rate the clarity and specificity of this output generated from the given prompt on a scale of 0.0 to 1.0.

Prompt: {prompt_content[:500]}

Output: {output[:500]}

Respond with only a number between 0.0 and 1.0. No other text."""
    
    try:
        response = await call_llm(
            [{"role": "user", "content": evaluation_prompt}],
            temperature=0.0,
            max_tokens=10
        )
        import re
        match = re.search(r"(\d+\.?\d*)", response.strip())
        if match:
            score = float(match.group(1))
            return max(0.0, min(1.0, score))
        return 0.5
    except:
        return 0.5


def score_verbosity(output: str, max_tokens: int = 500) -> float:
    """Penalize excessive verbosity"""
    tokens = encoding.encode(output)
    token_count = len(tokens)
    
    if token_count <= max_tokens:
        return 1.0
    else:
        # Penalty: reduce score based on excess tokens
        excess = token_count - max_tokens
        penalty = min(0.5, excess / max_tokens)
        return max(0.0, 1.0 - penalty)


async def evaluate_single_example(
    prompt_template: str,
    input_vars: Dict[str, Any],
    expected_output: Any,
    output_schema: Optional[Dict[str, Any]],
    task_type: str,
    eval_strategy: str = "exact_match"
) -> Dict[str, Any]:
    """Evaluate a single example with multiple metrics"""
    
    # 1. Format the prompt
    formatted_prompt = prompt_template
    for key, value in input_vars.items():
        formatted_prompt = formatted_prompt.replace(f"{{{key}}}", str(value))
    
    # 2. Call LLM for generation
    try:
        actual_output_str = await call_llm(
            [{"role": "user", "content": formatted_prompt}],
            temperature=0.0
        )
        
        # Try to parse as JSON if schema is present
        actual_output = actual_output_str
        if output_schema:
            try:
                # Find JSON block if it exists
                import re
                json_match = re.search(r"(\{.*\})", actual_output_str, re.DOTALL)
                if json_match:
                    actual_output = json.loads(json_match.group(1))
                else:
                    actual_output = json.loads(actual_output_str)
            except:
                pass
                
    except Exception as e:
        return {
            "error": str(e),
            "scores": {
                "correctness": 0.0,
                "format_adherence": 0.0,
                "clarity": 0.0,
                "verbosity": 0.0
            }
        }
    
    # 3. Calculate scores
    scores = {}
    
    # Correctness
    if eval_strategy == "llm_judge":
        scores["correctness"] = await score_correctness_llm(expected_output, actual_output, task_type)
    else:
        scores["correctness"] = score_correctness(expected_output, actual_output, eval_strategy)
        
    # Format Adherence
    scores["format_adherence"] = score_format_adherence(actual_output, output_schema)
    
    # Clarity (LLM Judge)
    scores["clarity"] = await score_clarity(formatted_prompt, actual_output_str)
    
    # Verbosity
    scores["verbosity"] = score_verbosity(actual_output_str)
    
    return {
        "input": input_vars,
        "expected_output": expected_output,
        "actual_output": actual_output,
        "scores": scores
    }


async def run_full_evaluation(
    prompt_version_id: str,
    dataset_id: str,
    prompt_template: str,
    samples: List[Dict[str, Any]],
    output_schema: Optional[Dict[str, Any]],
    task_type: str,
    eval_strategy: str = "exact_match"
) -> Dict[str, Any]:
    """Run evaluation on a list of samples and aggregate results"""
    
    tasks = [
        evaluate_single_example(
            prompt_template,
            sample["input"],
            sample["expected_output"],
            output_schema,
            task_type,
            eval_strategy
        )
        for sample in samples
    ]
    
    results = await asyncio.gather(*tasks)
    
    # Aggregate scores
    total_scores = {
        "correctness": 0.0,
        "format_adherence": 0.0,
        "clarity": 0.0,
        "verbosity": 0.0
    }
    
    count = len(results)
    if count > 0:
        for res in results:
            if "error" in res:
                continue
            for metric, score in res["scores"].items():
                total_scores[metric] += score
        
        aggregate_scores = {k: v / count for k, v in total_scores.items()}
    else:
        aggregate_scores = total_scores
        
    return {
        "aggregate_scores": aggregate_scores,
        "results": results
    }
