# System Architecture (SSOT) — SolidWorks-WorkFlow

**Scope:** каноническое описание системы CodeAI Hub целиком (уровень System).

## 0) Start here (восстановление контекста)

1. `doc/SolidWorks-WorkFlow/Docs_Index.md`
2. `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
3. `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
4. `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
5. `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
6. `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
7. `doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md`
8. `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
9. `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
10. `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
11. `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
12. `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowNavigation_SSOT.md`
13. `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
14. Provider modules: `doc/SolidWorks-WorkFlow/Modules/Claude.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/SolidWorks-WorkFlow/Modules/Gemini.md`
15. `doc/SolidWorks-WorkFlow/Modules/Localization.md`
16. `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`
17. `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`
18. `doc/SolidWorks-WorkFlow/System/Workflow_NewStep_Rollout_Guardrails.md`

## 1) Компоненты системы (верхний уровень)

- **Core Orchestrator** (Node.js сервис): бизнес‑логика, turn lifecycle, routing, continuity.
- **Core Supervisor**: управление runtime, запуск/перезапуск и version attach.
- **Project Manager (CEF UI bundle)**: Workflow Tree + Sessions/Artifacts + stage/session routing UX.
- **UI bundles**: `project-manager`, `vscode-webview`.
- **CEF Launcher**: локальный клиент для Project Manager.
- **Providers**: Claude/Codex/Gemini модули (CLI/SDK контуры).
- **Shared runtime translation module**: `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md` (package: `packages/translation/`; engine-neutral facade used by Gemini today and future localization adapters tomorrow).
- **Localization module**: `doc/SolidWorks-WorkFlow/Modules/Localization.md` (package: `packages/localization/`; owns bundled English source catalogs, glossary protection, localized bundle persistence, runtime payload contracts, and UI lookup primitives).
- **Gemini bundled runtime dependency**: installed Gemini provider bundles vendor `@codeai-hub/translation` into their own runtime root so the provider can resolve the shared translation package outside the workspace `node_modules` tree.

## 2) SSOT уровни (иерархия документов)

- System SSOT (этот файл): глобальные инварианты и карта.
- Cluster SSOT: `doc/SolidWorks-WorkFlow/Clusters/*`.
- Module SSOT: `doc/SolidWorks-WorkFlow/Modules/*`.
- Contract SSOT: `doc/SolidWorks-WorkFlow/Contracts/*` (точечные механизмы).

## 3) Глобальные инварианты (must-not-break)

1. **Snapshot-first lock contract**: состояние input определяется только snapshot‑сигналами (`turnState`, continuity lock flags и т.п.).
   - Канон: `WorkspaceRuntime.md`, `SessionUI_Behavior.md`, `SessionInputLock_SSOT_StateMachine.md`.
2. **Dialogs vs status split**: история/диалог (`dialogId`) независим от live status/usage (`sessionId`); routing обязателен после restart/reconnect.
   - Канон: `Dialogs_And_Continuity_Routing.md`.
3. **Session continuity**: rollover/handoff обязаны быть надёжны и не залипать UI в working.
   - Канон: `SessionContinuity.md`.
   - Threshold-driven continuity для flow/document nodes разрешён только на post-turn boundary: `token_usage` не является сигналом завершения turn-а и не может немедленно прерывать активный one-shot turn.
4. **Workflow navigation SSOT**: любой route в workflow stage (Toolbar/Tree/auto-select/dialog-intent) обязан синхронизировать `activeStage`; подсветка Toolbar, открытая session и header правой панели не могут расходиться.
   - Канон: `ProjectManager_WorkflowNavigation_SSOT.md`.
5. **Provider-home isolation**: provider state изолирован под `~/.codeai-hub/providers/<id>/home` (где применимо), без смешения с терминальным HOME. Для Claude этого уже недостаточно как общей формулы: CodeAI Hub-managed turns также обязаны идти в full SDK isolation mode без filesystem `CLAUDE.md` / settings discovery, иначе parent-chain от `cwd` может затащить personal memory из real home.
   - Канон: provider docs в `doc/SolidWorks-WorkFlow/Modules/*`.
6. **Response-mode diagnostics split**: shaping live Codex turn-ов (`strict` / `hybrid` / `debug_raw`) не может быть единственным местом, где существует provider output; raw provider logs остаются диагностическим SSOT до любых UI/history фильтров.
   - Канон: `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`.
7. **Provider dialog segment preservation**: если provider runtime фактически отдает несколько assistant-replies внутри одного пользовательского turn-а, provider normalization layer не имеет права схлопывать их в один post-factum blob; допустим только fallback aggregate-path, когда streamed segment boundaries не были отданы вообще.
   - Канон: `doc/SolidWorks-WorkFlow/Modules/Gemini.md`.
8. **Workspace-scoped stream replay**: stateful session signals (`token_usage`, `usage_limits`), которые могут прийти до attach/rebind workspace scope, обязаны иметь replay-safe transport path после websocket connect и после смены scope; single-shot delivery для таких сигналов недопустим.
   - Канон: `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`, `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`.
9. **Provider-order-safe continuity arbitration**: Core обязан одинаково корректно обрабатывать оба event order-а (`token_usage -> turn_completed` и `turn_completed -> token_usage`); trailing usage может завершать уже начатую post-turn arbitration, а cached usage обязан быть turn-scoped и очищаться после решения.
   - Канон: `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`, `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`.
10. **Provider failure classification before teardown**: Core обязан классифицировать provider error через `ProviderFailureClassifier` до удаления binding. Transient errors (`transient_turn_failure`) не должны удалять binding, деградировать whole provider или молча дропать user message. Retry budget ограничен (1 transient + 1 auto-resume), pending user intent имеет TTL=60s.
   - Канон: `doc/SolidWorks-WorkFlow/Contracts/ProviderFailure_Recovery_And_ProviderSwitch.md`.
11. **Provider-neutral switch transfer**: cross-provider takeover обязан использовать `unified-dialog.prompt.md` (plain `User:/Assistant:` transcript) и `provider-switch-handoff.md`, а не provider-native JSONL/rollout/SDK logs. `dialog:switch:*` protocol является единственным bridge contract для recovery и manual switch.
   - Канон: `doc/SolidWorks-WorkFlow/Contracts/ProviderFailure_Recovery_And_ProviderSwitch.md`.
12. **Quality-gate contract is workflow-critical**: локальный `pre-commit` обязан прогонять architecture gate, repo-wide `npm run lint`, `npm run check:tsprune` и staged-only formatting. Хук не имеет права форматировать весь репозиторий поверх незастейдженных изменений.
   - Канон: `.husky/pre-commit`, `doc/TODO/todo-plan.md`.
13. **Release package truthfulness**: VSIX/package surface не должен тащить repo-only workflow files и hook helpers (`.husky/**`, `.gitignore`, `GEMINI.md`, `AGENTS.md`, `doc/`, `scripts/`), если runtime не использует их напрямую.
   - Канон: `.vscodeignore`, `README.md`, `CHANGELOG.md`.
14. **Effective model identity SSOT**: `modelId` в transport/runtime/UI контракте означает полную effective model identity, а не только base model; reasoning/thinking являются частью identity, и единственным source of truth для next-turn model identity является `~/.codeai-hub/settings/settings.json`.
   - Канон: `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`, `packages/core/src/config/provider-turn-config-resolver.ts`.
15. **Provider-applied model/reasoning proof stays provider-native**: active baseline не поддерживает cross-provider normalizing contract для exact model/thinking/reasoning feedback в `sdk-*` логах; для аудита реально применённого provider state нужно опираться на provider-native runtime artifacts (`Claude` provider-home JSONL, `Codex` raw rollout `turn_context`, `Gemini` raw stream/session traces), а не на локальный outbound intent.
   - Канон: `doc/SolidWorks-WorkFlow/Modules/Claude.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/SolidWorks-WorkFlow/Modules/Gemini.md`.
16. **Localization source-copy and startup-bootstrap invariant**: product-owned localizable copy must be authored in bundled English source dictionaries, mutable bundles/glossary live only under `~/.codeai-hub/localization/`, persisted startup snapshots live under `~/.codeai-hub/localization/cache/browser-runtime-bootstrap.json`, and browser lookup must consume host-delivered bootstrap/runtime payloads instead of reading mutable localization files directly; fallback strings are last-resort bootstrap-only, and React components are not allowed to become the source of truth for localizable product copy.
   - Канон: `doc/SolidWorks-WorkFlow/Modules/Localization.md`, `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`.
17. **Explicit text-ownership invariant**: every new product-authored text surface must be classified up front as `UI Labels`, `UI Helper Text`, `Messages for the User`, `Artifacts for the User`, or `Internal Agent Instructions`. Category guessing and deferred cleanup are not acceptable.
   - Канон: `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`.
18. **Workflow artifact-language boundary**: `Artifacts for the User` may drive questionnaire/staged-artifact shell text and brief user-facing workflow chat updates, but internal workflow/provider prompt bodies remain `Internal Agent Instructions` and stay English-only.
   - Канон: `doc/SolidWorks-WorkFlow/Modules/Localization.md`, `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`.
19. **New workflow-step rollout must clone a mature reference-step contract end-to-end**: introducing a new stage is not allowed to stop at toolbar visibility, prompt wiring, or artifact creation. A supported new step must ship with synchronized stage identity, artifact paths, PM parity, localization ownership, continuity routing, handoff paths, cold-start persistence, direct regression coverage, and packaged-release validation. Partial stage shells are not acceptable.
   - Канон: `doc/SolidWorks-WorkFlow/System/Workflow_NewStep_Rollout_Guardrails.md`, `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`, `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`.

## 4) Где искать правду в коде (high-signal)

- Extension entry: `src/extension.ts`
- Core: `packages/core/`
- Provider registry façade cluster: `packages/core/src/provider-registry/`
  - `index.ts` = façade
  - `provider-installer-paths.ts`, `provider-installed-path-resolver.ts`, `provider-module-loader.ts`, `provider-descriptor-factory.ts`, `provider-usage-limits-bridge-factory.ts`, `provider-recovery-{scheduler,coordinator}.ts` = runtime internals
  - `provider-descriptor-factory.ts` now owns provider model-sync capability registration (`acceptsAppliedTurnConfig`, `appliedConfigIdentityKey`, `runtimeModelSelectionKey`, `syncsLabelFromAppliedConfig`), so adding a new provider does not require hidden hardcoded assumptions in remote-bridge/UI glue code about where effective identity lives and which field is still used as the actual runtime model selector
- Core remote bridge cluster: `packages/core/src/remote-bridge/`
  - `index.ts` = thin façade / top-level runtime bridge entrypoint
  - `remote-bridge-bootstrap.ts` = runtime service/bootstrap wiring
  - `remote-bridge-server-lifecycle.ts` = HTTP/WebSocket lifecycle ownership
  - `remote-bridge-message-router.ts` = websocket command orchestration façade; `session:stop` transport branch is registered here as the session-scoped counterpart to global runtime shutdown and intentionally stays separate from `/api/v1/shutdown`
  - `remote-bridge-session-create-router.ts` = isolated `session:create` workflow-binding helper, so create-path orchestration does not keep inflating the top-level websocket command router
  - `remote-bridge-dialog-command-router.ts`, `remote-bridge-workspace-command-router.ts` = scoped websocket command clusters
  - `handlers/session-request-handler.ts` = still-oversized orchestration root for dialog send/resume/switch paths; constructor/runtime service-graph wiring now lives in `handlers/session-request-handler-runtime{,-core,-types}.ts`, constructor-local runtime callback assembly now lives in `handlers/session-request-handler-runtime-callbacks.ts`, user-facing switch/message/delete orchestration plus rollover-send guards/logging now live in `handlers/session-request-handler-session-actions.ts`, stop-triggered fresh-provider rebind before resend now lives in `handlers/session-request-handler-stop-rebind.ts`, session-scoped stop invalidation now lives in `handlers/session-request-handler-stop-action.ts`, resume lifecycle state ownership lives in `handlers/session-request-handler-resume-lifecycle.ts`, shell/bootstrap creation path lives in `handlers/session-request-handler-session-bootstrap.ts`, workflow session creation/provider lookup glue now lives in `handlers/session-request-handler-workflow-session.ts`, create/resume/dialog-send resolution lives in `handlers/session-request-handler-session-resolution.ts`, continuity-root resolution and legacy description-root promotion now live in `handlers/session-request-handler-continuity-root.ts`, post-turn continuity arbitration now lives in `handlers/session-request-handler-turn-arbitration.ts`, completion arbitration now lives in `handlers/session-request-handler-turn-completion.ts`, live threshold reload now lives in `handlers/session-request-handler-turn-threshold-resolver.ts`, outbound/internal send orchestration is isolated in `handlers/session-request-handler-message-dispatch.ts`, adapter-send logging/dispatch now lives in `handlers/session-request-handler-provider-send.ts`, Core-owned next-turn applied effective model identity attachment now lives in `handlers/session-request-handler-applied-turn-config.ts`, provider-event message append and incoming payload extraction now live in `handlers/session-request-handler-event-messages.ts`, retry budget + pending-intent TTL state now lives in `handlers/session-request-handler-retry-state.ts`, dialog segment boundary/meta append and latest-segment summary dedupe live in `handlers/session-request-handler-dialog-segment-meta.ts`, and flow-node rollover/report state now lives in `handlers/session-request-handler-flow-node-{rollover,report-state}.ts`
  - `handlers/session-provider-binding-service.ts` + `session-manager/index.ts` now own the stop-invalidation seam for logical sessions: a stop path can drop the live provider binding, broadcast a `pending` binding state, and keep the logical session alive for later rebind instead of deleting it
  - `handlers/localization-bootstrap-http-handler.ts` = read-only persisted localization bootstrap snapshot delivery for Project Manager cold-start hydration before websocket settings refresh
  - `handlers/session-request-handler-applied-turn-config.ts`, `handlers/session-request-handler-message-dispatch.ts`, and `remote-bridge/types.ts` now form one provider-neutral outbound bridge contract: Core attaches one next-turn identity descriptor derived from `settings.json`; presentation/runtime-localization payload such as `thinkingDisplaySyncEnabled` and `messagesForTheUserLanguage` may travel on the same applied-config envelope, but they never participate in `modelId` computation; Codex reasoning-summary visibility is no longer carried as applied turn metadata and instead follows provider-home `model_reasoning_summary`; outbound `session:model:update` normalizes effective identity so public `modelId` is always the runtime identity, while `baseModelId` remains optional auxiliary metadata
  - `types.ts` = thin aggregation surface for remote-bridge contracts, including the applied provider turn-config payload threaded through outbound send/switch paths
  - `types.ts` = thin aggregation surface for remote-bridge contracts
  - `session-stream-contracts.ts`, `workspace-stream-contracts.ts` = stream-scoped contract modules; `session-stream-contracts.ts` now reserves `session:stop` for logical-session stop/cancel traffic instead of reusing global runtime-control paths, and `session:model:update` is the runtime identity event that must carry the same effective `modelId` the provider will actually use on the next turn; `baseModelId` may be present only as optional auxiliary metadata
- Workspace runtime cluster: `packages/core/src/workspace-runtime/`
  - `workspace-runtime-facade.ts` = thin façade / module entrypoint
  - `workspace-runtime-session-sync.ts` = workspace selection, snapshot push, session-store sync
  - `workspace-runtime-lock-sync.ts` = lock/runtime projection and task-timer persistence
- Config cluster: `packages/core/src/config/`
  - `index.ts` = thin config façade / environment assembly entrypoint
  - `provider-settings-snapshot.ts` = persisted provider settings readers; Claude/Gemini thinking-display flags are backfilled on settings load so the on-disk snapshot stays aligned with the UI toggle, while Codex reasoning-summary visibility is now resolved through provider-home config materialization
  - `provider-defaults-resolver.ts` = provider default model/reasoning normalization
  - `provider-turn-config-resolver.ts` = Core-owned registry/resolver for next-turn Claude/Codex/Gemini effective model identity from persisted `~/.codeai-hub/settings/settings.json`; it derives `baseModelId`, effective identity descriptor, provider-specific reasoning/thinking payload, and presentation-only thinking display sync gate from one settings snapshot, while remote-bridge queries one provider-neutral `byProviderId` registry instead of growing new `if (providerId === ...)` branches; the Session UI now uses that gate only to decide whether to render thinking bubbles, not to stop JSONL/history persistence
- Project Manager UI: `src/client/project-manager/`
- Shared Session UI: `src/client/ui/src/`
- Localization package: `packages/localization/`
  - `src/localization-facade.ts` = thin public package façade
  - `src/localization-contract.ts`, `src/localization-facade.ts` = runtime payload contract plus materialized bundle resolution
  - `src/localization-materializer.ts`, `src/source-dictionary-registry.ts`, `src/glossary-*.ts`, `src/localization-*-store.ts` = source dictionaries, glossary protection, bundle persistence, metadata reuse
- Browser localization lookup: `src/client/ui/src/app-host/use-localization.ts`
  - shared browser-side localization runtime consumed by settings host and localized PM surfaces
  - `src/extension-module/message-handlers/settings-message-handler.ts` and `packages/core/src/remote-bridge/handlers/settings-request-handler.ts` now hydrate `localizationRuntime` payloads from persisted settings before sending them into the browser
  - `src/core/webview-module/webview-html-generator.ts` injects `window.__CODEAI_LOCALIZATION_BOOTSTRAP__` into Settings WebView HTML when a persisted startup snapshot exists
  - `src/client/ui/src/index.tsx` and `src/client/project-manager/index.tsx` perform pre-render localization bootstrap hydration, while `/api/v1/localization/bootstrap` feeds the Project Manager cold-start path
  - `src/client/ui/src/app-host/settings-only-host.tsx` and `src/client/project-manager/app.tsx` provide one shared `LocalizationProvider` at the app boundary; localized PM leaves consume that provider instead of loading settings locally
  - bundled English source catalogs are no longer embedded as live browser data; component fallback strings remain only as a last-resort safety path when neither persisted bootstrap snapshot nor refreshed runtime payload is available
- Provider settings UI: `src/client/ui/src/components/settings/` and `src/client/ui/src/components/settings-view.tsx`
  - the localization card now exposes engine selection through a catalog-backed selector and language selection through a searchable combobox; visible `English` maps to canonical persisted `source`
  - the Codex card now surfaces `Reasoning in dialog`, which maps to persisted `reasoningSummaryEnabled` and provider-home `model_reasoning_summary = auto|none`; the Claude card surfaces `Thinking in dialog` as a visible assistant-bubble gate, and the Gemini card keeps the same short `Thinking in dialog` copy as a presentation-only control; for Claude and Gemini the runtime still persists thinking history, while the Session UI decides whether to render it
- General Settings response mode UI: `src/client/ui/src/components/settings/general-response-mode/`
- `Settings -> General -> Core Controls` now uses a staged restart flow owned by `HomeViewMessageRouter` + `CoreProcessManager`: explicit `stop -> wait -> start`, progress/status messages posted back into the webview, and a button-local visible status surface instead of a blind fire-and-forget restart action
- Provider modules: `packages/Claude_Module/`, `packages/Codex_Module/`, `packages/Gemini_Module/`
- Claude messaging cluster: `packages/Claude_Module/src/messaging/`
  - `message-processor.ts` = thin façade / queue orchestration surface
  - `claude-stream-event-router.ts` = assistant/result/structured-output/thinking routing
  - `claude-message-finish-handler.ts` = turn lifecycle completion façade
  - `claude-usage-sync.ts`, `claude-token-usage-sync.ts` = usage-limits/context-token synchronization internals
- Codex messaging cluster: `packages/Codex_Module/src/messaging/`
  - `message-processor.ts` = thin façade / turn orchestration surface
  - `codex-applied-turn-config.ts` = applies Core-owned next-turn effective model identity onto the active thread runtime and strips internal transport metadata before SDK execution
  - `codex-thought-translation-adapter.ts` = Codex-local adapter over shared translation facade for reasoning deltas
  - `packages/Codex_Module/src/logging/session-logger.ts` + `packages/Codex_Module/src/sdk/codex-sdk-patches.ts` = отвечают за SDK diagnostics и reasoning config patching; подтверждать реально применённые model/reasoning значения нужно по raw provider rollout JSONL, а не по отдельному normalized feedback contract в `sdk-codex-*.jsonl`
  - `codex-event-stream-consumer.ts` = startup-lock / idle-pulse event stream consumer
  - `codex-stream-event-router.ts` = thread/item/assistant/structured-output routing
  - `codex-message-finish-handler.ts` = turn lifecycle completion façade
  - `structured-output-stream-controller.ts` = façade over structured output parser/state helpers
  - `structured-output-parser.ts`, `structured-output-state.ts` = prompt/schema parsing and extractor/session state internals
  - `codex-usage-sync.ts`, `codex-token-usage-sync.ts` = usage-limits/token synchronization internals
- Gemini messaging cluster: `packages/Gemini_Module/src/messaging/`
  - `message-processor.ts` = thin façade / turn event normalization entrypoint
  - `gemini-stream-event-router.ts` = event dispatch and stream-error handling
  - `gemini-assistant-event-normalizer.ts` = assistant/thinking/finished boundary normalization
  - `gemini-thought-translation-adapter.ts` = Gemini-local adapter over shared translation facade; `thought-translator-service.ts` is compatibility re-export only
  - `gemini-system-event-normalizer.ts` = tool/system/warning event normalization
  - `packages/Gemini_Module/src/logging/session-logger.ts` + `gemini-system-event-normalizer.ts` + `gemini-assistant-event-normalizer.ts` = сохраняют raw/diagnostic Gemini session artifacts; active baseline не промотирует `model_info`, `thought` или `thinkingLevel` в отдельный normalized provider-feedback contract; translated thoughts и segmented final assistant output now drain through one deferred flush boundary before runtime fallback accounting
- Gemini session façade cluster: `packages/Gemini_Module/src/session/`
  - `gemini-session-manager.ts` = façade
  - `gemini-session-bootstrapper.ts`, `gemini-session-settings-resolver.ts`, `gemini-session-store.ts`, `gemini-session-lifecycle.ts`, `gemini-turn-runner.ts`, `gemini-tool-call-orchestrator.ts` = runtime internals; bootstrap/lifecycle now keep a mutable `runtimeTurnConfig` so Core-applied model/thinking changes can retune existing Gemini sessions without re-deriving model/thinking authority from local provider settings; `gemini-turn-runner.ts` treats assistant output from tool-producing legs as progress-only output, drains deferred Gemini dialog emits before detaching segment accounting listeners, and `gemini-session-lifecycle.ts` differentiates `initial` and `post_tool` stalled watchdog windows for Gemini follow-up legs; GeminiSessionManager owns the GeminiThoughtTranslationAdapter instance directly and passes it down the turn pipeline
- Gemini provider send path: `packages/Gemini_Module/src/provider/gemini-provider-adapter.ts`
  - `gemini-applied-turn-config.ts` = reads Core-applied next-turn effective model identity for Gemini sends and stages runtime overrides before provider execution
  - `gemini-provider-adapter.ts` = consumes the shared Core-applied runtime envelope on outbound send; `gemini-session-settings-resolver.ts` now treats Core-provided model/thinking as authoritative over local snapshot values, leaving `settings.json` only as fallback for continuity/runtime defaults that are not part of the applied turn contract; stalled-turn watchdog failures are surfaced as provider `turn_failed` events and kept on the recoverable session path instead of escalating through generic provider-runtime failure recovery, while non-thinking assistant text from a leg that still emitted tool calls is no longer accepted as whole-turn completion proof
- Claude SDK send path: `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`
  - `claude-sdk-manager.ts` derives the active turn model from Core-applied turn config on send path; `handlers/session-request-handler-applied-turn-config.ts` resolves Claude `defaultModel` from the shared persisted settings snapshot before outbound send, so Claude no longer falls back to a stale process-start env alias when Settings change during a live Core session
  - CodeAI Hub-managed Claude turns now keep filesystem `settingSources` empty, which places the provider in full SDK isolation mode and blocks parent-directory `CLAUDE.md` / settings discovery from the active workspace path
  - visible Claude thinking now flows through `claude-thought-translation-adapter.ts`; Core threads `messagesForTheUserLanguage` into Claude runtime turn config, translation failures are non-blocking, and `en` keeps the upstream provider wording unchanged
  - long Claude thinking is chunked before translation so Google GTX GET-size overflow on oversized reasoning blocks does not fall back to English; after translation, the router emits the visible reasoning as several readable `tag: "thinking"` dialog chunks instead of one giant bubble
  - short assistant progress text that belongs to a Claude message ending with `stream_event.message_delta.delta.stop_reason = "tool_use"` is now buffered and localized on the user-facing path, while ordinary final assistant replies that end with `end_turn` stay on the normal untranslated assistant-output path
  - Claude thinking settings now use `thinking.enabled + effort`; Core includes `thinkingEnabled` and `reasoningEffort` in applied turn config, while the client sees enabled Claude effort through effective identities such as `sonnet reasoning:high` rather than only `thinking:on`
  - current Claude SDK semantics for `claude-opus-4-6` still keep final thought-summary verbosity provider-owned even when CodeAI Hub sends explicit `effort`, so short visible thought summaries in provider-home JSONL are not a UI truncation bug by themselves
- CEF Launcher native boundary: `packages/cef-launcher/src/launcher_handler.cc`
  - `launcher_handler_bridge_helpers.h` owns URL classification, bridge injection, data-URI creation, and browser payload serialization; `launcher_handler.cc` stays on lifecycle/orchestration, while platform-specific title/show/persist behavior remains in `platform/*/launcher_handler_*`.
- Project Manager applied-config sync:
  - `src/client/project-manager/components/sessions/use-runtime-model-sync.ts` = session label updates only from Core-confirmed runtime effective model identity events, including reasoning refresh for same-base-model turns
  - `src/client/ui/src/app-host/use-settings-models-sync.ts` = ready sessions no longer guess a new runtime identity from settings before Core confirms the applied effective model config
  - `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts` now emits `session:model:update` from the outbound applied turn-config itself for regular new turns, so PM label sync does not depend on a provider-specific `model_info` or `system` event being emitted afterward and does not reconstruct identity from split fields on the UI side
- Codex response policy runtime: `packages/Codex_Module/src/response-policy/`
- Codex thought translation and visible thinking: `packages/Codex_Module/src/messaging/codex-thought-translation-adapter.ts`, `packages/Codex_Module/src/messaging/codex-session-event-emitter.ts`, `src/client/ui/src/session/dialog-panel-message-utils.ts`
  - reasoning deltas are translated through the shared runtime translation module;
  - Core threads `messagesForTheUserLanguage` from the shared settings snapshot into Codex runtime so visible reasoning follows the selected `Messages for the User` language; `en` skips translation and preserves upstream provider wording;
  - visible output uses `role: "assistant"` with `tag: "thinking"` and the standard assistant bubble path whenever upstream Codex actually sends reasoning summaries;
  - `model_reasoning_summary = "none"` means no reasoning summaries reach CodeAI Hub, so there is nothing to translate or display;
  - the provider settings toggle updates provider-home `config.toml` immediately and saved settings remain the restart-proof source of truth for future Codex materialization;
  - legacy hidden collapsible thinking UI remains only for archived `role: "thinking"` history.
- Gemini Thought Translator: `packages/Gemini_Module/src/messaging/gemini-thought-translation-adapter.ts`
  - Adapts Gemini agent thoughts into shared `@codeai-hub/translation` facade calls; current engine path is Google GTX / `translate.googleapis.com`
  - Core threads `messagesForTheUserLanguage` from the shared settings snapshot into Gemini runtime so visible thought bubbles follow the selected `Messages for the User` language; `en` skips translation and preserves upstream provider wording
  - Buffered in `GeminiMessageProcessor.handleThoughtEvent()`: pending translations are awaited before real response emit, and the no-pending-translations path emits the final assistant segment synchronously
  - Emitted as `role: "assistant"` with `tag: "thinking"` — UI renders as "Gemini · Thinking" when `thinkingDisplaySyncEnabled` is on; when the display flag is off, the Session UI filters the bubble while the runtime history/logging path remains intact
  - `thought-translator-service.ts` remains a compatibility re-export for historical imports
  - Graceful degradation: on failure, English original is emitted as fallback
  - Канон: `doc/SolidWorks-WorkFlow/Contracts/Gemini_ThoughtTranslation.md`, `packages/translation/src/translation-facade.ts`

## 5) Workflow Boundary (Description, 2026-03-01)

- Шаг `description` зафиксирован как single-agent file-first flow:
  - pre-submit: `questionnaire.md` + user Help,
  - post-submit: единая resume-сессия,
  - SSOT-артефакт: `Final_Description.md`.
- `Final_Description.md` должен формироваться сразу после чтения анкеты (первичный черновик), чтобы пользователь обсуждал уже существующий документ.
- `Final_Description.md` должен содержать не только описание идеи, но и базу для следующего шага `virtual_simulation`:
  - ключевые сценарии в количестве, достаточном для покрытия продукта (актор/цель → действие → ожидаемый результат → критерий успеха),
  - ограничения/допущения,
  - ключевые сущности/термины.
- Product-visible contract шага не использует `description.md`, manual restart или встроенный reviewer; internal compat для legacy draft допустим только как non-SSOT fallback.
- Legacy naming `Idea` / `Idea Collector` больше не участвует в PM bootstrap, user-facing copy, release packaging или stage semantics текущего workflow. Если такие имена ещё встречаются в коде, они допускаются только как internal helper alias, provider parsing internals, archived/deferred flow leftovers или redirect-only compat слой.
- Standalone Reviewer вынесен в deferred-модуль и не входит в базовый workflow 1→6.

## 6) Runtime Templates Boundary (Description + Virtual Simulation)

Каноничные bundled templates в `.codeai-hub/templates/description/`:
- `questionnaire-template.md` — pre-submit анкета.
- `description-template.md` — runtime/reference copy Description Help; PM не должен требовать этот файл для локального рендера Help.
- `description-collector-prompt.md` — инструкции Description Agent (file-first, краткий контекст workflow, ограничения, DoD).

Инвариант delivery для `Description`: user-facing PM Help не должен зависеть от наличия `description-template.md` на диске или от ответа `description-contract`. Runtime может синхронизировать и восстанавливать `description-template.md` как reference asset для workflow contract, но кнопка `Help` в PM обязана рендериться локально по тому же паттерну, что и остальные step helps.

Каноничный bundled prompt для `.codeai-hub/templates/virtual_simulation/`:
- `virtual-simulation-prompt.md` — инструкции Virtual Simulation Agent.

Инвариант: `Virtual Simulation` работает в режиме prompt-only. Отдельный artifact template (`virtual-simulation-template.md`) в runtime не поставляется и не отправляется агенту.

Канонические документы:
- `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
- `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
- `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`

## 6.1) Diagram DSL Artifact Boundary (Phase 1, 2026-03-16; updated Phase 57, 2026-03-24)

- Workflow шаг `Diagram Modules` больше не использует Mermaid `.mmd` как SSOT.
- Канонические semantic artifacts:
  - `.codeai-hub/<workspaceSlug>/diagram_modules/product-parts.index.md`
  - `.codeai-hub/<workspaceSlug>/diagram_modules/product-parts/<part-id>.md`
- Канонические auxiliary artifacts:
  - `*.flow.json` для layout/view state.
- Agent instructions и templates для этого шага поставляются из `packages/agents/diagram-modules-agent/assets/`, а не из `packages/core/src/templates/source/*.mmd`.
- Runtime обязан считать `.md` artifact единственным product-visible SSOT, а `*.flow.json` трактовать как non-semantic sidecar.
- Facade specs are deferred to per-cluster and per-module branches (future work) and are not a trunk workflow step.

Канонические документы:
- `doc/SolidWorks-WorkFlow/Plans/Archive/DiagramWorkflow_UserSurface_Architecture.md`
- `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
- `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`

## 6.2) Diagram Visual Shell Boundary (Phase 2, 2026-03-16; updated Phase 57, 2026-03-24)

- Project Manager для `Diagram Modules` рендерит канонические DSL artifacts через diagram-first visual shell на базе React Flow.
- Правый panel contract для diagram stage = `Artifacts | Help` (Source mode убран):
  - `Artifacts` показывает саму диаграмму;
  - `Help` показывает guidance по шагу.
- Visual shell не владеет semantic state:
  - source of truth остаётся `product-parts.index.md` + `product-parts/<part-id>.md`;
  - shell работает как projection layer `Markdown DSL -> domain model -> flow nodes/edges`, но владеет только layout/view state.
- `*.flow.json` остаётся non-semantic sidecar:
  - хранит positions/viewport для visual shell;
  - пишется отдельно через `workspace-file-write`;
  - не меняет содержимое канонического `.md`;
  - не показывается пользователю как primary artifact.
- Если sidecar отсутствует или не совпадает по `Revision`, shell обязан взять стартовые координаты из собственной domain projection и затем позволить пользователю вручную корректировать layout прямо в React Flow.
- Product contract для diagram layout теперь `manual-layout first`:
  - AI/DSL задаёт semantic structure диаграммы;
  - пользовательская композиция принадлежит `*.flow.json`;
  - автоматический layout engine не определяет финальный пользовательский вид диаграммы.
- Browser/UI bundle не должен зависеть от Node-only imports ради рендера diagram artifacts; для `Revision` browser-safe parsing path может переиспользовать уже записанное поле `- Revision:` из канонического Markdown DSL.

Канонические документы:
- `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
- `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowNavigation_SSOT.md`
- `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`

## 6.3) Module Semantic Source Boundary (Phase 3, updated Phase 57, 2026-03-24)

- `Diagram Modules` keeps semantic truth in staged Markdown artifacts, not in the visible graph canvas.
- Видимый UI больше не содержит inline-редакторов для module entities и relations.
- `product-parts.index.md` is the first canonical orchestration artifact for `Diagram Modules`.
- `product-parts/<part-id>.md` are the primary semantic artifacts of individual `Product Part`.
- The Module Graph is built progressively from individual `product-parts/<part-id>.md` files; no single aggregate file is generated.
- Начиная с ownership-aware migration (`2026-03-21`), canonical inventory model для `Diagram Modules` включает явный верхний уровень `Product Part -> Cluster -> Module`.
- Parser/runtime обязаны поддерживать dual-read migration path: новый hierarchical DSL читает explicit `Product Parts`, а legacy flat inventories временно materialize synthetic `default-product-part`, чтобы старые workspace artifacts оставались parseable без ручной миграции.
- Начиная с cleanup wave `2026-03-28`, `diagram-modules-parser.ts` больше не является god-parser: root file сведен к thin orchestration surface, а relation/module/cluster/product-part/legacy ownership parsing вынесены в отдельные focused helpers.
- Graph canvas continues to allow manual layout edits, and those changes remain in `module-map.flow.json` only.
- Provenance and merge handling stay in the agent/runtime path, not in the visible surface.

Канонические документы:
- `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
- `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`

## 6.4) Diagram Workflow Stabilization Boundary (Phase 5, 2026-03-16; updated Phase 57, 2026-03-24)

- Markdown DSL runtime обязан быть tolerant к platform-level text variance:
  - parser принимает UTF-8 BOM и CRLF line endings;
  - serializer нормализует multiline semantic blocks к canonical LF output.
- Shared diagram editor UX обязан сохранять визуальную непрерывность:
  - background refresh не должен очищать уже загруженный graph перед следующим успешным parse/load;
  - empty semantic graph обязан показывать explicit placeholder вместо silent blank canvas;
  - manual drag changes обязаны обновлять текущий React Flow canvas в реальном времени и сохраняться в `*.flow.json`;
  - visual shell не показывает auto-layout chrome, zoom/fit controls или bottom-right minimap; единственный interaction mode = Option(Alt)+drag для node movement, обычный drag панорамирует canvas.
- Workflow tree child nodes для `Diagram Modules` обязаны наследовать актуальные stage-level `blocked/outdated` сигналы; поддеревья диаграмм не могут маскировать реальный gating state как постоянный `active`.
- Fresh toolbar bootstrap для шага `Diagram Modules` обязан следовать тому же product contract, что и `Description -> Virtual Simulation`: если upstream canonical artifact уже существует, PM обязан разрешить ручной запуск следующего шага без дополнительного требования `upstream stage === completed` и без превращения `invalid/outdated` статуса upstream stage в hard blocker. Эти статусы остаются диагностическими, но не отменяют user-driven переход на следующий шаг.
- `WorkflowState` на cold start не может зависеть только от watcher-memory. При чтении `/workflow-state` Core обязан гидрировать canonical artifacts (`Final_Description.md`, `virtual-simulation.md`, `product-parts.index.md`) с диска, чтобы gating и stage snapshot оставались корректными после перезапуска Core / Project Manager.
- Diagram workflow contract не может ограничиваться только base prompt и template path. Для `diagram_modules` runtime обязан сначала читать strict field-reference и merge-rules из synced visible templates под `~/.codeai-hub/templates/...`, а package assets использовать только как bundled-source fallback, чтобы генерируемый Markdown DSL не изобретал невалидные enum values и оставался parseable для visual shell.
- Для empty-workspace greenfield сессий agent source boundary обязан оставаться project-local: `Virtual Simulation` и `Diagram Modules` читают только canonical artifacts текущего проекта внутри `.codeai-hub/<workspaceSlug>/...`, continuity files текущего stage и файлы, которые пользователь явно назвал для этого проекта. Исходники CodeAI Hub, parser/runtime implementation и чужие repo-level docs не могут выступать источником архитектурных решений для artifact generation.
- Для `Diagram Modules` semantic runtime contract теперь staged:
  - first artifact: `product-parts.index.md`;
  - primary semantic part artifacts: `product-parts/<part-id>.md`.
- Trunk workflow now extends through `Foundation Envelope`. After envelope approval, work continues as a Development Tree `[DESIGNED, NOT IMPLEMENTED]`:
  - **Product Part branch** (per each part from Module Graph);
    - **Cluster branch** (per each cluster inside part):
      - Cluster Specification (functions, constituent modules, cluster-level responsibility);
      - Cluster Facade Contract (external contract of the cluster);
      - **Module branch** (per each module inside cluster):
        - Module Specification (interfaces, methods, dependencies);
        - Module Facade Contract (public API);
        - TODO Plan (phases, streams, micro-tasks ≤3 files);
        - Implementation (code + sync documentation updates).
  - Facades are NOT a separate trunk step; they appear naturally inside per-cluster and per-module branches.
- Diagram workflow user surface не может подменять диаграмму raw Markdown source по умолчанию. При reopen/resume `Diagram Modules` Project Manager обязан возвращать пользователя в `Artifacts` (visual diagram), а `Source` оставлять вторичным debug view.
- Пока canonical artifact ещё не создан, `Artifacts` panel для workflow stage обязан показывать тот же help-content, что и вкладка `Help`; отдельный pending-intro prose вне help SSOT не допускается.
- Ordinary dialog reopen/recovery contract обязан сохранять identity continuity между PM, Core continuity и provider runtime. Если runtime по любой причине создает fresh provider session вместо обычного resume, новый binding должен быть immediately normalized в continuity/index до следующего outbound user turn, а PM не имеет права бесконечно повторять `createSession(old providerSessionId)` для того же continuity entry.
- `Diagram Modules` не навязывает пользователю inline semantic editors или bottom-right minimap. Product UX обязан опираться на:
  - AI-generated semantic structure в canonical `.md`;
  - nested ownership containers для `Diagram Modules`, где `Product Part` = top-level container, `Cluster` = child container, `Module` = child node внутри cluster или напрямую внутри owning product part;
  - manual drag/editing внутри React Flow;
  - persisted user-owned positions в `module-map.flow.json`;
  - agent-driven semantic updates when new semantic content is needed.
- Diagram canvas interaction model (начиная с 1.1.796):
  - **Option(Alt)+drag** перемещает отдельные ноды; обычный drag (без модификатора) панорамирует canvas;
  - **Dynamic container resizing**: Product Part и Cluster автоматически расширяются/сжимаются при перемещении дочерних нод к границам (минимальная ширина PP = 720px, Cluster = single-column); реализовано через `containerConstraints` в flow node data и bottom-up `resizeContainersToFit` в `DiagramEditorShell`;
  - **Collision avoidance**: siblings внутри одного контейнера и Product Part-ы между собой не могут наложиться друг на друга (12px SIBLING_GAP, AABB minimum-translation-vector);
  - **Multi-column layout**: кластеры с 3+ модулями используют 2-column layout (CLUSTER_MULTI_COL_THRESHOLD = 2).
- Detachable diagram window (начиная с 1.1.795):
  - кнопка `Detach` в artifact header (слева от `Artifacts` toggle) открывает full-viewport ReactFlow в отдельном CEF popup через `window.open()`;
  - detached окно использует тот же sidecar файл (`module-map.flow.json`), что и основной PM — позиции нод синхронизированы;
  - при drop (конце перетаскивания) `BroadcastChannel("pm:diagram:sidecar-sync")` уведомляет другое окно о перезагрузке sidecar;
  - реализация: `detached-diagram-view.tsx`, `detach-diagram-button.tsx`, `stage-artifact-header-toggle.tsx` (`extraActions` slot).
- Workspace auto-select (начиная с 1.1.791): при открытии workspace PM проверяет Diagram Modules **перед** Virtual Simulation и показывает последний шаг с активной сессией.

Канонические документы:
- `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
- `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowNavigation_SSOT.md`
- `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`

## 6.5) Diagram Modules Ownership Hierarchy Boundary (Phase 6, 2026-03-21; updated Phase 57, 2026-03-24)

- `Diagram Modules` больше не ограничивается semantic baseline вида `cluster + standalone module`.
- Канонический semantic runtime contract для module stage теперь включает `ProductPartEntity[]`, `ClusterEntity[]`, `ModuleEntity[]` и `ModuleRelation[]`.
- `Product Part` является верхним ownership layer для user-facing diagram:
  - имеет `title`, `purpose`, ordered `clusterIds`, ordered `standaloneModuleIds`;
  - не может быть пустым;
  - не может использоваться как relation endpoint.
- `Cluster` обязан принадлежать ровно одному `Product Part`, а `Module` обязан принадлежать ровно одному `Product Part` и максимум одному `Cluster`.
- React Flow projection для `Diagram Modules` обязан использовать nested container model:
  - product part node = top-level container;
  - cluster node = child container через `parentId` (no `extent: "parent"` — containers resize dynamically);
  - module node = child node внутри cluster или напрямую внутри product part, если модуль standalone;
  - container nodes хранят `containerConstraints` (childMinX/Y, minWidth/Height, padding) для dynamic resize и collision avoidance.
- First-open auto-layout для ownership-aware `Diagram Modules` обязан оставаться readable без user drag:
  - top-level `Product Part` containers раскладываются как независимые row/lane sections и не могут overlap друг с другом;
  - internal standalone modules группируются в отдельную предсказуемую band внутри owning product part и не могут хаотично расширять cluster grid;
  - ownership-free external modules/boundaries (например выбранный AI provider) визуализируются вне product-part container, а не как внутренние элементы его ownership layer.
- Начиная с review-step baseline (`2026-03-23`, updated `2026-04-05`), `Diagram Modules` фиксируется как главный user-feedback checkpoint ствола, но не как его последний шаг:
  - пользователь именно здесь впервые видит архитектуру в наглядной форме и должен иметь возможность активно её корректировать;
  - после `Diagram Modules` workflow проходит через лёгкий шаг `Foundation Envelope`, который фиксирует application-wide assembly decisions до branch-level specifications;
  - facade specs are deferred to per-cluster and per-module branches (future work).
- Начиная с product-part decomposition baseline (`2026-03-23`), `Diagram Modules` больше не должен упираться в giant single-turn generation:
  - сначала runtime materialize-ит `product-parts.index.md`;
  - затем отдельные `Product Part` materialize-ятся по одному;
  - `React Flow` обязан progressively регенерировать graph по мере появления новых part artifacts;
  - relation lines и cross-part wiring исключаются из первого обязательного baseline slice.
- First-open layout contract для `Diagram Modules` должен быть детерминированным и идти по схеме `measure -> place`:
  - runtime сначала измеряет header/content budget для `Product Part`, `Cluster` и `Module`;
  - затем размещает child nodes накопительно по реальным высотам, а не только по грубым константам;
  - child cards не имеют права пересекать header-zone parent container.
- User-facing hierarchy contract для ownership containers:
  - `Product Part` и `Cluster` обязаны показывать короткий purpose/description surface, а не только title и counters;
  - standalone modules должны компактизироваться под более короткую измеренную колонку внутри owning product part;
  - outer frame `Product Part` должен замыкаться по реально занятому содержимому плюс симметричные paddings, без пустой декоративной вертикали.
- `module-map.flow.json` остаётся non-semantic layout sidecar даже после введения ownership hierarchy:
  - хранит только geometry/positions;
  - не переносит ownership semantics;
  - применяется только если `Revision` sidecar совпадает с текущим semantic artifact.
- Runtime orchestration contract для `Diagram Modules` использует step-by-step workflow (начиная с 1.1.778):
  - index turn: агент создаёт `product-parts.index.md`, задаёт вопросы по составу, ждёт подтверждения пользователя;
  - part turns: пользователь подтверждает → агент создаёт один `Product Part`, ждёт подтверждения;
  - graph автоматически обновляется при каждом новом artifact (`pm:diagram:refresh` event);
  - sidebar label: `Module Graph` (Source mode убран — граф является основным артефактом).

Канонические документы:
- `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
- `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`

Связанный planning-док:
- `doc/SolidWorks-WorkFlow/System/Diagram_Modules_ProductPart_Decomposition_And_Progressive_Rendering_Architecture.md`

## 7) Codex Response Mode Boundary (2026-03-13)

- `Settings -> General` теперь владеет persisted policy `general.responsePolicy`; эта настройка не смешивается с `Core Controls`.
- `Core Controls` остаётся отдельной operational card: restart feedback не влияет на persisted `general.responsePolicy` и не смешивается с provider/model settings.
- Baseline default для workflow-сценариев: `hybrid`.
- `strict` оставляет editable schema/instruction contract для узких machine-readable turn-ов.
- `debug_raw` нужен для исследования новых моделей без baseline default schema pressure на обычные turn-ы.
- Raw provider rollouts и append-safe SDK JSONL являются диагностическими артефактами; dialog/history остаётся нормализованным display-слоем.
