# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "openrouter-agent-profile-tooling-2026-06-23",
  "branch": "main",
  "baseHead": "ed3742ac2",
  "lastRecordedCommit": "self",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/OpenRouter_AgentProfile_Tooling_Planning_RU.md",
  "currentTaskId": "openrouter-agent.phase5.hotfix-release-notes.task1",
  "expectedCommitMessage": "docs: prepare OpenRouter start-card hotfix release",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/OpenRouter_AgentProfile_Tooling_Planning_RU.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex_ProviderInvocationFlags.md`
  - `doc/SolidWorks-WorkFlow/Modules/GLM_Native.md`
  - `doc/SolidWorks-WorkFlow/Modules/LocalModels.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Execution Rules

- **Required reading before every fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **Ponytail Hard Mode:** reuse existing Codex system profile and GLM Native executable tools; no OpenRouter Agent SDK, no copied unexecutable Codex native tool catalog, no new provider abstraction layer.
- Keep each implementation task scoped to no more than 3 files or packages.
- Each implementation task is followed by a separate `Git Commit: ...` line.
- Run `npm run plan:validate` before every `npm run plan:commit -- "<Expected Commit>"`.
- Targeted verification should use the smallest affected tests/builds first.
- **Release Build Confirmation Gate:** do not run `./scripts/build-all.sh` or `./scripts/build-release.sh` without separate explicit user confirmation.
- Scope Closeout runs only after explicit user acceptance.

## Phase 0 - Planning Intake (owner: Codex, updated: 2026-06-23)

### Stream: Accepted scope

1. [DONE] `openrouter-agent.phase0.plan.task1` Create the OpenRouter agent tooling planning source and active todo-plan for the accepted continuation scope (scope: `doc/SolidWorks-WorkFlow/Plans/OpenRouter_AgentProfile_Tooling_Planning_RU.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan OpenRouter agent tooling`).
2. [DONE] `openrouter-agent.phase0.plan.commit1` Git Commit: `docs: plan OpenRouter agent tooling` (hash: self)

## Phase 1 - Tool Runtime (owner: Codex, updated: 2026-06-23)

### Stream: Reuse existing executable tools

3. [DONE] `openrouter-agent.phase1.exports.task1` Export the already implemented GLM Native workflow tools/executor helpers for reuse by OpenRouter (scope: `packages/GLM_Module/src/index.ts, doc/TODO/todo-plan.md`; expected commit: `feat(openrouter): reuse workflow tool surface`).
4. [DONE] `openrouter-agent.phase1.exports.commit1` Git Commit: `feat(openrouter): reuse workflow tool surface` (hash: self)
5. [DONE] `openrouter-agent.phase1.loop.task1` Add OpenRouter system prompt, OpenAI-compatible tool declarations, streamed tool-call parsing and local tool-call continuation loop (scope: `packages/core/src/open-router/open-router-provider-adapter.ts, packages/core/src/open-router/open-router-sse-reader.ts, packages/core/src/open-router/open-router-provider-adapter.test.ts`; expected commit: `feat(openrouter): add agent tool loop`).
6. [DONE] `openrouter-agent.phase1.loop.commit1` Git Commit: `feat(openrouter): add agent tool loop` (hash: self)

## Phase 2 - Workflow Availability And Docs (owner: Codex, updated: 2026-06-23)

### Stream: Provider surfaces

7. [DONE] `openrouter-agent.phase2.workflow-picker.task1` Treat OpenRouter as research-capable in workflow provider selection now that it has executable tools (scope: `src/client/project-manager/services/workflow-provider-resolver.ts, src/client/project-manager/components/shared/stage-confirmation-card.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix(openrouter): enable workflow provider selection`).
8. [DONE] `openrouter-agent.phase2.workflow-picker.commit1` Git Commit: `fix(openrouter): enable workflow provider selection` (hash: self)
9. [DONE] `openrouter-agent.phase2.docs.task1` Update SSOT docs for OpenRouter agent profile/tooling behavior (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Plans/OpenRouter_AgentProfile_Tooling_Planning_RU.md, doc/TODO/todo-plan.md`; expected commit: `docs: document OpenRouter agent profile`).
10. [DONE] `openrouter-agent.phase2.docs.commit1` Git Commit: `docs: document OpenRouter agent profile` (hash: self)

## Phase 3 - Tooling Verification (owner: Codex, updated: 2026-06-23)

### Stream: Targeted checks

11. [DONE] `openrouter-agent.phase3.verify.task1` Run targeted tests/builds for GLM exports, OpenRouter tool-loop payloads and workflow picker behavior; record evidence in this plan (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify OpenRouter agent tooling`).
12. [DONE] `openrouter-agent.phase3.verify.commit1` Git Commit: `test: verify OpenRouter agent tooling` (hash: self)

Verification evidence (2026-06-23):

- `npm run build --workspace @codeai-hub/glm-module` — PASS.
- `npx tsx --test packages/core/src/open-router/open-router-provider-adapter.test.ts` — PASS (6/6).
- `npm run build --workspace @codeai-hub/core` — PASS.
- `npx tsx --test src/client/project-manager/components/shared/stage-confirmation-card.test.ts` — PASS (13/13).
- `npm run typecheck:webview` — PASS.

## Phase 4 - Release Build (owner: Codex, updated: 2026-06-23)

### Stream: Release Build Confirmation

13. [DONE] `openrouter-agent.phase4.release-plan.task1` Record the user's explicit release build confirmation and add the release-build stream for future version `1.2.601` before release notes or build scripts run (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: plan OpenRouter release build`).
14. [DONE] `openrouter-agent.phase4.release-plan.commit1` Git Commit: `docs: plan OpenRouter release build` (hash: self)

### Stream: Release Build

15. [DONE] `openrouter-agent.phase4.release-notes.task1` Prepare release-facing docs for future version `1.2.601` before build scripts mutate package versions (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare OpenRouter agent tooling release`).
16. [DONE] `openrouter-agent.phase4.release-notes.commit1` Git Commit: `docs: prepare OpenRouter agent tooling release` (hash: self)
17. [DONE] `openrouter-agent.phase4.release-artifacts.task1` Run `./scripts/build-all.sh` and `./scripts/build-release.sh --use-current-version`, then record release artifact evidence for `1.2.601` (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/tmp/releases/**, codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `build: release OpenRouter agent tooling`).
18. [DONE] `openrouter-agent.phase4.release-artifacts.commit1` Git Commit: `build: release OpenRouter agent tooling` (hash: self)

Release notes target: `1.2.601` OpenRouter Agent Tooling.

Release build evidence for `1.2.601`:
- `./scripts/build-all.sh` — PASS; provider/core/UI/launcher tarballs generated under `doc/tmp/releases/`.
- `./scripts/build-release.sh --use-current-version --allow-dirty` — PASS; verified `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, and `Package created`.
- VSIX: `codeai-hub-1.2.601.vsix` (5.6M), SHA-256 `80cb7c2669c7e7249fb03f34350cc0cd8f069f07ab7e97cae3b3d9e54b438108`.
- Runtime artifact set: `claude-module-1.2.601.tar.bz2`, `codex-module-1.2.601.tar.bz2`, `gemini-module-1.2.601.tar.bz2`, `glm-module-1.2.601.tar.bz2`, `glm-opencode-module-1.2.601.tar.bz2`, `kimi-module-1.2.601.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.601.tar.bz2`, `vscode-webview-1.2.601.tar.bz2`, `project-manager-1.2.601.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.601.tar.bz2`.

## Phase 5 - User Workflow Acceptance Testing (owner: user, updated: 2026-06-23)

### Stream: Release 1.2.601 Retest

19. [BLOCKED] `openrouter-agent.phase5.acceptance.task1` Release `1.2.601` retest found that the next-step start card inherits OpenRouter as provider but shows a Gemini model instead of the selected OpenRouter model (scope: `doc/TODO/todo-plan.md`; expected commit: `chore: record OpenRouter agent tooling acceptance`).
20. [TODO] `openrouter-agent.phase5.acceptance.commit1` Git Commit: `chore: record OpenRouter agent tooling acceptance` (hash: TBD)

### Stream: OpenRouter Start Card Fix

21. [DONE] `openrouter-agent.phase5.start-card-model.task1` Preserve OpenRouter as previous-step provider and show the OpenRouter settings model in the next-step start card instead of Gemini fallback options (scope: `src/client/project-manager/components/shared/stage-confirmation-card-workflow.ts, src/client/project-manager/components/shared/stage-start-model-selection.ts, src/client/project-manager/components/shared/stage-confirmation-card.test.ts`; expected commit: `fix(openrouter): preserve start card model selection`).
22. [DONE] `openrouter-agent.phase5.start-card-model.commit1` Git Commit: `fix(openrouter): preserve start card model selection` (hash: self)
23. [DONE] `openrouter-agent.phase5.start-card-settings.task1` Persist OpenRouter start-card model defaults through the existing workflow settings save path before launching the next step (scope: `src/client/project-manager/services/workflow-step-start-settings-defaults.ts, src/client/project-manager/services/workflow-step-start-service.settings-barrier.test.ts`; expected commit: `fix(openrouter): save start card model defaults`).
24. [DONE] `openrouter-agent.phase5.start-card-settings.commit1` Git Commit: `fix(openrouter): save start card model defaults` (hash: self)

### Stream: Hotfix Release 1.2.602

25. [DONE] `openrouter-agent.phase5.hotfix-release-plan.task1` Record the user's explicit release build confirmation and add the hotfix release-build stream for future version `1.2.602` before release notes or build scripts run (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: plan OpenRouter start-card hotfix release`).
26. [DONE] `openrouter-agent.phase5.hotfix-release-plan.commit1` Git Commit: `docs: plan OpenRouter start-card hotfix release` (hash: self)
27. [IN_PROGRESS] `openrouter-agent.phase5.hotfix-release-notes.task1` Prepare release-facing docs for future version `1.2.602` before build scripts mutate package versions (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare OpenRouter start-card hotfix release`).
28. [TODO] `openrouter-agent.phase5.hotfix-release-notes.commit1` Git Commit: `docs: prepare OpenRouter start-card hotfix release` (hash: TBD)
29. [TODO] `openrouter-agent.phase5.hotfix-release-artifacts.task1` Run `./scripts/build-all.sh` and `./scripts/build-release.sh --use-current-version`, then record release artifact evidence for `1.2.602` (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/tmp/releases/**, codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `build: release OpenRouter start-card hotfix`).
30. [TODO] `openrouter-agent.phase5.hotfix-release-artifacts.commit1` Git Commit: `build: release OpenRouter start-card hotfix` (hash: TBD)

### Stream: Hotfix Retest

31. [TODO] `openrouter-agent.phase5.acceptance-retest.task1` User verifies OpenRouter again on standalone chat and one workflow/provider-start path that needs tools after installing hotfix release `1.2.602` (scope: `doc/TODO/todo-plan.md`; expected commit: `chore: record OpenRouter agent tooling acceptance`).
32. [TODO] `openrouter-agent.phase5.acceptance-retest.commit1` Git Commit: `chore: record OpenRouter agent tooling acceptance` (hash: TBD)

## Phase 6 - Scope Closeout (owner: Codex, updated: 2026-06-23)

### Stream: Archive + planning-doc disposition

33. [TODO] `openrouter-agent.phase6.closeout.task1` After explicit user acceptance, archive this plan and decide planning-doc disposition (scope: `doc/TODO/Archive/**, doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close OpenRouter agent tooling scope`).
34. [TODO] `openrouter-agent.phase6.closeout.commit1` Git Commit: `docs: close OpenRouter agent tooling scope` (hash: TBD)
