# Claude Agent SDK Module

**Updated:** 2025-10-26  
**Owner:** Codex  
**Source Reference:** `/Users/oleksandroliinyk/VSCODE/claude-code-fusion`

---

## 1. Purpose & Scope
- Provide a reusable provider module that connects CodeAI-Hub Core to Anthropic via `@anthropic-ai/claude-agent-sdk` with full session lifecycle management, streaming output, resume support, and auto-updates.
- Document the exact structure of the proven implementation living in `claude-code-fusion` so we never have to rediscover file locations, responsibilities, or data flows.
- Define how this module will slot into CodeAI-Hub Phase 12 (real providers) and unblock Phase 13 (persistence modules depending on real SDK traffic).

Key capabilities we must preserve when porting:
1. Global SDK installer/updater with version checks and cache busting.
2. Subscription-based auth (CLI login) detection + login prompts.
3. Session lifecycle with temporary IDs promoted to real SDK IDs.
4. Real-time streaming over an `EventEmitter`, including `stream_event`, `assistant`, `system`, `result`, and synthetic `user_input` payloads.
5. Session logging (JSONL) and resume support via file scanners and session resumer facades.
6. Two-parser strategy: live SDK event stream + JSONL replay for cold starts.

---

## 2. Repository Map (claude-code-fusion)
| Area | Path | Notes |
| --- | --- | --- |
| SDK Facade | `src/core/sdk-manager-module/SDKManagerFacade.ts` | Entry point used by the extension; thin wrapper over the Direct manager singleton. |
| Direct Manager | `src/core/sdk-manager-module/micro-classes/DirectSDKManagerRefactored.ts` | Coordinates auth, installation, session lifecycle, message processing; exposes singleton `getInstance()`. |
| Installer | `src/core/sdk-manager-module/micro-classes/SDKInstaller.ts` | Ensures global install of `@anthropic-ai/claude-agent-sdk`, checks npm registry for updates, reloads module with cleared cache. |
| Auth Manager | `src/core/sdk-manager-module/micro-classes/SDKAuthManager.ts` | Verifies `claude login`, sets env vars (`CLAUDE_USE_CLI_AUTH`, `CLAUDE_SUBSCRIPTION_MODE`). |
| Session Lifecycle | `src/core/sdk-manager-module/micro-classes/SDKSessionLifecycle.ts` | Creates async generators, builds SDK query options, watches for real session IDs, closes sessions gracefully. |
| Session Registry | `src/core/sdk-manager-module/micro-classes/SDKSessionRegistry.ts` | Map of `sessionId -> ActiveSession` (query instance, emitter, logger). |
| Session Manager | `src/core/sdk-manager-module/micro-classes/SDKSessionManager.ts` | Facade delegating to Registry + Lifecycle; exported to other modules. |
| Message Processor | `src/core/sdk-manager-module/micro-classes/SDKMessageProcessor.ts` | Handles outbound prompts + inbound SDK async iterator; emits normalized events and logs to session logger. |
| Thinking Tokens | `src/core/sdk-manager-module/micro-classes/ThinkingTokensProvider.ts` | Reads VS Code settings, injects `maxThinkingTokens`; detects "Ultrathink" keyword. |
| Query Inspector | `src/core/sdk-manager-module/micro-classes/QueryInspector.ts` | Debug helper that logs properties/methods of SDK query instances. |
| Session Logger | `src/core/sdk-session-logger-module/**` | Facade + micro classes writing JSONL logs into `doc/sdk-sessions/`. Used by session lifecycle + message processor. |
| SDK Feedback Parser | `src/core/sdk-feedback-module/**` | Subscribes to SDK `EventEmitter`, converts events into UI-friendly `ParsedMessage` objects. Requires access to `SDKSessionRegistry`. |
| Resume Facade | `src/extension-module/sdk-session-resumer-module/**` | Scans `~/.claude/projects/<workspace?>/*.jsonl`, validates resumability, calls `SDKManagerFacade.resumeSession()`. |
| Message Provider | `src/extension-module/micro-classes/MessageProviderRefactored.ts` | Wires together SDK manager, handlers, parsers, resumer, streaming mode, and webview messaging. |
| SDK Handlers | `src/extension-module/sdk-handlers-module/**` | Session and query handlers that expose `createNewSession`, `handleQuery`, etc. to the VS Code command layer. |

When porting, focus on the core module (first eight rows). The remaining rows explain how the SDK output is consumed and should inspire equivalent adapters for CodeAI-Hub.

---

## 3. High-Level Architecture
```
User Action
  ↓
MessageProviderRefactored (extension layer)
  ↓ commands / handlers
SDKHandlersFacade
  ↓
SDKManagerFacade / ClaudeSDKManager (core layer facade)
  ↓
DirectSDKManagerRefactored (singleton)
  ├─ SDKAuthManager (CLAUDE login enforcement)
  ├─ SDKInstaller (global install + updates + module loading)
  ├─ SDKSessionManager
  │   ├─ SDKSessionLifecycle (creates async generator / query)
  │   └─ SDKSessionRegistry (tracks emitters, loggers)
  ├─ SDKMessageProcessor (stream parser → EventEmitter + logs)
  └─ SDKSessionLoggerFacade (JSONL logs in ~/.codeai-hub/logs/claude)
```
RemoteBridge (core) subscribes to each Claude session via `ClaudeProviderAdapter`, relays user input through the adapter, and broadcasts `session:message`/`session:stream` events to webview + CEF clients while keeping the legacy SessionManager state in sync.
Additional real-time consumers:
- `SDKFeedbackParserFacade` subscribes to each ActiveSession emitter for live UI updates.
- `SessionSubscriptionManager` + `StreamingModeFacade` split events into incremental UI payloads.
- Resume stack scans `~/.claude/projects/<workspace slug>/` for JSONL history and calls `resumeSession()`.

---

## 4. Initialization & Version Management Flow
1. `SDKManagerFacade.initialize()` (called during extension activation) → `DirectSDKManagerRefactored.initialize()`.
2. `SDKAuthManager.initializeSDKAuth()` ensures `claude login` has been run. On failure it prompts via `vscode.window.showInformationMessage(... 'Open Terminal')`.
3. `SDKInstaller.ensureGlobalSDKInstalled()`:
   - `npm list -g @anthropic-ai/claude-agent-sdk --json` → captures installed version.
   - If missing → `npm install -g @anthropic-ai/claude-agent-sdk@latest` with VS Code progress notifications.
   - If outdated → fetches `https://registry.npmjs.org/@anthropic-ai/claude-agent-sdk/latest`, runs forced update, re-checks version.
   - Stores global path via `npm root -g` and `path.join(root, '@anthropic-ai', 'claude-agent-sdk')`. Для текущей конфигурации нужно явно поддерживать:
     - macOS: `/Users/oleksandroliinyk/.npm-global/lib/node_modules/@anthropic-ai/claude-agent-sdk/`
     - Linux: `~/.npm-global/lib/node_modules/@anthropic-ai/claude-agent-sdk/`
     - Windows: `%USERPROFILE%\\AppData\\Roaming\\npm\\node_modules\\@anthropic-ai\\claude-agent-sdk\\`
4. `loadGlobalSDKModule()` clears `require.cache` for any entry containing `@anthropic-ai/claude-agent-sdk` and returns the module. The Direct manager stores `sdkModule` and `queryFunction` references.
5. Failure paths:
   - Auth errors → prompt login.
   - Module resolution errors → attempt `npm install -g @anthropic-ai/claude-code@latest --force` (legacy fallback) and re-load.
   - Installer errors propagate to the facade so UI can surface `Failed to initialize Claude Agent SDK`.

**Porting note:** Replace VS Code UI prompts with CodeAI-Hub UI messaging / logs, but keep the command list, cache clearing, and registry checks identical.

---

## 5. Session Lifecycle & Message Streaming
### Creation (`SDKSessionLifecycle.createSession`)
1. Generate `temp_<timestamp>` ID; create `MessageController` (queue + resolver) and async generator that waits for user messages.
2. Resolve workspace path and `.claude/projects/<workspace slug>` (currently hard-coded to `-Users-oleksandroliinyk-VSCODE-claude-code-fusion`). Collect `filesBefore` list to later detect new session JSONL.
3. Build SDK options:
   - `cwd := workspace root`.
   - `model := 'default'` (alias for Sonnet 4.5) with `permissionMode: 'bypassPermissions'`.
   - `additionalDirectories := [workspacePath]`.
   - `settingSources := ['user','project','local']`.
   - `includePartialMessages := true` (enables streaming over event emitter).
   - Optional `maxThinkingTokens` from `ThinkingTokensProvider` (Ultrathink detection or config).
4. Invoke `queryFunction({ prompt: generator, options })` from the SDK module; inspect the resulting object for debugging.
5. Create an `EventEmitter` + `SDKSessionLoggerFacade` instance, assemble `ActiveSession` { id, queryInstance, messageGenerator, messageController, eventEmitter, sdkLogger } and store it in `SDKSessionRegistry`.
6. Start `SDKMessageProcessor.processResponses(...)` in the background. It awaits messages from the SDK async iterator and:
   - Emits `eventEmitter.emit('message', payload)` for each `stream_event`, `assistant`, `system`, `result`, etc.
   - Detects the first real `session_id`, emits `realSessionId`, calls back into `SDKSessionManager.updateSessionId(tempId, realId)`, and triggers log renaming.
   - Logs every SDK payload to `doc/sdk-sessions/*.jsonl` via `SDKSessionLoggerFacade`.
   - Immediately after session bootstrap the extension auto-sends a slash-command `/context` as the very first user message. This forces the SDK to materialize a JSONL file whose filename equals the real `session_id` and broadcasts the same `claudeSessionId` inside the SDK feedback stream, letting us promote temp IDs in a single round-trip.
7. Concurrently call `getSessionIdFromSDKFiles(filesBefore)` which looks for a new `.jsonl` file in `.claude/projects/...` and emits `realSessionId` if found sooner.

### Resume (`createSessionWithResume`)
- Wraps query function with `{ ...options, resume: oldSessionId }`.
- Reuses lifecycle logic but swaps registry entries so the resumed session keeps the old ID. Renames log files and ensures `session.eventEmitter` still fires events.

### Message Send (`SDKMessageProcessor.sendMessage`)
- Logs user input, pushes message into `MessageController.pendingMessages`, resolves generator promise, and emits a synthetic `user_input` event with `uuid` for UI parity.

### Session Promotion & Callbacks
- `DirectSDKManagerRefactored.setupSessionProcessing` wires `sessionIdChanged` events so extension handlers (e.g., `SDKSessionHandler`) can notify the UI and other services.

### Close / Cleanup
- `SDKSessionLifecycle.closeSession` pushes `null` through the generator, calls `queryInstance.interrupt()` if available, ends logging, removes the session from registry.
- `cleanup()` iterates over all session IDs and closes them; used on extension deactivate.

---

## 6. Supporting Modules & Data Consumers
1. **SDK Session Logger (`src/core/sdk-session-logger-module/**`):**
   - `SessionFileManager` creates files `doc/sdk-sessions/{sdk-session|sdk-init}-<id>.jsonl`, truncates, renames, and cleans up old logs.
   - `SDKMessageLogger` writes structured entries (session start/end, user inputs, assistant responses, tool use).
   - Required for debugging and for JSONL replay when SDK feedback is unavailable.
2. **SDK Feedback Parser (`src/core/sdk-feedback-module/**`):**
   - `SDKEventListener` subscribes to `ActiveSession.eventEmitter`.
   - `EventHandlerCoordinator` fan-outs to handler classes that normalize `stream_event`, `assistant`, `tool_use`, `result` events into `ParsedMessage` objects.
   - `SessionSubscriptionManager` (extension layer) manages subscriptions per tab and forwards updates to the React UI.
3. **Resume Stack (`src/extension-module/sdk-session-resumer-module/**`):**
   - `SessionFileScanner` indexes `.claude/projects/<workspace>` JSONL files; `LastSessionFinder` sorts by mtime.
   - `ActiveSessionValidator` ensures no live sessions exist before resuming.
   - `ResumeSessionOrchestrator` calls `SDKManagerFacade.resumeSession(oldId)` and listens for `sessionIdChanged` or failure events.
   - `SessionRestorationHandler` repopulates the UI, re-subscribes to feedback parser, and replays history.
4. **Message Provider (`src/extension-module/micro-classes/MessageProviderRefactored.ts`):**
   - Orchestrates buttons, UI routes, SDK handlers, parsers, streaming renderers, and resumers.
   - Also integrates `StreamingModeFacade`, `AssistantResponseFormatter`, `DraftManager`, and settings/draft modules.

These pieces demonstrate how the SDK module feeds both real-time and replay pipelines. Our port must expose similar hooks so CodeAI-Hub Core can push events to both VS Code Webview and the standalone CEF client via the Remote UI Bridge.

---

## 7. Porting Guidelines for CodeAI-Hub
1. **Target Location:**
   - Create `packages/core/src/providers/claude-agent-sdk/` containing the facades/micro-classes from the table above.
   - Expose a provider module implementing the future Provider Registry contract (`connect()`, `sendMessage()`, `subscribe()`, `close()`, etc.).
2. **Singleton Handling:**
   - Keep a single Direct manager instance per core process (mirrors `DirectSDKManagerRefactored.getInstance()`), but wrap it with our Provider Adapter so multiple UI clients can share sessions.
3. **Environment & Auth:**
   - Replace VS Code UI prompts with RemoteBridge notifications/logs; still call `claude login` via CLI when auth fails.
   - Parameterize workspace slug used for `.claude/projects/…` (currently hard-coded). We can compute it from the repository path or let the core orchestrator store it.
4. **Global Installation:**
   - Retain npm-based detection/install/update logic. Ensure CodeAI-Hub’s permission model allows running `npm install -g` and `npm root -g`.
   - Cache the detected version in `~/.codeai-hub/installed-versions.json` (Phase 13 requirement) but source of truth remains npm.
5. **Session Registry Exposure:**
   - Provide read-only hooks so other modules (streaming renderer, resume engine, telemetry) can attach. In CodeAI-Hub this will feed the Provider Event Adapter and Session Manager rather than VS Code-specific facades.
6. **Event Normalization:**
   - Preserve event payloads emitted today (types + fields). Our UI already understands `stream_event`, `assistant`, `system`, `result`, `user_input`; use the same shapes for consistency.
7. **Logging & Resume:**
   - Port `sdk-session-logger-module` so sessions are recorded under `doc/sdk-sessions/` (or a new path under `~/.codeai-hub/logs/claude/`).
   - Reuse JSONL reader logic from `dialog-parser-module` if we need fallback resume while Provider Registry is still file-based.
8. **Testing Strategy:**
   - Use the existing jest tests under `src/test/sdk-session-resumer` as references for new unit tests verifying session promotions, resume, and validation.
9. **Code Style Updates:**
   - Ensure TypeScript files comply with CodeAI-Hub rules (no `any`, `console`, etc.). This may require introducing strict types for SDK events and replacing Node `events` with typed emitters.

---

## 8. Known Gaps & Risks (from source project)
- Hard-coded workspace slug (`-Users-oleksandroliinyk-VSCODE-claude-code-fusion`) appears in `SDKSessionLifecycle` and `SDKMessageProcessor`. Must be parameterized.
- Mixed references to `@anthropic-ai/claude-code` still exist (fallback reinstall path). Verify whether Agent SDK alone is sufficient or if CLI fallback is required.
- VS Code progress + message APIs are used heavily; CodeAI-Hub must map them to its own notification bus.
- Installer assumes unrestricted `npm install -g`. Need sandbox strategy for users without global npm privileges.
- Logging path is inside the repo (`doc/sdk-sessions`). CodeAI-Hub should move this to `~/.codeai-hub/sessions/` to avoid polluting workspaces.

---

## 9. Next Steps for Phase 12
1. Mirror the directory structure under `packages/core/src/providers/claude-agent-sdk/` and scaffold TypeScript modules with Biome-compliant style.
2. Introduce a Provider Adapter that wraps `SDKManagerFacade` and exposes CodeAI-Hub’s Provider contract (create session, send message, subscribe, close, resume).
3. Implement installer/auth flows and wire them into Core bootstrap so the provider becomes available through `ProviderRegistry`.
4. Hook the event emitter into `RemoteBridge` so both VS Code Webview and CEF clients receive the same `session:stream` events.
5. Define persistence hooks so Phase 13 modules can write JSONL/log metadata to disk using data emitted by this provider.

This document is the canonical reference for the Claude Agent SDK module. Re-read only this file before working on the provider; use the path table above whenever you need to inspect the original implementation.

---

## 10. Build & Distribution Snapshot (2025-10-26)
- Build with `./scripts/build-claude-module.sh`: compiles `packages/Claude_Module`, installs it to `~/.codeai-hub/providers/claude/<version>/`, and produces `doc/tmp/releases/claude-module-<version>.tar.bz2`.

## 11. SDK Loader Notes (2025-10-26)
- Node 20 запрещает прямой `import` каталога `@anthropic-ai/claude-agent-sdk`. Попытка загрузить папку приводит к `ERR_UNSUPPORTED_DIR_IMPORT` и блокирует запуск Core.
- `SDKInstaller` теперь хранит путь до каталога модуля **и** до конкретного entry-файла `sdk.mjs`. После установки он проверяет наличие этого файла и импортирует его через `import(pathToFileURL(entryPath))`.
- Любые адаптеры или диагностические скрипты должны использовать `sdk.mjs` как единственный допустимый entrypoint SDK. Это гарантирует, что одинаковый файл используется как в коде модуля, так и во внешних проверках.
- Installer дополнительно находит исполняемый CLI (`~/.npm-global/bin/claude` на Unix, `%APPDATA%\\npm\\claude.cmd` на Windows) и передаёт его в SDK через `pathToClaudeCodeExecutable`, чтобы процесс запускался через штатный shebang (`/usr/bin/env node`) и обходил ограничения `pkg` Node 18.
- The VS Code extension exports `CLAUDE_MODULE_PATH` (read from `~/.codeai-hub/providers/claude/latest`) when launching the core so RemoteBridge loads the freshly installed adapter instead of the bundled workspace copy.
- The orchestrator still bundles a fallback dependency, but `ProviderRegistry` now dynamically `require()`s the override path first—allowing Claude Module updates without rebuilding the core binary.
- Session logs emitted by `SDKSessionLoggerFacade` now live under `~/.codeai-hub/logs/claude/session-*.jsonl`; future maintenance tasks should add rotation/cleanup here.
