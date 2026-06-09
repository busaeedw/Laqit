---
name: Login + registration OTP intentionally disabled
description: Both customer login and registration bypass OTP by design (user request) — phone number / form data alone yields a token
---

# Login AND registration OTP are intentionally disabled

`POST /api/customers/login` logs an existing customer in **directly** from `mobileE164`
alone (updates lastLoginAt, signs JWT, returns `{customer, token}`) — no code.
`POST /api/customers/register` now also creates the customer row **directly** and returns
`{customer, token}` — no code sent or verified. The `/api/customers/verify-otp` route and
the `issueOtp`/`hasPendingOtp` machinery still exist but are effectively orphaned (only the
login resend branch references them); re-enabling OTP means re-wiring register/login to it.

**Why:** explicit user requests ("disable otp check when logging in", then "freeze the otp
during registration", both "for now") — testing convenience while SMS is stubbed.

**Security tradeoff (do NOT silently re-enable or treat as a bug):** this is broken
authentication — anyone who knows a customer's phone number (or just submits a registration
form) can obtain a valid token and impersonate/squat an account. Per-IP rate limiting does
not stop targeted takeover. Before any production launch, restore OTP on both flows (or gate
the bypass behind a dev-only env flag so production keeps OTP mandatory).

**How to apply:** if asked to "fix auth" or harden auth, reinstate the OTP step in
`server/routes.ts` (both login and register routes) and `client/screens/AccountScreen.tsx`
(`handleLogin` and `handleRegister`, which currently short-circuit to setSession when the
response carries a token). Re-point register/login at the existing `/api/customers/verify-otp`
flow.
