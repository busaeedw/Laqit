---
name: react-query global staleTime Infinity
description: Why admin mutations must explicitly invalidate their specific read query key, or edits look unsaved on reopen.
---

The TanStack Query client is configured with `defaultOptions.queries.staleTime: Infinity`
(in `client/lib/query-client.ts`). Cached query data is therefore never considered
stale on its own and is NOT refetched when a disabled query (`enabled: ...`) is
re-enabled / a modal is reopened.

**Rule:** After any mutation that changes data a screen reads, the mutation's
`onSuccess` MUST `queryClient.invalidateQueries` the *exact* query key(s) that screen
uses — not just adjacent list keys. Invalidation is the only thing that marks an
`Infinity`-staleTime entry stale so it refetches on next mount.

**Why:** The vendor "supported car makes" admin modal looked like it wasn't saving.
The PUT persisted correctly (verified in DB + backend 200s), but `onSuccess` only
invalidated `['/api/vendors/all']` / `['/api/vendors/public']`, never the per-vendor
`['/api/vendors', vendorId, 'car-makes']` read key. Reopening the same vendor served
the stale pre-save checkbox state, so the edit appeared lost.

**How to apply:** When wiring a mutation, list every query key whose data the
mutation affects and invalidate all of them. Prefer `variables.<id>` (mutation
variables) over component state for the key, since state may be cleared in the same
`onSuccess` (e.g. `setSelectedVendor(null)`). Watch for this in any other admin
edit modals that follow the same open→edit→save→reopen pattern.
