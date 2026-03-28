# Gemini Provider Module — Module (SSOT)

## Назначение
Провайдерный модуль Gemini для Core: запуск CLI/SDK, one-shot turns, базовая интеграция с workflow.

## Где живёт код
- `packages/Gemini_Module/`

## Messaging cluster
- `packages/Gemini_Module/src/messaging/message-processor.ts` — thin façade: `createAccumulator`, `handleEvent`, `finalize`.
- `packages/Gemini_Module/src/messaging/gemini-stream-event-router.ts` — dispatch по Gemini stream event types и error normalization.
- `packages/Gemini_Module/src/messaging/gemini-assistant-event-normalizer.ts` — assistant chunks, translated thoughts и flush по `finished` boundaries.
- `packages/Gemini_Module/src/messaging/gemini-system-event-normalizer.ts` — tool/system/warning events без смешивания с assistant сегментами.

## Инварианты
- Lifecycle обязателен: `turn_started` → `turn_completed|turn_failed`.
- Любые auth/quota ошибки не должны оставлять UI в stuck working.
- Provider event order не симметричен другим модулям: `Gemini` может эмитить `token_usage` раньше `turn_completed`, поэтому usage не считается признаком завершения turn-а.
- Для flow/document continuity `token_usage` используется только как вход в post-turn arbitration; Core не имеет права запускать rollover до фактического `turn_completed`.
- Если provider отдал несколько assistant segments в одном turn-е, модуль обязан флашить их по реальным `finished` boundaries и не дублировать финальным aggregate block, когда segmented history уже была сохранена.
- Переведённые Gemini thoughts не должны выглядеть как отдельный provider role в UI: текущий продуктовый контракт хранит их как `assistant` + `tag: "thinking"` и показывает как видимые tagged assistant messages.
- `formatGeminiStreamErrorMessage()` остаётся единым formatter-ом для nested Gemini stream payload errors, чтобы router и тесты не расходились по тексту ошибок.

## Связанные контракты
- Workspace/lock: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Dialog routing: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- Session continuity: `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
- Thought translation: `doc/SolidWorks-WorkFlow/Contracts/Gemini_ThoughtTranslation.md`
