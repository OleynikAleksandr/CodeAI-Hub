# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "glm-native-provider-2026-06-17",
  "branch": "codex/audit-gates-cleanup",
  "baseHead": "9059a03eb",
  "lastRecordedCommit": "3275abef7",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/GLM_Native_Provider_Planning_RU.md",
  "currentTaskId": "phase1.stream5.task1",
  "expectedCommitMessage": "feat: package native glm provider",
  "debt": {
    "expectedCommitMessage": "feat: package native glm provider",
    "preCommitHead": "3275abef7",
    "stage": "commit_pending",
    "taskId": "phase1.stream5.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/GLM_Native_Provider_Planning_RU.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Modules/Kimi.md`
  - `doc/SolidWorks-WorkFlow/Modules/GLM_OpenCode.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Only this list is the context source for this execution cycle.

## Execution Rules

- **Required reading before each fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Each implementation task is paired with a separate `Git Commit` item.
- Keep each implementation task scoped to no more than 3 files or one tightly bounded package/surface.
- Use `npm run plan:commit -- "<expected commit message>"` for planned commits.
- Do not bypass Husky hooks or quality gates.
- Release build requires a separate confirmation before `build-all.sh` / `build-release.sh`.

## Phase 1 - Native GLM Provider (owner: Codex, updated: 2026-06-17)

### Stream: Planning Intake

1. [DONE] `phase1.stream1.task1` Create the native GLM provider planning source and link it from the docs index. (scope: `doc/SolidWorks-WorkFlow/Plans/GLM_Native_Provider_Planning_RU.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan native glm provider`)
2. [DONE] `phase1.stream1.commit1` Git Commit: `docs: plan native glm provider` (hash: f52682d33)

### Stream: Provider Runtime

3. [DONE] `phase1.stream2.task1` Add the dedicated GLM provider package with native fetch/SSE runtime, reasoning/content normalization, token usage mapping and focused tests. (scope: `packages/GLM_Module/**, package.json, package-lock.json`; expected commit: `feat: add native glm provider module`)
4. [DONE] `phase1.stream2.commit1` Git Commit: `feat: add native glm provider module` (hash: 50484161c)

### Stream: Core Registry

5. [DONE] `phase1.stream3.task1` Register `glmNative` in Core provider loading, descriptors, workspace provider homes, model identity and provider failure recovery. (scope: `packages/core/package.json, package-lock.json, packages/core/src/provider-registry/**, packages/core/src/config/**, packages/core/src/workflow/runtime/workspace-runtime-capsule.ts`; expected commit: `feat: register native glm provider`)
6. [DONE] `phase1.stream3.commit1` Git Commit: `feat: register native glm provider` (hash: c609e906b)

### Stream: Settings And Selection Surfaces

7. [DONE] `phase1.stream4.task1` Add `providers.glmNative` settings state, Settings card, provider picker visibility, workflow defaults and provider labels. (scope: `src/types/provider.ts, src/client/ui/src/components/settings/**, src/client/ui/src/core-bridge/**, src/client/ui/src/session/**, src/client/project-manager/**, media/react-chat.js`; expected commit: `feat: expose native glm settings and selection`)
8. [DONE] `phase1.stream4.commit1` Git Commit: `feat: expose native glm settings and selection` (hash: 3275abef7)

### Stream: Packaging And Documentation

9. [DONE] `phase1.stream5.task1` Add native GLM release packaging and module SSOT documentation. (scope: `.vscodeignore, assets/providers/glm-native/**, scripts/**, doc/SolidWorks-WorkFlow/Modules/GLM_Native.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `feat: package native glm provider`)
10. [PENDING] `phase1.stream5.commit1` Git Commit: `feat: package native glm provider` (hash: TBD)

### Stream: Verification

11. [TODO] `phase1.stream6.task1` Record targeted builds/tests and live GLM 5.2 smoke evidence for assistant output, reasoning and token usage. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record native glm verification`)
12. [TODO] `phase1.stream6.commit1` Git Commit: `docs: record native glm verification` (hash: TBD)

### Stream: Release Build

13. [TODO] `phase1.stream7.task1` Prepare release notes after user confirms the native GLM release build. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare native glm release notes`)
14. [TODO] `phase1.stream7.commit1` Git Commit: `docs: prepare native glm release notes` (hash: TBD)
15. [TODO] `phase1.stream7.task2` Build the confirmed native GLM release and record artifacts for user retest. (scope: `package.json, package-lock.json, .vscodeignore, packages/**/package.json, assets/**/manifest.json, media/react-chat.js, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build native glm release`)
16. [TODO] `phase1.stream7.commit2` Git Commit: `chore: build native glm release` (hash: TBD)

### Stream: User Workflow Acceptance Testing

17. [TODO] `phase1.stream8.task1` Wait for user retest that `GLM` is selectable, runs `GLM 5.2` natively, streams reasoning and reports token usage without OpenCode/Claude. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record native glm acceptance`)
18. [TODO] `phase1.stream8.commit1` Git Commit: `docs: record native glm acceptance` (hash: TBD)

### Stream: Scope Closeout

19. [TODO] `phase1.stream9.task1` Close the native GLM provider scope after user acceptance and archive/update planning documentation. (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close native glm scope`)
20. [TODO] `phase1.stream9.commit1` Git Commit: `docs: close native glm scope` (hash: TBD)
21. [TODO] `phase1.stream9.task2` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
