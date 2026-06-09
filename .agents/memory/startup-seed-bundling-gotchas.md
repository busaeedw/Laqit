---
name: Startup seed/repair gotchas (bundled server)
description: CLI-guard breaks when seed module is bundled into the server entry; plus Postgres has no MIN(uuid). Both caused a prod outage.
---

# Startup seed / data-repair gotchas

## CLI-runner guard fails inside the bundled production server
A common pattern: a `seed.ts` exports library functions AND has a bottom CLI
block guarded by
`import.meta.url === pathToFileURL(process.argv[1]).href` so `tsx server/seed.ts`
runs it but importing it does not.

**This guard is WRONG once the server entry imports the seed module and the
production build bundles everything into one file** (e.g. esbuild →
`server_dist/index.js`). In the bundle, `import.meta.url` and `process.argv[1]`
both resolve to the **same** entry file, so the guard is TRUE and the CLI block
executes inside the running server. If that block calls `process.exit(0)` after
seeding, the server dies right after `listen` → deploy healthchecks get
"connection refused" → app shows **Service Unavailable**. It also re-runs the raw
seed every restart, duplicating any table without a unique constraint.

**Fix:** additionally require the invoked entry file's basename to be the seed
file, e.g. `&& /(^|[\\/])seed\.(ts|js|mjs|cjs)$/.test(process.argv[1])`. In the
bundle the entry is `index.js`, so the block won't fire.
**Why:** dev runs separate files via tsx; prod bundles them — the URL-equality
check can't distinguish "run directly" from "bundled as entry".
**How to apply:** any module that is BOTH imported by the server AND has a
direct-run CLI block must gate on the entry filename, not just module URL.

## Postgres has no MIN()/MAX() aggregate for `uuid`
`SELECT MIN(uuid_col)` errors with `function min(uuid) does not exist`. To pick a
deterministic canonical uuid per group, cast through text:
`MIN(uuid_col::text)::uuid`. Comparisons (`<>`, `=`) on uuid work fine; only the
aggregate is missing.

## Path aliases (@shared/*) break the bundled production server
Dev runs via `tsx`, which honors tsconfig `paths`, so `import ... from
"@shared/schema"` resolves. But the production build bundles with
`esbuild ... --packages=external`, which externalizes **every** bare/aliased
specifier (anything not starting with `.` or `/`) BEFORE applying tsconfig
`paths`. So `@shared/schema` is left as an external import in
`server_dist/index.js`, and `node` throws `ERR_MODULE_NOT_FOUND: Cannot find
package '@shared/schema'` at startup → deploy healthchecks return 500.
**Symptom:** dev fine, prod crashes immediately on boot; the bundle contains
`import ... from "@shared/schema"` and none of the schema is inlined (no
`pgTable` in the bundle).
**Fix:** server-side code must import shared modules with **relative** paths
(`../shared/schema`, `../../shared/schema`, …) so esbuild bundles them. The
`@shared` alias is fine in client code but must not be used in any file that
ends up in the esbuild server bundle.
**Why:** can't edit `package.json` (the build command with `--packages=external`)
or `scripts/`, so the imports themselves must be relative.
**How to apply:** after any task that touches server imports, grep
`rg "@shared|from ['\"]@/" server/` — it must return nothing. Verify the bundle
inlines the schema (`rg -c pgTable server_dist/index.js` > 0) and boots via
`PORT=5050 NODE_ENV=production node server_dist/index.js`.

## Deduping a table with FK references safely
When collapsing duplicate rows (e.g. `cities` with no unique constraint) keep the
canonical row and, in one transaction: (1) for any child table with a UNIQUE that
includes the FK column (e.g. `vendor_locations UNIQUE(vendor_id, city_id)`),
delete redundant child rows that would collide after repoint (rank by ctid, keep
rn=1); (2) repoint all child FK columns to the canonical id; (3) delete the
duplicate parent rows. Guard grouping with `WHERE name_en IS NOT NULL` so NULLs
aren't merged. Make it idempotent (count vs distinct check) + advisory-locked so
it's safe to run on every boot and across concurrent instances.
