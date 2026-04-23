# Extension Shell Localization Delivery Fix (1.2.60)

**Status:** active (planning → implementation same session)
**Date:** 2026-04-23

## Problem

After 1.2.59 ships the new `extension_shell.role.*` copy, the VS Code extension webview (`SettingsOnlyHost`) still renders in English even when the user has configured `UI Helper Text → Russian (ru)` (and the Russian bundle actually contains the translated values under `~/.codeai-hub/localization/catalogs/user_guidance/ru.json` + `~/.codeai-hub/localization/cache/browser-runtime-bootstrap.json`).

Two issues feed into the user-visible symptom:

### Issue A — wrong category for the title
Per [UserFacing_Text_Localization_Boundary.md §3.1 / §3.2 / §4.5](../../Contracts/UserFacing_Text_Localization_Boundary.md):
- short interface terms (button labels, section titles, short headers) → `UI Labels` → approved file `ui_labels.json` → runtime category `ui_interface`.
- explanatory paragraphs under a control / short helper copy → `UI Helper Text` → approved file `ui_helper_text.json` → runtime category `user_guidance`.

`extension_shell.role.title` is a section title (short, label-like) — it belongs in `UI Labels`, not `UI Helper Text`. The user's category preferences include `UI Labels: Default Language (English)`, so after the fix the title stays English by user choice, while body/hint follow the Russian selection for `UI Helper Text`.

`extension_shell.role.body` and `.hint` are already correctly classified as `UI Helper Text` — no change required on their category.

### Issue B — VS Code extension host never injects bootstrap payload into the webview
`src/extension-module/home-view-provider.ts:75` hardcodes `localizationBootstrap: null` when calling `WebviewHtmlGenerator.generate(...)`. Therefore `window.__CODEAI_LOCALIZATION_BOOTSTRAP__ = null` in the webview, `readBrowserLocalizationBootstrapSnapshot()` returns `null`, and the initial render of `SettingsOnlyHost` uses the English fallback strings. The subsequent `settings:loaded` message *does* carry the actual `localizationRuntime` payload, but the first paint the user sees is fallback English — and in practice the user reports the whole surface staying English, not transitioning.

Compare with Project Manager (CEF launcher): PM injects a persisted `browser-runtime-bootstrap.json` into the window before React mounts, so the very first render reads the correct translated values.

VS Code extension must do the same: load the cached bootstrap snapshot via `LocalizationRuntimeService.loadRuntimeBootstrapSnapshot(settings)` before `resolveWebviewView` generates HTML, and pass it through `generate({ localizationBootstrap })`.

## Decision

Two-stream fix shipped together in 1.2.60:

1. Reclassify `extension_shell.role.title` as `UI Labels` (move key from `ui_helper_text.json` → `ui_labels.json`, component reads it via category `ui_interface`).
2. Inject cached localization bootstrap snapshot into the VS Code extension webview at HTML generation time (mirror PM behaviour).

## Files

### Stream 1 (category fix)
1. `assets/localization/source/en/ui_labels.json` — add `extension_shell.role.title`.
2. `assets/localization/source/en/ui_helper_text.json` — remove `extension_shell.role.title` (keep `.body` and `.hint`).
3. `src/client/ui/src/app-host/settings-only-host.tsx` — title lookup switches to category `ui_interface`; body/hint stay on `user_guidance`.

### Stream 2 (bootstrap injection)
4. `src/extension-module/home-view-provider.ts` — read current settings snapshot, call `LocalizationRuntimeService.loadRuntimeBootstrapSnapshot(...)` before `generate(...)`, pass the result as `localizationBootstrap`. `resolveWebviewView` becomes async-bridged (synchronous wrapper already exists — swap the outer call path to handle the promise, keep the try/catch error-warning behaviour).

## Gates

Husky pre-commit (architecture, ultracite lint, knip, jscpd, UI style SSOT) + `npm run build:webview` + `npm run typecheck:webview`. Release via `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version`.

## Success Criteria

- After installing `codeai-hub-1.2.60.vsix`, opening VS Code extension webview (Settings panel):
  - Title renders English ("This extension is for install and updates only") because `UI Labels: Default Language (English)`.
  - Body and Hint render Russian on the FIRST paint (no EN flash), because cached bootstrap is injected directly into window.
- No regressions in Project Manager localization (unchanged path).
- Gates green, 2 stream commits + release commits.
