# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "quality-gates-product-part-rebootstrap-removal-2026-06-13",
  "branch": "main",
  "baseHead": "63349dc64",
  "lastRecordedCommit": "031fb04f8",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_UserGateReviewCursor_Architecture.md",
  "currentTaskId": "qg-rebootstrap.phase2.residual-cleanup.task1",
  "expectedCommitMessage": "fix: remove quality gates product part bootstrap api",
  "debt": {
    "expectedCommitMessage": "fix: remove quality gates product part bootstrap api",
    "preCommitHead": "031fb04f8",
    "stage": "commit_pending",
    "taskId": "qg-rebootstrap.phase2.residual-cleanup.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_UserGateReviewCursor_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md`
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_UserGateReviewCursor_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_DownstreamExecutionRefactor_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)

- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Scope этого цикла: Quality Gates Baseline больше не запускает и не восстанавливает Product Part pre-code lanes. Единственный primary bootstrap Product Part lanes остаётся acceptance `Diagram Modules`; Product Part Clear/Restart остаётся отдельным recovery path.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: изменение и отдельный `Git Commit: ...`.
- Для штатного коммита использовать `npm run plan:commit -- "<expected commit message>"`.
- Не обходить Husky hooks / quality gates.
- Таргетные проверки: `npm run build --workspace @codeai-hub/core` и targeted tests по Quality Gates / Development Tree bootstrap.
- **Release Build Confirmation Gate:** пользователь уже запросил новый релиз в этом сообщении; релизная сборка выполняется после зелёных фиксов и проверок.

## Phase 1 - Remove Quality Gates Product Part Rebootstrap (owner: Codex, updated: 2026-06-13)

### Stream: Runtime Cleanup

1. [DONE] `qg-rebootstrap.phase1.runtime.task1` Удалить Quality Gates terminal handoff -> Product Part bootstrap coupling из runtime helper/callers; Quality Gates persistent return должен только commit terminal residue и не создавать Product Part sessions/lanes (scope: `packages/core/src/remote-bridge/handlers/**, doc/TODO/todo-plan.md`; expected commit: `fix: stop quality gates product part rebootstrap`).
2. [DONE] Git Commit: `fix: stop quality gates product part rebootstrap` (hash: 09d9edf60)

### Stream: Regression Test

3. [DONE] `qg-rebootstrap.phase1.test.task1` Заменить старый positive regression на negative regression: Quality Gates completion с Diagram Modules artifacts не вызывает Development Tree gateway, не создаёт Product Part brief plan/draft и не пишет bootstrap commit (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.quality-gates.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: cover quality gates no product part rebootstrap`).
4. [DONE] Git Commit: `test: cover quality gates no product part rebootstrap` (hash: 6260d2d1c)

### Stream: SSOT Documentation

5. [DONE] `qg-rebootstrap.phase1.docs.task1` Синхронизировать SSOT: Quality Gates terminal handoff больше не recovery/idempotency trigger для Product Part lanes; повторный запуск Product Part lanes допускается только через Diagram Modules acceptance или Product Part clear/restart/manual recovery path (scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_UserGateReviewCursor_Architecture.md, doc/TODO/todo-plan.md`; expected commit: `docs: document quality gates no rebootstrap boundary`).
6. [DONE] Git Commit: `docs: document quality gates no rebootstrap boundary` (hash: 031fb04f8)

## Phase 2 - Tooling Verification (owner: Codex, updated: 2026-06-13)

### Stream: Targeted Core Verification

7. [DONE] `qg-rebootstrap.phase2.verify.task1` Выполнить targeted Core tests/build для Quality Gates completion и Development Tree bootstrap boundaries (scope: `packages/core`; expected commit: none). Result: initial source scan/test completed; residual Quality Gates bootstrap API found and queued for cleanup before final build

### Stream: Residual Quality Gates Cleanup

8. [DONE] `qg-rebootstrap.phase2.residual-cleanup.task1` Удалить остаточный Quality Gates controller API для Product Part bootstrap, сохранив живой bootstrap только в Diagram Modules acceptance и Product Part Clear/Restart recovery paths (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.ts, doc/TODO/todo-plan.md`; expected commit: `fix: remove quality gates product part bootstrap api`).
9. [PENDING] Git Commit: `fix: remove quality gates product part bootstrap api` (hash: TBD)
10. [TODO] `qg-rebootstrap.phase2.verify-final.task1` Выполнить финальные targeted Core tests/build после удаления остаточного API (scope: `packages/core`; expected commit: none).

## Phase 3 - Release Build (owner: Codex/User, updated: 2026-06-13)

### Stream: Release 1.2.510 Build

11. [TODO] `qg-rebootstrap.phase3.release-docs.task1` Подготовить README/CHANGELOG и active plan на будущую версию перед `build-all.sh` (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.510`).
12. [TODO] Git Commit: `docs: prepare release 1.2.510` (hash: TBD)
13. [TODO] `qg-rebootstrap.phase3.release-build.task1` Запустить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, зафиксировать release artifacts/status в плане (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `chore: release 1.2.510`).
14. [TODO] Git Commit: `chore: release 1.2.510` (hash: TBD)

## Phase 4 - User Workflow Acceptance Testing (owner: User, updated: 2026-06-13)

### Stream: Retest Quality Gates Boundary

15. [TODO] `qg-rebootstrap.phase4.user-retest.task1` Пользователь тестирует релиз: после `Quality Gates Baseline` не должны повторно стартовать Product Part sessions/lanes; Product Part lanes должны стартовать только после accepted `Diagram Modules`, а Quality Gates должен завершаться persistent return без второго Development Tree bootstrap (scope: `manual retest`; expected commit: none).

## Phase 5 - Scope Closeout (owner: Codex, updated: 2026-06-13)

### Stream: Closeout

16. [TODO] `qg-rebootstrap.phase5.closeout.task1` После явного acceptance пользователя закрыть scope и оставить active plan в terminal `NONE` state (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close quality gates rebootstrap removal scope`).
17. [TODO] Git Commit: `docs: close quality gates rebootstrap removal scope` (hash: TBD)
18. [TODO] `qg-rebootstrap.phase5.closeout.anchor` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle (scope: terminal NONE transition; expected commit: none).
