# Flow Node Continuity Input Lock Contract Architecture

**Date:** 2026-02-06 18:40 (CET)
**Status:** Active baseline for Phase 100 copy/lock sync
**Scope:** `description/reviewer` rollover (with reusable contract for other flow nodes)

---

## 1. Problem Statement

During flow-node continuity rollover, the UI currently has a timing gap where the user input becomes available between:

1. old session rollover phase completion (`report_ready` / `new_session_created` / `resume_sent`), and
2. first effective runtime event from the new session (`turn_started` / `turn_completed` / `turn_failed`).

In this gap, the user can submit a message into the newly created session before the resume bootstrap completes. This creates message-loss and race-risk for node continuity.

---

## 2. Verified Current Behavior (Runtime + Code)

### 2.1 Runtime evidence (2026-02-06)

- Old reviewer provider session: `c92b2aa9-d807-43a6-a9ee-0845589fae97`
- New rollover provider session: `a0fcf4b0-30bd-4ba2-bbc8-0d154613e8b0`
- Continuity report path:
  - `.codeai-hub/codeai-worktree/flow/nodes/description-reviewer/continuity/reports/2026-02-06T14-20-22-640Z-Reviewer-claudeCodeCli.md`

Observed sequence:

1. Core sends create-report prompt to old session.
2. Report is written.
3. Core creates a new session and sends resume prompt.
4. Before the new session emits reliable turn lifecycle events, UI enters an input-available state.
5. New session eventually replies with internal acknowledgement `__CODEAIHUB_INTERNAL_CONTINUITY_ACK__`.

### 2.2 Root causes in code

1. `token-usage-stream` maps `flow_node_rollover` phases to connection state, but only early phases are blocking; later phases become `idle`.
2. New session snapshot starts with `connectionState: "idle"`.
3. Input disable logic is tied to `running || isQueued`, not to an explicit continuity bootstrap lock.
4. Existing protocol has no dedicated lock lifecycle event spanning old -> new session bootstrap.

---

## 3. Target Contract (Variant 2)

Introduce explicit continuity lock stream events from Core, consumed by PM/UI as the source of truth for input locking during rollover bootstrap.

### 3.1 New stream event payload

Event transport remains `session:stream` with `event.type = "stream_event"`.

`event.data.kind = "continuity_lock"` payload:

- `kind`: `"continuity_lock"`
- `state`: `"locked" | "unlocked"`
- `rolloverId`: string (stable id for one rollover transaction)
- `sourceSessionId`: string (session that started rollover)
- `targetSessionId?`: string (newly created continuation session)
- `stageId`: string
- `runSlug?`: string | null
- `reason`: one of
  - `threshold_reached`
  - `report_in_progress`
  - `resume_bootstrap`
  - `resume_ready`
  - `resume_failed`
  - `resume_timeout`
- `timestamp`: ISO string

### 3.2 Lifecycle rules

1. On threshold trigger, Core emits `continuity_lock(state=locked, reason=threshold_reached)` for source session.
2. During report creation/waiting, Core may emit additional `locked` updates (`report_in_progress`).
3. Right after new continuation session creation, Core emits `locked` for target session with same `rolloverId` and `reason=resume_bootstrap`.
4. Core keeps lock active until new session emits first terminal bootstrap lifecycle signal:
   - first `turn_completed` OR `turn_failed` for resume bootstrap turn.
5. On success, Core emits `continuity_lock(state=unlocked, reason=resume_ready)` for target session (and optionally source session finalization event).
6. On error/timeout, Core emits `continuity_lock(state=unlocked, reason=resume_failed|resume_timeout)`.

### 3.3 Safety requirements

- Lock state must never be inferred from `flow_node_rollover.phase` only.
- `resume_sent` does not imply unlock.
- Unlock must be tied to observed bootstrap completion/failure signal in the new session.

---

## 4. UI/PM Consumption Rules

### 4.1 Snapshot model extension

Extend `SessionStatusInfo` with continuity lock state:

- `continuityLock: {`
- `  active: boolean;`
- `  rolloverId?: string;`
- `  sourceSessionId?: string;`
- `  reason?: string;`
- `  updatedAt: number;`
- `}`

### 4.2 Effective input lock predicate

Input must be disabled when any of these is true:

- `continuityLock.active === true`
- `connectionState === "running"`
- `isQueued === true`

Optional additive hardening:

- preserve `blocked` as disabled as well (defensive backward compatibility)

### 4.3 Placeholder policy

Approved copy set for Phase 100:

- continuity handoff lock (`continuityLock.active === true` or effective `blocked`):
  - `Agent is resuming your session… Please wait.`
- regular running turn (`connectionState === "running"` without continuity lock):
  - `Agent is working… Please wait.`

Display rule:

- Placeholder/copy and `disabled` state must be driven by the same derived lock flag.
- It is forbidden to show handoff wait-copy while input is already enabled.

### 4.4 Queue behavior while lock is active

User submit during continuity lock must not be dropped:

- either queue (preferred, same UX as blocked), or
- hard reject with visible system message.

MVP target: reuse queued-send behavior.

### 4.5 Internal continuity ACK policy

The internal resume acknowledgement phrase is standardized as:

- `Ready to continue working.`

Rule:

- This phrase is an internal protocol signal only and must be hidden from user-visible conversation history.
- If legacy ACK token messages are encountered in old history, they remain filtered out the same way.

---

## 5. Core Integration Plan

1. Add continuity lock emitter helper in `SessionRequestHandler`.
2. Track per-rollover bootstrap state (rollover id + target session id + locked/unlocked status).
3. Emit lock events for both old and new sessions at deterministic points.
4. Hook unlock emission into new session bootstrap lifecycle completion (`turn_completed`/`turn_failed`).
5. Add timeout fallback unlock to avoid dead-lock.

---

## 6. Test Strategy

### 6.1 Core

- Unit regression for rollover sequence:
  - threshold trigger -> locked
  - new session created -> locked on target
  - resume bootstrap completed -> unlocked
- Failure path:
  - resume failure/timeout -> unlocked with failure reason

### 6.2 PM/UI

- Reducer/stream tests for `continuity_lock` event application.
- UI test: input remains disabled across session switch until unlock event.
- Regression: `__CODEAIHUB_INTERNAL_CONTINUITY_ACK__` remains hidden from dialog.

---

## 7. Backward Compatibility

- Existing `flow_node_rollover` notifications remain for status/debug timeline.
- UI lock source of truth becomes `continuity_lock` event.
- If lock event is missing (older core), fallback behavior remains current (`running/queued`).

---

## 8. Open Questions (for Interface/Implementation Session)

1. Should Core emit lock updates to source session after target session exists, or only to target session?
2. Should unlock be emitted exactly once, or can repeated idempotent unlock events be allowed?
3. Should `blocked` be retained as a separate visible state once lock contract is active, or mapped to lock semantics only?
