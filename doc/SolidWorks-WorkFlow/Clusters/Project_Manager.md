# Project Manager — Cluster (SSOT)

## 0) Start here (контекст + контракты)

- System: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- Workflow steps: `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
- Description step contract: `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
- Description UI copy contract: `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_DescriptionEntry_CopyRefactor.md`
- Workspace Runtime (wire + lock): `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Session UI laws (lock/unlock): `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
- Input lock SSOT/state machine: `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
- Dialog routing (messages vs status): `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- Workflow navigation SSOT (stage selection): `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowNavigation_SSOT.md`
- Session Continuity: `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
- UI bundles: `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
- Launcher: `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md`

## 1) Назначение

Project Manager — основной UI‑клиент CodeAI Hub (CEF bundle), который:
- показывает Workflow Tree;
- открывает Sessions/Artifacts;
- управляет выбором/открытием диалогов через intent `pm:dialog:open`;
- гидратирует историю (cold start) и live tail (WS);
- отображает lock/continuity/usage и обеспечивает recovery UX.

## 2) Где живёт код

- PM bundle: `src/client/project-manager/`
- Shared Session UI: `src/client/ui/src/`

## 3) Ключевой UX контракт (коротко)

- Input lock — snapshot-first (не вычисляется из stream сообщений).
- До `Submit questionnaire` в стадии `Description` runtime-сессии нет:
  - левая панель показывает Description Help,
  - правая панель показывает редактор `questionnaire.md`.
- После `Submit questionnaire` создаётся runtime-сессия Description:
  - левая панель возвращается к Session UI,
  - правая панель имеет переключатель `Artifacts/Help`.
- В Description UI не допускаются термины/ветвления `description.md` и auto-reviewer.

Канон: `DescriptionStep_SingleAgent.md`, `ProjectManager_DescriptionEntry_CopyRefactor.md`.

Дополнительный инвариант навигации:
- любой route на workflow stage (Toolbar/Tree/auto-select) обязан сначала синхронизировать `activeStage`, чтобы Toolbar, Session route и правая панель не расходились.
- канон: `ProjectManager_WorkflowNavigation_SSOT.md`.

## 4) Recovery UX (обязательно)

В PM должны существовать user-facing действия восстановления при сбоях Core/Provider:
- `Restart Core` (hard)
- `Retry/Reconnect`
- (опционально) `Retry last message` для явных provider auth failures
