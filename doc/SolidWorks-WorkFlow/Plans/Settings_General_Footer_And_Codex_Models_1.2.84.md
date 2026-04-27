# Settings General Footer And Codex Models 1.2.84

**Status:** Approved for execution
**Date:** 2026-04-27
**Owner:** Oleksandr + Codex

## 1. Problem

Two user-facing settings issues need a narrow maintenance scope:

- Settings -> General can continue scrolling past the bottom action footer, so the view does not stop cleanly on the bar with `Reset to Defaults`, `Close`, and `Save Changes`.
- Codex settings do not expose two requested provider models: `gpt-5.2` and `gpt-5.3-codex-spark`.

## 2. Solution

### Settings footer scroll

Keep the Settings shell as the owner of the layout. The content area remains the only scroll container, while the footer stays inside the fixed settings flex column.

Implementation target:

- `src/client/ui/src/components/settings-view.tsx`

Expected layout contract:

- settings container clips outer overflow;
- tab content has `minHeight: 0` so it can shrink inside the flex column;
- tab content owns vertical scrolling and contains wheel overscroll at its own boundary;
- footer remains reachable and visually stable.

### Codex model catalog

Add the two requested Codex models to the shared model registry and Core settings normalizer:

1. `gpt-5.2`
2. `gpt-5.3-codex-spark`
3. `gpt-5.3-codex`
4. `gpt-5.4-mini`
5. `gpt-5.4`
6. `gpt-5.5`

Implementation targets:

- `src/types/codex-model-registry.ts`
- `packages/core/src/config/provider-defaults-resolver.ts`
- `packages/core/src/remote-bridge/handlers/settings-persistence-snapshot.ts`
- `doc/SolidWorks-WorkFlow/Modules/Codex.md`

The default Codex model remains `gpt-5.3-codex`.

## 3. Contracts

- No provider runtime protocol changes.
- No package version edits by hand.
- Settings UI remains Project Manager-owned; VS Code webview settings surface stays compat-only.
- New Codex model IDs must be accepted both by the UI settings catalog and by Core persisted settings normalization.

## 4. Verification

- TypeScript/build target for affected UI/core surface when practical:
  - `npm run build:webview`
  - targeted tests or `npm run lint` if faster diagnostics are needed
- Git commit hooks remain enabled.

## 5. Execution Plan

The active execution checklist lives in `doc/TODO/todo-plan.md`.
