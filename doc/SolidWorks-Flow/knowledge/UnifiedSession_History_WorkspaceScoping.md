# Unified Session History: правильная привязка к workspace (чтобы не терять диалог после рестартов)

**Updated:** 2026-02-01 (release 1.1.493)

Этот документ фиксирует «правильный» end-to-end поток сохранения/восстановления истории сессии (**диалога**) в Project Manager при:
- закрытии/повторном открытии Project Manager;
- рестарте Core;
- старте Core из *другого* workspace (multi-workspace режим).

Цель — чтобы при добавлении/доработке других провайдеров (Codex/Gemini/новые) не повторить ошибку, когда **сессия восстанавливается, токены есть, а диалог пустой**.

---

## 1) Симптомы (как распознать проблему)

- В Project Manager видна сессия (узел/таб), providerSessionId корректный.
- Token usage может восстановиться (например, через continuity), но:
- История сообщений в чате пустая (или частично пустая) после рестарта Core/PM.

Ключевой индикатор: `.jsonl` история физически существует в `~/.codeai-hub/sessions/…`, но UI получает пустой `messages[]`.

---

## 2) Источник истины для истории

**Unified session history** хранится в формате JSONL:

- Путь: `~/.codeai-hub/sessions/<workspaceKey>/<providerId>/<providerSessionId>.jsonl`
- Контракт чтения: `packages/unified-session/src/index.ts:213` (`readSessionEvents(filePath)`)

Важно:
- `providerSessionId` (а не internal `sessionId`) является именем файла.
- `providerId` участвует в пути, поэтому должен быть **стабильной строкой** (иначе история «разветвится» на разные папки).

---

## 3) Правильный end-to-end поток (UI → Core → Storage → UI)

### 3.1 Создание и регистрация сессии

1) Core создаёт `Session` через `SessionManager.createSession(...)`:
- `packages/core/src/remote-bridge/handlers/session-request-handler.ts:284`

2) Сразу после создания Core обязан зарегистрировать сессию в unified-session storage:
- `packages/core/src/remote-bridge/handlers/session-request-handler.ts:298` (`this.sessionStorage.register(session)`)

3) `UnifiedSessionStorage.register(session)` должен зафиксировать **workspaceKey**, по которому будет писаться история:
- `packages/core/src/unified-session/storage.ts:44`

Критично:
- workspaceKey должен быть вычислён **из самой сессии**, а не из «текущего» workspace Core.
- в 1.1.493 workspaceKey берётся как `sanitizeWorkspaceSlug(session.workspacePath)` (fallback: `defaultWorkspaceSlug`).

### 3.2 Запись сообщений

Запись идёт через `UnifiedSessionWriter.appendMessage(...)` внутри `UnifiedSessionStorage.writeMessage(...)`:
- `packages/core/src/unified-session/storage.ts:271`

Writer инициализируется так, чтобы итоговый путь зависел от:
- `rootDirectory` (по умолчанию `~/.codeai-hub/sessions`)
- `workspaceKey`
- `providerId`
- `providerSessionId`

Точка создания writer:
- `packages/core/src/unified-session/storage.ts:189`

### 3.3 Чтение истории в UI

Project Manager запрашивает историю через HTTP endpoint:
- `GET /api/v1/sessions/:sessionId/history`

Реализация:
- `packages/core/src/remote-bridge/handlers/http-api-router.ts:239`
- чтение сообщений: `packages/core/src/remote-bridge/handlers/http-api-router.ts:252` (`this.deps.sessionStorage.readMessages(session)`)

`UnifiedSessionStorage.readMessages(session)` обязан:
- вычислить `providerSessionId`;
- найти нужный `.jsonl` файл;
- вернуть список `SessionMessage[]`.

---

## 4) Главная ошибка, которую нельзя повторять (и почему она проявляется чаще в multi-workspace)

Если `UnifiedSessionStorage` использует **глобальный** workspaceSlug из config/окружения Core (например, «какой проект был активен при старте Core»), то при рестарте Core из другого workspace он начнёт:
- писать историю в другой `~/.codeai-hub/sessions/<workspaceKey>/…`;
- читать историю из другой папки;
- UI увидит пустую историю, даже если `.jsonl` существует.

В multi-workspace режиме Core обслуживает несколько `workspacePath` одновременно, поэтому **workspaceKey должен быть свойством сессии**.

Подтверждение multi-workspace контрактов:
- `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md` (раздел про multi-tenant и `workspacePath` на уровне Session)

---

## 5) Правильная защита от «разъезда» workspaceKey

### 5.1 Пер-сессионная привязка

`UnifiedSessionStorage` обязан привязывать workspaceKey на `register(session)`:
- `packages/core/src/unified-session/storage.ts:44`

### 5.2 Fallback-поиск истории (на случай legacy/миграций)

Если исторически данные могли писаться в «не тот» workspace bucket, чтение должно уметь fallback:
- взять `preferredWorkspaceSlug` из текущей сессии;
- дополнительно перечислить все workspace roots в `~/.codeai-hub/sessions/*`;
- попытаться прочитать историю из каждого кандидата и смержить по `messageId`.

Реализация fallback-чтения:
- `packages/core/src/unified-session/storage.ts:123`
- перечисление workspace roots: `packages/core/src/unified-session/workspace-slugs.ts:4`

---

## 6) Чеклист для добавления/изменения провайдера (чтобы history не ломалась)

1) **Стабильный `providerId`**
- Не меняйте строковый `providerId` между версиями без миграции, иначе история уйдёт в новую папку.

2) **Стабильный `providerSessionId`**
- Это ключ имени файла `.jsonl`.
- Если провайдер поддерживает «алиасы/промоушен» sessionId (например, сначала временный id, потом финальный), Core должен:
  - обновить `session.providerSessionId`,
  - вызвать `sessionStorage.promote(sessionId, providerSessionId)`.
  (См. `packages/core/src/unified-session/storage.ts:64`.)

3) **Не использовать глобальный workspaceSlug для истории**
- История всегда должна быть привязана к сессии (`workspacePath` / `workspaceSlug`), а не к месту запуска Core.

4) **Тесты руками (обязательная ручная верификация)**
- Создать сессию в workspace A.
- Полностью остановить Core.
- Запустить Core из workspace B.
- Открыть Project Manager и возобновить сессию из A.
- Ожидаемо: `history` НЕ пустая.

---

## 7) Быстрый отладочный сценарий

1) Найти `providerSessionId` (в логах Core `Resolved session for incoming message` или из UI).
2) Проверить файл истории:
- `~/.codeai-hub/sessions/*/<providerId>/<providerSessionId>.jsonl`
3) Если файл есть и в нём есть строки `{"type":"message",...}` — проблема почти всегда в workspaceKey (не там читаем).

