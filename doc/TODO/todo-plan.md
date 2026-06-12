# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "active-plans-russian-translation-2026-06-12",
  "branch": "main",
  "baseHead": "f74aa8654",
  "lastRecordedCommit": "f74aa8654",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/README.md",
  "currentTaskId": "active-plans-ru.phase1.translate.task1",
  "expectedCommitMessage": "docs: translate active development tree plans to Russian",
  "debt": {
    "expectedCommitMessage": "docs: translate active development tree plans to Russian",
    "preCommitHead": "f74aa8654",
    "stage": "commit_pending",
    "taskId": "active-plans-ru.phase1.translate.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/README.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/README.md`
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_DownstreamExecutionRefactor_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_UserGateReviewCursor_Architecture.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Execution Rules

- Scope документационный: не менять архитектурный смысл planning-документов, только перевести текст на русский язык и сохранить имена контрактов, JSON-поля, команды, пути и статусные идентификаторы.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: изменение и отдельный `Git Commit: ...`.
- Использовать `npm run plan:commit -- "<expected commit message>"` для штатного коммита.
- Не обходить Husky hooks / quality gates.

## Phase 1 - Active Plans Russian Translation (owner: Codex, updated: 2026-06-12)

### Stream: Translate Active Development Tree Planning Sources

1. [DONE] `active-plans-ru.phase1.translate.task1` Перевести два активных planning-документа Development Tree в `Plans/` на русский язык, сохранив технические термины, пути, имена артефактов, JSON-поля и архитектурные решения без изменения смысла (scope: `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_DownstreamExecutionRefactor_Architecture.md, doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_UserGateReviewCursor_Architecture.md, doc/TODO/todo-plan.md`; expected commit: `docs: translate active development tree plans to Russian`).
2. [PENDING] Git Commit: `docs: translate active development tree plans to Russian` (hash: TBD)

## Phase 2 - Tooling Verification (owner: Codex, updated: 2026-06-12)

### Stream: Plan Validation

3. [TODO] `active-plans-ru.phase2.validate.task1` Проверить валидность планового lifecycle после перевода документации (scope: `doc/TODO/todo-plan.md`; expected commit: none).

## Phase 3 - User Workflow Acceptance Testing (owner: User, updated: 2026-06-12)

### Stream: User Reading Acceptance

4. [TODO] `active-plans-ru.phase3.user-acceptance.task1` Пользователь проверяет, что оба активных planning-документа в `Plans/` теперь читаемы на русском и смысл решений сохранён (scope: `manual review`; expected commit: none).

## Phase 4 - Scope Closeout (owner: Codex, updated: 2026-06-12)

### Stream: Archive And Dispose

5. [TODO] `active-plans-ru.phase4.closeout.task1` После явного acceptance пользователя закрыть документационный translation scope и оставить активные planning-документы на месте как рабочие источники следующего refactor cycle (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**`; expected commit: `docs: close active plans russian translation scope`).
6. [TODO] Git Commit: `docs: close active plans russian translation scope` (hash: TBD)
7. [TODO] `active-plans-ru.phase4.handoff.task1` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
