# Flow Node Continuity Turn-End Atomic Lock Architecture

**Date:** 2026-02-07 20:35 (CET)
**Status:** Draft for implementation planning (Phase 101)
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
- UI MUST never observe intermediate unlocked state when continuity handoff is pending.

In short: no `unlock -> relock` sequence for the same turn completion.

---

## 3. Core Contract Changes

### 3.1 Turn-End Lock Arbitration

At turn completion boundary:

1. Evaluate continuity thresholds and rollover preconditions.
2. Branch:
   - `continuity_required = false` -> emit normal unlock/idle state.
   - `continuity_required = true` -> keep lock and emit continuity lock pending/active state.

Core becomes the single source of truth for final turn-end lock decision.

### 3.2 Safety Guard for Sends

While rollover is pending/active:

- Core rejects or queues sends targeting old session (configurable policy).
- Preferred MVP: queue and route message only after continuity target session is ready.

This guard protects correctness even if UI receives late/out-of-order stream events.

### 3.3 Event Ordering Invariant

For a turn where continuity is required, allowed sequence is:

- `running` -> `continuity_lock(locked)` -> rollover flow -> `continuity_lock(unlocked)`

Forbidden sequence:

- `running` -> `idle/unlocked` -> `continuity_lock(locked)`

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
- `rolloverPending = false`
- normal turn constraints permit idle.

---

## 6. Test Strategy

### 6.1 Core

- Regression: threshold exceeded at turn end does not emit intermediate unlock.
- Regression: old-session send during rollover pending is blocked/queued.
- Regression: no-threshold path unlocks normally.

### 6.2 PM/UI

- Stream reducer test: no unlocked snapshot appears between `turn_completed` and continuity lock.
- Input panel test: disabled remains true until continuity unlock event.

### 6.3 End-to-End

- Simulated long turn that crosses threshold:
  - verify user cannot send in old session during transition window.

---

## 7. Risks and Mitigations

1. **Risk:** deadlock if continuity decision never resolves.
   - **Mitigation:** timeout fallback with deterministic unlock reason (`resume_timeout`).
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
