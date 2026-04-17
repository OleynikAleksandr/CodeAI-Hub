# Gemini Real Resume + PM Stale-Seed Guard — 1.2.8

## Проблема

Retest 1.2.7 показал три проблемы:

1. **`argv.resume` — no-op.** Мой 1.2.7 fix прокинул `resume: providerSessionId` в compat `loadCliConfig`, но никто это не читает. Gemini CLI главный binary сам вызывает `SessionSelector.resolveSession(uuid)` → `config.setSessionId(loaded.sessionId)` → `geminiClient.resumeChat(convertSessionToClientHistory(messages), resumedSessionData)`, чтобы залить prior history в in-memory chat и переиспользовать исходный chat-файл через `ChatRecordingService.initialize(resumedSessionData)`. У нас этих трёх шагов нет — bootstrapper просто делает `config.initialize()`. Итог: post-rebind Gemini стартует с пустым chat, создаётся новый chat-файл, Description Agent инструкция и prior dialog не грузятся.

2. **PM stale-seed chaos.** В retest-логе после Stop PM.dialog.bootstrap.resolved создал НОВУЮ Core session (`6a6da7bf`), seeded с providerSessionId `443db15b` и `providerSessionStatus: "ready"`. User send на эту session обходит `hasStopInvalidatedBinding` (проверяется на другой sessionId) → rebind skipped → direct send → `GeminiSessionStore.requireSession` throws `Session 443db15b not found. Available: [] Aliases: []`. Это зеркало 1.2.5 бага для Claude (там UI смотрел на мёртвую старую, здесь PM создал новую session с dead binding = ready).

3. **SwitchRecoveryBanner — legacy UI.** Компонент `src/client/ui/src/session/switch-recovery-banner.tsx` (Retry in place / Retry with current provider / Switch to X / Dismiss) показывается на `failureClass=session_binding_recoverable`. Пользователь хочет убрать полностью — UI, hook, types.

## Проверенные факты

- `@google/gemini-cli-core` экспортирует `convertSessionToClientHistory(messages)` из `dist/src/utils/sessionUtils.js`.
- `Config` публично экспортирует `setSessionId(sessionId)` и `readonly storage: Storage` с `storage.getProjectTempDir()`.
- `GeminiClient.resumeChat(history, resumedSessionData)` существует в `core/client.js`, вызывает `startChat` → `new GeminiChat` → `ChatRecordingService.initialize(resumedSessionData, kind)` с resume-веткой, которая переиспользует `resumedSessionData.filePath` для записи, не создавая новый.
- Chat-файл именуется `session-<ISO-timestamp>-<uuid-first-8>.json` под `<projectTempDir>/chats/`.
- Внутри JSON-а полный UUID лежит в `conversation.sessionId`, так что можно разрешать коллизии по совпадению full UUID + "file with most messages" как fallback для mess-состояний с диска.

## Решение

### Stream 2 — Real resume wiring

`gemini-session-bootstrapper.ts`:
- добавить `convertSessionToClientHistory` в `GeminiCliModules` через cli-bridge-module-loader (динамический import `@google/gemini-cli-core/dist/src/utils/sessionUtils.js`);
- после `config.initialize()`, если `resumedSessionId` задан:
  1. просканировать `config.storage.getProjectTempDir() + "/chats"` на `session-*-<uuid-first-8>.json`;
  2. прочитать JSON, отобрать записи где `sessionId === resumedSessionId`;
  3. выбрать запись с наибольшим `messages.length` (обработка двойных файлов от до-1.2.8 состояния);
  4. `config.setSessionId(loaded.sessionId)`;
  5. `history = convertSessionToClientHistory(loaded.messages)`;
  6. `await client.resumeChat(history, { conversation: loaded, filePath: sessionPath })`.
- Если chat-файла нет или не парсится — log warn, продолжить без resume (graceful degrade; при следующем Stop уже будет что загружать).

`argv.resume` в `gemini-session-settings-resolver.ts` **остаётся** — это документированный контракт Gemini CLI, совместимость на случай будущих SDK версий. Дублирование не мешает.

### Stream 4 — PM stale-seed guard

`GeminiProviderAdapter.sendMessage` оборачивает вызов `manager.sendMessage` в try/catch: если error.message startsWith `Gemini session ` и includes ` not found. Available:`, конвертирует в custom `GeminiSessionStaleBindingError` с полем `providerSessionId`. Провайдерный `sendMessage` remains async и прокидывает ошибку выше.

В Core `SessionRequestHandlerMessageDispatch.dispatchUserMessage` (или `provider-send.ts`) catch-блок:
- если ошибка — instance `GeminiSessionStaleBindingError` ИЛИ `error.message` matches pattern, `hasStopInvalidatedBinding(sessionId)` false, и провайдер declares `requiresPostStopResume` — принудительно вызвать `sessionManager.invalidateProviderBinding(sessionId)` + записать pre-stop providerSessionId в `preStopProviderSessionIdBySession`, потом триггерить `stopRebind.ensureSessionReadyForSend(session)` и повторить send. Только одна попытка auto-retry; при повторной "not found" — конвертируем в обычный error (не зацикливаемся).

### Stream 5 — Remove SwitchRecoveryBanner

Удаляется целиком:
- `src/client/ui/src/session/switch-recovery-banner.tsx`
- `src/client/project-manager/components/sessions/use-dialog-switch-offer.ts`
- типы `dialog-switch-types.ts` (только если не используются ещё где-то)
- imports / usage в `src/client/ui/src/session/session-view.tsx`
- связанные CSS / i18n keys
- если хук обслуживает ещё и другие сценарии — migrate их (по факту: только Retry/Switch buttons на failureClass)

После Stream 4 авто-recovery делает rebind молча, SwitchRecoveryBanner не нужен. Нерекаверабельные ошибки остаются в обычном dialog-error path (inline).

## Scope boundaries

- Claude/Codex resume paths не меняются. Claude SDK сам resumes через native JSONL provider-home; Codex через rollout replay.
- Multi-session binding chaos мы чиним только в провайдер-path (Gemini). Если аналогичная проблема всплывёт на Claude/Codex — делаем отдельный scope.
- Stream 5 — чистое удаление. Если failureClass surface понадобится в будущем для другого сценария, добавим новую UI-поверхность отдельно.

## Tests

- Extend `gemini-session-manager.stop-resume.test.ts`: mock `convertSessionToClientHistory` + `client.resumeChat` spy; проверить что при `resumeSessionId` прописанном (а) файл читается с диска через fake fs, (б) `setSessionId` вызывается, (в) `resumeChat(history, resumedSessionData)` вызывается ровно один раз, (г) argv.resume тоже прокинут (для совместимости).
- Новый test: stale-seed guard — mock `GeminiSessionManager.sendMessage` throws `not found`; проверить что catch-path вызывает `invalidateProviderBinding` + `ensureSessionReadyForSend` + retry.

## Release

1.2.8 — fix-only.
