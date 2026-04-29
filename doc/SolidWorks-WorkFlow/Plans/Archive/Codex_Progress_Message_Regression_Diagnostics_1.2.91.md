# Codex Progress Message Regression Diagnostics 1.2.91

**Date:** 2026-04-27
**Status:** active diagnostic report
**Scope:** Codex ordinary assistant progress messages in Description turns

## Problem

The controlled rollback line restored ordinary Codex progress messages in releases `1.2.87`, `1.2.88`, and `1.2.90`, but releases `1.2.89` and `1.2.91` reproduced the missing-progress behavior.

The user-visible symptom is:

- many visible `Thinking` / reasoning paragraphs;
- no ordinary assistant progress messages during the turn;
- one ordinary assistant answer only at the end.

## Confirmed Evidence

### 1.2.90 success

Release `1.2.90` restored the flat Codex app-server SDK log layout while keeping per-thread sublogs:

- process log: `~/.codeai-hub/logs/codex/sdk-codex-app-server-*.jsonl`;
- thread log: `~/.codeai-hub/logs/codex/sdk-codex-app-server-thread-<threadId>-*.jsonl`.

Fresh retest results:

- run 01: `4` completed `agentMessage`, `21` completed reasoning, `19` completed command execution, `1` completed turn;
- run 02: `5` completed `agentMessage`, `18` completed reasoning, `16` completed command execution, `1` completed turn;
- matching dialog JSONL contained `4` and `5` ordinary assistant messages respectively.

### 1.2.91 failure

Release `1.2.91` restored split log folders and split file names, but did not restore the extra `thread_log_created` process-log record:

- process log: `~/.codeai-hub/logs/codex/app-server-process/sdk-codex-app-server-process-*.jsonl`;
- thread log: `~/.codeai-hub/logs/codex/threads/sdk-codex-thread-<threadId>-*.jsonl`;
- `thread_log_created`: `0`.

Fresh retest results:

- thread sublog: `1` completed `agentMessage`, `32` completed reasoning, `30` completed command execution, `1` completed turn;
- process log: same counts;
- dialog JSONL: `1` ordinary assistant message and `17` thinking messages.

This means Core/UI did not drop ordinary progress messages after receipt. The app-server/model emitted only one ordinary `agentMessage`, at the end.

### 1.2.92 success

Release `1.2.92` kept the split file names from `1.2.91`, but removed the split folders:

- process log: `~/.codeai-hub/logs/codex/sdk-codex-app-server-process-*.jsonl`;
- thread log: `~/.codeai-hub/logs/codex/sdk-codex-thread-<threadId>-*.jsonl`;
- no `app-server-process/` or `threads/` subdirectories.

Fresh retest results with `gpt-5.2`, `effort = xhigh`, and `summary = detailed`:

- run 01: `4` completed `agentMessage`, `23` completed reasoning, `21` completed command execution, `1` completed turn;
- run 02: `5` completed `agentMessage`, `19` completed reasoning, `17` completed command execution, `1` completed turn;
- run 03: `4` completed `agentMessage`, `16` completed reasoning, `14` completed command execution, `1` completed turn;
- process-wide log matched the three thread sublogs: `13` completed `agentMessage`, `58` completed reasoning, `52` completed command execution, `3` completed turns;
- matching dialog JSONL contained `4`, `5`, and `4` ordinary assistant messages respectively.

This confirms that split file names are not the trigger. The strongest remaining suspect is filesystem work from the split-folder layout, especially separate thread-log folder creation / mkdir timing.

### System instructions are present

Provider Native Request Capture for `1.2.91` confirmed:

- app-server `baseInstructions` length: `5735`;
- provider-network native `instructions` length: `5735`;
- `baseInstructions === native instructions`;
- native `instructions` include the full `## Progress Updates` section.

Therefore, the current evidence does not support the hypothesis that the system prompt is missing.

### Translation anomaly is separate

In the same `1.2.91` turn:

- `17` thinking messages entered the translation pipeline;
- `16` completed and produced overlays;
- `1` returned `Session translation returned non-translated result`.

This explains the one untranslated reasoning paragraph, but it does not explain missing ordinary progress messages because upstream emitted only one `agentMessage`.

## Code Diff Between 1.2.90 and 1.2.91

Ignoring version and manifest bumps, the runtime code change is only in `packages/Codex_AppServer_Module/src/app-server/process/codex-app-server-session-logger.ts`.

Changed from `1.2.90` to `1.2.91`:

- added `PROCESS_LOG_ROOT = LOG_ROOT/app-server-process`;
- added `THREAD_LOG_ROOT = LOG_ROOT/threads`;
- changed process file prefix to `sdk-codex-app-server-process`;
- changed thread file prefix to `sdk-codex-thread`;
- changed process `mkdir(...)` from `LOG_ROOT` to `PROCESS_LOG_ROOT`;
- changed thread `mkdir(...)` from `LOG_ROOT` to `THREAD_LOG_ROOT`;
- kept `thread_log_created` disabled.

No prompt/profile code changed in this diagnostic step.

## Current Interpretation

It is not credible to say that "folders affect the model" directly.

The plausible mechanism is a transport timing / scheduling side effect:

- `logRequest(payload)` runs before `child.stdin.write(...)`;
- first thread-bound logging creates thread-log state during the `thread/start` / `turn/start` sequence;
- the split-folder version starts a separate async `mkdir(THREAD_LOG_ROOT)` / `appendFile(...)` path for the thread log;
- this changes event-loop timing around the app-server request/response and turn start boundary.

Codex progress messages are not a strict deterministic protocol guarantee. They are model/app-server behavior influenced by rollout timing, model selection, reasoning effort, cache, and stream cadence. Small timing changes can therefore change whether the model chooses to emit ordinary progress text or only reasoning summaries.

## Known Confounders

The failing `1.2.91` turn used:

- `model`: `gpt-5.2`;
- `effort`: `xhigh`;
- `summary`: `detailed`.

Some earlier successful runs used different visible model configuration. Future retests must keep model, effort, translation engine, workspace freshness, and scenario stable when comparing logger variants.

## Next Diagnostic Release

Release `1.2.93` should remove Codex SDK transport logs entirely:

- make `codex-app-server-session-logger.ts` a no-op compatibility shim;
- do not create process-wide SDK logs;
- do not create per-thread SDK sublogs;
- keep live app-server JSON-RPC routing, provider-home rollout artifacts, session-local normalized dialog JSONL, and native request capture untouched.

Expected interpretation:

- if ordinary progress messages stay stable, Codex SDK transport logs are confirmed as diagnostics-only and should remain disabled by default;
- if ordinary progress messages regress even with no SDK transport logs, the logger path is not the active trigger and the investigation must move back to model/effort/prompt/runtime confounders.

## Longer-Term Fix Direction

If logger timing keeps correlating with progress-message behavior, the robust fix is architectural:

- make app-server transport writes independent from SDK log file writes;
- avoid any filesystem bootstrap from the request hot path;
- enqueue lightweight in-memory log records and let a separate worker drain them;
- preserve diagnostics without changing timing before `child.stdin.write(...)`.

After the `1.2.92` retest, the preferred longer-term direction is simpler: keep Codex SDK transport logs disabled unless a future explicit diagnostic mode needs them. Runtime observability should use session-local normalized transcripts, provider-home rollout artifacts, and native request capture.
