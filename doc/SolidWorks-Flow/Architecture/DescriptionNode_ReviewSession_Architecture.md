# Workflow Tree — Description Node: Final Artifact + Reviewer Session

**Version:** 1.0
**Date:** 2026-01-19
**Status:** Draft (approved decisions captured)

---

## 1. Problem Statement

Нужно зафиксировать поведение системы в стиле SolidWorks: пользователь в любой момент может вернуться к любому узлу дерева разработки и выполнить `Edit`, понимая, что изменения могут повлиять на все последующие узлы.

Ранее попытка “куратора” дописывать `questionnaire.md` из JSONL показала, что:
- это легко ломается (эхо промптов, неполные Q/A, зависимость от “finalize”);
- это не является единственным источником истины (история уже хранится в JSONL).

Мы переходим на **artifact-first** подход: источник истины для следующих шагов — финальный артефакт узла, а вся история уточнений — в возобновляемой reviewer-сессии.

---

## 2. Goals

- Узел `description` хранит **только финальный артефакт** (без “сырого” черновика).
- Узел `description` хранит **ссылку на возобновляемую reviewer-сессию**, чтобы пользователь мог продолжить диалог позже (через дни/недели).
- Следующие этапы (virtual simulation / diagrams / etc.) получают на вход **финальный артефакт**, а не анкету.
- При `Edit` раннего узла downstream-узлы помечаются как `OUTDATED` и подлежат пересборке.

---

## 3. Non-Goals

- Не делаем “триггеры” по ключевым словам (approve/ok/утверждаю) для кураторов/сборщиков.
- Не дублируем Q/A в `questionnaire.md` как обязательный слой данных.
- Не поддерживаем resume для Gemini на этом этапе (исключаем из “длинных” reviewer-сессий).

---

## 4. Key Decisions (approved)

1) **Храним только финальный артефакт** в узле `description`.
2) Reviewer-сессии с resume: **только Claude/Codex**. Gemini — только разовые короткие сессии без гарантии resume.
3) Источник истины истории — **unified session JSONL** (в `.codeai-hub/sessions/...`).

---

## 5. Data Model

### 5.1 Node composition (conceptual)

`Description Node` состоит из двух “саб-узлов”:
- `Artifact`: финальный `description.md`
- `Session`: ссылка на reviewer-сессию (resume)

### 5.2 `ReviewerSessionRef`

Минимальная структура ссылки на reviewer-сессию:

- `providerId`: `claudeCli` | `codexCli`
- `providerSessionId`: строка (provider-native id; используется для resume)
- `jsonlPath`: абсолютный путь к unified session JSONL

Примечание: `jsonlPath` не должен быть “вводимой пользователем” строкой — он вычисляется детерминированно из `providerId + providerSessionId + workspaceSlug`.

### 5.3 Session JSONL location

Unified session storage хранит события в:
- `~/.codeai-hub/sessions/<workspaceSlug>/<providerId>/<sanitizedProviderSessionId>.jsonl`

Где `sanitizedProviderSessionId` нормализован под безопасный slug (см. `@codeai-hub/unified-session/sanitizeWorkspaceSlug`).

---

## 6. Flows

### 6.1 Build Description (one-shot)

1) Пользователь заполняет `questionnaire.md`.
2) `Description Agent` получает только пути (path-first):
   - questionnaire path
   - description template path
   - target output path
3) Агент **не задаёт вопросы**, а пишет `description.md` по target path.

Результат: `description.md` (черновой, но структурированный).

### 6.2 Review & Finalize Description

1) `Reviewer Agent` получает на вход `description.md` (и, при необходимости, template/контекст).
2) В ходе диалога может задавать вопросы и уточнять.
3) По `Finalize` пишет **финальную версию** `description.md` (перезапись/новая ревизия в рамках узла).
4) Узел фиксирует `ReviewerSessionRef`.

Результат узла: финальный `description.md` + resume-сессия.

### 6.3 Edit Description Node

1) Пользователь кликает `Session` → `Continue` (resume).
2) Обсуждает правки.
3) Reviewer пишет новую ревизию `description.md`.
4) Все downstream-узлы помечаются `OUTDATED`.

---

## 7. Implications for UI

- В Workflow Tree узел `description` показывает:
  - `Open artifact` (просмотр markdown)
  - `Continue review session` (resume)
  - `Edit` (синоним продолжения reviewer-сессии + выпуск новой ревизии)

- UI должен явно предупреждать:
  - “Изменения в этом узле могут сделать последующие узлы устаревшими (OUTDATED).”

---

## 8. Implications for Core

- Core должен уметь:
  - сохранять/читать артефакты узлов (уже есть file-first запись артефактов);
  - хранить `ReviewerSessionRef` рядом с артефактом узла (в манифесте узла или state store);
  - резюмировать сессию по `providerId + providerSessionId` (уже есть `resumeSession` для поддерживаемых провайдеров);
  - помечать downstream узлы как `OUTDATED` при изменении артефакта раннего узла.

---

## 9. Migration Notes

- “Questionnaire Curator” становится опциональным и не является механизмом повышения качества артефакта.
- Повышение качества делается через последовательность:
  - `questionnaire.md` → one-shot `description.md` → reviewer → финальный `description.md`.
