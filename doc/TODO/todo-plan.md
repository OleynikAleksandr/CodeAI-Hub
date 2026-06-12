# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "development-tree-early-product-part-precode-bootstrap-2026-06-12",
  "branch": "main",
  "baseHead": "8f8d9b8c8",
  "lastRecordedCommit": "3b7666ce4",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_UserGateReviewCursor_Architecture.md",
  "currentTaskId": "devtree-early-pp.phase4.status-pathspec.task1",
  "expectedCommitMessage": "fix: preserve workflow status path prefixes",
  "debt": {
    "expectedCommitMessage": "fix: preserve workflow status path prefixes",
    "preCommitHead": "3b7666ce4",
    "stage": "commit_pending",
    "taskId": "devtree-early-pp.phase4.status-pathspec.task1"
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
17. [PENDING] Git Commit: `fix: preserve workflow status path prefixes` (hash: TBD)
18. [TODO] `devtree-early-pp.phase4.status-pathspec-verify.task1` Выполнить targeted Core tests/build для workflow boundary git pathspec fix (scope: `packages/core`; expected commit: none).
19. [TODO] `devtree-early-pp.phase4.user-retest-494.task1` Пользователь тестирует следующий релиз: Description -> Virtual Simulation должен стартовать после modified tracked `.codeai-hub/<workspace>/workflow/state.json`, затем повторно проверить ранний Product Part pre-code fan-out после Diagram Modules (scope: `manual retest`; expected commit: none).

## Phase 5 - Scope Closeout (owner: Codex, updated: 2026-06-12)

### Stream: Archive And Dispose

20. [TODO] `devtree-early-pp.phase5.closeout.task1` После явного acceptance пользователя закрыть scope, архивировать `todo-plan.md`, актуализировать disposition planning-документов и оставить активными только незавершённые стратегические Plans (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close development tree early product part precode bootstrap scope`).
21. [TODO] Git Commit: `docs: close development tree early product part precode bootstrap scope` (hash: TBD)
22. [TODO] `devtree-early-pp.phase5.handoff.task1` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
