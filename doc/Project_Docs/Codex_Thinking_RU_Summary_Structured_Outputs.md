# Codex: скрытие native reasoning и вывод RU summary через Structured Outputs

**Date:** 2025-12-27
**Status:** Approved
**Scope:** Codex provider module, Core RemoteBridge, UI (без изменения UI-лейблов)

---

## 1) Problem Statement

Сейчас для провайдера Codex мы транслируем `ThreadItem.type = "reasoning"` в UI как `dialog_message` с `role = "thinking"`.
Это приводит к тому, что пользователь видит англоязычные/служебные размышления (native reasoning), которые:
- не контролируются по форме и содержанию,
- приходят фрагментами (мы их мерджим в один блок),
- могут ухудшать UX (лишний шум, утечки лишних деталей).

Требование:
- **Internal reasoning Codex остаётся включённым** (качество ответа сохраняем).
- **Native reasoning в UI не показываем вообще.**
- Вместо него показываем **короткое русскоязычное Thinking-summary**, полностью контролируемое контрактом.
- **Один turn** (никаких дополнительных запросов/turn'ов).
- **Стриминг ответа ассистента должен сохраниться**.
- Thinking-плашка в UI должна появляться первой и может быть визуально «пустой»; текст RU summary может прийти позже.
- При сбое генерации/парсинга summary — **не показывать ничего** в thinking.
- UI-лейбл остаётся **"Thinking"**.

---

## 2) Key Idea

Используем **Structured Outputs** в Codex (CLI `--output-schema` через SDK) так, чтобы модель возвращала **структурированный JSON**, содержащий:
- `answer` — основной ответ ассистента (Markdown-строка), который мы будем **стримить** в UI;
- `reasoning_summary_ru` — короткое RU summary для thinking (не chain-of-thought).

При этом:
- native reasoning (`item.type="reasoning"`) игнорируем;
- UI получает обычный поток `assistant_chunk` из **извлечённого** `answer` во время стриминга JSON;
- `reasoning_summary_ru` показываем отдельным `dialog_message(role="thinking")` когда он станет доступен.

---

## 3) Output Contract (JSON Schema)

### 3.1 Поля
- `answer` (string, required)
  - Основной ответ для пользователя.
  - Допускается Markdown.
  - Должен быть самодостаточным и не ссылаться на reasoning.

- `reasoning_summary_ru` (string, required; допускается пустая строка)
  - Только русский язык.
  - Максимально близко по содержанию и объёму к native reasoning summary (без раскрытия chain-of-thought).
  - Цель: передать ключевые соображения модели без пошагового внутреннего мышления.
  - Если summary отсутствует — вернуть пустую строку (требование схемы).
  - Запрещено:
    - пошаговое внутреннее мышление,
    - реконструкция chain-of-thought,
    - отладочные рассуждения,
    - код/псевдокод/формулы,
    - повтор ответа.

### 3.2 Формат summary (предлагаемый)
Свободный `string` без жёстких лимитов по длине. Требования:
- сохранять структуру и порядок ключевых пунктов,
- не опускать значимые соображения,
- не добавлять новых фактов,
- избегать chain-of-thought и технических подробностей.

Форма может быть пунктами или абзацами — главное, чтобы по смыслу и объёму summary был максимально близок к native reasoning summary (в безопасном виде).

---

## 4) Streaming Strategy (как сохранить стриминг ответа)

### 4.1 Проблема
`--output-schema` заставляет модель выводить JSON. Если просто показывать его — UI увидит сырой JSON вместо нормального текста.

### 4.2 Решение
В Codex message-processor добавляется потоковый парсер, который:
- на `item.updated` для `agent_message` принимает накапливающийся текст JSON,
- инкрементально извлекает значение поля `answer` (как строку),
- эмитит `stream_event { kind: "assistant_chunk" }` только из извлечённого `answer`.

На `item.completed`:
- парсим полный JSON,
- если `reasoning_summary_ru` валиден и непустой — эмитим `dialog_message(role="thinking")`.
- если парсинг summary не удался — ничего не эмитим в thinking.

Важно:
- сохраняем текущую модель мерджа thinking: любые куски `reasoning_summary_ru`, если будут приходить частями (редко, но возможно), объединяем в один thinking-блок так же, как сейчас UI объединяет consecutive thinking messages.

---

## 5) UX детали

- В начале turn (на `turn.started`) эмитим «плейсхолдер» thinking-сообщение (минимальный невидимый контент, например zero-width), чтобы карточка Thinking появилась первой.
- Дальше ассистент начинает стримиться сразу (из `answer`).
- Когда станет доступен `reasoning_summary_ru` — отправляем его отдельным `dialog_message(role="thinking")`. UI уже умеет мержить consecutive thinking messages.

---

## 6) Failure Modes

- Если structured JSON не распарсился полностью:
  - ассистентский стриминг стараемся продолжать через best-effort extraction `answer`.
  - thinking summary не показываем.

- Если `reasoning_summary_ru` пустой/отсутствует:
  - thinking summary не показываем (плейсхолдер остаётся визуально пустым).

---

## 7) Implementation Touchpoints

- `packages/Codex_Module/src/types/index.ts`
  - расширить `CodexTurnOptions`, чтобы поддерживать `outputSchema?: unknown` (используется патчем SDK).

- `packages/Codex_Module/src/messaging/message-processor.ts`
  - перестать эмитить native reasoning (`item.type="reasoning"`).
  - включать `outputSchema` для пользовательских turn'ов.
  - префиксовать prompt блоком инструкций structured output, чтобы `reasoning_summary_ru` был непустым (если это возможно).
  - добавить потоковый извлекатель `answer` + финальный парсер JSON.
  - эмитить placeholder thinking на старте turn.

- `packages/Codex_Module/src/sdk/codex-sdk-patches.ts`
  - оставить текущую поддержку `outputSchema` (уже есть), при необходимости расширить совместимость типов.

---

## 8) Open Questions (для апрува)

1) Ок ли, что `answer` — это Markdown-строка внутри JSON, и мы стримим её через best-effort extraction?
2) Подтвердить формат summary: `string` с 2–4 пунктами (вместо массива строк).
3) Placeholder thinking: можно ли использовать невидимый символ (ZWSP) как «пустой» контент?

---

## 9) Smoke/UX проверка (2025-12-27)

### Статус
- В этой сессии ручной запуск UI не выполнялся.
- Требуется ручная проверка в приложении (реальный Codex turn).

### Чеклист (ожидаемое поведение)
- Thinking-плашка появляется первой (placeholder `<!-- -->`).
- `answer` стримится как обычный assistant-ответ.
- Native reasoning не отображается.
- RU summary появляется в thinking позже и мержится в один блок.
- При ошибке парсинга summary thinking остаётся пустым.
