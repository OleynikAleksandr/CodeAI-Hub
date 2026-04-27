# Provider SDK Logs Removal Refactor 1.2.94

**Date:** 2026-04-27
**Status:** planning
**Scope:** remove provider-owned SDK/raw file-backed logs under `~/.codeai-hub/logs/{claude,codex,gemini}`

## Problem

CodeAI Hub currently has multiple provider-side diagnostic mirrors that write or historically wrote SDK/raw transport data under the global logs folder:

- Claude: `~/.codeai-hub/logs/claude/sdk-claude-*.jsonl`;
- Codex: `~/.codeai-hub/logs/codex/sdk-codex-*.jsonl` / app-server transport variants;
- Gemini: `~/.codeai-hub/logs/gemini/sdk-gemini-*.jsonl`.

These logs are not runtime state. Core does not use them to route messages, recover dialogs, render Session UI, translate reasoning, or switch providers. The working data path is the live provider stream plus CodeAI Hub normalized session-local history.

The Codex retest line showed that even diagnostic logging work near the request hot path can correlate with model/app-server behavior changes. Release `1.2.93` disabled Codex SDK transport file writes, but the no-op Codex logger object and older Claude/Gemini file-backed logger surfaces still exist in code.

## Goal

Remove the provider SDK/raw file-backed logging layer completely from runtime code, including object creation and dead shims.

After this refactor:

- provider modules must not create `~/.codeai-hub/logs/claude`, `~/.codeai-hub/logs/codex`, or `~/.codeai-hub/logs/gemini`;
- provider modules must not construct SDK/raw session logger objects for these folders;
- provider hot paths must not call SDK/raw log methods before request dispatch, stream fan-out, or turn finalization;
- no no-op compatibility shim should remain for the removed SDK loggers;
- tests must not depend on SDK log JSONL files as proof of runtime behavior.

## Non-Goals

This refactor must not remove these diagnostic or runtime evidence layers:

- session-local normalized history under `~/.codeai-hub/sessions/**`;
- provider-home native artifacts under `~/.codeai-hub/providers/**`;
- Core-owned native request capture under `~/.codeai-hub/logs/native-request-capture/**`;
- Core/reporter fatal, warn, and error logs that are not SDK/raw provider JSONL mirrors;
- user-visible Session UI events, dialog JSONL persistence, translation overlays, usage telemetry, or provider-home resume data.

## Current Code Inventory

### Codex

Runtime files:

- `packages/Codex_AppServer_Module/src/app-server/process/codex-app-server-process.ts`
- `packages/Codex_AppServer_Module/src/app-server/process/codex-app-server-session-logger.ts`

Current state:

- `codex-app-server-session-logger.ts` is a no-op compatibility shim after `1.2.93`;
- `CodexAppServerProcess` still constructs `CodexAppServerSessionLogger`;
- request/response/notification lifecycle methods are still called even though they do nothing.

Required end state:

- delete the shim file;
- remove the import, field, and every `sessionLogger.*` call from the app-server process;
- keep app-server JSON-RPC behavior unchanged.

### Claude

Runtime files:

- `packages/Claude_Module/src/logging/sdk-session-logger.ts`
- `packages/Claude_Module/src/session/session-manager.ts`
- `packages/Claude_Module/src/session/types.ts`
- `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`
- `packages/Claude_Module/src/messaging/message-processor.ts`

Current state:

- `SDKSessionLoggerFacade` writes JSONL under `~/.codeai-hub/logs/claude`;
- `SDKSessionManager` creates a logger by default;
- `ClaudeSDKManager` also passes new logger instances explicitly;
- `SDKMessageProcessor` logs user input and SDK messages through `session.logger`;
- promotion and close paths call logger lifecycle methods.

Required end state:

- no `SDKSessionLoggerFacade`;
- no `SessionLogger` field on Claude `ActiveSession`;
- no `logUserInput`, `logSDKMessage`, `start`, `end`, or `renameSession` calls for SDK file logging;
- Claude runtime still emits normal user-visible events and provider/session lifecycle events.

### Gemini

Runtime files:

- `packages/Gemini_Module/src/logging/session-logger.ts`
- `packages/Gemini_Module/src/provider/gemini-provider-adapter.ts`
- `packages/Gemini_Module/src/session/types.ts`
- `packages/Gemini_Module/src/session/gemini-session-bootstrapper.ts`
- `packages/Gemini_Module/src/session/gemini-session-manager.ts`
- `packages/Gemini_Module/src/session/gemini-session-store.ts`
- `packages/Gemini_Module/src/session/gemini-session-lifecycle.ts`
- `packages/Gemini_Module/src/session/gemini-tool-call-orchestrator.ts`
- `packages/Gemini_Module/src/messaging/message-processor.ts`
- `packages/Gemini_Module/src/messaging/gemini-assistant-event-normalizer.ts`
- `packages/Gemini_Module/src/messaging/gemini-system-event-normalizer.ts`

Current state:

- `GeminiSessionLogger` writes raw events under `~/.codeai-hub/logs/gemini`;
- `GeminiProviderAdapter` constructs it for every managed session;
- session, tool, and messaging paths call logger methods for raw events, user input, tool events, and errors.

Required end state:

- no `GeminiSessionLogger`;
- no `logger` field or `logger` creation option on Gemini `ActiveSession` / session creation options;
- no raw event, user input, tool event, model event, finished event, or error logging through the removed logger;
- Gemini runtime still emits normal normalized stream events and keeps provider-home resume artifacts untouched.

## Target Architecture

Provider modules should have no always-on SDK/raw JSONL mirror under `~/.codeai-hub/logs`.

The diagnostic stack becomes:

1. **Runtime truth:** live provider stream handled by provider adapters and Core.
2. **Display/history truth:** normalized session-local JSONL under `~/.codeai-hub/sessions/**`.
3. **Provider-native evidence:** provider-home artifacts under `~/.codeai-hub/providers/**`.
4. **On-demand network/request diagnostics:** Core-owned native request capture under `~/.codeai-hub/logs/native-request-capture/**`.

If provider SDK/raw logging is needed again later, it must return as an explicit opt-in diagnostic mode outside the provider hot path, not as an always-on runtime object.

## Implementation Rules

- Remove construction first, then remove dead type/call surfaces.
- Do not replace removed file-backed loggers with no-op classes.
- Do not move these SDK/raw JSONL files into another folder.
- Do not use SDK logs in tests as source of truth.
- Preserve user-visible stream events and session-local dialog persistence.
- Keep each implementation micro-task within the `<= 3 files` rule. If TypeScript test cleanup needs more files than expected, split the task before committing.

## Verification

Minimum checks before release:

- `rg -n "SDKSessionLoggerFacade|GeminiSessionLogger|CodexAppServerSessionLogger|sdk-claude|sdk-gemini|sdk-codex|logs/claude|logs/gemini|logs/codex" packages doc`
- `npm run build --workspace @codeai-hub/codex-app-server-module`
- `npm run build --workspace @codeai-hub/claude-module`
- `npm run build --workspace @codeai-hub/gemini-module`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

Manual acceptance:

- fresh Codex Description turn still produces ordinary progress messages;
- no provider-created SDK/raw JSONL appears under `~/.codeai-hub/logs/{claude,codex,gemini}`;
- session-local JSONL and provider-home native artifacts still appear where expected.

