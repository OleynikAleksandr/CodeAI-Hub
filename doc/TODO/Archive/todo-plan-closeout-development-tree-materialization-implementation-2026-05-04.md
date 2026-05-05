# Plan Closeout: development-tree-materialization-implementation-2026-05-04

**Created:** 2026-05-05T09:59:53.659Z
**Acceptance:** User accepted release 1.2.142 for Development Tree materialization: filesystem structure, Project Manager tree readiness, selected node sessions/artifacts, scoped node prompt context, chat language, and draft artifact language are confirmed. Cross-workflow prompt language work is deferred to a new scope.
**Execution Scope Status:** ACTIVE
**Branch:** main
**Current Task:** phase11.stream1.task1
**Expected Commit:** docs: close development tree materialization scope
**Last Recorded Commit:** f550bab3e
**Planning Source Disposition:** moved
**Planning Source Path:** doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_Skeleton_Materialization_Architecture.md

## Active Plan Copy

````markdown
# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "development-tree-materialization-implementation-2026-05-04",
  "branch": "main",
  "baseHead": "685ef701b",
  "lastRecordedCommit": "f550bab3e",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_Skeleton_Materialization_Architecture.md",
  "currentTaskId": "phase11.stream1.task1",
  "expectedCommitMessage": "docs: close development tree materialization scope",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_Skeleton_Materialization_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_Skeleton_Materialization_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_Sidebar_Visualization_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md`
  - `packages/core/src/remote-bridge/handlers/development-tree-snapshot.ts`
  - `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`
  - `packages/core/src/workflow/watcher/workflow-watcher.ts`
  - `packages/core/src/workflow/paths/workflow-artifact-paths.ts`
  - `src/client/project-manager/services/workflow-state-client.ts`
  - `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.ts`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- TODO Plan состоит из Phase, Stream и микрозадач.
- Каждая микрозадача затрагивает не более 3 файлов или 3 пакетов/контуров.
- Каждая микрозадача оформляется парой пунктов: реализация и отдельный следующий `Git Commit: ...`.
- Если фактический scope задачи затрагивает больше 3 файлов, задачу нужно сначала разбить на более мелкие и обновить этот план.
- Commit выполняется только через `npm run plan:commit -- "<expected commit message>"`.
- Husky hooks не обходить; `--no-verify` запрещён.
- Targeted verification выполняется после релевантных Stream: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`, targeted tests.
- Перед релизом выполнить Release Build Checklist: актуализировать README/CHANGELOG на будущую версию, затем `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`.
- После сборки релиза scope остаётся `ACTIVE` до явного user acceptance. Scope Closeout выполняется только после acceptance пользователя.

## Phase 1 — Diagram Modules Validation And State Foundation (owner: Codex, updated: 2026-05-04)
### Stream: Diagram Modules Structure Validation
1. [DONE] `phase1.stream1.task1` Усилить validation Product Part artifacts: reject пустой/заголовочный `product-part.md`, require matching `Part ID`, хотя бы один валидный Cluster или Module node; scope: `packages/core/src/remote-bridge/handlers/http-api-artifact-validation.ts`, `packages/core/src/remote-bridge/handlers/http-api-artifact-validation.test.ts`; expected commit: `fix: validate diagram modules product part structure`
2. [DONE] `phase1.stream1.commit1` Git Commit: `fix: validate diagram modules product part structure` (hash: 44233ed22)
3. [DONE] `phase1.stream1.task2` Усилить progress/cold-start готовность Diagram Modules: index без валидных Product Part IDs и partial part files не переводят stage в completed; scope: `packages/core/src/remote-bridge/handlers/diagram-modules-progress.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts`; expected commit: `fix: gate diagram modules on valid product parts`
4. [DONE] `phase1.stream1.commit2` Git Commit: `fix: gate diagram modules on valid product parts` (hash: 04b205486)

### Stream: Existing Development Tree Read Model
5. [DONE] `phase1.stream2.task1` Выделить Core development-tree state facade как evolution текущего `readDevelopmentTreeSnapshot` без параллельной новой читалки; scope: `packages/core/src/development-tree/development-tree-state-facade.ts`, `packages/core/src/development-tree/development-tree-types.ts`, `packages/core/src/remote-bridge/handlers/development-tree-snapshot.ts`; expected commit: `feat: add development tree state facade`
6. [DONE] `phase1.stream2.commit1` Git Commit: `feat: add development tree state facade` (hash: 0e6251c41)
7. [DONE] `phase1.stream2.task2` Подключить `WorkflowStateService` к facade-compatible snapshot path и сохранить backward-compatible payload для PM; scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`, `packages/core/src/remote-bridge/handlers/development-tree-snapshot.test.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts`; expected commit: `feat: route workflow state through development tree facade`
8. [DONE] `phase1.stream2.commit2` Git Commit: `feat: route workflow state through development tree facade` (hash: be250fdaf)

## Phase 2 — Filesystem Structurator Extension (owner: Codex, updated: 2026-05-04)
### Stream: Neutral P/C/M Path Planning
9. [DONE] `phase2.stream1.task1` Реализовать neutral materialized path planner для Product Part / Cluster / Module / Standalone Module; scope: `packages/core/src/development-tree/filesystem-structurator/development-tree-filesystem-path-planner.ts`, `packages/core/src/development-tree/filesystem-structurator/development-tree-filesystem-paths.ts`, `packages/core/src/development-tree/filesystem-structurator/development-tree-filesystem-path-planner.test.ts`; expected commit: `feat: plan neutral development tree filesystem paths`
10. [DONE] `phase2.stream1.commit1` Git Commit: `feat: plan neutral development tree filesystem paths` (hash: e9fd1f097)
11. [DONE] `phase2.stream1.task2` Реализовать idempotent directory apply для `.codeai-hub/<workspace-slug>/development_tree/materialized/`; scope: `packages/core/src/development-tree/filesystem-structurator/development-tree-filesystem-applier.ts`, `packages/core/src/development-tree/filesystem-structurator/development-tree-filesystem-applier.test.ts`, `packages/core/src/development-tree/filesystem-structurator/development-tree-filesystem-paths.ts`; expected commit: `feat: apply development tree filesystem directories`
12. [DONE] `phase2.stream1.commit2` Git Commit: `feat: apply development tree filesystem directories` (hash: 5f2a82282)

### Stream: Structurator Facade And Events
13. [DONE] `phase2.stream2.task1` Создать `DevelopmentTreeFilesystemStructuratorFacade` и связать planner/apply/orphan summary за фасадом; scope: `packages/core/src/development-tree/filesystem-structurator/development-tree-filesystem-structurator-facade.ts`, `packages/core/src/development-tree/filesystem-structurator/development-tree-orphan-registry.ts`, `packages/core/src/development-tree/filesystem-structurator/development-tree-filesystem-structurator-facade.test.ts`; expected commit: `feat: add development tree filesystem structurator facade`
14. [DONE] `phase2.stream2.commit1` Git Commit: `feat: add development tree filesystem structurator facade` (hash: c99aabbb5)
15. [DONE] `phase2.stream2.task2` Подписать filesystem structurator на snapshot change/cold-start path без расширения ответственности watcher; scope: `packages/core/src/development-tree/development-tree-state-facade.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts`; expected commit: `feat: materialize filesystem tree from development snapshots`
16. [DONE] `phase2.stream2.commit2` Git Commit: `feat: materialize filesystem tree from development snapshots` (hash: e124d2cc5)

## Phase 3 — Node Bootstrap: Drafts And Agent Sessions (owner: Codex, updated: 2026-05-04)
### Stream: Filesystem-Driven Node Detection
17. [DONE] `phase3.stream1.task1` Реализовать detector новых materialized Product Part / Cluster / Module папок без чтения Diagram Modules artifacts; scope: `packages/core/src/development-tree/node-bootstrap/development-tree-filesystem-watcher.ts`, `packages/core/src/development-tree/node-bootstrap/development-tree-node-detector.ts`, `packages/core/src/development-tree/node-bootstrap/development-tree-node-detector.test.ts`; expected commit: `feat: detect development tree nodes from filesystem`
18. [DONE] `phase3.stream1.commit1` Git Commit: `feat: detect development tree nodes from filesystem` (hash: 7030b0308)
19. [DONE] `phase3.stream1.task2` Создать `DevelopmentTreeNodeBootstrapFacade` с idempotency state для уже обработанных папок; scope: `packages/core/src/development-tree/node-bootstrap/development-tree-node-bootstrap-facade.ts`, `packages/core/src/development-tree/node-bootstrap/development-tree-node-bootstrap-state.ts`, `packages/core/src/development-tree/node-bootstrap/development-tree-node-bootstrap-facade.test.ts`; expected commit: `feat: add development tree node bootstrap facade`
20. [DONE] `phase3.stream1.commit2` Git Commit: `feat: add development tree node bootstrap facade` (hash: 79b54af73)

### Stream: Draft Artifact Materialization
21. [DONE] `phase3.stream2.task1` Реализовать draft template registry и frontmatter builder для Product Part / Cluster / Module artifacts; scope: `packages/core/src/development-tree/node-bootstrap/draft-template-registry.ts`, `packages/core/src/development-tree/node-bootstrap/draft-frontmatter-builder.ts`, `packages/core/src/development-tree/node-bootstrap/draft-template-registry.test.ts`; expected commit: `feat: add development tree draft templates`
22. [DONE] `phase3.stream2.commit1` Git Commit: `feat: add development tree draft templates` (hash: 511bcfbf5)
23. [DONE] `phase3.stream2.task2` Реализовать idempotent draft writer с сохранением `agent-fill` секций и generated-zone updates; scope: `packages/core/src/development-tree/node-bootstrap/draft-writer.ts`, `packages/core/src/development-tree/node-bootstrap/draft-writer.test.ts`, `packages/core/src/development-tree/node-bootstrap/development-tree-node-bootstrap-facade.ts`; expected commit: `feat: materialize development tree draft artifacts`
24. [DONE] `phase3.stream2.commit2` Git Commit: `feat: materialize development tree draft artifacts` (hash: 08ffd64dc)

### Stream: Agent Session Bootstrap
25. [DONE] `phase3.stream3.task1` Реализовать first-message builder для Product Part / Cluster / Module, включая вопрос пользователю при неизвестной технологической базе; scope: `packages/core/src/development-tree/node-bootstrap/node-first-message-builder.ts`, `packages/core/src/development-tree/node-bootstrap/node-first-message-builder.test.ts`, `packages/core/src/development-tree/node-bootstrap/draft-template-registry.ts`; expected commit: `feat: build first messages for development tree agents`
26. [DONE] `phase3.stream3.commit1` Git Commit: `feat: build first messages for development tree agents` (hash: 650357efa)
27. [DONE] `phase3.stream3.task2` Подключить создание агентской сессии и отправку первого сообщения через существующие session/request контуры; scope: `packages/core/src/development-tree/node-bootstrap/node-agent-session-bootstrapper.ts`, `packages/core/src/development-tree/node-bootstrap/development-tree-node-bootstrap-facade.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.ts`; expected commit: `feat: bootstrap agent sessions for development tree nodes`
28. [DONE] `phase3.stream3.commit2` Git Commit: `feat: bootstrap agent sessions for development tree nodes` (hash: 301ef45ec)

## Phase 4 — Readiness And Sidebar Integration (owner: Codex, updated: 2026-05-04)
### Stream: Readiness Classification
29. [DONE] `phase4.stream1.task1` Реализовать `DraftReadinessClassifier` и aggregation rules для Product Part / Cluster / Module; scope: `packages/core/src/development-tree/node-bootstrap/draft-readiness-classifier.ts`, `packages/core/src/development-tree/node-bootstrap/draft-readiness-classifier.test.ts`, `packages/core/src/development-tree/development-tree-types.ts`; expected commit: `feat: classify development tree draft readiness`
30. [DONE] `phase4.stream1.commit1` Git Commit: `feat: classify development tree draft readiness` (hash: 71b15fc0c)
31. [DONE] `phase4.stream1.task2` Включить readiness в development tree snapshot payload через state facade; scope: `packages/core/src/development-tree/development-tree-state-facade.ts`, `packages/core/src/remote-bridge/handlers/development-tree-snapshot.ts`, `packages/core/src/remote-bridge/handlers/development-tree-snapshot.test.ts`; expected commit: `feat: expose readiness in development tree snapshots`
32. [DONE] `phase4.stream1.commit2` Git Commit: `feat: expose readiness in development tree snapshots` (hash: 3b9097f76)

### Stream: Project Manager Rendering
33. [DONE] `phase4.stream2.task1` Обновить PM workflow-state parser/types для optional readiness без регрессии старого payload; scope: `src/client/project-manager/services/workflow-state-client.ts`, `src/client/project-manager/services/workflow-state-client.test.ts`; expected commit: `feat: parse development tree readiness in project manager`
34. [DONE] `phase4.stream2.commit1` Git Commit: `feat: parse development tree readiness in project manager` (hash: 520489edc)
35. [DONE] `phase4.stream2.task2` Обновить sidebar branch-node visuals/status mapping для gray/orange/green readiness states; scope: `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.ts`, `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.test.ts`, `src/client/project-manager/components/layout/workspace-tree-model.ts`; expected commit: `feat: render development tree readiness in sidebar`
36. [DONE] `phase4.stream2.commit2` Git Commit: `feat: render development tree readiness in sidebar` (hash: 2e6a9cf7e)

## Phase 5 — Documentation And Architecture Sync (owner: Codex, updated: 2026-05-04)
### Stream: Canonical Docs
37. [DONE] `phase5.stream1.task1` Синхронизировать System/Cluster docs с реализованной architecture boundary: existing Module 1 extension и filesystem-driven Node Bootstrap; scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`, `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`; expected commit: `docs: document development tree materialization architecture`
38. [DONE] `phase5.stream1.commit1` Git Commit: `docs: document development tree materialization architecture` (hash: 391c6673c)
39. [DONE] `phase5.stream1.task2` Обновить Docs Index и planning-doc disposition notes под implementation scope; scope: `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_Skeleton_Materialization_Architecture.md`; expected commit: `docs: index development tree materialization scope`
40. [DONE] `phase5.stream1.commit2` Git Commit: `docs: index development tree materialization scope` (hash: fe56b470e)

## Phase 6 — Tooling Verification (owner: Codex, updated: 2026-05-04)
### Stream: Targeted Builds And Tests
41. [DONE] `phase6.stream1.task1` Запустить targeted Core verification и исправить только ошибки, относящиеся к development-tree scope; scope: `packages/core`; expected commit: `fix: stabilize development tree core verification`
42. [DONE] `phase6.stream1.commit1` Git Commit: `fix: stabilize development tree core verification` (hash: f25006f6a)
43. [DONE] `phase6.stream1.task2` Запустить targeted Project Manager verification и исправить только ошибки, относящиеся к sidebar/readiness scope; scope: `src/client/project-manager`; expected commit: `fix: stabilize development tree project manager verification`
44. [DONE] `phase6.stream1.commit2` Git Commit: `fix: stabilize development tree project manager verification` (hash: 0bcd2f60c)

### Stream: Manual Test Workspace Verification
45. [DONE] `phase6.stream2.task1` Проверить test workspace `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.5/`: Diagram Modules validation, filesystem tree, drafts, sessions, readiness; scope: manual verification notes in active plan only. Result: Manual verification found a release-blocking defect: skeleton planned-only Product Parts were materialized and bootstrapped before matching Product Part artifacts existed; add fix Stream before Release Build.
46. [DONE] `phase6.stream2.task2` Если manual verification выявит дефекты, добавить отдельный fix Stream перед Release Build; scope: plan update only. Result: Added Manual Verification Fix stream for skeleton-only materialization defect before Release Build.

### Stream: Manual Verification Fix
47. [DONE] `phase6.stream3.task1` Не материализовать filesystem folders/drafts/sessions для skeleton-only planned Product Parts до появления matching Product Part artifact; scope: `packages/core/src/development-tree/filesystem-structurator/development-tree-filesystem-path-planner.ts`, `packages/core/src/development-tree/filesystem-structurator/development-tree-filesystem-path-planner.test.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts`; expected commit: `fix: skip skeleton-only development tree materialization`
48. [DONE] `phase6.stream3.commit1` Git Commit: `fix: skip skeleton-only development tree materialization` (hash: 9df16c842)

## Phase 7 — Release Build (owner: Codex, updated: 2026-05-04)
### Stream: Release Documentation Prep
47. [DONE] `phase7.stream1.task1` Определить будущую версию и обновить release-facing docs до запуска build-all; scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare development tree materialization release`
48. [DONE] `phase7.stream1.commit1` Git Commit: `docs: prepare development tree materialization release` (hash: d894d25b2)

### Stream: Release Build Artifacts
49. [DONE] `phase7.stream2.task1` На чистом дереве выполнить `./scripts/build-all.sh`; scope: release packages/manifests generated by script; expected commit: `chore: build development tree materialization release`
50. [DONE] `phase7.stream2.commit1` Git Commit: `chore: build development tree materialization release` (hash: ca1c51114)
51. [DONE] `phase7.stream2.task2` На чистом дереве выполнить `./scripts/build-release.sh --use-current-version`, проверить `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `Package created`; scope: release artifact verification only. Result: Release build succeeded for 1.2.134: SDK exclusions verified, dev dependencies pruned before packaging, VSIX package created at codeai-hub-1.2.134.vsix.
52. [DONE] `phase7.stream2.task3` Передать пользователю путь к VSIX и свежим tarball artifacts для установки и retest; scope: user handoff only. Result: Handed off release 1.2.134 for user retest: codeai-hub-1.2.134.vsix plus fresh provider/core/UI/launcher tarballs in doc/tmp/releases/.

## Phase 8 — User Workflow Acceptance Testing And Development Tree Workflow Namespace Fix (owner: User + Codex, updated: 2026-05-05)
### Stream: User Retest
53. [DONE] `phase8.stream1.task1` Пользователь устанавливает release VSIX и проверяет workflow: Diagram Modules → PM Development Tree → materialized filesystem tree → drafts → agent sessions → readiness; scope: user test. Result: User retest found release-blocking defects: development tree sessions are stored under continuity/unknown with claude-prefixed dialog ids, and draft/session artifacts are not visible in PM Development Tree.
54. [DONE] `phase8.stream1.task2` Если пользователь сообщает о сбое, оставить scope ACTIVE и добавить investigation/fix Stream перед Scope Closeout; scope: plan update only. Result: Added development-tree workflow namespace, session binding, PM metadata/rendering, verification, release rebuild, retest, and closeout streams.

### Stream: Development Tree Workflow Namespace
55. [DONE] `phase8.stream2.task1` Зафиксировать canonical node workflow identity для Product Part / Cluster / Module как workspace-relative путь, зеркалящий materialized filesystem tree; scope: `packages/core/src/development-tree/node-bootstrap/node-agent-session-bootstrapper.ts`, `packages/core/src/development-tree/node-bootstrap/node-agent-session-bootstrapper.test.ts`, `packages/core/src/development-tree/node-bootstrap/development-tree-node-bootstrap-facade.test.ts`; expected commit: `fix: preserve development tree node workflow identity`
56. [DONE] `phase8.stream2.commit1` Git Commit: `fix: preserve development tree node workflow identity` (hash: 31e664d01)
57. [DONE] `phase8.stream2.task2` Сохранить development-tree node identity в continuity path вместо `unknown`, не ломая legacy workflow stages; scope: `packages/core/src/session-continuity/continuity-types.ts`, `packages/core/src/session-continuity/continuity-store.ts`, `packages/core/src/session-continuity/continuity-store.test.ts`; expected commit: `fix: store development tree continuity by node path`
58. [DONE] `phase8.stream2.commit2` Git Commit: `fix: store development tree continuity by node path` (hash: d91482267)

### Stream: Development Tree Agent Session Binding
59. [DONE] `phase8.stream3.task1` Наследовать provider для node bootstrap из последней `diagram_modules` continuity chain текущего workspace, с fallback на доступный provider только если workflow provider недоступен; scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts`, `packages/core/src/development-tree/node-bootstrap/node-agent-session-bootstrapper.ts`; expected commit: `fix: inherit development tree agent provider`
60. [DONE] `phase8.stream3.commit1` Git Commit: `fix: inherit development tree agent provider` (hash: e44f6005d)
61. [DONE] `phase8.stream3.task2` Сделать dialog/session suffix человекочитаемым по конкретному node path (`project-manager`, `workflow-and-artifact-ui`, `workflow-step-controller`) вместо общего `development-tree`; scope: `packages/core/src/session-continuity/dialog-id.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-continuity-root.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-continuity-root.test.ts`; expected commit: `fix: name development tree sessions by node path`
62. [DONE] `phase8.stream3.commit2` Git Commit: `fix: name development tree sessions by node path` (hash: 1403f601a)

### Stream: Development Tree Snapshot Metadata
63. [DONE] `phase8.stream4.task1` Расширить Core `developmentTree` snapshot metadata для каждого Product Part / Cluster / Module: draft artifact paths и bound session/continuity summary; scope: `packages/core/src/development-tree/development-tree-types.ts`, `packages/core/src/development-tree/development-tree-state-facade.ts`, `packages/core/src/development-tree/development-tree-state-facade-metadata.test.ts`; expected commit: `feat: expose development tree node artifacts and sessions`
64. [DONE] `phase8.stream4.commit1` Git Commit: `feat: expose development tree node artifacts and sessions` (hash: eeb5bb954)
65. [DONE] `phase8.stream4.task2` Обновить Project Manager parser/types под node artifact/session metadata без регрессии старого payload; scope: `src/client/project-manager/services/workflow-state-client.ts`, `src/client/project-manager/services/workflow-state-development-tree-client.ts`, `src/client/project-manager/services/workflow-state-client.test.ts`; expected commit: `feat: parse development tree node metadata`
66. [DONE] `phase8.stream4.commit2` Git Commit: `feat: parse development tree node metadata` (hash: 96c25fb6d)

### Stream: Project Manager Node Artifact And Session Rendering
67. [DONE] `phase8.stream5.task1` Отрисовать под каждым Product Part / Cluster / Module дочерние draft artifact nodes и session nodes, привязанные к конкретному development-tree node path; scope: `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.ts`, `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.test.ts`, `src/client/project-manager/components/layout/workspace-tree.tsx`; expected commit: `feat: render development tree node artifacts and sessions`
68. [DONE] `phase8.stream5.commit1` Git Commit: `feat: render development tree node artifacts and sessions` (hash: e12443b50)

## Phase 9 — Tooling Verification And Release Rebuild After Retest Fix (owner: Codex, updated: 2026-05-05)
### Stream: Targeted Verification
69. [DONE] `phase9.stream1.task1` Запустить targeted Core и Project Manager verification для development-tree namespace/session/artifact rendering fixes и зафиксировать evidence в planning-doc; scope: `packages/core`, `src/client/project-manager`, `doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_Skeleton_Materialization_Architecture.md`; expected commit: `fix: stabilize development tree retest verification`
70. [DONE] `phase9.stream1.commit1` Git Commit: `fix: stabilize development tree retest verification` (hash: 2e0f425a0)

### Stream: Release Rebuild
71. [DONE] `phase9.stream2.task1` Определить будущую версию и обновить release-facing docs до запуска build-all; scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare development tree namespace fix release`
72. [DONE] `phase9.stream2.commit1` Git Commit: `docs: prepare development tree namespace fix release` (hash: d76795b00)
73. [DONE] `phase9.stream2.task2` На чистом дереве выполнить `./scripts/build-all.sh`; scope: release packages/manifests generated by script; expected commit: `chore: build development tree namespace fix release`
74. [DONE] `phase9.stream2.commit2` Git Commit: `chore: build development tree namespace fix release` (hash: 7da16aeb5)
75. [DONE] `phase9.stream2.task3` На чистом дереве выполнить `./scripts/build-release.sh --use-current-version`, проверить SDK exclusions, pruning dev dependencies и VSIX package creation; scope: release artifact verification only. Result: build-release.sh --use-current-version passed for 1.2.135; SDK exclusions verified, dev dependencies pruned/restored, VSIX package created and runtime package surface verified: codeai-hub-1.2.135.vsix
76. [DONE] `phase9.stream2.task4` Передать пользователю новый VSIX и свежие tarball artifacts для повторного retest; scope: user handoff only. Result: Release handoff ready for user retest: VSIX codeai-hub-1.2.135.vsix and tarballs in doc/tmp/releases/*1.2.135* were produced; git tree is clean.

## Phase 10 — User Workflow Acceptance Retest (owner: User + Codex, updated: 2026-05-05)
### Stream: User Retest After Namespace Fix
77. [DONE] `phase10.stream1.task1` Пользователь устанавливает новый release VSIX и проверяет `.codeai-hub` workspace namespace: materialized tree, nested continuity folders, node-specific session suffixes, draft/session nodes в Project Manager; scope: user test. Result: User retest for 1.2.135 partially passed: materialized filesystem tree, nested continuity paths, node-specific session suffixes, and Diagram Modules provider inheritance are fixed; remaining release-blocking defect: artifact/session metadata is rendered as sidebar tree nodes instead of opening in the selected development-tree node surfaces.
78. [DONE] `phase10.stream1.task2` Если пользователь сообщает о сбое, оставить scope ACTIVE и добавить новый investigation/fix Stream перед Scope Closeout; scope: plan update only. Result: Added new fix, verification, release rebuild, and retest streams for the 1.2.135 retest defect: sidebar must contain only P/C/M nodes, while selected node artifacts and session open in the Project Manager main area.

### Stream: Development Tree Node Detail Routing Fix
79. [DONE] `phase10.stream2.task1` Убрать artifact/session rows из sidebar Development Tree и передавать node metadata только через `pm:branch:selected`; scope: `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.ts`, `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.test.ts`, `src/client/project-manager/components/layout/main-area-utils.ts`; expected commit: `fix: route development tree node metadata from sidebar`
80. [DONE] `phase10.stream2.commit1` Git Commit: `fix: route development tree node metadata from sidebar` (hash: 396ed2a51)
81. [DONE] `phase10.stream2.task2` Отобразить выбранные node artifacts в правой части Project Manager и открыть node session в левой части для выбранного Product Part / Cluster / Module; scope: `src/client/project-manager/components/layout/main-area.tsx`, `src/client/project-manager/components/layout/main-area-panel-content.tsx`; expected commit: `fix: show development tree node details in main area`
82. [DONE] `phase10.stream2.commit2` Git Commit: `fix: show development tree node details in main area` (hash: 5dfa8e179)

### Stream: Detail Routing Verification And Release Rebuild
83. [DONE] `phase10.stream3.task1` Запустить targeted PM verification для clean P/C/M sidebar и branch detail surfaces; scope: `src/client/project-manager`; expected commit: `test: verify development tree node detail routing`
84. [DONE] `phase10.stream3.commit1` Git Commit: `test: verify development tree node detail routing` (hash: ba73523ec)
85. [DONE] `phase10.stream3.task2` Подготовить release-facing docs под следующую версию до `build-all`; scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare development tree node detail release`
86. [DONE] `phase10.stream3.commit2` Git Commit: `docs: prepare development tree node detail release` (hash: 2ae610cda)
87. [DONE] `phase10.stream3.task3` На чистом дереве выполнить `./scripts/build-all.sh`; scope: release packages/manifests generated by script; expected commit: `chore: build development tree node detail release`
88. [DONE] `phase10.stream3.commit3` Git Commit: `chore: build development tree node detail release` (hash: e4f6c0421)
89. [DONE] `phase10.stream3.task4` На чистом дереве выполнить `./scripts/build-release.sh --use-current-version`, проверить SDK exclusions, pruning dev dependencies и VSIX package creation; scope: release artifact verification only. Result: build-release.sh --use-current-version passed for 1.2.136; SDK exclusions verified, dev dependencies pruned/restored, VSIX package created and runtime package surface verified: codeai-hub-1.2.136.vsix
90. [DONE] `phase10.stream3.task5` Передать пользователю новый VSIX и свежие tarball artifacts для повторного retest; scope: user handoff only. Result: Release handoff ready for user retest: VSIX codeai-hub-1.2.136.vsix and tarballs in doc/tmp/releases/*1.2.136* were produced; git tree is clean.

### Stream: User Retest After Detail Routing Fix
91. [DONE] `phase10.stream4.task1` Пользователь устанавливает новый release VSIX и проверяет, что sidebar содержит только Product Part / Cluster / Module, а выбранный узел открывает session слева и artifacts справа; scope: user test. Result: User retest for 1.2.136 partially passed: node artifacts now appear for selected Module/Product Part, but node-specific sessions do not appear in the left Project Manager session area; the left area remains bound to Diagram Modules. Treat as release-blocking defect and add a new investigation/fix Stream before closeout.
92. [DONE] `phase10.stream4.task2` Если пользователь сообщает о сбое, оставить scope ACTIVE и добавить новый investigation/fix Stream перед Scope Closeout; scope: plan update only. Result: Added node session exact routing fix, targeted verification, release rebuild, and retest streams for the 1.2.136 release-blocking defect: artifacts route correctly, but the left session surface remains on Diagram Modules instead of the selected development-tree node session.

### Stream: Development Tree Node Session Exact Routing Fix
93. [DONE] `phase10.stream5.task1` Передавать exact dialog/session identity выбранного Product Part / Cluster / Module в left session surface и матчить dialog index сначала по `dialogId` / `rootSessionId` / `sessionId`, а не только по provider/stage; scope: `src/client/project-manager/components/layout/main-area-panel-content.tsx`, `src/client/project-manager/components/sessions/project-manager-dialog-session-view-helpers.ts`, `src/client/project-manager/components/sessions/project-manager-dialog-session-view-helpers.test.ts`; expected commit: `fix: open selected development tree node session`
94. [DONE] `phase10.stream5.commit1` Git Commit: `fix: open selected development tree node session` (hash: 4ce4ef643)

### Stream: Node Session Routing Verification And Release Rebuild
95. [DONE] `phase10.stream6.task1` Запустить targeted PM verification для exact node session routing и зафиксировать evidence в planning-doc; scope: `src/client/project-manager/components/sessions`, `doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_Skeleton_Materialization_Architecture.md`; expected commit: `test: verify development tree node session routing`
96. [DONE] `phase10.stream6.commit1` Git Commit: `test: verify development tree node session routing` (hash: a527b16ec)
97. [DONE] `phase10.stream6.task2` Подготовить release-facing docs под следующую версию до `build-all`; scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare development tree node session release`
98. [DONE] `phase10.stream6.commit2` Git Commit: `docs: prepare development tree node session release` (hash: d9577ada5)
99. [DONE] `phase10.stream6.task3` На чистом дереве выполнить `./scripts/build-all.sh`; scope: release packages/manifests generated by script; expected commit: `chore: build development tree node session release`
100. [DONE] `phase10.stream6.commit3` Git Commit: `chore: build development tree node session release` (hash: d701b6e00)
101. [DONE] `phase10.stream6.task4` На чистом дереве выполнить `./scripts/build-release.sh --use-current-version`, проверить SDK exclusions, pruning dev dependencies и VSIX package creation; scope: release artifact verification only. Result: build-release.sh --use-current-version passed for 1.2.137; SDK exclusions verified, dev dependencies pruned/restored, VSIX package created and runtime package surface verified: codeai-hub-1.2.137.vsix
102. [DONE] `phase10.stream6.task5` Передать пользователю новый VSIX и свежие tarball artifacts для повторного retest; scope: user handoff only. Result: Release handoff ready for user retest: VSIX codeai-hub-1.2.137.vsix and tarballs in doc/tmp/releases/*1.2.137* were produced; git tree is clean.

### Stream: User Retest After Node Session Routing Fix
103. [DONE] `phase10.stream7.task1` Пользователь устанавливает новый release VSIX и проверяет, что выбранный Product Part / Cluster / Module открывает свои artifacts справа и свою node-specific session слева; scope: user test. Result: User retest for 1.2.137 failed: selected Development Tree node artifacts still appear correctly on the right, but the left session surface remains bound to the Diagram Modules Codex session instead of showing the selected Product Part / Cluster / Module node session. Treat as release-blocking defect and add a deeper Core/PM session metadata investigation/fix Stream before closeout.
104. [DONE] `phase10.stream7.task2` Если пользователь сообщает о сбое, оставить scope ACTIVE и добавить новый investigation/fix Stream перед Scope Closeout; scope: plan update only. Result: Added runtime fallback investigation/fix, verification, release rebuild, and retest streams for the 1.2.137 defect: selected node artifacts route correctly, but the left surface still falls back to Diagram Modules when node session metadata is missing or ignored.

### Stream: Development Tree Session Runtime Fallback Fix
105. [DONE] `phase10.stream8.task1` При выбранном Product Part / Cluster / Module фильтровать left runtime session surface по `selectedBranchNode.workflowPath`, даже если exact `session` metadata отсутствует или была отброшена, чтобы fallback не оставался на `diagram_modules`; scope: `src/client/project-manager/components/layout/main-area-panel-content.tsx`, `src/client/project-manager/components/layout/main-area-panel-content.test.ts`; expected commit: `fix: scope development tree runtime sessions by node path`
106. [DONE] `phase10.stream8.commit1` Git Commit: `fix: scope development tree runtime sessions by node path` (hash: d743dcb26)

### Stream: Runtime Session Fallback Verification And Release Rebuild
107. [DONE] `phase10.stream9.task1` Запустить targeted PM verification для node workflowPath runtime fallback и зафиксировать evidence в planning-doc; scope: `src/client/project-manager/components/layout`, `src/client/project-manager/components/sessions`, `doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_Skeleton_Materialization_Architecture.md`; expected commit: `test: verify development tree runtime session fallback`
108. [DONE] `phase10.stream9.commit1` Git Commit: `test: verify development tree runtime session fallback` (hash: 771a87e3d)
109. [DONE] `phase10.stream9.task2` Подготовить release-facing docs под следующую версию до `build-all`; scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare development tree runtime session release`
110. [DONE] `phase10.stream9.commit2` Git Commit: `docs: prepare development tree runtime session release` (hash: 7453f707b)
111. [DONE] `phase10.stream9.task3` На чистом дереве выполнить `./scripts/build-all.sh`; scope: release packages/manifests generated by script; expected commit: `chore: build development tree runtime session release`
112. [DONE] `phase10.stream9.commit3` Git Commit: `chore: build development tree runtime session release` (hash: 2530ccaf3)
113. [DONE] `phase10.stream9.task4` На чистом дереве выполнить `./scripts/build-release.sh --use-current-version`, проверить SDK exclusions, pruning dev dependencies и VSIX package creation; scope: release artifact verification only. Result: build-release.sh --use-current-version passed for 1.2.138; SDK exclusions verified, dev dependencies pruned/restored, VSIX package created and runtime package surface verified: codeai-hub-1.2.138.vsix
114. [DONE] `phase10.stream9.task5` Передать пользователю новый VSIX и свежие tarball artifacts для повторного retest; scope: user handoff only. Result: Release handoff ready for user retest: VSIX codeai-hub-1.2.138.vsix and tarballs in doc/tmp/releases/*1.2.138* were produced; git tree is clean.

### Stream: User Retest After Runtime Session Fallback Fix
115. [DONE] `phase10.stream10.task1` Пользователь устанавливает новый release VSIX и проверяет, что выбранный Product Part / Cluster / Module показывает свои artifacts справа и свою node-specific runtime/dialog session слева; scope: user test. Result: User retest for 1.2.138 failed: selected Development Tree node artifacts appear on the right, but the left session surface remains bound to the previous Diagram Modules Codex dialog/session. Root investigation continues; stale stepStartedIntent/dialog override can still outrank selected node session routing.
116. [DONE] `phase10.stream10.task2` Если пользователь сообщает о сбое, оставить scope ACTIVE и добавить новый investigation/fix Stream перед Scope Closeout; scope: plan update only. Result: Added stale dialog override investigation/fix, targeted verification, release rebuild, and retest streams for the 1.2.138 defect: selected Development Tree node artifacts route correctly, but stale Diagram Modules stepStartedIntent/dialog override still owns the left session surface.
117. [BLOCKED] `phase10.stream10.task3` Получить явное user acceptance релиза; scope: discussion only. Blocked: релиз 1.2.138 не принят после failed retest; acceptance перенесён в `phase10.stream13.task3` после stale dialog override fix.

### Stream: Development Tree Stale Dialog Override Fix
118. [DONE] `phase10.stream11.task1` При выбранном Product Part / Cluster / Module не позволять старому `stepStartedIntent` Diagram Modules переопределять node-specific `initialIntent` / runtime fallback; scope: `src/client/project-manager/components/layout/main-area-panel-content.tsx`, `src/client/project-manager/components/layout/main-area-panel-content.test.ts`; expected commit: `fix: prefer development tree node session intent`
119. [DONE] `phase10.stream11.commit1` Git Commit: `fix: prefer development tree node session intent` (hash: 90d4b6ba2)
120. [DONE] `phase10.stream11.task2` Сбрасывать или игнорировать live `dialogIntentOverride`, если он относится к старому stage и больше не совпадает с `startupStage` выбранного Development Tree node; scope: `src/client/project-manager/components/sessions/project-manager-session-view.tsx`, `src/client/project-manager/components/sessions/project-manager-session-view.test.tsx`; expected commit: `fix: reset stale project manager dialog override`
121. [DONE] `phase10.stream11.commit2` Git Commit: `fix: reset stale project manager dialog override` (hash: a79c8e62b)

### Stream: Stale Dialog Override Verification And Release Rebuild
122. [DONE] `phase10.stream12.task1` Запустить targeted PM tests, которые доказывают: selected node outranks Diagram Modules `stepStartedIntent`, stale dialog override не держит старую сессию, runtime fallback scoped by node path; scope: `src/client/project-manager/components/layout`, `src/client/project-manager/components/sessions`, `doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_Skeleton_Materialization_Architecture.md`; expected commit: `test: verify development tree stale dialog routing`
123. [DONE] `phase10.stream12.commit1` Git Commit: `test: verify development tree stale dialog routing` (hash: 070efcdc5)
124. [DONE] `phase10.stream12.task2` Подготовить release-facing docs под следующую версию до `build-all`; scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare development tree stale dialog release`
125. [DONE] `phase10.stream12.commit2` Git Commit: `docs: prepare development tree stale dialog release` (hash: 4c16ec8ef)
126. [DONE] `phase10.stream12.task3` На чистом дереве выполнить `./scripts/build-all.sh`; scope: release packages/manifests generated by script; expected commit: `chore: build development tree stale dialog release`
127. [DONE] `phase10.stream12.commit3` Git Commit: `chore: build development tree stale dialog release` (hash: c063e5fb1)
128. [DONE] `phase10.stream12.task4` На чистом дереве выполнить `./scripts/build-release.sh --use-current-version`, проверить SDK exclusions, pruning dev dependencies и VSIX package creation; scope: release artifact verification only. Result: build-release.sh --use-current-version passed for 1.2.139; SDK exclusions verified, dev dependencies pruned/restored, VSIX package created and runtime package surface verified: codeai-hub-1.2.139.vsix
129. [DONE] `phase10.stream12.task5` Передать пользователю новый VSIX и свежие tarball artifacts для повторного retest; scope: user handoff only. Result: Release handoff ready for user retest: VSIX codeai-hub-1.2.139.vsix and tarballs in doc/tmp/releases/*1.2.139* were produced; git tree is clean.

### Stream: User Retest After Stale Dialog Override Fix
130. [DONE] `phase10.stream13.task1` Пользователь устанавливает новый release VSIX и проверяет, что клик по Product Part / Cluster / Module всегда переключает левую session surface с Diagram Modules на session выбранного узла, а artifacts остаются справа; scope: user test. Result: User retest for 1.2.139 passed for the release-blocking routing scenario: Product Part / Cluster / Module clicks switch the left session surface correctly and artifacts remain on the right. Follow-up defects remain before acceptance: Development Tree session tab labels show the full workflow path instead of the node name, and first prompts for node agents must include the response language selected in Settings > General > Reasoning.
131. [DONE] `phase10.stream13.task2` Если пользователь сообщает о сбое, оставить scope ACTIVE и добавить новый investigation/fix Stream перед Scope Closeout; scope: plan update only. Result: Added Development Tree session polish fix, targeted verification, release rebuild, and retest streams for the 1.2.139 follow-up defects: session tab labels must show only the Title Case node name, and first prompts for node agents must include the Settings > General > Reasoning response language.
132. [BLOCKED] `phase10.stream13.task3` Получить явное user acceptance релиза; scope: discussion only. Blocked: acceptance перенесён в `phase10.stream16.task3` после session polish follow-up.

### Stream: Development Tree Session Polish Fix
133. [DONE] `phase10.stream14.task1` Сократить label session tab для Development Tree node sessions до имени конечного узла с Title Case вместо полного `development_tree/materialized/...` пути; scope: `src/client/ui/src/session/session-tabs.tsx`, `src/client/ui/src/session/session-tabs.test.tsx`; expected commit: `fix: shorten development tree session tab labels`
134. [DONE] `phase10.stream14.commit1` Git Commit: `fix: shorten development tree session tab labels` (hash: b49e268a9)
135. [DONE] `phase10.stream14.task2` Добавить в первый prompt Development Tree node agents инструкцию отвечать на языке из Settings > General > Reasoning; scope: `packages/core/src/development-tree/node-bootstrap/node-first-message-builder.ts`, `packages/core/src/development-tree/node-bootstrap/node-first-message-builder.test.ts`, `packages/core/src/development-tree/node-bootstrap/node-agent-session-bootstrapper.ts`; expected commit: `fix: localize development tree agent first prompt`
136. [DONE] `phase10.stream14.commit2` Git Commit: `fix: localize development tree agent first prompt` (hash: 4ce826074)
137. [DONE] `phase10.stream14.task3` Покрыть чтение языка ответа из Settings > General > Reasoning при bootstrap Development Tree node session; scope: `packages/core/src/development-tree/node-bootstrap/node-agent-session-bootstrapper.test.ts`; expected commit: `test: verify development tree prompt language settings`
138. [DONE] `phase10.stream14.commit3` Git Commit: `test: verify development tree prompt language settings` (hash: 71a10cca1)

### Stream: Session Polish Verification And Release Rebuild
139. [DONE] `phase10.stream15.task1` Запустить targeted UI/Core tests для коротких Development Tree tab labels и language-aware first prompts, затем зафиксировать evidence в planning-doc; scope: `src/client/ui/src/session`, `packages/core/src/development-tree/node-bootstrap`, `doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_Skeleton_Materialization_Architecture.md`; expected commit: `test: verify development tree session polish`
140. [DONE] `phase10.stream15.commit1` Git Commit: `test: verify development tree session polish` (hash: 40666fef8)
141. [DONE] `phase10.stream15.task2` Подготовить release-facing docs под следующую версию до `build-all`; scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare development tree session polish release`
142. [DONE] `phase10.stream15.commit2` Git Commit: `docs: prepare development tree session polish release` (hash: 540edca5b)
143. [DONE] `phase10.stream15.task3` На чистом дереве выполнить `./scripts/build-all.sh`; scope: release packages/manifests generated by script; expected commit: `chore: build development tree session polish release`
144. [DONE] `phase10.stream15.commit3` Git Commit: `chore: build development tree session polish release` (hash: ce3a791e1)
145. [DONE] `phase10.stream15.task4` На чистом дереве выполнить `./scripts/build-release.sh --use-current-version`, проверить SDK exclusions, pruning dev dependencies и VSIX package creation; scope: release artifact verification only. Result: build-release.sh --use-current-version passed for 1.2.140; SDK exclusions verified, dev dependencies pruned/restored, VSIX runtime package surface verified, package created at codeai-hub-1.2.140.vsix.
146. [DONE] `phase10.stream15.task5` Передать пользователю новый VSIX и свежие tarball artifacts для повторного retest; scope: user handoff only. Result: Release handoff ready for user retest: VSIX codeai-hub-1.2.140.vsix and fresh tarballs in doc/tmp/releases/*1.2.140* were produced; git tree is clean.

### Stream: User Retest After Session Polish Fix
147. [DONE] `phase10.stream16.task1` Пользователь устанавливает новый release VSIX и проверяет короткие tab labels Development Tree node sessions и язык первого prompt для новых node agents; scope: user test. Result: User retest for 1.2.140 partially passed for session tab label and response language, but found a release-blocking prompt-context defect: Development Tree node agents do not receive existing Description / Virtual Simulation / Diagram Modules artifacts and ask the user from scratch.
148. [DONE] `phase10.stream16.task2` Если пользователь сообщает о сбое, оставить scope ACTIVE и добавить новый investigation/fix Stream перед Scope Closeout; scope: plan update only. Result: Added prompt artifact context fix, targeted verification, release rebuild, and retest streams for the 1.2.140 defect: node agents must receive existing Description / Virtual Simulation / Diagram Modules artifacts instead of asking from scratch.
149. [BLOCKED] `phase10.stream16.task3` Получить явное user acceptance релиза; scope: discussion only. Blocked: релиз 1.2.140 не принят после partial retest; acceptance перенесён в `phase10.stream19.task3` после prompt artifact context follow-up.

### Stream: Development Tree Prompt Artifact Context Fix
150. [DONE] `phase10.stream17.task1` Передавать в первый prompt Development Tree node agents краткий контекст уже существующих workflow artifacts: Final Description, Virtual Simulation, Diagram Modules index и Product Part artifact; scope: `packages/core/src/development-tree/node-bootstrap/node-agent-session-bootstrapper.ts`, `packages/core/src/development-tree/node-bootstrap/node-first-message-builder.ts`, `packages/core/src/development-tree/node-bootstrap/node-first-message-builder.test.ts`; expected commit: `fix: include workflow artifacts in development tree prompts`
151. [DONE] `phase10.stream17.commit1` Git Commit: `fix: include workflow artifacts in development tree prompts` (hash: 63c8ed45d)
152. [DONE] `phase10.stream17.task2` Покрыть чтение artifact context из workspace `.codeai-hub` при bootstrap Development Tree node session; scope: `packages/core/src/development-tree/node-bootstrap/node-agent-session-bootstrapper.test.ts`; expected commit: `test: verify development tree prompt artifact context`
153. [DONE] `phase10.stream17.commit2` Git Commit: `test: verify development tree prompt artifact context` (hash: 3e0e28c1a)

### Stream: Prompt Artifact Context Verification And Release Rebuild
154. [DONE] `phase10.stream18.task1` Запустить targeted Core tests для artifact-aware first prompts и зафиксировать evidence в planning-doc; scope: `packages/core/src/development-tree/node-bootstrap`, `doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_Skeleton_Materialization_Architecture.md`; expected commit: `test: verify development tree prompt artifact context release`
155. [DONE] `phase10.stream18.commit1` Git Commit: `test: verify development tree prompt artifact context release` (hash: 28fc71b33)
156. [DONE] `phase10.stream18.task2` Подготовить release-facing docs под следующую версию до `build-all`; scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare development tree prompt context release`
157. [DONE] `phase10.stream18.commit2` Git Commit: `docs: prepare development tree prompt context release` (hash: d21a385bb)
158. [DONE] `phase10.stream18.task3` На чистом дереве выполнить `./scripts/build-all.sh`; scope: release packages/manifests generated by script; expected commit: `chore: build development tree prompt context release`
159. [DONE] `phase10.stream18.commit3` Git Commit: `chore: build development tree prompt context release` (hash: 46eec19f3)
160. [DONE] `phase10.stream18.task4` На чистом дереве выполнить `./scripts/build-release.sh --use-current-version`, проверить SDK exclusions, pruning dev dependencies и VSIX package creation; scope: release artifact verification only. Result: build-release.sh --use-current-version passed for 1.2.141; SDK exclusions verified, dev dependencies pruned/restored, VSIX runtime package surface verified, package created at codeai-hub-1.2.141.vsix.
161. [DONE] `phase10.stream18.task5` Передать пользователю новый VSIX и свежие tarball artifacts для повторного retest; scope: user handoff only. Result: Release handoff ready for user retest: VSIX codeai-hub-1.2.141.vsix and fresh tarballs in doc/tmp/releases/*1.2.141* were produced; git tree is clean.

### Stream: User Retest After Prompt Artifact Context Fix
162. [DONE] `phase10.stream19.task1` Пользователь устанавливает новый release VSIX и проверяет, что новые Development Tree node agents получают context из существующих workflow artifacts и не спрашивают с нуля, что такое Project Manager; scope: user test. Result: User retest for 1.2.141 partially passed for workflow artifact context, but found a release-blocking artifact-language defect: Development Tree node-agent chat follows Russian settings while ClusterDescription/ClusterFacadeContract drafts are generated in English.
163. [DONE] `phase10.stream19.task2` Если пользователь сообщает о сбое, оставить scope ACTIVE и добавить новый investigation/fix Stream перед Scope Closeout; scope: plan update only. Result: Added prompt artifact-language fix, targeted verification, release rebuild, and retest streams for the 1.2.141 defect: Development Tree node agents must write draft artifact prose in Settings > General > Artifacts for the User language, matching earlier workflow steps.
164. [BLOCKED] `phase10.stream19.task3` Получить явное user acceptance релиза; scope: discussion only. Blocked: релиз 1.2.141 не принят после partial retest; acceptance перенесён в `phase10.stream22.task3` после prompt artifact-language follow-up.

### Stream: Development Tree Scoped Prompt Context Fix
165. [DONE] `phase10.stream20.task1` Заменить full upstream artifact dump на deterministic scoped context extractor: markdown section/block parsing, node anchors из Product Part / Cluster / Module identity, scoring snippets из `Final_Description.md`, `virtual-simulation.md`, `product-parts.index.md`, `product-parts/<part-id>.md`; scope: `packages/core/src/development-tree/node-bootstrap/node-prompt-context-extractor.ts`, `packages/core/src/development-tree/node-bootstrap/node-prompt-context-extractor.test.ts`, `packages/core/src/development-tree/node-bootstrap/node-first-message-builder.ts`; expected commit: `fix: scope development tree prompt context`
166. [DONE] `phase10.stream20.commit1` Git Commit: `fix: scope development tree prompt context` (hash: cce639e3e)
167. [DONE] `phase10.stream20.task2` Подключить scoped extractor в node bootstrapper вместо передачи почти полного текста upstream artifacts; Product Part получает только part-scoped context, Cluster/Module получают parent + own node snippets и релевантные upstream snippets; scope: `packages/core/src/development-tree/node-bootstrap/node-agent-session-bootstrapper.ts`, `packages/core/src/development-tree/node-bootstrap/node-agent-session-bootstrapper.test.ts`, `packages/core/src/development-tree/node-bootstrap/node-first-message-builder.test.ts`; expected commit: `fix: use scoped development tree prompt context`
168. [DONE] `phase10.stream20.commit2` Git Commit: `fix: use scoped development tree prompt context` (hash: c5acd8d2a)

### Stream: Development Tree Draft Artifact Language Fix
169. [DONE] `phase10.stream21.task1` Добавить в первый prompt Development Tree node agents отдельную runtime directive для языка draft artifacts, аналогичную Description / Virtual Simulation / Diagram Modules: писать agent-fill prose draft-файлов на языке Settings > General > Artifacts for the User, сохраняя canonical headers, ids, DSL markers, status/frontmatter tokens и file names на английском; scope: `packages/core/src/development-tree/node-bootstrap/node-agent-session-bootstrapper.ts`, `packages/core/src/development-tree/node-bootstrap/node-first-message-builder.ts`, `packages/core/src/development-tree/node-bootstrap/node-first-message-builder.test.ts`; expected commit: `fix: localize development tree draft artifacts`
170. [DONE] `phase10.stream21.commit1` Git Commit: `fix: localize development tree draft artifacts` (hash: 6dd6cfc49)
171. [DONE] `phase10.stream21.task2` Покрыть чтение artifact language из Settings > General > Artifacts for the User при bootstrap Development Tree node session; scope: `packages/core/src/development-tree/node-bootstrap/node-agent-session-bootstrapper.test.ts`; expected commit: `test: verify development tree draft artifact language`
172. [DONE] `phase10.stream21.commit2` Git Commit: `test: verify development tree draft artifact language` (hash: cead7bac0)

### Stream: Scoped Context And Artifact Language Verification And Release Rebuild
173. [DONE] `phase10.stream22.task1` Запустить targeted Core tests для scoped prompt context и artifact-language-aware first prompts, затем зафиксировать evidence в planning-doc; scope: `packages/core/src/development-tree/node-bootstrap`, `doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_Skeleton_Materialization_Architecture.md`; expected commit: `test: verify development tree scoped prompt language`
174. [DONE] `phase10.stream22.commit1` Git Commit: `test: verify development tree scoped prompt language` (hash: d70ac9466)
175. [DONE] `phase10.stream22.task2` Подготовить release-facing docs под следующую версию до `build-all`; scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare development tree scoped prompt release`
176. [DONE] `phase10.stream22.commit2` Git Commit: `docs: prepare development tree scoped prompt release` (hash: a0377bb72)
177. [DONE] `phase10.stream22.task3` На чистом дереве выполнить `./scripts/build-all.sh`; scope: release packages/manifests generated by script; expected commit: `chore: build development tree scoped prompt release`
178. [DONE] `phase10.stream22.commit3` Git Commit: `chore: build development tree scoped prompt release` (hash: f550bab3e)
179. [DONE] `phase10.stream22.task4` На чистом дереве выполнить `./scripts/build-release.sh --use-current-version`, проверить SDK exclusions, pruning dev dependencies и VSIX package creation; scope: release artifact verification only. Result: build-release.sh --use-current-version passed for 1.2.142; SDK exclusions verified, dev dependencies pruned/restored, VSIX package created and runtime package surface verified: codeai-hub-1.2.142.vsix
180. [DONE] `phase10.stream22.task5` Передать пользователю новый VSIX и свежие tarball artifacts для повторного retest; scope: user handoff only. Result: Release handoff ready for user retest: VSIX codeai-hub-1.2.142.vsix and tarballs in doc/tmp/releases/*1.2.142* were produced; git tree is clean.

### Stream: User Retest After Scoped Prompt And Artifact Language Fix
181. [DONE] `phase10.stream23.task1` Пользователь устанавливает новый release VSIX и проверяет, что новые Development Tree node agents получают scoped context по выбранному Product Part / Cluster / Module, не получают лишние полные upstream документы, ведут диалог и заполняют draft artifacts на выбранном языке, сохраняя canonical structural tokens на английском; scope: user test. Result: User retest accepted for release 1.2.142: Development Tree materialized structure, Project Manager sidebar readiness, selected node sessions, selected node artifacts, scoped node prompt context, chat language, and draft artifact language work as expected. Cross-workflow prompt-language follow-up is moved to a separate future scope.
182. [DONE] `phase10.stream23.task2` Если пользователь сообщает о сбое, оставить scope ACTIVE и добавить новый investigation/fix Stream перед Scope Closeout; scope: plan update only. Result: No Development Tree blocking defect remains after user acceptance. The observed workflow prompt-language hardening topic is not part of this materialization scope and will be handled in a separate planning cycle.
183. [DONE] `phase10.stream23.task3` Получить явное user acceptance релиза; scope: discussion only. Result: User explicitly accepted closing the Development Tree materialization plan as completed and moving prompt-language follow-up work to a new plan.

## Phase 11 — Scope Closeout (owner: Codex, updated: 2026-05-05)
### Stream: Closeout Archive And Planning Disposition
184. [IN_PROGRESS] `phase11.stream1.task1` После явного acceptance архивировать active `todo-plan.md`, перенести planning-doc в `Plans/Archive/`, обновить `Docs_Index.md` и оставить terminal `NONE` handoff; scope: `doc/TODO/todo-plan.md`, `doc/TODO/Archive/*`, `doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_Skeleton_Materialization_Architecture.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close development tree materialization scope`
185. [TODO] `phase11.stream1.commit1` Git Commit: `docs: close development tree materialization scope` (hash: TBD)
186. [TODO] `phase11.stream1.task2` Reserved post-closeout handoff anchor; scope: plan orchestrator terminal state only.
````
