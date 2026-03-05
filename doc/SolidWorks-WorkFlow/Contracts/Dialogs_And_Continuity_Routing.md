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
- Первичное открытие dialog-mode выполняется последовательно: сначала фиксируем active dialog/session identity в PM-контроллере, затем запрашиваем `dialog:history`; history payload не должен теряться из-за гонки между `dialog:list:result` и первым `dialog:history:result`.
- Для cold-open `dialog:history` обязателен watchdog-ретрай: если первый full-history запрос (`cursor=0`) остаётся pending дольше таймаута, PM должен сбросить pending-marker и сделать один forced retry, чтобы пользователь не зависал в `No messages yet`.

## Связанные контракты
- Workspace runtime/lock: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Continuity: `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
