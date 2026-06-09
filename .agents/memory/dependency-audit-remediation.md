---
name: Dependency vuln remediation (Expo + npm overrides)
description: How far npm audit fixes can go in this Expo/RN repo, the EOVERRIDE gotcha, and which advisories are framework-locked.
---

# Dependency vulnerability remediation

## What is safely fixable vs. framework-locked
- `npm audit fix` (NO `--force`) resolves transitive utility-lib advisories by
  bumping the lockfile within existing semver ranges — does not touch
  package.json. Safe and preferred first pass.
- A direct backend dep that needs a same-major (0.x) bump is fine to bump and
  verify at runtime (e.g. drizzle-orm). drizzle-zod peer is `drizzle-orm >=0.36`,
  so drizzle-orm 0.4x is compatible; the core select/insert/schema API is stable
  across 0.39→0.45 (no type or runtime breakage in our seed/routes/schema).
- The remaining moderate advisories in this repo are **framework-locked**: their
  only fix is forcing `expo@56` (major framework upgrade) or **downgrading**
  `drizzle-kit` 0.31→0.18. Both break the app / db:push and violate project rules
  (never change Expo major). They are build/dev-time tools (metro, @expo/*,
  @esbuild-kit, esbuild dev-server, xcode, uuid-via-expo) — not runtime-reachable
  in the deployed Express API. Leave them; do not `npm audit fix --force`.

## npm EOVERRIDE gotcha
`overrides` cannot target a package that is also a **direct dependency**
(`npm error EOVERRIDE ... conflicts with direct dependency`). To pin a direct
dep, bump the dependency itself (install at the target version); use `overrides`
only for **transitive** packages (e.g. postcss via expo metro-config).

## Applying overrides in this repo
`npm install` is blocked via the bash tool. Use the package-management skill's
`installLanguagePackages({language:"nodejs", packages:[...]})` to trigger a real
npm install that re-resolves and applies package.json `overrides`.
