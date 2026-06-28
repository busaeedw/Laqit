---
name: OTP now enforced on login + register
description: Current state of customer phone-ownership verification (OTP) on login and registration.
---

# OTP enforced on login + register

An earlier build had customer **login bypass OTP** (phone number alone yielded
a token). That bypass was **removed** by later security work — both
registration and login now require proving phone ownership via SMS OTP:

- Register issues an OTP and only creates the account after
  `POST /api/customers/verify-otp` succeeds.
- Login issues an OTP (for an existing customer or an in-flight registration)
  and returns a token only after OTP verification.

**Why it matters:** do not "restore" the old bypass — treating unverified
registration input as authoritative identity is the spoofing risk called out
in the threat model.

Actual SMS delivery of these OTP codes goes through Twilio — see
`sms-otp-twilio.md`.
