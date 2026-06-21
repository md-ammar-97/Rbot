import json
import hashlib
from groq import Groq
from app.core.config import settings

_client = Groq(api_key=settings.groq_api_key)


def groq_chat(
    model: str,
    system: str,
    user: str,
    temperature: float = 0.3,
    json_mode: bool = False,
    max_tokens: int = 4096,
) -> str | dict:
    kwargs = {"response_format": {"type": "json_object"}} if json_mode else {}
    resp = _client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
        **kwargs,
    )
    content = resp.choices[0].message.content or ""
    if json_mode:
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            return {}
    return content


def prompt_hash(system: str, user: str) -> str:
    return hashlib.sha256(f"{system}\n{user}".encode()).hexdigest()


def output_hash(content: str) -> str:
    return hashlib.sha256(content.encode()).hexdigest()
