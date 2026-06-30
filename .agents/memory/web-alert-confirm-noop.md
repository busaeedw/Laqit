---
name: Alert.alert confirm no-op on web
description: Why confirm dialogs silently fail on the web build and the cross-platform fix to use.
---

On react-native-web, `Alert.alert` button callbacks (the `onPress` on cancel/confirm
buttons) never fire — and single-button info alerts may not show at all. Any flow that
gates an action behind an `Alert.alert` confirmation will silently do nothing on web:
the action's `onPress` never runs, so no request is sent and no error appears.

**Why:** react-native-web does not implement `Alert`'s interactive button behavior.
This bit the admin-promotion toggle (and delete-schedule confirm) on the AdminCustomers
screen — toggling did nothing on web because the confirm `onPress` (which fires the PATCH
mutation) never executed. The team already hit this before (InspectionDetailScreen has a
custom in-app dialog "to replace window.confirm() on web").

**How to apply:** For any confirm-before-action, use the cross-platform helper
`client/lib/confirm.ts` `confirmDialog(...)` which returns `Promise<boolean>` — it uses
`window.confirm` on web and `Alert.alert` on native. Do not gate actions behind raw
`Alert.alert` button callbacks if the screen runs on web. Symptom to recognize: a button/
toggle "does nothing" on web and the backend logs show the expected request never arrives.
