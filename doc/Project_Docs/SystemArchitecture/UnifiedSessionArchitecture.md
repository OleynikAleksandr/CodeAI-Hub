# Архитектура унифицированных сессий (актуально)

**Status:** Active reference
**Updated:** 2026-02-02 (release 1.1.497)

---

## TL;DR
CodeAI Hub хранит историю диалогов провайдеров в **своём** унифицированном формате, не полагаясь на внутренние логи провайдера.

- **Источник истины для UI истории:** `~/.codeai-hub/sessions/<workspaceKey>/<providerId>/<providerSessionId>.jsonl`
- **Провайдерские логи:** остаются на стороне провайдера и не являются контрактом (их не читаем/не пишем как часть продукта).

Ключевой принцип: **workspaceKey должен быть пер-сессионным**, иначе в multi-workspace режиме после рестарта Core диалог может “пропасть” (история окажется в другом bucket’е).

## Зачем
- Единый формат истории для UI (refresh/resume) независимо от провайдера.
- Стабильность: изменения форматов у провайдера не ломают отображение истории.
- Возможность расширения до multi-provider истории (будущее).

## Где реализовано
- Пакет: `packages/unified-session/`
- Использование: Core пишет унифицированные события по мере стриминга и отдаёт историю через API.

---

## Реализация (актуальные точки интеграции)

### 1) Создание и регистрация сессии

Core создаёт `Session`, затем **обязан** зарегистрировать её в `UnifiedSessionStorage`:
- `packages/core/src/remote-bridge/handlers/session-request-handler.ts:284` (`SessionManager.createSession(...)`)
- `packages/core/src/remote-bridge/handlers/session-request-handler.ts:298` (`this.sessionStorage.register(session)`)

### 2) Как выбирается workspaceKey

Хранилище должно вычислять workspaceKey из самой `Session`:
- `packages/core/src/unified-session/storage.ts:44` (`register(session)`)

В `1.1.493` workspaceKey берётся как `sanitizeWorkspaceSlug(session.workspacePath)` (fallback: `defaultWorkspaceSlug`), чтобы **не зависеть** от того, из какого workspace был запущен Core.
В `1.1.497` этот же принцип используется в resume validation (чтобы исключить cross-workspace resume по чужому `providerSessionId`).

### 3) Чтение истории (HTTP API)

UI читает историю через endpoint:
- `packages/core/src/remote-bridge/handlers/http-api-router.ts:239` (`GET /api/v1/sessions/:sessionId/history`)
- `packages/core/src/remote-bridge/handlers/http-api-router.ts:252` (`sessionStorage.readMessages(session)`)

### 4) Формат файла и чтение JSONL

- `packages/unified-session/src/index.ts:213` (`readSessionEvents(filePath)` читает JSONL; ENOENT → пусто)

---

## Anti-regression правила (для любых провайдеров)

1. **`providerId` должен быть стабильной строкой.** Он участвует в пути, смена = новая папка и “потеря” истории.
2. **`providerSessionId` — ключ имени файла.** Если у провайдера есть промоушен/алиасы id, Core должен вызывать `sessionStorage.promote(...)`:
   - `packages/core/src/unified-session/storage.ts:64`
3. **Нельзя привязывать историю к “текущему” workspace Core.** В multi-workspace режиме Core обслуживает несколько `workspacePath` одновременно.
4. **Нужен fallback на legacy buckets.** Если раньше история могла писаться не туда, чтение должно уметь найти её и смержить сообщения:
   - `packages/core/src/unified-session/storage.ts:123`
   - `packages/core/src/unified-session/workspace-slugs.ts:4`

---

## Связанные документы
- `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
- `doc/SolidWorks-Flow/knowledge/UnifiedSession_History_WorkspaceScoping.md`
- Исторический дизайн-док: `doc/Project_Docs/SystemArchitecture/Archive/UnifiedSessionArchitecture_2025-11-03.md`
