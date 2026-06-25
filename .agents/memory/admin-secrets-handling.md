---
name: admin/server secrets must not be EXPO_PUBLIC_ or in .replit plaintext
description: Where server-side admin keys (e.g. ADMIN_API_KEY) belong and the two ways they leak.
---

Server-side / admin secrets must be stored ONLY as encrypted Replit Secrets, never as
`[userenv.shared]` env vars in `.replit` and never under the `EXPO_PUBLIC_` prefix.

**Why:**
- Anything `EXPO_PUBLIC_*` is intentionally inlined/bundled into the shipped Expo
  client, so an admin key with that prefix is effectively published to every user.
- `[userenv.shared]` values live in `.replit`, which is committed to git — plaintext
  secrets end up in history and any fork/clone.
- A past incident had `ADMIN_API_KEY` AND a duplicate `EXPO_PUBLIC_ADMIN_API_KEY`
  (identical value) sitting in `.replit` plaintext. Removing the public copy is not
  enough on its own: the value was already compromised, so it had to be rotated to a
  brand-new value and moved into a Secret.

**How to apply:**
- Use the environment-secrets tooling: `deleteEnvVars({environment:"shared"})` to pull
  a key out of `.replit`, then have the user set it via `requestEnvVar` as a Secret
  (agents can't set secret values directly).
- Deleting a shared env var does NOT change an already-running process's `process.env`;
  the new Secret only loads after a backend workflow restart — so rotate, then restart
  `Start Backend`, then verify.
- `requireAdmin` (server/auth.ts) reads `process.env.ADMIN_API_KEY`: returns 503 when
  the key is MISSING and 403 when present-but-wrong. So an unauthenticated call to a
  protected route returning 403 (not 503) is the quick confirmation the secret loaded.
- The admin web page (admin-agents.html) takes the key by manual entry; rotating the
  key just means signing in with the new value. No client code references the key.
