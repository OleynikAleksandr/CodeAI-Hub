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

---

## 11. Recovery Release Candidate - v1.1.738

### Built outputs

- Recovery commits landed:
  - `48bef62d fix(workflow): restore diagram stage bootstrap gating`
  - `ca7a9b10 docs(workflow): align diagram stage artifact gating`
  - `1abecd46 docs(release): prep diagram bootstrap recovery release`
  - `110bd337 chore(release): build diagram bootstrap recovery release`
- `./scripts/build-all.sh` completed successfully and raised the unified version to `1.1.738`.
- `./scripts/build-release.sh --use-current-version` completed successfully and produced `codeai-hub-1.1.738.vsix`.
- Tarball artifacts are present in both `~/.codeai-hub/releases/` and `doc/tmp/releases/`.

### Release notes for the audit

- This release only closes the first confirmed PM-side bootstrap blocker: the diagram-stage toolbar start no longer depends on `upstream stage === completed` when the required upstream artifact already exists.
- The deeper audit remains open for the downstream path:
  - `session:create`
  - `session:created`
  - `session:binding`
  - `sendSessionMessage`

### Manual verification priority

1. Install `codeai-hub-1.1.738.vsix` and fully restart VS Code / Project Manager.
2. Open a workspace where `.codeai-hub/<workspaceSlug>/virtual_simulation/virtual-simulation.md` already exists.
3. Click `Diagram Modules` in the top toolbar and verify that a fresh session now starts.
4. If the start still fails, record the exact failing boundary:
   - no visible reaction at click time;
   - session is created but not bound;
   - session is bound but the initial message/prompt does not send.
5. Where possible, repeat the same check for `Diagram Facades` from an existing `module-map.md`.

### Build caveat

- During `build-release.sh`, the repository-wide `jscpd` duplication check reported `4.17%` duplicated lines over the configured `3%` threshold.
- The script treated that result as advisory, continued packaging, restored development dependencies, and finished successfully.

---

## 12. Second Audit Finding - Workflow state cold-start hydration gap

### Scope

- `workflow-state` HTTP read path
- PM toolbar start pre-check for `Diagram Modules`
- PM toolbar start pre-check for `Diagram Facades`

### Evidence

- In the affected workspaces, the canonical upstream artifact `virtual-simulation.md` already existed on disk.
- The toolbar click still produced no visible action because PM returned early on `workflowState.gating.blocked.diagram_modules === true`.
- Core computed that `blocked` value from in-memory `WorkflowState` artifacts only.
- Existing artifacts created before the current Core/watchers lifetime were not hydrated back into `WorkflowState` during `/workflow-state` reads.

### Root cause

The first bootstrap fix removed the wrong PM-side `stage === completed` requirement, but the source-of-truth feeding PM remained incomplete.

`WorkflowState` after cold start depended on watcher-memory instead of canonical disk state:
- if `virtual-simulation.md` or `module-map.md` already existed before the current watcher lifetime;
- and no fresh filesystem event replayed them into memory;
- PM still received `blocked=true` and aborted before `session:create`.

### Implemented correction

- Core `WorkflowStateService` now hydrates canonical artifacts from disk during `/workflow-state` reads before validation and gating are computed.
- The hydration keeps artifact paths aligned with watcher-state conventions (`stage/file-name`) so existing validators continue to resolve files correctly.
- Added behavioral regression coverage for:
  - cold-start workspace with existing valid `virtual-simulation.md` / `module-map.md`;
  - cold-start workspace with invalid `virtual-simulation.md`, which must stay blocked.

### Verdict

- Legacy claim "artifact exists, therefore toolbar start was already verified" = `disproved`
- Second real root cause for the broken toolbar bootstrap = `confirmed`

### Rewrite instruction for the main TODO

- Any remaining recovery stream around diagram bootstrap must explicitly include cold-start `workflow-state` hydration, not only PM click handlers or session binding logic.
- Manual verification for `Diagram Modules` / `Diagram Facades` must be re-run after this fix in workspaces where the upstream artifacts already existed before PM launch.

---

## 13. Third Audit Finding - Upstream invalid/outdated state over-blocked manual step start

### Scope

- Core workflow gating for `diagram_modules`
- Core workflow gating for `diagram_facades`
- Product contract for manual toolbar transitions

### Evidence

- After the cold-start hydration fix, `workflow-state` for `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub claude` still returned `gating.blocked.diagram_modules === true` even though `virtual-simulation.md` existed on disk.
- The remaining blocker was not artifact absence anymore; it was `virtual_simulation.status === invalid`.
- This contradicted the agreed product rule for toolbar transitions: like `Description -> Virtual Simulation`, the next step should unlock from the presence of the previous canonical artifact, while the user decides whether that artifact is good enough.

### Root cause

`resolveWorkflowBlockedStages()` treated `invalid` / `outdated` upstream statuses as hard blockers for downstream manual start instead of diagnostic state only.

That made the Diagram workflow stricter than the `Description -> Virtual Simulation` transition and stricter than the intended user-driven progression model.

### Implemented correction

- Downstream gating for `diagram_modules` now checks only the presence of `virtual-simulation.md`.
- Downstream gating for `diagram_facades` now checks only the presence of `module-map.md`.
- Upstream `invalid` / `outdated` statuses remain visible in the stage snapshot, but they no longer prevent manual launch of the next stage.
- Regression coverage now asserts that an invalid `virtual-simulation.md` still leaves `diagram_modules` launchable when the artifact exists.

### Verdict

- Legacy assumption "invalid upstream stage must block next manual diagram step" = `disproved`
- Third real root cause for "toolbar click does nothing" = `confirmed`

### Rewrite instruction for the main TODO

- Remaining recovery work must treat stage validation state and stage-start gating as separate concerns.
- Manual verification must now be repeated specifically in:
  - workspaces where upstream artifact already existed before PM launch;
  - workspaces where upstream artifact exists but stage status is `invalid` or `outdated`.
