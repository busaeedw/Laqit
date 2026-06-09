---
name: AI analyze/identify endpoints require customer auth
description: Why the New Inspection AI flow can silently show "no parts" — it's auth, not the model
---

# AI damage flow is auth-gated; silent catches hide 401

`POST /api/analyze` and `POST /api/identify-car` require a valid customer Bearer
token (per-customer + per-IP rate limited). If the user is **not logged in**, both
return `401 {"error":"غير مصرح"}` *before* any OpenAI call runs.

The classic failure report "the app reports NO damaged parts" was NOT a model/prompt
problem — it was the client (`NewInspectionScreen`) calling analyze while
unauthenticated and **swallowing the 401 with a silent `catch {}`**, so the user saw
an empty parts list with zero feedback.

**Why:** silent catches on auth-gated network calls turn an actionable "please log in"
into a phantom "the AI is broken." Always distinguish 401 (prompt login) / non-ok
(show server message) / empty-but-ok (inform user) / network error.

**How to apply:** when an AI/vision feature "returns nothing," check the **backend
logs for 401** before touching the prompt or model. On the client, gate AI calls
behind `isLoggedIn` and surface every branch. Token lives in memory (`setAuthToken`)
and is restored from storage on hydrate (localStorage on web, SecureStore on native) —
web storage works fine, so a 401 means genuinely-not-logged-in, not a storage bug.
