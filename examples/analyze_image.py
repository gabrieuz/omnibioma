"""Chama a Interactions API com o mesmo contrato de análise da aplicação."""
from __future__ import annotations

import base64
import json
import mimetypes
import os
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

MODEL = "gemma-4-26b-a4b-it"
CATEGORIES = ["fire_smoke", "water_contamination", "waste_disposal", "uncertain", "out_of_scope"]
MISSING = ["burning_smell", "people_nearby", "water_use", "unusual_odor", "dumping_seen", "recent_rain", "affected_animals", "hazardous_material", "another_photo"]
SIGNS = ["flame_visible", "smoke_visible", "burned_vegetation", "people_exposed", "dead_fish", "unusual_water_color", "foam_on_water", "strong_odor", "waste_accumulation", "hazardous_material", "waste_burning", "poor_visibility", "sediment_after_rain", "no_clear_sign"]
SCHEMA = {
    "type": "object", "additionalProperties": False,
    "properties": {
        "category": {"type": "string", "enum": CATEGORIES},
        "confidence": {"type": "string", "enum": ["low", "medium", "high"]},
        "imageQuality": {"type": "string", "enum": ["poor", "fair", "good"]},
        "observedSigns": {"type": "array", "maxItems": 12, "items": {"type": "object", "additionalProperties": False, "properties": {"code": {"type": "string", "enum": SIGNS}, "source": {"type": "string", "enum": ["image", "report", "both"]}}, "required": ["code", "source"]}},
        "missingInformation": {"type": "array", "maxItems": 3, "items": {"type": "string", "enum": MISSING}},
        "summary": {"type": "string"}, "uncertainties": {"type": "array", "maxItems": 5, "items": {"type": "string"}}
    },
    "required": ["category", "confidence", "imageQuality", "observedSigns", "missingInformation", "summary", "uncertainties"]
}

def analyze(image_path: str, report: str) -> dict:
    """Retorna {analysis, meta}; nunca envia localização ou histórico."""
    key = os.environ["GEMINI_API_KEY"]
    image = Path(image_path).read_bytes()
    mime = mimetypes.guess_type(image_path)[0] or "image/jpeg"
    if mime not in {"image/jpeg", "image/png", "image/webp"} or len(image) > 2 * 1024 * 1024:
        raise ValueError("A imagem deve ser JPEG, PNG ou WebP e ter até 2 MB.")
    payload = {
        "model": MODEL, "store": False,
        "system_instruction": "Faça triagem ambiental preliminar em português. Descreva evidências e incertezas; não gere recomendações.",
        "input": [{"type": "text", "text": f"Relato da pessoa em campo:\n{report}"}, {"type": "image", "data": base64.b64encode(image).decode(), "mime_type": mime, "resolution": "medium"}],
        "generation_config": {"temperature": 0.15, "max_output_tokens": 1800, "thinking_level": "minimal", "thinking_summaries": "none"},
        "response_format": {"type": "text", "mime_type": "application/json", "schema": SCHEMA}
    }
    request = urllib.request.Request("https://generativelanguage.googleapis.com/v1beta/interactions", data=json.dumps(payload).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": key}, method="POST")
    with urllib.request.urlopen(request, timeout=60) as response:
        raw = json.load(response)
    output = "".join(block.get("text", "") for step in raw.get("steps", []) if step.get("type") == "model_output" for block in step.get("content", []) if block.get("type") == "text")
    return {"analysis": json.loads(output), "meta": {"provider": "google-gemini-api", "model": MODEL, "mode": "hosted", "durationMs": 0, "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"), "tokenUsage": raw.get("usage")}}
