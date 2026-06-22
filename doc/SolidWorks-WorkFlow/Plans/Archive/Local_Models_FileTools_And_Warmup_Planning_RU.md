# Local Models File Tools And Warmup — Planning (RU)

**Worktree:** `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub-local-models-tools-warmup`
**Branch:** `codex/local-models-tools-warmup`
**Date:** 2026-06-20
**Status:** Closed by release `1.2.560`; archived. Canonical behavior lives in `doc/SolidWorks-WorkFlow/Modules/LocalModels.md`, `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`, and `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`.

## Цель

Сделать экспериментальную рабочую ветку, где Local Models через LM Studio получают минимальный tool surface для записи workflow artifacts и где выбранные локальные модели заранее подгружаются при загрузке Project Manager.

## Текущее состояние

- `packages/core/src/local-models/local-models-runtime-load-manager.ts` уже умеет загружать, переиспользовать и выгружать idle `codeaihub-*` LM Studio instances по purpose: `workflow-agent`, `translation-reasoning`, `translation-localization`, `translation-generic`.
- `packages/core/src/local-models/local-models-provider-adapter.ts` сейчас вызывает LM Studio native `POST /api/v1/chat` со стартовым `system_prompt`, стримит `message.delta` как live assistant и `reasoning.delta` как thinking.
- Local Models не имеют file-write tools. Preliminary artifacts сейчас пишет Core через `session-request-handler-preliminary-artifact-gate.ts`, извлекая fenced markdown block из assistant ответа.
- Выбранная workflow модель хранится в `providers.localModels.defaultModel`.
- Выбранный reasoning translation engine хранится в `general.localization.reasoningEngineId`; локальная модель имеет id вида `lmstudio:<modelKey>`.

## API-факты LM Studio

- Официальный native `/api/v1/chat` поддерживает streaming SSE и события `tool_call.*`; chat endpoint также поддерживает `integrations` / MCP.
- Официальный OpenAI-compatible `/v1/chat/completions` поддерживает function tools через `tools`.
- Для первого рабочего варианта держим fallback: сначала используем native path, если текущая LM Studio установка реально отдаёт tool events для локального write tool; если native MCP path требует лишней инфраструктуры, берём OpenAI-compatible tool loop как минимальный рабочий путь.

Sources:
- [LM Studio Tool Use](https://lmstudio.ai/docs/developer/openai-compat/tools)
- [LM Studio Streaming events](https://lmstudio.ai/docs/developer/rest/streaming-events)
- [LM Studio Chat endpoint](https://lmstudio.ai/docs/developer/rest/chat)
- [LM Studio Quickstart](https://lmstudio.ai/docs/developer/rest/quickstart)

## Решения

1. **Минимальный tool surface:** один инструмент `write_workflow_artifact(relative_path, content)`.
2. **Path safety:** разрешены только workspace-relative paths под `.codeai-hub/`; absolute paths и `..` запрещены.
3. **No shell:** Local Models не получают shell, read/write-any-file, git или package-manager tools.
4. **Core remains authority:** модель может записать artifact, но Core всё равно валидирует artifact, managed stage state, dirty gate и commits.
5. **Прогрев non-blocking:** warmup не блокирует PM startup/settings load. Ошибки LM Studio пишутся в лог, UI продолжает работать.
6. **No new dependency:** используем текущий Node/TS код и существующий LM Studio CLI/API.

## Implementation Evidence

- `local-models-sse-reader.ts` parses native LM Studio `tool_call.arguments` events for future native/MCP support.
- First working file-write path is OpenAI-compatible `/v1/chat/completions` because native `/api/v1/chat` documents tool execution through integrations/MCP, not direct client-provided function tools.
- `local-models-workflow-artifact-tool.ts` owns the single local tool, path safety and max-step tool loop. It returns tool errors to the model instead of throwing workflow-visible failures for correctable path mistakes.
- `LocalModelsProviderAdapter` keeps native `/api/v1/chat` for sessions without a workspace root and uses tool-enabled `/v1/chat/completions` for workspace-bound workflow sessions.
- `local-models-provider-adapter.tools.test.ts` covers successful `.codeai-hub/**` artifact write and rejection of `README.md` outside the allowed artifact root.

## Implementation Outline

### A. File-write tool

- DONE: расширен local-models SSE reader для native `tool_call.arguments`.
- DONE: добавлен локальный runtime helper по образцу GLM Native, но без shared abstraction: `write_workflow_artifact` с тем же path safety.
- DONE: `LocalModelsProviderAdapter` использует короткий OpenAI-compatible tool loop с лимитом шагов для workspace-bound sessions. После successful write агент отвечает коротким summary, а не дублирует полный artifact в чат.
- CHOSEN: native tool dispatch без MCP server отложен; first working path использует `/v1/chat/completions` с тем же инструментом.

### B. Warmup

- Добавить Core-side warmup helper для Local Models.
- На `settings:load`/workspace PM startup читать workspace settings:
  - если `general.localization.reasoningEngineId` начинается с `lmstudio:`, preload этой модели с purpose `translation-reasoning`;
  - если `providers.localModels.defaultModel` задан, preload этой модели с purpose `workflow-agent`;
  - dedupe одинаковые модели.
- Warmup использует существующий `ensureLmStudioServerRunning` + `LocalModelsRuntimeLoadManager.ensureModelLoaded`.
- Warmup не должен выгружать user-loaded LM Studio instances и не должен блокировать UI.

## Проверки

- Targeted tests for local-models SSE/tool parsing.
- Targeted tests for LocalModelsProviderAdapter tool execution and path rejection.
- Targeted tests for warmup model selection/dedupe/failure softness.
- `npm run build --workspace=@codeai-hub/core`.
- `npm run lint` only if local changes are stable; hooks still run on planned commits.

## Acceptance

- В Project Manager при открытии workspace выбранная reasoning LM Studio модель и выбранная Local Models workflow модель уходят в LM Studio preload.
- Local Models workflow turn может создать/перезаписать `.codeai-hub/...` artifact через tool call без вставки полного файла в финальный чат.
- Попытка записи вне `.codeai-hub/` возвращает tool error и не пишет файл.
- Existing markdown extraction path остаётся fallback для моделей/turn-ов без tool call.

## Closeout Result

- Released as `1.2.560`.
- Accepted by user as good enough for this scope; remaining Local Models nuances are deferred to a new plan.
- Final behavior: workspace-bound Local Models turns stream reasoning/assistant output while accumulating tool calls silently, write artifacts through the single `.codeai-hub/**` tool, then send the post-write follow-up without tools so Qwen cannot repeat artifact writes until max-step failure.

## Out Of Scope

- Download/delete моделей внутри CodeAI Hub.
- Полный shell/tool sandbox для Local Models.
- Arbitrary workspace file writes outside `.codeai-hub/`.
- Release build без отдельного подтверждения.
