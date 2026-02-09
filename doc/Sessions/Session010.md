# Session 010 — Gemini Idea Collector Integration (INCOMPLETE)

**Date:** 2026-01-19 09:50 (CET)
**Branch:** main
**Version:** 1.1.446

---

# 1. Work Done in This Session

## Work summary
- ✅ Добавлен Gemini в список провайдеров Idea Collector (кнопка "Отправить анкету")
- ✅ Исправлены устаревшие ссылки на `doc/Architecture/` в GEMINI.md и AGENTS.md
- ✅ Архивирован `todo-plan-phase60.md`, создан новый план Phase 61
- ⚠️ Добавлен fallback поиск сессий и диагностика в Gemini module
- ❌ **ПРОБЛЕМА НЕ РЕШЕНА**: Промпт не отправляется в сессию Gemini при выборе провайдера

## Git commits
- `85a3e30a` docs: fix outdated doc/Architecture refs in GEMINI.md
- `e90243bb` feat(project-manager): add gemini to idea collector providers
- `9137678c` chore: bump version to 1.1.445
- `3b34aab6` fix(gemini): add fallback session lookup and diagnostics
- `56430ac5` chore: bump version to 1.1.446

---

# 2. CRITICAL BUG: Gemini не получает первое сообщение (промпт)

## Симптомы
- При выборе Gemini в Idea Collector создаётся сессия
- Сессия открывается **ПУСТАЯ** — первое сообщение (промпт из `description-collector-prompt.md`) не появляется
- С Claude и Codex всё работает корректно

## Ожидаемое поведение
1. Пользователь заполняет анкету → нажимает "Отправить анкету"
2. Выбирает провайдера (Claude/Codex/Gemini)
3. Создаётся новая сессия
4. Промпт из `~/.codeai-hub/templates/description/description-collector-prompt.md` отправляется как первое сообщение пользователя
5. Провайдер получает промпт и начинает обработку

## Проведённый анализ

### Цепочка вызовов (flow)
```
1. UI: description-questionnaire-panel.tsx → handleSubmit()
2. UI: api.getIdeaCollectorProviders() → provider picker dialog
3. UI: submitQuestionnaire() → idea-collector-submit-service.ts
4. Core: session:create → session-request-handler.ts:handleCreate()
5. Core: adapter.createSession() → gemini-provider-adapter.ts
6. Gemini: GeminiSessionManager.createSession() → возвращает sessionId
7. Core: session:created broadcast
8. UI: api.sendSessionMessage(session.id, promptPack.content)
9. Core: session:message → handleMessage()
10. Core: adapter.sendMessage(binding.providerSessionId, content)
11. Gemini: GeminiSessionManager.sendMessage(sessionId, content)
    ^^^ ЗДЕСЬ ПРОБЛЕМА ^^^
```

### Ключевые файлы для анализа
| Файл | Строки | Описание |
|------|--------|----------|
| `src/client/project-manager/services/idea-collector-submit-service.ts` | 242-282 | `submitQuestionnaire()` — создаёт сессию и отправляет промпт |
| `packages/core/src/remote-bridge/handlers/session-request-handler.ts` | 515-588 | `handleMessage()` — получает сообщение и отправляет в adapter |
| `packages/core/src/provider-registry/index.ts` | 448-909 | `ProviderRegistry` — регистрация провайдеров |
| `packages/Gemini_Module/src/provider/gemini-provider-adapter.ts` | 85-99 | `sendMessage()` — отправка в GeminiSessionManager |
| `packages/Gemini_Module/src/session/gemini-session-manager.ts` | 216-317 | `sendMessage()` — обработка сообщения |

### Гипотезы (не подтверждены)
1. **Session ID mismatch** — Core отправляет сообщение с одним sessionId, а Gemini хранит сессию под другим
2. **Timing issue** — сообщение отправляется до того, как сессия полностью инициализирована
3. **Event не доходит** — binding или adapter не найдены в момент handleMessage
4. **Ошибка падает молча** — sendMessage бросает exception, но он не отображается в UI

### Сделанные исправления (v1.1.446)
В `gemini-session-manager.ts` добавлено:
- Fallback поиск сессии по `session.sessionId` property (не только по ключу map)
- Улучшенное сообщение об ошибке с перечислением доступных session IDs
- Диагностический лог в начале `sendMessage()`

**Это не помогло** — нужно глубже исследовать проблему.

---

# 3. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/TODO/todo-plan.md`
3. `doc/Sessions/Session010.md` (THIS REPORT)

## Ключевые файлы для чтения (ОБЯЗАТЕЛЬНО)
```bash
# Понять flow отправки сообщения
git show 3b34aab6  # fix(gemini): add fallback session lookup

# Сравнить реализации sendMessage
packages/Claude_Module/src/sdk/claude-sdk-manager.ts:106-140
packages/Codex_Module/src/sdk/codex-sdk-manager.ts:159-180
packages/Gemini_Module/src/session/gemini-session-manager.ts:216-320

# Проверить как Core отправляет сообщение
packages/core/src/remote-bridge/handlers/session-request-handler.ts:515-588
```

## Plans for next session
1. **Добавить детальное логирование** в точках:
   - `session-request-handler.ts:handleMessage()` — залогировать sessionId, binding, adapter
   - `gemini-provider-adapter.ts:sendMessage()` — залогировать входящий sessionId
   - `gemini-session-manager.ts:sendMessage()` — проверить какие сессии есть в map

2. **Проверить гипотезу session ID mismatch**:
   - В `createSession` Gemini может менять sessionId через `promoteSessionId()`
   - Core получает новый ID, но возможно где-то используется старый

3. **Сравнить с Claude**:
   - Claude использует `ensureSessionStarted()` перед отправкой
   - Gemini сразу вызывает `requireSession()` — может нужна похожая логика

4. **Проверить binding**:
   - В Core `providerSessions.get(sessionId)` должен вернуть binding
   - `providerRegistry.getAdapter(binding.providerId)` должен вернуть adapter

---

# 4. Technical Notes

## Различия в реализации sendMessage между провайдерами

| Параметр | Claude | Codex | Gemini |
|----------|--------|-------|--------|
| turnOptions | ✅ поддерживает | ✅ поддерживает | ❌ НЕ поддерживает |
| ensureSessionStarted | ✅ есть | ❌ нет | ❌ нет |
| Очередь сообщений | ❌ прямая отправка | ✅ enqueueMessage | ❌ прямая отправка |
| Валидация статуса | ❌ нет | ❌ нет | ✅ проверяет status |

## Особенность Gemini
```typescript
// gemini-session-manager.ts:348-363
private promoteSessionId(previousId, nextId, session) {
  this.sessions.delete(previousId);  // УДАЛЯЕТ старый ID
  session.sessionId = nextId;
  this.sessions.set(nextId, session);  // ДОБАВЛЯЕТ новый ID
  return nextId;
}
```
Если Core продолжает использовать `previousId`, сессия не будет найдена!

## Версии релизов
- v1.1.445 — добавлен Gemini в Idea Collector (баг присутствует)
- v1.1.446 — добавлена диагностика (баг НЕ исправлен)
