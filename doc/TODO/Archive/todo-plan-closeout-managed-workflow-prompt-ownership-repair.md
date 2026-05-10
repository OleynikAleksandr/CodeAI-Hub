# Plan Closeout: managed-workflow-prompt-ownership-repair

**Created:** 2026-05-10
**Acceptance:** User retest on 2026-05-10 against v1.2.216 in workspace `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4`. Prompt-level ownership conforms to SSOT (provider asset prompts and runtime continuation/initial prompts no longer ask the provider to stage or commit; managed context bundle is embedded in initial prompts). Retest also revealed a runtime-level conformance gap relative to `WorkflowSteps_Overview.md` lines 76–86, 82, 256: Core acceptance validator does not re-run after corrective turn, the corrective turn text itself still contains provider-side commit asks, no `handoff to user phase` decision intercepts free-text user acceptance, and the Phase 2 materialization commit handler does not advance after content-readiness signal. That gap is **out of scope** for this prompt-ownership cycle and is routed to a follow-up runtime conformance scope.
**Execution Scope Status:** ACTIVE
**Branch:** main
**Current Task:** prompt-ownership.phase6.task1
**Expected Commit:** docs: close managed prompt ownership repair
**Last Recorded Commit:** 78d7e4f5c
**Planning Source Disposition:** user_observation_retained_inline
**Planning Source Path:** n/a (user observation, no archived planning document)

## Active Plan Copy

````markdown
# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "managed-workflow-prompt-ownership-repair",
  "branch": "main",
  "baseHead": "30c150bf3",
  "lastRecordedCommit": "78d7e4f5c",
  "planningSource": "user-observed Application Skeleton Codex retest on 2026-05-09",
  "currentTaskId": "prompt-ownership.phase6.task1",
  "expectedCommitMessage": "docs: close managed prompt ownership repair",
  "debt": null
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
16. [DONE] Git Commit: `docs: align managed lifecycle planning notes` (hash: 78aae1cdc)

## Phase 4 — Tooling Verification (owner: Codex, updated: 2026-05-09)

### Stream: Targeted Checks

17. [DONE] `prompt-ownership.phase4.task1` Run targeted bundled-template/prompt tests and relevant typecheck/build checks for the touched surfaces (scope: `packages/core/src/templates`, `src/client/project-manager/services`; expected commit: `test: verify managed prompt ownership repair`).
18. [DONE] Git Commit: `test: verify managed prompt ownership repair` (hash: 82fb6aec6)
19. [DONE] `prompt-ownership.phase4.task2` Prepare release documentation for v1.2.216 before version bump and package assembly (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.216 managed prompt ownership release`).
20. [DONE] Git Commit: `docs: prepare 1.2.216 managed prompt ownership release` (hash: 1a97972e8)
21. [DONE] `prompt-ownership.phase4.task3` Build v1.2.216 release artifacts with the standard release scripts after the release-doc commit (scope: `assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/claude/manifest.json, assets/providers/codex/manifest.json, assets/providers/gemini/manifest.json, assets/ui/manifest.json, package.json, package-lock.json, packages/Claude_Module/package.json, packages/Codex_AppServer_Module/package.json, packages/Gemini_Module/package.json, packages/core/package.json, packages/initiatives/package.json, packages/localization/package.json, packages/translation/package.json, packages/unified-session/package.json, doc/TODO/todo-plan.md`; expected commit: `chore: build 1.2.216 release artifacts`).
22. [DONE] Git Commit: `chore: build 1.2.216 release artifacts` (hash: 37fd0b3bb)

## Phase 5 — User Workflow Acceptance Testing (owner: User, updated: 2026-05-09)

### Stream: User Retest

23. [DONE] `prompt-ownership.phase5.task1` User retests Application Skeleton / Quality Gates provider turns and confirms providers stop after content readiness while Core owns commits (scope: user workflow retest; expected commit: `test: record managed prompt ownership acceptance`).
24. [DONE] Git Commit: `test: record managed prompt ownership acceptance` (hash: 78d7e4f5c)

## Phase 6 — Scope Closeout (owner: Codex, updated: 2026-05-09)

### Stream: Closeout

25. [IN_PROGRESS] `prompt-ownership.phase6.task1` After explicit user acceptance, archive this plan and leave terminal NONE state (scope: `doc/TODO/todo-plan.md`, `doc/TODO/Archive/*`; expected commit: `docs: close managed prompt ownership repair`).
26. [TODO] Git Commit: `docs: close managed prompt ownership repair` (hash: TBD)
````

## Follow-up scope

Runtime-level conformance gaps revealed by the retest (see `Acceptance` above) are routed to a separate scope: **`managed-workflow-runtime-contract-conformance`**. That scope addresses Core post-turn arbitration re-execution, corrective-feedback text cleanup, the `handoff to user phase` decision form, the Phase 2 materialization commit handler, and Codex CLI session writer audit records — strictly aligned with `WorkflowSteps_Overview.md` lines 66–86, 82, and 256.
