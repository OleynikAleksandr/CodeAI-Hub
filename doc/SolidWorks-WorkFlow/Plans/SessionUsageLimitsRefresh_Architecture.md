# Session Usage Limits Refresh Architecture

**Status:** Draft for review (2026-04-12)
**Created:** 2026-04-12
**Owner:** Oleksandr + Codex
**Scope:** Fix the Session ID + Usage Limits panel refresh flow so usage limits reload when Project Manager restores the active session on workspace open and when the user switches between workflow steps/sessions.

---

## 1. Problem

`SessionIdUsageBar` currently calls `onRefreshUsageLimits(providerId)`, but the manual refresh path is provider-wide instead of session-scoped.

Current behavior breaks the expected UI update flow in two places:

1. Core broadcasts manual refresh results under a synthetic session id (`provider_<providerId>`), so the UI reducer cannot map the payload back to the active session snapshot.
2. Provider adapters read manual refresh data under a synthetic provider session id (`proactive`), so the resulting `providerScopeKey` does not match the active session binding/provider scope shown in Project Manager.

Because of that, the panel may still show stale cache or no usage limits after:

- workspace cold-start restore of the last active step/session;
- switching from one step/session to another inside Project Manager.

---

## 2. Product Goal

When Project Manager shows a session, the usage limits panel must refresh against that concrete session scope.

The refresh must happen when:

1. a workspace opens and Project Manager restores the active step/session;
2. the active session changes because the user switched to another workflow step/session;
3. the active session binding becomes ready after restore/switch and exposes the real provider session id.

Provider identity for this refresh must come from the same active session status source that powers the Status Panel (`status.models[0].providerId`, with safe fallback only if that field is absent).

The resulting usage limits payload must update the same session snapshot that is currently rendered, so `SessionIdUsageBar` rerenders immediately from live state instead of relying on a later unrelated event.

---

## 3. Non-Goals

This scope does not:

- redesign the visual layout of `SessionIdUsageBar`;
- change token usage logic;
- redefine provider-specific quota semantics;
- introduce a new usage limits store outside the existing session snapshots/cache flow.

---

## 4. Core Decisions

### 4.1. Manual refresh becomes session-scoped

`onRefreshUsageLimits(...)` must carry session-scoped identity, not just provider id.

Required refresh context:

- runtime `sessionId`;
- effective provider id used by the active session;
- bound `providerSessionId` when available.

This allows Core and provider adapters to read usage limits for the real active session scope and return the result to the same UI snapshot id.

### 4.2. Refresh trigger follows active session identity changes

The refresh trigger must rerun when the active session identity changes:

- active `sessionId`;
- active session provider identity from `status.models[0].providerId`;
- active session binding `providerSessionId`.

This covers both cold-start restore and user-driven step/session switching without adding a separate workflow-specific trigger path.

### 4.3. Core must broadcast refresh results under the real runtime session id

Manual refresh results must be broadcast as `session:stream` for the concrete runtime session id that owns the visible snapshot.

Synthetic ids such as `provider_<providerId>` are not allowed on this path because the UI reducer requires a real source snapshot to propagate usage limits.

### 4.4. Provider adapters must read usage limits for the bound provider session

Manual refresh must use the active session's bound `providerSessionId` instead of the synthetic `proactive` id.

This keeps `providerScopeKey` aligned with the session snapshot/provider binding used by `SessionIdUsageBar`.

### 4.5. Existing snapshot/cache path remains the single render source

`SessionIdUsageBar` stays stateless.

Live render source remains:

- `status.usageLimits`;
- `status.usageLimitLabels`;
- fallback `usage-limits-cache`.

The fix must update snapshots through the existing `session:stream -> updateSnapshotsWithUsageLimits(...) -> setSnapshots(...)` path.

---

## 5. Implementation Scope

Expected touch points:

- `src/client/ui/src/session/session-id-bar.tsx`
- `src/client/ui/src/session/session-view.tsx`
- `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx`
- `src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx`
- `src/client/project-manager/api.ts`
- `src/client/project-manager/core-stream-message-types.ts`
- `packages/core/src/provider-registry/provider-module-loader.types.ts`
- `packages/core/src/remote-bridge/remote-bridge-message-router.ts`
- `packages/core/src/remote-bridge/handlers/session-request-handler.ts`
- provider adapters for Claude/Codex/Gemini

Tests must cover:

- refresh trigger on active session switch;
- refresh trigger when binding becomes ready;
- session-scoped Core broadcast instead of synthetic provider session id;
- snapshot update/rerender path for the active session.
