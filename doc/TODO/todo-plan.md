# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "glm-opencode-provider-2026-06-16",
  "branch": "codex/audit-gates-cleanup",
  "baseHead": "3ec494bc4",
  "lastRecordedCommit": "9cebd7de7",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/GLM_OpenCode_Provider_Planning_RU.md",
  "currentTaskId": "phase1.stream9a.task1",
  "expectedCommitMessage": "fix: restore opencode reasoning events",
  "debt": {
    "expectedCommitMessage": "fix: restore opencode reasoning events",
    "preCommitHead": "9cebd7de7",
    "stage": "commit_pending",
    "taskId": "phase1.stream9a.task1"
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

## Phase 1 - OpenCode Wrapper Provider (owner: Codex, updated: 2026-06-16)

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
14. [DONE] `phase1.stream7a.commit1` Git Commit: `fix: align glm opencode model selector` (hash: 74f48fd62)
15. [DONE] `phase1.stream7a.task2` Align GLM-OpenCode docs with the live OpenCode selector. (scope: `doc/SolidWorks-WorkFlow/Modules/GLM_OpenCode.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: align glm opencode selector docs`)
16. [DONE] `phase1.stream7a.commit2` Git Commit: `docs: align glm opencode selector docs` (hash: 3fc789ba8)

### Stream: OpenCode Wrapper Pivot

17. [DONE] `phase1.stream7b.task1` Repurpose the existing `glmOpenCode` surface into a user-facing OpenCode wrapper: use OpenCode-owned auth/runtime, close spawned stdin to avoid init hangs, expose tested selectors `zai-coding-plan/glm-5.2` and `kimi-for-coding/k2p7`, and relabel Settings/PM surfaces from GLM-only wording to OpenCode. (scope: `doc/SolidWorks-WorkFlow/Docs_Index.md, doc/SolidWorks-WorkFlow/Plans/GLM_OpenCode_Provider_Planning_RU.md, doc/TODO/todo-plan.md, packages/GLM_OpenCode_Module/src/index.ts, packages/GLM_OpenCode_Module/src/provider/glm-opencode-provider-adapter.ts, packages/GLM_OpenCode_Module/src/provider/glm-opencode-runner.ts, packages/GLM_OpenCode_Module/src/provider/glm-opencode-runtime-profile.ts, packages/GLM_OpenCode_Module/src/provider/glm-opencode-runtime-profile.test.ts, packages/core/src/config/provider-settings-snapshot.ts, packages/core/src/config/provider-turn-config-resolver.ts, packages/core/src/provider-registry/provider-descriptor-factory.ts, packages/core/src/provider-registry/provider-recovery-coordinator.ts, packages/core/src/remote-bridge/handlers/settings-default-snapshot.ts, packages/core/src/workflow/runtime/workspace-runtime-capsule.ts, src/client/project-manager/components/capture-workbench/model-reasoning-selectors.tsx, src/client/project-manager/components/capture-workbench/provider-selector.tsx, src/client/project-manager/components/capture-workbench/selection-bar.tsx, src/client/project-manager/components/settings/project-manager-settings-host-message.ts, src/client/project-manager/components/shared/stage-start-model-selection.ts, src/client/project-manager/services/workflow-step-start-settings-defaults.ts, src/client/ui/src/components/settings/glm-opencode-settings-card.tsx, src/client/ui/src/components/settings/kimi-settings-state.ts, src/client/ui/src/components/settings/native-request-capture-state.ts, src/client/ui/src/components/settings/provider-versions-ui.tsx, src/client/ui/src/components/settings/provider-versions.tsx, src/client/ui/src/components/settings/settings-provider-tab-content.tsx, src/client/ui/src/session/model-info-builder.ts, src/client/ui/src/session/status-panel-model-picker.tsx, src/types/provider.ts`; expected commit: `feat: repurpose glm opencode as opencode wrapper`)
18. [DONE] `phase1.stream7b.commit1` Git Commit: `feat: repurpose glm opencode as opencode wrapper` (hash: ca6f37bae)

### Stream: Verification

19. [DONE] `phase1.stream7.task1` Record targeted provider/Core/UI checks and live wrapper smoke for both tested OpenCode selectors. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record opencode wrapper verification`)
    - Completed checks: `npm run build --workspace=@codeai-hub/glm-opencode-module` ✅, `node --test packages/GLM_OpenCode_Module/dist/provider/*.test.js` ✅ (7/7), `npm run build --workspace=@codeai-hub/core` ✅, `npm run typecheck:webview` ✅.
    - Live smoke evidence: direct OpenCode CLI returned `CODEAI_GLM_OPENWRAPPER_OK` for `zai-coding-plan/glm-5.2` and `CODEAI_KIMI_OPENWRAPPER_OK` for `kimi-for-coding/k2p7`; isolated wrapper adapter returned `WRAPPER_GLM_OK` and `WRAPPER_KIMI_OK` through `GlmOpenCodeProviderAdapter`.
    - Investigation result captured during implementation: leaving child `stdin` open in `spawn()` could stall OpenCode on `init`; switching to `stdio: ["ignore", "pipe", "pipe"]` removed the hang in adapter-level smoke.
20. [DONE] `phase1.stream7.commit1` Git Commit: `docs: record opencode wrapper verification` (hash: 02450ebfc)

### Stream: Release Build

21. [DONE] `phase1.stream8.task1` Prepare release notes for the confirmed GLM-OpenCode release before version bump/build. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare glm opencode release notes`)
22. [DONE] `phase1.stream8.commit1` Git Commit: `docs: prepare glm opencode release notes` (hash: a3d19eb3d)
23. [DONE] `phase1.stream8.task2` Build the confirmed release with GLM-OpenCode packaged and record release artifacts. (scope: `package.json, package-lock.json, .vscodeignore, packages/**/package.json, assets/**/manifest.json, media/react-chat.js, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build glm opencode release`)
24. [DONE] `phase1.stream8.commit2` Git Commit: `chore: build glm opencode release` (hash: 9cebd7de7)

### Stream: User Workflow Acceptance Testing

### Stream: OpenCode Reasoning Repair

25. [DONE] `phase1.stream9a.task1` Restore OpenCode reasoning flow end-to-end so the wrapper requests thinking output, preserves OpenCode `reasoning` events, and forwards them into the existing Core/UI thinking pipeline. (scope: `packages/GLM_OpenCode_Module/**, packages/core/src/remote-bridge/handlers/**, packages/core/src/session-translation/**, doc/TODO/todo-plan.md`; expected commit: `fix: restore opencode reasoning events`)
26. [PENDING] `phase1.stream9a.commit1` Git Commit: `fix: restore opencode reasoning events` (hash: TBD)

### Stream: OpenCode Canonical Rename And Defaults

27. [TODO] `phase1.stream9b.task1` Rename the OpenCode provider runtime/config home from `glm-opencode` to canonical `opencode`, migrate user-facing defaults to selector-aware Settings UX, and keep compatibility with existing `glm-opencode` installs and workspace capsules. (scope: `packages/GLM_OpenCode_Module/**, packages/core/src/**, src/client/ui/src/components/settings/**, src/client/project-manager/**, assets/providers/glm-opencode/**, scripts/build-*.sh, doc/TODO/todo-plan.md`; expected commit: `refactor: rename glm opencode runtime to opencode`)
28. [TODO] `phase1.stream9b.commit1` Git Commit: `refactor: rename glm opencode runtime to opencode` (hash: TBD)

### Stream: Remove GLM-Claude-Code

29. [TODO] `phase1.stream9c.task1` Remove the deprecated `glmClaudeCode` provider from Core registries, UI/Project Manager surfaces, packaging/runtime artifacts, provider capture paths, release scripts, and active SSOT docs. (scope: `packages/Claude_Module/**, packages/core/src/**, src/**, assets/providers/glm-claude-code/**, scripts/**, doc/**, package.json, package-lock.json, doc/TODO/todo-plan.md`; expected commit: `refactor: remove glm claude code provider`)
30. [TODO] `phase1.stream9c.commit1` Git Commit: `refactor: remove glm claude code provider` (hash: TBD)

### Stream: User Workflow Acceptance Testing

31. [TODO] `phase1.stream9.task1` Wait for user retest that `OpenCode` is selectable, emits translated reasoning when enabled, and switches correctly between GLM/Kimi selectors without exposing the removed GLM-Claude-Code provider. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record opencode wrapper acceptance`)
32. [TODO] `phase1.stream9.commit1` Git Commit: `docs: record opencode wrapper acceptance` (hash: TBD)

### Stream: Scope Closeout

33. [TODO] `phase1.stream10.task1` Close the GLM-OpenCode scope after user acceptance and archive/update planning documentation. (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close glm opencode scope`)
34. [TODO] `phase1.stream10.commit1` Git Commit: `docs: close glm opencode scope` (hash: TBD)
35. [TODO] `phase1.stream10.task2` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
