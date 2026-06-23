# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "openrouter-chat-provider-planning-2026-06-23",
  "branch": "main",
  "baseHead": "726892446",
  "lastRecordedCommit": "self",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/OpenRouter_ChatProvider_Planning_RU.md",
  "currentTaskId": "openrouter-chat.phase2.acceptance.task1",
  "expectedCommitMessage": "docs: accept OpenRouter chat provider plan",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/OpenRouter_ChatProvider_Planning_RU.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Modules/LocalModels.md`
  - `doc/SolidWorks-WorkFlow/Modules/GLM_Native.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)

- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- TODO Plan состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стримов), в каждом Stream — микро-задачи.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: реализация/изменение и отдельная строка `Git Commit: ...`.
- Gates выполняются штатно через `npm run plan:validate` и `npm run plan:commit -- "<expected commit message>"`.
- Scope Closeout выполняется только после явного acceptance пользователя.

## Phase 1 — OpenRouter Chat Provider Planning Intake (owner: Codex, updated: 2026-06-23)

### Stream: Planning Document

1. [DONE] `openrouter-chat.phase1.plan.task1` Составить planning-документ OpenRouter Chat Provider и зарегистрировать его в индексе — scope: `doc/SolidWorks-WorkFlow/Plans/OpenRouter_ChatProvider_Planning_RU.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan OpenRouter chat provider`
2. [DONE] `openrouter-chat.phase1.plan.commit1` Git Commit: `docs: plan OpenRouter chat provider` (hash: self)

### Stream: User Workflow Acceptance Testing

3. [IN_PROGRESS] `openrouter-chat.phase2.acceptance.task1` Получить acceptance пользователя по planning-документу OpenRouter Chat Provider — scope: `doc/SolidWorks-WorkFlow/Plans/OpenRouter_ChatProvider_Planning_RU.md, doc/TODO/todo-plan.md`; expected commit: `docs: accept OpenRouter chat provider plan`
4. [TODO] `openrouter-chat.phase2.acceptance.commit1` Git Commit: `docs: accept OpenRouter chat provider plan` (hash: TBD)

### Stream: Scope Closeout

5. [TODO] `openrouter-chat.phase3.closeout.task1` Закрыть planning-intake scope после acceptance пользователя — scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/Archive/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close OpenRouter chat provider planning intake`
6. [TODO] `openrouter-chat.phase3.closeout.commit1` Git Commit: `docs: close OpenRouter chat provider planning intake` (hash: TBD)
