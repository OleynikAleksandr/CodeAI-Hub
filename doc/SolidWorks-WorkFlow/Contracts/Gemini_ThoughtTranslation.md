# Контракт Gemini Thought Translation

**Статус:** Implemented on `main`  
**Обновлено:** 2026-03-31  
**Owner:** Oleksandr + Codex  
**Validated on:** `main` (`v1.1.854`)

---

## Status checkpoint

- `Gemini` thoughts переводятся внутри Gemini provider pipeline, но execution path теперь проходит через Gemini-local adapter поверх shared runtime translation package `@codeai-hub/translation`.
- Текущая engine path использует бесплатный Google Translate HTTP endpoint `translate.googleapis.com`, но уже через `TranslationFacade` + `GoogleTranslateClient`, а не как отдельный provider-only helper.
- Направление перевода фиксировано: English thought text -> Russian output.
- Переведённая мысль persist-ится и broadcast-ится как `role: "assistant"` с `tag: "thinking"`.
- UI рендерит это сообщение как обычный видимый assistant bubble с label `Gemini · Thinking`.
- Реализация намеренно маленькая: без cache, без batching, без retry queue, без user-locale negotiation и без generic translation module в Core.

Этот документ является implemented SSOT для текущего поведения. Он заменяет старые planning-материалы, которые сначала описывали эту же feature через `Flash-Lite`, затем через Google Translate migration plan, а затем как спекулятивный глобальный localization layer. Shared runtime translation module теперь живёт в `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md` как отдельный reusable boundary, а Gemini держит только provider-local adapter и session wiring.

---

## 1. Scope

Этот контракт описывает один конкретный runtime path:

1. Gemini SDK эмитит `Thought` event.
2. CodeAI Hub переводит эту мысль на русский язык через shared translation facade.
3. Core сохраняет и повторно рассылает переведённый текст как tagged assistant message.
4. UI показывает его как видимое "thinking" assistant message.

Контракт относится только к Gemini.

---

## 2. Non-goals

- Нет перевода для Claude или Codex provider streams.
- Нет generic translation service в `packages/core/src/translation/`; shared translation module живёт в `packages/translation/`.
- Нет перевода user prompts перед отправкой в providers.
- Нет persistent cache для translated thoughts.
- Нет multi-language support, управляемого user settings.
- Нет отдельной translated записи `role: "thinking"` в JSONL.

---

## 3. Runtime pipeline

### 3.1. Реализация translator

Code owners:
- `packages/Gemini_Module/src/messaging/gemini-thought-translation-adapter.ts`
- `packages/Gemini_Module/src/messaging/thought-translator-service.ts` (compatibility re-export)
- `packages/translation/src/translation-facade.ts`
- `packages/translation/src/google-translate-client.ts`

Текущее поведение:
- Adapter строит input как `subject: description`, если есть `subject`, иначе использует `description`.
- Adapter отправляет один `TranslationFacade.translate()` request с `category: "reasoning"`, `providerId: "gemini"`, `engineId: "google-gtx"`, `sourceLanguage: "en"`, `targetLanguage: "ru"` и timeout `3000ms`.
- Shared facade normalizes request, resolves engine, and delegates to `GoogleTranslateClient`.
- `GoogleTranslateClient` вызывает free Google Translate endpoint `translate.googleapis.com`.
- Если shared translation возвращает non-translated/fallback/skipped result, adapter возвращает `null`, а caller falls back to original formatted thought text.
- Installed Gemini provider bundles vendor the shared `@codeai-hub/translation` package into their own runtime root during build, so the adapter remains resolvable after deployment without depending on the workspace `node_modules` tree.

### 3.2. Обработка Gemini messages

Code owner:
- `packages/Gemini_Module/src/messaging/message-processor.ts`

`handleThoughtEvent()` не пишет raw Gemini thought в видимую translated lane.

Вместо этого он:
- логирует incoming thought summary;
- форматирует original English fallback text;
- запускает async translation через `ThoughtTranslatorService` compatibility surface, backed by `GeminiThoughtTranslationAdapter`;
- сохраняет promise в `pendingTranslations`;
- при success эмитит `dialog_message` с:
  - `role: "assistant"`
  - translated Russian content
  - `tag: "thinking"`
- при failure эмитит original English formatted text с тем же `tag: "thinking"`.

Далее `handleFinishedEvent()`:
- собирает все `pendingTranslations`, относящиеся к текущему finished leg;
- если `pendingTranslations` пуст, эмитит финальный assistant response segment сразу;
- иначе ставит финальный assistant response segment в serial flush chain;
- этот chain ждёт `Promise.allSettled(...)` по всем pending thought translations данного leg;
- только после этого эмитит реальный assistant response segment.

Это удерживает translated thoughts перед final assistant reply для того же finished segment.

Дополнительный runtime contract:
- message processor обязан иметь явный `drain` pending Gemini dialog emits;
- turn нельзя считать локально завершённым, пока этот `drain` не завершился;
- это предотвращает late translated `thinking` и final assistant segment от выхода за границу turn finalization/fallback accounting.

### 3.3. Wiring в Session manager

Code owners:
- `packages/Gemini_Module/src/session/gemini-session-manager.ts`
- `packages/Gemini_Module/src/session/gemini-turn-runner.ts`

`GeminiSessionManager` создаёт один экземпляр `GeminiThoughtTranslationAdapter` на manager и передаёт его в `GeminiTurnRunner`.

`GeminiTurnRunner` инжектит этот adapter в каждый свежий экземпляр `GeminiMessageProcessor`, создаваемый на turn.

`thought-translator-service.ts` остаётся compatibility re-export для исторических импортов, но больше не владеет translation logic.

Для этой feature нет отдельного translation bootstrap, API key resolution или model selection layer.

### 3.4. Core persistence и broadcast

Code owners:
- `packages/core/src/session-manager/index.ts`
- `packages/core/src/remote-bridge/handlers/session-request-handler.ts`
- `packages/core/src/remote-bridge/handlers/session-provider-event-router.ts`

Контракт на границе Core:
- translated Gemini thought приходит как `dialog_message`;
- `payload.tag` сохраняется;
- `SessionMessage` поддерживает optional `tag?: string`;
- сообщение добавляется в session memory и unified-session storage с сохранением этого tag;
- то же tagged message broadcast-ится в client/UI.

Каноническая storage shape:

```json
{
  "role": "assistant",
  "content": "Переведённый текст мысли Gemini",
  "tag": "thinking"
}
```

Переведённая мысль не хранится как вторая role или как параллельный translation artifact.

### 3.5. UI rendering

Code owners:
- `src/types/session.ts`
- `src/client/ui/src/session/dialog-panel-message-utils.ts`
- `src/client/ui/src/session/dialog-panel.tsx`

UI contract:
- `SessionMessage` включает optional `tag?: string`.
- Если `message.role === "assistant"` и `message.tag === "thinking"`, label становится `Gemini · Thinking` (или `Thinking`, если нет provider label).
- Tagged assistant-thought messages рендерятся через `StandardMessage`.
- Collapsible `ThinkingMessage` остаётся зарезервированным для настоящих `role: "thinking"` messages.

Результат:
- Переведённые Gemini thoughts по умолчанию видимы в основном dialog flow.
- Исторические или provider-native raw `thinking` messages по-прежнему используют старый collapsible UI path.

---

## 4. Invariants

1. Failure перевода является non-blocking.
   Если Google Translate падает, уходит в timeout или возвращает invalid data, пользователь всё равно получает original English thought text.

2. Feature не должна требовать provider credentials.
   Thought translation не может зависеть от Gemini API keys, Flash models или любого paid translation layer.

3. Ordering является частью контракта.
   Final assistant segment для того же finished stream не должен обгонять unresolved translated thoughts из этого же segment.

4. Pending translation flush должен быть наблюдаемым для runtime finalization.
   Если turn дошёл до `finished`, но translated thoughts ещё не дофлашены, provider layer обязан дождаться `drain` до принятия решения о segmented-vs-fallback final emit.

5. Видимая translated thought должна оставаться семантически помеченной.
   `tag: "thinking"` является единственным поддерживаемым semantic marker для этого path.

6. Feature намеренно не является generic localization subsystem.
   Любой будущий переход к shared runtime localization будет новым architecture scope, а не подразумеваемым расширением этого контракта.

---

## 5. Code map

- Gemini translation adapter and compatibility surface:
  - `packages/Gemini_Module/src/messaging/gemini-thought-translation-adapter.ts`
  - `packages/Gemini_Module/src/messaging/thought-translator-service.ts`
- Shared translation engine:
  - `packages/translation/src/translation-facade.ts`
  - `packages/translation/src/google-translate-client.ts`
- Gemini event buffering и tagged emit:
  - `packages/Gemini_Module/src/messaging/message-processor.ts`
- Gemini session wiring:
  - `packages/Gemini_Module/src/session/gemini-session-manager.ts`
  - `packages/Gemini_Module/src/session/gemini-turn-runner.ts`
- Core storage/broadcast boundary:
  - `packages/core/src/session-manager/index.ts`
  - `packages/core/src/remote-bridge/handlers/session-request-handler.ts`
  - `packages/core/src/remote-bridge/handlers/session-provider-event-router.ts`
- UI labeling/rendering:
  - `src/types/session.ts`
  - `src/client/ui/src/session/dialog-panel-message-utils.ts`
  - `src/client/ui/src/session/dialog-panel.tsx`

---

## 6. Verification notes

Текущая проверка кода подтверждает:
- Google Translate endpoint реально используется в реализации.
- Никакого `Flash-Lite` translation path в runtime code больше нет.
- `tag: "thinking"` сохраняется end-to-end.
- UI rendering path соответствует tagged assistant contract.

Текущий gap:
- нет standalone unit test, который прямо бьёт failure path shared translation engine/adapter; текущая coverage фиксирует end-to-end Gemini visible contract через message processor и session manager tests.
