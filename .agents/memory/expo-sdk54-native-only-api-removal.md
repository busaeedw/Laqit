---
name: Expo SDK 54 native-only API-removal crashes
description: Why some Expo Go crashes never reproduce on web, and how SDK 54 moved legacy APIs off default exports (e.g. expo-file-system).
---

# Native-only crashes from SDK 54 API removals

**Rule:** When an Expo screen crashes on the device (Expo Go) but the web preview
and Playwright e2e run clean, suspect a native-only code path calling an Expo API
that the SDK version no longer exports. tsc may also be clean if the import still
resolves to a namespace — the member is just `undefined` at runtime.

**Concrete case (SDK 54, expo-file-system v19):** the package's *default* export
(`import * as FileSystem from "expo-file-system"`) dropped the legacy file API —
`cacheDirectory`, `documentDirectory`, `writeAsStringAsync`, `readAsStringAsync`,
`EncodingType`, `downloadAsync`. The default export now exposes only the new
File/Directory/Paths API + deprecation warnings. Calling the old members throws
`TypeError` (e.g. reading `.Base64` of undefined, or "x is not a function").
Fix: import from the documented subpath `import * as FileSystem from "expo-file-system/legacy"`.

**Why this hides on web:** the screens' web branches use Blob + object URLs +
iframe/anchor download, and never touch FileSystem; only the native branch calls
it. So the web preview, screenshots, and the web-driven testing subagent all pass
while the device crashes. Do not treat a green web e2e as proof the device is fixed.

**How to apply:**
- For a reported "Mobile App artifact crashed" that you can't reproduce on web,
  grep native-only API usage (FileSystem, Sharing, camera/file flows) and verify
  each Expo import's members still exist in the installed package version, not just
  that the package dir exists.
- After fixing, the user on Expo Go must reload the app to pull the new Metro
  bundle; the dev server already serves the fix via HMR/reload.
- Published Expo apps here are served from prebuilt static bundles — a republish/
  rebuild is needed so production stops serving the old bundle.
