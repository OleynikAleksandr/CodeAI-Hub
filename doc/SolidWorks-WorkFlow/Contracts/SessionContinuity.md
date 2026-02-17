# Session Continuity — Contract (SSOT)

## Назначение
Механика непрерывности для долгоживущих workflow-сессий: handoff report → rollover → resume bootstrap без потери контекста.

## Инварианты
- Handoff report delivery обязателен (ack + retry). При failure UI должен получить явный failure, а не stuck working.
- Bootstrap новой сессии выполняется internal turn’ом `Flow Node Continuity — Resume`.
- UI не должен показывать continuity-инфраструктуру как отдельные узлы; пользователь видит только актуальный диалог.

## Порог
- Запуск continuity привязан к remaining% threshold per-provider (дефолт 30%).

## Связанные контракты
- Workspace runtime/lock: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Dialog routing: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`

## Legacy snapshot
- `doc/SolidWorks-WorkFlow/Archive/legacy/SessionContinuity-legacy-2026-02-17.md`
