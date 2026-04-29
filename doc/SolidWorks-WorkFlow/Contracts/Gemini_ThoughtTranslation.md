# Контракт Gemini Thought Translation

**Статус:** Implemented on `main`  
**Обновлено:** 2026-04-13  
**Owner:** Oleksandr + Codex  
**Validated on:** `main` (`v1.1.854`)

---

## Status checkpoint

- `Gemini` thoughts больше не переводятся внутри blocking provider pipeline: Gemini emit-ит source text сразу, а Core делает async translation overlay поверх уже сохранённого сообщения.
- Текущая default engine path использует бесплатный Google Translate HTTP endpoint `translate.googleapis.com`, но уже через `TranslationFacade` + `GoogleTranslateClient`, а не как отдельный provider-only helper. Реальный engine для конкретного turn'а задаётся вызывающей стороной через `translationEngineId` параметр adapter'а; `"google-gtx"` остаётся только fallback'ом.
- Направление перевода больше не жёстко зашито в Gemini layer: target language передаётся через `targetLanguage` параметр adapter'а. После UI/Reasoning translation split (см. `Modules/Localization.md` §3.5 и `EffectiveModelIdentity_And_Settings_SSOT.md`) канонический источник — Core-threaded `reasoningLanguage`; `messagesForTheUserLanguage` остаётся как deprecated legacy alias с тем же resolved value до завершения миграции provider adapters.
- Переведённая мысль больше не хранится как второй dialog message; она persist-ится как sidecar overlay (`*.translations.jsonl`) и попадает в UI как `localizedContent` patch для уже существующего `assistant` + `tag: "thinking"` сообщения.
- UI рендерит это сообщение как обычный видимый assistant bubble с label `Gemini · Thinking`, используя `localizedContent ?? content`.
- Реализация намеренно маленькая: без rewrite native transcript, без retry queue, без user-locale negotiation внутри Gemini provider и без generic translation module в Core UI layer.

Этот документ является implemented SSOT для текущего поведения. Он заменяет старые planning-материалы, которые сначала описывали эту же feature через `Flash-Lite`, затем через Google Translate migration plan, а затем как спекулятивный глобальный localization layer. Shared runtime translation module теперь живёт в `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md` как отдельный reusable boundary, а Gemini держит только provider-local adapter и session wiring.

---

## 1. Scope

Этот контракт описывает один конкретный runtime path:

1. Gemini SDK эмитит `Thought` event.
2. Gemini provider формирует source thinking text и сразу эмитит его как `assistant` + `tag: "thinking"` с stable `messageId`.
3. Core асинхронно переводит эту мысль через shared translation facade, сохраняет sidecar overlay и рассылает translation patch.
4. UI показывает уже существующее "thinking" assistant message и при готовности overlay заменяет только отображаемый текст.

Контракт относится только к Gemini.

---

## 2. Non-goals

- Нет перевода для Claude или Codex provider streams.
- Нет generic translation service в `packages/core/src/translation/`; shared translation module живёт в `packages/translation/`.
- Нет перевода user prompts перед отправкой в providers.
- Нет persistent cache, который переписывает native thought transcript.
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
- Adapter отправляет один `TranslationFacade.translate()` request с `category: "reasoning"`, `providerId: "gemini"`, `engineId = caller-provided translationEngineId ?? "google-gtx"`, `sourceLanguage: "en"`, `targetLanguage = caller-provided ISO code (нормализованный к нижнему регистру; `en` короткозамыкается в `null` без перевода)` и `timeoutMs: 3000`.
- Shared facade normalizes request, resolves engine, and delegates to `GoogleTranslateClient`.
- `GoogleTranslateClient` вызывает free Google Translate endpoint `translate.googleapis.com`.
- Если shared translation возвращает non-translated/fallback/skipped result, adapter возвращает `null`, а caller falls back to original formatted thought text.
- Installed Gemini provider bundles vendor the shared `@codeai-hub/translation` package into their own runtime root during build, so the adapter remains resolvable after deployment without depending on the workspace `node_modules` tree.

### 3.2. Обработка Gemini messages

Code owner:
- `packages/Gemini_Module/src/messaging/message-processor.ts`

`handleThoughtEvent()` теперь не ждёт translation completion.

Вместо этого он:
- логирует incoming thought summary;
- форматирует source thought text;
- сразу эмитит `dialog_message` с:
  - `role: "assistant"`
  - source content
  - `tag: "thinking"`
- сохраняет stable `messageId`, чтобы Core позже мог дообогатить это же сообщение translation overlay patch-ем.

`handleFinishedEvent()` больше не обязан удерживать финальный assistant reply ради Gemini thought translation.
Turn finalization зависит только от реального provider lifecycle, а не от async overlay translation completion.

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
- source Gemini thought приходит как обычный `dialog_message`;
- `payload.tag` сохраняется;
- `SessionMessage` поддерживает optional `tag?: string` и optional `localizedContent?: string`;
- native сообщение добавляется в session memory и unified-session storage как канонический transcript;
- после async translation Core пишет sidecar `message-translation` запись и broadcast-ит patch event для того же `messageId`.

Каноническая storage shape:

```json
{
  "role": "assistant",
  "content": "Original Gemini thought text",
  "tag": "thinking",
  "localizedContent": "Переведённый текст мысли Gemini"
}
```

Переведённая мысль не хранится как вторая role, но хранится как sidecar translation artifact, ссылающийся на исходное сообщение по `messageId`.

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
   Если translation engine падает, уходит в timeout или возвращает invalid data, пользователь всё равно получает original thought text, потому что source message уже был сохранён и показан до overlay path.

2. Feature не должна требовать provider credentials.
   Thought translation не может зависеть от Gemini API keys, Flash models или любого paid translation layer.

3. Ordering больше не зависит от translation completion.
   Final assistant segment не должен искусственно ждать overlay translation только ради визуального порядка.

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
  - `packages/core/src/session-translation/session-translation-facade.ts`
  - `packages/core/src/session-translation/session-message-localization-projector.ts`
  - `packages/core/src/unified-session/storage.ts`
  - `packages/unified-session/src/session-translation-overlay-store.ts`
- UI labeling/rendering:
  - `src/types/session.ts`
  - `src/client/ui/src/session/dialog-panel-message-utils.ts`
  - `src/client/ui/src/session/dialog-panel.tsx`

---

## 6. Verification notes

Текущая проверка кода подтверждает:
- Google Translate endpoint реально используется в реализации.
- Никакого `Flash-Lite` translation path в runtime code больше нет.
- `tag: "thinking"` сохраняется end-to-end, а translated overlay больше не требует второй dialog message записи.
- UI rendering path соответствует tagged assistant contract.

Текущий gap:
- provider-level failure path shared translation engine по-прежнему покрыт в основном интеграционными messaging tests; отдельный Core overlay contract теперь дополнительно закрыт `session-message-localization-projector.test.ts`.
