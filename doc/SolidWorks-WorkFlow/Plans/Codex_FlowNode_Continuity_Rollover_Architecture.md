# Codex Flow Node Continuity Rollover — Architecture

**Status:** active planning-doc rev1
**Created:** 2026-05-03
**Owner:** Codex continuity / Project Manager runtime
**Target release:** next patch release after `1.2.131` (expected `1.2.132` unless version changes)

---

## 1. Problem

After the `1.2.131` retest, Codex provider startup is fixed, but continuing an existing workflow dialog can hang in the UI state:

```text
Agent is resuming your session... Please wait.
```

The expected continuity flow did not start: the agent did not first create a session report, the core did not detect that report, and no new continuation session was created with the resume instruction.

This matters because the current product design allows the user to switch model and reasoning after a turn, then continue the same dialog with the new model settings. Separately, the user configures a percentage threshold of the context window. When token usage reaches that threshold, the core must end the current provider session by sending an internal report instruction, wait for the report, create a new provider session, and send a resume instruction that tells the new session to read the report.

The bug is therefore not only a UI lock problem. It is a continuity rollover problem across restored Codex workflow dialogs.

---

## 2. Evidence From Analysis

### 2.1 Restored workflow session has incomplete context

Observed runtime logging for the affected restored dialog showed:

```text
stage: "virtual_simulation"
initiativeSlug: null
```

The flow-node rollover arbitration requires both `initiativeSlug` and `stage`. If either value is missing, the session is treated as not eligible for rollover and returns `no_rollover`.

The materialized continuity dialog path registers restored sessions with `stage`, but without the workspace slug as `initiativeSlug`. Later `handleDialogSend` can reuse that materialized runtime session by `providerSessionId`, so the outbound user turn keeps incomplete flow-node context instead of creating a new fully hydrated session.

### 2.2 Eligibility is description-only

`FlowNodeContinuityFacade` currently uses an MVP filter that allows only:

```text
stage: "description"
runSlug: null
```

That excludes `virtual_simulation`, even though it is a top-level workflow stage and should participate in the same continuity rollover mechanism as Description. It also likely excludes the next trunk stage, Diagram Modules.

### 2.3 Codex token usage arrives delayed, not on turn_completed

Codex app-server can emit `turn_completed` before usage metadata arrives. Token usage then arrives separately as a stream event similar to:

```json
{ "tokenUsage": { "used": 27452, "limit": 121600 } }
```

Delayed usage is supported by existing design, but restored Codex workflow sessions need production coverage that proves the arbitration waits for/uses the delayed usage event and then triggers rollover when the configured threshold is crossed.

### 2.4 Per-turn model/reasoning switch is not the direct blocker

The new model/reasoning application path itself is not the immediate reason for the observed no-report behavior:

- Session dispatch reads the active `session.modelBinding`.
- Codex provider invocation passes `model` and `effort`.
- Rollover target creation is designed to inherit the current model binding.

However, there is a continuity persistence risk. `ContinuityTracker.ensureTrackedOnOutboundMessage` can no-op once the initial segment is already persisted. If the user changes model/reasoning after that first segment, the latest model binding may not be written into the continuity chain before restart/restore/rollover.

### 2.5 Stale binding retry can hide the missing rollover path

The observed stuck turn also went through stale provider-session binding recovery. The current one-shot rebind can dispatch to a new provider session, but if the reused runtime session lacks hydrated workflow context, the report/resume path still cannot activate.

---

## 3. Target Behavior

1. Restored and reopened workflow dialogs must preserve:
   - `workspaceSlug` / `initiativeSlug`
   - `stage`
   - `runSlug`
   - provider binding
   - latest session model/reasoning binding

2. Top-level workflow trunk stages must be eligible for flow-node continuity rollover when `runSlug` is absent:
   - `description`
   - `virtual_simulation`
   - `diagram_modules`

3. Branch/run-scoped agents remain out of this hotfix scope until their artifact-specific continuity contract is designed.

4. On `turn_completed` plus known token usage at or above the configured threshold, the core must:
   - lock the current session into report generation
   - send the internal report instruction
   - detect the report result
   - create the next provider session
   - inherit the active model/reasoning binding
   - send the resume instruction that tells the new session to read the report
   - unlock the UI into a usable next-turn state

5. If rollover is not needed, the UI must return to idle after the normal turn lifecycle and must not stay blocked on `Agent is resuming your session...`.

---

## 4. Design Decisions

### 4.1 Hydrate restored dialog context

The dialog materialization path should pass the workspace slug into continuity session registration as `initiativeSlug`. If an already materialized runtime session is reused by `handleDialogSend`, the send path should repair missing `initiativeSlug/stage/runSlug` before dispatch.

This fix keeps restored sessions compatible with existing session resolution instead of forcing a new provider session for every restored dialog.

### 4.2 Expand flow-node eligibility with an explicit allowlist

Replace the current description-only MVP filter with a named trunk-stage allowlist:

```text
description
virtual_simulation
diagram_modules
```

The allowlist must still require `runSlug === null` or absent. This prevents the hotfix from accidentally enabling branch-specific Development Tree agent sessions before their continuity semantics are designed.

### 4.3 Persist latest modelBinding after a switch

Continuity tracking should update the latest persisted segment's model binding when an outbound message uses a newer session model/reasoning selection. The update should be narrow and idempotent:

- do not create duplicate initial segments
- do not rewrite unrelated transcript data
- do not change provider binding semantics
- do preserve the active model and reasoning for restored and rollover target sessions

### 4.4 Cover delayed Codex usage in rollover tests

Add tests that simulate the Codex event order:

1. user turn starts
2. provider emits `turn_completed`
3. token usage arrives as a later stream event
4. configured threshold is crossed
5. core starts report generation
6. new session receives inherited model/reasoning and resume instruction

The same coverage must prove that a below-threshold or ineligible session unlocks cleanly.

### 4.5 Keep stale binding retry as recovery, not continuity policy

The stale binding retry should remain a one-shot provider-session recovery mechanism. It must preserve hydrated workflow context and expose clear logs, but it should not decide whether rollover is required. Rollover remains owned by flow-node continuity arbitration.

---

## 5. Implementation Streams

### Stream 11Q — Continuity Context Hydration Fix

Fix restored dialog materialization and dialog send reuse so workflow sessions keep `initiativeSlug`, `stage`, and `runSlug` before provider dispatch.

Expected output:

- materializer receives workspace slug
- restored sessions register `initiativeSlug`
- reused contextless sessions are repaired before send
- focused tests cover restored `virtual_simulation` context

### Stream 11R — Workflow Stage Rollover Eligibility

Enable flow-node rollover for trunk workflow stages while keeping branch/run sessions excluded.

Expected output:

- explicit trunk-stage allowlist
- virtual simulation rollover test
- delayed Codex token usage rollover test
- SSOT docs updated

### Stream 11S — Model/Reasoning Binding Persistence Across Continuity

Persist the latest per-session model/reasoning binding into the continuity chain after a user switches model/reasoning between turns.

Expected output:

- continuity tracker updates latest model binding idempotently
- restored send uses latest selected binding
- rollover target inherits latest selected binding
- Effective Model Identity and Codex invocation docs updated

### Stream 11T — Stale Binding Resume Guard + UI Unlock Regression

Ensure stale binding recovery does not lose workflow context and the UI never remains blocked indefinitely after no-rollover, resume failure, timeout, or abort decisions.

Expected output:

- stale binding retry preserves hydrated context
- lock/unlock behavior has regression coverage
- targeted package builds and tests pass

### Stream 11U — Release Build

Build the next release after all implementation streams pass.

Expected output:

- release docs prepared for the next version
- `./scripts/build-all.sh` passes on a clean tree
- `./scripts/build-release.sh --use-current-version` passes
- VSIX and provider tarballs are available for user retest

### Stream 11V — User Visual Acceptance Testing

User installs the new release and retests:

- provider startup
- restored Codex dialog send
- threshold-triggered report creation
- new continuation session creation
- resume prompt delivery
- model/reasoning inheritance
- no indefinite `Agent is resuming...` state

---

## 6. Out Of Scope

- Development Tree branch/run agent rollover semantics.
- Gemini provider continuity enabling.
- Vanilla capture pipeline changes.
- New UI for threshold configuration.
- Changing the Codex report template format beyond the existing continuity prompt contract.
- Changing the Codex app-server startup profile fixed in `1.2.131`.

---

## 7. Risks And Checks

1. Existing in-memory sessions may already be materialized without `initiativeSlug`, so the fix needs both future materialization and repair-on-send coverage.
2. Threshold settings are provider-level. A visible token percentage below the threshold should not trigger rollover; the UI must still unlock normally.
3. If Virtual Simulation and Diagram Modules require artifact-specific report paths later, this hotfix should still use the generic flow-node report path for trunk-stage continuity.
4. Model/reasoning persistence must not duplicate continuity segments or rewrite completed reports.
5. Stale binding recovery must stay one-shot to avoid masking real provider failures.

---

## 8. Acceptance Checklist

1. Install the new VSIX after release build.
2. Restart runtime.
3. Open an existing `Virtual Simulation Codex` dialog.
4. Continue a normal turn and verify the provider accepts it.
5. Configure/observe a threshold case and verify the core sends a report instruction before creating a new session.
6. Verify the report artifact is detected.
7. Verify the new provider session receives a resume instruction that references the report.
8. Switch Codex model/reasoning after a turn, continue, then restart/reopen and verify the next turn uses the latest selected model/reasoning.
9. Verify no path leaves the input blocked on `Agent is resuming your session...`.
