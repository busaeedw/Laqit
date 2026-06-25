---
name: Expo import-not-installed passes dev but fails publish
description: Why a missing Expo dependency only breaks the production deploy build, and how to fix it deterministically.
---

An Expo package that is `import`ed in client code but NOT listed in `package.json`
can still appear to "work" in the dev workflow (Metro HMR + a warm cache can mask it),
yet the **production publish build fails** at the static Metro bundling step with
`Unable to resolve "<pkg>" from "<file>"` → iOS/Android bundle HTTP 500 → build `failed`.

**Why:**
- The deploy build runs `npm run expo:static:build` which does a clean Metro bundle
  (cache cleared) for ios+android. A missing module that dev tolerated is now fatal.
- This is a build-phase failure, not promote/serve — the fix is a dependency change,
  not a config or health-check change.

**How to apply:**
- Diagnose deploy failures with `listDeploymentBuilds` + `getDeploymentBuild` (tail the
  logs — the real error is near the end, under the Metro progress bars).
- Before installing, scan the whole client for bare imports and diff against
  `node_modules` so you fix every missing package at once (one publish failure only
  reports the first unresolved module).
- Install the SDK-correct version: read the exact pin from
  `node_modules/expo/bundledNativeModules.json` (that's what `expo install` would pick),
  then install via the package tool, e.g. `expo-clipboard@~8.0.8` for SDK 54. Do not
  hand-edit package.json.
