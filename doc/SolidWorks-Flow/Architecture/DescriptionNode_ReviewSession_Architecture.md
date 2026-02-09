# Workflow Tree — Description Step/Node: Questionnaire → Draft → Auto-Review → Final

**Version:** 1.1
**Date:** 2026-02-09
**Status:** Draft (refined lifecycle + UI semantics)

---

## 1. Problem Statement

Нужно зафиксировать поведение системы в стиле SolidWorks: пользователь в любой момент может вернуться к любому узлу дерева разработки и выполнить `Edit`, понимая, что изменения могут повлиять на все последующие узлы.

Ранее попытка “куратора” дописывать `questionnaire.md` из JSONL показала, что:
- это легко ломается (эхо промптов, неполные Q/A, зависимость от “finalize”);
- это не является единственным источником истины (история уже хранится в JSONL).

Мы переходим на **artifact-first** подход: источник истины для следующих шагов — финальный артефакт узла, а вся история уточнений — в возобновляемой reviewer-сессии.

Дополнительно, Workflow Tree (Project Manager) должен быть устойчив к “пауze/выключение компьютера” на любом под-этапе шага:
- незаполненная анкета должна быть доступна после перезапуска;
- начатая reviewer-сессия должна быть доступна для resume;
- текущий артефакт шага должен быть доступен для просмотра и как источник входа для следующих шагов.

---

## 2. Goals

- Узел/шаг `Description` в дереве — **раскрываемый шаг** (треугольник), который содержит ветку документов/сессий.
- Пока шаг `Description` **в работе**, в ветке доступны актуальные промежуточные сущности (анкета, сессии).
- После завершения шага в ветке остаются **только**:
  - финальный артефакт `Final_Description.md`;
  - resume-сессия Reviewer.
- Следующие этапы (virtual simulation / diagrams / etc.) получают на вход **финальный артефакт** (`Final_Description.md`), а не анкету/черновик.
- При `Edit` раннего узла downstream-узлы помечаются как `OUTDATED` и подлежат пересборке.

Примечание: подход “`Step` как раскрываемый узел → ветка актуальных артефактов/сессий” применяется **ко всем шагам Workflow Tree**. `Description` — просто самый сложный и показательный пример (анкета → draft → reviewer → final).

---

## 3. Non-Goals

- Не делаем “триггеры” по ключевым словам (approve/ok/утверждаю) для кураторов/сборщиков.
- Не дублируем Q/A в `questionnaire.md` как обязательный слой данных.
- Не развиваем новые Gemini-specific continuity/rollover эвристики до появления надёжной telemetry remaining context window (пауза расширения, не bugfix).
- Не пытаемся “сохранить все исторические артефакты в ветке узла”: промежуточные документы могут существовать на диске, но в дереве остаются только актуальные для текущего состояния шага.

---

## 4. Key Decisions (approved)

1) **Храним только финальный артефакт** в узле `description`.
2) Reviewer-сессии с resume поддерживаются для **Claude/Codex/Gemini**; для Gemini дальнейшее развитие механики временно поставлено на паузу до внедрения telemetry remaining context window.
3) Источник истины истории — **unified session JSONL** (в `.codeai-hub/sessions/...`).
   - анти-регрессия: storage истории должен быть привязан к workspace пер-сессионно, иначе после рестарта Core (особенно из другого workspace) диалог может стать пустым (см. `doc/SolidWorks-Flow/SessionContinuity/SessionContinuity.md`).
4) Финальный артефакт шага `Description` — файл `Final_Description.md`:
   - создаётся/перезаписывается Reviewer-агентом;
   - после появления `Final_Description.md` промежуточный `description.md` больше не нужен для Flow (допускается удаление).
5) Reviewer-сессия стартует **автоматически** после того, как появился первый `description.md` (draft) от Description Agent.
6) Сессия `Description Agent` — `one-shot/no-resume`: после финального ответа становится terminal/read-only; input не unlock.

---

## 5. Data Model

### 5.1 Node composition (conceptual UI)

`Description Step/Node` — раскрываемый шаг, который отображает под-ветку “актуальных сущностей”:
- `questionnaire.md` (пока draft не создан)
- `Description <Provider>` (one-shot/no-resume; terminal/read-only после финального ответа)
- `description.md` (draft; существует между Description Agent и Reviewer)
- `Reviewer <Provider>` (resume; основная долговременная сессия шага)
- `Final_Description.md` (финальный артефакт; источник истины для downstream шагов)

### 5.2 `SessionRef` (для resume)

Минимальная структура ссылки на возобновляемую сессию:

- `providerId`: `claudeCodeCli` | `codexCli` | `geminiCli`
- `providerSessionId`: строка (provider-native id; используется для resume)
- `jsonlPath`: абсолютный путь к unified session JSONL

Примечание: `jsonlPath` не должен быть “вводимой пользователем” строкой — он вычисляется детерминированно из `providerId + providerSessionId + workspaceSlug`.
Дополнение: `SessionRef` — техническая мета‑информация, которая хранится в метаданных шага/состоянии (например, `description-step.json`) и не должна попадать в `Final_Description.md`.

### 5.3 Session JSONL location

Unified session storage хранит события в:
- `~/.codeai-hub/sessions/<workspaceSlug>/<providerId>/<sanitizedProviderSessionId>.jsonl`

Где `sanitizedProviderSessionId` нормализован под безопасный slug (см. `@codeai-hub/unified-session/sanitizeWorkspaceSlug`).

### 5.4 Artifacts (paths)

Рекомендуемая (целевaя) структура для шага `description` в workspace артефактах:
- Анкета (всегда доступна во время работы шага): `.codeai-hub/<workspaceSlug>/description/questionnaire.md`
- Draft (временный файл между Description Agent и Reviewer): `.codeai-hub/<workspaceSlug>/description/description.md`
- Финальный артефакт (источник истины): `.codeai-hub/<workspaceSlug>/description/Final_Description.md`

Правило: как только появился `Final_Description.md`, downstream шаги должны читать **только его**.
Дополнение (важно): сущность `runs` удаляется из проекта.
- Повторные попытки выполняются через `Edit Step` (обсуждение правок в сессии + перезапись текущего артефакта).
- После появления `Final_Description.md` система может удалить `description.md`, чтобы не оставлять “ложный” source-of-truth на диске.

---

## 6. Flows

### 6.1 Start Description (persisted questionnaire)

1) Пользователь открывает узел `Description` в Workflow Tree.
2) Core/Project Manager обеспечивает наличие `.codeai-hub/<workspaceSlug>/description/questionnaire.md`.
3) В дереве `Description` появляется дочерний узел `questionnaire.md`, который можно открыть/редактировать.

Цель: даже если пользователь закрыл компьютер, при следующем запуске Project Manager анкета открывается и продолжается с места остановки.

### 6.2 Build Draft Description (one-shot, no-resume, no questions)

1) Пользователь заполняет `questionnaire.md`.
2) `Description Agent` получает только пути (path-first):
   - questionnaire path
   - description template path
   - target output path
3) Агент **не задаёт вопросы**, а пишет `description.md` по target path.

Результат: `description.md` (черновой, но структурированный).

UI следствие: сразу после старта сессии появляется дочерний узел `Description <Provider>` (one-shot/no-resume).
Контракт lock: после финального ответа `Description <Provider>` input не unlock; эта сессия остаётся read-only до автоперехода в Reviewer.

### 6.3 Auto-start Reviewer + produce Final_Description.md

1) Как только `description.md` (draft) появился, система автоматически создаёт сессию Reviewer (Claude/Codex/Gemini) и фиксирует `SessionRef`.
2) В ветке `Description` сессия Description Agent заменяется на `Reviewer <Provider>` (описательный/черновой агент больше не является “активной” сессией шага).
3) Reviewer читает `description.md`, задаёт вопросы пользователю и пишет первую версию `Final_Description.md`.
4) Как только появился `Final_Description.md`:
   - в ветке `Description` точка `description.md` заменяется на `Final_Description.md`;
   - `questionnaire.md` перестаёт быть необходимой частью Flow (может быть скрыт/удалён из ветки);
   - шаг `Description` может быть переведён в `DONE` (при условии, что финал принят пользователем).

Результат шага: `Final_Description.md` + `Reviewer <Provider>`.

### 6.4 Edit Description Step (resume Reviewer)

1) Пользователь кликает `Reviewer <Provider>` (resume).
2) Обсуждает правки.
3) Reviewer пишет новую ревизию `Final_Description.md`.
4) Все downstream-узлы помечаются `OUTDATED`.

---

## 7. Implications for UI

### 7.1 Step UI rendering

- Шаг `Description` отображается как **треугольник** (узел с веткой).
- Цвет треугольника:
  - `TODO` → серый
  - `IN_PROGRESS` → оранжевый
  - `DONE` → зелёный

### 7.2 Branch content rules

- Ветка `Description` показывает **только актуальные** сущности шага (без вложенных подпапок/цепочек).
- Клик по артефакту открывает **встроенный viewer** Project Manager (панель Artifacts).
- Клик по строке `Session` создаёт/возобновляет сессию по persisted координатам (providerId + providerSessionId) и открывает полный диалог в панели Sessions.
- Для `Description <Provider>` (one-shot/no-resume) клик открывает только read-only историю без возобновления ввода.
- UI не показывает `Session Continuity` / `handoff chains` в дереве: это инфраструктура ядра и не является частью UX ветки шага.

Правила состава ветки:
- Пока `Description` в работе, ветка содержит “актуальные на сейчас” документы/сессии (см. 6.1–6.3).
- После появления `Final_Description.md` в ветке остаются **ровно две строки**:
  - `Final_Description.md`
  - `Reviewer <Provider>`

- Промежуточные сущности отображаются только до появления `Final_Description.md`:
  - `description.md` показываем только пока финал не создан
  - `Description <Provider>` (terminal/read-only) показываем только пока не создана `Reviewer <Provider>`

- UI должен явно предупреждать:
  - “Изменения в этом узле могут сделать последующие узлы устаревшими (OUTDATED).”

---

## 8. Implications for Core

- Core должен уметь:
  - гарантировать наличие `questionnaire.md` для шага `Description` при старте/открытии шага;
  - хранить `SessionRef` активной resume-сессии (`Reviewer`) рядом с состоянием шага, чтобы Project Manager мог возобновлять сессию после перезапуска;
  - маркировать `Description Agent` как `no_resume` (terminal/read-only после финального ответа);
  - резюмировать сессию по `providerId + providerSessionId` (уже есть `resumeSession` для поддерживаемых провайдеров);
  - помечать downstream узлы как `OUTDATED` при изменении артефакта раннего узла.
  - автоматически запускать Reviewer-сессию после появления `description.md` и переключать “active session” в состоянии шага.
  - поддерживать “handoff” для долгих reviewer-сессий (авто-отчёт по порогу remaining% из настроек per-provider; default 30% — см. `doc/SolidWorks-Flow/SessionContinuity/SessionContinuity.md`).

---

## 9. Deferred / Open Questions

- Цвета/отображение статусов `BLOCKED`, `ERROR`, `OUTDATED` в дереве (кроме TODO/IN_PROGRESS/DONE) — отложено.

---

## 10. Migration Notes

- “Questionnaire Curator” становится опциональным и не является механизмом повышения качества артефакта.
- Повышение качества делается через последовательность:
  - `questionnaire.md` → one-shot/no-resume `description.md` → auto reviewer (resume) → `Final_Description.md`.
