# Session Dialog Tagged Thinking Visual Tone - Architecture

**Status:** Archived
**Date:** 2026-04-20
**Owner:** Codex

## 1. Problem

The previous `1.2.29` visual tuning changed only the CSS path used by bubbles rendered with `role = "thinking"`.

That is insufficient for the real product surface:

- some visible reasoning bubbles, including the observed `Codex · Thinking` card, are rendered as `role = "assistant"` with `tag = "thinking"`;
- `buildMessageClassNames(...)` currently styles those bubbles as ordinary assistant cards (`session-dialog__message--assistant` + provider theme);
- as a result, the requested muted thinking alpha contract does not apply on the most visible reasoning path.

Observed impact:

- thinking background remains at the ordinary assistant opacity;
- thinking border remains at the ordinary assistant opacity;
- thinking header/body text remains at the ordinary assistant opacity.

## 2. Existing Contracts

- `src/client/ui/src/session/dialog-panel.tsx`
  - visible reasoning labels such as `Codex · Thinking` already exist on the assistant-tagged path.
- `src/client/ui/src/session/dialog-panel-message-utils.ts`
  - class-name resolution currently branches only by `message.role`, not by `message.tag === "thinking"`.
- `media/session-view.css`
  - owns the shared visual contract for dialog bubble classes.
- `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - owns the Session dialog UI styling contract at the SSOT level.

## 3. Root Cause

The regression is not in alpha numbers themselves; it is in the visual selector path.

The styling contract was applied to:
- `.session-dialog__message--thinking`

But the real visible bubble from the screenshot is produced through:
- `role = "assistant"`
- `tag = "thinking"`
- classes resolving to `session-dialog__message--assistant session-dialog__message--assistant-codex`

So the muted thinking CSS never matches that card.

## 4. Decision

Treat assistant-tagged thinking bubbles as first-class thinking cards in the shared Session dialog class contract.

Implementation direction:

1. Extend Session dialog class-name resolution so `assistant + tag="thinking"` gets a dedicated thinking styling hook.
2. Reuse the same muted thinking visual contract for both:
   - `role = "thinking"`
   - `role = "assistant" + tag = "thinking"`
3. Keep provider label text (`Codex · Thinking`, `Claude · Thinking`, etc.) but ensure the card chrome and text alpha follow the shared thinking tone rules.

## 5. Scope

Code changes:

- `src/client/ui/src/session/dialog-panel-message-utils.ts`
- `media/session-view.css`

Doc sync:

- `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`

## 6. Verification

- confirm by inspection that assistant-tagged thinking bubbles receive a dedicated thinking class hook;
- confirm by inspection that the muted alpha contract applies to the screenshot path (`Codex · Thinking`);
- run targeted UI bundle builds:
  - `npm run build:webview`
  - `npm run build:project-manager`
