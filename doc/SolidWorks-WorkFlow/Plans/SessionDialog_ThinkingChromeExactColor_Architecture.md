# Session Dialog Thinking Chrome Exact Color - Architecture

**Status:** Approved
**Date:** 2026-04-20
**Owner:** Codex

## 1. Problem

The current thinking-card retune uses approximate muted chrome colors instead of the exact design values.

Observed mismatch:

- fill currently uses a near-gray value instead of the requested `#2C3230` at `45%`;
- stroke currently uses a near-gray value instead of the requested `#47474A` at `45%`;
- the visible result still feels off even though the alpha percentage is nominally correct.

## 2. Decision

Keep the already-fixed provider-accent header behavior and switch the shared thinking-card chrome to the exact design colors:

1. fill = `#2C3230` at `45%`;
2. stroke = `#47474A` at `45%`;
3. keep stroke weight `1px`;
4. keep the provider header-muted contract unchanged.

## 3. Scope

Code:

- `media/session-view.css`

SSOT sync:

- `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`

Execution tracking:

- `doc/TODO/todo-plan.md`

## 4. Verification

- inspect the shared thinking bubble CSS values
- `npm run build:webview`
- `npm run build:project-manager`
