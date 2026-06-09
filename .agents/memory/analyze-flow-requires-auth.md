---
name: AI analyze/identify endpoints — optional auth
description: The damage-assessment AI flow is anonymous-allowed; per-IP limit is the only guard for logged-out callers
---

# AI damage flow: optional auth (anonymous allowed)

`POST /api/analyze` and `POST /api/identify-car` use **optionalCustomer** middleware:
a valid Bearer token attaches the customer, but anonymous callers are allowed (no 401).
Rationale: product wants damage assessment without forcing login; actual RFQ submission
(`/api/laqit-inspections/*`, payments) still requires a logged-in customer.

**Abuse guard:** the per-customer AI limiter only applies when a customerId is present,
so the **per-IP limiter (40/hr) is the sole cost/DoS guard for anonymous callers** — do
not remove it, and tune it if anonymous abuse appears.

Historically this flow *did* require auth, and "the app reports NO damaged parts" was
once a swallowed 401 (the client used a silent `catch {}` while logged out, so the user
saw an empty list with zero feedback).

**Why:** silent catches on network calls turn an actionable error into a phantom "the AI
is broken." Always distinguish 401 / non-ok / empty-but-ok / network error and tell the
user which it is.

**How to apply:** when an AI/vision feature "returns nothing," check the **backend logs
for the actual status** (401/429/500) before touching the prompt or model. The auth token
lives in memory (`setAuthToken`) and is restored on hydrate (localStorage on web,
SecureStore on native) — web storage works, so a 401 means genuinely-not-logged-in, not a
storage bug.
