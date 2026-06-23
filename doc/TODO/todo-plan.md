# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "openrouter-chat-provider-planning-2026-06-23",
  "branch": "main",
  "baseHead": "726892446",
  "lastRecordedCommit": "self",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/OpenRouter_ChatProvider_Planning_RU.md",
  "currentTaskId": "openrouter-chat.phase3.provider-list.task1",
  "expectedCommitMessage": "feat(openrouter): expose standalone chat provider",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/OpenRouter_ChatProvider_Planning_RU.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Modules/LocalModels.md`
  - `doc/SolidWorks-WorkFlow/Modules/GLM_Native.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Execution Rules

- **Required reading before every fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **Ponytail Hard Mode:** OpenRouter MVP is direct API chat + API key + live catalog search + optional endpoint-tag selection. No categories, no Agent SDK, no provider abstraction layer.
- Keep each implementation task scoped to no more than 3 files or packages.
- Each implementation task is followed by a separate `Git Commit: ...` line.
- Run `npm run plan:validate` before every `npm run plan:commit -- "<Expected Commit>"`.
- Targeted verification should use the smallest affected builds/tests first.
- **Release Build Confirmation Gate:** do not run `./scripts/build-all.sh` or `./scripts/build-release.sh` without separate explicit user confirmation.
- Scope Closeout runs only after explicit user acceptance.

## Phase 0 - Planning Revision (owner: Codex, updated: 2026-06-23)

### Stream: Live-search scope

1. [DONE] `openrouter-chat.phase0.revision.task1` Revise the OpenRouter planning source for live model search without categories or a separate verify button, then replace this intake plan with the implementation TODO (scope: `doc/SolidWorks-WorkFlow/Plans/OpenRouter_ChatProvider_Planning_RU.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: accept OpenRouter chat provider implementation plan`).
2. [DONE] `openrouter-chat.phase0.revision.commit1` Git Commit: `docs: accept OpenRouter chat provider implementation plan` (hash: self)
3. [DONE] `openrouter-chat.phase0.endpoints.task1` Add optional endpoint-tag selection to the OpenRouter plan: after a model is selected, Settings loads endpoint rows and can persist a chosen endpoint tag for strict routing (scope: `doc/SolidWorks-WorkFlow/Plans/OpenRouter_ChatProvider_Planning_RU.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: add OpenRouter endpoint selection to plan`).
4. [DONE] `openrouter-chat.phase0.endpoints.commit1` Git Commit: `docs: add OpenRouter endpoint selection to plan` (hash: self)

## Phase 1 - Core Transport (owner: Codex, updated: 2026-06-23)

### Stream: OpenRouter chat adapter

5. [DONE] `openrouter-chat.phase1.transport.task1` Add a minimal OpenRouter chat completion adapter and SSE reader for `/api/v1/chat/completions`; include selected endpoint tag as `provider.order = [tag]` with `allow_fallbacks: false` only when the user explicitly selected an endpoint (scope: `packages/core/src/open-router/**`; expected commit: `feat(openrouter): add chat completion transport`).
6. [DONE] `openrouter-chat.phase1.transport.commit1` Git Commit: `feat(openrouter): add chat completion transport` (hash: self)
7. [DONE] `openrouter-chat.phase1.registry.task1` Register the `openRouter` provider descriptor and model binding capabilities for standalone chat (scope: `packages/core/src/provider-registry/provider-descriptor-factory.ts, packages/core/src/provider-registry/provider-module-loader.types.ts, packages/core/src/open-router/**`; expected commit: `feat(openrouter): register provider descriptor`).
8. [DONE] `openrouter-chat.phase1.registry.commit1` Git Commit: `feat(openrouter): register provider descriptor` (hash: self)

## Phase 2 - Settings And Catalog Search (owner: Codex, updated: 2026-06-23)

### Stream: Settings state

9. [DONE] `openrouter-chat.phase2.settings-state.task1` Add `providers.openRouter` settings with `apiKey`, optional `baseUrl`, `defaultModel`, and optional `endpointTag` normalization (scope: `src/client/ui/src/components/settings/**, media/react-chat.js`; expected commit: `feat(openrouter): add settings state`).
10. [DONE] `openrouter-chat.phase2.settings-state.commit1` Git Commit: `feat(openrouter): add settings state` (hash: self)
11. [DONE] `openrouter-chat.phase2.catalog.task1` Add catalog and endpoint helpers that load `/api/v1/models`, optionally `/api/v1/models/user`, load selected-model endpoints, rank exact slug matches first, and never persist fetched catalogs/endpoints (scope: `src/client/ui/src/components/settings/openrouter-model-search.ts, src/client/ui/src/components/settings/openrouter-model-search.test.ts, doc/TODO/todo-plan.md`; expected commit: `feat(openrouter): add live model search`).
12. [DONE] `openrouter-chat.phase2.catalog.commit1` Git Commit: `feat(openrouter): add live model search` (hash: self)
13. [DONE] `openrouter-chat.phase2.settings-ui.task1` Add an OpenRouter Settings tab with API key field, model search input, DOM-owned model results, selected model row, and endpoint rows displayed as `Provider - endpointTag` (scope: `src/client/ui/src/components/settings/**, src/client/project-manager/components/settings/use-project-manager-settings-state.ts, media/**`; expected commit: `feat(openrouter): add settings model picker`).
14. [DONE] `openrouter-chat.phase2.settings-ui.commit1` Git Commit: `feat(openrouter): add settings model picker` (hash: self)

## Phase 3 - Standalone Chat Binding (owner: Codex, updated: 2026-06-23)

### Stream: Chat provider selection

15. [IN_PROGRESS] `openrouter-chat.phase3.provider-list.task1` Include `openRouter` in standalone chat provider lists without enabling managed workflow stages (scope: `src/client/project-manager/services/provider-snapshot.ts, src/client/project-manager/services/workflow-provider-resolver.ts, src/client/ui/src/session/session-candidates.ts`; expected commit: `feat(openrouter): expose standalone chat provider`).
16. [TODO] `openrouter-chat.phase3.provider-list.commit1` Git Commit: `feat(openrouter): expose standalone chat provider` (hash: TBD)
17. [TODO] `openrouter-chat.phase3.binding.task1` Persist the selected OpenRouter model slug and optional endpoint tag into new-session binding/config, and display both in session UI when available (scope: `src/client/project-manager/services/workflow-step-start-settings-defaults.ts, src/client/ui/src/session/model-info-builder.ts, src/client/ui/src/session/status-panel.tsx`; expected commit: `feat(openrouter): bind selected chat model`).
18. [TODO] `openrouter-chat.phase3.binding.commit1` Git Commit: `feat(openrouter): bind selected chat model` (hash: TBD)

## Phase 4 - Documentation And Verification (owner: Codex, updated: 2026-06-23)

### Stream: SSOT sync and targeted checks

19. [TODO] `openrouter-chat.phase4.docs.task1` Document the implemented OpenRouter standalone chat/provider contract in SSOT docs (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md, doc/SolidWorks-WorkFlow/Plans/OpenRouter_ChatProvider_Planning_RU.md`; expected commit: `docs: document OpenRouter chat provider contract`).
20. [TODO] `openrouter-chat.phase4.docs.commit1` Git Commit: `docs: document OpenRouter chat provider contract` (hash: TBD)
21. [TODO] `openrouter-chat.phase4.verify.task1` Run targeted OpenRouter/settings tests and affected builds; record evidence in this plan (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify OpenRouter chat provider`).
22. [TODO] `openrouter-chat.phase4.verify.commit1` Git Commit: `test: verify OpenRouter chat provider` (hash: TBD)

## Phase 5 - Release Build (owner: Codex, updated: 2026-06-23)

### Stream: Release after explicit confirmation

23. [TODO] `openrouter-chat.phase5.release-docs.task1` After explicit user confirmation, prepare README/CHANGELOG for the next release version (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare OpenRouter provider release`).
24. [TODO] `openrouter-chat.phase5.release-docs.commit1` Git Commit: `docs: prepare OpenRouter provider release` (hash: TBD)
25. [TODO] `openrouter-chat.phase5.release-build.task1` Run the approved release scripts and commit generated version/manifests/artifacts/evidence (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/tmp/releases/**, *.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: build OpenRouter provider release`).
26. [TODO] `openrouter-chat.phase5.release-build.commit1` Git Commit: `chore: build OpenRouter provider release` (hash: TBD)

## Phase 6 - User Workflow Acceptance Testing (owner: user, updated: 2026-06-23)

### Stream: OpenRouter chat retest

27. [TODO] `openrouter-chat.phase6.acceptance.task1` User verifies OpenRouter Settings API key, live model search, endpoint row selection, exact slug selection, and one standalone chat with a selected model/endpoint (scope: `doc/TODO/todo-plan.md`; expected commit: `chore: record OpenRouter provider user acceptance`).
28. [TODO] `openrouter-chat.phase6.acceptance.commit1` Git Commit: `chore: record OpenRouter provider user acceptance` (hash: TBD)

## Phase 7 - Scope Closeout (owner: Codex, updated: 2026-06-23)

### Stream: Archive + planning-doc disposition

29. [TODO] `openrouter-chat.phase7.closeout.task1` After explicit user acceptance, archive this plan and decide planning-doc disposition (scope: `doc/TODO/Archive/**, doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close OpenRouter chat provider scope`).
30. [TODO] `openrouter-chat.phase7.closeout.commit1` Git Commit: `docs: close OpenRouter chat provider scope` (hash: TBD)
