"""Client for LLM inference. Supports Nebius, Ollama Cloud, and Ollama Local with graceful fallbacks."""

import json
from openai import OpenAI, APIError, APITimeoutError, AuthenticationError
from django.conf import settings
from ..schema import REPORT_JSON_SCHEMA


class ModelCallError(Exception):
    """Raised when the upstream model call fails in a known way."""

    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


def _client() -> OpenAI:
    if not settings.NEBIUS_API_KEY:
        raise ModelCallError("API key not configured", 500)
    
    return OpenAI(
        base_url=settings.NEBIUS_BASE_URL,
        api_key=settings.NEBIUS_API_KEY,
        timeout=120.0,
        max_retries=1,
    )


def _is_ollama() -> bool:
    """Detect if we are running against an Ollama instance (cloud or local)."""
    url = settings.NEBIUS_BASE_URL.lower()
    return "ollama" in url or "11434" in url


def call_review_model(system_prompt: str, user_code: str) -> str:
    """Send code to the configured LLM. Returns raw JSON string."""
    
    client = _client()
    is_ollama = _is_ollama()
    
    messages = [{"role": "system", "content": system_prompt}]
    
    # Fallback for Ollama: Inject schema directly into the prompt since response_format is often ignored.
    if is_ollama:
        schema_str = json.dumps(REPORT_JSON_SCHEMA, indent=2)
        messages[0]["content"] += (
            f"\n\nCRITICAL: You MUST respond with a raw JSON object matching this exact JSON Schema:\n"
            f"{schema_str}\n"
            f"Do not wrap the JSON in markdown blocks. Do not include any conversational text."
        )
    
    messages.append({"role": "user", "content": user_code})

    kwargs = {
        "model": settings.NEBIUS_MODEL,
        "messages": messages,
        "temperature": 0.0,
    }
    
    # For Nebius/OpenAI, use hard decoding-level schema enforcement.
    # For Ollama, rely on the prompt injection above.
    if not is_ollama:
        kwargs["response_format"] = {
            "type": "json_schema",
            "json_schema": REPORT_JSON_SCHEMA,
        }

    try:
        response = client.chat.completions.create(**kwargs)
    except AuthenticationError:
        raise ModelCallError("Authentication failed. Check your API key.", 502)
    except APITimeoutError:
        raise ModelCallError("The model request timed out.", 504)
    except APIError as exc:
        msg = str(exc.message) if hasattr(exc, "message") else str(exc)
        raise ModelCallError(f"Model API error: {msg}", 502)
    except Exception as exc:
        raise ModelCallError(f"Unexpected error during model call: {str(exc)}", 502)

    content = response.choices[0].message.content
    if not content:
        raise ModelCallError("Model returned empty content.", 502)
        
    return content