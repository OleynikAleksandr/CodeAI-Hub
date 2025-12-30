# Codex: скрытие native reasoning и вывод RU summary через Structured Outputs

**Date:** 2025-12-27
**Status:** Verified
**Scope:** Codex provider module, Core RemoteBridge, UI (без изменения UI-лейблов)

---

## 1) Problem Statement

Сейчас для провайдера Codex в UI приходит `ThreadItem.type = "reasoning"` как `dialog_message` с `role = "thinking"`.
Мы также добавили RU summary через Structured Outputs, но в некоторых flow summary отсутствует (кастомные схемы), а native reasoning был скрыт.

Требование:
- **Internal reasoning Codex остаётся включённым** (качество ответа сохраняем).
- **Native reasoning показываем в UI** как baseline thinking.
- Дополнительно показываем **русскоязычный Thinking-summary**, полностью контролируемый контрактом.
- Summary должен быть **максимально близок к native reasoning по содержанию и объёму** (без chain-of-thought).
- **Один turn** (никаких дополнительных запросов/turn'ов).
- **Стриминг ответа ассистента должен сохраниться**.
- Thinking-плашка в UI должна появляться первой и может быть визуально «пустой»; native reasoning и RU summary приходят позже.
- При сбое генерации/парсинга summary — **оставляем только native thinking**.
- UI-лейбл остаётся **"Thinking"**.

---

## 2) Key Idea

Используем **Structured Outputs** в Codex (CLI `--output-schema` через SDK) так, чтобы модель возвращала **структурированный JSON**, содержащий:
- `answer` — основной ответ ассистента (Markdown-строка), который мы будем **стримить** в UI;
- `reasoning_summary_ru` — RU summary для thinking (не chain-of-thought), максимально близкий к native reasoning по смыслу и объёму.

При этом:
- native reasoning (`item.type="reasoning"`) эмитим как `thinking` (delta-стрим);
- UI получает обычный поток `assistant_chunk` из **извлечённого** `answer` во время стриминга JSON;
- `reasoning_summary_ru` показываем отдельным `dialog_message(role="thinking")` когда он станет доступен.
- Для custom schema (например Idea Collector) также поддерживаем `reasoning_summary_ru`: summary извлекается даже при нестандартных полях основного ответа.

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

### 3.2 Формат summary (актуальный)
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
- Native reasoning приходит стримом и мержится в ту же thinking-карточку.
- Когда станет доступен `reasoning_summary_ru` — отправляем его отдельным `dialog_message(role="thinking")`. UI уже умеет мержить consecutive thinking messages.

---

## 6) Failure Modes

- Если structured JSON не распарсился полностью:
  - ассистентский стриминг стараемся продолжать через best-effort extraction `answer`.
  - thinking summary не показываем (native thinking остаётся).

- Если `reasoning_summary_ru` пустой/отсутствует:
  - thinking summary не показываем (native thinking остаётся).

---

## 7) Implementation Touchpoints

- `packages/Codex_Module/src/types/index.ts`
  - расширить `CodexTurnOptions`, чтобы поддерживать `outputSchema?: unknown` (используется патчем SDK).

- `packages/Codex_Module/src/messaging/message-processor.ts`
  - эмитить native reasoning (`item.type="reasoning"`) как `thinking` с delta-стримом.
  - включать `outputSchema` для пользовательских turn'ов.
  - префиксовать prompt блоком инструкций structured output, чтобы `reasoning_summary_ru` был непустым (если это возможно).
  - добавить потоковый извлекатель `answer` + финальный парсер JSON.
  - эмитить placeholder thinking на старте turn.
- `packages/Codex_Module/src/messaging/structured-output-stream-controller.ts`
  - извлекать `reasoning_summary_ru` и для custom structured outputs (Idea Collector, etc.).

- `packages/Codex_Module/src/sdk/codex-sdk-patches.ts`
  - оставить текущую поддержку `outputSchema` (уже есть), при необходимости расширить совместимость типов.

---

## 8) Decisions (2025-12-27)

1) `answer` остаётся Markdown-строкой внутри JSON; стриминг берём из best-effort извлечения.
2) `reasoning_summary_ru` — свободный `string` без лимита длины, с требованием максимальной близости к native reasoning (без chain-of-thought).
3) Placeholder thinking допускается через невидимый символ (например ZWSP).

---

## 9) Smoke/UX проверка (2025-12-27)

### Статус
- Проверка выполнена, результат **PASS**.
- `reasoning_summary_ru` приходит на русском и по смыслу/объёму близок к native reasoning (в безопасном виде).
- `answer` стримится корректно; native reasoning в UI не отображается.

### Пример подтверждения
- Лог: `~/.codex/sessions/2025/12/27/rollout-2025-12-27T19-32-15-019b6115-2830-7292-be87-4a077a2ec882.jsonl`.

### Рекомендации
- Прогнать дополнительные сложные сценарии, чтобы проверить устойчивость формата summary.
