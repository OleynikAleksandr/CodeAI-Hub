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

## Runtime cluster
- `packages/Gemini_Module/src/runtime/cli-bridge.ts` — runtime bridge loader and compatibility entrypoint; root/core resolution now delegates to `cli-bridge-root-resolver.ts`.
- `packages/Gemini_Module/src/runtime/cli-bridge-module-loader.ts` — module loading and compatibility validation helper shared by `cli-bridge.ts` and `gemini-installer.ts`.
- `packages/Gemini_Module/src/runtime/cli-bridge-root-resolver.ts` — CLI/Core package root candidate scanning and version resolution helper.

## Installer cluster
- `packages/Gemini_Module/src/installer/gemini-installer.ts` — bridge/install orchestrator facade for package preparation and recovery.
- `packages/Gemini_Module/src/installer/gemini-package-manager.ts` — package install/update/recovery helper owned by the installer boundary.

## Инварианты
- Lifecycle обязателен: `turn_started` → `turn_completed|turn_failed`.
- Любые auth/quota ошибки не должны оставлять UI в stuck working.
- Provider event order не симметричен другим модулям: `Gemini` может эмитить `token_usage` раньше `turn_completed`, поэтому usage не считается признаком завершения turn-а.
- Для flow/document continuity `token_usage` используется только как вход в post-turn arbitration; Core не имеет права запускать rollover до фактического `turn_completed`.
- Если provider отдал несколько assistant segments в одном turn-е, модуль обязан флашить их по реальным `finished` boundaries и не дублировать финальным aggregate block, когда segmented history уже была сохранена.
- Переведённые Gemini thoughts не должны выглядеть как отдельный provider role в UI: текущий продуктовый контракт хранит их как `assistant` + `tag: "thinking"` и показывает как видимые tagged assistant messages.
- Для Gemini assistant output из leg, который породил `tool_call_request`, считается progress/status output, а не terminal answer всей chain; terminal completion может подтверждаться только output-ом terminal leg без новых tool requests.
- Для Gemini deferred flush translated thoughts и segmented final assistant output должен быть полностью дожат до завершения `runTurn()`: fallback aggregate emit допустим только если после этого flush real non-thinking assistant segment так и не materialize-ился.
- Для Gemini `thinking` входит в effective model identity: одинаковый base model с разным `thinkingLevel` считается разным `modelId`, и UI/runtime не должны восстанавливать этот уровень по локальной догадке.
- Gemini runtime не имеет права владеть next-turn identity отдельно от Core: единственный source of truth для следующего turn остаётся `~/.codeai-hub/settings/settings.json`, а provider получает уже вычисленную effective identity через applied turn config.
- Если Gemini stream завис после `model_info`, partial text или другого промежуточного progress event и больше не отдаёт terminal event, stalled-turn watchdog обязан завершить turn контролируемой recoverable ошибкой вместо вечного `working`; для nested `post_tool` legs используется более длинное Gemini-specific окно, чем для initial leg, но отсутствие terminal-leg answer всё равно остаётся failure.
- `sdk-gemini-*.jsonl` остаётся диагностическим/raw session логом; exact provider-applied model/thinking при аудите нужно подтверждать по Gemini raw session/stream traces, а не по отдельным normalized `provider_feedback` записям.
- `formatGeminiStreamErrorMessage()` остаётся единым formatter-ом для nested Gemini stream payload errors, чтобы router и тесты не расходились по тексту ошибок.

## Связанные контракты
- Workspace/lock: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Dialog routing: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- Session continuity: `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
- Thought translation: `doc/SolidWorks-WorkFlow/Contracts/Gemini_ThoughtTranslation.md`
