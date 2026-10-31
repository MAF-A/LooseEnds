import re
from rest_framework import serializers

# Detects common high-entropy API keys (AWS, Stripe, GitHub)
SECRET_PATTERN = re.compile(r'(AKIA[0-9A-Z]{16}|sk_live_[0-9a-zA-Z]{24}|ghp_[0-9a-zA-Z]{36})')


class ReviewRequestSerializer(serializers.Serializer):
    code = serializers.CharField(required=True, allow_blank=False, trim_whitespace=False, max_length=20000)
    language = serializers.CharField(required=False, default="auto", max_length=50)
    explain_simply = serializers.BooleanField(required=False, default=False)
    convention_rules = serializers.CharField(required=False, allow_blank=True, default="", max_length=10000)
    
    # Context Features
    program_context = serializers.CharField(required=False, allow_blank=True, default="", max_length=200)
    generate_comments = serializers.BooleanField(required=False, default=False)
    aware_of_comments = serializers.BooleanField(required=False, default=False)
    auto_indent = serializers.BooleanField(required=False, default=False)

    def validate_code(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError("code must contain non-whitespace")
        if SECRET_PATTERN.search(value):
            raise serializers.ValidationError("Potential API key or secret detected.")
        return value

    def validate_language(self, value: str) -> str:
        return "".join(c for c in value if c.isalnum() or c in "-_") or "auto"