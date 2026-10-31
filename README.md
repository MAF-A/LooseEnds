# LooseEnds

The knot tying vibe and code.

AI writes code fast, but it leaves **loose ends** — edge cases it never considered, inputs it trusted without validating, blocks that don't connect cleanly to the code around them. LooseEnds is the pre-merge code review tool for AI-generated code. It catches those loose threads before they unravel the merge.

Built for the **Nebius x NVIDIA Hackathon**, in the **Coding and Agentic Engineering** track.


## The Problem

AI programming agents write code in seconds and leave logic holes in their wake. Developers then spend hours debugging and stitching that output into a real codebase. The bottleneck in AI-assisted development has moved from *writing* code to *trusting* it.

LooseEnds is the second pair of eyes that catches what the agent missed — before merge, where fixes are still cheap.

## What It Does

Paste a block of AI-generated code. LooseEnds runs a three-phase pipeline and returns a prioritized, line-referenced report with concrete, copyable fixes.

### Phase 1: Static & Security Review
The AI scans for SQL injection, command injection, hardcoded secrets, unhandled edge cases, missing return statements, off-by-one errors, and convention violations. Every issue is tagged with severity, type, and line number.

### Phase 2: Autonomous Fuzzing Loop
The backend doesn't just *ask* the AI to write tests. It **executes** the code in a sandboxed subprocess, run against a matrix of adversarial inputs (`None`, empty lists, negative numbers, strings where numbers are expected, integers where lists are expected). When the code crashes, the engine captures the traceback, feeds it back to the model, auto-patches the code, and re-runs the fuzzer. The loop continues until the fuzzer passes or the iteration cap is reached.

### Phase 3: Self-Learning Memory Vault
If the user notices the AI missed something or made a mistake, they submit a correction through the feedback form. LooseEnds distills the correction into a generalized **Golden Rule**, stores it in a persistent database, and injects the top rules into every future prompt. The system learns from its mistakes without retraining — and because the rule store is model-agnostic, swapping the underlying LLM doesn't wipe the learning.


## How It Uses NVIDIA Nemotron on Nebius

LooseEnds is built around **NVIDIA Nemotron**, hosted on **Nebius Token Factory**.

- **Token Factory accelerated the workflow** by providing an OpenAI-compatible endpoint with low-latency responses. The autonomous fuzzing loop requires several model calls per request — the fast turnaround is what makes the demo feel near-instant instead of sluggish.
- **Strict JSON output** is enforced at the API level using `response_format={"type": "json_schema", "json_schema": ...}`, so the backend always receives a schema-valid response. Combined with a Pydantic validation layer, the frontend never sees malformed data.
- **Model-agnostic fallback layer** in `LooseEnds/review/services/llm_client.py` — if the Nebius endpoint is unavailable, the same prompts and same schema run against a local Ollama instance running the same Nemotron family model. The code path is otherwise identical.

Model configuration lives in `LooseEnds/.env`:
