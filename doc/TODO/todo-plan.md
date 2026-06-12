# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "development-tree-early-product-part-precode-bootstrap-2026-06-12",
  "branch": "main",
  "baseHead": "8f8d9b8c8",
  "lastRecordedCommit": "34c23d6fe",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_UserGateReviewCursor_Architecture.md",
  "currentTaskId": "devtree-early-pp.phase4.qg-research-attention.task1",
  "expectedCommitMessage": "fix: show quality gates research review attention",
  "debt": {
    "expectedCommitMessage": "fix: show quality gates research review attention",
    "preCommitHead": "34c23d6fe",
    "stage": "commit_pending",
    "taskId": "devtree-early-pp.phase4.qg-research-attention.task1"
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
54. [PENDING] Git Commit: `fix: show quality gates research review attention` (hash: TBD)
55. [TODO] `devtree-early-pp.phase4.qg-research-attention-test.task1` Покрыть regression test для Quality Gates research review: при `currentTaskId=quality-gates.phase2.review.task1` и только `quality-gates-research.md/json` workflow state отдаёт active `workflow:quality_gates`; accepted/completed state без review task не подсвечивается (scope: `packages/core/src/remote-bridge/handlers/workflow-state-service-user-input-attention.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: cover quality gates research review attention`).
56. [TODO] Git Commit: `test: cover quality gates research review attention` (hash: TBD)
57. [TODO] `devtree-early-pp.phase4.qg-research-attention-verify.task1` Выполнить targeted Core/Project Manager verification для Quality Gates research review attention (scope: `packages/core, src/client/project-manager`; expected commit: none).
58. [TODO] `devtree-early-pp.phase4.release-confirm-497.task1` Получить отдельное подтверждение пользователя на релизную сборку после фикса Quality Gates research review attention (scope: `manual confirmation`; expected commit: none).
59. [TODO] `devtree-early-pp.phase4.release-docs-497.task1` Подготовить README/CHANGELOG и active plan на будущую версию 1.2.497 перед `build-all.sh` (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.497`).
60. [TODO] Git Commit: `docs: prepare release 1.2.497` (hash: TBD)
61. [TODO] `devtree-early-pp.phase4.release-build-497.task1` Запустить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, зафиксировать release artifacts/status в плане (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `chore: release 1.2.497`).
62. [TODO] Git Commit: `chore: release 1.2.497` (hash: TBD)
63. [TODO] `devtree-early-pp.phase4.user-retest-497.task1` Пользователь тестирует следующий релиз: Quality Gates Baseline должен подсвечиваться анимированной orange frame уже на research review, когда stage todo-plan находится на managed review task и доступны только `quality-gates-research.md/json`; stale completed stages и persistent return phases остаются зелёными/обычными без orange marker (scope: `manual retest`; expected commit: none).

## Phase 5 - Scope Closeout (owner: Codex, updated: 2026-06-12)

### Stream: Archive And Dispose

64. [TODO] `devtree-early-pp.phase5.closeout.task1` После явного acceptance пользователя закрыть scope, архивировать `todo-plan.md`, актуализировать disposition planning-документов и оставить активными только незавершённые стратегические Plans (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close development tree early product part precode bootstrap scope`).
65. [TODO] Git Commit: `docs: close development tree early product part precode bootstrap scope` (hash: TBD)
66. [TODO] `devtree-early-pp.phase5.handoff.task1` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
