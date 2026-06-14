# Plan Closeout: quality-gates-product-part-rebootstrap-removal-2026-06-13

**Created:** 2026-06-14T08:17:14.231Z
**Acceptance:** user accepted release 1.2.512 retest; managed review attention clears immediately after user action; scope complete
**Execution Scope Status:** ACTIVE
**Branch:** main
**Current Task:** qg-rebootstrap.phase5.closeout.task1
**Expected Commit:** docs: close quality gates rebootstrap removal scope
**Last Recorded Commit:** fbb182d01
**Planning Source Disposition:** moved
**Planning Source Path:** doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_UserGateReviewCursor_Architecture.md

## Active Plan Copy

````markdown
# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "quality-gates-product-part-rebootstrap-removal-2026-06-13",
  "branch": "main",
  "baseHead": "63349dc64",
  "lastRecordedCommit": "fbb182d01",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_UserGateReviewCursor_Architecture.md",
  "currentTaskId": "qg-rebootstrap.phase5.closeout.task1",
  "expectedCommitMessage": "docs: close quality gates rebootstrap removal scope",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_UserGateReviewCursor_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_UserGateReviewCursor_Architecture.md`
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
- **Release Build Confirmation Gate:** релиз `1.2.510` уже был собран по явному запросу пользователя; для следующего bugfix-релиза после новых фиксов нужно отдельное подтверждение пользователя.

## Phase 1 - Remove Quality Gates Product Part Rebootstrap (owner: Codex, updated: 2026-06-13)

### Stream: Runtime Cleanup

1. [DONE] `qg-rebootstrap.phase1.runtime.task1` Удалить Quality Gates terminal handoff -> Product Part bootstrap coupling из runtime helper/callers; Quality Gates persistent return должен только commit terminal residue и не создавать Product Part sessions/lanes (scope: `packages/core/src/remote-bridge/handlers/**, doc/TODO/todo-plan.md`; expected commit: `fix: stop quality gates product part rebootstrap`).
2. [DONE] Git Commit: `fix: stop quality gates product part rebootstrap` (hash: 09d9edf60)

### Stream: Regression Test

3. [DONE] `qg-rebootstrap.phase1.test.task1` Заменить старый positive regression на negative regression: Quality Gates completion с Diagram Modules artifacts не вызывает Development Tree gateway, не создаёт Product Part brief plan/draft и не пишет bootstrap commit (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.quality-gates.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: cover quality gates no product part rebootstrap`).
4. [DONE] Git Commit: `test: cover quality gates no product part rebootstrap` (hash: 6260d2d1c)

### Stream: SSOT Documentation

5. [DONE] `qg-rebootstrap.phase1.docs.task1` Синхронизировать SSOT: Quality Gates terminal handoff больше не recovery/idempotency trigger для Product Part lanes; повторный запуск Product Part lanes допускается только через Diagram Modules acceptance или Product Part clear/restart/manual recovery path (scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_UserGateReviewCursor_Architecture.md, doc/TODO/todo-plan.md`; expected commit: `docs: document quality gates no rebootstrap boundary`).
6. [DONE] Git Commit: `docs: document quality gates no rebootstrap boundary` (hash: 031fb04f8)

## Phase 2 - Tooling Verification (owner: Codex, updated: 2026-06-13)

### Stream: Targeted Core Verification

7. [DONE] `qg-rebootstrap.phase2.verify.task1` Выполнить targeted Core tests/build для Quality Gates completion и Development Tree bootstrap boundaries (scope: `packages/core`; expected commit: none). Result: initial source scan/test completed; residual Quality Gates bootstrap API found and queued for cleanup before final build

### Stream: Residual Quality Gates Cleanup

8. [DONE] `qg-rebootstrap.phase2.residual-cleanup.task1` Удалить остаточный Quality Gates controller API для Product Part bootstrap, сохранив живой bootstrap только в Diagram Modules acceptance и Product Part Clear/Restart recovery paths (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.ts, doc/TODO/todo-plan.md`; expected commit: `fix: remove quality gates product part bootstrap api`).
9. [DONE] Git Commit: `fix: remove quality gates product part bootstrap api` (hash: 86b0e4677)
10. [DONE] `qg-rebootstrap.phase2.verify-final.task1` Выполнить финальные targeted Core tests/build после удаления остаточного API (scope: `packages/core`; expected commit: none). Result: passed: source scan clean; tsx tests 5/5; npm run build --workspace @codeai-hub/core

## Phase 3 - Release Build (owner: Codex/User, updated: 2026-06-13)

### Stream: Release 1.2.510 Build

11. [DONE] `qg-rebootstrap.phase3.release-docs.task1` Подготовить README/CHANGELOG и active plan на будущую версию перед `build-all.sh` (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.510`).
12. [DONE] Git Commit: `docs: prepare release 1.2.510` (hash: b99b7a5d5)
13. [DONE] `qg-rebootstrap.phase3.release-build.task1` Запустить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, зафиксировать release artifacts/status в плане (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `chore: release 1.2.510`). Result: `./scripts/build-all.sh --allow-dirty` passed; `./scripts/build-release.sh --use-current-version --allow-dirty` passed; VSIX `codeai-hub-1.2.510.vsix` and 1.2.510 runtime tarballs are available.
14. [DONE] Git Commit: `chore: release 1.2.510` (hash: af28859ee)

## Phase 4 - User Workflow Acceptance Testing (owner: User, updated: 2026-06-13)

### Stream: Retest Quality Gates Boundary

15. [DONE] `qg-rebootstrap.phase4.user-retest.task1` Пользователь тестирует релиз: после `Quality Gates Baseline` не должны повторно стартовать Product Part sessions/lanes; Product Part lanes должны стартовать только после accepted `Diagram Modules`, а Quality Gates должен завершаться persistent return без второго Development Tree bootstrap (scope: `manual retest`; expected commit: none). Result: failed: Application Skeleton Clear удаляет Development Tree Product Part sessions; требуется preserve Development Tree state до rollback

### Stream: Application Skeleton Clear Boundary

16. [DONE] `qg-rebootstrap.phase4.app-skeleton-clear.task1` Исправить workflow rollback: clear `Application Skeleton` / `Quality Gates` обязан сохранять Development Tree Product Part pre-code состояние, созданное accepted `Diagram Modules`; clear `Diagram Modules` и выше по-прежнему удаляет Development Tree state (scope: `packages/core/src/workflow/boundary/workflow-rollback-coordinator.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-application-skeleton-boundary.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: preserve product part lanes on skeleton clear`).
17. [DONE] Git Commit: `fix: preserve product part lanes on skeleton clear` (hash: 6df76bc93)
18. [DONE] `qg-rebootstrap.phase4.app-skeleton-clear-verify.task1` Выполнить targeted regression tests и Core build для workflow clear rollback boundary (scope: `packages/core`; expected commit: none). Result: passed: npx tsx --test workflow-step-clear-service.test.ts workflow-step-clear-application-skeleton-boundary.test.ts; npm run lint; ./scripts/check-architecture.sh; npm run build --workspace @codeai-hub/core

### Stream: Release 1.2.511 Confirmation

19. [DONE] `qg-rebootstrap.phase4.release-511-confirmation.task1` Запросить у пользователя явное подтверждение на сборку bugfix-релиза после исправления Application Skeleton Clear boundary; без подтверждения не запускать release notes, version bump, `build-all.sh` или `build-release.sh` (scope: release confirmation gate; expected commit: none). Result: confirmed: user requested building bugfix release 1.2.511

### Stream: Release 1.2.511 Build

20. [DONE] `qg-rebootstrap.phase4.release-511-docs.task1` Подготовить README/CHANGELOG и active plan на будущую версию `1.2.511` перед `build-all.sh` (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.511`).
21. [DONE] Git Commit: `docs: prepare release 1.2.511` (hash: 3e4c9e2a5)
22. [DONE] `qg-rebootstrap.phase4.rollback-boundary-docs.task1` Зафиксировать SSOT-инвариант: clear `Application Skeleton` / `Quality Gates` сохраняет Product Part Development Tree lanes, а clear `Diagram Modules` удаляет их как downstream state (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/TODO/todo-plan.md`; expected commit: `docs: document skeleton clear product part boundary`).
23. [DONE] Git Commit: `docs: document skeleton clear product part boundary` (hash: 003e3d81a)
24. [DONE] `qg-rebootstrap.phase4.release-511-build.task1` Запустить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, зафиксировать release artifacts/status в плане (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `chore: release 1.2.511`). Result: `./scripts/build-all.sh --allow-dirty` passed; `./scripts/build-release.sh --use-current-version --allow-dirty` passed; VSIX `codeai-hub-1.2.511.vsix` and 1.2.511 runtime tarballs are available.
25. [DONE] Git Commit: `chore: release 1.2.511` (hash: 47dca674b)

### Stream: Release 1.2.511 User Retest

26. [DONE] `qg-rebootstrap.phase4.release-511-user-retest.task1` Пользователь устанавливает и тестирует релиз `1.2.511`: clear `Application Skeleton` не должен удалять Product Part Development Tree sessions/lanes, clear `Diagram Modules` должен удалять их как downstream state (scope: manual retest; expected commit: none). Result: failed: managed review attention marker remains visible after user confirmation

### Stream: Managed User Attention Clear

27. [DONE] `qg-rebootstrap.phase4.attention-clear.task1` Исправить Core-owned user attention lifecycle: после любой реакции пользователя на managed review gate пульсирующая рамка должна сниматься сразу, а следующий managed gate должен снова открывать attention только новым Core-owned review-сообщением (scope: `packages/core/src/remote-bridge/handlers/**, src/client/project-manager/components/layout/**, AGENTS.md, doc/TODO/todo-plan.md`; expected commit: `fix: clear managed attention after user action`).
28. [DONE] Git Commit: `fix: clear managed attention after user action` (hash: dbaf3e3d9)
29. [DONE] `qg-rebootstrap.phase4.attention-clear-verify.task1` Выполнить targeted regression tests/build для managed user attention cursor после acceptance/revision actions (scope: `packages/core, src/client/project-manager`; expected commit: none). Result: passed: targeted attention tests; npm run lint; npm run build --workspace @codeai-hub/core; npm run typecheck:webview; pre-commit architecture/lint/knip

### Stream: Release 1.2.512 Confirmation

30. [DONE] `qg-rebootstrap.phase4.plan-state-repair.task1` Зафиксировать repaired active plan snapshot после failed pre-commit transaction и вернуть следующий шаг на release confirmation gate (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: repair attention fix plan state`).
31. [DONE] Git Commit: `docs: repair attention fix plan state` (hash: 39794248c)
32. [DONE] `qg-rebootstrap.phase4.release-512-confirmation.task1` Запросить у пользователя явное подтверждение на сборку bugfix-релиза после исправления managed attention clear; без подтверждения не запускать release notes, version bump, `build-all.sh` или `build-release.sh` (scope: release confirmation gate; expected commit: none). Result: confirmed: user requested release 1.2.512 build

### Stream: Release 1.2.512 Build

33. [DONE] `qg-rebootstrap.phase4.release-512-docs.task1` Подготовить README/CHANGELOG и active plan на будущую версию `1.2.512` перед `build-all.sh` (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.512`).
34. [DONE] Git Commit: `docs: prepare release 1.2.512` (hash: e486a4b5d)
35. [DONE] `qg-rebootstrap.phase4.release-512-build.task1` Запустить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, зафиксировать release artifacts/status в плане (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `chore: release 1.2.512`). Result: `./scripts/build-all.sh --allow-dirty` passed; `./scripts/build-release.sh --use-current-version --allow-dirty` passed; VSIX `codeai-hub-1.2.512.vsix` and 1.2.512 runtime tarballs are available.
36. [DONE] Git Commit: `chore: release 1.2.512` (hash: fbb182d01)

### Stream: Release 1.2.512 User Retest

37. [DONE] `qg-rebootstrap.phase4.release-512-user-retest.task1` Пользователь устанавливает и тестирует релиз `1.2.512`: после `Подтверждаю` или пользовательского сообщения managed review attention frame должен сниматься сразу и появляться заново только на новом Core-owned review gate (scope: manual retest; expected commit: none). Result: accepted: user tested release 1.2.512; managed attention clear works as expected

## Phase 5 - Scope Closeout (owner: Codex, updated: 2026-06-14)

### Stream: Closeout

38. [IN_PROGRESS] `qg-rebootstrap.phase5.closeout.task1` После явного acceptance пользователя закрыть scope и оставить active plan в terminal `NONE` state (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close quality gates rebootstrap removal scope`).
39. [TODO] Git Commit: `docs: close quality gates rebootstrap removal scope` (hash: TBD)
40. [TODO] `qg-rebootstrap.phase5.closeout.anchor` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle (scope: terminal NONE transition; expected commit: none).
````
