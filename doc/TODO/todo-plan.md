# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "managed-workflow-prompt-ownership-repair",
  "branch": "main",
  "baseHead": "30c150bf3",
  "lastRecordedCommit": "a4f794d44",
  "planningSource": "user-observed Application Skeleton Codex retest on 2026-05-09",
  "currentTaskId": "prompt-ownership.phase3.task2",
  "expectedCommitMessage": "docs: align managed lifecycle planning notes",
  "debt": {
    "expectedCommitMessage": "docs: align managed lifecycle planning notes",
    "preCommitHead": "a4f794d44",
    "stage": "commit_pending",
    "taskId": "prompt-ownership.phase3.task2"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** user-observed Application Skeleton Codex retest on 2026-05-09
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/System/ManagedDocumentationCommitOwnership.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `packages/agents/diagram-modules-agent/assets/diagram-modules-prompt.md`
  - `packages/agents/application-skeleton-agent/assets/application-skeleton-prompt.md`
  - `packages/agents/quality-gates-agent/assets/quality-gates-prompt.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)

- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждая подзадача затрагивает не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: реализация/изменения и отдельный `Git Commit: ...`.
- Managed documentation agents must only report content readiness; Core owns validation, staging, managed commits, plan advancement, continuation, and downstream unlock.
- Do not use `--no-verify`.

## Phase 0 — Scope Intake (owner: Codex, updated: 2026-05-09)

### Stream: Plan Activation

1. [DONE] `prompt-ownership.phase0.task1` Open the active repair plan for managed prompt ownership leak fixes (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: open managed prompt ownership repair plan`).
2. [DONE] Git Commit: `docs: open managed prompt ownership repair plan` (hash: c44a1a7c5)

## Phase 1 — Managed Prompt Ownership (owner: Codex, updated: 2026-05-09)

### Stream: Prompt Assets

3. [DONE] `prompt-ownership.phase1.task1` Remove provider-side staging/commit language from Application Skeleton prompt and lock the bundled-template regression (scope: `packages/agents/application-skeleton-agent/assets/application-skeleton-prompt.md, packages/core/src/templates/application-skeleton-bundled-templates.test.ts, packages/core/src/templates/bundled-templates.ts`; expected commit: `fix: remove application skeleton agent commit wording`).
4. [DONE] Git Commit: `fix: remove application skeleton agent commit wording` (hash: 230e702d6)
5. [DONE] `prompt-ownership.phase1.task2` Remove provider-side staging language from Quality Gates prompt and lock the bundled-template regression (scope: `packages/agents/quality-gates-agent/assets/quality-gates-prompt.md, packages/core/src/templates/quality-gates-bundled-templates.test.ts, packages/core/src/templates/bundled-templates.ts`; expected commit: `fix: remove quality gates agent staging wording`).
6. [DONE] Git Commit: `fix: remove quality gates agent staging wording` (hash: 75b59ad72)

## Phase 2 — Initial Managed Context (owner: Codex, updated: 2026-05-09)

### Stream: Prompt Context Bundle

7. [DONE] `prompt-ownership.phase2.task1` Ensure cold-start managed workflow prompts receive the same Core-owned managed context bundle contract as continuation prompts, or stop claiming embedded plan state exists (scope: `src/client/project-manager/services/prompt-pack-builder.ts, src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-context-bundle.ts`; expected commit: `fix: align managed prompt context bundle wording`).
8. [DONE] Git Commit: `fix: align managed prompt context bundle wording` (hash: 58822ca52)
9. [DONE] `prompt-ownership.phase2.task2` Embed managed context bundle text into initial managed workflow prompt packs before provider turns start (scope: `src/client/project-manager/services/description-submit-service.ts, src/client/project-manager/services/managed-workflow-initial-context.ts, src/client/project-manager/services/managed-workflow-initial-context.test.ts`; expected commit: `fix: embed managed context in initial prompts`).
10. [DONE] Git Commit: `fix: embed managed context in initial prompts` (hash: c50ec3e24)
11. [DONE] `prompt-ownership.phase2.task3` Verify rollover/continuation prompts follow the same managed prompt ownership contract and document whole-prompt audit requirements (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.documentation-rollover.test.ts, doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`; expected commit: `test: verify rollover prompt ownership`).
12. [DONE] Git Commit: `test: verify rollover prompt ownership` (hash: a4f794d44)

## Phase 3 — SSOT Sync (owner: Codex, updated: 2026-05-09)

### Stream: Documentation

13. [DONE] `prompt-ownership.phase3.task1` Update SSOT docs to state that all managed-stage prompts use content-readiness wording and never ask providers to stage or commit (scope: `doc/SolidWorks-WorkFlow/System/ManagedDocumentationCommitOwnership.md, doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: sync managed prompt ownership ssot`).
14. [DONE] Git Commit: `docs: sync managed prompt ownership ssot` (hash: 58ac41903)
15. [DONE] `prompt-ownership.phase3.task2` Align the active managed-workspace planning notes with Core-owned managed commits after the whole-prompt audit (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Workspace_Lifecycle_From_Diagram_Modules.md`; expected commit: `docs: align managed lifecycle planning notes`).
16. [PENDING] Git Commit: `docs: align managed lifecycle planning notes` (hash: TBD)

## Phase 4 — Tooling Verification (owner: Codex, updated: 2026-05-09)

### Stream: Targeted Checks

17. [DONE] `prompt-ownership.phase4.task1` Run targeted bundled-template/prompt tests and relevant typecheck/build checks for the touched surfaces (scope: `packages/core/src/templates`, `src/client/project-manager/services`; expected commit: `test: verify managed prompt ownership repair`).
18. [DONE] Git Commit: `test: verify managed prompt ownership repair` (hash: 82fb6aec6)

## Phase 5 — User Workflow Acceptance Testing (owner: User, updated: 2026-05-09)

### Stream: User Retest

19. [TODO] `prompt-ownership.phase5.task1` User retests Application Skeleton / Quality Gates provider turns and confirms providers stop after content readiness while Core owns commits (scope: user workflow retest; expected commit: `test: record managed prompt ownership acceptance`).
20. [TODO] Git Commit: `test: record managed prompt ownership acceptance` (hash: TBD)

## Phase 6 — Scope Closeout (owner: Codex, updated: 2026-05-09)

### Stream: Closeout

21. [TODO] `prompt-ownership.phase6.task1` After explicit user acceptance, archive this plan and leave terminal NONE state (scope: `doc/TODO/todo-plan.md`, `doc/TODO/Archive/*`; expected commit: `docs: close managed prompt ownership repair`).
22. [TODO] Git Commit: `docs: close managed prompt ownership repair` (hash: TBD)
