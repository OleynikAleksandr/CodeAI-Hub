# Questionnaire Curator — Architecture

**Status:** Draft (needs approval)
**Owner:** Oleksandr
**Updated:** 2026-01-20

---

## 1. Problem

В workflow (в первую очередь `description`) агент часто задаёт повторяющиеся уточняющие вопросы между “итерациями” работы над шагом (например, после `Edit Step`).
Цель — автоматически фиксировать (append-only) ответы пользователя, дополнительные уточнения и замечания в `questionnaire.md`, чтобы следующий старт/продолжение сессии имели более полный контекст.

---

## 2. Goals / Non-goals

### Goals
- Автоматически добавлять в конец `questionnaire.md` секцию **Clarifications log** на основании диалога текущей сессии/чекпоинта шага.
- Поддерживать **append-only** стратегию (без редактирования существующих секций анкеты).
- Гарантировать **идемпотентность**: один и тот же чекпоинт не должен дописываться в анкету повторно.
- Работать локально в пределах workspace и `.codeai-hub/**`.

### Non-goals
- Не пытаемся «рефакторить» или переформатировать уже заполненные поля анкеты.
- Не внедряем сложный knowledge base или дедупликацию по смыслу (только защита от повторной обработки одного и того же чекпоинта).
- Не меняем общий file-first workflow и текущие contracts `artifact-upsert`.

---

## 3. Scope

Первая итерация — только стадия `description`.
Дальше можно распространить на другие стадии при необходимости.

---

## 4. Inputs / Outputs

### Inputs
- Session metadata: Core `Session` (providerId, providerSessionId, stage, createdAt)
- Transcript: `.codeai-hub/sessions/<sessionWorkspaceSlug>/<providerId>/<providerSessionId>.jsonl`
- Questionnaire: `.codeai-hub/<artifactWorkspaceSlug>/<stage>/questionnaire.md` (по `initiativeSlug`, если есть)

### Output
- Append-only update анкеты:
  - дописать секцию `## Clarifications log` (или расширить существующую секцию) в конце файла
  - добавить новую запись для конкретного чекпоинта (session finalize)

---

## 5. Trigger (when curator runs)

Curator запускается после “финализации” чекпоинта пользователем (обычно это завершение текущего под-этапа шага).
Триггер — пользовательское сообщение, совпадающее с паттерном финализации (пример):
- `ок`, `ok`
- `утверждаю`
- `approve`, `approved`

Технически в Core это уже определяется через `FINALIZE_TRIGGER_PATTERN`.

**Условие запуска:**
- есть `workspaceSlug` и `stage`
- `stage` входит в allowlist (в первой версии — `description`)
- пользовательский ввод удовлетворяет finalize trigger

---

## 6. Transcript format (contract)

Session JSONL — JSON Lines, одна запись на сообщение (type=message).
Минимальный контракт записи:

```json
{"id":"<messageId>","role":"user|assistant|thinking","content":"...","timestamp":"2026-01-19T10:58:13.863Z"}
```

Допустимые расширения (опционально):
- `providerId`, `providerSessionId`
- `sessionId`

Требования:
- порядок записей соответствует хронологии
- запись должна содержать нормализованный строковый `content`

---

## 7. Append format (contract)

Curator всегда добавляет запись в анкету в формате:

```md
## Clarifications log

### 2026-01-19T12:15:00Z — description / claudeCli / <providerSessionId>
<!-- curator:checkpointId=<checkpointId> -->

- Q: ...
  - A: ...
- Notes: ...
```

### Идемпотентность
Перед записью Core ищет в `questionnaire.md` маркер:
- `<!-- curator:checkpointId=<checkpointId> -->`

Если маркер уже существует — curator ничего не дописывает.

---

## 8. Curator generation (LLM contract)

Curator использует отдельный prompt-template (например, `questionnaire-curator.md`) и получает на вход:
- текущий `questionnaire.md`
- session transcript JSONL из `.codeai-hub/sessions/...` (Core предварительно удаляет самый первый user-пакет промпта Description Agent)
- run metadata (Core `Session` + блок `Run metadata` в промпте)

Выход LLM должен быть ограничен **только** контентом для append (без маркеров и обёрток).
Core принимает ответ как готовый Markdown‑блок и дописывает его в конец анкеты, удаляя эхо входных секций.

---

## 9. Failure modes

- Нет session JSONL или он пустой → curator пропускается (лог + без ошибок в UI).
- LLM вернул пустой ответ → curator пропускается (лог).
- LLM вернул невалидный append block (эхо промпта/плейсхолдеры) → curator пропускается (лог).
- Ошибка чтения/записи `questionnaire.md` → curator пропускается (лог), run остаётся валидным.

---

## 10. Manual verification (acceptance)

1. Run #1 (`description`): агент задаёт уточнения, пользователь отвечает.
2. Пользователь отправляет `OK/ок/approve`.
3. Curator дописывает новую запись в `questionnaire.md`.
4. Run #2 (`description`): агент читает обновлённую анкету и не повторяет уже отвеченные вопросы.
