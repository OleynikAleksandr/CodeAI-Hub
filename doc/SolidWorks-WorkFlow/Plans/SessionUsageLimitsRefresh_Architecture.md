# Session Usage Limits Refresh Architecture

**Status:** Updated after release smoke + diagnostics instrumentation (2026-04-13)
**Created:** 2026-04-12
**Owner:** Oleksandr + Codex
**Scope:** Fix the Session ID + Usage Limits panel refresh flow so usage limits reload when Project Manager restores the active session on workspace open and when the user switches between workflow steps/sessions.

---

## 1. Problem

`SessionIdUsageBar` currently calls `onRefreshUsageLimits(providerId)`, but the manual refresh path is provider-wide instead of session-scoped.

Initial implementation fixed the refresh trigger/broadcast flow, but release smoke on `1.1.966` exposed two remaining contract violations:

1. usage limits still kept provider-session-scoped `providerScopeKey`, so different sessions of the same provider could continue to display different buckets;
2. UI still had a persistent fallback cache path, so the panel could render stale limits even before the fresh per-session refresh completed.

Current behavior therefore still breaks the expected UI update flow in these places:

1. restored or switched workflow sessions can retain old session-specific `providerScopeKey` values for the same provider;
2. `SessionIdUsageBar` can still render stale cache instead of live snapshot state.

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
- introduce a new usage limits store outside the existing session snapshots flow.

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

This keeps the live read bound to the real provider runtime session while still allowing the final UI scope to be normalized to provider-global identity.

### 4.5. Usage limit scope is provider-global

Usage limits are provider-wide, not provider-session-wide.

Therefore every usage-limit payload and every session snapshot must converge to:

- `claude:global`
- `codex:global`
- `gemini:global`

This normalization must also migrate old restored session-specific keys (`claude:<session>`, `codex:<session>`, `gemini:<session>`) into the provider-global key during snapshot/update processing.

### 4.6. No persistent usage-limits cache

`SessionIdUsageBar` stays stateless and must render only from live snapshot state:

- `status.usageLimits`;
- `status.usageLimitLabels`.

Persistent browser-side fallback cache is not allowed for usage limits. When Project Manager shows a session, it already triggers a fresh refresh request, so cached usage limits only introduce visible divergence.

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
- `packages/core/src/provider-usage-limits/provider-usage-limits-scope-key.ts`
- `src/client/ui/src/session/helpers.ts`
- `src/client/project-manager/components/sessions/usage-limits-stream.ts`
- provider adapters for Claude/Codex/Gemini

## 6. Diagnostic Follow-Up After Release 1.1.968

Release smoke for `1.1.968` exposed one more path-specific regression signature:

1. when Project Manager auto-selects the last active workflow step on workspace open, usage limits can fail to appear forever for that auto-opened step;
2. after a manual step switch away and back, the same step often shows limits correctly.

This symptom indicates a likely race in the restore/bootstrap sequence rather than a provider quota-reader failure.

### 6.1. Investigation hypothesis

The highest-probability failure mode is:

1. PM resolves the dialog/runtime session shell during auto-select;
2. `Session ID + Usage Limits` triggers manual refresh before the real runtime session is materialized in Core;
3. Core drops or skips that refresh because the runtime session binding is still absent;
4. later manual step switching remounts the panel and replays the same refresh after runtime session bootstrap is complete.

### 6.2. Diagnostic requirement

To validate that sequence, PM and Core must emit one correlated diagnostic chain into file-backed logs under `~/.codeai-hub/logs/`:

1. PM dialog bootstrap resolution (`dialogId`, `preferredRuntimeSessionId`, `resolvedRuntimeSessionId`, `hasRuntimeSession`, `restoreRequested`);
2. PM `refreshUsageLimits(...)` request payload;
3. Core refresh decision (`runtimeSessionFound`, `boundProviderSessionId`, `adapterAvailable`);
4. Core final outcome (`refresh dispatched` vs `refresh skipped`).

For standalone PM this means diagnostics must not rely on browser DevTools console as the primary source of truth; PM signals should be forwarded into Core-owned file logging.

Tests must cover:

- refresh trigger on active session switch;
- refresh trigger when binding becomes ready;
- session-scoped Core broadcast instead of synthetic provider session id;
- provider-global snapshot convergence across different sessions of the same provider;
- absence of persistent usage-limits fallback cache in `SessionIdUsageBar`.
