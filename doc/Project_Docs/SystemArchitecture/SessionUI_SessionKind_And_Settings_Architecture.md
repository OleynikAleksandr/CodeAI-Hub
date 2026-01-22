# Session UI — sessionKind в SessionTabs и Settings для Project Manager (Architecture)

**Status:** Approved
**Updated:** 2026-01-22
**Owner:** Oleksandr

---

## 1. Проблема

### 1.1 Неверное имя вкладки сессии
В Session UI вкладка сессии отображается как `Description Codex`, даже когда это Reviewer.

**Ожидание:** вкладка должна показывать `Reviewer Codex`.

### 1.2 Неверная модель/Reasoning в StatusPanel (Project Manager)
В StatusPanel отображается `GPT 5.2 Codex (medium)`, несмотря на то, что в Settings для Codex выбран `gpt-5.2 (high)`.

**Важно:** объекты (узлы дерева/артефакты/сессии) могли быть созданы до правок, но UI обязан отображать корректные значения при возобновлении/гидрации.

---

## 2. Root cause (почему так происходит)

### 2.1 Несогласованность источников данных (workflow snapshot vs session list)
В UI используются два потока данных:

1) **Workflow state snapshot** — данные для дерева стадий (например, Description). В snapshot есть `sessionKind`, поэтому дерево умеет отличать Reviewer/Collector.
2) **Session list / session events** — данные для SessionTabs и UI snapshots сессии. Эти данные приходят из Core через Remote Bridge.

Сейчас SessionTabs опирается на `session.sessionKind`, но если его нет — делает fallback на `session.stage`.

- При отсутствии `sessionKind` вкладка на description-stage будет выглядеть как `Description ...`.

### 2.2 Core теряет runSlug при создании сессии (Remote Bridge)
Project Manager отправляет `runSlug` при resume (например, `"reviewer"`), но Core Remote Bridge не пробрасывает `runSlug` в `SessionRequestHandler.handleCreate()`.

Итог:
- даже если UI правильно определил reviewer в дереве,
- Core создаёт сессию без `runSlug`,
- сериализует её как обычную `stage="description"` сессию,
- вкладка получает только stage и показывает `Description ...`.

### 2.3 Project Manager не загружает settings
`useSettingsState()` читает настройки через VS Code webview messaging (`vscode.postMessage`).

В Project Manager (CEF) `vscode` — no-op, поэтому settings не загружаются из `~/.codeai-hub/settings/settings.json` и остаются дефолтными.

Итог:
- `defaultModel = DEFAULT_CODEX_MODEL_ID ("gpt-5.2-codex")`
- `reasoning = DEFAULT_CODEX_REASONING_LEVEL ("medium")`

поэтому StatusPanel показывает `GPT 5.2 Codex (medium)`.

---

## 3. Цели

1) SessionTabs должен корректно показывать `Reviewer`/`Agent` для description-stage сессий (включая resume старых сессий).
2) Project Manager должен получать реальные Settings и отображать актуальные model/reasoning в StatusPanel.

---

## 4. Решение (предлагаемая реализация)

### 4.1 Session metadata: runSlug end-to-end
Минимальная и достаточная мета для корректного label:
- `stage` + `runSlug`.

Изменения:
- **Core Remote Bridge** должен принимать `runSlug` в `session:create` и пробрасывать в `SessionRequestHandler.handleCreate(..., context)`.
- **Core сериализация** должна включать `runSlug` в payload сессии (как часть serialized session), чтобы UI мог:
  - либо вычислить `sessionKind` локально,
  - либо сразу строить label по `runSlug`.

UI логика label:
- если `session.sessionKind` есть → использовать
- иначе, если `stage === "description"`:
  - `runSlug === "reviewer"` → `Reviewer`
  - иначе → `Agent` (collector)

### 4.2 Settings для Project Manager через Core Remote Bridge
Нужен канал загрузки settings через Core WebSocket, чтобы он работал в CEF.

Контракт (минимум):
- запрос: `settings:load`
- ответ: `settings:loaded` + RawSettingsSnapshot (из `~/.codeai-hub/settings/settings.json`)

Где читать файл:
- в Core (Node runtime) по `config.claudeSettingsPath` (это `~/.codeai-hub/settings/settings.json` либо legacy path).

UI слой:
- в Project Manager добавить state/hook для settings, который слушает `settings:loaded` и отдаёт settings в Session UI snapshot builder.

---

## 5. Критерии приемки

1) При клике по узлу reviewer session в дереве Project Manager вкладка показывает `Reviewer Codex`.
2) StatusPanel в Project Manager показывает `gpt-5.2 (high)` при соответствующих настройках в `~/.codeai-hub/settings/settings.json`.
3) При недоступных settings отображается честный fallback (провайдер/unknown), но не «ложные» дефолты.
