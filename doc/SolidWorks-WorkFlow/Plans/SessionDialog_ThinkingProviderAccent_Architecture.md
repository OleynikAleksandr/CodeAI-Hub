# Session Dialog Thinking Provider Accent - Architecture

**Status:** Approved
**Date:** 2026-04-20
**Owner:** Codex

## 1. Problem

The current muted thinking styling dims the header label on assistant-tagged thinking cards to a neutral gray.

That is visually incorrect for the real user-facing path:

- `Codex · Thinking`, `Claude · Thinking`, and `Gemini · Thinking` should still read as provider-owned bubbles;
- the header may be muted, but it must preserve the provider hue instead of collapsing to the generic body-text gray;
- the current fill/border alpha (`0.4`) is slightly too weak for the intended contrast.

## 2. Decision

Retune the shared Session dialog thinking surface contract as follows:

1. keep the assistant-tagged thinking header on provider hue with muted alpha `0.6`;
2. keep neutral muted typography for thinking body/timestamp at `0.6`;
3. raise thinking fill and border alpha from `0.4` to `0.45`;
4. preserve the existing shared `1px` stroke and the assistant-tagged thinking styling hook.

## 3. Scope

Code:

- `media/session-view.css`

SSOT sync:

- `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`

Execution tracking:

- `doc/TODO/todo-plan.md`

## 4. Verification

- inspect CSS selector ownership for assistant-tagged thinking role color
- `npm run build:webview`
- `npm run build:project-manager`
