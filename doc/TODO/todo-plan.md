# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "gemini-removal-2026-06-24",
  "branch": "main",
  "baseHead": "6d7826ade",
  "lastRecordedCommit": "self",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Gemini_Removal_Planning_RU.md",
  "currentTaskId": "gemini-removal.phase2.release-build-confirmation.task1",
  "expectedCommitMessage": "chore: record Gemini release build confirmation",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Gemini_Removal_Planning_RU.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Contracts/ProviderFailure_Recovery_And_ProviderSwitch.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
- Only this list is the document source for restoring this execution cycle's context.

## Execution Rules

- **Required reading before every fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **Goal:** fully remove the Gemini provider (code, SDK, package, UI, settings, build, docs); then re-run `npm audit` and build a Gemini-free release.
- **Removal order:** UI consumers -> extension-module settings -> core registration/config/remote-bridge/usage-limits -> narrow shared union types last -> delete `Gemini_Module` + SDK + build scripts -> documentation. Remove a Gemini file together with its usages so `knip` does not flag orphaned exports.
- Keep each implementation task scoped to no more than 3 files or packages.
- Each implementation task is followed by a separate `Git Commit: ...` line.
- The plan grows incrementally: add the next task before committing the current one; never leave a committed task without a following task.
- Run `npm run plan:validate` before every `npm run plan:commit -- "<Expected Commit>"`.
- Targeted verification uses the smallest affected tests/builds first.
- **Release Build Confirmation Gate:** do not run `./scripts/build-all.sh` or `./scripts/build-release.sh` without separate explicit user confirmation.
- Scope Closeout runs only after explicit user acceptance.

## Phase 0 - Planning Intake (owner: CodeAI Hub Bot, updated: 2026-06-24)

### Stream: Accepted scope

1. [DONE] `gemini-removal.phase0.plan.task1` Create the Gemini removal planning source and active todo-plan for the accepted full-removal scope (scope: `doc/SolidWorks-WorkFlow/Plans/Gemini_Removal_Planning_RU.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan Gemini removal`).
2. [DONE] `gemini-removal.phase0.plan.commit1` Git Commit: `docs: plan Gemini removal` (hash: self)

## Phase 1 - UI Provider Surface (owner: CodeAI Hub Bot, updated: 2026-06-24)

### Stream: Capture workbench

3. [DONE] `gemini-removal.phase1.capture-selector.task1` Remove the disabled Gemini option and tooltip from the capture workbench provider selector and update its selection-bar test (scope: `src/client/project-manager/components/capture-workbench/provider-selector.tsx, src/client/project-manager/components/capture-workbench/selection-bar.test.tsx`; expected commit: `refactor: drop Gemini from capture workbench selector`).
4. [DONE] `gemini-removal.phase1.capture-selector.commit1` Git Commit: `refactor: drop Gemini from capture workbench selector` (hash: self)

### Stream: Workspace tree provider surfaces

5. [DONE] `gemini-removal.phase1.workspace-tree.task1` Remove the `geminiCli` branch from the workspace tree branch-node title resolvers (runtime string checks; `use-step-provider-resolver.ts` deferred to the union-type phase because of the `Record<ProviderStackId,...>` exhaustiveness) (scope: `src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts, src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.ts`; expected commit: `refactor: drop Gemini from workspace tree resolvers`).
6. [DONE] `gemini-removal.phase1.workspace-tree.commit1` Git Commit: `refactor: drop Gemini from workspace tree resolvers` (hash: self)

### Stream: Start card model selection

7. [DONE] `gemini-removal.phase1.start-card.task1` Remove the `geminiCli` provider case and Gemini default/fallback model branches from the workflow start-card model selection (scope: `src/client/project-manager/components/shared/stage-start-model-selection.ts`; expected commit: `refactor: drop Gemini from start card model selection`).
8. [DONE] `gemini-removal.phase1.start-card.commit1` Git Commit: `refactor: drop Gemini from start card model selection` (hash: self)

### Stream: Stage confirmation card

9. [DONE] `gemini-removal.phase1.stage-card.task1` Remove the `geminiCli` branch from the stage-confirmation-card provider-stack guards (`stage-confirmation-card-provider-tint.ts` deferred to the union-type phase because of the `Record<ProviderStackId,...>` exhaustiveness) (scope: `src/client/project-manager/components/shared/stage-confirmation-card-workflow.ts, src/client/project-manager/components/shared/stage-confirmation-card.tsx`; expected commit: `refactor: drop Gemini from stage confirmation card`).
10. [DONE] `gemini-removal.phase1.stage-card.commit1` Git Commit: `refactor: drop Gemini from stage confirmation card` (hash: self)

### Stream: Session theme and model helpers

11. [DONE] `gemini-removal.phase1.session-theme.task1` Remove Gemini from the session provider theme, model-info builder and session candidates, plus the dialog-panel theme test it feeds (scope: `src/client/ui/src/session/helpers.ts, src/client/ui/src/session/model-info-builder.ts, src/client/ui/src/session/session-candidates.ts, src/client/ui/src/session/dialog-panel-message-utils.test.ts`; expected commit: `refactor: drop Gemini from session theme helpers`).
12. [DONE] `gemini-removal.phase1.session-theme.commit1` Git Commit: `refactor: drop Gemini from session theme helpers` (hash: self)

### Stream: Session status panel

13. [DONE] `gemini-removal.phase1.session-status.task1` Remove the Gemini label-prefix and fallback-label branches from the session id bar (`status-panel.tsx` `Record<ProviderStackId,...>` button-class map and its `--gemini` CSS class deferred to the union-type/CSS phase) (scope: `src/client/ui/src/session/session-id-bar.tsx`; expected commit: `refactor: drop Gemini from session status panel`).
14. [DONE] `gemini-removal.phase1.session-status.commit1` Git Commit: `refactor: drop Gemini from session status panel` (hash: self)

### Stream: Project-manager provider services

15. [DONE] `gemini-removal.phase1.pm-services.task1` Remove Gemini from the project-manager provider snapshot list and usage-limits stream prefix (`workflow-provider-resolver.ts` guard + its `geminiCli`-protagonist test deferred to the union-type phase) (scope: `src/client/project-manager/services/provider-snapshot.ts, src/client/project-manager/components/sessions/usage-limits-stream.ts`; expected commit: `refactor: drop Gemini from PM provider services`).
16. [DONE] `gemini-removal.phase1.pm-services.commit1` Git Commit: `refactor: drop Gemini from PM provider services` (hash: self)

### Stream: Settings provider tab

17. [DONE] `gemini-removal.phase1.settings-tab.task1` Remove the Gemini settings tab from the settings provider tab content and delete the now-orphaned gemini-default-model card directory; settings-state types/helpers and gemini-mapping follow once no reader remains (scope: `src/client/ui/src/components/settings/settings-provider-tab-content.tsx, src/client/ui/src/components/settings/gemini-default-model/**`; expected commit: `refactor: drop Gemini settings provider tab`).
18. [DONE] `gemini-removal.phase1.settings-tab.commit1` Git Commit: `refactor: drop Gemini settings provider tab` (hash: self)

### Stream: Settings handlers

19. [DONE] `gemini-removal.phase1.settings-handlers.task1` Remove the Gemini update helpers and the handlers that wire them from the webview settings state hook and its project-manager mirror and start-settings consumer (scope: `src/client/ui/src/components/settings/settings-state-helpers.ts, src/client/ui/src/components/settings/use-settings-state.ts, src/client/ui/src/components/settings/use-settings-state-support.ts, src/client/project-manager/components/settings/use-project-manager-settings-state.ts, src/client/project-manager/services/workflow-step-start-settings-defaults.ts`; expected commit: `refactor: drop Gemini settings handlers`).
20. [DONE] `gemini-removal.phase1.settings-handlers.commit1` Git Commit: `refactor: drop Gemini settings handlers` (hash: self)

### Stream: Settings state model and mapping

21. [DONE] `gemini-removal.phase1.settings-types.task1` Drop the required `gemini` settings field, its type/defaults/equality from the settings state model and raw types, delete gemini-mapping, and remove Gemini from the four settings/workflow tests whose fixtures must match the type (cascading type change) (scope: `src/client/ui/src/components/settings/settings-state-model.ts, src/client/ui/src/components/settings/settings-state-raw.ts, src/client/ui/src/components/settings/gemini-mapping.ts, src/client/project-manager/services/workflow-step-start-service.gating.test.ts, src/client/project-manager/services/workflow-step-start-service.settings-barrier.test.ts, src/client/ui/src/components/settings/settings-auto-update-defaults.test.ts, src/client/ui/src/session/thinking-display-policy.test.tsx, src/client/ui/src/components/settings/provider-versions-ui.tsx, src/client/ui/src/components/settings/provider-versions.tsx, src/client/ui/src/components/settings/provider-versions-model.ts, src/client/project-manager/api.ts, src/types/gemini-model-registry.ts`; expected commit: `refactor: drop Gemini settings state model`).
22. [DONE] `gemini-removal.phase1.settings-types.commit1` Git Commit: `refactor: drop Gemini settings state model` (hash: self)

### Stream: Provider type registry

23. [DONE] `gemini-removal.phase1.provider-types.task1` Remove geminiCli from the KnownProviderStackId union and title/description maps in the shared provider type and from the core-bridge constants (scope: `src/types/provider.ts, src/client/ui/src/core-bridge/constants.ts`; expected commit: `refactor: drop Gemini from provider type registry`).
24. [DONE] `gemini-removal.phase1.provider-types.commit1` Git Commit: `refactor: drop Gemini from provider type registry` (hash: self)

### Stream: Session status panel button class

25. [DONE] `gemini-removal.phase1.status-panel.task1` Remove the geminiCli button-class map entry, rename the `--gemini` CSS class for the other providers to a neutral name, and update the status-panel test (scope: `src/client/ui/src/session/status-panel.tsx, media/session-view.css, src/client/ui/src/session/status-panel.test.tsx`; expected commit: `refactor: drop Gemini from status panel button class`).
26. [DONE] `gemini-removal.phase1.status-panel.commit1` Git Commit: `refactor: drop Gemini from status panel button class` (hash: self)

### Stream: Step provider resolver

27. [DONE] `gemini-removal.phase1.step-resolver.task1` Remove geminiCli from the sidebar step provider resolver (SidebarProviderId, design-id map, guard) and its tests, including the provider-tint test assertions (scope: `src/client/project-manager/components/layout/use-step-provider-resolver.ts, src/client/project-manager/components/layout/use-step-provider-resolver.test.ts, src/client/project-manager/components/layout/workspace-tree-provider-tint.test.ts`; expected commit: `refactor: drop Gemini from step provider resolver`).
28. [DONE] `gemini-removal.phase1.step-resolver.commit1` Git Commit: `refactor: drop Gemini from step provider resolver` (hash: self)

### Stream: Provider tint CSS scopes

29. [DONE] `gemini-removal.phase1.css-scopes.task1` Remove the dead Gemini provider CSS scopes (pm-tree data-provider gemini and session-status-picker geminiCli) (scope: `packages/ui/project-manager/styles.css, media/session-view.css`; expected commit: `refactor: drop Gemini provider CSS scopes`).
30. [DONE] `gemini-removal.phase1.css-scopes.commit1` Git Commit: `refactor: drop Gemini provider CSS scopes` (hash: self)

### Stream: Workflow provider resolver

31. [DONE] `gemini-removal.phase1.workflow-resolver.task1` Remove geminiCli from the project-manager workflow provider resolver guard and replace the geminiCli protagonist in its test with another provider (scope: `src/client/project-manager/services/workflow-provider-resolver.ts, src/client/project-manager/services/workflow-provider-resolver.test.ts`; expected commit: `refactor: drop Gemini from workflow provider resolver`).
32. [DONE] `gemini-removal.phase1.workflow-resolver.commit1` Git Commit: `refactor: drop Gemini from workflow provider resolver` (hash: self)

### Stream: Remaining project-manager UI

33. [DONE] `gemini-removal.phase1.pm-remainder.task1` Remove the geminiCli tint token, the development-tree start-card Gemini branch, and the geminiCli fixture in the stage-confirmation-card test (scope: `src/client/project-manager/components/shared/stage-confirmation-card-provider-tint.ts, src/client/project-manager/components/layout/development-tree-node-start-card.tsx, src/client/project-manager/components/shared/stage-confirmation-card.test.ts`; expected commit: `refactor: drop Gemini from remaining project-manager UI`).
34. [DONE] `gemini-removal.phase1.pm-remainder.commit1` Git Commit: `refactor: drop Gemini from remaining project-manager UI` (hash: self)

## Phase 2 - Extension host and Core (owner: CodeAI Hub Bot, updated: 2026-06-24)

### Stream: Extension settings types

35. [DONE] `gemini-removal.phase2.ext-settings.task1` Delete the extension-module Gemini settings module and the now-orphaned gemini-model-registry, and remove their references from the settings storage and types (scope: `src/extension-module/settings/gemini-settings.ts, src/extension-module/settings/settings-storage.ts, src/extension-module/settings/types.ts, src/types/gemini-model-registry.ts, src/extension-module/settings/auto-update-settings.test.ts, src/extension-module/settings/localization-settings-impact-classifier.test.ts`; expected commit: `refactor: drop Gemini from extension settings storage`).
36. [DONE] `gemini-removal.phase2.ext-settings.commit1` Git Commit: `refactor: drop Gemini from extension settings storage` (hash: self)

### Stream: Extension provider version service

37. [DONE] `gemini-removal.phase2.ext-version.task1` Remove Gemini from the extension provider version model and service and delete the Gemini version reader (scope: `src/extension-module/settings/provider-version-model.ts, src/extension-module/settings/provider-version-service.ts, src/extension-module/settings/gemini-version-reader.ts`; expected commit: `refactor: drop Gemini from extension provider versions`).
38. [DONE] `gemini-removal.phase2.ext-version.commit1` Git Commit: `refactor: drop Gemini from extension provider versions` (hash: self)

### Stream: Extension settings message handler

39. [DONE] `gemini-removal.phase2.ext-msg-handler.task1` Remove the gemini union member and branch from the extension settings message handler (scope: `src/extension-module/message-handlers/settings-message-handler.ts`; expected commit: `refactor: drop Gemini from settings message handler`).
40. [DONE] `gemini-removal.phase2.ext-msg-handler.commit1` Git Commit: `refactor: drop Gemini from settings message handler` (hash: self)

### Stream: Core usage limits

41. [DONE] `gemini-removal.phase2.core-usage-limits.task1` ATOMIC cascade (knip + typecheck require removing the registered provider in one commit): delete the Gemini adapter registration and usage-limits provider from core. Touch points: index.ts (geminiAdapterCtorPromise, gemini config fields, ensureGeminiAdapter, isGeminiAuthReady/resolveWorkspaceGeminiDir/hasGeminiAuthFile, GEMINI_AUTH_FILENAMES, imports), descriptor-factory (buildGeminiDescriptor, createGeminiAdapterInstance, createGeminiUsageLimitsFacadeBridge usage, geminiCli capabilities), module-loader(.types) (loadGeminiAdapterCtor/resolveGeminiAdapter/extractGeminiAdapterCtor + GeminiAdapterCtor/GeminiModuleOptions/GeminiUsageLimits* types), installed-path-resolver (resolveGeminiModulePath + "gemini" ProviderModuleId), installer-paths (GEMINI_INSTALLER_PATHS), recovery-coordinator (ensureGeminiAdapter option, geminiCli branches), bridge-factory (GeminiUsageLimitsFacade import, toGeminiUsageLimitsStreamPayload, createGeminiUsageLimitsFacadeBridge), provider-usage-limits-types (gemini union members), and delete provider-usage-limits/providers/gemini/. config/turn-config/settings-snapshot follow in the next stream (scope: `packages/core/src/provider-registry/index.ts, packages/core/src/provider-registry/provider-descriptor-factory.ts, packages/core/src/provider-registry/provider-module-loader.ts, packages/core/src/provider-registry/provider-module-loader.types.ts, packages/core/src/provider-registry/provider-installed-path-resolver.ts, packages/core/src/provider-registry/provider-installer-paths.ts, packages/core/src/provider-registry/provider-recovery-coordinator.ts, packages/core/src/provider-registry/provider-usage-limits-bridge-factory.ts, packages/core/src/provider-usage-limits/providers/gemini/**, packages/core/src/provider-usage-limits/provider-usage-limits-types.ts, packages/core/src/provider-registry/provider-recovery-coordinator.test.ts, packages/core/src/provider-registry/provider-recovery-scheduler.test.ts, packages/core/package.json`; expected commit: `refactor: drop Gemini from core provider registry`).
42. [DONE] `gemini-removal.phase2.core-usage-limits.commit1` Git Commit: `refactor: drop Gemini from core provider registry` (hash: self)

### Stream: Core config

43. [DONE] `gemini-removal.phase2.core-config.task1` Remove live Gemini runtime config path/credentials loading and the Gemini provider turn-config registry entry; keep legacy optional CoreConfig fixture fields until the settings snapshot cleanup removes their remaining consumers (scope: `packages/core/src/config/index.ts, packages/core/src/config/provider-turn-config-resolver.ts, packages/core/src/config/provider-defaults-resolver.ts`; expected commit: `refactor: drop Gemini from core config`).
44. [DONE] `gemini-removal.phase2.core-config.commit1` Git Commit: `refactor: drop Gemini from core config` (hash: self)

### Stream: Core settings snapshots

45. [DONE] `gemini-removal.phase2.core-settings-snapshots.task1` Remove Gemini from Core settings snapshot readers, session translation visibility policy, and default settings persistence (scope: `packages/core/src/config/provider-settings-snapshot.ts, packages/core/src/session-translation/**, packages/core/src/remote-bridge/handlers/settings-persistence-snapshot.ts`; expected commit: `refactor: drop Gemini from core settings snapshots`).
46. [DONE] `gemini-removal.phase2.core-settings-snapshots.commit1` Git Commit: `refactor: drop Gemini from core settings snapshots` (hash: self)

### Stream: Core settings defaults

47. [DONE] `gemini-removal.phase2.core-settings-defaults.task1` Remove Gemini from the default settings snapshot constant and settings-handler fixtures (scope: `packages/core/src/remote-bridge/handlers/settings-default-snapshot.ts, packages/core/src/remote-bridge/handlers/settings-persistence-snapshot.ts, packages/core/src/remote-bridge/handlers/settings-*.test.ts`; expected commit: `refactor: drop Gemini from core settings defaults`).
48. [DONE] `gemini-removal.phase2.core-settings-defaults.commit1` Git Commit: `refactor: drop Gemini from core settings defaults` (hash: self)

### Stream: Core config leftovers

49. [DONE] `gemini-removal.phase2.core-config-leftovers.task1` Remove legacy Gemini CoreConfig fields, Gemini fallback turn-config option, and related remote-bridge/test fixtures (scope: `packages/core/src/config/**, packages/core/src/remote-bridge/**, packages/core/src/**/*.test.ts`; expected commit: `refactor: drop Gemini core config leftovers`).
50. [DONE] `gemini-removal.phase2.core-config-leftovers.commit1` Git Commit: `refactor: drop Gemini core config leftovers` (hash: self)

### Stream: Core recovery resolver

51. [DONE] `gemini-removal.phase2.core-recovery-resolver.task1` Remove Gemini fallback targets from the provider recovery target resolver (scope: `packages/core/src/recovery/recovery-target-resolver.ts`; expected commit: `refactor: drop Gemini from recovery target resolver`).
52. [DONE] `gemini-removal.phase2.core-recovery-resolver.commit1` Git Commit: `refactor: drop Gemini from recovery target resolver` (hash: self)

### Stream: Remote-bridge provider settings commands

53. [DONE] `gemini-removal.phase2.remote-bridge-provider-settings.task1` ATOMIC cascade: remove Gemini from remote-bridge provider settings/update/version command surfaces and their validator checks (scope: `packages/core/src/remote-bridge/handlers/settings-provider-version-service.ts, packages/core/src/remote-bridge/handlers/settings-provider-auto-update-service.ts, packages/core/src/remote-bridge/handlers/settings-request-handler.ts, packages/core/src/remote-bridge/handlers/incoming-message-validator.ts, packages/core/src/remote-bridge/types.ts, packages/core/src/remote-bridge/handlers/settings-provider-auto-update-service.test.ts, packages/core/src/remote-bridge/handlers/incoming-message-validator.test.ts`; expected commit: `refactor: drop Gemini from remote bridge provider settings`).
54. [DONE] `gemini-removal.phase2.remote-bridge-provider-settings.commit1` Git Commit: `refactor: drop Gemini from remote bridge provider settings` (hash: self)

### Stream: Remote-bridge provider routing

55. [DONE] `gemini-removal.phase2.remote-bridge-provider-routing.task1` Remove Gemini from remote-bridge provider-id translation and turn-threshold routing surfaces (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-translation-provider-id.ts, packages/core/src/remote-bridge/handlers/session-request-handler-turn-threshold-resolver.ts`; expected commit: `refactor: drop Gemini from remote bridge provider routing`).
56. [DONE] `gemini-removal.phase2.remote-bridge-provider-routing.commit1` Git Commit: `refactor: drop Gemini from remote bridge provider routing` (hash: self)

### Stream: Remote-bridge session leftovers

57. [DONE] `gemini-removal.phase2.remote-bridge-session-leftovers.task1` Remove Gemini-only remote-bridge session leftovers from stale-binding messages and focused test fixtures (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts, packages/core/src/remote-bridge/handlers/session-provider-event-router.test.ts, packages/core/src/remote-bridge/handlers/session-provider-failure-recovery.test.ts`; expected commit: `refactor: drop Gemini remote bridge session leftovers`).
58. [DONE] `gemini-removal.phase2.remote-bridge-session-leftovers.commit1` Git Commit: `refactor: drop Gemini remote bridge session leftovers` (hash: self)

### Stream: Remote-bridge provider fixtures

59. [DONE] `gemini-removal.phase2.remote-bridge-provider-fixtures.task1` ATOMIC fixture cascade: replace remaining Gemini provider fixtures in focused remote-bridge session tests with live providers, including the settings-fixture imported by `session-request-handler.test.ts` (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler.stop.test.ts, packages/core/src/remote-bridge/handlers/session-provider-session-resolver.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler.settings-fixtures.test.ts`; expected commit: `refactor: drop Gemini remote bridge provider fixtures`).
60. [DONE] `gemini-removal.phase2.remote-bridge-provider-fixtures.commit1` Git Commit: `refactor: drop Gemini remote bridge provider fixtures` (hash: self)

### Stream: Remote-bridge bootstrap fixtures

61. [DONE] `gemini-removal.phase2.remote-bridge-bootstrap-fixtures.task1` Replace Gemini bootstrap/rollover/runtime-core fixtures in remote-bridge tests with live providers (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-session-bootstrap.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler.rollover.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core.test.ts`; expected commit: `refactor: drop Gemini remote bridge bootstrap fixtures`).
62. [DONE] `gemini-removal.phase2.remote-bridge-bootstrap-fixtures.commit1` Git Commit: `refactor: drop Gemini remote bridge bootstrap fixtures` (hash: self)

### Stream: Remote-bridge usage fixtures

63. [DONE] `gemini-removal.phase2.remote-bridge-usage-fixtures.task1` Remove Gemini from remote-bridge post-rebind usage refresh and workflow-state fixtures (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-post-rebind-usage-limits.ts, packages/core/src/remote-bridge/handlers/session-request-handler-post-rebind-usage-limits.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts`; expected commit: `refactor: drop Gemini remote bridge usage fixtures`).
64. [DONE] `gemini-removal.phase2.remote-bridge-usage-fixtures.commit1` Git Commit: `refactor: drop Gemini remote bridge usage fixtures` (hash: self)

### Stream: Core runtime profiles

65. [DONE] `gemini-removal.phase2.core-runtime-profiles.task1` Remove Gemini from core model-invocation profiles and workspace runtime provider homes (scope: `packages/core/src/model-invocation/model-invocation-profile-resolver.ts, packages/core/src/workflow/runtime/workspace-runtime-capsule.ts, packages/core/src/workflow/runtime/workspace-runtime-capsule*.test.ts`; expected commit: `refactor: drop Gemini core runtime profiles`).
66. [DONE] `gemini-removal.phase2.core-runtime-profiles.commit1` Git Commit: `refactor: drop Gemini core runtime profiles` (hash: self)

### Stream: Core templates and SDK exclusions

67. [DONE] `gemini-removal.phase2.core-templates-sdk.task1` Remove Gemini invocation templates and SDK exclusion leftovers from Core packaging surfaces (scope: `packages/core/src/templates/bundled-templates.ts, packages/core/src/templates/source/model-invocation-templates.json, packages/core/src/index.ts`; expected commit: `refactor: drop Gemini core templates`).
68. [DONE] `gemini-removal.phase2.core-templates-sdk.commit1` Git Commit: `refactor: drop Gemini core templates` (hash: self)

### Stream: Supervisor and shell registry

69. [DONE] `gemini-removal.phase2.supervisor-shell-registry.task1` Remove Gemini from supervisor runtime env wiring and the legacy shell provider registry (scope: `packages/core-supervisor/src/index.ts, src/core/providers/provider-registry.ts`; expected commit: `refactor: drop Gemini supervisor registry leftovers`).
70. [DONE] `gemini-removal.phase2.supervisor-shell-registry.commit1` Git Commit: `refactor: drop Gemini supervisor registry leftovers` (hash: self)

### Stream: Root package dependencies

71. [DONE] `gemini-removal.phase2.root-package-deps.task1` Remove root-level Google Gemini CLI dependencies from package metadata and lockfile (scope: `package.json, package-lock.json`; expected commit: `refactor: drop Gemini root package dependencies`).
72. [DONE] `gemini-removal.phase2.root-package-deps.commit1` Git Commit: `refactor: drop Gemini root package dependencies` (hash: self)

### Stream: Gemini workspace package

73. [DONE] `gemini-removal.phase2.gemini-workspace-package.task1` Delete the unused Gemini provider workspace package and prune its lockfile entries (scope: `packages/Gemini_Module/**, package-lock.json`; expected commit: `refactor: delete Gemini module workspace`).
74. [DONE] `gemini-removal.phase2.gemini-workspace-package.commit1` Git Commit: `refactor: delete Gemini module workspace` (hash: self)

### Stream: Build script package list

75. [DONE] `gemini-removal.phase2.build-script-package-list.task1` Remove Gemini workspace/package references from build and release scripts (scope: `scripts/build-core.sh, scripts/build-release.sh, scripts/build-all.sh, scripts/build-gemini-module.sh`; expected commit: `refactor: drop Gemini from build scripts`).
76. [DONE] `gemini-removal.phase2.build-script-package-list.commit1` Git Commit: `refactor: drop Gemini from build scripts` (hash: self)

### Stream: Provider release assets

77. [DONE] `gemini-removal.phase2.provider-release-assets.task1` Remove Gemini provider release assets and manifests that no build script consumes anymore (scope: `assets/providers/gemini/**, doc/tmp/releases/gemini-module-*.tar.bz2`; expected commit: `refactor: drop Gemini provider release assets`).
78. [DONE] `gemini-removal.phase2.provider-release-assets.commit1` Git Commit: `refactor: drop Gemini provider release assets` (hash: self)

### Stream: Release ignore cleanup

79. [DONE] `gemini-removal.phase2.release-ignore-cleanup.task1` Remove Gemini package/archive leftovers from release ignore and cleanup utilities (scope: `.vscodeignore, scripts/release-utils.sh`; expected commit: `refactor: drop Gemini release ignore leftovers`).
80. [DONE] `gemini-removal.phase2.release-ignore-cleanup.commit1` Git Commit: `refactor: drop Gemini release ignore leftovers` (hash: self)

### Stream: Translation benchmark copy

81. [DONE] `gemini-removal.phase2.translation-benchmark-copy.task1` Remove Gemini provider copy from the local ignored translation benchmark script; `scripts/translation-benchmark-shared.ts` is excluded by `.git/info/exclude`, so the cleanup is local-only and this commit records the tracked plan continuation (scope: `scripts/translation-benchmark-shared.ts`; expected commit: `refactor: drop Gemini translation benchmark copy`).
82. [DONE] `gemini-removal.phase2.translation-benchmark-copy.commit1` Git Commit: `refactor: drop Gemini translation benchmark copy` (hash: self)

### Stream: Localization glossary terms

83. [DONE] `gemini-removal.phase2.localization-glossary-terms.task1` Remove Gemini-specific provider glossary terms from the localization package (scope: `packages/localization/src/user-glossary-store.ts`; expected commit: `refactor: drop Gemini localization glossary terms`).
84. [DONE] `gemini-removal.phase2.localization-glossary-terms.commit1` Git Commit: `refactor: drop Gemini localization glossary terms` (hash: self)

### Stream: Core legacy continuity alias

85. [DONE] `gemini-removal.phase2.core-continuity-alias.task1` Remove the legacy Gemini provider alias from dialog id normalization (scope: `packages/core/src/session-continuity/dialog-id.ts`; expected commit: `refactor: drop Gemini continuity alias`).
86. [DONE] `gemini-removal.phase2.core-continuity-alias.commit1` Git Commit: `refactor: drop Gemini continuity alias` (hash: self)

### Stream: Core negative Gemini fixtures

87. [DONE] `gemini-removal.phase2.core-negative-gemini-fixtures.task1` Replace leftover Gemini invalid-provider fixtures in Core tests with provider-neutral removed-provider examples (scope: `packages/core/src/provider-network-capture/native-request-capture-facade.test.ts, packages/core/src/remote-bridge/handlers/incoming-message-validator.test.ts, packages/core/src/remote-bridge/handlers/settings-provider-auto-update-service.test.ts`; expected commit: `refactor: drop Gemini core negative fixtures`).
88. [DONE] `gemini-removal.phase2.core-negative-gemini-fixtures.commit1` Git Commit: `refactor: drop Gemini core negative fixtures` (hash: self)

### Stream: Gemini removal residue audit

89. [DONE] `gemini-removal.phase2.residue-audit.task1` Run repository Gemini residue checks after code/package cleanup and record the next tracked cleanup scope. Audit evidence: `npm audit --omit=dev --audit-level=high` found 0 vulnerabilities; remaining live tracked residue is split into runtime env wiring, generated UI/localization residue, tooling glossary fixtures, and active docs. Historical `CHANGELOG.md`, archived plans, and safety `.gemini`/`GEMINI.md` ignore entries are not runtime provider package residue. (scope: `doc/TODO/todo-plan.md`; expected commit: `chore: audit Gemini removal residue`).
90. [DONE] `gemini-removal.phase2.residue-audit.commit1` Git Commit: `chore: audit Gemini removal residue` (hash: self)

### Stream: Runtime environment leftovers

91. [DONE] `gemini-removal.phase2.runtime-env-leftovers.task1` Remove remaining Gemini workspace/module environment wiring from the launcher and Claude provider-home resolution (scope: `packages/cef-launcher/src/core_launcher.cc, packages/Claude_Module/src/sdk/claude-provider-home.ts`; expected commit: `refactor: drop Gemini runtime env leftovers`).
92. [DONE] `gemini-removal.phase2.runtime-env-leftovers.commit1` Git Commit: `refactor: drop Gemini runtime env leftovers` (hash: self)

### Stream: UI asset residue

93. [DONE] `gemini-removal.phase2.ui-asset-residue.task1` Remove stale Gemini UI localization and generated webview asset residue left after source provider removal (scope: `assets/localization/source/en/ui_helper_text.json, media/react-chat.js, media/session-view.css`; expected commit: `refactor: drop Gemini UI asset residue`).
94. [DONE] `gemini-removal.phase2.ui-asset-residue.commit1` Git Commit: `refactor: drop Gemini UI asset residue` (hash: self)

### Stream: Tooling glossary residue

95. [DONE] `gemini-removal.phase2.tooling-glossary-residue.task1` Remove remaining Gemini glossary and tooling fixture residue after provider removal (scope: `assets/localization/glossary/base.json, knip.json, packages/localization/src/user-glossary-store.test.ts`; expected commit: `refactor: drop Gemini tooling glossary residue`).
96. [DONE] `gemini-removal.phase2.tooling-glossary-residue.commit1` Git Commit: `refactor: drop Gemini tooling glossary residue` (hash: self)

### Stream: Gemini module documentation

97. [DONE] `gemini-removal.phase2.gemini-module-docs.task1` Remove active Gemini module documentation entries that no longer describe a shipped provider module (scope: `doc/SolidWorks-WorkFlow/Modules/Gemini.md, doc/SolidWorks-WorkFlow/Contracts/Gemini_ThoughtTranslation.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: drop Gemini module docs`).
98. [DONE] `gemini-removal.phase2.gemini-module-docs.commit1` Git Commit: `docs: drop Gemini module docs` (hash: self)

### Stream: Active architecture docs

99. [DONE] `gemini-removal.phase2.active-architecture-docs.task1` Remove Gemini-as-live-provider references from active system and provider contracts after module removal (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md, doc/SolidWorks-WorkFlow/Contracts/ProviderFailure_Recovery_And_ProviderSwitch.md`; expected commit: `docs: drop Gemini active architecture refs`).
100. [DONE] `gemini-removal.phase2.active-architecture-docs.commit1` Git Commit: `docs: drop Gemini active architecture refs` (hash: self)

### Stream: Remaining residue audit

101. [DONE] `gemini-removal.phase2.remaining-residue-audit.task1` Re-run tracked Gemini residue checks after active architecture docs cleanup and record the next remaining cleanup scope (scope: `doc/TODO/todo-plan.md`; expected commit: `chore: audit remaining Gemini residue`).
102. [DONE] `gemini-removal.phase2.remaining-residue-audit.commit1` Git Commit: `chore: audit remaining Gemini residue` (hash: self)

Audit evidence (2026-06-24):
- `git grep -l -i gemini -- .` still reports safety ignore entries (`.gitignore`, `.vscodeignore`, `AGENTS.md`), release/history docs (`README.md`, `CHANGELOG.md`, `doc/BugRegistry.md`), active docs, active/backlog/archived planning docs, and archived todo plans.
- `git grep -n -i gemini -- doc/SolidWorks-WorkFlow/System doc/SolidWorks-WorkFlow/Contracts doc/SolidWorks-WorkFlow/Modules doc/SolidWorks-WorkFlow/Docs_Index.md` has no remaining `System/` or `Contracts/` hits; live documentation residue is now in `Docs_Index.md` and active module docs.
- Next minimal cleanup scope: remove Gemini-as-live-provider references from `Modules/Claude.md`, `Modules/Codex.md`, and `Modules/Kimi.md`; keep archive/history references until a dedicated archive/index cleanup pass.

### Stream: Provider module docs residue

103. [DONE] `gemini-removal.phase2.provider-module-docs-residue.task1` Remove Gemini-as-live-provider references from active Claude/Codex/Kimi module docs after provider removal (scope: `doc/SolidWorks-WorkFlow/Modules/Claude.md, doc/SolidWorks-WorkFlow/Modules/Codex.md, doc/SolidWorks-WorkFlow/Modules/Kimi.md`; expected commit: `docs: drop Gemini provider module refs`).
104. [DONE] `gemini-removal.phase2.provider-module-docs-residue.commit1` Git Commit: `docs: drop Gemini provider module refs` (hash: self)

### Stream: Session UI docs residue

105. [DONE] `gemini-removal.phase2.session-ui-docs-residue.task1` Remove Gemini-as-live-provider references from active Session UI module docs after UI asset cleanup (scope: `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionIdUsageBar.md, doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md, doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`; expected commit: `docs: drop Gemini session UI refs`).
106. [DONE] `gemini-removal.phase2.session-ui-docs-residue.commit1` Git Commit: `docs: drop Gemini session UI refs` (hash: self)

### Stream: Shared translation docs residue

107. [DONE] `gemini-removal.phase2.shared-translation-docs-residue.task1` Remove Gemini runtime/build references from active shared translation module docs after provider package deletion (scope: `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`; expected commit: `docs: drop Gemini shared translation refs`).
108. [DONE] `gemini-removal.phase2.shared-translation-docs-residue.commit1` Git Commit: `docs: drop Gemini shared translation refs` (hash: self)

### Stream: Cluster docs residue

109. [DONE] `gemini-removal.phase2.cluster-docs-residue.task1` Remove Gemini-as-live-provider references from active Core/PM orchestration cluster docs (scope: `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md, doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md, doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`; expected commit: `docs: drop Gemini cluster refs`).
110. [DONE] `gemini-removal.phase2.cluster-docs-residue.commit1` Git Commit: `docs: drop Gemini cluster refs` (hash: self)

### Stream: Checklist and design docs residue

111. [DONE] `gemini-removal.phase2.checklist-design-docs-residue.task1` Remove Gemini-as-live-provider references from active audit checklist and design-system docs (scope: `doc/SolidWorks-WorkFlow/Checklists/PeriodicAudit.md, doc/SolidWorks-WorkFlow/Checklists/RuntimeReliabilityReviewRemediation.md, doc/SolidWorks-WorkFlow/DesignSystem/CorporateDesign.html`; expected commit: `docs: drop Gemini checklist design refs`).
112. [DONE] `gemini-removal.phase2.checklist-design-docs-residue.commit1` Git Commit: `docs: drop Gemini checklist design refs` (hash: self)

### Stream: Remaining docs residue audit

113. [DONE] `gemini-removal.phase2.remaining-docs-residue-audit.task1` Re-run tracked Gemini documentation residue checks after active docs cleanup and classify the remaining archive/history/planning scope (scope: `doc/TODO/todo-plan.md`; expected commit: `chore: audit remaining Gemini docs residue`).
114. [DONE] `gemini-removal.phase2.remaining-docs-residue-audit.commit1` Git Commit: `chore: audit remaining Gemini docs residue` (hash: self)

Audit evidence (2026-06-24):
- `git grep -l -i gemini -- .` has no remaining package/source/build/localization active runtime paths; remaining hits are documentation, safety ignore rules, planning/backlog, changelog/bug history, and archives.
- `git grep -n -i gemini -- ':!doc/TODO/todo-plan.md' ':!doc/TODO/Archive/**' ':!doc/SolidWorks-WorkFlow/Plans/Archive/**'` shows the non-archive set: `.gitignore`, `.vscodeignore`, `AGENTS.md`, `README.md`, `CHANGELOG.md`, `doc/BugRegistry.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/Plans/Backlog/**`, active `Gemini_Removal_Planning_RU.md`, `Intent_Normalizer_Module_Planning_RU.md`, and `Plans/README.md`.
- `.gitignore` / `.vscodeignore` `.gemini` and `GEMINI.md` entries are safety ignore rules for user/project residue, not shipped provider package residue.
- `Intent_Normalizer_Module_Planning_RU.md` and `Plans/README.md` use `google/gemini-*` OpenRouter model ids as hosted benchmark candidates; this is not the removed Gemini provider module.
- Next minimal cleanup scope: update `Docs_Index.md` so the active index no longer presents Gemini as a live provider/system doc surface while preserving explicit archive/history entries until a dedicated history cleanup decision.

### Stream: Docs index residue

115. [DONE] `gemini-removal.phase2.docs-index-residue.task1` Remove active Gemini-as-live-provider references from Docs_Index while preserving explicit archive/history records (scope: `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: update Gemini docs index residue`).
116. [DONE] `gemini-removal.phase2.docs-index-residue.commit1` Git Commit: `docs: update Gemini docs index residue` (hash: self)

### Stream: Root docs residue

117. [DONE] `gemini-removal.phase2.root-docs-residue.task1` Remove Gemini-as-active-build/provider wording from root process and user-facing docs while preserving changelog/history records (scope: `AGENTS.md, README.md`; expected commit: `docs: update Gemini root docs residue`).
118. [DONE] `gemini-removal.phase2.root-docs-residue.commit1` Git Commit: `docs: update Gemini root docs residue` (hash: self)

### Stream: Backlog docs residue

119. [DONE] `gemini-removal.phase2.backlog-docs-residue.task1` Remove Gemini-as-future-provider implementation wording from active/deferred backlog docs while preserving historical notes (scope: `doc/SolidWorks-WorkFlow/Plans/Backlog/Capture_Workbench_UI_Architecture.md, doc/SolidWorks-WorkFlow/Plans/Backlog/CrossProvider_Common_Capabilities.md, doc/SolidWorks-WorkFlow/Plans/Backlog/Provider_Native_Request_Capture_Workbench_Architecture.md`; expected commit: `docs: update Gemini backlog docs residue`).
120. [DONE] `gemini-removal.phase2.backlog-docs-residue.commit1` Git Commit: `docs: update Gemini backlog docs residue` (hash: self)

### Stream: Final docs residue audit

121. [DONE] `gemini-removal.phase2.final-docs-residue-audit.task1` Re-run tracked Gemini residue checks after backlog cleanup and classify remaining safety/history/planning records before release-build gating (scope: `doc/TODO/todo-plan.md`; expected commit: `chore: audit final Gemini docs residue`).
122. [DONE] `gemini-removal.phase2.final-docs-residue-audit.commit1` Git Commit: `chore: audit final Gemini docs residue` (hash: self)

Audit evidence (2026-06-24):
- `git grep -l -i gemini -- src packages scripts assets media package.json package-lock.json` returned no tracked runtime/source/build/package/localization files.
- `git grep -l -i gemini -- ':!doc/TODO/todo-plan.md' ':!doc/TODO/Archive/**' ':!doc/SolidWorks-WorkFlow/Plans/Archive/**'` now reports only `.gitignore`, `.vscodeignore`, `CHANGELOG.md`, `README.md`, `doc/BugRegistry.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/Plans/Backlog/Kimi_Audit_Followup_Planning.md`, active `doc/SolidWorks-WorkFlow/Plans/Gemini_Removal_Planning_RU.md`, `doc/SolidWorks-WorkFlow/Plans/Intent_Normalizer_Module_Planning_RU.md`, and `doc/SolidWorks-WorkFlow/Plans/README.md`.
- `.gitignore` / `.vscodeignore` `.gemini` and `GEMINI.md` entries are safety ignore rules, not shipped provider package residue.
- `README.md`, `CHANGELOG.md`, `doc/BugRegistry.md`, and `Docs_Index.md` remaining hits are release/history/bug/archive records.
- `Kimi_Audit_Followup_Planning.md` remaining hit is an outdated-audit problem statement, not a future Gemini implementation path.
- `Gemini_Removal_Planning_RU.md` intentionally remains active planning provenance until scope closeout.
- `Intent_Normalizer_Module_Planning_RU.md` and `Plans/README.md` remaining hits are OpenRouter hosted model ids (`google/gemini-*`), not the removed Gemini provider module.
- Next required gate: stop before release notes/version prep, `build-all.sh`, or `build-release.sh`, and ask the user for explicit Gemini-free release-build approval.

### Stream: Release build confirmation gate

123. [IN_PROGRESS] `gemini-removal.phase2.release-build-confirmation.task1` Stop at Release Build Confirmation Gate and ask the user for explicit approval before README/CHANGELOG version prep or release build scripts (scope: `doc/TODO/todo-plan.md`; expected commit: `chore: record Gemini release build confirmation`).
124. [TODO] `gemini-removal.phase2.release-build-confirmation.commit1` Git Commit: `chore: record Gemini release build confirmation` (hash: TBD)
