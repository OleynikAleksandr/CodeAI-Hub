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
  "currentTaskId": "openrouter-agent.phase4.acceptance.task1",
  "expectedCommitMessage": "chore: record OpenRouter agent tooling acceptance",
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

## Phase 4 - User Workflow Acceptance Testing (owner: user, updated: 2026-06-23)

### Stream: Retest

13. [IN_PROGRESS] `openrouter-agent.phase4.acceptance.task1` User verifies OpenRouter with at least one free model on standalone chat and one workflow/provider-start path that needs tools (scope: `doc/TODO/todo-plan.md`; expected commit: `chore: record OpenRouter agent tooling acceptance`).
14. [TODO] `openrouter-agent.phase4.acceptance.commit1` Git Commit: `chore: record OpenRouter agent tooling acceptance` (hash: TBD)

## Phase 5 - Scope Closeout (owner: Codex, updated: 2026-06-23)

### Stream: Archive + planning-doc disposition

15. [TODO] `openrouter-agent.phase5.closeout.task1` After explicit user acceptance, archive this plan and decide planning-doc disposition (scope: `doc/TODO/Archive/**, doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close OpenRouter agent tooling scope`).
16. [TODO] `openrouter-agent.phase5.closeout.commit1` Git Commit: `docs: close OpenRouter agent tooling scope` (hash: TBD)
