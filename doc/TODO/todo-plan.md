# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Remove_Foundation_Envelope_Workflow_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
  - `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowNavigation_SSOT.md`
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Implementation_Foundation_Architecture.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стрим), в каждом Стриме - некоторое количество подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Если по факту разработки оказывается, что конкретная подзадача Stream затрагивает больше 3 файлов - такая задача должна быть разбита на более мелкие и список задач в Стриме переписывается.
- **Gates (автоматически через Husky hooks):**
  - `git commit` -> `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` -> `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** выполняем вручную только когда нужно проверить затронутый пакет/клиент, и обязательно перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`.
- **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт `todo-plan.md` (дата, статус, хеш).
- **Real-time Документация**: любое изменение архитектуры/логики требует синхронного обновления `todo-plan.md` и документации из `doc/` до коммита.
- **Closeout правила этого scope:** активный workflow должен перестать знать про `Foundation Envelope`; historical archive допускается только как history-only слой и не должен оставаться в active navigation.

## Phase 1 — Remove Foundation Envelope From Active SSOT (owner: Codex, updated: 2026-04-07)

### Stream: Trunk And Branch Retargeting
1. [DONE] Update `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`, `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`, and `doc/TODO/todo-plan.md`; scope: remove `Foundation Envelope` from the active workflow order, artifacts, gating, and OUTDATED propagation; expected commit message: `docs(workflow): remove foundation envelope from active trunk`
2. [DONE] Git Commit: `docs(workflow): remove foundation envelope from active trunk` (hash: `893c63f20`)
3. [DONE] Update `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md`, and `doc/TODO/todo-plan.md`; scope: retarget trunk completion and branch entry from `Foundation Envelope` to `Diagram Modules`; expected commit message: `docs(ssot): retarget branch entry to diagram modules`
4. [DONE] Git Commit: `docs(ssot): retarget branch entry to diagram modules` (hash: `1b5443966`)
5. [DONE] Update `doc/SolidWorks-WorkFlow/Plans/Implementation_Foundation_Architecture.md`, `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowNavigation_SSOT.md`, and `doc/TODO/todo-plan.md`; scope: remove FE prerequisites from late-stage planning/navigation SSOT and align startup/navigation rules with the reduced trunk; expected commit message: `docs(workflow): drop foundation envelope prerequisites`
6. [DONE] Git Commit: `docs(workflow): drop foundation envelope prerequisites` (hash: `90628def3`)

### Stream: Active Plans And Navigation Cleanup
7. [DONE] Update `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/Plans/Foundation_Envelope_Architecture.md`, and `doc/TODO/todo-plan.md`; scope: remove FE from active docs navigation and mark the old FE architecture path for archive/retirement; expected commit message: `docs(plan): retire foundation envelope architecture path`
8. [DONE] Git Commit: `docs(plan): retire foundation envelope architecture path` (hash: `315d50be3`)

## Phase 2 — Remove Foundation Envelope From Core Workflow Runtime (owner: Codex, updated: 2026-04-07)

### Stream: Workflow State And Artifact Contracts
9. [DONE] Update `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-filesystem-hydration.ts`, and `doc/TODO/todo-plan.md`; scope: remove `foundation_envelope` from active workflow statuses, gating, and filesystem hydration; expected commit message: `refactor(core): remove foundation envelope workflow state`
10. [DONE] Git Commit: `refactor(core): remove foundation envelope workflow state` (hash: `fbcc4d8e7`)
11. [DONE] Update `packages/core/src/remote-bridge/handlers/http-api-artifact-validation.ts`, `packages/core/src/remote-bridge/handlers/http-api-system-routes.ts`, and `doc/TODO/todo-plan.md`; scope: drop FE artifact validation/routes and stop treating `foundation-envelope.md` or `foundation-envelope.flow.json` as active workflow artifacts; expected commit message: `refactor(core): remove foundation envelope artifact routes`
12. [DONE] Git Commit: `refactor(core): remove foundation envelope artifact routes` (hash: `66da3e434`)
13. [DONE] Update `packages/core/src/templates/bundled-templates.ts`, `packages/core/src/remote-bridge/handlers/idea-contract-service.ts`, and `doc/TODO/todo-plan.md`; scope: remove FE prompt/template registration and contract lookup from the active step catalog; expected commit message: `refactor(core): drop foundation envelope prompt contract`
14. [DONE] Git Commit: `refactor(core): drop foundation envelope prompt contract` (hash: `5bb6ad15f`)

### Stream: Continuity And Runtime Typing Cleanup
15. [DONE] Update `packages/core/src/session-continuity/continuity-types.ts`, `packages/core/src/workflow/paths/workflow-paths-types.ts`, and `doc/TODO/todo-plan.md`; scope: remove FE stage/artifact typing from active continuity and workflow path contracts; expected commit message: `refactor(core): prune foundation envelope runtime types`
16. [DONE] Git Commit: `refactor(core): prune foundation envelope runtime types` (hash: `19de4e159`)

### Stream: Watcher And Runtime Store Cleanup
17. [DONE] Update `packages/core/src/workflow/watcher/watcher-types.ts`, `packages/core/src/workflow/watcher/workflow-watcher.ts`, and `doc/TODO/todo-plan.md`; scope: remove FE from the live watcher stage catalog so runtime watcher events can only carry supported active stages; expected commit message: `refactor(core): drop foundation envelope watcher stages`
18. [DONE] Git Commit: `refactor(core): drop foundation envelope watcher stages` (hash: `0b68ad5aa`)
19. [DONE] Update `packages/core/src/workflow/state/workflow-state-store.ts`, `packages/core/src/workflow/state/workflow-last-active-store.ts`, and `doc/TODO/todo-plan.md`; scope: remove FE from workflow state and last-active stage ordering so runtime stores stop treating it as a live stage; expected commit message: `refactor(core): drop foundation envelope state stores`
20. [DONE] Git Commit: `refactor(core): drop foundation envelope state stores` (hash: `e5d053551`)
21. [DONE] Update `packages/core/src/workflow/paths/workflow-artifact-paths.ts`, `packages/core/src/workflow/runtime/workflow-runtime.ts`, and `doc/TODO/todo-plan.md`; scope: remove FE artifact path resolution and runtime last-active promotion from the active workflow runtime; expected commit message: `refactor(core): drop foundation envelope runtime paths`
22. [DONE] Git Commit: `refactor(core): drop foundation envelope runtime paths` (hash: `b86983154`)

## Phase 3 — Remove Foundation Envelope From Project Manager UX (owner: Codex, updated: 2026-04-07)

### Stream: Stage Catalog And Start Flow
17. [DONE] Update `src/client/project-manager/services/workflow-state-client.ts`, `src/client/project-manager/services/workflow-step-start-service.ts`, and `src/client/project-manager/services/prompt-pack-builder.ts`; scope: remove FE from PM workflow stage catalog, manual-start flow, and prompt-pack stage typing; expected commit message: `refactor(pm): remove foundation envelope start path`
18. [DONE] Git Commit: `refactor(pm): remove foundation envelope start path` (hash: `54e057795`)
19. [DONE] Update `src/client/project-manager/services/description-submit-service.ts`, `src/client/project-manager/components/layout/workspace-tree-model.ts`, and `doc/TODO/todo-plan.md`; scope: remove FE contract lookup and visible stage metadata from PM service/model surfaces; expected commit message: `refactor(pm): remove foundation envelope stage metadata`
20. [DONE] Git Commit: `refactor(pm): remove foundation envelope stage metadata` (hash: `0b44571de`)
21. [DONE] Update `src/client/project-manager/components/layout/toolbar.tsx`, `src/client/project-manager/components/layout/workspace-tree.tsx`, and `src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts`; scope: remove FE labels, buttons, artifact nodes, and session nodes from PM navigation surfaces; expected commit message: `refactor(pm): remove foundation envelope navigation shell`
22. [DONE] Git Commit: `refactor(pm): remove foundation envelope navigation shell` (hash: `29dbbf1ee`)
23. [DONE] Update `src/client/project-manager/components/layout/workspace-tree-stage-children.ts`, `src/client/project-manager/components/layout/use-workflow-tool-select.ts`, and `doc/TODO/todo-plan.md`; scope: prune FE helper branches from stage-child and tool-selection helpers; expected commit message: `refactor(pm): prune foundation envelope helper branches`
24. [DONE] Git Commit: `refactor(pm): prune foundation envelope helper branches` (hash: `5a86580d4`)

### Stream: Panel And Shared UI Cleanup
25. [DONE] Update `src/client/project-manager/components/layout/main-area-panel-content.tsx`, `src/client/project-manager/components/layout/main-area-utils.ts`, and `doc/TODO/todo-plan.md`; scope: remove FE panel routing from the main area and keep stage-specific panel selection limited to supported steps; expected commit message: `refactor(pm): drop foundation envelope panel routing`
26. [DONE] Git Commit: `refactor(pm): drop foundation envelope panel routing` (hash: `0e9475103`)
27. [DONE] Update `src/client/ui/src/session/empty-state.tsx`, `src/client/project-manager/components/shared/stage-artifact-content-view.tsx`, and `src/client/project-manager/components/shared/stage-artifact-fix-button.tsx`; scope: remove FE-specific empty-state/artifact-stage handling and prune FE from shared repair surfaces; expected commit message: `refactor(ui): remove foundation envelope shared helpers`
28. [DONE] Git Commit: `refactor(ui): remove foundation envelope shared helpers` (hash: `b49f62850`)
29. [DONE] Update `src/client/project-manager/components/diagram-editor/diagram-stage-panel-scaffold.tsx`, `src/client/project-manager/components/diagram-editor/diagram-modules-progressive-model.ts`, and `src/client/project-manager/components/diagram-editor/use-diagram-loader.ts`; scope: remove FE from diagram-editor loader, path resolution, and repair routing so the editor only serves Diagram Modules, then delete orphan FE visual/core parser files once their last entrypoints are cut; expected commit message: `refactor(pm): remove foundation envelope diagram loader`
30. [DONE] Git Commit: `refactor(pm): remove foundation envelope diagram loader` (hash: `75b625e43`)

## Phase 4 — Regression Coverage And Historical Closeout (owner: Codex, updated: 2026-04-07)

### Stream: Core Regression Cleanup
31. [DONE] Update `packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts`, `packages/core/src/remote-bridge/handlers/idea-contract-service.foundation-envelope.test.ts`, and `packages/core/src/remote-bridge/handlers/http-api-router.artifact-upsert.test.ts`; scope: remove or retarget core tests that keep FE alive as an active workflow/artifact contract; expected commit message: `test(core): remove foundation envelope workflow coverage`
32. [DONE] Git Commit: `test(core): remove foundation envelope workflow coverage` (hash: `b4fdb1520`)
33. [DONE] Update `packages/core/src/remote-bridge/handlers/foundation-envelope-continuity-restore.test.ts`, `packages/core/src/session-continuity/continuity-store.test.ts`, and `packages/core/src/session-continuity/handoff-report-writer.test.ts`; scope: remove FE-specific continuity coverage after the stage and its continuity path are deleted; expected commit message: `test(core): remove foundation envelope continuity coverage`
34. [DONE] Git Commit: `test(core): remove foundation envelope continuity coverage` (hash: `c25a96993`)
35. [DONE] Update `packages/core/src/workflow/paths/workflow-artifact-paths.test.ts`, `packages/core/src/workflow/runtime/workflow-runtime.test.ts`, and `packages/core/src/workflow/state/workflow-last-active-store.test.ts`; scope: remove FE path/runtime/last-active regression coverage after active stage deletion; expected commit message: `test(core): prune foundation envelope path coverage`
36. [DONE] Git Commit: `test(core): prune foundation envelope path coverage` (hash: `dea7c8317`)

### Stream: PM Regression Cleanup
37. [DONE] Update `src/client/project-manager/services/workflow-step-start-service.gating.test.ts`, `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.test.ts`, and `src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts`; scope: retarget PM workflow gating/tree/prompt-pack tests to the reduced trunk without FE; expected commit message: `test(pm): retarget workflow gating without foundation envelope`
38. [DONE] Git Commit: `test(pm): retarget workflow gating without foundation envelope` (hash: `5803ace33`)
39. [DONE] Update `src/client/project-manager/components/layout/foundation-envelope-tree-parity.test.ts`, `src/client/project-manager/components/foundation-envelope/foundation-envelope-localization.test.ts`, and `doc/TODO/todo-plan.md`; scope: delete FE-only PM regression coverage that is no longer valid after stage removal; expected commit message: `test(pm): remove foundation envelope regression suite`
40. [DONE] Git Commit: `test(pm): remove foundation envelope regression suite` (hash: `7ef4839ae`)
41. [DONE] Update `src/client/project-manager/components/layout/workflow-navigation.test.ts`, `src/client/ui/src/session/empty-state.test.ts`, and `doc/TODO/todo-plan.md`; scope: remove FE-specific navigation and empty-state copy coverage after stage removal; expected commit message: `test(ui): remove foundation envelope copy coverage`
42. [TODO] Git Commit: `test(ui): remove foundation envelope copy coverage` (hash: TBD)

### Stream: Dead Fragment Sweep
43. [TODO] Update `src/client/project-manager/components/layout/workspace-tree.tsx`, `src/client/project-manager/components/layout/main-area-panel-content.tsx`, and `src/client/project-manager/components/layout/workspace-tree-model.ts`; scope: remove stale FE imports/branches/labels that may survive the main PM removal path and keep dead code in shared layout surfaces; expected commit message: `refactor(pm): sweep foundation envelope dead fragments`
44. [TODO] Git Commit: `refactor(pm): sweep foundation envelope dead fragments` (hash: TBD)
45. [DONE] Update `packages/core/src/remote-bridge/handlers/http-api-router.ts`, `packages/core/src/remote-bridge/handlers/idea-contract-service.ts`, and `packages/core/src/templates/source/foundation-envelope-prompt.md`; scope: remove the last active FE contract route, stub contract builder, and source prompt asset from core after PM/runtime entrypoints are gone; expected commit message: `refactor(core): sweep foundation envelope dead references`
46. [DONE] Git Commit: `refactor(core): sweep foundation envelope dead references` (hash: `574d5f3d9`)

### Stream: Historical Documentation Cleanup
47. [TODO] Update `doc/Sessions/Session011.md`, `doc/TODO/Archive/todo-plan-phase1-foundation-envelope-visual-projection.md`, and `doc/TODO/todo-plan.md`; scope: keep FE history truthful while removing any misleading next-step/live-navigation assumptions that would route future work through the removed stage; expected commit message: `docs(history): retire foundation envelope live navigation`
48. [TODO] Git Commit: `docs(history): retire foundation envelope live navigation` (hash: TBD)
49. [TODO] Update `doc/SolidWorks-WorkFlow/Plans/Archive/Foundation_Envelope_VisualProjection_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/Archive/Workflow_Step_Symmetry_Architecture.md`, and `doc/TODO/todo-plan.md`; scope: mark archived FE planning docs as historical-only and remove wording that leaves the removed step looking active; expected commit message: `docs(history): mark foundation envelope archives as retired`
50. [TODO] Git Commit: `docs(history): mark foundation envelope archives as retired` (hash: TBD)

### Stream: Verification
51. [TODO] Run `npm run build --workspace=@codeai-hub/core`, `npm run build:webview`, `npm run typecheck:webview`, and update `doc/TODO/todo-plan.md`; scope: verify the reduced workflow compiles cleanly after FE removal across core + PM/webview surfaces; expected commit message: `test(workflow): verify foundation envelope removal`
52. [TODO] Git Commit: `test(workflow): verify foundation envelope removal` (hash: TBD)
53. [TODO] Run `rg -n \"Foundation Envelope|foundation-envelope|foundation_envelope\" doc src packages -g '!**/dist/**' -g '!node_modules'` and update `doc/TODO/todo-plan.md`; scope: perform a final dead-reference sweep, classify any remaining hits as required history vs actionable leftovers, and ensure no live FE fragments remain before release packaging; expected commit message: `test(repo): verify foundation envelope cleanup`
54. [TODO] Git Commit: `test(repo): verify foundation envelope cleanup` (hash: TBD)

### Stream: Release Build
55. [TODO] Update `README.md`, `CHANGELOG.md`, and `doc/TODO/todo-plan.md`; scope: synchronize release-facing product docs before cutting the cleanup release that removes `Foundation Envelope` from the active workflow; expected commit message: `docs(release): sync foundation envelope removal release docs`
56. [TODO] Git Commit: `docs(release): sync foundation envelope removal release docs` (hash: TBD)
57. [TODO] Run `./scripts/build-all.sh` and update `doc/TODO/todo-plan.md`; scope: execute the mandatory release build pipeline after FE removal, capture version/materialization changes, and prepare fresh release artifacts; expected commit message: `build(release): cut workflow removal artifacts`
58. [TODO] Git Commit: `build(release): cut workflow removal artifacts` (hash: TBD)
59. [TODO] Run `./scripts/build-release.sh --use-current-version` and update `doc/TODO/todo-plan.md`; scope: package the final VSIX for the workflow without `Foundation Envelope` and confirm the release checklist passes; expected commit message: `build(release): package workflow without foundation envelope`
60. [TODO] Git Commit: `build(release): package workflow without foundation envelope` (hash: TBD)

### Stream: Plan Closeout
61. [TODO] Update `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/Plans/Foundation_Envelope_Architecture.md`, and `doc/TODO/todo-plan.md`; scope: archive or retire FE-only active planning artifacts, keep only history-only references, and close the execution cycle cleanly after release packaging; expected commit message: `docs(closeout): archive foundation envelope removal scope`
62. [TODO] Git Commit: `docs(closeout): archive foundation envelope removal scope` (hash: TBD)
