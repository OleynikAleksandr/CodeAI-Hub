# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "glm-opencode-provider-2026-06-16",
  "branch": "codex/audit-gates-cleanup",
  "baseHead": "3ec494bc4",
  "lastRecordedCommit": "a22ac5e41",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/GLM_OpenCode_Provider_Planning_RU.md",
  "currentTaskId": "phase1.stream9p.task2",
  "expectedCommitMessage": "chore: build opencode token usage release",
  "debt": {
    "expectedCommitMessage": "chore: build opencode token usage release",
    "preCommitHead": "a22ac5e41",
    "stage": "commit_pending",
    "taskId": "phase1.stream9p.task2"
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
  - `doc/SolidWorks-WorkFlow/Modules/GLM_OpenCode.md`
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
26. [DONE] `phase1.stream9a.commit1` Git Commit: `fix: restore opencode reasoning events` (hash: ec2403c85)

### Stream: OpenCode Canonical Rename And Defaults

27. [DONE] `phase1.stream9b.task1` Rename the OpenCode provider runtime/config home from `glm-opencode` to canonical `opencode`, migrate user-facing defaults to selector-aware Settings UX, and keep compatibility with existing `glm-opencode` installs and workspace capsules. (scope: `packages/GLM_OpenCode_Module/**, packages/core/src/**, src/client/ui/src/components/settings/**, src/client/project-manager/**, assets/providers/glm-opencode/**, scripts/build-*.sh, doc/TODO/todo-plan.md`; expected commit: `refactor: rename glm opencode runtime to opencode`)
28. [DONE] `phase1.stream9b.commit1` Git Commit: `refactor: rename glm opencode runtime to opencode` (hash: 25b02d160)

### Stream: Remove Deprecated GLM Provider

29. [DONE] `phase1.stream9c.task1` Remove the deprecated Claude-compatible GLM provider from Core registries, UI/Project Manager surfaces, packaging/runtime artifacts, provider capture paths, release scripts, active SSOT docs, live release notes, and the Core workspace type-resolution contract needed after provider deletion. (scope: `packages/Claude_Module/**, packages/core/src/**, packages/core/tsconfig.json, src/**, assets/providers/**, scripts/**, doc/**, README.md, CHANGELOG.md, media/react-chat.js, package.json, package-lock.json, doc/TODO/todo-plan.md`; expected commit: `refactor: remove glm claude code provider`)
30. [DONE] `phase1.stream9c.commit1` Git Commit: `refactor: remove glm claude code provider` (hash: fe1aaaa9a)

### Stream: Post-Fix Release Rebuild

31. [DONE] `phase1.stream9d.task1` Prepare release notes for the confirmed post-fix OpenCode cleanup release before version bump/build. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare opencode cleanup release notes`)
32. [DONE] `phase1.stream9d.commit1` Git Commit: `docs: prepare opencode cleanup release notes` (hash: 9e5e7fed2)
33. [DONE] `phase1.stream9d.task2` Build the confirmed post-fix release with OpenCode cleanup packaged and record release artifacts. (scope: `package.json, package-lock.json, .vscodeignore, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases/**, media/react-chat.js, doc/TODO/todo-plan.md`; expected commit: `chore: build opencode cleanup release`)
    - Result 2026-06-16: `./scripts/build-all.sh --allow-dirty` passed and prepared unified version `1.2.528`.
    - Tarballs staged in `doc/tmp/releases/`: `claude-module-1.2.528.tar.bz2`, `codex-module-1.2.528.tar.bz2`, `gemini-module-1.2.528.tar.bz2`, `glm-opencode-module-1.2.528.tar.bz2`, `kimi-module-1.2.528.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.528.tar.bz2`, `vscode-webview-1.2.528.tar.bz2`, `project-manager-1.2.528.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.528.tar.bz2`.
    - Result 2026-06-16: `./scripts/build-release.sh --use-current-version --allow-dirty` passed; required output observed: `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`, `✅ VSIX runtime package surface verified`.
    - VSIX created at repository root: `codeai-hub-1.2.528.vsix` (`5.3M`).
34. [DONE] `phase1.stream9d.commit2` Git Commit: `chore: build opencode cleanup release` (hash: f893f53b7)

### Stream: User Workflow Acceptance Testing

35. [TODO] `phase1.stream9.task1` Wait for user retest that `OpenCode` is selectable, emits translated reasoning when enabled, and switches correctly between GLM/Kimi selectors without exposing the removed deprecated provider. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record opencode wrapper acceptance`)
36. [TODO] `phase1.stream9.commit1` Git Commit: `docs: record opencode wrapper acceptance` (hash: TBD)

### Stream: OpenCode SSE Transport

37. [DONE] `phase1.stream9e.task1` Replace the current OpenCode CLI `run --format json` wrapper path with OpenCode server/SSE transport, adopt the official `@opencode-ai/sdk` client package, and expose OpenCode SDK version diagnostics in Settings alongside the CLI version. (scope: `packages/GLM_OpenCode_Module/**, packages/core/src/remote-bridge/handlers/settings-provider-version-service.ts, src/client/ui/src/components/settings/provider-versions*.tsx, src/client/ui/src/components/settings/provider-versions-model.ts, package-lock.json, doc/TODO/todo-plan.md`; expected commit: `feat: switch opencode wrapper to server sse transport`)
38. [DONE] `phase1.stream9e.commit1` Git Commit: `feat: switch opencode wrapper to server sse transport` (hash: db461d935)

### Stream: OpenCode SSE Verification

39. [DONE] `phase1.stream9f.task1` Record targeted verification for the SSE-backed OpenCode wrapper, including live reasoning-stream evidence for GLM and Kimi selectors. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record opencode sse verification`)
    - Targeted checks completed: `npm run build --workspace=@codeai-hub/glm-opencode-module` ✅, `node --test packages/GLM_OpenCode_Module/dist/provider/*.test.js` ✅ (13/13), `npm run build --workspace=@codeai-hub/core` ✅, `npm run typecheck:webview` ✅, `npx ultracite check ...` ✅, `npm run check:knip` ✅.
    - SDK/runtime verification: OpenCode wrapper now loads `@opencode-ai/sdk/v2` through native dynamic import, avoiding the CommonJS `ERR_PACKAGE_PATH_NOT_EXPORTED` failure that occurred when TypeScript lowered `import()` to `require(...)`.
    - Direct server/SSE evidence after the transport rewrite: raw `/event` stream emitted `message.part.delta` frames for assistant text and reasoning parts; the wrapper now consumes those deltas instead of waiting for a single late `message.part.updated` snapshot.
    - Live adapter smoke on committed tree (`workspace=/Users/oleksandroliinyk/VSCODE/FinderWidget-Test01`): `glm-5.2` produced `assistant live` chunks at ~6438ms (`"GRE"`, `"ATER"`), then a `thinking` event at ~6534ms with the arithmetic reasoning summary, then final `assistant`=`GREATER` and `turn_completed`.
    - Live adapter smoke on committed tree (`workspace=/Users/oleksandroliinyk/VSCODE/FinderWidget-Test01`): `kimi-k2.7-code` produced `assistant live` chunks at ~4569ms (`"GRE"`, `"ATER"`), then a `thinking` event at ~4669ms with the arithmetic reasoning summary, then final `assistant`=`GREATER` and `turn_completed`.
40. [DONE] `phase1.stream9f.commit1` Git Commit: `docs: record opencode sse verification` (hash: ce943ba63)

### Stream: SSE Release Build

41. [DONE] `phase1.stream9g.task1` Prepare release notes for the confirmed OpenCode SSE transport release before version bump/build. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare opencode sse release notes`)
42. [DONE] `phase1.stream9g.commit1` Git Commit: `docs: prepare opencode sse release notes` (hash: 8c86e0af6)
43. [DONE] `phase1.stream9g.task2` Build the confirmed OpenCode SSE transport release and record artifacts for user retest. (scope: `package.json, package-lock.json, .vscodeignore, packages/**/package.json, assets/**/manifest.json, media/react-chat.js, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build opencode sse release`)
44. [DONE] `phase1.stream9g.commit2` Git Commit: `chore: build opencode sse release` (hash: 7bf61d79f)

### Stream: OpenCode Localization Guard

45. [DONE] `phase1.stream9h.task1` Prevent duplicate localization overlays for OpenCode dialog content by skipping translation when the source text already matches the target Russian chat language and by rejecting translation outputs that leak `__CODEAI_HUB_LOCALIZATION_ENTRY__` markers. (scope: `packages/core/src/session-translation/**, doc/TODO/todo-plan.md`; expected commit: `fix: guard opencode duplicate localization`)
46. [DONE] `phase1.stream9h.commit1` Git Commit: `fix: guard opencode duplicate localization` (hash: 0c362e41d)

### Stream: Localization Fix Release Build

47. [DONE] `phase1.stream9i.task1` Prepare release notes for the confirmed OpenCode localization-guard fix release before version bump/build. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare opencode localization fix release notes`)
48. [DONE] `phase1.stream9i.commit1` Git Commit: `docs: prepare opencode localization fix release notes` (hash: 68f874c03)
49. [DONE] `phase1.stream9i.task2` Build the confirmed OpenCode localization-guard release and record artifacts for user retest. (scope: `package.json, package-lock.json, .vscodeignore, packages/**/package.json, assets/**/manifest.json, media/react-chat.js, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build opencode localization fix release`)
50. [DONE] `phase1.stream9i.commit2` Git Commit: `chore: build opencode localization fix release` (hash: 56b0d2a76)

### Stream: Thinking-Only Session Translation

51. [DONE] `phase1.stream9j.task1` Restrict session overlay translation to thinking/syncing messages only so ordinary provider replies stay on the prompt-selected language without post-hoc localization. (scope: `packages/core/src/session-translation/**, packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.ts, packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: restrict session translation to thinking`)
52. [DONE] `phase1.stream9j.commit1` Git Commit: `fix: restrict session translation to thinking` (hash: 8946b0d50)
53. [DONE] `phase1.stream9j.task2` Record targeted verification that OpenCode/Kimi assistant replies no longer receive overlays while thinking translation still works. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record thinking-only translation verification`)
    - Completed checks: `npx ultracite check packages/core/src/session-translation/session-translation-dispatcher.ts packages/core/src/session-translation/session-translation-dispatcher.test.ts packages/core/src/session-translation/session-translation-facade.test.ts packages/core/src/session-translation/session-translation-facade.localization-guards.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.ts packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.test.ts` ✅.
    - Build verification: `npm run build --workspace=@codeai-hub/core` ✅.
    - Runtime contract verification: `node --test packages/core/dist/session-translation/session-translation-dispatcher.test.js packages/core/dist/session-translation/session-translation-facade.test.js packages/core/dist/session-translation/session-translation-facade.localization-guards.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-event-messages.test.js` ✅ (17/17).
    - Coverage focus: ordinary `assistant` replies and Core validation/system messages no longer enter overlay translation; `thinking` messages still route through translation with provider-specific settings paths for both Kimi and OpenCode.
54. [DONE] `phase1.stream9j.commit2` Git Commit: `docs: record thinking-only translation verification` (hash: 6c9594bf0)

### Stream: OpenCode Default Model Setting

55. [DONE] `phase1.stream9k.task1` Add a Settings default model selector for OpenCode so questionnaire submission uses the chosen GLM or Kimi selector when no per-step card override is made. (scope: `src/client/ui/src/components/settings/glm-opencode-settings-card.tsx, src/client/ui/src/components/settings/kimi-settings-state.ts, src/client/ui/src/components/settings/settings-state-helpers.persistence.test.ts, doc/TODO/todo-plan.md`; expected commit: `feat: add opencode default model setting`)
56. [DONE] `phase1.stream9k.commit1` Git Commit: `feat: add opencode default model setting` (hash: 7d2f16f9e)
57. [DONE] `phase1.stream9k.task2` Record targeted Settings/OpenCode default-model verification. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record opencode default model setting verification`)
    - Completed checks: `npx ultracite check src/client/ui/src/components/settings/glm-opencode-settings-card.tsx src/client/ui/src/components/settings/kimi-settings-state.ts src/client/ui/src/components/settings/settings-state-helpers.persistence.test.ts` ✅.
    - Build verification: `npm run typecheck:webview` ✅, `npm run build:webview` ✅, `npm run build:project-manager` ✅.
    - Hook verification: `npm run plan:commit -- "feat: add opencode default model setting"` completed the feature commit with architecture, lint, and knip gates green.
    - Coverage focus: OpenCode Settings now exposes the supported default selectors `GLM 5.2` and `Kimi K2.7`; settings mapping preserves Kimi, rejects unsupported selectors back to GLM, and questionnaire submission continues to read `settings.providers.glmOpenCode.defaultModel` when a card override is not provided.
58. [DONE] `phase1.stream9k.commit2` Git Commit: `docs: record opencode default model setting verification` (hash: 87712bbbf)

### Stream: OpenCode Default Model Release Build

59. [DONE] `phase1.stream9l.task1` Prepare release notes for the confirmed OpenCode default-model release before version bump/build. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare opencode default model release notes`)
60. [DONE] `phase1.stream9l.commit1` Git Commit: `docs: prepare opencode default model release notes` (hash: 26eae50b8)
61. [DONE] `phase1.stream9l.task2` Build the confirmed OpenCode default-model release and record artifacts for user retest. (scope: `package.json, package-lock.json, .vscodeignore, packages/**/package.json, assets/**/manifest.json, media/react-chat.js, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build opencode default model release`)
    - Result 2026-06-16: `./scripts/build-all.sh --allow-dirty` passed and prepared unified version `1.2.531`.
    - Tarballs staged in `doc/tmp/releases/`: `claude-module-1.2.531.tar.bz2`, `codex-module-1.2.531.tar.bz2`, `gemini-module-1.2.531.tar.bz2`, `glm-opencode-module-1.2.531.tar.bz2`, `kimi-module-1.2.531.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.531.tar.bz2`, `vscode-webview-1.2.531.tar.bz2`, `project-manager-1.2.531.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.531.tar.bz2`.
    - Result 2026-06-16: `./scripts/build-release.sh --use-current-version --allow-dirty` passed; required output observed: `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`, `✅ VSIX runtime package surface verified`.
    - VSIX created at repository root: `codeai-hub-1.2.531.vsix` (`5.4M`).
62. [DONE] `phase1.stream9l.commit2` Git Commit: `chore: build opencode default model release` (hash: 41f33c1d4)

### Stream: Mixed Reasoning Translation Repair

63. [DONE] `phase1.stream9m.task1` Remove the target-language guard from the reasoning translation path so mixed English/Russian Kimi/OpenCode reasoning chunks still reach the selected reasoning translator. (scope: `packages/core/src/session-translation/session-translation-facade.ts, packages/core/src/session-translation/session-translation-facade.test.ts, packages/core/src/session-translation/session-translation-facade.mixed-reasoning.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: translate mixed reasoning chunks`)
64. [DONE] `phase1.stream9m.commit1` Git Commit: `fix: translate mixed reasoning chunks` (hash: abc8680d6)
65. [DONE] `phase1.stream9m.task2` Record targeted verification and release-build evidence for the mixed reasoning translation fix. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare mixed reasoning translation release`)
    - Result 2026-06-16: `npx ultracite check packages/core/src/session-translation/session-translation-facade.ts packages/core/src/session-translation/session-translation-facade.test.ts packages/core/src/session-translation/session-translation-facade.mixed-reasoning.test.ts` passed.
    - Result 2026-06-16: `npm run build --workspace=@codeai-hub/core` passed after the OpenCode module dist had been rebuilt.
    - Result 2026-06-16: `node --test packages/core/dist/session-translation/session-translation-facade.test.js packages/core/dist/session-translation/session-translation-facade.mixed-reasoning.test.js packages/core/dist/session-translation/session-translation-facade.localization-guards.test.js packages/core/dist/session-translation/session-translation-dispatcher.test.js` passed.
    - Result 2026-06-16: `node --test packages/GLM_OpenCode_Module/dist/provider/*.test.js` passed.
66. [DONE] `phase1.stream9m.commit2` Git Commit: `docs: prepare mixed reasoning translation release` (hash: 39f568f76)
67. [DONE] `phase1.stream9m.task3` Build the confirmed mixed reasoning translation release and record artifacts for user retest. (scope: `package.json, package-lock.json, .vscodeignore, packages/**/package.json, assets/**/manifest.json, media/react-chat.js, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build mixed reasoning translation release`)
    - Result 2026-06-16: `./scripts/build-all.sh --allow-dirty` passed and prepared unified version `1.2.532`.
    - Tarballs staged in `doc/tmp/releases/`: `claude-module-1.2.532.tar.bz2`, `codex-module-1.2.532.tar.bz2`, `gemini-module-1.2.532.tar.bz2`, `glm-opencode-module-1.2.532.tar.bz2`, `kimi-module-1.2.532.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.532.tar.bz2`, `vscode-webview-1.2.532.tar.bz2`, `project-manager-1.2.532.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.532.tar.bz2`.
    - Result 2026-06-16: `./scripts/build-release.sh --use-current-version --allow-dirty` passed; required output observed: `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`, `✅ VSIX runtime package surface verified`.
    - VSIX created at repository root: `codeai-hub-1.2.532.vsix` (`5.4M`).
68. [DONE] `phase1.stream9m.commit3` Git Commit: `chore: build mixed reasoning translation release` (hash: 5190ba5cd)

### Stream: Thinking Typography Polish

69. [DONE] `phase1.stream9n.task1` Make markdown headings inside Thinking/Reasoning bubbles compact bold section labels instead of large document headings. (scope: `media/session-view.css, doc/TODO/todo-plan.md`; expected commit: `fix: compact thinking markdown headings`)
70. [DONE] `phase1.stream9n.commit1` Git Commit: `fix: compact thinking markdown headings` (hash: 73189c74f)

### Stream: OpenCode Token Usage Status

71. [DONE] `phase1.stream9o.task1` Report OpenCode end-of-turn token usage to the existing session status panel for GLM and Kimi OpenCode selectors. (scope: `packages/GLM_OpenCode_Module/src/provider/glm-opencode-sse-processor.ts, packages/GLM_OpenCode_Module/src/provider/glm-opencode-turn-stream.ts, packages/GLM_OpenCode_Module/src/provider/glm-opencode-output-normalizer.ts, packages/GLM_OpenCode_Module/src/provider/glm-opencode-sse-processor.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: report opencode token usage`)
    - Result 2026-06-16: `npx ultracite check packages/GLM_OpenCode_Module/src/provider/glm-opencode-sse-processor.ts packages/GLM_OpenCode_Module/src/provider/glm-opencode-turn-stream.ts packages/GLM_OpenCode_Module/src/provider/glm-opencode-sse-processor.test.ts packages/GLM_OpenCode_Module/src/provider/glm-opencode-output-normalizer.ts` passed.
    - Result 2026-06-16: `npm run build --workspace=@codeai-hub/glm-opencode-module` passed.
    - Result 2026-06-16: `node --test packages/GLM_OpenCode_Module/dist/provider/*.test.js` passed (16/16).
72. [DONE] `phase1.stream9o.commit1` Git Commit: `fix: report opencode token usage` (hash: a6bb66c6b)

### Stream: OpenCode Token Usage Release Build

73. [DONE] `phase1.stream9p.task1` Prepare release notes for the confirmed OpenCode token-usage release before version bump/build. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare opencode token usage release`)
74. [DONE] `phase1.stream9p.commit1` Git Commit: `docs: prepare opencode token usage release` (hash: a22ac5e41)
75. [DONE] `phase1.stream9p.task2` Build the confirmed OpenCode token-usage release and record artifacts for user retest. (scope: `package.json, package-lock.json, .vscodeignore, packages/**/package.json, assets/**/manifest.json, media/react-chat.js, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build opencode token usage release`)
    - Result 2026-06-16: `./scripts/build-all.sh --allow-dirty` passed and prepared unified version `1.2.533`.
    - Tarballs staged in `doc/tmp/releases/`: `claude-module-1.2.533.tar.bz2`, `codex-module-1.2.533.tar.bz2`, `gemini-module-1.2.533.tar.bz2`, `glm-opencode-module-1.2.533.tar.bz2`, `kimi-module-1.2.533.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.533.tar.bz2`, `vscode-webview-1.2.533.tar.bz2`, `project-manager-1.2.533.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.533.tar.bz2`.
    - Result 2026-06-16: `./scripts/build-release.sh --use-current-version --allow-dirty` passed; required output observed: `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`, `✅ VSIX runtime package surface verified`.
    - VSIX created at repository root: `codeai-hub-1.2.533.vsix` (`5.4M`).
76. [PENDING] `phase1.stream9p.commit2` Git Commit: `chore: build opencode token usage release` (hash: TBD)

### Stream: Scope Closeout

77. [TODO] `phase1.stream10.task1` Close the GLM-OpenCode scope after user acceptance and archive/update planning documentation. (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close glm opencode scope`)
78. [TODO] `phase1.stream10.commit1` Git Commit: `docs: close glm opencode scope` (hash: TBD)
79. [TODO] `phase1.stream10.task2` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
