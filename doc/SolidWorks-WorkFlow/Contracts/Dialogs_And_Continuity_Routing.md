# Dialogs & Continuity Routing — Contract (SSOT)

## Назначение
Разделить “открыть диалог/историю” и “успешно зарезюмить провайдера”, чтобы UI всегда открывался и корректно восстанавливался после restart/reconnect.

## Канонические сущности
- **Agent Dialog**: ключ `dialogId` (1 диалог = 1 JSONL история в UI).
- **Provider segment**: ключ `providerSessionId` (1 реальный thread у провайдера).
- **Core runtime session**: ключ `sessionId` (меняется при rollover).

## Инварианты
- Клик по агенту открывает диалог через историю (cold start), live tail подключается best-effort.
- После restart Core/PM диалог восстанавливается из накопительного JSONL.
- Дубликаты от replay/reconnect подавляются (dedupe).
- Threshold-driven continuity не должна менять активный dialog/router target до post-turn boundary: пока текущий one-shot turn не завершён, UI продолжает жить в текущем `dialogId`, даже если уже пришёл pre-turn `token_usage`.
- Continuity rollover меняет live `sessionId` только после завершения turn-а и запуска handoff/bootstrap; до этого ранние usage snapshots могут влиять лишь на post-turn arbitration, но не на visible dialog routing.
- Первичное открытие dialog-mode выполняется последовательно: сначала фиксируем active dialog/session identity в PM-контроллере, затем запрашиваем `dialog:history`; history payload не должен теряться из-за гонки между `dialog:list:result` и первым `dialog:history:result`.
- Для cold-open `dialog:history` обязателен watchdog-ретрай: если первый full-history запрос (`cursor=0`) остаётся pending дольше таймаута, PM должен сбросить pending-marker и сделать один forced retry, чтобы пользователь не зависал в `No messages yet`.
- Tail `dialog:history` merge является canonical reconciliation boundary: recent optimistic `user` placeholder с тем же content должен заменяться первым canonical history record, а full-history rebuild обязан собираться только из canonical history и не оживлять optimistic placeholders.
- Semantic duplicate terminal assistant payload-ы одного provider turn обязаны подавляться до записи в dialog/unified history. Для terminal pairs вида `final_answer` + `task_complete` authoritative owner выбирается по payload identity, а `task_complete` остаётся fallback-only path, если equivalent final answer уже materialized.
- Usage telemetry routing на open/reconnect является replay-first: PM хранит provider-scoped usage cache и может seed-ить reopened dialog ещё до появления конкретного source snapshot, а Core при `session_opened`, `binding_ready`, `provider_session_rebound` и `reconnect` сначала replay-ит cached `usage_limits` / `token_usage`, после чего bootstrap refresh допускается только один раз на lifecycle ready-binding и только при отсутствии cache.
- `dialog_opened` — специальный explicit-intent trigger: при фактическом открытии пользователем Core обязан replay-ить cached `usage_limits`, а затем запускать cheap provider refresh даже если cached payload уже есть. Это даёт instant last-known limits + pre-turn freshness без eager provider resume.
- Terminal usage updates нормализуются вокруг `turn_completed`: provider/core доставляют свежие usage snapshots в самом turn-completion payload и/или adjacent `stream_event`, без UI-owned provider reread.
- Если latest workspace snapshot уже подтверждает, что для `dialogId` нет live runtime segment, ready idle dialog не должен сам перезапускать `dialog:list`, `dialog:history` или provider usage refresh от incidental `dialog:message`, remount или reopen noise.

## Связанные контракты
- Workspace runtime/lock: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Continuity: `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
