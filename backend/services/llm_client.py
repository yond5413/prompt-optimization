import os
from pathlib import Path
import httpx
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Load .env.local file from backend directory
backend_dir = Path(__file__).parent.parent
load_dotenv(dotenv_path=backend_dir / ".env.local")

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


async def call_llm(
    messages: list[Dict[str, str]],
    model: str = "openai/gpt-oss-120b:free",
    temperature: float = 0.7,
    max_tokens: Optional[int] = None
) -> str:
    """Call OpenRouter API"""
    if not OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY must be set")
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": "https://prompt-optimization.local",
        "X-Title": "Prompt Optimization Platform"
    }
    
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature
    }
    
    if max_tokens:
        payload["max_tokens"] = max_tokens
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{OPENROUTER_BASE_URL}/chat/completions",
            headers=headers,
            json=payload,
            timeout=60.0
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]

