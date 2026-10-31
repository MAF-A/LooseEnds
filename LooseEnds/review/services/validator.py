"""Parse the schema-enforced model output into a Report. Handles markdown and local-model quirks."""

import json
import re
from pydantic import ValidationError
from ..schema import Report


class InvalidReportError(Exception):
    """Model returned output that does not match the contract."""


def _extract_json(raw: str) -> str:
    """Extract the JSON object from the model's response, ignoring prose and markdown."""
    text = raw.strip()
    
    # 1. Remove markdown code blocks if they exist
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*```$", "", text)
    
    # 2. Find the outermost JSON object boundaries
    start = text.find("{")
    end = text.rfind("}")
    
    if start != -1 and end != -1 and start < end:
        text = text[start:end + 1]
        
    return text


def _clean_trailing_commas(json_str: str) -> str:
    """Remove trailing commas before closing brackets/braces (common in small models)."""
    return re.sub(r",\s*([\]}])", r"\1", json_str)


def parse_report(raw: str, submitted_code: str) -> dict:
    """Parse, validate against Pydantic, enforce line bounds, sort. Returns plain dict."""
    
    cleaned_raw = _extract_json(raw)
    cleaned_raw = _clean_trailing_commas(cleaned_raw)

    try:
        data = json.loads(cleaned_raw)
    except json.JSONDecodeError as exc:
        raise InvalidReportError(f"Model output is not valid JSON: {exc}")

    try:
        report = Report.model_validate(data)
    except ValidationError as exc:
        errors = exc.errors()
        error_msg = errors[0]["msg"] if errors else "Unknown validation error"
        raise InvalidReportError(f"Model output violates contract: {error_msg}")

    max_line = submitted_code.count("\n") + 1

    for issue in report.issues:
        if issue.line > max_line:
            issue.line = max_line

    order = {"high": 0, "medium": 1, "low": 2}
    report.issues.sort(key=lambda i: (order[i.severity], i.line))

    return report.model_dump()