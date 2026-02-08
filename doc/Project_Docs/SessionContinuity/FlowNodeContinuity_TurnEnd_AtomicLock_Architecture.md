# Flow Node Continuity Turn-End Atomic Lock Architecture

**Date:** 2026-02-07 20:35 (CET)
**Status:** Approved baseline + Phase 102 hotfix addendum
**Scope:** prevent transient input unlock between `turn_completed` and continuity handoff lock decision

---

## 1. Problem Statement

Current runtime behavior still allows a short unlock window at turn end:

1. Core emits end-of-turn completion and UI removes input lock.
2. Core then evaluates context-threshold continuity condition.
3. If threshold is exceeded, Core emits a new continuity lock.

During this gap (often 1-3 seconds), user can submit into the old session, which violates continuity safety.

---

## 2. Target Behavior

Input lock arbitration must be atomic at turn end:

- Core MUST evaluate continuity threshold before emitting effective unlock.
- If continuity is required, Core MUST keep lock active and transition directly to continuity handoff lock state.
- If session is no-resume, Core MUST keep lock active and mark session terminal/read-only after final answer.
- UI MUST never observe intermediate unlocked state when continuity handoff is pending.

In short: no `unlock -> relock` sequence for the same turn completion.

---

## 3. Core Contract Changes

### 3.1 Turn-End Lock Arbitration

At turn completion boundary:

1. Evaluate continuity thresholds and rollover preconditions.
2. Branch:
   - `session_mode = no_resume` -> keep lock, mark terminal/read-only (no unlock path).
   - `session_mode = resumable` and `continuity_required = false` -> unlock/idle only after final `turn_completed` + explicit Core confirmation `no rollover`.
   - `session_mode = resumable` and `continuity_required = true` -> keep lock and emit continuity lock pending/active state.

Core becomes the single source of truth for final turn-end lock decision.

### 3.2 Safety Guard for Sends

While rollover is pending/active:

- Core rejects or queues sends targeting old session (configurable policy).
- Phase 101 MVP policy: reject send in old session with explicit bridge error (`continuity_rollover_pending`) until lock is released.

This guard protects correctness even if UI receives late/out-of-order stream events.

### 3.3 Event Ordering Invariant

For a turn where continuity is required, allowed sequence is:

- `running` -> `continuity_lock(locked)` -> rollover flow -> first bootstrap assistant answer in target -> `continuity_lock(unlocked, reason=resume_ready)`

Forbidden sequence:

- `running` -> `idle/unlocked` -> `continuity_lock(locked)`

### 3.4 Approved Runtime Arbitration (Phase 101)

At `turn_completed` boundary, Core executes arbitration in this order:

1. Resolve if silent/preemptive continuity rollover must start for current session.
2. If rollover starts:
   - emit/keep `continuity_lock=locked` first;
   - do not emit intermediate unlock state;
   - keep old session sends blocked by rollover guard.
3. If rollover does not start:
   - unlock только после dual gate: final `turn_completed` + Core `no rollover` decision.

This preserves atomicity and removes the user-visible unlock window.

### 3.5 Phase 102+ Hotfix — Unlock Resolution Semantics

Regression context:

- PM/UI treated rollover pending too broadly (`phase !== "failed"`).
- Target session could stay `blocked` even after `continuity_lock(state=unlocked)` if `rollover.phase` stayed `resume_sent`.

Required contract for Phase 102+:

1. `continuity_lock(state=unlocked)` допустим только для разрешённых unlock-path:
   - `turn_complete_no_rollover` (resume-in-place),
   - `resume_ready` (rollover path after first bootstrap assistant answer).
2. `resume_failed|resume_timeout` не являются unlock-сигналами: lock остаётся активным, меняется только reason/copy.
3. После разрешённого unlock pending fallback по rollover phase MUST NOT keep the session blocked forever.
4. PM/UI pending fallback must use an explicit pending-phase set (not negative broad checks like `phase !== "failed"`).

Approved pending-phase set:

- `start`
- `create_report_sent`
- `waiting_for_report`
- `report_ready`
- `new_session_created`
- `resume_sent`

Approved unlock reasons:

- `turn_complete_no_rollover`
- `resume_ready`

`continuity_lock=unlocked` with one of approved unlock reasons must release effective lock unless normal turn constraints keep it locked (`running` or queued-send path).

### 3.6 Phase 103 — Core-first Immediate Lock + Send-error Rollback

Regression context:

- Provider behavior differs at send start:
  - Claude path can emit `turn_started` optimistically at send call.
  - Codex path emits `turn_started` only after SDK `turn.started`.
- Because UI lock is derived from `turn_state`/`continuity_lock`, Codex has a visible late-lock window between submit and first provider marker.

Required contract for Phase 103:

1. Core is the source of truth for immediate submit lock:
   - on accepted user send, Core MUST emit `turn_state=running` before `adapter.sendMessage(...)`.
2. This immediate running emission is provider-agnostic and must apply identically to Claude/Codex/Gemini paths.
3. If `adapter.sendMessage(...)` throws, Core MUST rollback lock state with `turn_state=idle` for the same session.
4. Rollback must keep existing error flow intact:
   - `session:error` still emitted with provider failure details.
5. Duplicate `running` markers are acceptable:
   - provider-level `turn_started` may arrive later and is treated as idempotent reinforcement, not a state regression.

Event-order invariants for one accepted send:

- Success path:
  - `user submit accepted` -> `turn_state=running (core-immediate)` -> provider stream lifecycle -> terminal (`turn_completed|turn_failed`) -> `turn_state=idle`.
- Send-failure path:
  - `user submit accepted` -> `turn_state=running (core-immediate)` -> `adapter.sendMessage` error -> `turn_state=idle (rollback)` -> `session:error`.

Forbidden behavior:

- `user submit accepted` -> no `running` until provider marker (provider-specific late lock).
- `adapter.sendMessage` error without rollback to `idle` (stuck input lock).

---

## 4. UI/PM Consumption Rules

1. UI lock state is derived from explicit lock contract events, not from optimistic turn completion alone.
2. `turn_completed` is not sufficient to unlock when continuity decision is pending.
3. Placeholder text can change (`working` -> `resuming`) without enabling input.
4. Queued-send behavior remains active whenever continuity lock is active.

---

## 5. State Model Additions

Session rollover state (Core-side) should explicitly represent:

- `continuityDecisionPending: boolean`
- `continuityRequired: boolean`
- `rolloverPending: boolean`
- `targetSessionReady: boolean`

Unlock is allowed only when:

- `continuityDecisionPending = false`
- `sessionMode != no_resume`
- one of:
  - `continuityRequired = false` and final `turn_completed` already observed;
  - `continuityRequired = true`, `rolloverPending = false`, and first bootstrap assistant answer in target observed;
- normal turn constraints permit idle.

---

## 6. Test Strategy

### 6.1 Core

- Regression: threshold exceeded at turn end does not emit intermediate unlock.
- Regression: old-session send during rollover pending is blocked/queued.
- Regression: no-threshold path unlocks only after dual gate (`turn_completed` + Core `no rollover`).
- Regression: no-resume session remains terminal/read-only after final answer.

### 6.2 PM/UI

- Stream reducer test: no unlocked snapshot appears between `turn_completed` and continuity lock.
- Input panel test: disabled remains true until allowed unlock gate is met.

### 6.3 End-to-End

- Simulated long turn that crosses threshold:
  - verify user cannot send in old session during transition window.

---

## 7. Risks and Mitigations

1. **Risk:** deadlock if continuity decision never resolves.
   - **Mitigation:** timeout fallback updates reason (`resume_timeout`) without unlock; session stays safely locked/read-only.
2. **Risk:** duplicate lock events.
   - **Mitigation:** idempotent lock state updates by `rolloverId` + monotonic `updatedAt`.
3. **Risk:** legacy UI fallback paths may still unlock on `idle`.
   - **Mitigation:** prioritize continuity lock predicate over legacy connection-state unlock logic.

---

## 8. Acceptance Criteria

1. No user-visible unlocked input window between turn completion and continuity lock when threshold exceeded.
2. No successful send into old session while continuity handoff is pending.
3. Continuity handoff still completes with existing resume flow and copy contract.
4. Mandatory quality gates and target builds pass before release build.

---

## 9. Cross-Document Links

- System source of truth: `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md` (section 2.7).
- Continuity lock baseline: `doc/Project_Docs/SessionContinuity/FlowNodeContinuity_InputLock_Contract_Architecture.md`.
