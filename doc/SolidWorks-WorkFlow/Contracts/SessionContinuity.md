# Session Continuity — Contract (SSOT)

## Назначение
Механика непрерывности для долгоживущих workflow-сессий: handoff report → rollover → resume bootstrap без потери контекста.

## Инварианты
- Handoff report delivery обязателен (ack + retry). При failure UI должен получить явный failure, а не stuck working.
- Bootstrap новой сессии выполняется internal turn’ом `Flow Node Continuity — Resume`.
- UI не должен показывать continuity-инфраструктуру как отдельные узлы; пользователь видит только актуальный диалог.
- Любая continuity-фаза не должна приводить к “вечному resuming”: lock/unlock SSOT описан в `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`.

## Порог
- Запуск continuity привязан к remaining% threshold per-provider (дефолт 30%).

## Связанные контракты
- Workspace runtime/lock: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Input lock SSOT/state machine: `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
- Dialog routing: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
