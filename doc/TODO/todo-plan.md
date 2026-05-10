# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "application-skeleton-phase-b-orchestration-intake",
  "branch": "main",
  "baseHead": "694efceeb",
  "lastRecordedCommit": "90664cce9",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Phase_B_Orchestration.md",
  "currentTaskId": "phase-b-orchestration.intake.review.revision1.task1",
  "expectedCommitMessage": "docs: revise application skeleton phase b orchestration intake — phase 1a/1b/2 split",
  "debt": {
    "expectedCommitMessage": "docs: revise application skeleton phase b orchestration intake — phase 1a/1b/2 split",
    "preCommitHead": "90664cce9",
    "stage": "commit_pending",
    "taskId": "phase-b-orchestration.intake.review.revision1.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source (drafted in this cycle):** `doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Phase_B_Orchestration.md`
- **Read this context before drafting and reviewing:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Phase_Types_And_Corrective_Operations_Design.md`
  - `doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Diagram_Modules_Core_Orchestrated_Subturns.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Runtime_Contract_Conformance.md`
  - `doc/TODO/Archive/todo-plan-closeout-managed-workflow-runtime-contract-conformance-implementation.md`
- Only this Context Pack is the recovery source for the current planning intake cycle.

## Execution Rules

- This is a planning intake scope. Only the planning document and this todo-plan are touched in this scope.
- Implementation work and runtime/code changes are deferred to a separate scope opened against the accepted planning document.
- The planning document stays in `doc/SolidWorks-WorkFlow/Plans/` after this scope closes; it is not archived because the next implementation scope will reference it as `planningSource`.
- Do not use `--no-verify`.

## Phase 1 — Planning Intake (owner: next agent, updated: 2026-05-10)

### Stream: Application Skeleton Phase B Orchestration Planning Doc

1. [DONE] `phase-b-orchestration.intake.task1` Draft new planning document covering: Phase A vs Phase B orchestration model with reference back to the deferred design layer; per-turn autocommit policy for Phase B; end-of-turn-only correction policy in Phase B; UI Accept-Contract button as the explicit Phase 1 → Phase 2 trigger with a new Core HTTP endpoint; premature-materialization block until the UI trigger fires; pilot scope on Application Skeleton with an explicit note about Quality Gates symmetry as a separate follow-up cycle. Cross-link the Diagram Modules Phase A reference (continuation dispatcher pattern) and the Phase 11 PM bundle source-of-truth closeout. (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Phase_B_Orchestration.md`; expected commit: `docs: open application skeleton phase b orchestration intake`).
2. [DONE] Git Commit: `docs: open application skeleton phase b orchestration intake` (hash: 087bcdde1)

## Phase 2 — Tooling Verification (owner: next agent, updated: 2026-05-10)

### Stream: Plan Validation

3. [DONE] `phase-b-orchestration.intake.verify.task1` Run `npm run plan:validate` and confirm the intake commit's pre-commit and pre-push hooks passed (architecture, lint, knip, jscpd, links). Record evidence inline in this plan. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record phase b orchestration intake verification`).
4. [DONE] Git Commit: `docs: record phase b orchestration intake verification` (hash: 90664cce9)

**Intake verification evidence (2026-05-10).**

- `npm run plan:validate` → `Plan validation: OK`.
- Pre-commit hook on `087bcdde1` passed: architecture check (no >500-line blockers, 77 files in 400-500 warning zone, 29 facades), `ultracite check` (986 files, no fixes), `knip` (only redundant-entry hints, no errors), `jscpd` (2.71% duplication, within 3% threshold), UI style SSOT guardrails passed.
- Plan post-commit hook auto-advanced `currentTaskId` to `phase-b-orchestration.intake.verify.task1`.

## Phase 3 — User Acceptance And Handoff (owner: user, updated: 2026-05-10)

### Stream: Planning Doc Review

5. [DONE] `phase-b-orchestration.intake.review.task1` User reviews the planning document and either explicitly accepts it or asks for revisions. Each user-requested revision is added as an additional micro-task pair (revision + `Git Commit`) under this stream until the user explicitly accepts. On acceptance, this scope closes via `plan:complete` so a new implementation todo-plan can open against the accepted planning document without archiving it. (scope: chat/process observation only; no commit required). Result: User rejected hybrid Phase B framing for whole Phase 1; requested explicit A→B→A split (Phase 1A Type A draft / Phase 1B Type B review / Phase 2 Type A materialization) with detailed rewrites of T1-T5, broader premature-materialization block, clarified Accept Contract command surface, owned-diff acceptance commit policy, scoped autocommit, and continuation dispatcher role verification. Revision tasks queued under same stream.

**Revision request 1 (2026-05-10):** user rejected the "hybrid Phase B for all of Phase 1" framing and requested an explicit `Phase 1A (Type A) → Phase 1B (Type B) → Phase 2 (Type A)` split with detailed rewrites of T1-T4 (now T1-T5), broader premature-materialization block, clarified Accept Contract command surface, owned-diff acceptance commit policy, scoped no-op autocommit policy, and verification of the existing `application-skeleton-continuation-dispatcher.ts` real responsibility.

6. [DONE] `phase-b-orchestration.intake.review.revision1.task1` Rewrite planning document per user revision request 1: replace whole-Phase-1 hybrid framing with explicit Phase 1A / Phase 1B / Phase 2 split; rewrite T1 with `observe-vs-dispatch` rule and 1A/1B differentiation; rewrite T2 with artifact-changing-only autocommit and no-op audit policy; rewrite T3 with PM-button-as-command-surface, endpoint-as-transport, Core-handler-as-decision and disabled-state preconditions; rewrite T4 as Core-led materialization; replace narrow `product-parts/**` block with skeleton-map-ownership-derived T5 premature-materialization block; clarify acceptance-commit owned-diff requirement or fold into Phase 2 transition; verify existing `application-skeleton-continuation-dispatcher.ts` role and document accurately; tighten text-pattern fallback to same Core command handler with Phase 1B-only gating; explicit out-of-scope list (generalized phase runtime, Quality Gates, Diagram Modules review symmetry, full Type B candidate microtask runtime). (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Phase_B_Orchestration.md`; expected commit: `docs: revise application skeleton phase b orchestration intake — phase 1a/1b/2 split`).
7. [PENDING] Git Commit: `docs: revise application skeleton phase b orchestration intake — phase 1a/1b/2 split` (hash: TBD)

8. [TODO] `phase-b-orchestration.intake.review.task2` User reviews the rewritten planning document; explicit acceptance or further revision request. Additional revisions queue as further `revisionN.task1 + Git Commit` pairs under this stream. (scope: chat/process observation only; no commit required).
