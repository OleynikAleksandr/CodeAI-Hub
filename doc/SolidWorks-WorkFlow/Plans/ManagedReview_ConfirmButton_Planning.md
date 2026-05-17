# Managed Review Confirm Button Planning

**Status:** Accepted for implementation.
**Created:** 2026-05-17.
**Owner:** Codex.

## Problem

Managed technical stages currently open user review with a Core/system dialog message that tells the user to type `подтверждаю`:

```text
Core: Diagram Modules перешёл в пользовательскую проверку.
Пожалуйста, ответьте на вопросы агента, задайте свои вопросы или напишите правки.
Если хотите принять текущий результат как есть и продолжить следующий управляемый шаг, напишите `подтверждаю`.
```

That is functionally correct because Core already classifies the typed acceptance and advances the managed stage. The UX is weak: the acceptance command is hidden inside prose, can be mistyped, and makes the user use the input box for a deterministic Core transition.

## Target Behavior

- The Core handoff text must no longer instruct the user to type `подтверждаю`.
- The same system dialog card with tag `managed-workflow-user-review` must render an inline action button at the end of the card.
- The button label is `Подтверждаю`.
- Clicking the button sends the same acceptance intent to Core, so the existing managed review decision path remains the workflow authority.
- Core still owns the phase transition:
  - Diagram Modules acceptance opens terminal `### Stream: User Return And Revisions`;
  - Application Skeleton acceptance opens materialization;
  - Quality Gates acceptance opens integration.
- Project Manager and shared Session UI remain projections/command surfaces only. They render the button and submit a user intent; they do not decide stage acceptance or mutate managed plan state.

## Design

1. Core copy:
   - update `buildManagedUserLedReviewHandoffMessage(...)`;
   - keep tag `managed-workflow-user-review`;
   - keep the user-facing review explanation, but replace the final sentence with button-oriented copy.

2. Shared Session UI:
   - detect `message.role === "system" && message.tag === "managed-workflow-user-review"`;
   - render a `Подтверждаю` button at the bottom of that message card;
   - route click through the existing session send path with acceptance content `подтверждаю`.

3. Core acceptance path:
   - reuse `SessionRequestHandlerManagedReviewDecisions`;
   - do not add client-owned acceptance state;
   - keep existing plan advancement and provider dispatch behavior.

## Relevant Files

- `packages/core/src/managed-workflow-orchestration/managed-workflow-user-handoff-messages.ts`
- `packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts`
- `src/client/ui/src/session/dialog-panel.tsx`
- `src/client/ui/src/session/session-view.tsx`
- `media/session-view.css`
- `src/client/project-manager/components/sessions/project-manager-dialog-session-view-helpers.test.ts`

## Verification

- Core handoff tests must assert button-oriented copy, not `напишите подтверждаю`.
- DialogPanel render test must assert the review card button appears only for `managed-workflow-user-review`.
- Existing managed review action tests must continue to pass, proving the Core phase transition still uses the same authority path.
- Run targeted tests plus `npm run typecheck:webview`.
