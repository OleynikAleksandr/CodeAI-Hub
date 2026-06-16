# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "glm-opencode-provider-2026-06-16",
  "branch": "codex/audit-gates-cleanup",
  "baseHead": "3ec494bc4",
  "lastRecordedCommit": "b49e21e8d",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/GLM_OpenCode_Provider_Planning_RU.md",
  "currentTaskId": "phase1.stream2.task1",
  "expectedCommitMessage": "feat: add glm opencode provider module",
  "debt": {
    "expectedCommitMessage": "feat: add glm opencode provider module",
    "preCommitHead": "b49e21e8d",
    "stage": "commit_pending",
    "taskId": "phase1.stream2.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/GLM_OpenCode_Provider_Planning_RU.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Modules/GLM_Claude_Code.md`
  - `doc/SolidWorks-WorkFlow/Modules/Kimi.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Only this list is the context source for this execution cycle.

## Execution Rules

- **Required reading before each fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Each implementation task is paired with a separate `Git Commit` item.
- Keep each implementation task scoped to no more than 3 files or one tightly bounded package/surface.
- Use `npm run plan:commit -- "<expected commit message>"` for planned commits.
- Do not bypass Husky hooks or quality gates.
- User already explicitly requested a new release for this scope; still record release evidence before handoff.

## Phase 1 - GLM-OpenCode Provider (owner: Codex, updated: 2026-06-16)

### Stream: Planning Intake

1. [DONE] `phase1.stream1.task1` Create the GLM-OpenCode planning source and link it from the docs index. (scope: `doc/SolidWorks-WorkFlow/Plans/GLM_OpenCode_Provider_Planning_RU.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan glm opencode provider`)
2. [DONE] `phase1.stream1.commit1` Git Commit: `docs: plan glm opencode provider` (hash: b49e21e8d)

### Stream: Provider Runtime

3. [DONE] `phase1.stream2.task1` Add the dedicated GLM-OpenCode provider package with runtime profile, OpenCode process runner, adapter facade and focused runtime tests. (scope: `packages/GLM_OpenCode_Module/**, package.json, package-lock.json`; expected commit: `feat: add glm opencode provider module`)
4. [PENDING] `phase1.stream2.commit1` Git Commit: `feat: add glm opencode provider module` (hash: TBD)

### Stream: Core Registry

5. [TODO] `phase1.stream3.task1` Register `glmOpenCode` in Core provider loading, descriptors, workspace provider homes, model identity and provider failure classification. (scope: `packages/core/src/provider-registry/**, packages/core/src/workflow/runtime/workspace-runtime-capsule.ts, packages/core/src/config/**`; expected commit: `feat: register glm opencode provider`)
6. [TODO] `phase1.stream3.commit1` Git Commit: `feat: register glm opencode provider` (hash: TBD)

### Stream: Settings And Selection Surfaces

7. [TODO] `phase1.stream4.task1` Add `providers.glmOpenCode` settings state, Settings tab/card, provider picker visibility, workflow defaults and provider labels/tints. (scope: `src/client/ui/src/components/settings/**, src/client/project-manager/**, src/types/provider.ts`; expected commit: `feat: expose glm opencode settings and selection`)
8. [TODO] `phase1.stream4.commit1` Git Commit: `feat: expose glm opencode settings and selection` (hash: TBD)

### Stream: Packaging And Diagnostics

9. [TODO] `phase1.stream5.task1` Add GLM-OpenCode manifest/build packaging plus minimal diagnostics/version detection for OpenCode `>=1.17.7`. (scope: `assets/providers/glm-opencode/**, scripts/**, src/extension-module/settings/**`; expected commit: `feat: package glm opencode provider`)
10. [TODO] `phase1.stream5.commit1` Git Commit: `feat: package glm opencode provider` (hash: TBD)

### Stream: Documentation Sync

11. [TODO] `phase1.stream6.task1` Document the new GLM-OpenCode provider module and update architecture/index references. (scope: `doc/SolidWorks-WorkFlow/Modules/GLM_OpenCode.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: document glm opencode provider`)
12. [TODO] `phase1.stream6.commit1` Git Commit: `docs: document glm opencode provider` (hash: TBD)

### Stream: Verification

13. [TODO] `phase1.stream7.task1` Run targeted provider/Core/UI checks and live OpenCode smoke with `zai-coding-plan/glm-5.2`. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record glm opencode verification`)
    - Planned checks: provider tests, Core registry/config tests, UI settings/provider picker tests, `npm run build --workspace=@codeai-hub/glm-opencode-module`, `npm run build --workspace=@codeai-hub/core`, `npm run typecheck:webview`, and live smoke that confirms `llm.provider=zai-coding-plan`, `llm.model=glm-5.2`.
14. [TODO] `phase1.stream7.commit1` Git Commit: `docs: record glm opencode verification` (hash: TBD)

### Stream: Release Build

15. [TODO] `phase1.stream8.task1` Prepare release notes for the confirmed GLM-OpenCode release before version bump/build. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare glm opencode release notes`)
16. [TODO] `phase1.stream8.commit1` Git Commit: `docs: prepare glm opencode release notes` (hash: TBD)
17. [TODO] `phase1.stream8.task2` Build the confirmed release with GLM-OpenCode packaged and record release artifacts. (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, media/react-chat.js, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build glm opencode release`)
18. [TODO] `phase1.stream8.commit2` Git Commit: `chore: build glm opencode release` (hash: TBD)

### Stream: User Workflow Acceptance Testing

19. [TODO] `phase1.stream9.task1` Wait for user retest that `GLM-OpenCode` is selectable and can complete at least one workflow step without locking input. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record glm opencode acceptance`)
20. [TODO] `phase1.stream9.commit1` Git Commit: `docs: record glm opencode acceptance` (hash: TBD)

### Stream: Scope Closeout

21. [TODO] `phase1.stream10.task1` Close the GLM-OpenCode scope after user acceptance and archive/update planning documentation. (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close glm opencode scope`)
22. [TODO] `phase1.stream10.commit1` Git Commit: `docs: close glm opencode scope` (hash: TBD)
23. [TODO] `phase1.stream10.task2` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
