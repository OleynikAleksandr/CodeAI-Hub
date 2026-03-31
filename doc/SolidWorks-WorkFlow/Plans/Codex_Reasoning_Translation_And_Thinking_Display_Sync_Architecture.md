# Codex Reasoning Translation And Thinking Display Sync Architecture

**Status:** Draft / Approved for execution
**Created:** 2026-03-31
**Owner:** Oleksandr + Codex
**Scope:** Подключить перевод reasoning-потока Codex к shared translation module и убрать текущую hidden-UX схему с отдельной collapsible thinking-плашкой для нового visible path

---

## 1. Problem

Сейчас Codex reasoning живёт по отдельному пути, который отличается от Gemini не только форматом данных, но и пользовательским восприятием.

Текущий путь Codex:

- `packages/Codex_Module/src/messaging/codex-stream-event-router.ts` принимает `reasoning` items из SDK stream.
- `packages/Codex_Module/src/messaging/codex-reasoning-streams.ts` аккумулирует source deltas по `item.id`.
- `packages/Codex_Module/src/messaging/codex-stream-event-router.ts` сейчас эмитит `dialog_message` с `role: "thinking"`.
- `packages/Codex_Module/src/messaging/codex-message-finish-handler.ts` на `turn_started` добавляет synthetic placeholder `<!-- -->`.
- `packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.ts` сохраняет это как отдельную session message role `thinking`.
- `src/client/ui/src/session/dialog-panel.tsx` рендерит `role: "thinking"` в отдельной collapsible плашке с треугольником.

Итог:

- reasoning Codex скрыт по умолчанию;
- пользователь должен раскрывать треугольник;
- путь визуально не совпадает с Gemini;
- новый shared translation module уже есть, но Codex ещё не использует его как обычный visible assistant-thinking path.

Gemini уже показывает нужный target shape:

- thought summary проходит через shared translation facade;
- UI получает `role: "assistant"` + `tag: "thinking"`;
- reasoning выглядит как обычный assistant bubble, только с label `Thinking`.

Нужно привести Codex к той же визуальной и contract-схеме.

---

## 2. What Must Change

### 2.1. Translation boundary

Codex должен получить provider-local adapter поверх `@codeai-hub/translation`.

Роль adapter-а:

- принять Codex reasoning text;
- собрать provider-neutral translation request;
- перевести English reasoning на Russian;
- вернуть translated text или безопасный fallback;
- не владеть UI, session storage или identity semantics.

Shared module остаётся engine-neutral:

- сегодня может использовать Google GTX;
- позже может быть заменён на другой дешёвый translation backend;
- provider modules не должны знать, каким именно backend-ом пользуется facade.

### 2.2. Visible thinking contract

Для нового Codex visible path reasoning должно эмититься как:

- `role: "assistant"`
- `tag: "thinking"`

Это даёт одинаковую визуальную схему с Gemini:

- обычная assistant bubble;
- дополнительная label `Thinking`;
- без collapsible triangle в новом path.

Legacy `role: "thinking"` не исчезает полностью:

- он остаётся для старых transcript-ов;
- он остаётся как compatibility path для raw/archived data;
- он не должен быть основным user-facing path для Codex reasoning.

### 2.3. Display sync control

На перспективу нужна отдельная presentation flag для Codex и Gemini:

- `thinking display sync` / `thinking visibility sync`
- default: `on`
- scope: provider presentation only

Если флаг выключен:

- provider может продолжать reason-logging и internal buffering;
- visible thought bubble не эмитится;
- effective model identity и reasoning/thinking settings не меняются;
- translation engine selection не меняется.

Это не settings для модели.
Это settings для того, показывать ли user-visible syncing of reasoning.

---

## 3. Current Implementation Snapshot

### 3.1. Codex routing today

`packages/Codex_Module/src/messaging/codex-stream-event-router.ts`

- `item.type === "reasoning"` идёт в `handleReasoningItem()`;
- `item.updated` и `item.completed` проходят через `CodexReasoningStreams.append/complete()`;
- результат эмитится как `emitDialogMessage(session, "thinking", delta, item.id)`.

`packages/Codex_Module/src/messaging/codex-message-finish-handler.ts`

- `handleTurnStarted()` эмитит `THINKING_PLACEHOLDER`;
- `clearSessionState()` очищает reasoning streams при завершении turn;
- lifecycle и visible reasoning сейчас переплетены.

`packages/Codex_Module/src/messaging/codex-session-event-emitter.ts`

- `emitDialogMessage()` умеет только `assistant | thinking | user`;
- `tag` не поддерживается;
- поэтому Codex не может выразить Gemini-like visible thinking contract без расширения emission shape.

### 3.2. Core persistence today

`packages/core/src/remote-bridge/handlers/session-provider-event-router.ts`

- `dialog_message` проходит в Core append flow;
- `role: "thinking"` сохраняется как отдельная session role;
- `role: "assistant"` с `tag: "thinking"` уже поддерживается и сохраняется корректно.

`packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.ts`

- сохраняет `tag`;
- broadcasts both session and dialog messages;
- append path already supports the target contract without schema changes.

### 3.3. UI today

`src/client/ui/src/session/dialog-panel-message-utils.ts`

- `assistant + tag: "thinking"` уже получает label `Provider · Thinking`;
- `role: "thinking"` получает bare `Thinking`.

`src/client/ui/src/session/dialog-panel.tsx`

- `role: "thinking"` рендерится через collapsible `ThinkingMessage`;
- standard visible bubble path уже есть для assistant messages.

Это значит:

- новый Codex path можно привести к Gemini-like UX без изобретения нового UI component;
- основной фокус работы лежит в Codex routing/emission layer и shared translation adapter.

---

## 4. Target Architecture

### 4.1. Codex adapter

Новый provider-local adapter должен жить рядом с Codex messaging cluster.

Предпочтительная форма:

- `packages/Codex_Module/src/messaging/codex-thought-translation-adapter.ts`

Ответственность:

- normalizing reasoning text;
- building `TranslationRequest`;
- calling shared `TranslationFacade`;
- returning translated Russian text or `null` on non-blocking failure.

Request shape:

- `sourceLanguage: "en"`
- `targetLanguage: "ru"`
- `category: "reasoning"`
- `providerId: "codex"`

### 4.2. Routing semantics

Codex reasoning items should be treated as a visible assistant-thinking stream, not as a hidden provider role.

Target output:

- source reasoning deltas still come from `CodexReasoningStreams`;
- translated output is emitted as visible assistant message with `tag: "thinking"`;
- lifecycle turn events remain separate;
- the UI standard bubble path is reused.

### 4.3. Placeholder removal

`THINKING_PLACEHOLDER` is a legacy hidden-UX artifact.

For the new Codex visible path:

- `turn_started` must remain lifecycle-only;
- it must not be the user-facing trigger for a collapsible thinking bubble;
- visible reasoning should come from actual translated reasoning content.

### 4.4. Future display sync gate

Introduce a provider-level presentation policy, carried alongside applied turn config or equivalent provider runtime envelope.

Suggested semantics:

- `thinkingDisplayEnabled: boolean`
- `true` by default
- if `false`, provider may skip visible thinking emit entirely
- policy does not alter effective identity

Codex and Gemini should consume the same shape, even if their internal routing differs.

---

## 5. Code Boundaries

### 5.1. Codex cluster

- `packages/Codex_Module/src/messaging/codex-reasoning-streams.ts`
  - source delta buffering and merge logic
- `packages/Codex_Module/src/messaging/codex-stream-event-router.ts`
  - reasoning event dispatch and visible thinking emission
- `packages/Codex_Module/src/messaging/codex-message-finish-handler.ts`
  - turn lifecycle and placeholder cleanup
- `packages/Codex_Module/src/messaging/codex-session-event-emitter.ts`
  - dialog message emission shape, including `tag`

### 5.2. Shared translation module

- `packages/translation/src/translation-facade.ts`
- `packages/translation/src/translation-contract.ts`
- `packages/translation/src/google-translate-client.ts`

### 5.3. Core bridge

- `packages/core/src/remote-bridge/handlers/session-provider-event-router.ts`
- `packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.ts`
- `packages/core/src/remote-bridge/types.ts`

### 5.4. UI / transcript rendering

- `src/client/ui/src/session/dialog-panel-message-utils.ts`
- `src/client/ui/src/session/dialog-panel.tsx`
- `src/client/ui/src/session/virtual-conversation.tsx`

### 5.5. Gemini reference path

- `packages/Gemini_Module/src/messaging/gemini-assistant-event-normalizer.ts`
- `packages/Gemini_Module/src/messaging/gemini-thought-translation-adapter.ts`
- `packages/Gemini_Module/src/session/gemini-turn-runner.ts`

Gemini остаётся эталоном visible thinking contract.

---

## 6. Invariants

1. Translation failure is non-blocking.
   User must still see usable content even if translation backend fails.

2. Shared translation module remains engine-neutral.
   Provider modules do not hardcode Google-specific behavior.

3. Visible Codex thinking uses `assistant + tag: "thinking"`.
   This is the canonical new path.

4. Legacy `role: "thinking"` remains compatibility-only.
   It is not the target presentation contract for new Codex reasoning.

5. Display sync is presentation-only.
   It must not mutate model identity, reasoning level, or session continuity logic.

6. The new Codex path must not reintroduce the collapsible triangle UX.
   The visible bubble path must be reused instead.

7. Gemini and Codex should share the same future display-sync semantics.
   Provider-specific routing stays local, but the policy shape stays uniform.

---

## 7. Verification Notes

Before closing this scope, the implementation should be validated with:

- targeted build of `@codeai-hub/translation`;
- targeted build of `@codeai-hub/codex-module`;
- targeted checks for Gemini messaging cluster if the display-sync gate is wired there;
- UI smoke verification that assistant-tag thinking renders as a standard visible bubble;
- release build only after docs and plan are synchronized.

---

## 8. Related Docs

- `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
- `doc/SolidWorks-WorkFlow/Modules/Codex.md`
- `doc/SolidWorks-WorkFlow/Modules/Gemini.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Contracts/Gemini_ThoughtTranslation.md`
