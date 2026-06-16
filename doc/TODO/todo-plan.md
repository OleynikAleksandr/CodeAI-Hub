# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "glm-opencode-provider-2026-06-16",
  "branch": "codex/audit-gates-cleanup",
  "baseHead": "3ec494bc4",
  "lastRecordedCommit": "a9eeeb110",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/GLM_OpenCode_Provider_Planning_RU.md",
  "currentTaskId": "phase1.stream7a.task1",
  "expectedCommitMessage": "fix: align glm opencode model selector",
  "debt": {
    "expectedCommitMessage": "fix: align glm opencode model selector",
    "preCommitHead": "a9eeeb110",
    "stage": "commit_pending",
    "taskId": "phase1.stream7a.task1"
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
4. [DONE] `phase1.stream2.commit1` Git Commit: `feat: add glm opencode provider module` (hash: 6cca7a5b2)

### Stream: Core Registry

5. [DONE] `phase1.stream3.task1` Register `glmOpenCode` in Core provider loading, descriptors, workspace provider homes, model identity and provider failure classification. (scope: `packages/core/src/provider-registry/**, packages/core/src/workflow/runtime/workspace-runtime-capsule.ts, packages/core/src/config/**, packages/core/package.json, package-lock.json`; expected commit: `feat: register glm opencode provider`)
6. [DONE] `phase1.stream3.commit1` Git Commit: `feat: register glm opencode provider` (hash: cc23f80c6)

### Stream: Settings And Selection Surfaces

7. [DONE] `phase1.stream4.task1` Add `providers.glmOpenCode` settings state, Settings tab/card, provider picker visibility, workflow defaults and provider labels/tints. (scope: `src/client/ui/src/components/settings/**, src/client/ui/src/session/**, src/client/ui/src/core-bridge/constants.ts, src/client/project-manager/**, src/types/provider.ts, packages/core/src/provider-registry/**, packages/core/src/remote-bridge/handlers/settings-*.ts, packages/core/src/provider-network-capture/**, packages/GLM_OpenCode_Module/src/provider/**`; expected commit: `feat: expose glm opencode settings and selection`)
8. [DONE] `phase1.stream4.commit1` Git Commit: `feat: expose glm opencode settings and selection` (hash: 726884d4d)

### Stream: Packaging And Diagnostics

9. [DONE] `phase1.stream5.task1` Add GLM-OpenCode manifest/build packaging plus minimal diagnostics/version detection for OpenCode `>=1.17.7`. (scope: `assets/providers/glm-opencode/**, scripts/build-*.sh, scripts/release-utils.sh, packages/core/src/remote-bridge/handlers/settings-provider-version-service.ts, src/extension-module/settings/**, src/client/ui/src/components/settings/provider-versions*, src/client/ui/src/components/settings/settings-provider-tab-content.tsx`; expected commit: `feat: package glm opencode provider`)
10. [DONE] `phase1.stream5.commit1` Git Commit: `feat: package glm opencode provider` (hash: 08a73a229)

### Stream: Documentation Sync

11. [DONE] `phase1.stream6.task1` Document the new GLM-OpenCode provider module and update architecture/index references. (scope: `doc/SolidWorks-WorkFlow/Modules/GLM_OpenCode.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: document glm opencode provider`)
12. [DONE] `phase1.stream6.commit1` Git Commit: `docs: document glm opencode provider` (hash: a9eeeb110)

### Stream: OpenCode Selector Repair

13. [DONE] `phase1.stream7a.task1` Align the GLM-OpenCode runtime selector with OpenCode 1.17.7 live model resolution. (scope: `packages/GLM_OpenCode_Module/src/provider/glm-opencode-runtime-profile.ts, packages/GLM_OpenCode_Module/src/provider/glm-opencode-runtime-profile.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: align glm opencode model selector`)
14. [PENDING] `phase1.stream7a.commit1` Git Commit: `fix: align glm opencode model selector` (hash: TBD)
15. [TODO] `phase1.stream7a.task2` Align GLM-OpenCode docs with the live OpenCode selector. (scope: `doc/SolidWorks-WorkFlow/Modules/GLM_OpenCode.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: align glm opencode selector docs`)
16. [TODO] `phase1.stream7a.commit2` Git Commit: `docs: align glm opencode selector docs` (hash: TBD)

### Stream: Verification

17. [TODO] `phase1.stream7.task1` Run targeted provider/Core/UI checks and live OpenCode smoke with `glm-5.2`. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record glm opencode verification`)
    - Planned checks: provider tests, Core registry/config tests, UI settings/provider picker tests, `npm run build --workspace=@codeai-hub/glm-opencode-module`, `npm run build --workspace=@codeai-hub/core`, `npm run typecheck:webview`, and live smoke that confirms OpenCode runs `glm-5.2` and returns the requested response.
18. [TODO] `phase1.stream7.commit1` Git Commit: `docs: record glm opencode verification` (hash: TBD)

### Stream: Release Build

19. [TODO] `phase1.stream8.task1` Prepare release notes for the confirmed GLM-OpenCode release before version bump/build. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare glm opencode release notes`)
20. [TODO] `phase1.stream8.commit1` Git Commit: `docs: prepare glm opencode release notes` (hash: TBD)
21. [TODO] `phase1.stream8.task2` Build the confirmed release with GLM-OpenCode packaged and record release artifacts. (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, media/react-chat.js, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build glm opencode release`)
22. [TODO] `phase1.stream8.commit2` Git Commit: `chore: build glm opencode release` (hash: TBD)

### Stream: User Workflow Acceptance Testing

23. [TODO] `phase1.stream9.task1` Wait for user retest that `GLM-OpenCode` is selectable and can complete at least one workflow step without locking input. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record glm opencode acceptance`)
24. [TODO] `phase1.stream9.commit1` Git Commit: `docs: record glm opencode acceptance` (hash: TBD)

### Stream: Scope Closeout

25. [TODO] `phase1.stream10.task1` Close the GLM-OpenCode scope after user acceptance and archive/update planning documentation. (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close glm opencode scope`)
26. [TODO] `phase1.stream10.commit1` Git Commit: `docs: close glm opencode scope` (hash: TBD)
27. [TODO] `phase1.stream10.task2` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
