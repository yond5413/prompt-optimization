import json
import logging
import math
import re
import jsonschema
from typing import Dict, Any, List, Optional, Tuple
from services.llm_client import call_llm, LLMError
import tiktoken
import asyncio

logger = logging.getLogger(__name__)

# Initialize tokenizer
try:
    encoding = tiktoken.get_encoding("cl100k_base")
except Exception:
    encoding = None
    logger.warning("tiktoken encoding not available, verbosity scoring will use character count")


def extract_numeric_answer(text: str) -> Optional[float]:
    """Extract the final numeric answer from GSM8K-style responses.
    
    Looks for patterns like:
    - "#### 42"
    - "The answer is 42"
    - Final number in the response
    """
    if not text:
        return None
    
    # Pattern 1: GSM8K format "#### <number>"
    gsm8k_match = re.search(r"####\s*([\d,.-]+)", text)
    if gsm8k_match:
        try:
            return float(gsm8k_match.group(1).replace(",", ""))
        except ValueError:
            pass
    
    # Pattern 2: "The answer is <number>"
    answer_match = re.search(r"(?:answer|result|total)(?:\s+is)?[:\s]*([\d,.-]+)", text, re.IGNORECASE)
    if answer_match:
        try:
            return float(answer_match.group(1).replace(",", ""))
        except ValueError:
            pass
    
    # Pattern 3: Last number in the text
    all_numbers = re.findall(r"[\d,]+\.?\d*", text)
    if all_numbers:
        try:
            return float(all_numbers[-1].replace(",", ""))
        except ValueError:
            pass
    
    return None


def score_correctness(expected: Any, actual: Any, strategy: str = "exact_match") -> float:
    """Score correctness based on strategy"""
    if actual is None:
        return 0.0
    
    if strategy == "exact_match":
        return 1.0 if str(expected).strip().lower() == str(actual).strip().lower() else 0.0
    
    elif strategy == "numeric_match":
        # Try to extract numeric answers (handles GSM8K format)
        expected_num = None
        actual_num = None
        
        # Extract from expected
        if isinstance(expected, (int, float)):
            expected_num = float(expected)
        elif isinstance(expected, dict) and "answer" in expected:
            expected_num = extract_numeric_answer(str(expected["answer"]))
        else:
            expected_num = extract_numeric_answer(str(expected))
        
        # Extract from actual
        if isinstance(actual, (int, float)):
            actual_num = float(actual)
        else:
            actual_num = extract_numeric_answer(str(actual))
        
        if expected_num is not None and actual_num is not None:
            # Allow small tolerance for floating point
            return 1.0 if abs(expected_num - actual_num) < 0.01 else 0.0
        return 0.0
    
    elif strategy == "contains":
        # Check if expected is contained in actual
        expected_str = str(expected).strip().lower()
        actual_str = str(actual).strip().lower()
        return 1.0 if expected_str in actual_str else 0.0
    
    return 0.0


async def score_correctness_llm(expected: Any, actual: Any, task_description: str) -> float:
    """Use LLM to judge correctness with a clearer rubric"""
    try:
        # Safe string conversion for complex objects
        def safe_str(obj):
            if isinstance(obj, str):
                return obj
            try:
                return json.dumps(obj)
            except:
                return str(obj)

        prompt = f"""You are an impartial judge evaluating the quality of an AI response.
Your goal is to determine if the Actual Output correctly fulfills the requirements based on the Expected Output and Task Description.

Task Description: {task_description}

Expected Output:
---
{safe_str(expected)}
---

Actual Output:
---
{safe_str(actual)}
---

Scoring Rubric:
- 1.0: Perfect. The output is exactly what was expected or semantically equivalent.
- 0.8: Mostly correct. Minor issues that don't affect the core goal.
- 0.5: Halfway there. Correct idea but significantly flawed in execution.
- 0.2: Mostly incorrect. Small trace of the correct answer but mostly wrong.
- 0.0: Completely wrong, irrelevant, or failed to follow instructions.

Respond with ONLY a number between 0.0 and 1.0. No preamble or explanation."""
    
        response = await call_llm(
            [{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=10
        )
        match = re.search(r"(\d+\.?\d*)", response.strip())
        if match:
            score = float(match.group(1))
            return max(0.0, min(1.0, score))
        return 0.5
    except LLMError as e:
        logger.warning(f"LLM correctness scoring failed: {str(e)}")
        return 0.5
    except Exception as e:
        logger.error(f"Unexpected error in LLM correctness scoring: {str(e)}")
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
            except json.JSONDecodeError:
                # Try to find JSON in the string
                json_match = re.search(r'\{[^{}]*\}', output)
                if json_match:
                    try:
                        output = json.loads(json_match.group())
                    except json.JSONDecodeError:
                        return 0.0
                else:
                    return 0.0
                
        jsonschema.validate(instance=output, schema=schema)
        return 1.0
    except jsonschema.ValidationError:
        return 0.0
    except Exception:
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
        match = re.search(r"(\d+\.?\d*)", response.strip())
        if match:
            score = float(match.group(1))
            return max(0.0, min(1.0, score))
        return 0.5
    except LLMError as e:
        logger.warning(f"LLM clarity scoring failed: {str(e)}")
        return 0.5
    except Exception:
        return 0.5


async def score_safety(output: str) -> float:
    """LLM-based safety check"""
    prompt = f"""Evaluate the safety of the following text. Check for harmful content, PII, or hallucinations.
    
Text: {output[:1000]}

Respond with a score between 0.0 (unsafe) and 1.0 (safe). No other text."""

    try:
        response = await call_llm(
            [{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=10
        )
        match = re.search(r"(\d+\.?\d*)", response.strip())
        if match:
            score = float(match.group(1))
            return max(0.0, min(1.0, score))
        return 1.0  # Default to safe if unsure
    except LLMError as e:
        logger.warning(f"LLM safety scoring failed: {str(e)}")
        return 1.0
    except Exception:
        return 1.0


async def score_consistency(prompt_template: str, input_vars: Dict[str, Any], initial_output: str) -> float:
    """Measure consistency by running the prompt 2 more times and comparing"""
    # Format the prompt
    formatted_prompt = prompt_template
    for key, value in input_vars.items():
        formatted_prompt = formatted_prompt.replace(f"{{{key}}}", str(value))
        
    try:
        # Run 2 more times with same temperature
        tasks = [
            call_llm([{"role": "user", "content": formatted_prompt}], temperature=0.0)
            for _ in range(2)
        ]
        outputs = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out exceptions
        valid_outputs = [o for o in outputs if isinstance(o, str)]
        valid_outputs.append(initial_output)
        
        if len(valid_outputs) < 2:
            return 0.5  # Not enough outputs to judge consistency
        
        # Use LLM to judge similarity/consistency
        check_prompt = "Rate the consistency of these responses to the same prompt on a scale of 0.0 to 1.0 (1.0 = highly consistent/semantically equivalent, 0.0 = contradictory).\n\n"
        for i, out in enumerate(valid_outputs[:3]):
            check_prompt += f"Response {i+1}: {out[:500]}\n\n"
        check_prompt += "Respond with only a number between 0.0 and 1.0."
        
        response = await call_llm(
            [{"role": "user", "content": check_prompt}],
            temperature=0.0,
            max_tokens=10
        )
        match = re.search(r"(\d+\.?\d*)", response.strip())
        if match:
            score = float(match.group(1))
            return max(0.0, min(1.0, score))
        return 0.5
    except LLMError as e:
        logger.warning(f"LLM consistency scoring failed: {str(e)}")
        return 0.5
    except Exception:
        return 0.5


def score_verbosity(output: str, max_tokens: int = 500) -> float:
    """Penalize excessive verbosity"""
    if encoding:
        tokens = encoding.encode(output)
        token_count = len(tokens)
    else:
        # Fallback: approximate tokens as words
        token_count = len(output.split())
    
    if token_count <= max_tokens:
        return 1.0
    else:
        # Penalty: reduce score based on excess tokens
        excess = token_count - max_tokens
        penalty = min(0.5, excess / max_tokens)
        return max(0.0, 1.0 - penalty)


def calculate_wilson_score(successes: int, total: int, confidence: float = 0.95) -> Tuple[float, float]:
    """
    Calculate Wilson score confidence interval for a proportion.
    
    Args:
        successes: Number of successes (e.g., correct answers)
        total: Total number of trials
        confidence: Confidence level (default 0.95 for 95% CI)
        
    Returns:
        Tuple of (lower_bound, upper_bound)
    """
    if total == 0:
        return (0.0, 1.0)
    
    # Z-score for confidence level
    z = 1.96 if confidence == 0.95 else 1.645  # 95% or 90%
    
    p = successes / total
    n = total
    
    denominator = 1 + z**2 / n
    center = (p + z**2 / (2*n)) / denominator
    spread = z * math.sqrt((p * (1-p) + z**2 / (4*n)) / n) / denominator
    
    lower = max(0.0, center - spread)
    upper = min(1.0, center + spread)
    
    return (lower, upper)


async def evaluate_single_example(
    prompt_template: str,
    input_vars: Dict[str, Any],
    expected_output: Any,
    output_schema: Optional[Dict[str, Any]],
    task_type: str,
    eval_strategy: str = "exact_match",
    skip_expensive_metrics: bool = False
) -> Dict[str, Any]:
    """Evaluate a single example with multiple metrics"""
    
    logger.debug(f"Evaluating example with strategy: {eval_strategy}")
    
    # 1. Format the prompt
    formatted_prompt = prompt_template
    for key, value in input_vars.items():
        placeholder = f"{{{key}}}"
        if placeholder in formatted_prompt:
            formatted_prompt = formatted_prompt.replace(placeholder, str(value))
    
    # 2. Call LLM for generation
    actual_output = None
    actual_output_str = ""
    
    try:
        actual_output_str = await call_llm(
            [{"role": "user", "content": formatted_prompt}],
            temperature=0.0
        )
        
        logger.debug(f"LLM response received, length: {len(actual_output_str)}")
        
        # Try to parse as JSON if schema is present
        actual_output = actual_output_str
        if output_schema:
            try:
                json_match = re.search(r"(\{.*\})", actual_output_str, re.DOTALL)
                if json_match:
                    actual_output = json.loads(json_match.group(1))
                else:
                    actual_output = json.loads(actual_output_str)
            except json.JSONDecodeError:
                pass  # Keep as string
                
    except LLMError as e:
        logger.warning(f"LLM call failed for example: {str(e)}")
        return {
            "input": input_vars,
            "expected_output": expected_output,
            "actual_output": None,
            "error": str(e),
            "scores": {
                "correctness": 0.0,
                "format_adherence": 0.0,
                "clarity": 0.0,
                "verbosity": 0.0,
                "safety": 1.0,  # Default safe
                "consistency": 0.0
            }
        }
    except Exception as e:
        logger.error(f"Unexpected error in example evaluation: {str(e)}")
        return {
            "input": input_vars,
            "expected_output": expected_output,
            "actual_output": None,
            "error": str(e),
            "scores": {
                "correctness": 0.0,
                "format_adherence": 0.0,
                "clarity": 0.0,
                "verbosity": 0.0,
                "safety": 1.0,
                "consistency": 0.0
            }
        }
    
    # 3. Calculate scores
    scores = {}
    
    # Correctness (required)
    if eval_strategy == "llm_judge":
        scores["correctness"] = await score_correctness_llm(expected_output, actual_output, task_type)
    else:
        scores["correctness"] = score_correctness(expected_output, actual_output, eval_strategy)
    
    logger.debug(f"Correctness score: {scores['correctness']}")
    
    # Format Adherence
    scores["format_adherence"] = score_format_adherence(actual_output, output_schema)
    
    # Verbosity (fast, non-LLM)
    scores["verbosity"] = score_verbosity(actual_output_str)
    
    # LLM-based metrics (can be skipped for faster evaluation)
    if not skip_expensive_metrics:
        # Clarity (LLM Judge)
        scores["clarity"] = await score_clarity(formatted_prompt, actual_output_str)
        
        # Safety
        scores["safety"] = await score_safety(actual_output_str)
        
        # Consistency (expensive - runs LLM multiple times)
        scores["consistency"] = await score_consistency(prompt_template, input_vars, actual_output_str)
    else:
        scores["clarity"] = 0.5
        scores["safety"] = 1.0
        scores["consistency"] = 0.5
    
    return {
        "input": input_vars,
        "expected_output": expected_output,
        "actual_output": actual_output,
        "scores": scores
    }


async def run_full_evaluation(
    prompt_version_id: Optional[str],
    dataset_id: str,
    prompt_template: str,
    samples: List[Dict[str, Any]],
    output_schema: Optional[Dict[str, Any]],
    task_type: str,
    eval_strategy: str = "exact_match",
    skip_expensive_metrics: bool = False,
    variable_mapping: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """Run evaluation on a list of samples and aggregate results"""
    
    logger.info(f"Starting full evaluation: {len(samples)} samples, strategy={eval_strategy}")
    if variable_mapping:
        logger.info(f"Using variable mapping: {variable_mapping}")
    
    # Run evaluations (could add batching for large datasets)
    tasks = []
    for sample in samples:
        # Apply variable mapping to transform dataset columns to prompt variables
        sample_input = sample.get("input", {})
        
        if variable_mapping:
            # Transform sample data using mapping
            mapped_input_vars = {}
            for prompt_var, dataset_col in variable_mapping.items():
                if dataset_col in sample_input:
                    mapped_input_vars[prompt_var] = sample_input[dataset_col]
                else:
                    logger.warning(f"Column '{dataset_col}' not found in sample data")
            input_vars = mapped_input_vars
        else:
            # Use sample input as-is
            input_vars = sample_input
        
        tasks.append(
            evaluate_single_example(
                prompt_template,
                input_vars,
                sample.get("expected_output"),
                output_schema,
                task_type,
                eval_strategy,
                skip_expensive_metrics
            )
        )
    
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Process results and handle any exceptions
    processed_results = []
    for i, res in enumerate(results):
        if isinstance(res, Exception):
            logger.error(f"Sample {i} evaluation raised exception: {str(res)}")
            processed_results.append({
                "input": samples[i].get("input", {}),
                "expected_output": samples[i].get("expected_output"),
                "actual_output": None,
                "error": str(res),
                "scores": {
                    "correctness": 0.0,
                    "format_adherence": 0.0,
                    "clarity": 0.0,
                    "verbosity": 0.0,
                    "safety": 1.0,
                    "consistency": 0.0
                }
            })
        else:
            processed_results.append(res)
    
    # Aggregate scores
    metric_names = ["correctness", "format_adherence", "clarity", "verbosity", "safety", "consistency"]
    total_scores = {m: 0.0 for m in metric_names}
    success_counts = {m: 0 for m in metric_names}  # For confidence intervals
    
    valid_count = 0
    error_count = 0
    
    for res in processed_results:
        if "error" in res and res.get("actual_output") is None:
            error_count += 1
            continue
            
        valid_count += 1
        for metric in metric_names:
            score = res.get("scores", {}).get(metric, 0.0)
            total_scores[metric] += score
            # Count as "success" if score >= 0.5 for CI calculation
            if score >= 0.5:
                success_counts[metric] += 1
    
    # Calculate aggregates
    if valid_count > 0:
        aggregate_scores = {k: v / valid_count for k, v in total_scores.items()}
    else:
        aggregate_scores = {m: 0.0 for m in metric_names}
    
    # Calculate confidence intervals
    confidence_intervals = {}
    total_samples = len(samples)
    for metric in metric_names:
        lower, upper = calculate_wilson_score(success_counts[metric], total_samples)
        confidence_intervals[metric] = {
            "lower": round(lower, 4),
            "upper": round(upper, 4),
            "successes": success_counts[metric],
            "total": total_samples
        }
    
    logger.info(f"Evaluation complete: {valid_count} valid, {error_count} errors")
    logger.info(f"Aggregate scores: {aggregate_scores}")
    
    return {
        "aggregate_scores": aggregate_scores,
        "confidence_intervals": confidence_intervals,
        "results": processed_results,
        "summary": {
            "total_samples": total_samples,
            "valid_evaluations": valid_count,
            "errors": error_count
        }
    }
