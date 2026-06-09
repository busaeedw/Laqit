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

## Platform-split modules (.native.ts / .web.ts) hide missing native deps until deploy
A `foo.web.ts` / `foo.native.ts` pair lets Metro pick a variant per platform. The
web dev server only bundles the `.web` variant, so a native-only dependency
imported in the `.native` variant (e.g. `expo-secure-store`) can be **missing
from node_modules** yet dev/web works fine. The deploy build
(`npm run expo:static:build` → `scripts/build.js`) builds the **iOS and Android**
bundles too, which pull in the `.native` variant → Metro `UnableToResolveError`
→ bundle HTTP 500 → publish fails.
**Symptom:** dev fine; publish/deploy fails; `scripts/build.js` prints
"Download failed: iOS bundle HTTP 500". Note `expo:static:build` exits 0 even on
this failure — do NOT trust its exit code.
**Diagnose:** `curl 'http://localhost:8081/client/index.bundle?platform=ios&dev=false&minify=true'`
returns a JSON `UnableToResolveError` naming the missing module and import stack.
**Fix:** install the missing package with `npx expo install <pkg>` (gets the
SDK-compatible version + registers any config plugin in app.json), then restart
the `Start Frontend` workflow so Metro picks up the new native module.
**How to apply:** any task that adds a `.native.ts` file must have its native
imports actually installed. After such merges, verify the iOS bundle returns 200,
not just that the web app runs.

## Build tools invoked by npm scripts must be declared, not hoist-borrowed
`server:build` calls a bare `esbuild` binary. esbuild was undeclared and only
worked because a transitive dep happened to hoist it to top-level `.bin`.
**Rule:** any tool a script invokes by bare name must be a first-class
dependency. **Why:** changing an unrelated transitive (e.g. via an override) can
re-trigger npm's hoist/dedupe and silently delete the borrowed top-level binary,
breaking the build with `sh: <tool>: not found`. Keep such build tools in
`dependencies` (not devDependencies) so they survive any deploy install mode;
bundled output doesn't import them so there's no runtime cost.

## Bumping transitive-dep vulns: scoped overrides, never `audit fix --force`
`npm audit fix --force` proposes major downgrades of expo/drizzle-kit here —
never run it. Fix transitive vulns with npm `overrides` **scoped to the direct
parent** (`"parentPkg": { "vuln": "^x" }`), never a bare global override of a
package that multiple tools depend on — a global pin can drag an unrelated tool
(e.g. the one running the dev server) onto an incompatible version.
**Why:** scoping changes exactly one path and leaves the rest of the tree intact.
**Apply:** edit package.json overrides, then reinstall — bash `npm install` is
blocked, so use code-execution `installLanguagePackages` (it re-resolves with the
new overrides; note it also adds the named pkg to `dependencies`, so clean up).

## Deduping a table with FK references safely
When collapsing duplicate rows (e.g. `cities` with no unique constraint) keep the
canonical row and, in one transaction: (1) for any child table with a UNIQUE that
includes the FK column (e.g. `vendor_locations UNIQUE(vendor_id, city_id)`),
delete redundant child rows that would collide after repoint (rank by ctid, keep
rn=1); (2) repoint all child FK columns to the canonical id; (3) delete the
duplicate parent rows. Guard grouping with `WHERE name_en IS NOT NULL` so NULLs
aren't merged. Make it idempotent (count vs distinct check) + advisory-locked so
it's safe to run on every boot and across concurrent instances.
