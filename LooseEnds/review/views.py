import tempfile
import subprocess
import os
import sys
import re
import ast
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import AnonRateThrottle
from .serializers import ReviewRequestSerializer
from .services.prompt import REVIEW_SYSTEM_PROMPT
from .services.llm_client import call_review_model, ModelCallError
from .services.validator import parse_report, InvalidReportError
from .models import GoldenRule


class ReviewThrottle(AnonRateThrottle):
    scope = "review"


class UltimateReviewView(APIView):
    throttle_classes = [ReviewThrottle]

    def post(self, request):
        serializer = ReviewRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        original_code = data["code"]
        language = data["language"]
        
        current_code = original_code
        timeline = []
        applied_fixes = []

        # 1. AUTO-INDENT PHASE
        if data.get("auto_indent") and language in ["python", "auto"]:
            try:
                tree = ast.parse(current_code)
                current_code = ast.unparse(tree)
                timeline.append({"step": "Auto-Indent", "status": "success", "message": "Code formatted using Python AST."})
            except SyntaxError:
                timeline.append({"step": "Auto-Indent", "status": "error", "message": "Syntax error, skipped auto-indent."})
        
        # 2. DYNAMIC PROMPT BUILDING
        base_prompt = REVIEW_SYSTEM_PROMPT
        if language != "auto": base_prompt += f"\n\nCRITICAL CONTEXT: The code is written in {language}."
        if data["explain_simply"]: base_prompt += "\n\nCRITICAL CONTEXT: Explain defects using plain English."
        if data["convention_rules"]: base_prompt += f"\n\nCRITICAL CONTEXT: Enforce these strict rules:\n{data['convention_rules']}"
        if data.get("program_context"): base_prompt += f"\n\nCRITICAL CONTEXT: The user is writing code for: {data['program_context']}."
        if data.get("generate_comments"): base_prompt += "\n\nCRITICAL CONTEXT: Add helpful inline comments and docstrings to the code."
        if data.get("aware_of_comments"): base_prompt += "\n\nCRITICAL CONTEXT: Respect the user's inline comments. Do not flag intentional hacks or TODOs as bugs."

        # 3. SELF-LEARNING MEMORY VAULT
        try:
            top_rules = GoldenRule.objects.all().order_by('-score')[:5]
            if top_rules:
                learned_rules_text = "\n".join([
                    f"Rule: {r.rule_text}\nBad Example: {r.example_bad}\nGood Example: {r.example_good}" 
                    for r in top_rules
                ])
                base_prompt += f"\n\nCRITICAL: YOU MUST FOLLOW THESE LEARNED GOLDEN RULES:\n{learned_rules_text}"
        except Exception:
            pass

        # 4. AUTO-DETECT FUNCTIONS AND FUZZ
        function_names = []
        try:
            tree = ast.parse(current_code)
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef) or isinstance(node, ast.AsyncFunctionDef):
                    function_names.append(node.name)
        except Exception:
            pass

        if function_names:
            fuzz_tests = []
            for func in function_names:
                fuzz_tests.append(f"""
def test_fuzz_{func}():
    try: {func}(None)
    except Exception: pass
    try: {func}("string")
    except Exception: pass
    try: {func}([], {{}}, 0)
    except Exception: pass
""")
            
            fuzz_script = "import pytest\nfrom user_code import *\n\n" + "\n".join(fuzz_tests)

            max_iterations = 5
            for i in range(max_iterations):
                with tempfile.TemporaryDirectory() as tmpdir:
                    with open(os.path.join(tmpdir, "user_code.py"), "w") as f:
                        f.write(current_code)
                    with open(os.path.join(tmpdir, "test_fuzz.py"), "w") as f:
                        f.write(fuzz_script)

                    result = subprocess.run(
                        [sys.executable, "-m", "pytest", os.path.join(tmpdir, "test_fuzz.py"), "-v", "--tb=short"],
                        cwd=tmpdir, capture_output=True, text=True, timeout=10
                    )
                    
                    if result.returncode == 0:
                        timeline.append({"step": f"Fuzz Pass {i+1}", "status": "success", "message": f"All {len(function_names)} functions passed fuzzing."})
                        break

                    traceback_text = result.stdout + "\n" + result.stderr

                fix_prompt = base_prompt + f"\n\nCRITICAL CONTEXT: The code was executed and crashed. Here is the exact terminal output:\n{traceback_text}\n\nYou MUST provide a fix that prevents this crash. ONLY return the JSON."
                try:
                    raw = call_review_model(fix_prompt, current_code)
                    report = parse_report(raw, current_code)
                except Exception:
                    timeline.append({"step": f"Fuzz Fix {i+1}", "status": "error", "message": "AI failed to parse."})
                    break

                if not report["issues"]: break

                issue = report["issues"][0]
                issue["severity"] = "medium"
                
                lines = current_code.split('\n')
                idx = issue["line"] - 1
                if idx >= len(lines): idx = len(lines) - 1
                
                targetLine = lines[idx]
                indentationMatch = re.match(r'^(\s*)', targetLine)
                baseIndent = indentationMatch.group(1) if indentationMatch else ''
                
                actual_fix = issue["fix"].replace('\\n', '\n')
                fixLines = actual_fix.split('\n')
                formattedFixLines = []
                for fidx, line in enumerate(fixLines):
                    if fidx == 0:
                        formattedFixLines.append(baseIndent + line.strip())
                    else:
                        lineIndentMatch = re.match(r'^(\s*)', line)
                        lineIndent = lineIndentMatch.group(1) if lineIndentMatch else ''
                        finalIndent = baseIndent + lineIndent if lineIndent else baseIndent
                        formattedFixLines.append(finalIndent + line.strip())

                lines[idx : idx + issue["replacement_lines"]] = formattedFixLines
                current_code = '\n'.join(lines)
                
                issue["line"] = idx + 1
                applied_fixes.append(issue)
                timeline.append({"step": f"Fuzz Fix {i+1}", "status": "warning", "message": issue["description"]})

        # 5. FINAL STATIC REVIEW & AUTO-APPLY
        static_prompt = base_prompt
        try:
            raw = call_review_model(static_prompt, current_code)
            final_report = parse_report(raw, current_code)
            timeline.append({"step": "Final Review", "status": "success", "message": "Static analysis complete."})
            
            # Auto-apply the static fixes
            for issue in final_report["issues"]:
                lines = current_code.split('\n')
                idx = issue["line"] - 1
                if idx >= len(lines): idx = len(lines) - 1
                
                targetLine = lines[idx]
                indentationMatch = re.match(r'^(\s*)', targetLine)
                baseIndent = indentationMatch.group(1) if indentationMatch else ''
                
                actual_fix = issue["fix"].replace('\\n', '\n')
                fixLines = actual_fix.split('\n')
                formattedFixLines = []
                for fidx, line in enumerate(fixLines):
                    if fidx == 0:
                        formattedFixLines.append(baseIndent + line.strip())
                    else:
                        lineIndentMatch = re.match(r'^(\s*)', line)
                        lineIndent = lineIndentMatch.group(1) if lineIndentMatch else ''
                        finalIndent = baseIndent + lineIndent if lineIndent else baseIndent
                        formattedFixLines.append(finalIndent + line.strip())

                lines[idx : idx + issue["replacement_lines"]] = formattedFixLines
                current_code = '\n'.join(lines)
                
                issue["line"] = idx + 1
                applied_fixes.append(issue)
                timeline.append({"step": "Static Fix", "status": "warning", "message": issue["description"]})

        except Exception as e:
            final_report = {"summary": "Fuzzing complete, but static review failed.", "issues": []}
            timeline.append({"step": "Final Review", "status": "error", "message": str(e)})

        # Combine applied fixes and remaining issues
        all_issues = applied_fixes + final_report.get("issues", [])
        order = {"high": 0, "medium": 1, "low": 2}
        all_issues.sort(key=lambda i: order.get(i["severity"], 3))
        
        for issue in all_issues:
            issue["is_applied"] = True

        return Response({
            "passed": len(all_issues) == 0,
            "original_code": original_code,
            "final_code": current_code,
            "issues": all_issues,
            "timeline": timeline,
            "summary": final_report.get("summary", "Analysis complete.")
        }, status=status.HTTP_200_OK)


class FeedbackView(APIView):
    def post(self, request):
        original_code = request.data.get("original_code", "")
        ai_final_code = request.data.get("ai_final_code", "")
        user_corrected_code = request.data.get("user_corrected_code", "")
        reason = request.data.get("reason", "")
        
        if not original_code or not ai_final_code:
            return Response({"error": "Missing original or final code"}, status=400)

        if not user_corrected_code:
            user_corrected_code = ai_final_code

        # Use standard triple quotes, no markdown backticks inside the f-string
        distill_prompt = f"""You are an AI learning agent. The user provided feedback on a complete code review session.
        
The Original Code (what the user pasted):
{original_code}

The AI's Final Fixed Code (what LooseEnds produced):
{ai_final_code}

The User's Corrected Code (what the code SHOULD actually be):
{user_corrected_code}

User's Reason / Feedback:
{reason}

Your task: Extract a generalized Golden Rule from this interaction so the AI improves for next time. 
Look at the differences between the AI's code and the User's code. What did the AI misunderstand? Was it too pedantic? Did it miss a security flaw? Did it ruin the indentation?

Format your response exactly like this:
RULE: [1 sentence rule summarizing the lesson]
BAD EXAMPLE: [1 short code snippet showing what the AI did wrong]
GOOD EXAMPLE: [1 short code snippet showing the correct approach]
"""
        try:
            raw_rule = call_review_model("You are a helpful coding assistant.", distill_prompt)
            
            rule_text = ""
            example_bad = ""
            example_good = ""
            
            if "RULE:" in raw_rule:
                parts = raw_rule.split("RULE:")
                rest = parts[1]
                rule_text = rest.split("BAD EXAMPLE:")[0].strip()
                example_bad = rest.split("BAD EXAMPLE:")[1].split("GOOD EXAMPLE:")[0].strip()
                example_good = rest.split("GOOD EXAMPLE:")[1].strip()
            
            GoldenRule.objects.create(
                rule_text=rule_text or "A new rule was learned.",
                example_bad=example_bad,
                example_good=example_good,
                category="learned"
            )
            
            return Response({"status": "success", "message": "Golden Rule saved to memory vault."}, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)