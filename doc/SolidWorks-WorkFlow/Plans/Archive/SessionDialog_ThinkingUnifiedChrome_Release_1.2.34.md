# Session Dialog Thinking Unified Chrome Release 1.2.34

**Status:** Archived
**Date:** 2026-04-20
**Owner:** Codex

## 1. Problem

The Session dialog currently keeps two different visual chrome contracts for thinking bubbles:

- legacy `role="thinking"` uses `.session-dialog__message--thinking`;
- user-facing provider-tagged reasoning uses `.session-dialog__message--assistant-thinking`.

This split no longer matches the active product expectation for the current UI tuning scope. The requested outcome is to make both internal thinking paths use the same visible chrome values, so if either path appears in runtime they keep the same muted fill, stroke, and shadow treatment across Claude, Codex, and Gemini.

## 2. Decision

1. Use one shared chrome contract for both `.session-dialog__message--thinking` and `.session-dialog__message--assistant-thinking`.
2. Set the shared muted fill to `rgba(44, 50, 48, 0.45)`.
3. Set the shared muted stroke to `rgba(71, 71, 74, 0.45)`.
4. Keep a visible card shadow on both paths, but soften it to `0px 6px 14.1px 3px rgba(0, 0, 0, 0.5)`.
5. Keep provider-specific differentiation only in the header hue (`Claude`, `Codex`, `Gemini`), not in fill, stroke, or shadow.
6. Keep existing layout-specific geometry hooks unless the visual retest proves they also need to converge; this scope targets the shared chrome contract first.

## 3. Scope

Code:

- `media/session-view.css`

SSOT sync:

- `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`

Release docs:

- `README.md`
- `CHANGELOG.md`

Execution tracking:

- `doc/TODO/todo-plan.md`

## 4. Verification

- inspect the final CSS contract for both thinking selectors
- `npm run build:webview`
- `npm run build:project-manager`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`
