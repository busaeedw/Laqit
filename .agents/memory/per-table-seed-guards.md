---
name: Per-table seed guards for production
description: Pattern for seeding new reference tables in an already-live production DB where seedIfEmpty has already exited permanently.
---

## The Rule

`seedIfEmpty()` gates on `cities` being empty. Once production has cities (which it does after the first deploy), it exits early on every boot and will never seed anything new. Every reference table added after go-live must have its own independent `seedXIfEmpty()` function with its own advisory lock key.

**Why:** Production DB is pre-populated with cities/makes on first deploy. Adding a new reference table (e.g. `car_make_agents`) to `seedReferenceData()` has no effect on existing deployments — `seedIfEmpty` never reaches that code again.

**How to apply:**
1. Write a standalone `seedXIfEmpty()` in `seed.ts` that checks the new table directly, acquires its own advisory lock (pick a unique integer constant), and inserts data.
2. Add it to the startup chain in `server/index.ts` after `seedIfEmpty()`.
3. Use `.onConflictDoNothing()` so re-runs are always safe.
4. Each new table needs its own distinct `ADVISORY_LOCK_KEY` integer constant (existing ones: 742193 = cities, 742194 = dedupe, 742195 = agents).
