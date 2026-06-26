---
name: Login + registration OTP — restored
description: OTP phone-ownership proof is now mandatory for both login and registration; this was previously disabled by user request and has since been re-enabled as a security fix.
---

# OTP is now required for both login and registration

`POST /api/customers/register` issues an OTP via SMS and returns `{requiresOtp:true}`.
The customer row is only inserted by `POST /api/customers/verify-otp` after the code is proven.

`POST /api/customers/login` also issues an OTP via SMS and returns `{requiresOtp:true}`.
No token is ever minted in the login/register routes themselves.

`POST /api/customers/verify-otp` handles both paths: if no account exists yet it runs the
insert (registration path); if the account already exists it updates lastLoginAt (login path).
In both cases it returns `{customer, token}`.

The client (`AccountScreen.tsx`) always transitions to the OTP step after either form
submission — there is no fast-path that stores a token from the first response.

**Why:** security fix — previously any caller who knew a phone number could obtain a valid
session token without proving phone ownership.

**How to apply:** if OTP ever needs to be bypassed again (dev convenience only), the right
pattern is a dev-env flag, not removing the OTP gate from the production routes.
