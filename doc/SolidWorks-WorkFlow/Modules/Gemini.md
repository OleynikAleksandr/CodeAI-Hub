# Gemini Provider Module — Module (SSOT)

## Назначение
Провайдерный модуль Gemini для Core: запуск CLI/SDK, one-shot turns, базовая интеграция с workflow.

## Где живёт код
- `packages/Gemini_Module/`
- Usage-limits facade for Gemini lives in Core: `packages/core/src/provider-usage-limits/providers/gemini/gemini-usage-limits-facade.ts` (shared cluster, see `packages/core/src/provider-usage-limits/`).

## Messaging cluster
- `packages/Gemini_Module/src/messaging/message-processor.ts` — thin façade: `createAccumulator`, `handleEvent`, `finalize`.
- `packages/Gemini_Module/src/messaging/gemini-stream-event-router.ts` — dispatch по Gemini stream event types и error normalization.
- `packages/Gemini_Module/src/messaging/gemini-assistant-event-normalizer.ts` — assistant chunks, source-first thinking messages и flush по `finished` boundaries.
- `packages/Gemini_Module/src/messaging/thought-translator-service.ts` — compatibility re-export старого имени поверх adapter class.
- `packages/Gemini_Module/src/messaging/gemini-system-event-normalizer.ts` — tool/system/warning events без смешивания с assistant сегментами.

## Runtime cluster
- `packages/Gemini_Module/src/runtime/cli-bridge.ts` — runtime bridge loader and compatibility entrypoint; root/core resolution now delegates to `cli-bridge-root-resolver.ts`.
- `packages/Gemini_Module/src/runtime/cli-bridge-module-loader.ts` — module loading and compatibility validation helper shared by `cli-bridge.ts` and `gemini-installer.ts`.
- `packages/Gemini_Module/src/runtime/cli-bridge-root-resolver.ts` — CLI/Core package root candidate scanning and version resolution helper.
- Gemini runtime bridge must support both the legacy `dist/src/config/*` CLI layout and the modern bundle-only global `@google/gemini-cli@0.36.x` layout; safe compatibility settings loading reads `~/.gemini/settings.json` plus `<workspace>/.gemini/settings.json` directly instead of importing bundle chunks with runtime side effects.
- Installed Gemini provider bundles are self-contained at runtime: `scripts/build-gemini-module.sh` vendors `@codeai-hub/translation` into the provider install root so `dist/index.js` can resolve the shared package outside the workspace tree.

## Installer cluster
- `packages/Gemini_Module/src/installer/gemini-installer.ts` — bridge/install orchestrator facade for package preparation and recovery.
- `packages/Gemini_Module/src/installer/gemini-package-manager.ts` — package install/update/recovery helper owned by the installer boundary.

## Инварианты
- Lifecycle обязателен: `turn_started` → `turn_completed|turn_failed`.
- Любые auth/quota ошибки не должны оставлять UI в stuck working.
- Provider event order не симметричен другим модулям: `Gemini` может эмитить `token_usage` раньше `turn_completed`, поэтому usage не считается признаком завершения turn-а.
- Для flow/document continuity `token_usage` используется только как вход в post-turn arbitration; Core не имеет права запускать rollover до фактического `turn_completed`.
- Если provider отдал несколько assistant segments в одном turn-е, модуль обязан флашить их по реальным `finished` boundaries и не дублировать финальным aggregate block, когда segmented history уже была сохранена.
- Gemini thoughts сначала emit-ятся в source form и сохраняются в canonical history без ожидания перевода; если translation overlay позже готов, UI получает `localizedContent` patch и обновляет уже существующее сообщение по тому же `messageId`.
- Переведённые Gemini thoughts не должны выглядеть как отдельный provider role в UI: текущий продуктовый контракт хранит visible path как `assistant` + `tag: "thinking"`; `thinkingDisplaySyncEnabled` — это только presentation toggle (`Thinking in dialog`), поэтому source history и overlay persistence продолжаются даже когда Session UI скрывает видимую плашку.
- Видимость решается на emission time и фиксируется на persisted `SessionMessage` через `visibilityAtEmission`. Hidden Gemini thinking не попадает в Core-owned translation queue, а re-enable `Thinking in dialog` внутри long-running session работает forward-only: только thought-сообщения, emit-нутые после включения, становятся видимыми и переводимыми; ранее скрытые плашки остаются скрытыми.
- Язык видимых Gemini thoughts определяется Core-threaded `messagesForTheUserLanguage` из `~/.codeai-hub/settings/settings.json`; при `en` overlay translation hop пропускается и в bubble остаётся оригинальный provider text.
- Для Gemini assistant output из leg, который породил `tool_call_request`, считается progress/status output, а не terminal answer всей chain; terminal completion может подтверждаться только output-ом terminal leg без новых tool requests.
- Для Gemini перевод больше не является blocking prerequisite для flush/reply ordering: turn finalization не ждёт overlay translation, а late translation patch только дообогащает уже materialized сообщение.
- Для Gemini `thinking` входит в effective model identity: одинаковый base model с разным `thinkingLevel` считается разным `modelId`, и UI/runtime не должны восстанавливать этот уровень по локальной догадке.
- Gemini runtime не имеет права владеть next-turn identity отдельно от Core: единственный source of truth для следующего turn остаётся `~/.codeai-hub/settings/settings.json`, а provider получает уже вычисленную effective identity через applied turn config.
- Если Gemini stream завис после `model_info`, partial text или другого промежуточного progress event и больше не отдаёт terminal event, stalled-turn watchdog обязан завершить turn контролируемой recoverable ошибкой вместо вечного `working`; для nested `post_tool` legs используется более длинное Gemini-specific окно, чем для initial leg, но отсутствие terminal-leg answer всё равно остаётся failure.
- `sdk-gemini-*.jsonl` остаётся диагностическим/raw session логом; exact provider-applied model/thinking при аудите нужно подтверждать по Gemini raw session/stream traces, а не по отдельным normalized `provider_feedback` записям.
- `formatGeminiStreamErrorMessage()` остаётся единым formatter-ом для nested Gemini stream payload errors, чтобы router и тесты не расходились по тексту ошибок.
- Installed Gemini bundles must be runnable after deployment without relying on the repo workspace `node_modules`; any shared runtime dependency required by the provider must be copied into the bundle root by the build script.
- Gemini runtime compatibility must not depend on importing CLI bundle chunks into the Core process: bundle-side effects can register conflicting telemetry globals, so provider bootstrap may read Gemini settings from files but must keep module execution limited to the core runtime exports that are required for session startup.
- Gemini post-tool leg contract: output from a leg that already produced `tool_call_request` is progress/status output, not terminal completion proof; terminal completion may be confirmed only by the terminal leg without new tool requests.
- Gemini stalled-turn contract: if the stream stalls after `model_info`, partial text, or other intermediate progress output and never reaches a terminal event, the watchdog must end the turn with a recoverable failure instead of a silent infinite working state; nested `post_tool` legs use a longer Gemini-specific watchdog window than the initial leg.
- **Stop Abort + Resume (1.2.7, see SystemArchitecture Invariant 24).** `GeminiSessionLifecycle.closeSession` in `packages/Gemini_Module/src/session/gemini-session-lifecycle.ts` MUST NOT call `session.client.resetChat()` on Stop. On the Gemini CLI Core side that call materializes a new empty `GeminiChat` against the same `Config.sessionId` and writes a new empty chat file under `~/.gemini/tmp/<projectSlug>/chats/`, orphaning the prior chat-file history. Permitted close steps are `abortController.abort()` to cancel the active turn plus `sessionStore.removeSession` for our own bookkeeping. The pre-stop chat file must remain intact on disk so `gemini --resume <providerSessionId>` can reload it on the next turn. The provider declares `capabilities.requiresPostStopResume = true` in `provider-descriptor-factory.ts`; Core's `SessionProviderBindingService.invalidateProviderBinding` persists the live `providerSessionId` before invalidation, and `SessionRequestHandlerStopRebind.performRebind` threads it back through `resolveProviderSessionId` as `requestedProviderSessionId`. `GeminiProviderAdapter.resumeSession` forwards it as `argv.resume` via `gemini-session-settings-resolver.ts`, and Gemini CLI Core loads the prior chat file back with Description Agent system instruction and prior dialog. Without this contract, Stop → Continue leaves Gemini with an empty context and agents forget the original workflow.
- **Thinking-level whitelist parity (see SystemArchitecture Invariant 27).** `settings.json` is re-normalized by two independent layers: the extension-side `parseSettingsSnapshot` on save, and the Core-side `SettingsRequestHandler.handleLoad` on PM / websocket load. Today Core's `handleLoad` spreads Gemini `thinkingLevelByModel` unfiltered (no per-level whitelist), but the Claude branch next to it DOES carry a hardcoded whitelist + legacy anchor table in `packages/core/src/remote-bridge/handlers/settings-request-handler-claude-thinking.ts` — and that duplicate was the exact cause of the 1.1.998 `xhigh` regression (Core silently rewrote `xhigh` back to `medium` on PM boot). If we ever add a Gemini-side `settings-request-handler-gemini-thinking.ts` sibling with its own hardcoded `GEMINI_THINKING_LEVELS`, it MUST be kept in lockstep with: `src/types/gemini-model-registry.ts` + `packages/core/src/config/provider-defaults-resolver.ts` (`resolveGeminiThinkingFromSettings`) + `src/extension-module/settings/gemini-settings.ts`. Otherwise a new thinking level accepted by the Settings UI will be silently reverted to the Core default on the next PM boot.

## Связанные контракты
- Shared runtime translation: `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
- Effective model identity/settings: `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
- Workspace/lock: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Dialog routing: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- Session continuity: `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
- Thought translation: `doc/SolidWorks-WorkFlow/Contracts/Gemini_ThoughtTranslation.md`
