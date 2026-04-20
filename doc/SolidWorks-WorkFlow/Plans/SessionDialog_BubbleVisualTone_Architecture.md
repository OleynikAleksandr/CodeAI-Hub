# Session Dialog Bubble Visual Tone Tuning - Architecture

**Status:** Approved
**Date:** 2026-04-20
**Owner:** Codex

## 1. Problem

The current Session dialog bubble styling is visually heavier than desired:

- the base `.session-dialog__message` contract uses a `2px` border for all dialog cards;
- thinking bubbles use an opaque background/border treatment that competes too much with regular assistant output;
- thinking label and reasoning body text render with nearly full-strength color, so the "secondary" nature of reasoning is not visually clear enough.

Requested UX adjustment:

- all Session dialog cards should use a `1px` border stroke;
- all thinking bubbles, regardless of provider, should reduce bubble background alpha to about `40%`;
- all thinking bubbles, regardless of provider, should reduce border alpha to about `40%`;
- all thinking bubble text, including the header label (`Claude/Codex/Gemini · Thinking`) and reasoning body, should render at about `60%` alpha.

## 2. Existing Contracts

- `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - Session dialog rendering/styling is owned by the shared Session UI layer.
- `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - Project Manager reuses the shared Session UI for dialog/history rendering.
- `src/client/ui/src/session/dialog-panel.tsx`
  - Thinking and standard messages share the same dialog panel and CSS class system.
- `src/client/ui/src/session/dialog-panel-message-utils.ts`
  - Provider-specific visual branching is limited to shared class names such as `session-dialog__message--assistant-${providerTheme}`.
- `media/session-view.css`
  - Owns the visual contract for standard and thinking dialog bubbles.

## 3. Root Cause

The current visual hierarchy is implemented entirely in the shared CSS layer:

- `.session-dialog__message` sets a `2px` border for every bubble;
- `.session-dialog__message--thinking` uses a relatively solid background/border treatment;
- `.session-dialog__message--thinking .session-dialog__role` and `.session-dialog__content--thinking` do not currently express the desired "muted secondary surface" strongly enough.

Because provider-specific thinking bubbles all reuse the same shared dialog styling, the fix should stay in the shared Session UI CSS instead of branching per provider.

## 4. Decision

Adjust the Session dialog bubble visual hierarchy in one shared styling pass:

1. Change the base dialog bubble stroke from `2px` to `1px`.
2. Keep ordinary bubble colors as they are, unless the shared `1px` stroke naturally affects them.
3. Tune thinking bubbles into a lighter secondary surface by:
   - reducing thinking bubble background alpha to about `40%`;
   - reducing thinking bubble border alpha to about `40%`;
   - reducing thinking header/body/toggle text alpha to about `60%`.

Implementation rule:

- do not add provider-specific CSS branches for the thinking visual tone unless the shared contract proves insufficient;
- keep the change local to Session dialog UI styling and documentation.

## 5. Scope

Code changes:

- `media/session-view.css`

Doc sync:

- `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`

Potential optional verification touchpoint:

- inspect `src/client/ui/src/session/dialog-panel.tsx` only if a class hook is missing, but no behavior change is expected.

## 6. Verification

- confirm by inspection that the shared Session dialog base bubble contract uses `1px` border;
- confirm by inspection that thinking bubble background and border use alpha-softened colors;
- confirm by inspection that thinking label/body/toggle text use muted alpha styling;
- run targeted build or style verification for the affected UI bundle if needed.
