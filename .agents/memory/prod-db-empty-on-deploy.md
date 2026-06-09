---
name: Production database starts empty on deploy
description: Replit deployments use a separate prod DB whose schema is migrated but whose seed/reference DATA is empty; self-heal on startup.
---

# Production database is separate from dev and starts empty

On Replit, a published/deployed app gets its **own** production PostgreSQL
database, distinct from the development database. The Publish flow **migrates the
schema** (tables exist) but does **not** copy seed/reference DATA. The DB skill's
production `executeSql` is **read-only**, so you cannot manually INSERT into prod.

**Symptom:** dev works, but the deployed app shows empty lists / fallback UI, and
production logs show endpoints returning empty arrays (e.g. `{"makes":[]}`) with a
200 status. Tables exist; they're just empty.

**Fix pattern:** self-heal reference data on server startup — a `seedIfEmpty()`
that checks a sentinel table (e.g. `car_makes`) and runs the seed only when empty.
- Make it idempotent (early-return when already seeded; `onConflictDoNothing`).
- Call it **non-blocking** inside the `server.listen` callback so it never delays
  startup or healthchecks.
- Guard the seed file's CLI runner with
  `import.meta.url === pathToFileURL(process.argv[1]).href` so importing it from
  the server does not auto-run + `process.exit`.
- For multi-instance cold starts, wrap the seed in a Postgres **advisory lock**
  (`pg_try_advisory_lock` on a dedicated pooled connection from `pg.Pool`), then
  re-check emptiness after acquiring it (TOCTOU). Needed because some seeded
  tables (cities, vendors) lack unique constraints and would otherwise duplicate.

**Why:** without startup self-seeding, every fresh deploy needs manual data
loading that the read-only prod SQL access can't do.

**How to apply:** any app that depends on seeded reference data must self-seed on
boot; changing seed code requires re-publishing for prod to pick it up.
