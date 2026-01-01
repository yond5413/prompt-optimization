import os
import logging
import asyncio
from pathlib import Path
import httpx
from typing import Dict, Any, Optional

from dotenv import load_dotenv

# Load .env.local file from backend directory
backend_dir = Path(__file__).parent.parent
env_local_path = backend_dir / ".env.local"
if env_local_path.exists():
    load_dotenv(dotenv_path=env_local_path)
else:
    load_dotenv()

logger = logging.getLogger(__name__)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

# Default model - use a valid free model
DEFAULT_MODEL = "xiaomi/mimo-v2-flash:free"

# Retry configuration
MAX_RETRIES = 3
INITIAL_BACKOFF = 5.0  # seconds
MAX_BACKOFF = 30.0  # seconds


class LLMError(Exception):
    """Custom exception for LLM-related errors"""
    def __init__(self, message: str, status_code: Optional[int] = None, response_body: Optional[str] = None):
        super().__init__(message)
        self.status_code = status_code
        self.response_body = response_body


async def call_llm(
    messages: list[Dict[str, str]],
    model: str = DEFAULT_MODEL,
    temperature: float = 0.7,
    max_tokens: Optional[int] = None,
    response_format: Optional[Dict[str, str]] = None,
    retry_count: int = MAX_RETRIES
) -> str:
    """
    Call OpenRouter API with retry logic and error handling.
    
    Args:
        messages: List of message dicts with 'role' and 'content'
        model: Model identifier (default: openai/gpt-oss-20b:free)
        temperature: Sampling temperature (0.0-2.0)
        max_tokens: Maximum tokens in response
        response_format: Optional format hint (e.g., {"type": "json_object"})
        retry_count: Number of retries on failure
        
    Returns:
        The content string from the LLM response
        
    Raises:
        LLMError: If all retries fail or API key is missing
    """
    if not OPENROUTER_API_KEY:
        raise LLMError("OPENROUTER_API_KEY environment variable must be set")
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": os.getenv("FRONTEND_URL", "https://prompt-optimization.local"),

        "X-Title": "Prompt Optimization Platform",
        "Content-Type": "application/json"
    }
    
    payload: Dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature
    }
    
    if max_tokens:
        payload["max_tokens"] = max_tokens
        
    if response_format:
        payload["response_format"] = response_format
    
    last_error: Optional[Exception] = None
    backoff = INITIAL_BACKOFF
    
    for attempt in range(retry_count):
        try:
            logger.debug(f"LLM call attempt {attempt + 1}/{retry_count} to model {model}")
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{OPENROUTER_BASE_URL}/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=120.0  # Increased timeout for longer responses
                )
                
                # Log response status
                logger.debug(f"LLM response status: {response.status_code}")
                
                if response.status_code == 200:
                    result = response.json()
                    content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
                    
                    if not content:
                        logger.warning("LLM returned empty content")
                        raise LLMError("LLM returned empty content", status_code=200)
                    
                    logger.debug(f"LLM call successful, response length: {len(content)}")
                    return content
                    
                elif response.status_code == 429:
                    # Rate limited - wait and retry
                    logger.warning(f"Rate limited (429), waiting {backoff}s before retry")
                    await asyncio.sleep(backoff)
                    backoff = min(backoff * 2, MAX_BACKOFF)
                    continue
                    
                elif response.status_code >= 500:
                    # Server error - retry
                    logger.warning(f"Server error ({response.status_code}), waiting {backoff}s before retry")
                    await asyncio.sleep(backoff)
                    backoff = min(backoff * 2, MAX_BACKOFF)
                    continue
                    
                else:
                    # Client error (4xx) - don't retry, raise immediately
                    error_body = response.text
                    logger.error(f"LLM API error: {response.status_code} - {error_body}")
                    raise LLMError(
                        f"LLM API error: {response.status_code}",
                        status_code=response.status_code,
                        response_body=error_body
                    )
                    
        except httpx.TimeoutException as e:
            logger.warning(f"LLM call timed out on attempt {attempt + 1}")
            last_error = e
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, MAX_BACKOFF)
            
        except httpx.RequestError as e:
            logger.warning(f"LLM request error on attempt {attempt + 1}: {str(e)}")
            last_error = e
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, MAX_BACKOFF)
            
        except LLMError:
            raise
            
        except Exception as e:
            logger.error(f"Unexpected error in LLM call: {str(e)}")
            last_error = e
            break
    
    # All retries exhausted
    error_msg = f"LLM call failed after {retry_count} attempts"
    if last_error:
        error_msg += f": {str(last_error)}"
    logger.error(error_msg)
    raise LLMError(error_msg)


async def call_llm_with_fallback(
    messages: list[Dict[str, str]],
    models: list[str] = None,
    temperature: float = 0.7,
    max_tokens: Optional[int] = None,
    response_format: Optional[Dict[str, str]] = None
) -> str:
    """
    Call LLM with fallback to alternative models if primary fails.
    
    Args:
        messages: List of message dicts
        models: List of models to try in order (default: [DEFAULT_MODEL])
        temperature: Sampling temperature
        max_tokens: Maximum tokens in response
        response_format: Optional format hint
        
    Returns:
        The content string from the first successful LLM response
    """
    if models is None:
        models = [DEFAULT_MODEL]
    
    last_error: Optional[Exception] = None
    
    for model in models:
        try:
            logger.info(f"Trying model: {model}")
            return await call_llm(
                messages=messages,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                response_format=response_format,
                retry_count=2  # Fewer retries per model when using fallback
            )
        except LLMError as e:
            logger.warning(f"Model {model} failed: {str(e)}")
            last_error = e
            continue
    
    raise LLMError(f"All models failed. Last error: {str(last_error)}")
