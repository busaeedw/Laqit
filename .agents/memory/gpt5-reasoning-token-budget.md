---
name: gpt-5 reasoning token budget exhaustion
description: Why gpt-5 vision/JSON endpoints can silently return empty output, and how to budget tokens.
---

# gpt-5 reasoning models consume max_completion_tokens with reasoning tokens

On gpt-5 (a reasoning model), reasoning tokens count against `max_completion_tokens`. If the prompt is large/complex and `reasoning_effort` is high enough, the model can spend the entire budget on reasoning and return an **empty `message.content`** with `finish_reason: "length"`. Parsing that empty content yields `{}`, which then fails any structure check and looks like "no results" rather than an error.

**Why:** This is exactly what broke the `/api/analyze` damage detection — an expanded prompt (scan every zone + infer internal damage) plus `reasoning_effort: "medium"` and `max_completion_tokens: 8192` exhausted the budget on reasoning, so zero parts were ever returned (and calls took ~84s).

**How to apply:**
- For structured extraction / vision-to-JSON tasks, prefer `reasoning_effort: "low"` — it is enough for well-specified schemas and roughly halves latency.
- Give generous output headroom (e.g. 16384) so reasoning + the full JSON both fit.
- Always branch on `finish_reason === "length"` and on empty/whitespace `content`, and return an explicit error (e.g. 502) instead of silently downgrading to an empty result — silent empty output is indistinguishable from a legitimate "nothing found".
