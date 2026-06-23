# Local Models (LM Studio) Provider Module — Module (SSOT)

## Назначение
Local Models provider подключает локальные LLM, загруженные в LM Studio, как workflow-agent provider. Native workflow turns используют LM Studio `/api/v1/chat`; workspace-bound workflow turns с записью артефакта используют OpenAI-compatible `/v1/chat/completions` с одним локальным tool. Тяжёлые reasoning-модели (Qwen3 27B MLX, Gemma 4 26B A4B и др.) исполняются полностью локально.

Core остаётся владельцем workflow state, prompt/artifact contracts, model identity, reasoning visibility и lifecycle. Модуль владеет только HTTP/SSE transport, нормализацией событий, LM Studio discovery/load policy и request timeout.

Accepted baseline in release `1.2.554` (live assistant streaming + reasoning thinking channel + reasoning buffering + artifact materialization incl. thinking-split + configurable request timeout), then extended through release `1.2.560` with minimal artifact file tools, Project Manager startup warmup, streamed tool turns, dialog dedupe, and Qwen post-write tool-loop termination. Release `1.2.562` makes the selected reasoning-translation and Local Models workflow-agent LM Studio workers persistent while Core is running.

## Где живёт код
- Core local models package: `packages/core/src/local-models/`
- Provider adapter (Core-facing entry): `packages/core/src/local-models/local-models-provider-adapter.ts`
- Native SSE reader: `packages/core/src/local-models/local-models-sse-reader.ts`
- Workflow artifact tool helper: `packages/core/src/local-models/local-models-workflow-artifact-tool.ts`
- Discovery/translation facade: `packages/core/src/local-models/local-models-facade.ts`
- Runtime load manager: `packages/core/src/local-models/local-models-runtime-load-manager.ts`
- Startup warmup service: `packages/core/src/local-models/local-models-warmup-service.ts`
- Project Manager settings hook: `packages/core/src/remote-bridge/handlers/settings-local-models-warmup-scheduler.ts`
- Artifact materialization (Core-owned, provider-neutral): `packages/core/src/remote-bridge/handlers/session-request-handler-preliminary-artifact-gate.ts`

## Внешний контракт
- Provider id в Core/UI catalog: `localModels`; user-facing models surface as `LM Studio · <model>` from `lmstudio:<modelKey>` catalogs.
- Workflow turns accept selected LM Studio ids as either raw `modelKey` or `lmstudio:<modelKey>`. An explicit unavailable selected model is a hard error; the adapter must not silently fall back to the first discovered local model.
- Workflow-agent endpoint: LM Studio native `POST /api/v1/chat`, `stream: true`, `input` = prompt, `max_output_tokens`, `model` = loaded identifier, `temperature`.
- Workflow artifact tool path: workspace-bound Local Models sessions use LM Studio OpenAI-compatible `POST /v1/chat/completions` with `stream: true` and one function tool, `write_workflow_artifact(relative_path, content)`. This is the first working path because native `/api/v1/chat` exposes `tool_call.*` events through integrations/MCP; direct local function tools would otherwise require extra MCP server infrastructure.
- Translation path (separate) also uses the OpenAI-compatible `/v1/chat/completions`; do not conflate translation prompts with the workflow artifact tool loop.
- Base URL override: `CODEAI_LMSTUDIO_BASE_URL` (default `http://127.0.0.1:1234`). Default model override: `CODEAI_LMSTUDIO_DEFAULT_MODEL`.
- CodeAI-owned LM Studio loads use `codeaihub-*` identifiers. Ordinary one-off translation/workflow loads keep purpose-specific TTLs; selected Project Manager warmup loads for reasoning translation and Local Models workflow defaults are persistent and omit `--ttl`. Core may unload only idle `codeaihub-*` instances. User-loaded LM Studio instances must never be unloaded by Core. Model download/delete/config remains owned by LM Studio.

## Startup warmup
- After a workspace `settings:load` or `settings:save`, `SettingsRequestHandler` publishes/saves the normalized settings snapshot first, then schedules Local Models warmup on a detached timer. Project Manager startup and settings save must not wait for LM Studio.
- `warmSelectedLocalModels` reads the workspace settings file and preloads two selected local models when present: `general.localization.reasoningEngineId = lmstudio:<modelKey>` for live reasoning translation, and `providers.localModels.defaultModel` (or `CODEAI_LMSTUDIO_DEFAULT_MODEL`) for workflow-agent turns.
- Selected warmup loads are persistent: `LocalModelsRuntimeLoadManager.ensureModelLoaded({ persistent: true, ... })` omits `--ttl`, so LM Studio keeps the selected workers loaded until Core/LM Studio lifecycle or an explicit later reconcile unloads a stale idle CodeAI-owned worker.
- If both settings point to the same LM Studio model, Core loads it once with `workflow-agent` purpose and records both sources. If they point to different models, warmup preserves both selected CodeAI-owned workers.
- After warmup/reconcile, Core unloads idle stale CodeAI-owned workers except the currently selected reasoning/workflow model keys. This is the only cross-model cleanup path for Settings selection changes; ordinary translation/workflow `ensureModelLoaded` calls do not eject other selected models.
- Warmup is best-effort: missing LM Studio, unavailable models, or load failures are logged/skipped and must not block Settings, Project Manager rendering, or non-local providers.

## Live assistant streaming
- `readLmStudioNativeChatResult(response, onDelta?, onReasoning?)` reads the native SSE stream: it returns the terminal `chat.end.result` payload (for `parseNativeChatText`) and invokes the optional callbacks per delta.
- `message.delta` frames (field `content`) drive `onDelta`; the adapter emits an `assistant` event with `tag: "live"` per chunk, then one final non-live `assistant` event with the complete text.
- The Core/UI live-tail dedupe pipeline (`resolveLiveAssistantTailDedupe`) collapses consecutive live chunks into one growing card and strips the overlap of the final event, so the assistant reply appears progressively instead of one buffered block (symmetric to GLM Native / Claude).

## Reasoning (thinking) channel
- For reasoning models LM Studio emits a separate channel: `reasoning.start` → `reasoning.delta` (field `content`) → `reasoning.end`, distinct from `message.*`. `onReasoning` consumes `reasoning.delta`.
- The adapter emits each flushed reasoning block as a `thinking` event (`type: "thinking"`, `tag: "thinking"`), routed through the existing Core thinking-visibility pipeline (mirrors GLM Native `onThinking`). `message.delta` live assistant emit and the final assistant emit are unchanged.
- Reasoning is BUFFERED in the SSE reader (`createReasoningFlusher` / `shouldFlushReasoning`): flush only at ≥900 chars, or ≥360 chars on a sentence boundary, plus a flush when message content starts or the stream ends. Without buffering, hundreds of 1-4 char `reasoning.delta` frames would render "letter per line"; this mirrors GLM Native's `shouldFlushThinking`.
- The terminal `chat.end.result.output` may contain a `{ type: "reasoning" }` item; `parseNativeChatText` only consumes `message`/`assistant` items, so reasoning does not leak into the artifact, and a reasoning-only turn (no `message`) fails with an explicit "no final assistant message" diagnostic.

## Reasoning enablement per model (LM Studio side)
- Qwen3 (e.g. `qwen3.6-27b-mlx`, arch `qwen3_5`): reasoning is ON by default; LM Studio emits `reasoning.delta` out of the box.
- Qwen3-Coder: non-reasoning (no think phase).
- Gemma 3: no thinking mode.
- Gemma 4 (e.g. `gemma-4-26b-a4b-it`): thinking is configurable and OFF by default. To surface it through `reasoning.delta`, LM Studio must be configured by the user: (1) Jinja prompt template gets `{%- set enable_thinking = true %}`; (2) Reasoning Parsing delimiters set to Gemma's channel tokens — Start `<|channel>thought`, End `<channel|>` (NOT the default `<think>`). The adapter is provider-agnostic: it reads `reasoning.delta` and does not parse model-specific tags itself.

## Artifact materialization
- Preferred path for workspace-bound Local Models workflow turns is tool-calling through `packages/core/src/local-models/local-models-workflow-artifact-tool.ts`.
- Tool surface is intentionally one function: `write_workflow_artifact(relative_path, content)`. It writes/replaces exactly one UTF-8 artifact and returns `{ ok, relative_path, bytes }` or `{ ok: false, error }` as a tool result.
- Path safety is Core-owned: `relative_path` must be workspace-relative, must start with `.codeai-hub/`, must not contain `..`, and must resolve inside the session workspace root. The tool has no shell, git, package-manager, read-file, or arbitrary-write capability.
- `LocalModelsProviderAdapter` stores the workspace root from `createSession(workspacePath)` / `resumeSession(sessionId, workspacePath)`. If a workspace root exists, the adapter uses `/v1/chat/completions` with the artifact tool and a max-step loop. After the first successful write, the next LM Studio follow-up is sent without `tools`, so Qwen-family models cannot repeatedly call `write_workflow_artifact` until max-step failure. If that post-write follow-up is empty, Core completes the turn with the short fallback text `Готово: артефакт записан.` for orchestrator progress.
- The OpenAI-compatible tool loop preserves the same user-visible streaming contract as native turns: `delta.content` is emitted immediately as live assistant chunks, `delta.reasoning_content` / `delta.reasoning` is emitted through the buffered `thinking` channel, and streamed `tool_calls` arguments are accumulated silently for execution. The file write happens after a complete tool call has arrived; the post-write follow-up assistant turn is streamed live, while final stored assistant snapshots remain available to Core/orchestrator consumers.
- Native SSE parsing still recognizes LM Studio `tool_call.arguments` frames in `local-models-sse-reader.ts`; this preserves the native/MCP path for later, but the first local write implementation does not start an MCP server.
- Fallback path remains available for models/turns that do not call the tool: Core can still materialize preliminary artifacts (`Final_Description.md`, `virtual-simulation.md`) from a fenced ```` ```markdown ```` block in the assistant answer (`maybeMaterializeArtifactFromAssistant`).
- Live-stream resilience for fallback: the live-tail dedupe drops the whole final assistant message when it is fully covered by live chunks, leaving only fragmented `tag: "live"` chunks; the gate reconstructs the latest answer by joining the trailing run of assistant messages before extracting the fenced block.
- Thinking-split resilience for fallback: when reasoning is split into a `thinking` message, the model may leave the fenced block in the `assistant` message but the artifact filename in the `thinking` message. The gate confirms the filename across the latest assistant+thinking turn while still extracting the fenced block from the assistant message.

## Request timeout
- The native chat request uses an `AbortController`. The timeout is configurable via `CODEAI_LMSTUDIO_TIMEOUT_MS` (milliseconds) with a default of `1_200_000` (20 minutes). Heavy local reasoning turns can run for many minutes; the previous hard 5-minute cap aborted long turns mid-answer ("This operation was aborted").

## Инварианты
- `localModels` is a distinct workflow-agent provider id. Native `/api/v1/chat` remains the native streaming/reasoning path; OpenAI-compatible `/v1/chat/completions` is used for the minimal workflow artifact tool loop and for translation. Workflow tool turns must still stream live assistant/reasoning deltas while tool-call arguments are buffered for artifact execution; after a successful artifact write, follow-up requests must not include the write tool again.
- Reasoning visibility/translation follows the same Core-owned `thinking` event contract as other providers; the adapter only emits `thinking` events, it does not own visibility policy.
- The adapter reads `reasoning.delta` as the reasoning source; it must not parse model-specific reasoning tags (`<think>`, `<|channel>thought`) itself — tag parsing belongs to LM Studio's reasoning parser configuration.
- Reasoning is buffered before emission; raw per-delta micro-chunks must not become one visible thinking line per SSE frame.
- Local Models artifact writes are restricted to `.codeai-hub/**`; any wider filesystem, shell, git, package-manager or dependency-management tool surface is out of scope.
- Core can discover/load/reuse/unload idle `codeaihub-*` LM Studio instances, but user-loaded instances, in-app download/delete, and deep per-model tuning remain owned by LM Studio.
- Explicit Local Models model identity is fail-closed: session binding, applied turn config, and `CODEAI_LMSTUDIO_DEFAULT_MODEL` may choose a model, but a missing selected id must surface as an error instead of executing with another model.
- Startup/settings warmup is a preload optimization only; it must not change selected engine/model ids, prompt contracts, artifact validity, or workflow truth.
- The selected reasoning-translation model and selected Local Models workflow-agent model are protected together. Loading one selected model must not unload the other; stale replacement happens only after Settings chooses a different model and warmup/reconcile unloads idle non-selected CodeAI-owned workers.

## Известные ограничения / будущая работа
- **Native tool dispatch:** the native `/api/v1/chat` stream now parses `tool_call.arguments`, but direct local tool execution there still needs either LM Studio MCP integration or a local ephemeral MCP server. Until that is justified, workspace-bound artifact writes use the smaller OpenAI-compatible function-tool path.
- **Tool argument visibility:** tool-call JSON is not rendered into the dialog. Only model reasoning and assistant text stream to the user; artifact content is written by the tool and summarized by the follow-up assistant turn.

## Связанные контракты
- Live-tail dedupe contract: `packages/core/src/remote-bridge/handlers/session-request-handler-live-tail-dedupe.ts`
- Reference live/thinking emit idiom: `doc/SolidWorks-WorkFlow/Modules/GLM_Native.md`
- System architecture (Translation invariant 21 + Core local models module): `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- Facade boundary process: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
