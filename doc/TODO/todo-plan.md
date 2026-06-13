# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "development-tree-early-product-part-precode-bootstrap-2026-06-12",
  "branch": "main",
  "baseHead": "8f8d9b8c8",
  "lastRecordedCommit": "ec0c20e7a",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_UserGateReviewCursor_Architecture.md",
  "currentTaskId": "devtree-early-pp.phase4.release-build-500.task1",
  "expectedCommitMessage": "chore: release 1.2.500",
  "debt": {
    "expectedCommitMessage": "chore: release 1.2.500",
    "preCommitHead": "ec0c20e7a",
    "stage": "commit_pending",
    "taskId": "devtree-early-pp.phase4.release-build-500.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_UserGateReviewCursor_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_UserGateReviewCursor_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_DownstreamExecutionRefactor_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)

- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Scope этого цикла: ранний запуск Product Part pre-code lane после acceptance `Diagram Modules`, без запуска production code и без снятия `Application Skeleton -> Quality Gates` code-readiness gate.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: изменение и отдельный `Git Commit: ...`.
- Если по факту разработки подзадача затрагивает больше 3 файлов, разбить её на более мелкие.
- Для штатного коммита использовать `npm run plan:commit -- "<expected commit message>"`.
- Не обходить Husky hooks / quality gates.
- Таргетные проверки: `npm test --workspace @codeai-hub/core -- --test-reporter=spec <relevant tests>` и `npm run build --workspace @codeai-hub/core`.
- **Release Build Confirmation Gate:** после завершения фиксов и проверок остановиться и получить отдельное подтверждение пользователя перед подготовкой release notes, `build-all.sh` и `build-release.sh`.

## Phase 1 - Early Product Part Pre-Code Bootstrap (owner: Codex, updated: 2026-06-12)

### Stream: Core Bootstrap Contract

1. [DONE] `devtree-early-pp.phase1.bootstrap-service.task1` Вынести общий Core-owned Product Part pre-code bootstrap в переиспользуемый сервис, чтобы Quality Gates handoff стал recovery/idempotency caller, а не единственным владельцем запуска Product Part agents (scope: `packages/core/src/remote-bridge/handlers/development-tree-quality-gates-handoff-bootstrap.ts, packages/core/src/remote-bridge/handlers/development-tree-product-part-precode-bootstrap.ts, doc/TODO/todo-plan.md`; expected commit: `fix: centralize development tree product part precode bootstrap`).
2. [DONE] Git Commit: `fix: centralize development tree product part precode bootstrap` (hash: 7b0870b26)

### Stream: Diagram Modules Acceptance Fan-Out

3. [DONE] `devtree-early-pp.phase1.diagram-acceptance.task1` Запускать Product Part pre-code bootstrap сразу после Core acceptance `Diagram Modules` через Diagram Modules-owned managed Git committer, сохраняя activation `Application Skeleton` и не связывая ранний fan-out с Quality Gates controller (scope: `packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-review-acceptance.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-review-decisions.ts, doc/TODO/todo-plan.md`; expected commit: `fix: start product part precode agents after diagram modules`).
4. [DONE] Git Commit: `fix: start product part precode agents after diagram modules` (hash: 7995807ab)
5. [DONE] `devtree-early-pp.phase1.diagram-test.task1` Проверить, что acceptance `Diagram Modules` создаёт Product Part brief plans/sessions уже на этом шаге, а старый Quality Gates handoff остаётся recovery/idempotency path (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-diagram-review-actions.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.quality-gates.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: cover early product part precode bootstrap`).
6. [DONE] Git Commit: `test: cover early product part precode bootstrap` (hash: ccd33fceb)

### Stream: Architecture Documentation

7. [DONE] `devtree-early-pp.phase1.docs.task1` Синхронизировать SSOT и активный planning-документ: pre-code Product Part lane стартует после accepted `Diagram Modules`, а `Application Skeleton -> Quality Gates` остаётся барьером только для production code/code-ready merge (scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_UserGateReviewCursor_Architecture.md`; expected commit: `docs: document early development tree precode bootstrap`).
8. [DONE] Git Commit: `docs: document early development tree precode bootstrap` (hash: 2a9513186)

## Phase 2 - Tooling Verification (owner: Codex, updated: 2026-06-12)

### Stream: Targeted Core Checks

9. [DONE] `devtree-early-pp.phase2.verify.task1` Выполнить таргетные тесты и сборку Core для затронутых handlers/managed workflow paths (scope: `packages/core`; expected commit: none). Result: Verification passed: npm run build --workspace @codeai-hub/core; node --test --test-reporter=spec packages/core/dist/remote-bridge/handlers/session-request-handler-diagram-review-actions.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-managed-workflow-turn.quality-gates.test.js.

## Phase 3 - Release Build (owner: Codex/User, updated: 2026-06-12)

### Stream: Release Build Confirmation

10. [DONE] `devtree-early-pp.phase3.release-confirm.task1` Получить отдельное подтверждение пользователя на релизную сборку после зелёных фиксов и проверок (scope: `manual confirmation`; expected commit: none). Result: Пользователь явно подтвердил сборку нового релиза 1.2.493 после зелёной verification.
11. [DONE] `devtree-early-pp.phase3.release-docs.task1` После подтверждения подготовить release notes/version docs на будущую версию перед `build-all.sh` (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.493`).
12. [DONE] Git Commit: `docs: prepare release 1.2.493` (hash: 8f211df63)
13. [DONE] `devtree-early-pp.phase3.release-build.task1` Запустить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, зафиксировать release artifacts/status в плане (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `chore: release 1.2.493`). Result: `./scripts/build-all.sh --allow-dirty` и `./scripts/build-release.sh --use-current-version --allow-dirty` завершились успешно; VSIX: `codeai-hub-1.2.493.vsix`; tarball'ы 1.2.493 скопированы в `doc/tmp/releases/` и `~/.codeai-hub/releases/`.
14. [DONE] Git Commit: `chore: release 1.2.493` (hash: 3b7666ce4)

## Phase 4 - User Workflow Acceptance Testing (owner: User, updated: 2026-06-12)

### Stream: Retest Early Development Tree Fan-Out

15. [BLOCKED] `devtree-early-pp.phase4.user-retest.task1` Пользователь тестирует релиз: после Diagram Modules acceptance Product Part agents должны стартовать раньше Application Skeleton/Quality Gates code-readiness gate, secondary briefs должны быть доступны для последовательного review, а production code не должен стартовать до verified Quality Gates (scope: `manual retest`; expected commit: none). Result: Релиз 1.2.493 заблокирован на старте `virtual_simulation`: `WorkflowBoundaryGit.statusPorcelain()` теряет ведущий пробел porcelain-строки ` M .codeai-hub/...`, downstream path parser получает `codeai-hub/.../workflow/state.json`, и `git add -A -- codeai-hub/.../workflow/state.json` падает.

### Stream: Workflow Boundary Status Pathspec Fix

16. [DONE] `devtree-early-pp.phase4.status-pathspec.task1` Сохранить ведущие status columns в `WorkflowBoundaryGit.statusPorcelain()` и покрыть regression test для modified tracked `.codeai-hub/<workspace>/workflow/state.json` при старте следующего workflow boundary (scope: `packages/core/src/workflow/boundary/workflow-boundary-git.ts, packages/core/src/workflow/boundary/workflow-boundary-git.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: preserve workflow status path prefixes`).
17. [DONE] Git Commit: `fix: preserve workflow status path prefixes` (hash: c1800e5ef)
18. [DONE] `devtree-early-pp.phase4.status-pathspec-verify.task1` Выполнить targeted Core tests/build для workflow boundary git pathspec fix (scope: `packages/core`; expected commit: none). Result: Verification passed: npm run build --workspace @codeai-hub/core; node --test --test-reporter=spec packages/core/dist/workflow/boundary/workflow-boundary-git.test.js packages/core/dist/workflow/boundary/workflow-boundary-facade.test.js packages/core/dist/remote-bridge/remote-bridge-session-create-router.test.js.
19. [DONE] `devtree-early-pp.phase4.release-confirm-494.task1` Получить отдельное подтверждение пользователя на релизную сборку после фикса `WorkflowBoundaryGit.statusPorcelain()` (scope: `manual confirmation`; expected commit: none). Result: Пользователь явно подтвердил сборку нового релиза 1.2.494.
20. [DONE] `devtree-early-pp.phase4.release-docs-494.task1` Подготовить README/CHANGELOG и active plan на будущую версию 1.2.494 перед `build-all.sh` (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.494`).
21. [DONE] Git Commit: `docs: prepare release 1.2.494` (hash: 9fe405770)
22. [DONE] `devtree-early-pp.phase4.release-build-494.task1` Запустить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, зафиксировать release artifacts/status в плане (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `chore: release 1.2.494`). Result: `./scripts/build-all.sh --allow-dirty` и `./scripts/build-release.sh --use-current-version --allow-dirty` завершились успешно; VSIX: `codeai-hub-1.2.494.vsix` (5.2M); tarball'ы 1.2.494 скопированы в `doc/tmp/releases/` и `~/.codeai-hub/releases/`.
23. [DONE] Git Commit: `chore: release 1.2.494` (hash: a8407f57f)
24. [BLOCKED] `devtree-early-pp.phase4.user-retest-494.task1` Пользователь тестирует следующий релиз: Description -> Virtual Simulation должен стартовать после modified tracked `.codeai-hub/<workspace>/workflow/state.json`, затем повторно проверить ранний Product Part pre-code fan-out после Diagram Modules (scope: `manual retest`; expected commit: none). Result: Релиз 1.2.494 подтвердил ранний запуск Product Part pre-code agents, но выявил незавершённый слой user-gate cursor: несколько Product Part brief review gates одновременно выглядят равнозначными, lead Product Part не откладывается последним для реакции пользователя, а Documentation Tree review gates ещё не участвуют в едином attention model.

### Stream: User Gate Cursor

25. [DONE] `devtree-early-pp.phase4.user-gate-core.task1` Добавить Core-owned Development Tree user-gate cursor в snapshot/read-model: active gate, queued gates, Product Part brief review ordering with non-lead before lead (scope: `packages/core/src/development-tree/development-tree-types.ts, packages/core/src/development-tree/development-tree-user-gate-cursor.ts, packages/core/src/remote-bridge/handlers/development-tree-snapshot.ts`; expected commit: `fix: expose development tree user gate cursor`).
26. [DONE] Git Commit: `fix: expose development tree user gate cursor` (hash: 07ce1a586)
27. [DONE] `devtree-early-pp.phase4.user-gate-core-test.task1` Покрыть Development Tree user-gate cursor regression test: два Product Part brief review gates, non-lead active, lead queued last (scope: `packages/core/src/development-tree/development-tree-user-gate-cursor.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: cover development tree user gate cursor`).
28. [DONE] Git Commit: `test: cover development tree user gate cursor` (hash: e6e4dd361)
29. [DONE] `devtree-early-pp.phase4.user-gate-doc-tree.task1` Подключить Documentation Tree user gates для Application Skeleton и Quality Gates review prompts в workflow state read-model (scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.ts, src/client/project-manager/services/workflow-state-client.ts, src/client/project-manager/services/workflow-state-client.test.ts`; expected commit: `fix: expose documentation user gate cursor`).
30. [DONE] Git Commit: `fix: expose documentation user gate cursor` (hash: 8f3effec1)
31. [DONE] `devtree-early-pp.phase4.user-gate-ui.task1` Отобразить active/queued user-gate markers в существующих Documentation Tree / Development Tree nodes и заблокировать queued review input/actions read-only до promotion (scope: `src/client/project-manager/components/layout/workspace-tree.tsx, src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx, packages/ui/project-manager/styles.css`; expected commit: `fix: show user gate attention markers`).
32. [DONE] Git Commit: `fix: show user gate attention markers` (hash: 21fc7c831)
33. [DONE] `devtree-early-pp.phase4.user-gate-verify.task1` Выполнить targeted Core/Project Manager tests/build для user-gate cursor и markers (scope: `packages/core, src/client/project-manager`; expected commit: none). Result: Targeted verification passed: core build, development-tree cursor test, workflow-state client test, webview typecheck, Project Manager build, webview build.
34. [DONE] `devtree-early-pp.phase4.release-confirm-495.task1` Получить отдельное подтверждение пользователя на релизную сборку после фикса user-gate cursor (scope: `manual confirmation`; expected commit: none). Result: Пользователь явно подтвердил сборку нового релиза 1.2.495.
35. [DONE] `devtree-early-pp.phase4.release-docs-495.task1` Подготовить README/CHANGELOG и active plan на будущую версию 1.2.495 перед `build-all.sh` (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.495`).
36. [DONE] Git Commit: `docs: prepare release 1.2.495` (hash: ec6280414)
37. [DONE] `devtree-early-pp.phase4.release-build-495.task1` Запустить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, зафиксировать release artifacts/status в плане (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `chore: release 1.2.495`). Result: `./scripts/build-all.sh --allow-dirty` и `./scripts/build-release.sh --use-current-version --allow-dirty` завершились успешно; VSIX: `codeai-hub-1.2.495.vsix` (5.2M); tarball'ы 1.2.495 скопированы в `doc/tmp/releases/` и `~/.codeai-hub/releases/`.
38. [DONE] Git Commit: `chore: release 1.2.495` (hash: 2042cc102)
39. [BLOCKED] `devtree-early-pp.phase4.user-retest-495.task1` Пользователь тестирует следующий релиз: active user gate должен подсвечиваться pulsing amber/orange, queued gates должны быть read-only, secondary Product Part briefs должны идти перед lead Product Part, Documentation Tree gates Application Skeleton / Quality Gates должны участвовать в том же attention model (scope: `manual retest`; expected commit: none). Result: Product Part gates подсвечиваются и queued input блокируется, но Documentation Tree шаг `Quality Gates Baseline` может ждать реакции пользователя без marker; текущий cursor слишком узко опирается на частные review/progress states вместо Core-owned managed input availability.

### Stream: Managed Input Attention Cursor

40. [DONE] `devtree-early-pp.phase4.input-attention-core.task1` Перевести user attention cursor на Core-owned managed gate state: active/queued gates определяются явным user-review/user-gate состоянием Development Tree и Documentation Tree; свободный продолжабельный чат сам по себе не создаёт orange marker для формально завершённого шага (scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.ts, packages/core/src/remote-bridge/handlers/workflow-user-input-attention.ts, packages/core/src/remote-bridge/handlers/workflow-user-input-attention.test.ts`; expected commit: `fix: derive user attention from managed input state`).
41. [DONE] Git Commit: `fix: derive user attention from managed input state` (hash: 839bbcba4)
42. [DONE] `devtree-early-pp.phase4.input-attention-service-test.task1` Покрыть response-level поведение `WorkflowStateService`: Documentation Tree gate появляется при managed `awaiting_acceptance`, а обычный продолжабельный/завершённый чат не является самостоятельным источником attention marker (scope: `packages/core/src/remote-bridge/handlers/workflow-state-service-user-input-attention.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: cover workflow managed attention cursor`).
43. [DONE] Git Commit: `test: cover workflow managed attention cursor` (hash: 69880fb9f)
44. [DONE] `devtree-early-pp.phase4.input-attention-ui.task1` Сделать active user attention row/frame animation устойчивой: оранжевая рамка не исчезает, а плавно меняет intensity/opacity примерно от 100% до 60% и обратно (scope: `packages/ui/project-manager/styles.css, doc/TODO/todo-plan.md`; expected commit: `fix: animate active user attention frames`).
45. [DONE] Git Commit: `fix: animate active user attention frames` (hash: e188ed067)
46. [DONE] `devtree-early-pp.phase4.input-attention-verify.task1` Выполнить targeted Core/Project Manager tests/build для managed input attention cursor и tree markers (scope: `packages/core, src/client/project-manager`; expected commit: none). Result: Targeted verification passed: npm run build --workspace @codeai-hub/core; node --test workflow-user-input-attention, workflow-state-service-user-input-attention, development-tree-user-gate-cursor; npm run typecheck:webview; npm run build:project-manager; npm run build:webview.
47. [DONE] `devtree-early-pp.phase4.release-confirm-496.task1` Получить отдельное подтверждение пользователя на релизную сборку после фикса managed input attention cursor (scope: `manual confirmation`; expected commit: none). Result: Пользователь явно подтвердил сборку нового релиза 1.2.496 после зелёной verification.
48. [DONE] `devtree-early-pp.phase4.release-docs-496.task1` Подготовить README/CHANGELOG и active plan на будущую версию 1.2.496 перед `build-all.sh` (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.496`).
49. [DONE] Git Commit: `docs: prepare release 1.2.496` (hash: fc054f5ea)
50. [DONE] `devtree-early-pp.phase4.release-build-496.task1` Запустить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, зафиксировать release artifacts/status в плане (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `chore: release 1.2.496`). Result: `./scripts/build-all.sh --allow-dirty` и `./scripts/build-release.sh --use-current-version --allow-dirty` завершились успешно; VSIX: `codeai-hub-1.2.496.vsix` (5.2M); tarball'ы 1.2.496 скопированы в `doc/tmp/releases/` и `~/.codeai-hub/releases/`.
51. [DONE] Git Commit: `chore: release 1.2.496` (hash: 34c23d6fe)
52. [BLOCKED] `devtree-early-pp.phase4.user-retest-496.task1` Пользователь тестирует следующий релиз: любой managed workflow/development-tree user-review/user-gate должен подсвечивать соответствующий узел дерева анимированной orange frame; queued user gates остаются read-only; Quality Gates Baseline должен подсвечиваться, когда Core/агент открыл user review, а формально завершённые зелёные шаги не должны получать orange marker только потому, что чат можно продолжить (scope: `manual retest`; expected commit: none). Result: Релиз 1.2.496 подсвечивает часть managed review gates, но Quality Gates research review не подсвечивается: на этом шаге существуют только `quality-gates-research.md/json`, stage plan уже стоит на `quality-gates.phase2.review.task1`, а `qualityGatesProgress` ещё `null`, потому что reader ждёт финальные `quality-gates.md/json`.

### Stream: Quality Gates Research Review Attention

53. [DONE] `devtree-early-pp.phase4.qg-research-attention.task1` Расширить Core-owned Documentation Tree attention source: Quality Gates user review определяется по активному managed stage todo-plan review task и покрывает research review до появления финальных `quality-gates.md/json`; stale managed decision JSON сам по себе не создаёт marker (scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.ts, packages/core/src/remote-bridge/handlers/workflow-user-input-attention.ts, doc/TODO/todo-plan.md`; expected commit: `fix: show quality gates research review attention`).
54. [DONE] Git Commit: `fix: show quality gates research review attention` (hash: a19596838)
55. [DONE] `devtree-early-pp.phase4.qg-research-attention-test.task1` Покрыть regression test для Quality Gates research review: при `currentTaskId=quality-gates.phase2.review.task1` и только `quality-gates-research.md/json` workflow state отдаёт active `workflow:quality_gates`; accepted/completed state без review task не подсвечивается (scope: `packages/core/src/remote-bridge/handlers/workflow-state-service-user-input-attention.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: cover quality gates research review attention`).
56. [DONE] Git Commit: `test: cover quality gates research review attention` (hash: 9c2847c67)
57. [DONE] `devtree-early-pp.phase4.qg-research-attention-verify.task1` Выполнить targeted Core/Project Manager verification для Quality Gates research review attention (scope: `packages/core, src/client/project-manager`; expected commit: none). Result: Targeted verification passed: npm run build --workspace @codeai-hub/core; node --test workflow-state-service-user-input-attention, workflow-user-input-attention, development-tree-user-gate-cursor; npm run typecheck:webview; npm run build:project-manager; npm run build:webview.
58. [DONE] `devtree-early-pp.phase4.release-confirm-497.task1` Получить отдельное подтверждение пользователя на релизную сборку после фикса Quality Gates research review attention (scope: `manual confirmation`; expected commit: none). Result: Пользователь явно подтвердил сборку нового релиза 1.2.497 после фикса Quality Gates research review attention.
59. [DONE] `devtree-early-pp.phase4.release-docs-497.task1` Подготовить README/CHANGELOG и active plan на будущую версию 1.2.497 перед `build-all.sh` (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.497`).
60. [DONE] Git Commit: `docs: prepare release 1.2.497` (hash: 9dd520c96)
61. [DONE] `devtree-early-pp.phase4.release-build-497.task1` Запустить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, зафиксировать release artifacts/status в плане (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `chore: release 1.2.497`). Result: `./scripts/build-all.sh --allow-dirty` и `./scripts/build-release.sh --use-current-version --allow-dirty` завершились успешно; VSIX: `codeai-hub-1.2.497.vsix` (5.2M); tarball'ы 1.2.497 находятся в `doc/tmp/releases/` и `~/.codeai-hub/releases/`.
62. [DONE] Git Commit: `chore: release 1.2.497` (hash: 0168cc67e)
63. [BLOCKED] `devtree-early-pp.phase4.user-retest-497.task1` Пользователь тестирует следующий релиз: Quality Gates Baseline должен подсвечиваться анимированной orange frame уже на research review, когда stage todo-plan находится на managed review task и доступны только `quality-gates-research.md/json`; stale completed stages и persistent return phases остаются зелёными/обычными без orange marker (scope: `manual retest`; expected commit: none). Result: Релиз 1.2.497 исправил Quality Gates research review, но выявил такой же пробел для preliminary Documentation Tree review: после `Description` Core открывает пользовательскую проверку с кнопкой `Подтверждаю`, однако filesystem hydration уже видит `Final_Description.md` и отображает шаг зелёным без active orange user-gate frame.

### Stream: Preliminary Workflow Review Attention

64. [DONE] `devtree-early-pp.phase4.preliminary-attention.task1` Подключить preliminary user review gates для `Description` и `Virtual Simulation` к тому же Core-owned `userGateCursor`: открытый `managed-workflow-user-review` в сессии даёт active Documentation Tree marker, а `managed-workflow-complete` закрывает marker (scope: `packages/core/src/remote-bridge/handlers/workflow-preliminary-review-attention.ts, packages/core/src/remote-bridge/handlers/workflow-state-service.ts, packages/core/src/remote-bridge/handlers/workflow-user-input-attention.ts`; expected commit: `fix: show preliminary workflow review attention`).
65. [DONE] Git Commit: `fix: show preliminary workflow review attention` (hash: de2ff0b06)
66. [DONE] `devtree-early-pp.phase4.preliminary-attention-test.task1` Покрыть regression tests: `Description` review с `Final_Description.md` и открытым Core gate возвращает active `workflow:description`; после persistent return/completion marker исчезает; `Virtual Simulation` review использует тот же контракт (scope: `packages/core/src/remote-bridge/handlers/workflow-state-service-user-input-attention.test.ts, packages/core/src/remote-bridge/handlers/workflow-user-input-attention.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: cover preliminary workflow review attention`).
67. [DONE] Git Commit: `test: cover preliminary workflow review attention` (hash: ac4ac652d)
68. [DONE] `devtree-early-pp.phase4.preliminary-attention-verify.task1` Выполнить targeted Core/Project Manager verification для preliminary Documentation Tree review attention (scope: `packages/core, src/client/project-manager`; expected commit: none). Result: Targeted verification passed: @codeai-hub/core build; workflow user-input attention tests; workflow-state user-input attention tests; typecheck:webview; build:project-manager; build:webview
69. [DONE] `devtree-early-pp.phase4.release-confirm-498.task1` Получить отдельное подтверждение пользователя на релизную сборку после фикса preliminary workflow review attention (scope: `manual confirmation`; expected commit: none). Result: User confirmed release build 1.2.498
70. [DONE] `devtree-early-pp.phase4.release-docs-498.task1` Подготовить README/CHANGELOG и active plan на будущую версию 1.2.498 перед `build-all.sh` (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.498`).
71. [DONE] Git Commit: `docs: prepare release 1.2.498` (hash: 566232152)
72. [DONE] `devtree-early-pp.phase4.release-build-498.task1` Запустить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, зафиксировать release artifacts/status в плане (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `chore: release 1.2.498`). Result: `./scripts/build-all.sh --allow-dirty` и `./scripts/build-release.sh --use-current-version --allow-dirty` завершились успешно; VSIX: `codeai-hub-1.2.498.vsix` (5.2M); tarball'ы 1.2.498 находятся в `doc/tmp/releases/` и `~/.codeai-hub/releases/`.
73. [DONE] Git Commit: `chore: release 1.2.498` (hash: 4747aa955)
74. [BLOCKED] `devtree-early-pp.phase4.user-retest-498.task1` Пользователь тестирует следующий релиз: `Description` и `Virtual Simulation` должны получать анимированную orange frame в Documentation Tree, когда Core открыл preliminary user review и ждёт `Подтверждаю`; после acceptance/persistent return эти шаги остаются обычными зелёными без orange marker (scope: `manual retest`; expected commit: none). Result: Релиз 1.2.498 подтвердил появление animated attention marker уже на `Description`, но выявил два timing-дефекта: marker появляется с задержкой после review-карточки и исчезает только после следующего workflow activation, а должен исчезать сразу после `Подтверждаю`. Дополнительно тестовая анкета FinderWidget должна явно задавать два product parts и lead part.

### Stream: Managed Review Attention Refresh

75. [DONE] `devtree-early-pp.phase4.attention-refresh.task1` Подключить немедленный refresh `workflowStateStore` на Core session messages с managed review lifecycle tags, чтобы open/close user gate обновлял tree marker сразу при появлении review-карточки и сразу после `Подтверждаю` (scope: `src/client/project-manager/components/layout/main-area.tsx, src/client/project-manager/components/layout/workflow-navigation.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: refresh workflow attention on managed review messages`).
76. [DONE] Git Commit: `fix: refresh workflow attention on managed review messages` (hash: 0cdecd167)
77. [DONE] `devtree-early-pp.phase4.finder-widget-questionnaire.task1` Актуализировать тестовую анкету FinderWidget так, чтобы в ней явно требовались два product parts и один lead product part (scope: `/Users/oleksandroliinyk/VSCODE/FinderWidget-Test01/.codeai-hub/finderwidget-test01/description/questionnaire.md, doc/TODO/todo-plan.md`; expected commit: none). Result: Updated FinderWidget questionnaire: two product parts, lead finder-widget and secondary finder-widget-shell
78. [DONE] `devtree-early-pp.phase4.attention-refresh-verify.task1` Выполнить targeted Project Manager/Core verification для immediate attention refresh и regression tests для preliminary user gate cursor (scope: `src/client/project-manager, packages/core`; expected commit: none). Result: Targeted verification passed: typecheck:webview; build:project-manager; build:webview; workflow-navigation source test; @codeai-hub/core build; workflow user-input attention dist tests
79. [DONE] `devtree-early-pp.phase4.release-confirm-499.task1` Зафиксировать явное подтверждение пользователя на релизную сборку после фиксов 1.2.498 retest (scope: `manual confirmation`; expected commit: none). Result: User explicitly requested new release build for 1.2.499 in retest 1.2.498 report
80. [DONE] `devtree-early-pp.phase4.release-docs-499.task1` Подготовить README/CHANGELOG и active plan на будущую версию 1.2.499 перед `build-all.sh` (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.499`).
81. [DONE] Git Commit: `docs: prepare release 1.2.499` (hash: 1142c292e)
82. [DONE] `devtree-early-pp.phase4.release-build-499.task1` Запустить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, зафиксировать release artifacts/status в плане (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `chore: release 1.2.499`). Result: `./scripts/build-all.sh --allow-dirty` и `./scripts/build-release.sh --use-current-version --allow-dirty` завершились успешно; VSIX: `codeai-hub-1.2.499.vsix` (5.2M); tarball'ы 1.2.499 находятся в `doc/tmp/releases/` и `~/.codeai-hub/releases/`.
83. [DONE] Git Commit: `chore: release 1.2.499` (hash: 2a4c2834e)
84. [BLOCKED] `devtree-early-pp.phase4.user-retest-499.task1` Пользователь тестирует следующий релиз: animated attention marker должен появляться одновременно с review-карточкой `Подтверждаю`, исчезать сразу после acceptance, а новая анкета FinderWidget должна вести Description agent к двум product parts с явным lead part (scope: `manual retest`; expected commit: none). Result: Релиз 1.2.499 исправил timing для preliminary gates, но `Diagram Modules` managed review показывает кнопку `Подтверждаю` без animated attention marker, потому что `workflow-user-input-attention` не включает `diagram_modules` в список Documentation Tree managed gates.

### Stream: Diagram Modules Review Attention

85. [DONE] `devtree-early-pp.phase4.diagram-review-attention.task1` Добавить `Diagram Modules` в Core-owned Documentation Tree user-gate cursor: open managed review должен отдавать active `workflow:diagram_modules` marker с aggregate artifact paths (scope: `packages/core/src/remote-bridge/handlers/workflow-user-input-attention.ts, packages/core/src/remote-bridge/handlers/workflow-state-service.ts, doc/TODO/todo-plan.md`; expected commit: `fix: show diagram modules review attention`).
86. [DONE] Git Commit: `fix: show diagram modules review attention` (hash: b9fe94a99)
87. [DONE] `devtree-early-pp.phase4.diagram-review-attention-test.task1` Покрыть regression tests для `Diagram Modules`: `aggregateReady/substep=awaiting_review` создаёт active marker, а completed/persistent state без review не создаёт marker (scope: `packages/core/src/remote-bridge/handlers/workflow-user-input-attention.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-service-user-input-attention.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: cover diagram modules review attention`).
88. [DONE] Git Commit: `test: cover diagram modules review attention` (hash: a3b87876d)
89. [DONE] `devtree-early-pp.phase4.diagram-review-attention-verify.task1` Выполнить targeted Core/Project Manager verification для `Diagram Modules` review attention marker (scope: `packages/core, src/client/project-manager`; expected commit: none). Result: Targeted verification passed: core build, compiled attention tests, webview typecheck, Project Manager build, webview build.
### Stream: Managed Review Gate Coverage

90. [DONE] `devtree-early-pp.phase4.documentation-review-gates.task1` Покрыть Core-owned attention cursor для всех Documentation Tree managed review gates: `Application Skeleton` final review, repair-limit user review для `Diagram Modules`, `Application Skeleton`, `Quality Gates`, без роста `workflow-state-service.ts` выше лимита микро-классов (scope: `packages/core/src/remote-bridge/handlers/managed-review-state-readers.ts, packages/core/src/remote-bridge/handlers/workflow-state-service.ts, doc/TODO/todo-plan.md`; expected commit: `fix: cover documentation managed review gates`).
91. [DONE] Git Commit: `fix: cover documentation managed review gates` (hash: aa1d0efcb)
92. [DONE] `devtree-early-pp.phase4.development-tree-review-gates.task1` Расширить Development Tree user-gate cursor на lead `DevelopmentOrderPlan` review и cluster contract review, чтобы active/queued marker доходил до Product Part и Cluster узлов (scope: `packages/core/src/development-tree/development-tree-types.ts, packages/core/src/development-tree/development-tree-user-gate-cursor.ts, src/client/project-manager/components/layout/workspace-tree.tsx`; expected commit: `fix: cover development tree managed review gates`).
93. [DONE] Git Commit: `fix: cover development tree managed review gates` (hash: d40dccf7d)
94. [DONE] `devtree-early-pp.phase4.managed-review-gates-test.task1` Покрыть regression tests для Documentation Tree final/repair-limit gates и Development Tree order-plan/cluster gates (scope: `packages/core/src/remote-bridge/handlers/workflow-state-service-user-input-attention.test.ts, packages/core/src/development-tree/development-tree-user-gate-cursor.test.ts, src/client/project-manager/components/layout/workflow-navigation.test.ts`; expected commit: `test: cover managed review gate attention cursor`).
95. [DONE] Git Commit: `test: cover managed review gate attention cursor` (hash: 8cb67b956)
96. [DONE] `devtree-early-pp.phase4.managed-review-gates-verify.task1` Выполнить targeted Core/Project Manager verification для полного покрытия managed review attention cursor (scope: `packages/core, src/client/project-manager`; expected commit: none). Result: Targeted verification passed: @codeai-hub/core build; compiled managed review attention tests 18/18; Project Manager workflow-navigation source test; typecheck:webview; build:project-manager; build:webview
97. [DONE] `devtree-early-pp.phase4.release-confirm-500.task1` Зафиксировать отдельное подтверждение пользователя на релизную сборку после расширенного фикса managed review gate coverage (scope: `manual confirmation`; expected commit: none). Result: User explicitly confirmed release build 1.2.500 after managed review gate coverage fix
98. [DONE] `devtree-early-pp.phase4.release-docs-500.task1` После подтверждения подготовить README/CHANGELOG и active plan на будущую версию 1.2.500 перед `build-all.sh` (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.500`).
99. [DONE] Git Commit: `docs: prepare release 1.2.500` (hash: ec0c20e7a)
100. [DONE] `devtree-early-pp.phase4.release-build-500.task1` Запустить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, зафиксировать release artifacts/status в плане (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `chore: release 1.2.500`). Result: `./scripts/build-all.sh --allow-dirty` и `./scripts/build-release.sh --use-current-version --allow-dirty` завершились успешно; VSIX: `codeai-hub-1.2.500.vsix` (5.2M); tarball'ы 1.2.500 находятся в `doc/tmp/releases/` и `~/.codeai-hub/releases/`.
101. [PENDING] Git Commit: `chore: release 1.2.500` (hash: TBD)
102. [TODO] `devtree-early-pp.phase4.user-retest-500.task1` Пользователь тестирует следующий релиз: все Documentation Tree и Development Tree шаги с открытым user input/review gate должны подсвечиваться animated orange attention marker одновременно с review-карточкой `Подтверждаю`, а marker должен исчезать сразу после acceptance (scope: `manual retest`; expected commit: none).

## Phase 5 - Scope Closeout (owner: Codex, updated: 2026-06-12)

### Stream: Archive And Dispose

103. [TODO] `devtree-early-pp.phase5.closeout.task1` После явного acceptance пользователя закрыть scope, архивировать `todo-plan.md`, актуализировать disposition planning-документов и оставить активными только незавершённые стратегические Plans (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close development tree early product part precode bootstrap scope`).
104. [TODO] Git Commit: `docs: close development tree early product part precode bootstrap scope` (hash: TBD)
105. [TODO] `devtree-early-pp.phase5.handoff.task1` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
