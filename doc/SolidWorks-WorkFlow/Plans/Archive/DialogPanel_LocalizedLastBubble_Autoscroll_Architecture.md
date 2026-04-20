# Dialog Panel Localized Last Bubble Autoscroll — Architecture

**Status:** Archived
**Date:** 2026-04-20
**Owner:** Codex

## 1. Problem

Session UI keeps auto-scroll pinned to the bottom when a new dialog bubble appears, but it does not re-run that same bottom-lock behavior when the last already-rendered bubble grows because `localizedContent` arrives later through the Core translation overlay.

Observed impact:
- the last visible thinking/commentary/assistant bubble may first render in English;
- Core later patches the same `messageId` with Russian `localizedContent`;
- Russian text is often longer, so the last bubble grows vertically;
- when the user was pinned to bottom before the patch, the dialog can still end up visually above the new bottom edge, forcing manual scroll.

## 2. Existing Contracts

- `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
  - UI renders `localizedContent ?? content` and late translation patches upgrade already-visible messages in place.
- `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - Session dialog rendering and display-time merge behavior are owned by Session UI helpers under `src/client/ui/src/session/`.
- `src/client/ui/src/session/dialog-panel.tsx`
  - auto-scroll is controlled by `pinnedToBottom` plus a memoized `scrollAnchor`.
- `src/client/ui/src/session/dialog-panel-scroll-anchor.ts`
  - current anchor changes when the last bubble identity or native `content` changes.

## 3. Root Cause

The current scroll anchor ignores `localizedContent`.

As a result, a late overlay patch that changes only the rendered display text of the last bubble does not change the anchor value, so the `useLayoutEffect` auto-scroll path does not run again even though `scrollHeight` increased.

## 4. Decision

Treat the rendered display text of the last bubble as part of the auto-scroll anchor contract.

Implementation rule:
- build the dialog scroll anchor from the last rendered bubble display content (`localizedContent ?? content`), not from `content` alone.

This keeps the fix local to Session UI and avoids coupling Core translation overlay timing to any UI-specific imperative scroll event.

## 5. Scope

Code changes:
- `src/client/ui/src/session/dialog-panel-scroll-anchor.ts`
- `src/client/ui/src/session/dialog-panel-scroll-anchor.test.ts`

Doc sync:
- `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`

## 6. Verification

- unit/regression test proving the scroll anchor changes when only `localizedContent` of the last bubble changes;
- targeted UI test run for the updated scroll-anchor utility.
