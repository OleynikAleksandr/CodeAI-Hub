# Gemini Stop Abort + Resume Architecture — 1.2.7

## Проблема

На Gemini Stop → Continue агент полностью теряет контекст. В Session 40 (Codex 1.2.6) был исправлен Codex subprocess abort, но Gemini остался непроверенным. Retest 2026-04-17 показал: после Stop и отправки «Продолжай» Gemini отвечает «Чем я могу помочь вам с вашим проектом сегодня?», не помня ни Description Agent инструкции, ни предыдущего dialog'а.

## Root cause (из диагностики 2026-04-17)

Два независимых бага в цепочке Stop→rebind:

1. **Destructive close.** `packages/Gemini_Module/src/session/gemini-session-lifecycle.ts:99-130` `closeSession` вызывает `session.client.resetChat()`. Это Gemini CLI Core operation: создаёт новый пустой `GeminiChat` с тем же `Config.sessionId` и пишет новый пустой chat-файл `~/.gemini/tmp/<slug>/chats/session-<ts>-<uuid8>.json`. Pre-stop chat-файл со всей историей остаётся на диске, но live client теряет связь с ним. `resetChat` — это CLI-native operation для команды `/chat clear`, она не должна применяться при Stop.

2. **No resume on rebind.** `packages/core/src/remote-bridge/handlers/session-request-handler-stop-rebind.ts:90-95` `performRebind` вызывает `resolveProviderSessionId({ requestedProviderSessionId: null })`. `null` → `shouldResume=false` → `adapter.createSession()`. Для Claude/Codex это нормально: continuity snapshot и provider rollout replay делают resume authoritative на provider-native стороне. Для Gemini это разрушительно: без `--resume <uuid>` Gemini CLI Core не загружает prior chat file и стартует с пустым контекстом.

Description Agent system instruction пришёл один раз в первом `sendMessage` как user-message и лежит только в pre-stop chat file (`session-2026-04-17T08-11-589701c1.json`). Без resume он потерян навсегда.

## Проверенные факты

- `gemini --resume <full-UUID> --prompt ...` работает и корректно загружает pre-stop chat file (проверено локально 2026-04-17).
- `gemini-session-settings-resolver.ts:124` уже пробрасывает `resume: options.resumeSessionId` в argv Gemini CLI Core, provider adapter готов к resume.
- `GeminiProviderAdapter.resumeSession` уже существует (gemini-provider-adapter.ts:68-77) и зовёт `manager.resumeSession` → `bootstrapper.bootstrap({ resumeSessionId })`.

Блокер только на Core-стороне: после Stop Core не помнит pre-stop `providerSessionId` и передаёт `null` в rebind.

## Решение

### 1. Убрать resetChat из closeSession
`GeminiSessionLifecycle.closeSession` оставляет только `abortController.abort()` + `sessionStore.removeSession`. `resetChat` удаляется. `abort` достаточно чтобы прервать active turn, pre-stop chat file остаётся нетронутым на диске.

### 2. Core-side сохранение pre-stop providerSessionId
В `SessionProviderBindingService.invalidateProviderBinding(sessionId)` добавить запоминание текущего `providerSessionId` в Map<sessionId, string> `preStopProviderSessionIdBySession` до инвалидации. Очищать этот Map после успешного rebind или при полном удалении session.

В `SessionRequestHandlerStopRebind.performRebind`:
- если есть `preStopProviderSessionId` для этой session, передать его в `resolveProviderSessionId({ requestedProviderSessionId: preStopProviderSessionId })`;
- иначе по-прежнему `null` (старое поведение для Claude/Codex, которые и так работают).

### 3. Provider capability flag
`provider-descriptor-factory.ts` получает флаг `requiresPostStopResume: boolean`. Для `geminiCli` — `true`; для `claude` / `codex` — `false` (их Core-side continuity достаточен). Флаг используется в `performRebind`: ветка с pre-stop providerSessionId включается только если `requiresPostStopResume`. Для других провайдеров поведение не меняется, regression risk минимальный.

### 4. Invariant 24 дополнить
В `SystemArchitecture.md` Invariant 24 добавить абзац про Gemini:
- actually-abort для Gemini = `abortController.abort()` без `resetChat()`;
- provider-native history file должен сохраняться нетронутым на диске;
- Core-side post-stop rebind для провайдеров с `requiresPostStopResume = true` обязан передавать pre-stop providerSessionId в resume-path, чтобы provider-native runtime загрузил prior history.

## Scope boundaries

- Claude / Codex paths не меняются. Их existing post-stop flow зафиксирован Invariant 28 (Session 40) и не нуждается в resume-path.
- Workflow прерван-turn content persistence (что было записано в нашем PM transcript до Stop) остаётся как есть. Задача данного scope — только сохранить continuity для provider-native runtime.
- Gemini `--resume latest` как альтернатива UUID не используется: Gemini CLI list-sessions содержит сессии всех workspace (не workspace-scoped), `latest` может указать не туда.

## Tests

- `gemini-session-manager.stop-resume.test.ts`: create → send → stop → send → проверить, что `resetChat` не звалась и bootstrap 2-го `sendMessage` получил `resumeSessionId = pre-stop providerSessionId`.
- Manual retest 1.2.7: Gemini Description Agent → Stop → «Продолжай» → проверить, что ответ ссылается на prior dialog context, а не "Чем могу помочь?".

## Release

1.2.7 — fix-only релиз без diagnostic cycle: root cause полностью установлен статической диагностикой + локальной проверкой `gemini --resume <uuid>`.
