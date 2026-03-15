# Gemini Dialog Segmentation Architecture

**Status:** Proposed
**Date:** 2026-03-15
**Owner:** Oleksandr

---

## 1. Problem

`Gemini` в raw SDK feedback отдаёт несколько отдельных assistant-replies внутри одного пользовательского turn-а, но в нашей Session UI они схлопываются в один большой assistant block в конце turn-а.

Это подтверждено двумя логами:

- raw SDK log: `/Users/oleksandroliinyk/.codeai-hub/logs/gemini/sdk-gemini-04519f8d-7c0f-4f91-8ce9-24f44e0b775e.jsonl`
- unified dialog/session log: `/Users/oleksandroliinyk/.codeai-hub/sessions/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub-gemini/geminiCli/gemini-061f230f-f52d-402c-b655-0203f6c2ddae-description.jsonl`

Симптом: в raw SDK log видны повторяющиеся последовательности `content -> finished`, а в unified session log все эти `content`-последовательности превращаются в один `assistant` message на turn.

---

## 2. Root Cause

Проблема находится не в UI renderer и не в websocket transport, а внутри `Gemini_Module`.

### 2.1 Где именно ломается сегментация

1. `GeminiMessageProcessor` на `content` event только накапливает текст в `accumulator.responseChunks`, но не эмитит dialog-message:
   - `packages/Gemini_Module/src/messaging/message-processor.ts`
2. `finished` event сейчас только записывает `usageMetadata` и не делает flush накопленного assistant текста:
   - `packages/Gemini_Module/src/messaging/message-processor.ts`
3. `GeminiSessionManager.sendMessage()` после полного завершения `processTurns()` публикует ровно один `assistant` event с `result.text.trim()`:
   - `packages/Gemini_Module/src/session/gemini-session-manager.ts`
4. `processTurns()` дополнительно склеивает текст между nested turn-ами после tool calls:
   - `responseText += nested.text`
   - `packages/Gemini_Module/src/session/gemini-session-manager.ts`

Итог: даже если Gemini фактически выдал несколько отдельных ответов, наша текущая модель данных сохраняет их как один финальный assistant blob.

### 2.2 Почему `thinking` виден отдельно, а `assistant` нет

`thinking` уже проходит через отдельный immediate path: `emitDialogMessage(session, "thinking", ...)`.

`assistant` path так не работает: для него есть только buffered accumulation и один final emit в конце turn-а.

---

## 3. Target Behavior

Session UI должна показывать assistant-replies `Gemini` по тем же логическим сегментам, по которым они приходят в raw SDK feedback.

Для первой версии достаточно следующего правила:

- накапливать `content` chunks до ближайшего `finished`
- на `finished` публиковать один `dialog_message(role="assistant")`
- затем очищать текущий content-buffer

Это даст последовательность assistant messages, близкую к тому, что реально видно в SDK feedback, без token-by-token noise.

---

## 4. Proposed Solution

### 4.1 Message processor

В `GeminiMessageProcessor` разделить два понятия:

- `currentAssistantChunks`: текущий незавершённый assistant segment
- `finalResponseText`: агрегированный текст для compat/fallback

На `content`:

- писать chunk в `currentAssistantChunks`
- при необходимости сохранять его и в compat aggregate

На `finished`:

- если `currentAssistantChunks` не пусты, собрать их в один текст
- вызвать `emitDialogMessage(session, "assistant", text, promptId)`
- очистить `currentAssistantChunks`
- обновить `usageMetadata`

### 4.2 Session manager

В `GeminiSessionManager.sendMessage()` убрать обязательный final single-block publish.

Новый контракт:

- если по turn-у уже были streamed assistant segments, не эмитить ещё один общий `assistant` block
- если streamed assistant segments не было, оставить текущий final assistant emit как fallback

### 4.3 Tool-call recursion

`processTurns()` может продолжать агрегировать `responseText` для fallback/debug/reporting, но этот aggregate не должен быть единственным источником dialog history.

Dialog history должна заполняться через segment-flush path, а не через final joined text.

---

## 5. Files In Scope

Основной минимальный scope:

- `packages/Gemini_Module/src/messaging/message-processor.ts`
- `packages/Gemini_Module/src/session/gemini-session-manager.ts`
- `packages/Gemini_Module/src/messaging/message-processor.test.ts`
- `packages/Gemini_Module/src/session/gemini-session-manager.test.ts`

Опционально, если понадобится helper extraction:

- новый микро-helper внутри `packages/Gemini_Module/src/messaging/`

---

## 6. Non-Goals

- Не менять transport/websocket replay path.
- Не менять Session UI renderer.
- Не вводить token-by-token streaming в UI.
- Не переписывать unified session storage contract для всех провайдеров.

---

## 7. Verification

Минимальная проверка:

1. `Gemini` raw SDK emits multiple `content -> finished` groups.
2. Unified session log сохраняет несколько отдельных `assistant` messages вместо одного final blob.
3. `thinking` path не регрессирует.
4. `turn_completed`, `token_usage`, `usage_limits` продолжают приходить как раньше.

Таргетные команды:

- `npm run build --workspace @codeai-hub/gemini-module`
- `npm run build --workspace @codeai-hub/core`
- targeted tests для `Gemini_Module`

---

## 8. Decision

Рекомендуемое решение: segment-flush на `finished` + final assistant fallback only when no streamed segments were emitted.

Это минимальное изменение, которое:

- устраняет схлопывание реплик,
- сохраняет текущий transport/UI contract,
- не требует переписывать остальную provider pipeline архитектуру.
