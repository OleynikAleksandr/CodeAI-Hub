# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "glm-native-provider-2026-06-17",
  "branch": "codex/audit-gates-cleanup",
  "baseHead": "9059a03eb",
  "lastRecordedCommit": "db30483f2",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/GLM_Native_Provider_Planning_RU.md",
  "currentTaskId": "phase1.stream11.task1",
  "expectedCommitMessage": "fix: harden native glm reasoning transport",
  "debt": {
    "expectedCommitMessage": "fix: harden native glm reasoning transport",
    "preCommitHead": "db30483f2",
    "stage": "commit_pending",
    "taskId": "phase1.stream11.task1"
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
10. [DONE] `phase1.stream5.commit1` Git Commit: `feat: package native glm provider` (hash: 8d76295ac)

### Stream: Verification

11. [DONE] `phase1.stream6.task1` Record targeted builds/tests and live GLM 5.2 smoke evidence for assistant output, reasoning and token usage. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record native glm verification`)
12. [DONE] `phase1.stream6.commit1` Git Commit: `docs: record native glm verification` (hash: 0dc8abac9)

#### Verification evidence (2026-06-17)
- `npm run build --workspace=@codeai-hub/glm-module` — passed.
- `npm test --workspace=@codeai-hub/glm-module` — passed earlier in this scope: 5/5 provider/SSE tests.
- `npm run build --workspace=@codeai-hub/core` — passed after Core registry and packaging changes.
- `npm run typecheck:webview` — passed after Settings/session UI changes.
- `npm run build:webview` — passed and regenerated `media/react-chat.js`.
- `npm run build:project-manager` — passed.
- `bash -n scripts/build-glm-module.sh scripts/build-all.sh scripts/build-core.sh scripts/build-release.sh scripts/release-utils.sh` — passed.
- `./scripts/build-glm-module.sh --version 1.2.533` — passed; installed `~/.codeai-hub/providers/glm-native/1.2.533` and updated `assets/providers/glm-native/manifest.json`.
- Live native GLM smoke via `packages/GLM_Module/dist/index.js` using OpenCode `zai-coding-plan` auth key without printing the secret — passed: model `glm-5.2`, assistant chunks `12`, thinking chunks `52`, token usage events `1`, failure events `0`, assistant preview `GLM_NATIVE_SMOKE_OK This model is glm-5.2.`

### Stream: GLM Reasoning Controls

13. [DONE] `phase1.stream7.task1` Add native GLM reasoning enablement, effort level and dialog display controls before release. (scope: `src/client/ui/src/components/settings/**, src/client/project-manager/**, packages/core/src/config/**, packages/core/src/workflow/runtime/workspace-runtime-capsule.ts, packages/GLM_Module/**, media/react-chat.js, doc/TODO/todo-plan.md`; expected commit: `feat: add glm reasoning controls`)
14. [DONE] `phase1.stream7.commit1` Git Commit: `feat: add glm reasoning controls` (hash: 65f6141ff)

### Stream: Release Build

15. [DONE] `phase1.stream8.task1` Prepare release notes for the confirmed native GLM release build. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare native glm release notes`)
16. [DONE] `phase1.stream8.commit1` Git Commit: `docs: prepare native glm release notes` (hash: 3cb3fcd29)
17. [DONE] `phase1.stream8.task2` Build the confirmed native GLM release and record artifacts for user retest. (scope: `package.json, package-lock.json, .vscodeignore, packages/**/package.json, assets/**/manifest.json, media/react-chat.js, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build native glm release`)
18. [DONE] `phase1.stream8.commit2` Git Commit: `chore: build native glm release` (hash: 172c248ef)

### Stream: GLM Settings Crash Fix

19. [DONE] `phase1.stream9.task1` Replace the GLM reasoning native select with the Codex-style custom reasoning dialog to avoid Project Manager/CEF native popup crashes. (scope: `src/client/ui/src/components/settings/glm-native-settings-card.tsx, media/react-chat.js, doc/TODO/todo-plan.md`; expected commit: `fix: replace glm reasoning native select`)
20. [DONE] `phase1.stream9.commit1` Git Commit: `fix: replace glm reasoning native select` (hash: 8cba2d0a3)

### Stream: GLM Settings Crash Hotfix Release

21. [DONE] `phase1.stream10.task1` Prepare release notes for the GLM Settings native select crash hotfix. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare glm settings crash hotfix release`)
22. [DONE] `phase1.stream10.commit1` Git Commit: `docs: prepare glm settings crash hotfix release` (hash: e79c1e7a6)
23. [DONE] `phase1.stream10.task2` Build the GLM Settings crash hotfix release and record artifacts for user retest. (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, media/react-chat.js, doc/TODO/todo-plan.md`; expected commit: `chore: build glm settings crash hotfix release`)
24. [DONE] `phase1.stream10.commit2` Git Commit: `chore: build glm settings crash hotfix release` (hash: db30483f2)

### Stream: GLM Native Retest Fix

25. [DONE] `phase1.stream11.task1` Harden native GLM request compatibility after retest showed `fetch failed`, keeping reasoning enabled and preserving provider failure diagnostics. (scope: `packages/GLM_Module/**, doc/TODO/todo-plan.md`; expected commit: `fix: harden native glm reasoning transport`)
26. [PENDING] `phase1.stream11.commit1` Git Commit: `fix: harden native glm reasoning transport` (hash: TBD)
27. [TODO] `phase1.stream11.task2` Align native GLM Settings/Core reasoning controls with the real Z.AI/OpenCode high/max contract and legacy off aliases. (scope: `src/client/ui/src/components/settings/**, packages/core/src/config/glm-native-turn-config.ts, doc/TODO/todo-plan.md`; expected commit: `fix: align native glm reasoning settings`)
28. [TODO] `phase1.stream11.commit2` Git Commit: `fix: align native glm reasoning settings` (hash: TBD)
29. [TODO] `phase1.stream11.task3` Document native GLM reasoning transport findings from the OpenCode comparison. (scope: `doc/SolidWorks-WorkFlow/Modules/GLM_Native.md, doc/TODO/todo-plan.md`; expected commit: `docs: document native glm reasoning transport`)
30. [TODO] `phase1.stream11.commit3` Git Commit: `docs: document native glm reasoning transport` (hash: TBD)

### Stream: User Workflow Acceptance Testing

31. [TODO] `phase1.stream12.task1` Wait for user retest that `GLM` is selectable, runs `GLM 5.2` natively, streams reasoning and reports token usage without OpenCode/Claude, and GLM reasoning level changes do not crash Project Manager. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record native glm acceptance`)
32. [TODO] `phase1.stream12.commit1` Git Commit: `docs: record native glm acceptance` (hash: TBD)

### Stream: Scope Closeout

33. [TODO] `phase1.stream13.task1` Close the native GLM provider scope after user acceptance and archive/update planning documentation. (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close native glm scope`)
34. [TODO] `phase1.stream13.commit1` Git Commit: `docs: close native glm scope` (hash: TBD)
35. [TODO] `phase1.stream13.task2` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
