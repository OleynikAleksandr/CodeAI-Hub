# Codex SDK Module

**Updated:** 2026-02-13  
**Owner:** Codex  
**Source Reference:** `https://github.com/openai/codex/tree/main/sdk/typescript`

---

## 1. Purpose & Scope
- Document the structure and behaviour of the Codex TypeScript SDK so we can implement and maintain provider module `@codeai-hub/codex-module@1.1.576` inside CodeAI-Hub Core.
- Capture the CLI/SDK contract (events, items, options) that we must adapt for RemoteBridge and UI streaming.
- List integration prerequisites (authentication, binaries, storage layout) required to bootstrap Codex alongside the Claude module.

Key capabilities we must preserve when porting:
1. Streaming JSONL event bridge on top of `codex exec --experimental-json`.
2. Support for threaded conversations with resume semantics via `$CODEX_HOME/sessions` (CodeAI Hub sets `CODEX_HOME=~/.codeai-hub/providers/codex/home`, so provider rollouts/sessions must only be read from that provider-home).
3. Mixed text/image inputs and structured JSON outputs per turn (answer; structured output используется в legacy/Idea Collector потоках, а workflow стадии Description/Virtual Simulation/Diagrams работают в file-first режиме и пишут артефакты в runs).
4. Sandbox controls (`read-only`, `workspace-write`, `danger-full-access`) and optional Git repository enforcement.
5. Authentication via ChatGPT login or API key override (`CODEX_API_KEY`), with persistence under `$CODEX_HOME` (in Hub: `~/.codeai-hub/providers/codex/home`, with auth/config symlinked from `~/.codex`).
6. Graceful error propagation when CLI exits non-zero (surface `turn.failed`, `error` events, or exit messages).

---

## 2. Repository Map (openai/codex)
| Area | Path | Notes |
| --- | --- | --- |
| SDK entrypoint | `sdk/typescript/src/index.ts` | Re-exports Codex class, thread types, and event/item unions. |
| Thread orchestration | `sdk/typescript/src/thread.ts` | Implements `Thread.run` and `Thread.runStreamed`, normalizes inputs, tracks thread IDs. |
| CLI wrapper | `sdk/typescript/src/exec.ts` | Spawns bundled `codex` binary, assembles flags, manages env vars, streams stdout lines. |
| Event model | `sdk/typescript/src/events.ts` | Defines `ThreadEvent` union (`thread.started`, `turn.*`, `item.*`, `error`). |
| Item model | `sdk/typescript/src/items.ts` | Describes `agent_message`, `reasoning`, `command_execution`, `file_change`, `mcp_tool_call`, `web_search`, `todo_list`, `error`. |
| Options | `sdk/typescript/src/codexOptions.ts`, `threadOptions.ts`, `turnOptions.ts` | Codex constructor + thread/turn configuration, exported types `ApprovalMode`, `SandboxMode`. |
| Output schema helper | `sdk/typescript/src/outputSchemaFile.ts` | Persists JSON schema to temp directory before invoking CLI. |
| Bundled binaries | `sdk/typescript/vendor/<target triple>/codex` | Platform-specific executables shipped with the SDK. |
| Documentation | `docs/exec.md`, `docs/authentication.md`, `docs/sandbox.md`, `docs/config.md` | CLI usage, JSON mode, auth flows, configuration, sandbox semantics. |
| GitHub Action | `codex-action/` | Official automation example (runs CLI in CI). |

Local installation snapshot:
- SDK: `/Users/oleksandroliinyk/.npm-global/lib/node_modules/@openai/codex-sdk/` (version 0.53.0).
- CLI binary: `/Users/oleksandroliinyk/.npm-global/bin/codex` (installed via npm global prefix).

---

## 3. High-Level Architecture
```
CodeAI-Hub Core  →  Codex Provider Adapter  →  @openai/codex-sdk  →  codex exec (CLI)
                                                          ↓
                                                JSONL events (stdout)
                                                          ↓
                                           RemoteBridge / UI event bus
```
- The `Codex` class encapsulates a `CodexExec` instance that spawns the CLI per turn.
- `Thread` objects maintain conversation identity (`thread_id`), multiplexing consecutive turns over the same CLI command by passing `resume` arguments.
- Event streaming is line-oriented: each stdout line is JSON encoded `ThreadEvent`. The SDK already parses lines and raises typed unions.
- The CLI writes artifacts (sessions, config, auth) to `$CODEX_HOME`. CodeAI Hub defaults this to `~/.codeai-hub/providers/codex/home` (importing `~/.codex/auth.json` on first run) to isolate state from interactive CLI sessions; it can still be overridden via `CODEX_HOME`.

### Unified Session History (UI dialog rendering)
Важно различать два слоя хранения:
- **Provider-home (CLI state)**: Codex CLI пишет свои sessions/rollouts в `$CODEX_HOME/sessions/**` (в Hub это `~/.codeai-hub/providers/codex/home/sessions/**`).
- **Unified-session (UI history)**: Core параллельно пишет нормализованную историю диалога для UI в `~/.codeai-hub/sessions/<workspaceKey>/codexCli/<providerSessionId>.jsonl`, где `<workspaceKey>` = `sanitize(workspacePath)` (например `-Users-...-CodeAI-Hub`).

Promotion `temp id -> thread_id`:
- При первом реальном `thread_id` Codex SDK может промотировать provisional id (например `codex-<uuid>`) в реальный `<thread_id>`.
- Unified-session writer делает rename JSONL, чтобы сохранить **одну** историю (без split на `codex-*.jsonl` и `<thread_id>.jsonl`).

---

## 4. Execution Flow & Options
1. `const codex = new Codex({ baseUrl?, apiKey?, codexPathOverride? })` – optional overrides; `codexPathOverride` lets us point to a managed binary.
2. `const thread = codex.startThread({ model?, sandboxMode?, workingDirectory?, skipGitRepoCheck? })` – sandbox defaults to `read-only`; Git repo check can be disabled explicitly.
3. `await thread.run(input, { outputSchema? })` – buffers events until turn completion; throws if `turn.failed` emitted.
4. `await thread.runStreamed(input)` – returns `{ events }` where `events` is an `AsyncGenerator<ThreadEvent>`; consumer must iterate to receive updates.
5. `CodexExec.run()` constructs CLI arguments:
   - `codex exec --experimental-json [--model ...] [--config model_reasoning_effort=...] [--sandbox ...] [--cd ...] [--skip-git-repo-check] [--output-schema ...] [--image path...]`.
   - If resuming, appends `resume <thread_id>`.
   - Populates env (`CODEX_INTERNAL_ORIGINATOR_OVERRIDE=codex_sdk_ts`, optional `OPENAI_BASE_URL`, `CODEX_API_KEY`).
   - When CodeAI Hub has a saved per-model reasoning level, it passes `--config model_reasoning_effort=<level>` per turn (runtime override, no edits to `$CODEX_HOME/config.toml`).
6. Inputs may be a simple prompt (`string`) or an array of `{ type: "text" | "local_image" }`. Text entries are concatenated; image paths are converted to repeated `--image` flags.
7. Structured outputs require passing a JSON schema per turn; the SDK writes it to a temp file and cleans up afterward.
8. Thinking в UI в MVP берётся из native reasoning событий провайдера; RU thinking summary через отдельное поле structured output не используется (подробнее: `doc/SolidWorks-Flow/knowledge/kb/codex-thinking-display.md`).

Error handling:
- CLI non-zero exit → SDK rejects with aggregated stderr (`Codex Exec exited with code ...`).
- `turn.failed` events propagate as `Error(message)` from `Thread.run` and should be forwarded to RemoteBridge.

---

## 5. Event & Item Model
| Event | Payload | Notes |
| --- | --- | --- |
| `thread.started` | `{ thread_id }` | Emitted once per new thread or resume; update provider session mapping. |
| `turn.started` | none | Marks beginning of a turn. |
| `turn.completed` | `{ usage }` | Raw SDK turn usage (input, cached_input, output); CodeAI Hub дополнительно обогащает provider event payload полем `usageLimits` из rollout `rate_limits`. |
| `turn.failed` | `{ error: { message } }` | Terminal failure; no further events for the turn. |
| `item.started` / `item.updated` / `item.completed` | `{ item }` | Wraps one of the ThreadItem variants below. |
| `error` | `{ message }` | Fatal stream error (distinct from `turn.failed`). |

Thread items exposed via `event.item`:
- `agent_message`: assistant response (natural language or JSON string when structured output).
- `reasoning`: internal reasoning summary (suppressed in UI when structured outputs are enabled).
- `command_execution`: shell command Invocations, with stdout/stderr aggregation and exit codes.
- `file_change`: patch outcome; includes per-file operations and final status.
- `mcp_tool_call`: invocation lifecycle for Model Context Protocol tools (server, tool, status).
- `web_search`: search queries initiated by Codex.
- `todo_list`: dynamic plan entries with completion status.
- `error`: non-fatal issues surfaced as items.

These structures mirror the JSONL emitted by the CLI. CodeAI-Hub must translate them into our existing `session:stream` schema (either by extending Provider Event Adapter or by wrapping `ThreadEvent` directly).

---

## 6. Authentication & Storage
- Standalone primary flow: interactive ChatGPT login (`codex login`) storing credentials in `~/.codex/auth.json`.
- Alternative: usage-based billing via API key – pass `CODEX_API_KEY` env or `codex login --with-api-key`. Requires Responses API write access.
- CodeAI Hub flow: CLI state is isolated under `CODEX_HOME=~/.codeai-hub/providers/codex/home`. CodeAI Hub does not edit config files and instead uses runtime `--config` overrides; sessions/rollouts must be read from `$CODEX_HOME/sessions/**/rollout-*.jsonl`.
- CLI expects a Git repository by default; global `skip git repo check` toggle via config or per-thread option.
- Remote/headless login patterns: forward port 1455 or copy `auth.json` across machines (see docs/authentication.md).

Implications for CodeAI-Hub:
- Provider installer must ensure CLI is logged in (detect `auth.json`); if missing, surface instruction via RemoteBridge notifications.
- Respect existing `CODEX_HOME` / `CODEX_CONFIG_DIR` overrides if we set them before spawning.

---

## 7. Usage Limits From Provider-Home Rollout (Phase 151)

Source-of-truth для Codex usage limits в Hub — только rollout JSONL в provider-home:
- path: `~/.codeai-hub/providers/codex/home/sessions/**/rollout-*.jsonl`;
- event type: `event_msg.payload.type=token_count`;
- source fields: `payload.rate_limits.primary|secondary`.

Нормализация в UI-контракт `usage_limits`:
- `primary.used_percent` -> `currentSession.percentUsed` (clamp + round 0..100);
- `primary.resets_at` (unix seconds/ms) -> `currentSession.resetsAt` (ISO string);
- `secondary.used_percent` -> `currentWeekAllModels.percentUsed`;
- `secondary.resets_at` -> `currentWeekAllModels.resetsAt`;
- `currentWeekSonnetOnly` всегда `null` (сохранение совместимости с текущим Session UI контрактом).

Delivery contract:
- на `turn_completed` Codex message-processor читает latest rollout snapshot и добавляет `usageLimits` в payload `turn_completed`;
- тот же snapshot публикуется как `stream_event` с `data.kind=usage_limits`;
- PM/UI сохраняет provider-scoped last-known cache и показывает лимиты в `Session ID Bar` сразу при старте новой Codex-сессии (до первого ответа).

---

## 8. Sandbox, Approvals & Safety Flags
- `SandboxMode` options map to CLI `--sandbox` (`read-only`, `workspace-write`, `danger-full-access`).
- Approvals: CLI exposes `--approval-mode` flags (`never`, `on-request`, `on-failure`, `untrusted`). The type is exported but not yet wired inside `ThreadOptions`; we may need to pass it via env/config until the SDK adds direct support.
- Default (no sandbox flag) prohibits file edits/privileged commands; CodeAI-Hub should align with its own approval policy UI when invoking Codex.

---

## 9. Installation & Binary Management
- `@openai/codex-sdk` ships prebuilt binaries under `vendor/<target triple>/codex/` for macOS (x86_64, arm64), Linux (x86_64, arm64), Windows (x86_64, arm64).
- `CodexExec` auto-detects the current platform and selects the bundled binary; override via `codexPathOverride` to use a managed installation (e.g., CodeAI-Hub controlled path).
- Global CLI installs place the executable at `${npm prefix}/bin/codex` (`/Users/oleksandroliinyk/.npm-global/bin/codex` locally).
- Binary updates follow npm package versioning; Auto Update Service проверяет latest на старте и Settings UI показывает текущую/последнюю версии через глобальный npm.

---

## 10. Integration Guidelines for CodeAI-Hub
1. Wrap the SDK inside `packages/Codex_Module/` mirroring Claude module layout (facades, installer, session manager, message processor).
2. Provide an installer that either relies on bundled binaries or downloads official releases when absent, verifying integrity.
3. Expose a Provider Adapter that:
   - Creates/manages `Thread` instances per CodeAI-Hub session.
   - Pipes user prompts (string or structured input) into `runStreamed`.
   - Normalizes `ThreadEvent` → Hub event contract, including token usage and command/file telemetry.
4. Implement resume support by storing `thread.id` in hub session state and calling `codex.resumeThread(id)`.
5. Surface CLI/environment errors through RemoteBridge notifications (e.g., missing auth, unsupported sandbox mode).
6. Ensure sandbox + approval selections from UI are translated into Codex options/env prior to launching the turn.
7. Read `defaultModel` + `reasoningByModel` from `~/.codeai-hub/settings/settings.json` and pass reasoning via `--config model_reasoning_effort=...` when starting turns.
8. Log Codex JSONL to `~/.codeai-hub/logs/codex/` for auditing and future replay (align with Phase 13 persistence plan).
9. (1.1.331+) ProviderVersionService читает версии CLI/SDK из глобального npm; манифесты провайдера используются только для установки модуля.

---

## 11. Known Gaps & Risks
- Approval mode currently lacks a direct setter in the SDK; may require manual flag injection (custom CLI wrapper or config edits) until bindings land.
- Bundled binary approach increases package size; ensure our distribution strategy (manifests vs. direct bundling) stays compliant with project rules.
- CLI expects Git repositories; non-repo workspaces must set `skipGitRepoCheck`, otherwise Codex exits early.
- MCP tooling requires separate configuration (`~/.codex/config.toml`); our provider should tolerate missing servers.
- Potential conflicts with CodeAI-Hub sandbox model (we must reconcile workspace-write vs. danger-full-access semantics before enabling destructive operations by default).

---

## 12. Provider-Home E2E Smoke Checklist (Phase 151)

1. Выполнить любой рабочий Codex turn из CodeAI Hub.
2. Проверить появление/обновление rollout в `~/.codeai-hub/providers/codex/home/sessions/**/rollout-*.jsonl`.
3. Убедиться, что в rollout есть `token_count.rate_limits.primary/secondary`.
4. Проверить stream payload в Core/PM:
   - `turn_completed.usageLimits.currentSession/currentWeekAllModels`;
   - `stream_event.data.kind=usage_limits` с теми же значениями.
5. Создать новую Codex-сессию и проверить, что `Session ID Bar` сразу показывает session/weekly проценты из last-known provider cache.

---

## 13. Next Steps for Phase 12
1. Mirror directory scaffolding from `packages/Claude_Module` for Codex (facades, installer, session lifecycle, message processor).
2. Define Provider Event Adapter transformations from `ThreadEvent`/`ThreadItem` to our unified message schema (basis for cross-provider wrapper).
3. Implement authentication checks (detect `auth.json`, guide user through login).
4. Add smoke tests invoking `thread.runStreamed` against a fixture workspace; capture sample event logs for wrapper design.
5. Update `doc/TODO/todo-plan_Codex_Module.md` once module scaffolding is ready (Phase 12 tracking).
6. Capture protocol diffs vs. Claude in a comparison matrix to inform wrapper design.

---

## 14. Reference Links
- CodeAI Hub structured outputs + thinking UX: `doc/SolidWorks-Flow/knowledge/kb/codex-thinking-display.md`
- Codex SDK overview: https://developers.openai.com/codex/sdk
- TypeScript SDK docs: https://developers.openai.com/codex/sdk#typescript-library
- GitHub repository: https://github.com/openai/codex
- SDK source (TypeScript): https://github.com/openai/codex/tree/main/sdk/typescript
- Non-interactive JSON mode: https://github.com/openai/codex/blob/main/docs/exec.md
- Authentication guide: https://github.com/openai/codex/blob/main/docs/authentication.md
- Sandbox & approvals: https://github.com/openai/codex/blob/main/docs/sandbox.md
- GitHub Action example: https://github.com/openai/codex-action

---

## 15. Proposed Module Layout
| Area | Path | Responsibility |
| --- | --- | --- |
| SDK entry | `packages/Codex_Module/src/index.ts` | Re-export `CodexProviderAdapter` and shared option types. |
| Provider adapter | `packages/Codex_Module/src/provider/codex-provider-adapter.ts` | Public facade for Core: session lifecycle orchestration, listener registry, deferred start until the first user message. |
| Installer | `packages/Codex_Module/src/installer/*` | `codex-installer.ts` (binary acquisition + integrity checks), `npm-runner.ts` (fallback to global npm), `codex-paths.ts` (manifest-driven paths). |
| Auth | `packages/Codex_Module/src/auth/*` | `sdk-auth-manager.ts` detects `auth.json`, prompts RemoteBridge for login guidance, exposes environment variables. |
| Session management | `packages/Codex_Module/src/session/*` | Registry, lifecycle, controller types; mirrors Claude structures with Codex-specific resume hooks. |
| Messaging | `packages/Codex_Module/src/messaging/*` | `message-processor.ts` плюс `structured-output-stream-controller.ts`/`answer-json-stream-extractor.ts` стримят `answer`, транслируют native reasoning как `dialog_message(role=\"thinking\")`, и публикуют structured output (включая flow `artifacts[]`). |
| Logging | `packages/Codex_Module/src/logging/*` | Session logger writing Codex JSONL transcripts under `~/.codeai-hub/logs/codex/`. |
| CLI bridge | `packages/Codex_Module/src/cli/*` | Thin wrapper around `@openai/codex-sdk` (thread factory, stream subscriptions, structured output helpers). |
| Types | `packages/Codex_Module/src/types/*` | Shared types (`CodexModuleOptions`, `CodexInstallerPaths`, normalized event/item shapes, reporter interface). |

Build outputs reside under `packages/Codex_Module/dist/**` mirroring the source layout. A dedicated `package.json` and `tsconfig.json` will align with existing module conventions.

---

## 16. Installer & Provider Adapter Plan
**Installer (`codex-installer.ts`):**
- Read manifest (`assets/providers/codex/manifest.json`) describing versions and download URLs (mirrors Claude delivery).
- Resolve platform-specific target triple; prefer managed cache under `~/.codeai-hub/providers/codex/<version>/codex`.
- Verify SHA-256 before extraction; fall back to bundled vendor binary if checksum fails.
- Detect existing installations: check `codexPathOverride`, managed cache, then global npm prefix (`npm root -g` + `@openai/codex-sdk/vendor`).
- Provide `getExecutablePath()` returning the resolved binary plus metadata (version, source).
- Expose `ensureInstalled()` to download on demand and `loadSDK()` to import `@openai/codex-sdk/dist/index.js` from the managed location with `createRequire`.

**Auth manager (`sdk-auth-manager.ts`):**
- Locate `$CODEX_HOME/auth.json` (CodeAI Hub default: `~/.codeai-hub/providers/codex/home/auth.json`; migrates from `~/.codex/auth.json` if present; allow override via env).
- Surface missing-auth diagnostics through `ModuleReporter.warn` and RemoteBridge notifications (`provider:codex:authRequired`).
- Provide `ensureAuth()` returning env overrides (`CODEX_API_KEY`, `CODEX_HOME`, `CODEX_CONFIG_DIR`) for the provider.

**Provider adapter (`codex-provider-adapter.ts`):**
- Lazily instantiate `Codex` SDK via installer and auth manager; maintain `Thread` objects keyed by CodeAI-Hub session IDs.
- On `createSession()` → call `codex.startThread(threadOptions)`; persist mapping `{ hubSessionId → thread }`; start background task streaming events to `RemoteBridge`.
- Normalize `ThreadEvent` into Hub payloads:
  - `item.*` → emit structured messages (agent/command/file/etc.).
  - `turn.completed` → usage stats.
  - `turn.failed` / `error` → propagate to error channel.
- Handle resume: on real `thread.started` events, capture `thread_id`; support `resumeSession(threadId)` for future reconnects.
- Provide sandbox orchestration: map Hub approvals to CLI `--sandbox` + (future) approval mode using config file edits until official flag is exposed.
- Token usage: для отображения контекстного окна в UI не используем `/status` (это TUI slash-команда и недоступна через `codex exec --json`/SDK). Source-of-truth берём из rollout JSONL событий `token_count` (`used=last_token_usage.total_tokens`, `limit=model_context_window`). `/status` оставляем только как ручную валидацию `used/limit` (процент в TUI может расходиться).

**Message processor (`message-processor.ts`):**
- Maintain per-session outbound queue feeding `thread.runStreamed`.
- Support structured inputs: convert attachments (files/images) to `--image` flags, attach JSON schema when UI requests structured output.
- When structured output is enabled, stream `answer` from JSON; thinking UI опирается на native `reasoning` items (если доступны) и не требует отдельного summary-поля в JSON.
- Префиксовать пользовательский prompt только инструкциями structured output для JSON-схемы (без требований к отдельному полю для thinking).
- Fan-out streamed events to session logger and listener registry; preserve chronological ordering as they arrive from SDK.

---

## 17. Build & Distribution
- Build script: `./scripts/build-codex-module.sh [--version <semver>] [--clean]`.
  - Compiles `packages/Codex_Module`, installs artifacts under `~/.codeai-hub/providers/codex/<version>/`, and creates `codex-module-<version>.tar.bz2` in `doc/tmp/releases/` and the shared local cache `~/.codeai-hub/releases/`.
  - Manifest auto-update: `assets/providers/codex/manifest.json` is rewritten with the archive name, size, and SHA-1 after each build; `baseUrl` in dev и внутренних релизах указывает на локальный cache `file://$HOME/.codeai-hub/releases/` (на основной dev‑машине — `file:///Users/oleksandroliinyk/.codeai-hub/releases/`).
- Managed installs: extension activation (или Core Supervisor в целевой архитектуре) вызывает `ensureProviderModuleInstalled` (shared installer: `src/extension-module/provider/shared/install-provider-module.ts`), который читает манифест из VSIX, ищет архивы в локальных кешах (`downloads/` модуля, затем `~/.codeai-hub/releases/`) и только при необходимости обращается к удалённому URL. В текущей схеме разработки `baseUrl` всегда указывает на локальный `file://` cache, поэтому сетевые загрузки для Codex модуля не используются.
- Release checklist:
  1. Run `npm run build --workspace=@codeai-hub/codex-module`.
  2. Execute `./scripts/build-codex-module.sh --version <semver>`.
  3. For public distribution, publish the archive alongside the core/launcher assets in GitHub Releases so the manifest URL remains valid; для внутренних dev-сборок достаточно убедиться, что архив присутствует в `~/.codeai-hub/releases/` и манифест указывает на локальный `file://` путь.
