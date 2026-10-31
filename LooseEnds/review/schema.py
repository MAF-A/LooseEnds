"""Single source of truth for the output contract."""
from typing import Literal, Optional
from pydantic import BaseModel, Field, field_validator

Severity = Literal["high", "medium", "low"]
IssueType = Literal["logic", "security", "convention", "over-engineering", "missing-flow", "complexity"]

SEVERITIES = ("high", "medium", "low")
TYPES = ("logic", "security", "convention", "over-engineering", "missing-flow", "complexity")


class Issue(BaseModel):
    severity: Severity
    type: IssueType
    line: int = Field(ge=1)
    replacement_lines: int = Field(default=1, ge=1)
    description: str = Field(min_length=1, max_length=2000)
    fix: str = Field(min_length=1, max_length=4000)
    intermediate_fix: Optional[str] = Field(default=None, max_length=4000)
    test: Optional[str] = Field(default=None, max_length=4000)

    @field_validator("description", "fix", "test", "intermediate_fix")
    @classmethod
    def strip_whitespace(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip()
        return cleaned if cleaned else None


class Report(BaseModel):
    summary: str = Field(min_length=1, max_length=500)
    issues: list[Issue] = Field(default_factory=list)


REPORT_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "issues": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "severity": {"type": "string", "enum": list(SEVERITIES)},
                    "type": {"type": "string", "enum": list(TYPES)},
                    "line": {"type": "integer", "minimum": 1},
                    "replacement_lines": {"type": "integer", "minimum": 1},
                    "description": {"type": "string"},
                    "fix": {"type": "string"},
                    "test": {"type": "string"},
                },
                "required": ["severity", "type", "line", "replacement_lines", "description", "fix"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["summary", "issues"],
    "additionalProperties": False,
}