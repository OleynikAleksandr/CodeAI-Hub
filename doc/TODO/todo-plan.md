# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "provider-candidates-documentation-intake-2026-05-18",
  "branch": "main",
  "baseHead": "ab135d06e",
  "lastRecordedCommit": "799fc777f",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Provider_Candidates/Agent_Runtime_Provider_Candidates_Analysis_RU.md",
  "currentTaskId": "phase1-provider-candidates-verification",
  "expectedCommitMessage": "docs: record provider candidate analysis verification",
  "debt": {
    "expectedCommitMessage": "docs: record provider candidate analysis verification",
    "preCommitHead": "799fc777f",
    "stage": "commit_pending",
    "taskId": "phase1-provider-candidates-verification"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Provider_Candidates/Agent_Runtime_Provider_Candidates_Analysis_RU.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex_ProviderInvocationFlags.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: реализация/изменения и отдельный `Git Commit: ...`.
- Для документационного intake scope без кода достаточно проверки UTF-8/readback, `git status`, и `npm run plan:validate`/`npm run plan:status`, если плановые скрипты применимы.
- `Scope Closeout` выполняется только после явного acceptance пользователя.

## Phase 1 — Provider Candidates Documentation Intake (owner: Codex, updated: 2026-05-18)
### Stream: Provider Candidates Analysis
1. [DONE] `phase1-provider-candidates-doc` Создать папку `doc/SolidWorks-WorkFlow/Plans/Provider_Candidates/` и первый анализ candidate provider runtime/subscription моделей (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/Provider_Candidates/Agent_Runtime_Provider_Candidates_Analysis_RU.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: add provider candidate analysis`).
2. [DONE] Git Commit: `docs: add provider candidate analysis` (hash: 799fc777f)

### Stream: Tooling Verification
1. [DONE] `phase1-provider-candidates-verification` Проверить UTF-8/readback, `git status`, и плановый статус после документационного изменения — scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record provider candidate analysis verification`.
2. [PENDING] Git Commit: `docs: record provider candidate analysis verification` (hash: TBD)

### Stream: User Workflow Acceptance Testing
1. [TODO] `phase1-provider-candidates-acceptance` Передать документ пользователю на review и дождаться явного acceptance или правок — scope: без изменения файлов; expected commit: none.
2. [TODO] Git Commit: `n/a` (hash: n/a)

### Stream: Scope Closeout
1. [TODO] `phase1-provider-candidates-closeout` После явного acceptance закрыть scope: архивировать active `todo-plan.md`, проверить disposition planning-документа, обновить индекс при необходимости — scope: `doc/TODO/todo-plan.md`, `doc/TODO/Archive/`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close provider candidates documentation intake`.
2. [TODO] Git Commit: `docs: close provider candidates documentation intake` (hash: TBD)
