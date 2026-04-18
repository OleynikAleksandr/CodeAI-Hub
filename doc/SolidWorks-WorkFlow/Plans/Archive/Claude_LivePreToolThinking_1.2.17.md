# Claude Live Pre-Tool Thinking Fix 1.2.17 — Planning Doc

## 1. Problem

В localized Claude session pre-tool progress text может материализоваться как обычный assistant/live bubble вместо `Claude · Thinking`.

Подтвержденный сценарий:
- в `Virtual Simulation` с target language `ru` unified session JSONL сохраняет английский fragment `I've read the Final_Description.md... Let me create the directory...` как `assistant` с `tag: "live"`;
- fragment стоит между двумя `thinking` bubbles;
- fragment не проходит через thinking translation path и остаётся на английском;
- native Claude trace показывает, что этот text block идёт непосредственно перед `tool_use`, а не является финальным user-facing answer.

Это нарушает ожидаемый product contract:
- pre-tool progress text не должен выглядеть как самостоятельный ответ агента;
- такой text должен идти через `thinking` rendering/translation path;
- only real `end_turn` assistant output должен оставаться обычным assistant text.

## 2. Root Cause

### 2.1. Live text path bypasses tool-use classification

`packages/Claude_Module/src/messaging/claude-content-stream-handler.ts` обрабатывает Claude `content_block_delta/text_delta` независимо от дальнейшего исхода message и сразу эмитит live assistant fragments через `emitClaudeAssistantLiveText(...)`.

На момент этого emit router ещё не знает, завершится ли текущий Claude message как:
- `end_turn`, или
- `tool_use`

В результате pre-tool text materializes too early.

### 2.2. Existing tool-use reclassification only works on the pending path

`packages/Claude_Module/src/messaging/claude-stream-event-router.ts` уже содержит legacy `tool_use_preamble` branch:
- queued pre-tool text, дошедший до `flushPendingAssistantText(..., "tool_use_preamble")`, может быть пере-классифицирован и routed as `thinking`.

Но этот branch работает только если text не был materialized live раньше.

Когда live path уже успел выпустить assistant fragment:
- pending path bypassed,
- `tool_use_preamble` reclassification no longer owns the visible output,
- Core overlay translation не запускается, потому что сообщение persisted as assistant/live, not thinking.

### 2.3. Translation contract reinforces the leak

Core overlay translation intentionally applies only to thinking-display messages.

Значит leaked pre-tool assistant/live fragment:
- остаётся видимым как обычный assistant bubble,
- не локализуется,
- визуально ломает диалог между `Claude · Thinking` bubbles.

## 3. Solution

### 3.1. Hold potential pre-tool live text until classification is known

В Claude live text path вводим узкий hold-behavior для potential pre-tool text в localized Cyrillic-target sessions:
- если текущий text block выглядит как non-target-language preamble, он не materializes immediately as assistant/live;
- block ждёт дальнейшей классификации через follow-up stream events;
- как только становится ясно, что message идёт в `tool_use`, pre-tool text stays off the assistant/live path.

Это закрывает конкретный user-visible leak без глобального отключения Claude live text.

### 3.2. Any queued `tool_use` preamble resolves as thinking

`flushPendingAssistantText(..., "tool_use_preamble")` должен выпускать pre-tool text через `thinking` path, а не как ordinary assistant text.

Итоговый contract:
- `tool_use` preamble => `thinking`
- `end_turn` final answer => ordinary assistant

### 3.3. Regression guards

Нужны regression tests на три случая:
- localized Claude pre-tool text no longer surfaces as assistant/live when turn resolves to `tool_use`;
- the same content surfaces through `thinking` path;
- ordinary `end_turn` assistant text keeps the existing assistant contract.

## 4. Files / Structure

### Claude provider runtime
- `packages/Claude_Module/src/messaging/claude-content-stream-handler.ts`
- `packages/Claude_Module/src/messaging/claude-stream-event-router.ts`

### Tests
- `packages/Claude_Module/src/messaging/claude-stream-event-router.live-text.test.ts`
- `packages/Claude_Module/src/messaging/message-processor.translation.test.ts`

## 5. Contracts to update

- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Modules/Claude.md`

## 6. Release target

- Release: `1.2.17`
- Scope: bugfix release
- Validation owner: user retest on new VSIX build

## 7. Out of scope

- Generic cross-provider ephemeral preview protocol for unclassified live text
- Expansion of the heuristic beyond the currently confirmed localized Cyrillic pre-tool leak
- UI redesign of thinking/live bubbles
