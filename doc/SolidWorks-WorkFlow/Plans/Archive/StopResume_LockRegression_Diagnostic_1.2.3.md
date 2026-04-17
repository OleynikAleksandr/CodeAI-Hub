# Stop → Continue Input Lock Regression — Diagnostic Plan (1.2.3)

**Status:** Active (diagnostic release, no fix yet)
**Updated:** 2026-04-17

## Problem

After user clicks `Stop` during an in-flight Claude turn and then sends `Continue`, the resume works correctly — the next assistant reply streams. But the input panel stays unlocked: the fieldset is not disabled and the `Agents is working, please wait...` wait-copy overlay is absent. Baseline stays broken on 1.2.2.

## Why diagnostic, not fix

Static analysis narrowed root cause to one of three candidates (see parent conversation):
1. Stale Claude `turn_failed` / `turn_completed` from `adapter.closeSession` abort reaches the event router before `dispatchUserMessage` emits `running`, resetting turnState to `idle`.
2. `session.providerSessionStatus` stays `pending` after rebind (Claude `supportsImmediateBinding=false`), and some PM guard or second emit rolls `running` back to `blocked/idle`.
3. `adapter.sendMessage` after rebind throws synchronously, hitting the `catch` branch that emits `idle`.

All three are plausible. A trace-only release is cheaper than guessing — the runtime will tell us which it is on the next retest.

## Scope

Core-side logs only, written through the existing `Logger` to `~/.codeai-hub/logs/core/core.log`. No behavior changes. No Extension-side tracing. No UI changes.

Instrumentation points:
- `session-request-handler-stop-action.ts` — begin, close, invalidate, emit-idle.
- `session-request-handler-stop-rebind.ts` — `performRebind` begin / create / attach-done, with `providerSessionId`, `supportsImmediateBinding`.
- `session-request-handler-message-dispatch.ts` — resolve-binding, emit-running, send-done / send-error (with error message).
- `session-request-handler-runtime-callbacks.ts` — every `emitTurnStateEvent` call logs `state` + capture stack via `new Error().stack`, so the exact emit site is identifiable in the log.
- `session-provider-event-router.ts` — every `handleTypedProviderEvent` with `event.type` + `sessionId`.

All log messages share prefix `stopdiag_` for easy greppability. Fields: `sessionId`, `providerId`, `providerSessionId`, `state`, `eventType`, `stack` (emit site only).

## Out of scope

- No Extension `getExtensionLogger` hooks.
- No `fs.watchFile` watchers.
- No UI-side logging.
- No provider-adapter-side logging (Claude adapter stays untouched).

## Cleanup

1.2.4 will remove all `stopdiag_*` logs once the fix lands. Diagnostic logs are not production bloat — they must be removed in the same execution cycle as the fix, as Session 039 established.

## Follow-up

After retest with 1.2.3 the log will show either:
- A second `emitTurnStateEvent(idle)` with a stack trace pointing to its source — we fix that source.
- `adapter.sendMessage` error in `dispatch_send_error` — we fix the rebind path.
- No `running` emit at all despite `dispatch_emit_running` log → PM-side snapshot delivery gap, need deeper UI trace.

Next release is 1.2.4 (fix + cleanup).
