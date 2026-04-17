# Codex Stop Abort + PM Stop-Button Debounce + handleStop Guard (1.2.6)

**Status:** Active
**Updated:** 2026-04-17

## Problem

1.2.3 Codex trace showed that `codexCli adapter.closeSession` does not abort the active `codex exec` subprocess. The SDK-patched async generator in `packages/Codex_Module/src/sdk/codex-sdk-patches.ts` (`streamCodexExec`) spawns a `child` via `node:child_process.spawn`, then blocks inside `for await (const line of rl)` until the child exits naturally. Calling `generator.return()` from the outer layer schedules an exit, but does not kill the child — the readline cursor just waits for the next stdout line.

Consequence: every Stop click ends up in Core's `handleStop`, each awaits `adapter.closeSession`, each blocks on `processingLoop` / `runStreamed`, and they all pile up. Only when Codex naturally emits `turn_completed` do the nine (in the retest: 9) handleStop handlers drain at once — 2 minutes after the user gave up.

## Goal for 1.2.6

After `Stop` on a live Codex turn, behaviour must match Claude:
- The active `codex exec` subprocess ends within ~100 ms of the click.
- Exactly one `handleStop` runs in Core even if the user clicks the button repeatedly.
- After Stop, the next user message locks the input panel normally (same contract as the 1.2.5 Claude fix; the PM dialog controller path is already correct from 1.2.5).

## Fix plan

### 1. `packages/Codex_Module/src/sdk/codex-sdk-patches.ts`
- Add a module-scoped `Map<string, ChildProcess>` keyed by `threadId` (present on `PatchedExecArgs.threadId`).
- Inside `streamCodexExec`, register the spawned child at the start of the `try` block and delete in `finally` after `child.kill()` already runs.
- Export `killActiveCodexProcess(threadId: string): boolean` that looks up the child, calls `child.kill("SIGTERM")` (ignore errors), returns whether anything was killed.
- Pre-threadId edge case: when `threadId` is null at spawn time (first turn pre-init), skip registration. Users rarely Stop a session before its first `turn_started`, and the 1.2.3 retest confirmed all nine Stop clicks happened after the thread had a stable id.

### 2. `packages/Codex_Module/src/session/session-manager.ts`
- In `closeSession(sessionId)`, before `await this.lifecycle.closeSession(...)`, look up the session's `codexThreadId` and call `killActiveCodexProcess(codexThreadId)` if it is non-null.
- `lifecycle.closeSession` still resolves the generator with `null`, but now the `for await` inside the sdk-patch finally unblocks quickly because the child has exited.
- Preserve existing swallow-error semantics around `processingLoop`.

### 3. `src/client/ui/src/session/input-panel.tsx` — Stop debounce
- `InputPlayStopButton.onClick` fires `stopSession(sessionId)` unconditionally today. Add local state `stopInFlight` set to `true` immediately on click and reset to `false` when `agentBusy` flips to `false` (i.e. Core has sent the `idle` snapshot back).
- While `stopInFlight` is true, disable the button visually and skip the handler. This is the same debounce pattern as `optimisticStopActive` for Send, but for the Stop direction.

### 4. `packages/core/src/remote-bridge/handlers/session-request-handler-stop-action.ts` — re-entry guard
- Early return if `hasStopInvalidatedBinding(sessionId)` is already true. This prevents a second `handleStop` from running on a session whose binding is already `pending` — belt-and-suspenders in case PM debounce is bypassed (programmatic sends, race, etc.) and still avoids the 9-deep stacking observed in 1.2.3.

## Out of scope

- Gemini Stop/Continue. Tested after 1.2.6 lands; scope for a follow-up release if its baseline differs.
- Changing the underlying Codex SDK (`@openai/codex-sdk` 0.53.0) — no cancel API there; we own the subprocess via the patch and that is the only abort surface.

## Cleanup

No diagnostic logs are added — the 1.2.5 cleanup already removed them. Fix-only release.
