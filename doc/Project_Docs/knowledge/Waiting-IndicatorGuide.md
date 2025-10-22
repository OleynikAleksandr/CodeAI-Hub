# Индикатор ожидания в табах сессий

## Что не работало
- `FinalIndicator` на табах не появлялся либо скрывался, даже когда SDK присылал `result`. Причина: табы слушали состояние только активной сессии, а остальные UI-инстансы вообще не существовали, поэтому флаг `isWaitingForUser` не доходил.
- Первая версия индикатора позиционировалась `position:absolute`, но контейнер таба не имел `position: relative`, поэтому точка могла «улетать».
- События `session:waitingForUser` всегда слались со значением `true` и дублировались, из‑за чего состояние в `sessions[]` часто не обновлялось и не триггерило повторный рендер.

## Как исправлено
1. **Единый источник события** – `useFinalIndicatorState` теперь сравнивает текущий флаг с предыдущим (`wasWaitingRef`). Событие отправляется только при смене состояния и логирует `"[Indicator] session … waiting=…"`.
2. **Синхронизация табов** – `AppChatFacade.handleSessionEvent` обновляет и локальный стейт, и `SessionTabManager.setSessions`. Если данные действительно поменялись, логируется `"[Tabs] session … waiting=…"`.
3. **Фоновая синхронизация** – `SessionInterfaceFacade` монтируется только для активной вкладки, а фоновые сессии слушают события через `SessionWaitingIndicatorBridge`, который подписывается на `useDialogMessages` и пробрасывает `session:waitingForUser` в фасад.
4. **Отрисовка индикатора на табах** – таб вычисляет `shouldShowIndicator` и при true показывает `FinalIndicator status="animating"`, попутно пишет `"[Tabs] render indicator for …"`.
5. **Уборка шумных логов** – из цепочки сессий удалены массовые `console.log`, оставлены только три диагностических сообщения выше, чтобы наблюдать цепочку «hook → фасад → UI».

## Как проверить
1. Открыть 3 сессии, отправить в первых двух задания и переключиться на третью.
2. После завершения ответа ассистента в консоли должны появиться три строки:
   - `[Indicator] session <id> waiting=true`
   - `[Tabs] session <id> waiting=true`
   - `[Tabs] render indicator for <id>`
3. На табах первой и второй сессий загорится зелёная мигающая точка. После ответа пользователя цикл повторяется, но уже с `waiting=false`, что убирает индикатор.

Эти изменения лежат в файлах:
- `src/client/ui/src/dialog-renderer-module/hooks/useFinalIndicatorState.ts`
- `src/client/ui/src/app-chat-module/facades/AppChatFacade.tsx`
- `src/client/ui/src/app-chat-module/micro-components/SessionWaitingIndicatorBridge.tsx`
- `src/client/ui/src/components/SessionTabs.tsx`
- `src/client/ui/src/dialog-renderer-module/hooks/useDialogMessages.ts`
