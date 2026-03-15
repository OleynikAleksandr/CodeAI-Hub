# Session Continuity — Contract (SSOT)

## Назначение
Механика непрерывности для долгоживущих workflow-сессий: handoff report → rollover → resume bootstrap без потери контекста.

## Инварианты
- Handoff report delivery обязателен (ack + retry). При failure UI должен получить явный failure, а не stuck working.
- Bootstrap новой сессии выполняется internal turn’ом `Flow Node Continuity — Resume`.
- UI не должен показывать continuity-инфраструктуру как отдельные узлы; пользователь видит только актуальный диалог.
- Любая continuity-фаза не должна приводить к “вечному resuming”: lock/unlock SSOT описан в `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`.
- Для flow-node/document sessions threshold-trigger continuity разрешён только на post-turn boundary: `token_usage` во время активного user turn может только кешировать snapshot и не имеет права немедленно запускать rollover.
- Если provider отдаёт `turn_completed` раньше финального usage snapshot, session остаётся в pending-arbitration до появления trailing `token_usage`; отсутствие usage прямо в `turn_completed` не считается автоматическим `no_rollover`.
- Cached token-usage snapshot обязан очищаться при старте нового outbound user turn и после финального post-turn arbitration, чтобы usage предыдущего turn-а не протекал в следующий.

## Порог
- Запуск continuity привязан к remaining% threshold per-provider (дефолт 30%).

## Связанные контракты
- Workspace runtime/lock: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Input lock SSOT/state machine: `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
- Dialog routing: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
