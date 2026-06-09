---
name: Login OTP intentionally disabled
description: Customer login bypasses OTP by design (user request) — phone number alone yields a token
---

# Login OTP is intentionally disabled

`POST /api/customers/login` logs an existing verified customer in **directly** from
`mobileE164` alone (updates lastLoginAt, signs JWT, returns `{customer, token}`) — no
verification code. Registration still requires OTP via `/api/customers/verify-otp`. The
login route still issues an OTP only for the register-resend case (`hasPendingOtp`).

**Why:** explicit user request ("disable otp check when logging in", "for now") — for
testing convenience while SMS is stubbed.

**Security tradeoff (do NOT silently re-enable or treat as a bug):** this is broken
authentication — anyone who knows a customer's phone number can obtain a valid token and
impersonate them. Per-IP rate limiting does not stop targeted takeover. Before any
production launch, restore OTP on login (or gate the bypass behind a dev-only env flag so
production keeps OTP mandatory).

**How to apply:** if asked to "fix login" or harden auth, reinstate the OTP step in both
`server/routes.ts` login route and `client/screens/AccountScreen.tsx` handleLogin (which
currently short-circuits to setSession when the response carries a token).
