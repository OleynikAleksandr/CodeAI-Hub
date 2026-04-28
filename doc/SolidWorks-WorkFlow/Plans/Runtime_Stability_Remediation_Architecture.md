# Runtime Stability Remediation — Architecture Plan

**Status:** Accepted for implementation
**Created:** 2026-04-28 18:17 CEST
**Accepted:** 2026-04-28 18:25 CEST
**Branch at planning time:** `main`
**Current version at planning time:** `1.2.102`
**Target release:** `1.2.103` unless version changed before execution starts

## 1. Source and Goal

This planning document turns the external repository review report from
`/Users/oleksandroliinyk/Downloads/message.txt` and the follow-up local
verification into an implementation scope.

Goal: remove the confirmed runtime stability risks without changing product
behavior, provider contracts, or workflow semantics beyond the minimum needed
for safer lifecycle handling, input validation, settings reads, cleanup, and
diagnostics.

The user approved implementation on 2026-04-28. The active execution checklist
is `doc/TODO/todo-plan.md`.

## 2. Confirmed Findings

### 2.1 Project Manager WebSocket lifecycle

Confirmed.

Current behavior:
- `src/client/project-manager/api.ts` only returns early when the socket is
  already `OPEN`, not when it is `CONNECTING`.
- `src/client/project-manager/components/layout/main-layout.tsx` calls
  `api.connect()` on mount and only unsubscribes project listeners on cleanup.
- `ProjectManagerApi` installs an anonymous `window.message` listener in the
  constructor, so it cannot be removed by a later lifecycle cleanup.
- reconnect delay is fixed at `2000ms`.

Risk:
- React Strict Mode, HMR, remounts, or future multi-host PM embedding can create
  simultaneous or stale sockets.
- old sockets can still fire handlers and schedule reconnect loops after the UI
  surface that initiated them has gone away.

### 2.2 WebSocket input validation

Confirmed.

Current behavior:
- PM parses server messages with `JSON.parse(...) as IncomingMessage`.
- Core parses client messages with `JSON.parse(...) as IncomingMessage`.
- Router code then reads `incoming.payload.*` assuming the payload shape is
  valid.

Risk:
- malformed but valid JSON can reach business handlers and fail in unrelated
  code paths.
- debugging is harder because transport boundary errors are reported as handler
  errors.

### 2.3 synchronous settings I/O on turn-adjacent paths

Confirmed with nuance.

Hot or near-hot paths:
- Codex normal send path reads `settings.json` in
  `packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.ts`
  to resolve reasoning summary policy.
- Claude query option construction reads settings in
  `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`.
- Core applied turn config and translation policy resolve settings through
  `packages/core/src/config/provider-settings-snapshot.ts` and
  `packages/core/src/session-translation/session-translation-policy-resolver.ts`.
- Gemini provider-local settings read is primarily session create/resume, not
  every user message, but still uses synchronous file I/O.

Risk:
- every active turn can pay disk I/O latency on the Node.js event loop.
- repeated translation policy reads can multiply the same setting file read in a
  single dispatch.

### 2.4 provider event listener cleanup

Partially confirmed.

Claude:
- `packages/Claude_Module/src/session/session-lifecycle.ts` already calls
  `session.eventEmitter.removeAllListeners()` during close. No Claude code
  change is required unless implementation discovers a separate listener path.

Gemini:
- `packages/Gemini_Module/src/provider/gemini-provider-adapter.ts` registers
  `message`, `error`, `realSessionId`, and `sessionIdChanged` listeners during
  managed session startup.
- close removes adapter listener buckets but does not explicitly remove the
  session event-emitter listeners registered by the adapter.

Risk:
- long-running instances can retain closures or duplicate forwarding if a
  provider session object survives longer than expected.

### 2.5 silent UI bridge catches

Confirmed but lower priority.

Current behavior:
- several `src/client/ui/src/core-bridge/*` paths intentionally ignore
  best-effort failures.

Risk:
- history hydration, status fetches, provider picker bootstrap, or host bridge
  calls can fail without any useful diagnostic signal.

### 2.6 definite assignment bypass in runtime factory

Confirmed as a maintainability risk, not an immediate runtime defect.

Current behavior:
- `packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core.ts`
  uses `let messageDispatch!` and `let sessionResolution!` to wire circular
  callbacks.

Risk:
- current construction order is synchronous and appears safe, but a future
  constructor-side callback or refactor could call the lazy reference before
  assignment and crash with a less obvious failure.

## 3. Non-Goals

- Do not replace the whole remote bridge protocol.
- Do not add a new schema dependency unless simple local type guards become
  clearly inadequate during implementation.
- Do not change provider IDs, session IDs, dialog routing, model binding,
  continuity, or usage-limits semantics.
- Do not rewrite provider modules to async settings APIs in this scope.
- Do not touch closed provider behavior that is already covered by SSOT unless a
  confirmed defect is found while implementing this scope.

## 4. Architecture Decisions

### 4.1 ProjectManagerApi owns PM socket lifecycle

`ProjectManagerApi` remains the single PM-side facade for Core transport.

Required design:
- `connect()` must be idempotent for both `OPEN` and `CONNECTING`.
- socket event handlers must ignore stale sockets by comparing the event source
  with `this.socket`.
- add `disconnect()` that:
  - clears any reconnect timer;
  - closes the current socket if it is `CONNECTING` or `OPEN`;
  - clears handler references;
  - prevents the close handler from scheduling a reconnect when the close is
    intentional.
- extract the `window.message` handler into a stable instance method or bound
  field so it can be removed if `ProjectManagerApi` is disposed.
- reset reconnect attempts after successful open.
- reconnect delay must use exponential backoff starting at `2000ms`, capped at
  `30000ms`; jitter is allowed but not required.

`MainLayout` cleanup should call the facade cleanup path in addition to its
local unsubscribe. Because `api` is a module singleton, implementation must
avoid breaking expected PM remount reconnect behavior: after cleanup, a later
mount must be able to call `connect()` again normally.

### 4.2 inbound WebSocket validation lives at transport boundaries

All parsed WS payloads are `unknown` until validated.

PM inbound server messages:
- add a PM-side validator/parser under `src/client/project-manager/services/`.
- `api.ts` must call that parser before `handleMessage`.
- invalid messages must be logged as transport-boundary warnings and ignored.
- known message types with payloads consumed by PM must have payload shape checks.

Core inbound client messages:
- add a Core-side validator/parser under
  `packages/core/src/remote-bridge/handlers/`.
- `WebSocketManager.processMessage()` must parse JSON into `unknown`, validate
  it, and call `onIncomingMessage` only for accepted messages.
- invalid JSON and invalid shapes should produce a client-visible generic error
  and a Core logger warning with `clientId`, message type when available, and a
  reason. Do not include full user content in logs.

Validation is allowlist-based. When a new WS command/event is added later, its
validator must be updated in the same change.

### 4.3 settings reads use small path-scoped caches

Core:
- introduce a small JSON file snapshot cache in `packages/core/src/config/`.
- cache entries are path-scoped and TTL-scoped.
- default TTL: `5000ms`.
- malformed/missing files cache as a miss only for the TTL window, not forever.
- Core settings save/reset should invalidate the shared cache for the canonical
  settings path where practical.
- `provider-settings-snapshot.ts` and
  `session-translation-policy-resolver.ts` should share this cache instead of
  reading the same JSON file repeatedly on the same turn path.

Provider packages:
- because Claude/Codex/Gemini provider bundles are independently packaged, use
  local helper logic inside each provider package rather than importing Core
  internals across package boundaries.
- keep the same `5000ms` TTL.
- cache only the parsed settings snapshot needed for current provider decisions.

Reasoning:
- a short TTL keeps Settings changes visible quickly while removing repeated
  disk reads from tight turn paths.
- this is less invasive than changing every provider API to async
  `fs.promises.readFile`.

### 4.4 Gemini session event listener cleanup is explicit

Required design:
- adapter-registered listeners must have a deterministic cleanup path.
- if `sessionIdChanged` moves the live provider id, cleanup ownership must move
  with it.
- `closeSession()` must remove adapter-level listener buckets and provider
  event-emitter listeners.
- if the session lifecycle emits a final close system event, cleanup order must
  be deliberate and covered by tests.

Claude is treated as already covered unless implementation finds a concrete
leak not visible in the planning review.

### 4.5 UI bridge ignored failures become low-noise diagnostics

Required design:
- keep best-effort behavior where failures are non-fatal.
- replace silent catches with small diagnostics that include operation name and
  sanitized error message.
- avoid logging full prompts, message content, access tokens, filesystem
  payload bodies, or large JSON blobs.
- prefer one small local logger helper for `core-bridge` so future call sites do
  not invent inconsistent console output.

### 4.6 runtime factory removes definite assignment bypass

Required design:
- remove `let messageDispatch!` and `let sessionResolution!`.
- preserve the current construction graph and public facade shape.
- acceptable implementation: a small lazy reference helper inside the same file
  that throws a descriptive internal wiring error if called before assignment.
- no behavior change is expected.

## 5. Documentation Updates Required During Implementation

Implementation commits must keep code and SSOT docs synchronized.

Likely update targets:
- `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
- `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
- `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
- `doc/SolidWorks-WorkFlow/Modules/Codex.md`
- `doc/SolidWorks-WorkFlow/Modules/Claude.md`
- `doc/SolidWorks-WorkFlow/Modules/Gemini.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`

When implementation completes, this planning document should move to
`doc/SolidWorks-WorkFlow/Plans/Archive/`, and stable conclusions should remain
in the canonical SSOT files above.

## 6. Verification Strategy

Targeted checks during streams:
- PM lifecycle and parser unit tests if local PM test harness supports them.
- Core `WebSocketManager` tests for malformed JSON and malformed message shape.
- provider-specific tests for settings cache behavior and Gemini cleanup.
- targeted builds:
  - `npm run build:webview`
  - `npm run typecheck:webview`
  - `npm run build --workspace @codeai-hub/core`
  - `npm run build --workspace @codeai-hub/claude-module`
  - `npm run build --workspace @codeai-hub/codex-module`
  - `npm run build --workspace @codeai-hub/gemini-module`

Closeout release stream:
- update release docs for future version before running release scripts;
- run `./scripts/build-all.sh`;
- run `./scripts/build-release.sh --use-current-version`;
- verify release output includes SDK exclusions, dev dependency pruning, and
  package creation;
- archive the completed todo-plan and this planning document;
- create the next session report after all substantive commits are done.

## 7. Acceptance Criteria

- PM cannot create duplicate live sockets from repeated `connect()` while a
  connection is already open or pending.
- PM cleanup can close the socket and clear reconnect timers intentionally.
- reconnect delay backs off up to a `30000ms` cap and resets after open.
- invalid PM/Core WS messages are rejected at the boundary and never reach
  business routers as typed data.
- settings reads on turn-adjacent paths no longer perform a fresh synchronous
  file read for every caller within the TTL window.
- Gemini session close removes adapter-registered event listeners.
- best-effort UI bridge failures leave at least sanitized diagnostics.
- runtime factory no longer uses definite assignment assertions for circular
  callback wiring.
- targeted builds and final release scripts pass.
