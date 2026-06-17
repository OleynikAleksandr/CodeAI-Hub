# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "glm-native-provider-2026-06-17",
  "branch": "codex/audit-gates-cleanup",
  "baseHead": "9059a03eb",
  "lastRecordedCommit": "461afb7cf",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/GLM_Native_Provider_Planning_RU.md",
  "currentTaskId": "phase1.stream15.task2",
  "expectedCommitMessage": "chore: build native glm runtime settings hotfix release",
  "debt": {
    "expectedCommitMessage": "chore: build native glm runtime settings hotfix release",
    "preCommitHead": "461afb7cf",
    "stage": "commit_pending",
    "taskId": "phase1.stream15.task2"
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
26. [DONE] `phase1.stream11.commit1` Git Commit: `fix: harden native glm reasoning transport` (hash: 3bc6f845d)
27. [DONE] `phase1.stream11.task2` Align native GLM Settings/Core reasoning controls with the real Z.AI/OpenCode high/max contract and legacy off aliases. (scope: `src/client/ui/src/components/settings/**, packages/core/src/config/glm-native-turn-config.ts, doc/TODO/todo-plan.md`; expected commit: `fix: align native glm reasoning settings`)
28. [DONE] `phase1.stream11.commit2` Git Commit: `fix: align native glm reasoning settings` (hash: 5bf8841fe)
29. [DONE] `phase1.stream11.task3` Document native GLM reasoning transport findings from the OpenCode comparison. (scope: `doc/SolidWorks-WorkFlow/Modules/GLM_Native.md, doc/TODO/todo-plan.md`; expected commit: `docs: document native glm reasoning transport`)
30. [DONE] `phase1.stream11.commit3` Git Commit: `docs: document native glm reasoning transport` (hash: 9659a0cdb)

### Stream: Native GLM Transport Hotfix Release

31. [DONE] `phase1.stream12.task1` Prepare release notes for the confirmed native GLM transport/reasoning hotfix release. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare native glm transport release`)
32. [DONE] `phase1.stream12.commit1` Git Commit: `docs: prepare native glm transport release` (hash: 25023ebe3)
33. [DONE] `phase1.stream12.task2` Build the confirmed native GLM transport/reasoning hotfix release and record artifacts for user retest. (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, media/react-chat.js, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build native glm transport release`)
34. [DONE] `phase1.stream12.commit2` Git Commit: `chore: build native glm transport release` (hash: 195fd3b20)

### Stream: User Workflow Acceptance Testing

35. [BLOCKED] `phase1.stream13.task1` Wait for user retest that `GLM` is selectable, runs `GLM 5.2` natively, streams reasoning and reports token usage without OpenCode/Claude, and GLM reasoning level changes do not crash Project Manager. Retest on 2026-06-17 failed with `Provider turn failed: fetch failed (ECONNRESET: read ECONNRESET)`. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record native glm acceptance`)
36. [TODO] `phase1.stream13.commit1` Git Commit: `docs: record native glm acceptance` (hash: TBD)

### Stream: GLM Native ECONNRESET Retest Fix

37. [DONE] `phase1.stream14.task1` Retry native GLM stream resets before the first useful SSE event and persist GLM Native connection settings globally so new workspaces do not require re-entering the API key. (scope: `packages/GLM_Module/src/provider/**, packages/core/src/remote-bridge/handlers/settings-*.ts, doc/SolidWorks-WorkFlow/Modules/GLM_Native.md, doc/TODO/todo-plan.md`; expected commit: `fix: stabilize native glm runtime settings`)
38. [DONE] `phase1.stream14.commit1` Git Commit: `fix: stabilize native glm runtime settings` (hash: 812ebf2ca)

#### Verification evidence (2026-06-17)
- `npm run build --workspace=@codeai-hub/glm-module && npm test --workspace=@codeai-hub/glm-module` — passed: 11/11, including pre-first-event `ECONNRESET` stream retry and global GLM runtime profile fallback.
- `npx tsx --test packages/core/src/remote-bridge/handlers/settings-persistence-service.test.ts packages/core/src/config/provider-settings-snapshot.test.ts` — passed: 7/7, including global GLM connection settings split/merge.
- `npm run build --workspace=@codeai-hub/core` — passed after sequential GLM module build.

### Stream: Native GLM Runtime Settings Hotfix Release

39. [DONE] `phase1.stream15.task1` Prepare release notes for the confirmed native GLM runtime settings hotfix release. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare native glm runtime settings hotfix release`)
40. [DONE] `phase1.stream15.commit1` Git Commit: `docs: prepare native glm runtime settings hotfix release` (hash: 461afb7cf)
41. [DONE] `phase1.stream15.task2` Build the confirmed native GLM runtime settings hotfix release and record artifacts for user retest. (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, media/react-chat.js, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build native glm runtime settings hotfix release`)
42. [PENDING] `phase1.stream15.commit2` Git Commit: `chore: build native glm runtime settings hotfix release` (hash: TBD)

#### Release evidence (2026-06-17)
- `./scripts/build-all.sh --allow-dirty` — passed; built provider/core/UI/launcher tarballs for `1.2.537` and copied 10 release artifacts into `doc/tmp/releases/`.
- `./scripts/build-release.sh --use-current-version --allow-dirty` — passed; verified SDK exclusions, local artifacts, markdown links, duplication advisory, VSIX runtime package surface and produced `codeai-hub-1.2.537.vsix` (`5.4M`).

### Stream: User Workflow Acceptance Testing

43. [TODO] `phase1.stream16.task1` Wait for user retest that `GLM` is selectable, runs `GLM 5.2` natively, streams reasoning and reports token usage without OpenCode/Claude, and GLM reasoning level changes do not crash Project Manager after the runtime settings hotfix release. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record native glm acceptance`)
44. [TODO] `phase1.stream16.commit1` Git Commit: `docs: record native glm acceptance` (hash: TBD)

### Stream: Scope Closeout

45. [TODO] `phase1.stream17.task1` Close the native GLM provider scope after user acceptance and archive/update planning documentation. (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close native glm scope`)
46. [TODO] `phase1.stream17.commit1` Git Commit: `docs: close native glm scope` (hash: TBD)
47. [TODO] `phase1.stream17.task2` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
