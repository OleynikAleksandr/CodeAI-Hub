# Localization Settings Restart Hydration Architecture

**Status:** Draft
**Updated:** 2026-04-14
**Owner:** Codex

---

## 1. Problem

Post-release validation on `1.1.979` exposed a restart regression in the
Settings localization card:

- `~/.codeai-hub/settings/settings.json` may already contain the expected
  localization selections;
- the Settings UI can still render default-looking localization controls after
  Core / VS Code restart;
- if the user saves from that stale UI state, valid persisted selections can be
  overwritten by an older/default snapshot.

Observed mismatch types:

- translation engine in UI falls back to `Google GTX Free` even when
  `settings.json` already carries `codex-gpt-5.3-codex-spark`;
- category selectors can render `Default Language (English)` even when the
  persisted snapshot already carries Russian selections for helper / messages /
  artifacts.

The bug boundary is restart hydration and settings-view state authority, not
Localization materialization itself.

---

## 2. Root Cause Boundary

The current Settings restart path has three weak points:

1. `useSettingsState` posts `settings:load` before registering the browser
   `message` listener, so a fast host reply can be lost.
2. `SettingsMessageHandler` keeps one in-memory `settingsState` loaded at
   construction time and reuses it for later `settings:load` replies instead of
   re-reading the persisted snapshot on demand.
3. The translation-engine selector currently coerces the visible selection to
   the first available engine when the active engine is absent from the
   catalog-backed options, hiding the real configured engine and making drift
   look like a reset.

These problems can combine into one user-visible failure mode:

- bootstrap/default state is rendered;
- fresh persisted settings are not applied to the live webview state;
- the next manual save can persist an unintended fallback state.

---

## 3. Constraints

- Do not change the persisted settings schema.
- Do not move localization ownership away from
  `~/.codeai-hub/settings/settings.json`.
- Do not introduce a second settings source of truth.
- Keep the existing `LocalizationRuntimeService` / bootstrap pipeline intact;
  only fix authority and delivery order.

---

## 4. Solution

### 4.1 Settings Host Authority

`SettingsMessageHandler` must reload the latest persisted settings snapshot on
every `settings:load` before posting `settings:loaded`.

Implication:

- the host-side reply always reflects the latest disk snapshot, even if the
  file changed after handler construction.

### 4.2 Webview Delivery Order

`useSettingsState` must register the `window.message` listener before sending
`settings:load`.

Implication:

- the first `settings:loaded` payload after restart cannot be lost because of
  listener-ordering.

### 4.3 Engine Selection Truthfulness

The localization engine selector must preserve the configured `engineId` as the
visible value even if the runtime engine catalog is temporarily stale or
incomplete.

Implication:

- the UI must never silently coerce the visible engine selection to a different
  engine just because the option catalog arrived late or is missing one entry.

---

## 5. Files In Scope

Primary code files:

- `src/extension-module/message-handlers/settings-message-handler.ts`
- `src/client/ui/src/components/settings/use-settings-state.ts`
- `src/client/ui/src/components/settings/localization-settings-card.tsx`

Documentation sync:

- `doc/SolidWorks-WorkFlow/Modules/Localization.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`

---

## 6. Verification

Minimum verification for this scope:

1. Start with a persisted localization snapshot where:
   - `engineId = codex-gpt-5.3-codex-spark`
   - `UI Labels = en`
   - `UI Helper Text = ru`
   - `Messages for the User = ru`
   - `Artifacts for the User = ru`
2. Restart Core and VS Code.
3. Reopen Settings and confirm the localization card reflects the persisted
   values without requiring a second refresh.
4. Save without changing localization fields and verify the file does not drift
   to fallback values.
