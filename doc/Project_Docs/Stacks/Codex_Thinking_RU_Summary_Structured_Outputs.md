# Codex: Thinking в UI и Structured Outputs (deprecated)

**Date:** 2025-12-27
**Last updated:** 2026-01-13
**Status:** Deprecated
**Scope:** Codex provider module + UI

---

## TL;DR

- В текущем MVP thinking в UI берётся из native событий провайдера (например, `item.type="reasoning"` в потоке Codex) и отображается как `dialog_message(role="thinking")`.
- Structured Outputs используются для детерминированного JSON-контракта (`answer`, а в flow — также `artifacts[]`), без отдельного поля для RU thinking-summary.
- Если понадобится контролируемый summary‑слой (vNext), будет описан новым контрактом/документом без влияния на текущий MVP.

---

## Текущее поведение (MVP)

### 1) Streaming ответа

При включённом `--output-schema` модель выводит JSON.
В `packages/Codex_Module` используется best-effort извлечение значения `answer` из стрима JSON, чтобы UI продолжал получать `assistant_chunk` (вместо показа сырого JSON).

### 2) Thinking в UI

- UI может показывать placeholder thinking на `turn.started`.
- Native thinking приходит из событий провайдера и стримится как `dialog_message(role="thinking")`.
- Дополнительный summary‑слой через structured output в MVP не используется.

### 3) Финализация structured output

На `turn.completed` парсится полный JSON и публикуется structured output (минимум `answer`; для flow-агентов — также `artifacts[]`).

---

## Связанные документы

- Codex provider module: `doc/Project_Docs/Stacks/Codex_SDK_Module.md`
- Контракты/UX thinking: `doc/Knowledge/Контролируемое отображение размышлений в Codex.md`
