# Runtime Reliability Follow-up — Architecture Plan

**Status:** Active planning for release `1.2.111`
**Created:** 2026-04-29 18:29 CEST
**Accepted:** 2026-04-29 18:29 CEST by user request in session
**Branch at planning time:** `main`
**Current version at planning time:** `1.2.110`
**Target release:** `1.2.111` unless package version changes before execution

## 1. Source and Goal

This planning document turns the follow-up repository review from
`/Users/oleksandroliinyk/Downloads/review.txt` into an implementation scope.

The previous reviewer-driven remediation cycle was Session 027 / release
`1.2.103` (`Runtime_Stability_Remediation_Architecture.md`). That cycle closed
the original `message (1).txt` items around Project Manager WebSocket lifecycle,
PM/Core WebSocket validation, settings-read caching, Gemini listener cleanup,
Core Bridge diagnostics, and one runtime-core definite-assignment bypass.

The new review is related but not identical. It mainly targets the next layer:
server-side WebSocket error events, startup diagnostics, teardown/dispose paths,
legacy continuity cleanup, unified-session writer lifecycle, and UI reconnect
notification noise.

Goal: remove confirmed runtime reliability risks without changing provider
behavior, workflow semantics, session routing, or user-facing feature contracts.

## 2. Finding Classification

### 2.1 Core WebSocket error events

Confirmed.

`packages/core/src/remote-bridge/handlers/websocket-manager.ts` validates
incoming messages but does not register `error` handlers on `WebSocketServer` or
individual client sockets. Node `EventEmitter` error semantics make this a
process-crash risk if the ws layer emits an unhandled error.

Decision:
- add server-level and socket-level `error` handlers;
- log sanitized diagnostics only;
- close/drop the affected client socket without changing the command protocol.

### 2.2 Legacy handoff triggered-state cleanup

Partially confirmed.

`SessionContinuityFacade` legacy handoff uses `ContinuityMonitor.triggered`.
The active runtime currently constructs this facade with `enableLegacyHandoff:
false`, so this is not on the active flow-node rollover path. Still, if the
legacy mode is re-enabled, failed report/write/create/resume paths must not
leave a session permanently marked as already triggered.

Decision:
- reset the monitor on legacy handoff failure and successful handoff completion;
- add regression coverage for retry-after-failure behavior;
- keep active flow-node rollover semantics unchanged.

### 2.3 Silent startup and workspace best-effort failures

Confirmed.

`SettingsPersistenceService` suppresses startup default-priming failures at the
constructor boundary, and `workspace-session-service.ts` suppresses workspace
directory/bootstrap side effects. These are best-effort paths, but silent
failure makes startup/workspace issues invisible.

Decision:
- replace silent catches with sanitized logger diagnostics;
- keep best-effort behavior where recovery is intentional;
- do not throw from constructor side effects.

### 2.4 Runtime collection and timer cleanup

Confirmed with nuance.

`SessionRuntime.dispose()` clears its watchdog timer but keeps
`entriesBySessionId`. `WebSocketManager.stop()` clears active clients but not
replay/scope maps. `ProviderRecoveryScheduler` has per-provider `clearRetry()`
but no bulk `dispose()`.

The review claim that `rolloverStarted` is deleted only on error is incomplete:
successful flow-node rollover cleanup happens through
`SessionContinuityLockService.finalizePostBootstrapRolloverLifecycle()`.

Decision:
- clear runtime maps on dispose/stop where ownership is clear;
- add provider recovery scheduler bulk disposal and wire it through
  `ProviderRegistry` / `CoreOrchestrator.stop()`;
- keep rollover lifecycle behavior unchanged unless tests expose a real leak.

### 2.5 Unified-session writer lifecycle

Partially confirmed.

`UnifiedSessionStorage.initializeWriter()` is synchronous and assigns the writer
before any `await`, so the exact "two concurrent initializeWriter calls create
two writers" claim is not confirmed in current code.

Confirmed risks:
- `close()` deletes the session entry before async writer close finishes;
- the unused `PendingSession.queue` and `flushQueue()` path uses destructive
  `splice(0)` before write success. The queue is currently dead code because no
  production path pushes into it.

Decision:
- keep close ownership until writer/translation close promises settle;
- remove the dead queue path instead of preserving latent data-loss logic;
- add focused regression coverage where feasible.

### 2.6 Runtime factory definite-assignment bypass

Confirmed as a remaining item from the previous remediation.

Session 027 removed the `messageDispatch!` / `sessionResolution!` bypasses from
`session-request-handler-runtime-core.ts`, but
`session-request-handler-runtime.ts` still uses
`let continuityRolloverOrchestrator!`.

Decision:
- replace it with an explicit deferred reference helper that throws a clear
  wiring error if invoked before initialization;
- preserve runtime construction order and public facade shape.

### 2.7 Core Bridge reconnect notification dedupe

Confirmed as low severity.

The reconnect timer prevents duplicate reconnect attempts, but `error` and
`close` events can still cause repeated status notifications.

Decision:
- dedupe browser-side connection status notifications by status/detail;
- keep reconnect scheduling behavior unchanged.

## 3. Deferred Findings

The following review items are real cleanup candidates but are intentionally
not part of the `1.2.111` runtime hardening release:

- stale `lefthook` / `lint-staged` dependencies across workspace packages;
- null-returning agent facade/package cleanup;
- broad facade-boundary refactor across `remote-bridge/handlers` and
  `localization/src/index.ts`.

Reason: these are package/dependency and architecture-boundary cleanup tasks.
They touch many files or require a facade graph decision, and mixing them with
runtime failure hardening would make regression analysis harder. They should be
handled through a separate PeriodicAudit-style cleanup cycle with its own
planning document and package-lock strategy.

Deferred backlog record (confirmed 2026-04-29):
- dependency cleanup: stale `lefthook` / `lint-staged` entries must be audited
  package-by-package together with lockfile impact;
- dead facade/package cleanup: null-returning agent package surfaces require
  reachability proof before deletion;
- facade-boundary cleanup: broad imports across `remote-bridge/handlers` and
  package `index.ts` surfaces require facade graph ownership decisions before
  code movement.

Navigation owner for the deferred cycle: `doc/SolidWorks-WorkFlow/Checklists/PeriodicAudit.md`.

## 4. Architecture Decisions

### 4.1 Transport errors are observed at ownership boundaries

`WebSocketManager` owns the Core WS server and client sockets. It must log
server/socket error events and clean up affected client state through the same
disconnect path used by `close`. Error logs must avoid raw message payloads.

### 4.2 Best-effort paths still produce diagnostics

Best-effort startup/workspace actions may continue without blocking user flows,
but failure must leave a sanitized log. This follows the existing Core Bridge
diagnostic contract from Session 027.

### 4.3 Dispose means owned memory/timers are released

When a component exposes `dispose()` / `stop()`, it clears owned timers and
owned in-memory maps. It does not destroy external provider sessions unless that
component already owns those sessions.

### 4.4 Unified session close is a lifecycle transition

Closing a unified-session writer should not immediately erase the in-memory
entry before close promises settle. The close path may become asynchronous
internally while preserving the public `close(sessionId, reason): void`
signature for existing callers.

### 4.5 Deferrals are explicit, not silent

Low-priority package cleanup and broad facade-boundary work must be documented
as deferred scope instead of being mixed into this runtime release.

## 5. Documentation Updates Required

Implementation commits must keep code and SSOT docs synchronized.

Likely update targets:
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
- `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
- `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
- `doc/SolidWorks-WorkFlow/Contracts/ProviderFailure_Recovery_And_ProviderSwitch.md`

## 6. Verification Strategy

Focused checks during streams:
- WebSocketManager unit coverage for server/client error handling and stop
  cleanup;
- SessionRuntime and ProviderRecoveryScheduler unit coverage for dispose
  behavior;
- SessionContinuityFacade coverage for retry-after-legacy-handoff-failure;
- UnifiedSessionStorage coverage for close/entry ownership if local test harness
  allows it;
- targeted builds:
  - `npm run build:webview`
  - `npm run typecheck:webview`
  - `npm run build --workspace @codeai-hub/core`

Closeout release stream:
- update README/CHANGELOG for future `1.2.111` before build;
- run `./scripts/build-all.sh`;
- run `./scripts/build-release.sh --use-current-version`;
- verify release output includes SDK exclusions, dev dependency pruning, and
  package creation;
- archive completed planning/todo documents and update `Docs_Index.md`;
- update Session 034 as final report.

## 7. Acceptance Criteria

- Core WS server/socket `error` events cannot crash the process unobserved.
- Invalid or failing startup/workspace best-effort actions are logged.
- Owned runtime maps/timers are cleared on stop/dispose.
- Legacy handoff monitor state can retry after failure.
- Unified session close no longer drops the entry before writer close settles,
  and dead queue code is removed or made non-lossy.
- Runtime factory code has no definite-assignment bypass for rollover wiring.
- Core Bridge reconnect status notifications are deduped without changing
  reconnect scheduling.
- Confirmed low-priority cleanup/facade findings are either implemented or
  explicitly deferred to a separate cleanup cycle.
- Targeted builds and final release scripts pass.
