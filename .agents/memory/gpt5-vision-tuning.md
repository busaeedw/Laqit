---
name: gpt-5 vision damage-detection tuning
description: How to get gpt-5 vision (chat.completions) to actually report car damage in /api/analyze
---

# gpt-5 vision damage detection

The car-damage analysis (`POST /api/analyze`, and the OCR/identify-car vision calls)
runs on gpt-5 via `openai.chat.completions.create`. When it was first switched from
gpt-4o it returned **zero** damaged parts on real damaged-car photos.

What actually fixed detection (in priority order):
- **`image_url: { url, detail: "high" }`** — the single biggest factor. Without
  `detail:"high"` gpt-5 sees a downscaled image and misses scratches/dents.
- **A systematic zone-by-zone prompt** (front/rear/sides/glass/wheels/lights/paint)
  telling it to report EVERY visible defect as its own part entry and only return an
  empty array if the car is pristine or absent.

Token / reasoning constraints (gpt-5 specific):
- gpt-5 rejects `max_tokens`; use **`max_completion_tokens`**. Reasoning tokens are
  spent out of that same budget, so a small cap (e.g. 256/500) can yield empty/truncated
  JSON → `carInfo` undefined → app falls back to empty parts. Keep it generous (analyze
  uses 8192).
- **`reasoning_effort`**: `"high"` ≈ 61s latency and was actually *less* thorough on one
  test (1 part) than `"medium"` ≈ 34s (2 parts). **`"medium"` is the chosen sweet spot**
  for latency vs. quality. Do not bump to high without a UX reason.

**Why:** mobile users wait on this call synchronously; 60s+ feels broken. medium keeps
it usable while still detecting multiple defects.

**How to apply:** if detection regresses, first confirm `detail:"high"` is present and
the token budget is large; only then touch the prompt or reasoning_effort. Log
`finish_reason` — `"length"` means the budget was exhausted (raise it).
