# Session Dialog Thinking Composite And Shadow - Architecture

**Status:** Archived
**Date:** 2026-04-20
**Owner:** Codex

## 1. Problem

The current `Thinking` styling fix still misses the real visual target for the user-facing bubble path.

Observed root cause:

- the visible `Codex · Thinking` / `Claude · Thinking` / `Gemini · Thinking` card is rendered on the assistant-tagged path (`role="assistant" + tag="thinking"`), not only on the legacy `role="thinking"` path;
- the shared muted-thinking selector currently sets `box-shadow: none`, which regressed the card shadow on the real assistant-tagged thinking bubble;
- the current fill/stroke use semi-transparent colors directly on top of `.session-panel` (`rgba(40, 41, 42, 1)`), so the on-screen result is a darker composite than the approved design intent even when the raw CSS color tokens numerically match the requested alpha values;
- in practice this makes the visible thinking bubble look closer to a flat gray card than to the intended muted provider-owned surface.

## 2. Decision

Split the visual contract between the two internal thinking paths:

1. keep the legacy compact `role="thinking"` strip as its own muted transition surface;
2. treat the assistant-tagged `Thinking` bubble as a full message card with its own user-facing chrome contract;
3. restore the shadow on the assistant-tagged thinking bubble instead of forcing `box-shadow: none`;
4. retune the assistant-tagged thinking fill/stroke against the actual Session dialog backdrop so the visible result matches the approved design appearance, rather than blindly sharing the raw alpha-composited legacy strip colors;
5. keep the provider-colored muted header and muted body/timestamp contract already fixed in `1.2.31`;
6. apply the same assistant-tagged thinking bubble contract to all supported providers on the shared path (`Claude · Thinking`, `Codex · Thinking`, `Gemini · Thinking`), with provider-specific variation allowed only for the header hue, not for shadow, fill, stroke, spacing, or body typography.

## 3. Scope

Code:

- `media/session-view.css`

Regression coverage:

- `src/client/ui/src/session/dialog-panel-message-utils.test.ts`

SSOT sync:

- `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`

Execution tracking:

- `doc/TODO/todo-plan.md`

## 4. Verification

- inspect the CSS ownership for assistant-tagged thinking bubble shadow and chrome
- verify the assistant-tagged `Thinking` path no longer inherits the legacy strip visual compromises
- `npm run build:webview`
- `npm run build:project-manager`
