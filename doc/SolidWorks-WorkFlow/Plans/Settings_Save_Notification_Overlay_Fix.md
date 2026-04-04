# Settings Save Notification Overlay Fix

**Status:** Approved for execution (2026-04-04)
**Created:** 2026-04-04
**Owner:** Oleksandr + Codex
**Scope:** Remove the intrusive settings-save overlay that covers the Settings WebView footer and can hide the `Save Changes` button at the exact moment the user needs to verify persistence.

---

## 1. Problem

When the user saves provider settings inside the VS Code Settings WebView, CodeAI Hub currently shows a top-level VS Code information notification:

- `Settings saved (stub implementation).`

This creates two UX defects:

- the notification overlaps the footer area and can visually cover the `Save Changes` button;
- the message is outdated and misleading because settings persistence is no longer a stub flow.

As a result, the user can think the save already completed, close the screen too early, or simply lose sight of the save affordance under the overlay.

---

## 2. Root Cause

The Settings WebView already has its own save-state contract:

- the footer button switches to `Saving...`;
- the extension posts `settings:saved` back into the WebView;
- the form state becomes clean and the save button deactivates.

Despite that, the extension-side message handler still emits a legacy global notification through `window.showInformationMessage("Settings saved (stub implementation).")`.

So the overlap is not a VS Code platform limitation. It is our own stale notification path.

---

## 3. Decision

Do not move or re-layer the Settings UI to work around this overlay.

Instead:

- remove the stale global save notification entirely;
- keep the existing in-WebView save feedback as the canonical user confirmation path.

Non-goals:

- do not redesign the footer;
- do not add a second save confirmation surface unless the current WebView save-state contract proves insufficient;
- do not change reset/update-provider notifications in this patch.

---

## 4. Target Change

### 4.1. Extension save handler

Delete the legacy `window.showInformationMessage("Settings saved (stub implementation).")` call from the Settings message handler.

### 4.2. Preserve WebView save contract

Keep the existing `settings:saved` postMessage flow unchanged so the WebView continues to own the save lifecycle:

- pending state during save;
- clean state after save;
- no intrusive global overlay.

---

## 5. Verification

1. `npm run compile`
2. Save any provider setting in the Settings WebView.
3. Confirm:
   - no global `Settings saved (stub implementation).` notification appears;
   - the footer remains visible and unobstructed;
   - the save button still transitions through `Saving...` and back to the clean state.
