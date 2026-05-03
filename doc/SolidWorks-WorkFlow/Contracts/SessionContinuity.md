# Session Continuity — Contract (SSOT)

## Назначение
Механика непрерывности для долгоживущих workflow-сессий: handoff report → rollover → resume bootstrap без потери контекста.

## Инварианты
- Handoff report delivery обязателен (ack + retry). При failure UI должен получить явный failure, а не stuck working.
- Bootstrap новой сессии выполняется internal turn’ом `Flow Node Continuity — Resume`.
- UI не должен показывать continuity-инфраструктуру как отдельные узлы; пользователь видит только актуальный диалог.
- Любая continuity-фаза не должна приводить к “вечному resuming”: lock/unlock SSOT описан в `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`.
- Для flow-node/document sessions threshold-trigger continuity разрешён только на post-turn boundary: `token_usage` во время активного user turn может только кешировать snapshot и не имеет права немедленно запускать rollover.
- Flow-node rollover в текущем production scope разрешён только для trunk workflow stages `description`, `virtual_simulation`, `diagram_modules` при `runSlug=null`. Collector/reviewer/Development Tree branch agents остаются ineligible до отдельного artifact-specific continuity contract.
- Для eligible flow-node session обязательны `initiativeSlug` и `stage`. Restored dialog materialization и `dialog:send` reuse обязаны восстанавливать `initiativeSlug=workspaceSlug`, иначе Core обязан завершать arbitration как `no_rollover` и разблокировать UI.
- Continuity chain обязана хранить актуальный `session.modelBinding`: initial outbound turn создаёт segment с binding snapshot, а каждый последующий outbound после same-session model/reasoning switch refresh-ит latest matching segment без создания duplicate segment. Threshold-created continuation session наследует именно этот persisted/current binding.
- Если provider отдаёт `turn_completed` раньше финального usage snapshot, session остаётся в pending-arbitration до появления trailing `token_usage`; отсутствие usage прямо в `turn_completed` не считается автоматическим `no_rollover`.
- Если provider может доказуемо сказать, что trailing usage snapshot для уже завершённого turn-а не придёт, он обязан эмитить explicit signal `postTurnTokenUsageUnavailable: true` вместе с `turn_completed`. Только этот explicit signal разрешает Core завершить pending-arbitration как `no_rollover` без trailing `token_usage`; просто отсутствие usage этого по-прежнему не означает.
- Cached token-usage snapshot обязан очищаться при старте нового outbound user turn и после финального post-turn arbitration, чтобы usage предыдущего turn-а не протекал в следующий.
- Legacy threshold-trigger handoff path сейчас отключен в production runtime (`enableLegacyHandoff=false`), но при включении обязан быть retry-safe: `ContinuityMonitor` и pending handoff state сбрасываются после неудачной отправки handoff prompt, невозможности записать report, невозможности создать continuation session и после финальной попытки resume prompt.

## Порог
- Запуск continuity привязан к remaining% threshold per-provider (дефолт 30%).

## Связанные контракты
- Workspace runtime/lock: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Input lock SSOT/state machine: `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
- Dialog routing: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
