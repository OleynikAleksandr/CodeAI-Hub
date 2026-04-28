# SMB-002 — Persistent Session Model Binding Refactor

**Status:** APPROVED FOR EXECUTION
**Date:** 2026-04-28
**Planning owner:** Codex
**User contract:** confirmed in retest triage after release `1.2.101`

---

## 1. Problem

Release `1.2.101` shipped the SMB-001 session-scoped model binding work, but user retest showed the visible behavior is still wrong for real Project Manager workflow sessions:

- Step `Description` was started while Codex default model in Settings was `gpt-5.3-codex-spark`.
- Step `Virtual Simulation` was started later while Codex default model in Settings was `gpt-5.5`.
- The lower session info panel then showed `gpt-5.5` for both sessions.

That means at least one runtime/UI path still treats the current provider Settings default as if it were the model identity of an already-started logical session.

## 2. Confirmed Product Contract

Current product scope intentionally has exactly one user-facing place to choose a model: provider Settings. There is no per-step model picker in this refactor.

The required behavior is:

1. When a logical session starts, the current provider Settings default model is captured once.
2. That captured provider/model identity becomes the permanent model binding for this logical session.
3. Later Settings changes must not relabel or reroute any existing logical session.
4. Every user request sent to that logical session must use the captured provider/model binding.
5. Continuation sessions created after `Remaining context threshold (%)` is reached must inherit the original binding, not the then-current Settings default.
6. Restored/reopened Project Manager dialog sessions must hydrate the same binding from persistent state.
7. A future explicit `switch_model` action may exist internally, but it is outside this user-visible scope and must update binding only by intentional explicit command.

## 3. Root Cause Summary From Triage

The failure is not explained by one UI label alone. The observed behavior is consistent with several missing persistence and transport links:

- Core serializes `SessionRecord.modelBinding`, but the client normalizer drops it before it reaches UI state.
- `SessionModelBindingFacade` keeps bindings in memory, so restart/reopen/materialization can lose the captured identity.
- Continuity and rollover session creation do not yet guarantee inherited model binding from the source logical session.
- Project Manager dialog bootstrap can create placeholder snapshots without model binding and then fill labels from current Settings/model sync.
- Existing tests cover helper-level binding cases, but not the full Core-to-client transport, restored dialog, and threshold rollover behavior.

## 4. Target Architecture

### 4.1 Binding Data

The persisted binding must represent the effective provider model identity actually used for the session:

- `providerId`
- base model id from Settings/catalog
- effective model id used for invocation/display
- reasoning/thinking controls when they are part of effective identity
- source metadata (`settings_default_at_session_start`, `continuity_inherited`, or explicit future switch)
- creation/update timestamps

### 4.2 Ownership

- `SessionModelBindingFacade` remains the binding facade for resolving, registering, and cloning bindings.
- Session continuity storage becomes the durable source for logical-session binding recovery.
- Core bridge serialization must expose the binding to clients.
- Client state must treat `session.modelBinding` as stronger than current Settings fallback.

### 4.3 Continuity / Rollover

Any session spawned as continuation of an existing logical agent/dialog must clone the source binding before the next provider request is built.

This includes automatic rollover after `Remaining context threshold (%)`.

### 4.4 Project Manager UI

Project Manager session labels and status panels must prefer persisted binding identity. Settings may still provide labels/catalog metadata, but Settings must not decide which model an existing session belongs to.

## 5. Non-Goals

- Do not add a per-step model selector.
- Do not change Settings UX.
- Do not redesign provider model catalogs.
- Do not change provider auth or installed runtime discovery.
- Do not change release versioning manually.

## 6. Verification Requirements

Minimum regression coverage must prove:

1. Two sessions for the same provider can keep different model bindings after Settings changes.
2. Core `SessionRecord.modelBinding` survives client normalization.
3. Reopened/materialized Project Manager dialog sessions display the persisted binding.
4. Automatic continuity/rollover sessions inherit the source binding.
5. Outbound user turns use the bound model identity, not the current Settings default.

Targeted manual/build verification:

- `npm run build --workspace @codeai-hub/core`
- `npm run build:webview`
- `npm run typecheck:webview`

## 7. Execution Owner

Active execution plan: `doc/TODO/todo-plan.md`.

When this scope is complete, stable conclusions must be moved into canonical SSOT documents before archiving this planning-doc.
