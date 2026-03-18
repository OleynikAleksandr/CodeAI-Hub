# Diagram Workflow Audit TODO Plan

**Status:** DRAFT - active audit intake
**Date:** 2026-03-18
**Scope:** Recovery and re-validation of the interactive diagram workflow (`diagram_modules`, `diagram_facades`)

**Related documents:**
- `doc/TODO/todo-plan.md`
- `doc/TODO/Archive/todo-plan-phase5-interactive-diagram-workflow-stabilization-2026-03-16.md`
- `doc/Sessions/Session086.md`
- `doc/Sessions/Session090.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`

---

## 1. Problem Statement

The previous execution plan closed a large set of diagram-workflow streams as `DONE`, but the user-visible workflow is not reliable in practice.

The most important contradiction at intake is explicit:
- the recovered legacy `doc/TODO/todo-plan.md` says the toolbar start path for `Diagram Modules` / `Diagram Facades` was fixed and verified;
- later session reports still record that fresh toolbar bootstrap for these stages does not start reliably in some workspaces.

Because of this mismatch, the legacy execution plan cannot be treated as current truth. It must be audited stream by stream.

---

## 2. Why This Document Exists

- `doc/BugRegistry.md` is not the right primary tool for this scope.
- This is not a single isolated defect; it is a cross-cutting recovery and truth-audit effort.
- We need one place to track:
  - which earlier `DONE` claims are actually confirmed by code and runtime behavior;
  - which claims are disproved or only partially true;
  - which parts of the main execution plan must be rewritten.

This document is the audit and recovery planning surface for that work.

---

## 3. Working Rules

1. `doc/TODO/todo-plan.md` is temporarily preserved as the recovered legacy baseline, not as trusted execution truth.
2. No stream is accepted as implemented only because the legacy plan marks it `DONE`.
3. Every audit stream must produce four outputs:
   - code evidence;
   - runtime or manual verification result;
   - verdict: `confirmed`, `partially confirmed`, or `disproved`;
   - rewrite instruction for `doc/TODO/todo-plan.md`.
4. The main `doc/TODO/todo-plan.md` is rewritten only from evidence recorded in this audit plan.
5. If a legacy stream is disproved, its corresponding `DONE` items in the main plan must be removed, reopened, or replaced with a narrower truth-based stream.
6. Recovery fixes are allowed only after the failing path is reproduced and localized.
7. Regression coverage for this scope must prefer behavioral tests over source-shape checks such as `source.includes(...)`.

---

## 4. Known Intake Contradictions

### C1. Toolbar bootstrap truth mismatch

- The recovered legacy plan claims that the toolbar start path for steps 3 and 4 was fixed and verified.
- `Session086.md` states that fresh bootstrap for `Diagram Modules` / `Diagram Facades` still did not start after the corrective release.
- `Session090.md` still carries the same issue as a deferred follow-up blocker.

### C2. Test confidence mismatch

- Existing tests around the start flow are too shallow to prove end-to-end behavior.
- Some tests only verify that specific strings exist in source files or that a callback happens before another await point.
- That level of coverage is not sufficient to declare the full start path working.

### C3. Scope closure mismatch

- Later diagram workflow phases built visual shell, semantic editing, and hardening on top of a workflow that may still fail at the fresh bootstrap entry point.
- This means some later streams may be valid only for already-existing artifacts or already-opened sessions, not for the promised end-to-end workflow.

---

## 5. Audit Goal

Produce an evidence-based rewrite of the diagram workflow execution plan by answering these questions:

1. Which parts of the old plan are truly implemented in code?
2. Which parts only work in limited conditions?
3. Which `DONE` streams are false and must be reopened?
4. What is the real root cause of the fresh toolbar bootstrap failure?
5. What is the smallest safe repair plan that restores truthful end-to-end behavior?

---

## 6. Initial Audit Streams

### Stream A - Audit the claimed `DONE` statuses around diagram stage start

Objective:
- compare the legacy plan, session reports, and current code to identify false or overstated closure claims.

Expected outputs:
- list of disproved or suspicious `DONE` items;
- dependency map of downstream streams that relied on those claims.

### Stream B - Reproduce fresh `Diagram Modules` bootstrap

Objective:
- verify the full path from toolbar click to first provider-bound message for `diagram_modules`.

Focus path:
- PM tool selection;
- workflow start service;
- session creation event;
- session binding event;
- prompt-pack send.

Expected outputs:
- exact failing step;
- reproduction conditions;
- logs or observable event mismatch.

### Stream C - Reproduce fresh `Diagram Facades` bootstrap

Objective:
- verify the same full path for `diagram_facades`, including upstream dependency on `module-map.md`.

Expected outputs:
- exact failing step;
- reproduction conditions;
- logs or observable event mismatch.

### Stream D - Audit PM/Core event correlation and matching rules

Objective:
- inspect payload correlation across PM and Core for:
  - `workspacePath`;
  - `initiativeSlug`;
  - `stage`;
  - session binding timing.

Expected outputs:
- confirmed or disproved hypotheses about event filtering, race windows, or incorrect assumptions in the PM start path.

### Stream E - Recovery fixes and regression coverage

Objective:
- implement only the fixes justified by Streams B-D and add regression coverage that proves the repaired path behaviorally.

Expected outputs:
- targeted fixes;
- behavioral tests for the repaired start path;
- updated architectural notes when the boundary changes.

### Stream F - Rewrite the main execution plan

Objective:
- replace the legacy fiction in `doc/TODO/todo-plan.md` with a truth-based recovery execution plan.

Expected outputs:
- reopened or removed false `DONE` items;
- newly scoped repair streams;
- clean separation between confirmed features and still-broken paths.

---

## 7. Main TODO Sync Policy

- The main `doc/TODO/todo-plan.md` stays available as the recovered historical baseline while the audit is in progress.
- This audit document is the active planning surface for the recovery investigation.
- After each audited stream, the corresponding section in the main `doc/TODO/todo-plan.md` must be updated to reflect reality.
- The main plan must not continue to accumulate false `DONE` markers.
- Once the audit stabilizes, the main plan should be rewritten into a normal execution plan again.

---

## 8. Initial Evidence Map

### Legacy plan sections that are immediately suspicious

- Phase 2 / post-release contract alignment:
  - claims that steps 3-4 toolbar start again creates agent sessions;
  - claims manual verification of toolbar start.
- Phase 2 / corrective release:
  - claims release verification around Diagram Modules / Diagram Facades startup.
- Any later stream that assumes the fresh bootstrap path was already trustworthy.

### Current code areas that need first-pass audit

- `src/client/project-manager/components/layout/use-workflow-tool-select.ts`
- `src/client/project-manager/services/workflow-step-start-service.ts`
- `src/client/project-manager/services/idea-collector-submit-service.ts`
- `src/client/project-manager/services/session-binding-waiter.ts`
- `packages/core/src/remote-bridge/handlers/session-request-handler.ts`

---

## 9. Intake Queue

Items to be added live as the user defines the next checks:

- `[DONE]` First audit target: toolbar start for `Diagram Modules` from the top sidebar after `virtual-simulation.md` already exists.
- `[DONE]` First reproduction workspace/setup: workspace with an existing `.codeai-hub/<workspace>/virtual_simulation/virtual-simulation.md`, then fresh click on `Diagram Modules`.
- `[DONE]` First stream rewrite in `doc/TODO/todo-plan.md`: Phase 2 / post-release contract alignment and contract-alignment verification streams.

---

## 10. First Audit Finding - Diagram Modules bootstrap gate mismatch

### Scope

- `Description -> Virtual Simulation`
- `Virtual Simulation -> Diagram Modules`
- `Diagram Modules -> Diagram Facades`

### Evidence

- `Description -> Virtual Simulation` starts from the existence of `Final_Description.md`.
- `Diagram Modules` and `Diagram Facades` were implemented with an extra PM-side requirement in `WorkflowStepStartService`: upstream stage status had to equal `completed`.
- Current workflow-state readiness does not provide a reliable product contract around that stricter requirement for these diagram stages.
- The result was a mismatch:
  - workflow gating already allowed the next stage when the upstream artifact existed;
  - the final PM start service still rejected the launch because `virtual_simulation` / `diagram_modules` status was not exactly `completed`.

### Root cause

The PM start service for diagram stages drifted away from the working `Description -> Virtual Simulation` rule.

Instead of using the same product-facing readiness rule:
- "required upstream artifact exists"

it used a stricter internal rule:
- "upstream artifact exists and upstream workflow status is exactly `completed`"

That stricter rule blocked fresh toolbar bootstrap even though the user-facing workflow contract should have allowed the start.

### Implemented correction

- `WorkflowStepStartService` was updated so `startDiagramModules()` and `startDiagramFacades()` rely on the same artifact-readiness principle as the working upstream transition.
- A behavioral regression test now proves:
  - `Diagram Modules` starts when `virtual-simulation.md` is available even if the stage status is not `completed`;
  - `Diagram Facades` starts when `module-map.md` is available even if the stage status is not `completed`;
  - blocked gating still rejects the start.

### Verdict

- Legacy claim "diagram toolbar start was fixed and verified" = `disproved`
- Root cause for the first broken start path = `confirmed`

### Rewrite instruction for the main TODO

- Reopen any old stream that claimed the toolbar bootstrap was already repaired or manually verified.
- Preserve the historical git hashes, but do not keep those streams marked as truthful `DONE`.
