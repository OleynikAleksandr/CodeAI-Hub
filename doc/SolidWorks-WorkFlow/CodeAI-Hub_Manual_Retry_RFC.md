# RFC: Manual Retry with Provider-Home Rollback

## CodeAI-Hub -- Session One-Turn Recovery Mechanism

**Status:** Proposed\
**Author:** CodeAI-Hub Core\
**Date:** 2026-02-21

------------------------------------------------------------------------

# 1. Scope

This document describes the implementation of a **Manual Retry
mechanism** for one-turn sessions in CodeAI-Hub.

The system currently executes all agents in a strict one-turn model
(request → response).\
If a provider turn hangs or fails without emitting a terminal event, the
UI becomes blocked and recovery requires manual file cleanup.

This RFC introduces a deterministic and safe retry mechanism that:

-   Allows the user to manually trigger retry.
-   Rolls back provider-home state to the last successful state.
-   Automatically resends the last user request.
-   Prevents state corruption.
-   Preserves SolidWorks-style workflow determinism.

------------------------------------------------------------------------

# 2. Problem Statement

Current behavior:

-   A turn is started.
-   Provider begins execution.
-   Provider hangs or never emits terminal `turn_completed`.
-   UI remains locked.
-   Resume cannot occur because provider JSONL is corrupted/incomplete.
-   Manual filesystem cleanup required.

This is unacceptable for production workflow.

------------------------------------------------------------------------

# 3. Design Goals

1.  Never require manual filesystem intervention.
2.  Preserve deterministic session continuity.
3.  Avoid editing/truncating provider JSONL manually.
4.  Avoid concurrent active turns.
5.  Maintain strict one-turn model.
6.  Retry must be explicit (manual, not watchdog-driven).
7.  Input must remain locked during retry.
8.  Rollback must be atomic and safe.

------------------------------------------------------------------------

# 4. Definitions

  Term            Meaning
  --------------- ------------------------------------------------------
  Turn            One request-response cycle
  Attempt         Execution instance of a Turn
  Provider-Home   `$CODEX_HOME` or equivalent provider session storage
  Snapshot        Pre-turn filesystem copy used for rollback
  Retry           Cancel + Rollback + Re-run

------------------------------------------------------------------------

# 5. High-Level Flow

Manual Retry process:

1.  User presses **Retry**
2.  Core:
    -   Aborts active provider process
    -   Marks previous attempt as `aborted_by_user`
    -   Restores provider-home from snapshot
    -   Increments `attemptId`
    -   Re-sends saved user request
3.  UI remains locked
4.  Turn completes normally
5.  UI unlocks only after terminal event

------------------------------------------------------------------------

# 6. Provider-Home Transaction Model

## 6.1 Snapshot Before Every Turn

Before starting provider execution:

-   Create atomic snapshot of:
    -   `$CODEX_HOME/sessions/**`
    -   Rollout JSONL files
    -   Any session metadata
-   Snapshot must be filesystem-atomic (directory rename or temp clone)

## 6.2 On Retry

Core performs:

1.  Stop provider process
2.  Acquire provider-home lock
3.  Restore snapshot (atomic replace)
4.  Release lock
5.  Restart turn

No manual truncation of JSONL is ever performed.

------------------------------------------------------------------------

# 7. State Machine

States:

-   `idle`
-   `running`
-   `retrying`
-   `completed`
-   `failed`
-   `aborted_by_user`

Retry transitions:

running → aborted_by_user → retrying → running → completed/failed

Input unlock only when state = `idle` or `completed` or `failed`.

------------------------------------------------------------------------

# 8. UI Contract

UI behavior:

-   While running: input locked.
-   If hanging: user sees "Agent is working..."
-   Retry button visible during running state.
-   On Retry click:
    -   Status changes to "Retrying..."
    -   Input remains locked.
-   Unlock only after terminal event.

No intermediate unlock allowed.

------------------------------------------------------------------------

# 9. Last User Prompt Persistence

Before sending to provider:

Store:

-   dialogId
-   turnId
-   attemptId
-   prompt text
-   provider mode
-   timestamp

Storage location:

`.codeai-hub/<workspaceSlug>/runtime/last-turn.json`

This guarantees deterministic resend.

------------------------------------------------------------------------

# 10. Failure Handling Matrix

  Scenario                 Action
  ------------------------ ------------------------
  Provider hang            Manual Retry available
  Provider crash           Retry
  Network drop             Retry
  Snapshot restore fails   Mark fatal error
  Retry attempt fails      Allow additional Retry

------------------------------------------------------------------------

# 11. Concurrency Guarantees

During retry:

-   Provider process must be killed
-   Provider-home must be locked
-   No parallel turn execution allowed
-   Core must reject any new Send while retrying

------------------------------------------------------------------------

# 12. Logging

Log events:

-   turn_started
-   attempt_aborted_by_user
-   provider_snapshot_created
-   provider_snapshot_restored
-   retry_attempt_started
-   retry_attempt_completed

Logs stored in:

`~/.codeai-hub/logs/core/`

------------------------------------------------------------------------

# 13. Future Extensions

1.  Automatic watchdog-based retry
2.  Attempt history in UI tree
3.  Visual indicator of retry count
4.  Retry limit configuration
5.  Telemetry on provider instability

------------------------------------------------------------------------

# 14. Summary

Manual Retry =

Cancel → Snapshot Rollback → Re-run

This approach:

-   Eliminates filesystem cleanup
-   Preserves deterministic session flow
-   Prevents JSONL corruption
-   Keeps UI state machine safe
-   Matches SolidWorks-style workflow control

This mechanism should be implemented at Core level and treated as SSOT
behavior for all one-turn agents.

------------------------------------------------------------------------

**End of Document**
