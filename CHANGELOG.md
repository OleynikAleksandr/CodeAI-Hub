# Changelog

This project evolves quickly during active FLOW development. We keep the changelog intentionally short and treat the code + docs as the primary source of truth.

Historical entries below the cleanup releases are retained as release history
only; they are not active runtime contracts after the managed step/workflow
orchestrator removal.

## [Unreleased]

## [1.2.596] - 2026-06-23
### Fixed
- **Local Models runtime loads no longer block on hidden LM Studio CLI prompts.**
  Core now passes `--yes` to `lms load`, so fuzzy keys such as
  `hy-mt2-30b-a3b-mlx` select the intended downloaded model instead of waiting
  for an interactive "multiple models match" prompt that Project Manager cannot
  answer.

### Verification
- `lms load hy-mt2-30b-a3b-mlx --context-length 8192 --identifier codeaihub-probe-key --estimate-only --yes`
- `npx tsx --test packages/core/src/local-models/local-models-runtime-load-manager.test.ts packages/core/src/local-models/local-models-provider-adapter.selection.test.ts packages/core/src/local-models/local-models-provider-adapter.test.ts packages/core/src/local-models/local-models-warmup-service.test.ts packages/core/src/local-models/local-models-facade.test.ts`
- `npm run plan:validate`

## [1.2.595] - 2026-06-23
### Fixed
- **Local Models workflow-agent warmup no longer blocks Core startup.**
  Startup/settings warmup still protects selected LM Studio model keys, but
  defers workflow-agent `lms load` until a real Local Models turn starts. Heavy
  or stuck local workflow model loads can no longer make Project Manager think
  Core is unreachable before the user can switch models.
- **Local Models workflow-agent loads default to 8192 context.** Larger local
  prompts can still opt in with `CODEAI_LMSTUDIO_AGENT_CONTEXT_LENGTH`.

### Verification
- `npx tsx --test packages/core/src/local-models/local-models-runtime-load-manager.test.ts packages/core/src/local-models/local-models-warmup-service.test.ts packages/core/src/local-models/local-models-provider-adapter.test.ts packages/core/src/local-models/local-models-provider-adapter.selection.test.ts packages/core/src/local-models/local-models-provider-adapter.tools.test.ts`
- `npm run plan:validate`

## [1.2.594] - 2026-06-23
### Fixed
- **Standalone Local Models chats now seed a concrete LM Studio model at session creation.**
  New standalone Local Models sessions pass the selected `targetModelId` from
  Settings/start-card discovery instead of relying on the legacy `local-model`
  fallback.

### Verification
- `npx tsx --test src/client/project-manager/components/layout/workspace-chat-list-open.test.ts`
- `npm run build:project-manager`
- `npm run plan:validate`

## [1.2.593] - 2026-06-23
### Fixed
- **Local Models standalone chats now honor the selected LM Studio model.**
  Runtime turns accept both raw `modelKey` and `lmstudio:<modelKey>` ids, and
  an explicit unavailable model now fails clearly instead of falling back to the
  first discovered local model.
- **The lower status panel shows Local Models model identity.** Local Models
  sessions render the selected model from `status.models[0]`; the existing Kimi
  provider tint mapping was also corrected to the available Kimi class.

### Verification
- `npx tsx --test packages/core/src/local-models/local-models-provider-adapter.selection.test.ts`
- `npx tsx --test src/client/ui/src/session/status-panel.test.tsx`
- `npm run plan:validate`

## [1.2.592] - 2026-06-23
### Fixed
- **Kimi standalone chats no longer mirror concurrent session output.** ACP
  frames and permission requests with a provider `sessionId` now route only to
  the matching `kimi:<sessionId>` listener.
- **Kimi stream buffering is isolated per provider session.** Buffered
  assistant/thinking chunks from concurrent Kimi turns no longer share one
  normalizer buffer.

### Verification
- `npm run build --workspace @codeai-hub/kimi-module`
- `node --test packages/Kimi_Module/dist/provider/kimi-provider-adapter.test.js`
- `npm test --workspace @codeai-hub/kimi-module`
- `npm run plan:validate`

## [1.2.591] - 2026-06-23
### Fixed
- **Kimi lower status panel now receives token usage after a turn.** When Kimi
  ACP omits `usage_update`, the provider reads the native session `wire.jsonl`
  usage record and publishes a context-window `tokenUsage` snapshot for the
  existing `Токены:` chip.

### Verification
- `npm run build --workspace @codeai-hub/kimi-module`
- `node --test packages/Kimi_Module/dist/provider/kimi-native-token-usage-reader.test.js`
- `npm test --workspace @codeai-hub/kimi-module`
- `npm run plan:validate`

## [1.2.590] - 2026-06-22
### Fixed
- **Standalone chat Markdown headings no longer render as huge title text.**
  Provider/user-facing message cards now normalize `h1`-`h6` to compact chat
  typography while leaving normal body text unchanged.

### Verification
- `npm run build:webview`
- `npm run plan:validate`

## [1.2.589] - 2026-06-22
### Added
- **GLM Native receives workspace custom instructions.** Standalone GLM chats
  now include root `AGENTS.md` content in the provider-visible system context
  as `Applicable AGENTS.md instructions` when the file exists.

### Notes
- Kimi is unchanged; Kimi CLI/ACP already injects workspace instructions and
  exposes its native tool surface.
- Future GLM work remains focused on real executable/bridged capabilities for
  subagents, media reading, skills, and background task lifecycle.

### Verification
- `npm run build --workspace=@codeai-hub/glm-module`
- `npm test --workspace=@codeai-hub/glm-module`
- `npm run plan:validate`

## [1.2.588] - 2026-06-22
### Fixed
- **GLM `edit_file_by_anchor` schema now matches the executor.** The tool
  contract tells agents to pass string anchors returned by
  `read_file_anchored`, not numeric line ranges.
- **GLM `browser_fetch` can find local Chrome reliably on macOS.** The
  resolver checks the standard Google Chrome application executable and honors
  `CODEAI_GLM_BROWSER_PATH` for custom browser locations.

### Verification
- `npm run build --workspace=@codeai-hub/glm-module`
- `npm test --workspace=@codeai-hub/glm-module`
- Manual `browser_fetch` against `https://example.com` through
  `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- `npm run plan:validate`

## [1.2.587] - 2026-06-22
### Added
- **GLM Native exposes the expanded standalone tool surface.** GLM now has
  executable tools for anchored file reads/edits, exact string edits,
  best-effort code symbol navigation, rendered browser fetch, structured Git
  wrappers, and structured test command results.
- **The GLM tool contract is documented in the module SSOT.**
  `doc/SolidWorks-WorkFlow/Modules/GLM_Native.md` now lists every current GLM
  Native tool, executor owner, and limitation so prompt/tooling changes do not
  require reading provider code first.

### Notes
- Kimi still uses the native ACP tool surface. CodeAI-owned expanded tools
  require a separate ACP/MCP bridge before they can be executable in Kimi.
- GLM code navigation is best-effort lexical navigation, not a full tsserver
  LSP integration.

### Verification
- `npm run build --workspace=@codeai-hub/glm-module`
- `npm test --workspace=@codeai-hub/glm-module`
- `npm run plan:validate`

## [1.2.586] - 2026-06-22
### Fixed
- **GLM Native follows Settings language choices in provider-visible
  instructions.** Chat replies, progress/thinking summaries, and generated
  artifact prose now receive explicit language codes from Core applied turn
  config.
- **GLM file search tools now work for smoke-test paths.** `grep_files`
  supports file paths as well as directories, `glob_files` returns exact file
  matches, and the process PATH includes common Homebrew locations for `rg`.
- **GLM `apply_patch` no longer spawns a missing binary.** The provider now
  applies Codex-style patch payloads through an in-process executor.
- **GLM `web_fetch` flags likely JS-rendered shells.** Sparse HTML shells are
  returned with `partial: true` and a warning instead of being presented as
  complete page content.

### Verification
- `npm run build --workspace=@codeai-hub/core`
- `npm test --workspace=@codeai-hub/core`
- `npm run build --workspace=@codeai-hub/glm-module`
- `npm test --workspace=@codeai-hub/glm-module`
- `npm run plan:validate`

## [1.2.585] - 2026-06-22
### Changed
- **GLM Native now exposes provider-owned executable tools.** Standalone GLM
  chats receive GLM-owned function tools for shell commands, workspace search,
  file read/write, patch application, web search, web fetch, and workflow
  artifact writes.
- **Removed the copied Codex-native baseline from GLM.** GLM no longer embeds
  Codex-native tool descriptions or ships the old captured Codex baseline file
  in its provider module.

### Verification
- `npm run build --workspace=@codeai-hub/glm-module`
- `npm test --workspace=@codeai-hub/glm-module`
- `npm run plan:validate`

## [1.2.584] - 2026-06-22
### Fixed
- **GLM Native retries `EPIPE` provider disconnects.** `EPIPE: write EPIPE`
  is now classified as retryable for GLM standalone turns.
- **GLM retry timing is short and non-increasing.** GLM uses one non-nested
  request retry loop with up to 8 attempts, a fixed 500 ms default retry delay,
  and a 1500 ms cap for provider `retry-after` hints.

### Notes
- The retest also showed GLM can call declared-but-unwired tools such as
  `web_search`. Those tools still return explicit not-wired results until we
  decide whether to bridge or prune them.

### Verification
- `npm run build --workspace @codeai-hub/glm-module`
- `npm test --workspace @codeai-hub/glm-module`
- `npm run plan:validate`

## [1.2.583] - 2026-06-22
### Added
- **GLM Native sends Codex-native tools as executable GLM function tools.**
  The full captured Codex tool surface is converted into GLM/Z.AI-compatible
  `tools` entries instead of being embedded as JSON inside the system prompt.

### Changed
- **GLM tool loop headroom increased for provider retries.** GLM standalone
  chats can now run up to 64 tool-loop steps.
- **GLM local execution starts with `exec_command`.** GLM can execute shell
  commands through the local bridge in addition to the existing
  `write_workflow_artifact` workflow artifact writer. Other declared
  Codex-compatible tools return explicit not-yet-wired results until we choose
  which bridges to keep.

### Verification
- `npm run build --workspace @codeai-hub/glm-module`
- `npm test --workspace @codeai-hub/glm-module`
- `npm run plan:validate`

## [1.2.582] - 2026-06-22
### Added
- **GLM Native and Kimi receive the Codex-native baseline in system context.**
  Both providers now include the captured Codex-native system instructions and
  full captured Codex-native tool definition list for comparison testing.

### Notes
- The executable tool surfaces are unchanged in this test release: GLM still
  exposes its `write_workflow_artifact` HTTP tool loop, and Kimi still exposes
  its managed ACP file/shell tool profile. The Codex-native tool list is
  included as system context so the next retest can show what each provider
  understands before pruning.

### Verification
- `npm run build --workspace @codeai-hub/glm-module`
- `npm run test --workspace @codeai-hub/glm-module`
- `npm run build --workspace @codeai-hub/kimi-module`
- `npm run test --workspace @codeai-hub/kimi-module`
- `node --test packages/Kimi_Module/dist/provider/kimi-managed-agent-profile.test.js`
- `npm run plan:validate`

## [1.2.581] - 2026-06-22
### Added
- **Capture Workbench can delete captured documents.** The detached Workbench
  now has a `Delete captures` action that clears the Workbench index and
  removes only the referenced `.md`/`.jsonl` capture artifacts from the native
  request capture logs.

### Fixed
- **Vanilla capture mode now survives the Project Manager bridge.** Re-capture
  Vanilla keeps `captureMode: "vanilla"` through the Core bridge instead of
  falling back to Managed defaults.

### Verification
- `node --test --import tsx src/client/project-manager/components/capture-workbench/snapshot-cards-row.test.tsx`
- `node --test --import tsx packages/core/src/remote-bridge/handlers/workbench-state-persistence-handler.test.ts`
- `node --test --import tsx packages/core/src/remote-bridge/remote-bridge-message-router.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm run typecheck:webview`
- `npm run build:webview`
- `npm run lint`
- `npm run check:knip`
- `npm run plan:validate`

## [1.2.580] - 2026-06-22
### Added
- **Provider Native Request Capture now supports a Vanilla baseline path.**
  Capture Workbench can run Vanilla captures separately from Managed captures,
  and the diff view can compare current Managed vs Vanilla snapshots when both
  sides exist.

### Fixed
- **Claude and Codex Vanilla captures omit CodeAI-managed prompt/tool
  overrides.** Claude keeps only required SDK infrastructure, while Codex starts
  the default app-server profile without workflow base instructions or managed
  config overrides.
- **Workflow step cleanup preserves standalone Chats.** Deleting workflow steps
  prunes only workflow-bound provider sessions and no longer removes standalone
  workspace chats or histories by broad filename fragments.

### Verification
- `node --test --import tsx src/client/project-manager/services/capture-workbench-runner.test.ts src/client/project-manager/components/capture-workbench/snapshot-cards-row.test.tsx src/client/project-manager/components/capture-workbench/diff-renderer.test.tsx packages/core/src/provider-network-capture/native-request-capture-facade.test.ts packages/Claude_Module/src/diagnostics/claude-native-request-capture-service.test.ts packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.test.ts packages/core/src/remote-bridge/handlers/workflow-step-clear-service.standalone.test.ts packages/core/src/remote-bridge/handlers/workflow-step-clear-service.test.ts`
- `npm run typecheck:webview`
- `npm run build --workspace @codeai-hub/core`
- `npm run build --workspace @codeai-hub/claude-module`
- `npm run build --workspace @codeai-hub/codex-app-server-module`
- `npm run plan:validate`

## [1.2.579] - 2026-06-22
### Fixed
- **Detached CEF popup close prepares the native window before CEF teardown.**
  Disposable macOS popup windows now run native close prep from `CanClose`,
  disable the AppKit close animation, and order the `NSWindow` out before CEF
  is allowed to continue its close path.

### Verification
- `node --test packages/cef-launcher/src/launcher-app-paint.test.mjs`
- `./scripts/build-cef-launcher.sh --launcher-version 1.2.578`
- `npm run plan:validate`

## [1.2.578] - 2026-06-22
### Fixed
- **Detached CEF popup close uses the native macOS window layer.** The CEF
  launcher now paints the AppKit `NSWindow` dark and orders it out before CEF
  browser-view teardown can expose a white backing frame during close.

### Verification
- `node --test packages/cef-launcher/src/launcher-app-paint.test.mjs`
- `./scripts/build-cef-launcher.sh --launcher-version 1.2.577`
- `npm run plan:validate`

## [1.2.577] - 2026-06-22
### Fixed
- **Detached CEF popup windows hide before close teardown.** The CEF launcher
  now hides disposable detached popups in `OnWindowClosing`, after repainting
  them dark, so the browser-view teardown does not expose a white native backing
  frame during close.

### Verification
- `node --test packages/cef-launcher/src/launcher-app-paint.test.mjs`
- `./scripts/build-cef-launcher.sh --launcher-version 1.2.576`
- `npm run plan:validate`

## [1.2.576] - 2026-06-22
### Fixed
- **Detached CEF popup windows keep dark paint through theme resets.** The CEF
  launcher now reapplies the Project Manager dark background from window and
  browser-view theme callbacks, covering the remaining white open/close flash
  seen after `1.2.575`.

### Verification
- `node --test packages/cef-launcher/src/launcher-app-paint.test.mjs`
- `./scripts/build-cef-launcher.sh --launcher-version 1.2.575`
- `npm run plan:validate`

## [1.2.575] - 2026-06-22
### Fixed
- **Saved standalone Chats open correctly on the first try after Core restart.**
  Project Manager no longer opens a pending detached shell for saved chats
  without a live runtime id; it waits for Core to restore the matching
  provider session and opens the detached window with the real `sessionId`.
- **Detached CEF windows paint dark before the first visible frame.** The CEF
  launcher now applies the Project Manager dark background to the window theme
  and browser view before attaching/showing the view, covering the native
  pre-paint white content frame.

### Verification
- `node --test --import tsx src/client/project-manager/components/layout/workspace-chat-list-open.test.ts`
- `npm run typecheck:webview`
- `npm run build:project-manager`
- `node --test packages/cef-launcher/src/launcher-app-paint.test.mjs`
- `./scripts/build-cef-launcher.sh --launcher-version 1.2.574`
- `npm run plan:validate`

## [1.2.574] - 2026-06-21
### Fixed
- **Detached standalone Chat windows no longer flash white on open/close.**
  Project Manager now declares the dark app background inline before deferred
  scripts/CSS load, and the CEF launcher sets the same dark browser background
  before the first rendered frame.
- **Standalone Chat sessions created after this release can reopen after Core
  restart.** Stage-less standalone chats no longer lock history to transient
  runtime session ids; once the provider binding is ready, Core promotes the
  persisted history to the provider session id while keeping workflow session
  history locked to continuity roots.

### Verification
- `npm run build:project-manager`
- `./scripts/build-cef-launcher.sh --launcher-version 1.2.573`
- `node --test --import tsx packages/core/src/remote-bridge/handlers/session-shell-factory.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm exec -- ultracite check`
- `npm run plan:validate`

## [1.2.573] - 2026-06-21
### Fixed
- **Detached standalone Chat windows no longer clear each other while new chats
  open.** Runtime session views scoped to an exact `visibleSessionId` skip
  automatic full rehydrate on unrelated Core `core:state` events and keep the
  current snapshot if a status refresh temporarily does not include that
  session.

### Verification
- `node --test --import tsx src/client/project-manager/components/sessions/project-manager-session-view.test.tsx`
- `npm run typecheck:webview`
- `npm run build:project-manager`
- `npm exec -- ultracite check`
- `npm run plan:validate`

## [1.2.572] - 2026-06-21
### Fixed
- **Detached standalone Chat no longer refreshes workflow panels.** Core
  `session:message` stream events now include session scope metadata, and the
  Project Manager workflow view ignores stage-less standalone chat events while
  the Chat sidebar refreshes only matching workspace chat rows.
- **GLM/local standalone chat replay coalesces streamed answer chunks.** Core
  history reads now merge adjacent persisted assistant `tag: live` records, so
  reopened local-provider chats render one assistant response card instead of
  one card per stored stream chunk.

### Verification
- `node --test --import tsx packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.test.ts`
- `node --test --import tsx src/client/project-manager/components/layout/workflow-navigation.test.ts`
- `node --test --import tsx packages/core/src/unified-session/storage.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm run typecheck:webview`
- `npm run build:project-manager`
- `npm exec -- ultracite check`
- `npm run plan:validate`

## [1.2.571] - 2026-06-21
### Fixed
- **Standalone Chat pending windows attach to the created session.** Detached
  New Chat windows now normalize Core `session:created` events before matching
  them and poll the workspace chat list for a matching `liveSessionId`, so the
  Session UI can replace the "Creating chat session..." placeholder even when
  CEF cross-window `postMessage` is not delivered.

### Verification
- `node --test --import tsx src/client/project-manager/standalone-session-resolver.test.ts`
- `npm run typecheck:webview`
- `npm run build:project-manager`
- `npm exec -- ultracite check`
- `npm run plan:validate`

## [1.2.570] - 2026-06-21
### Fixed
- **Standalone Chat Rename persists across refresh.** Core now keeps the
  history-backed provider session id when merging live standalone sessions with
  saved workspace history, so Rename/Delete target the visible chat sidecars
  instead of a temporary live-session alias.

### Verification
- `node --test --import tsx packages/core/src/unified-session/standalone-workspace-chat-list.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm exec -- ultracite check`
- `npm run plan:validate`

## [1.2.569] - 2026-06-21
### Fixed
- **Standalone Chat launch and row actions are stable in CEF.** New standalone
  chat windows now open the Project Manager standalone shell instead of a blank
  `about:blank` placeholder before switching to the real session id. Chat row
  Rename/Delete now use in-app React menu/dialog UI instead of native
  `window.prompt` / `window.confirm`, avoiding the macOS CEF host crash from the
  right-click Rename path.

### Verification
- `npm run typecheck:webview`
- `npm run build:project-manager`
- `npm exec -- ultracite check`
- `rg "window\\.prompt|window\\.confirm|window\\.alert|prompt\\(|confirm\\(|alert\\(" src/client/project-manager packages/ui/project-manager -n`
- `npm run plan:validate`

## [1.2.568] - 2026-06-21
### Fixed
- **Standalone Chat rows now update and open correctly.** New chats open their
  detached Session UI immediately after provider selection, chat titles refresh
  on first message without switching sidebar modes, card metadata shows only the
  provider id, and right-click Rename/Delete actions are available for chat
  rows.

### Verification
- `node --test --import tsx packages/core/src/unified-session/standalone-workspace-chat-list.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm run typecheck:webview`
- `npm run build:project-manager`
- `npm exec -- ultracite check`
- `npm run plan:validate`

## [1.2.567] - 2026-06-21
### Fixed
- **Standalone Chat list no longer shows duplicate or stale rows.** Core now
  skips standalone translation overlay logs, filters live standalone sessions to
  the selected workspace, and merges live/history aliases by session id,
  provider session id, or first-user preview so renamed provider chats reopen
  the actual live Session UI instead of an empty resumed window.

### Verification
- `node --test --import tsx packages/core/src/unified-session/standalone-workspace-chat-list.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm run plan:validate`

## [1.2.566] - 2026-06-21
### Added
- **Project Manager now has workspace standalone chats.** The left sidebar can
  switch between `Workflow` and `Chat`; the workspace dropdown remains in place,
  `Workflow` keeps the current tree UI, and `Chat` lists stage-less chats for
  the selected workspace plus `New Chat`.
- **Standalone chats open detached Session UI windows.** New chats start through
  the provider picker, are created with `stage: null`, and use provider-default
  instructions/tooling instead of workflow prompt packs. Chat history is stored
  under the selected workspace's `.codeai-hub/sessions` root.

### Verification
- `npm run build --workspace @codeai-hub/core`
- `npm run build:project-manager`
- `npm run typecheck:webview`
- `npm exec -- ultracite check`
- User accepted the Workflow/Chat sidebar switch and standalone chat behavior.

## [1.2.565] - 2026-06-21
### Fixed
- **Kimi ACP reasoning and streamed answers render again.** Native Kimi sessions
  now enable ACP `thinking` after session creation/resume, buffer token-sized
  ACP `agent_thought_chunk` and `agent_message_chunk` updates into normal
  thinking/assistant events, and flush the final buffered answer before
  adapter-level `turn_completed`.

### Verification
- `npm run build --workspace @codeai-hub/kimi-module`
- `npm test --workspace @codeai-hub/kimi-module`
- `npx tsx --test packages/Kimi_Module/src/messaging/kimi-event-normalizer.test.ts packages/Kimi_Module/src/provider/kimi-managed-agent-profile.test.ts packages/Kimi_Module/src/provider/kimi-provider-adapter.test.ts`
- Live `KimiProviderAdapter` probe with `defaultModel =
  "kimi-k2.7-code-highspeed"` emitted 2 `thinking` events, 1 `assistant` event
  with `tag: "live"`, and adapter-level `turn_completed`.
- `npm run plan:validate`

## [1.2.564] - 2026-06-21
### Fixed
- **Kimi ACP starts with the selected CodeAI model through `KIMI_MODEL_*`.** The
  provider now injects `kimi-k2.7-code` and `kimi-k2.7-code-highspeed` before
  spawning `kimi acp`, using the Kimi CLI-supported temporary model contract.
  CodeAI no longer sends raw CodeAI model ids through ACP
  `session/set_config_option`, which the new CLI rejects unless those aliases
  already exist in `config.toml`.

### Verification
- `npm run build --workspace @codeai-hub/kimi-module`
- `npm test --workspace @codeai-hub/kimi-module`
- Live `KimiProviderAdapter` probe with `defaultModel =
  "kimi-k2.7-code-highspeed"` created a Kimi ACP session and returned `OK` for
  `sendMessage("Say only: OK")`.
- `npm run plan:validate`

## [1.2.563] - 2026-06-21
### Fixed
- **Native Kimi starts through ACP after the Kimi Code CLI update.** The Kimi
  provider now launches `kimi acp`, creates/resumes ACP sessions, sends prompts
  through `session/prompt`, and normalizes ACP stream updates into assistant,
  thinking, tool, and usage events.
- **Kimi model selection is model-only and includes High Speed.** Settings,
  workflow start cards, Development Tree start/fix cards, and the Session
  Status Panel model picker expose `Kimi K2.7 Code` and
  `Kimi K2.7 Code High Speed` without the unsupported reasoning on/off toggle.

### Verification
- `npm run build --workspace @codeai-hub/kimi-module`
- `npm test --workspace @codeai-hub/kimi-module`
- `npx tsx --test packages/Kimi_Module/src/provider/kimi-managed-agent-profile.test.ts packages/Kimi_Module/src/messaging/kimi-event-normalizer.test.ts packages/Kimi_Module/src/provider/kimi-provider-adapter.test.ts`
- `npx tsx --test src/client/project-manager/services/workflow-step-start-settings-defaults.test.ts src/client/project-manager/services/kimi-model-registry-alignment.test.ts src/client/ui/src/session/status-panel-model-picker.test.tsx packages/core/src/config/provider-settings-snapshot.test.ts packages/core/src/provider-registry/provider-descriptor-factory.test.ts`
- `npm run plan:validate`

## [1.2.562] - 2026-06-20
### Fixed
- **Selected LM Studio models stay loaded while Core is running.** The
  `lmstudio:*` reasoning translation model and the Local Models workflow-agent
  default now warm persistently without `--ttl` on Project Manager startup and
  after Settings saves.
- **Local Models loads no longer eject the reasoning translator.** Ordinary
  translation/workflow `ensureModelLoaded` calls keep other selected model keys
  loaded. Settings warmup/reconcile unloads only idle stale CodeAI-owned workers
  whose model keys are no longer selected, and still never unloads user-loaded
  LM Studio instances.

### Verification
- `node --test --import tsx packages/core/src/local-models/local-models-runtime-load-manager.test.ts`
- `node --test --import tsx packages/core/src/local-models/local-models-warmup-service.test.ts`
- `node --test --import tsx packages/core/src/remote-bridge/handlers/settings-request-handler.local-models-warmup.test.ts`
- `npm run build --workspace=@codeai-hub/core`
- `npm run plan:validate`

## [1.2.561] - 2026-06-20
### Changed
- **Mainline Local Models verification release.** Packages the merged `main`
  state after Local Models file tools, selected-model warmup, streamed tool
  turns, dialog dedupe, and Qwen artifact-loop fixes landed together. This is a
  packaging/retest release, not a new functional change beyond the merged
  commits.

### Verification
- Full release build completed with `./scripts/build-all.sh --allow-dirty` and
  `./scripts/build-release.sh --use-current-version --allow-dirty`; user retest
  of the generated VSIX is pending.

## [1.2.560] - 2026-06-20
### Fixed
- **Qwen Local Models artifact-tool turns stop after successful artifact writes.**
  After `write_workflow_artifact` succeeds, Core sends the follow-up LM Studio
  request without tools, preventing Qwen from repeatedly calling the write tool
  until max-step failure. Empty post-write assistant follow-ups now complete
  with a short success message so the orchestrator can advance instead of
  receiving a provider failure.

### Verification
- `npx tsx --test packages/core/src/local-models/local-models-provider-adapter.tools.test.ts`
- `npm run build --workspace=@codeai-hub/core`

## [1.2.559] - 2026-06-20
### Fixed
- **Qwen Local Models streamed tool turns no longer duplicate visible dialog
  output.** The dialog skips whitespace-only live cards, joins thinking blocks
  separated only by those skipped live chunks, and hides the final stored
  assistant snapshot after live output. Core/JSONL still keeps the final
  assistant message for orchestrator consumers.

### Verification
- `npx tsx --test src/client/ui/src/session/dialog-panel-message-utils.test.ts`
- `npm run typecheck:webview`
- Qwen JSONL replay:
  `localmodels-8c8aacc3-eecb-4a9a-b490-8024d81c1f89-description.jsonl`
  merges to one thinking card, one live assistant card, and one system review
  card after the user prompt.

## [1.2.558] - 2026-06-20
### Fixed
- **The session dialog hides duplicated final assistant bubbles after live
  output.** Core still stores and exposes the final assistant message for the
  orchestrator/JSONL history, but the visible dialog skips the final bubble when
  it visually duplicates the previous `tag: "live"` assistant output, including
  small Markdown blank-line differences seen with Gemma 4 26B A4B.

### Verification
- `npx tsx --test src/client/ui/src/session/dialog-panel-message-utils.test.ts`
- `npm run typecheck:webview`

## [1.2.557] - 2026-06-20
### Fixed
- **Local Models artifact-tool turns stream reasoning and assistant text again.**
  The OpenAI-compatible `/v1/chat/completions` tool loop now requests
  `stream: true`, emits `delta.content` as live assistant chunks, emits
  `delta.reasoning_content` / `delta.reasoning` through the buffered `thinking`
  channel, and accumulates streamed `tool_calls` arguments silently until the
  artifact write can execute. Project Manager no longer waits for the file write
  before showing model reasoning or final assistant text.

### Verification
- `npx tsx --test packages/core/src/local-models/local-models-provider-adapter.test.ts packages/core/src/local-models/local-models-provider-adapter.tools.test.ts packages/core/src/local-models/local-models-sse-reader.test.ts`
- `npm run build --workspace @codeai-hub/core`

## [1.2.556] - 2026-06-20
### Added
- **Local Models workflow turns can write artifacts through a minimal tool.**
  Workspace-bound LM Studio sessions use the OpenAI-compatible
  `/v1/chat/completions` endpoint with one function tool,
  `write_workflow_artifact(relative_path, content)`, restricted to
  `.codeai-hub/**`. The tool has no shell, git, package-manager, read-file, or
  arbitrary-write access; the existing fenced-Markdown artifact fallback remains
  available.
- **Project Manager startup preloads selected LM Studio models.** After
  workspace settings are published, Core schedules a detached best-effort warmup
  for `general.localization.reasoningEngineId = lmstudio:<modelKey>` and the
  Local Models workflow default model. Duplicate selections are loaded once, and
  LM Studio failures do not block Settings or Project Manager rendering.

### Verification
- `npx tsx --test packages/core/src/local-models/local-models-provider-adapter.test.ts packages/core/src/local-models/local-models-provider-adapter.tools.test.ts packages/core/src/local-models/local-models-sse-reader.test.ts`
- `npx tsx --test packages/core/src/local-models/local-models-warmup-service.test.ts packages/core/src/local-models/local-models-runtime-load-manager.test.ts`
- `npx tsx --test --test-name-pattern "schedules local models warmup" packages/core/src/remote-bridge/handlers/settings-request-handler.localization-runtime.test.ts`
- `npm run build --workspace=@codeai-hub/core`

## [1.2.555] - 2026-06-19
### Changed
- **Verification-only release — no functional changes.** Confirms the working
  tree builds and packages correctly after an exploratory scope (structured
  output for local models) was investigated and fully reverted. Local Models
  behavior is unchanged from 1.2.554.

## [1.2.554] - 2026-06-19
### Fixed
- **Heavy local reasoning turns no longer abort at five minutes.** The native
  chat request used a hard-coded 300s `AbortController` timeout, so a Qwen3 27B
  reasoning turn that ran ~310s was cut off mid-answer with "This operation was
  aborted". The default request timeout is now 20 minutes and is configurable via
  the `CODEAI_LMSTUDIO_TIMEOUT_MS` environment variable.

## [1.2.553] - 2026-06-19
### Fixed
- **Local artifact is written when the filename is only in the reasoning
  channel.** When reasoning is split into a separate `thinking` message, the
  model leaves the fenced artifact block in the `assistant` message but the
  `Final_Description.md` filename in the `thinking` message, so no single
  assistant message carries both. The preliminary artifact gate now confirms the
  filename across the latest assistant+thinking turn while still extracting the
  fenced block from the assistant message.
- **Reasoning is coalesced instead of one delta per `thinking` message.** The SSE
  reader buffers `reasoning.delta` text and flushes `onReasoning` only at ~900
  chars or ~360 chars on a sentence boundary (mirroring GLM native), plus a flush
  when message content starts or the stream ends. The thinking panel no longer
  renders thousands of 1-4 char "letter per line" messages.

## [1.2.552] - 2026-06-19
### Fixed
- **Local Models live-streamed artifact is materialized again.** The preliminary
  artifact gate matched a single whole assistant message containing the artifact
  path plus fenced block, but the Core live-tail dedupe drops the whole final
  assistant message once it is fully covered by the live chunks, leaving only
  fragmented `tag: "live"` chunks. The gate now reconstructs the latest assistant
  answer by joining the trailing run of assistant messages before writing
  `Final_Description.md` / `virtual-simulation.md`, so Description / Virtual
  Simulation no longer report a missing artifact after live streaming.
### Added
- **Local Models reasoning channel.** `readLmStudioNativeChatResult` reads
  LM Studio `reasoning.delta` frames via an optional `onReasoning` callback
  (separate from `message.delta`), and the adapter emits each reasoning chunk as
  a `thinking` event (`tag: "thinking"`) routed through the existing
  thinking-visibility pipeline. Qwen3 reasoning now appears as a thinking block
  instead of a silent pause; Gemma 4 reasoning surfaces through the same channel
  once thinking is enabled in LM Studio (off by default).

## [1.2.551] - 2026-06-19
### Added
- **Local Models provider now streams assistant text incrementally (live) on
  workflow-agent turns.** During `POST /api/v1/chat` generation the provider
  emits `assistant` events with `tag: "live"` for each LM Studio `message.delta`
  chunk, then one final non-live `assistant` event with the complete text. The
  Core live-tail dedupe pipeline (`resolveLiveAssistantTailDedupe`) merges the
  live chunks into one card and strips the overlapping prefix of the final
  event, so the assistant reply now appears progressively in Project Manager and
  the webview instead of one buffered block. This matches Claude/GLM Native/GLM
  OpenCode UX and removes the multi-minute blind wait for heavy local models
  (Qwen3 27B MLX and similar). `turn_started`/`turn_completed` and the existing
  fallback diagnostics are unchanged.

### Verification
- `node --test packages/core/dist/local-models/*.test.js` (31/31)
- `npm run build --workspace @codeai-hub/core`
- `npx ultracite check packages/core/src/local-models/`
- `npm run check:knip`

## [1.2.550] - 2026-06-19
### Fixed
- **Local Models provider no longer fails with `Headers Timeout Error` on heavy
  local models through LM Studio.** Workflow-agent turns (`POST /api/v1/chat`)
  and translation turns (`POST /v1/chat/completions`) now use streaming SSE
  transport (`stream: true`). Non-streaming LM Studio chat does not emit HTTP
  response headers until the full reply is generated, which exceeded Node's
  default undici `headersTimeout` for slow models (Qwen3 27B MLX and similar).
  With streaming, headers arrive immediately and the final assistant text is
  reassembled from the terminal `chat.end.result` event (native) or accumulated
  `delta.content` frames plus the `[DONE]` sentinel (OpenAI-compatible). The
  adapter's `turn_started → assistant → turn_completed` and translation fallback
  contracts are unchanged.

### Verification
- `node --test packages/core/dist/local-models/*.test.js` (27/27)
- `npm run build --workspace @codeai-hub/core`
- `npx ultracite check packages/core/src/local-models/`
- `npm run check:knip`

## [1.2.549] - 2026-06-19
### Fixed
- **Core now prepares managed stage artifact workspaces before provider turns.**
  Application Skeleton and Quality Gates get their `.codeai-hub/<workspace>/...`
  directories up front; an empty conflicting file is removed, while unsafe
  non-directory residue stops the step instead of being silently overwritten.
- **Kimi and GLM now have matching managed artifact capability coverage.** Kimi
  managed sessions regain a narrow filesystem shell for local artifact recovery;
  GLM Native continues to satisfy the same contract through Core's
  `write_workflow_artifact` tool, including recursive parent directory creation.

### Verification
- `npx tsx --test packages/core/src/remote-bridge/handlers/workspace-session-service.test.ts packages/Kimi_Module/src/provider/kimi-managed-agent-profile.test.ts packages/GLM_Module/src/provider/glm-native-provider-adapter.tools.test.ts` (9/9)
- `npm run build --workspace @codeai-hub/kimi-module`
- `npm run build --workspace @codeai-hub/glm-module`
- `npm run build --workspace @codeai-hub/core`

## [1.2.548] - 2026-06-19
### Fixed
- **Application Skeleton draft validation no longer blocks on descriptive
  `repoShape` metadata.** Core still requires actionable foundation fields, but
  an object-valued or omitted descriptive `repoShape` no longer causes
  `missing_foundation_field: repoShape` by itself.
- **Application Skeleton draft repair loops now hit the managed repair limit.**
  Draft repair dispatch resolves the real
  `application-skeleton.phase1.repair.taskN` attempt number, so after three
  failed repair attempts Core opens the existing managed user review gate instead
  of sending another automatic repair prompt.

### Verification
- `npx tsx --test packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-validator-warnings.test.ts packages/core/src/remote-bridge/handlers/managed-workflow-repair-attempts.test.ts` (4/4)
- `npm run build --workspace @codeai-hub/core`

## [1.2.547] - 2026-06-18
### Fixed
- **Kimi 5h / Weekly usage limits now appear in the session top bar.** The reader
  derives the 5h bucket from the `remaining` field Kimi returns for the 300-minute
  window (it does not send `used`), and Core refreshes usage limits on
  `turn_completed` — not only on `binding_ready`, which raced Wire startup and was
  deduped by warmup, leaving fresh Kimi sessions "unavailable".
- **A filled Description questionnaire is no longer overwritten on startup.**
  `DescriptionQuestionnaireService.load` now seeds the template only when the
  questionnaire read returns an explicit `missing` (404); a transient read `error`
  no longer makes the client treat the file as absent and write a blank template
  over the user's filled questionnaire (BUG-2026-06-18-01).

### Verification
- `npm run build --workspace @codeai-hub/kimi-module`
- `npm run build --workspace @codeai-hub/core`
- `npm run build:webview`
- `npm run typecheck:webview`
- `npx tsx --test packages/Kimi_Module/src/provider/*.test.ts` (13/13)
- `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-usage-limits-turn-refresh.test.ts` (2/2)
- `npx tsx --test src/client/project-manager/services/description-questionnaire-service.test.ts` (4/4)

## [1.2.546] - 2026-06-18
### Added
- **GLM native 5h / Weekly usage limits in the session top bar.** The native
  GLM adapter now fetches the Z.AI account quota (monitor endpoint, bare
  `Authorization`) and broadcasts the 5h session and weekly buckets, so the top
  bar shows real percentages and reset times instead of "unavailable". The
  context-window indicator is unchanged; Kimi and GLM OpenCode are unaffected.

### Verification
- `npm run build --workspace @codeai-hub/glm-module`
- `npm run build --workspace @codeai-hub/core`
- `npm run build:webview`
- `npm run typecheck:webview`
- `npx tsx --test packages/GLM_Module/src/provider/*.test.ts` (18/18)

## [1.2.545] - 2026-06-18
### Fixed
- **Start-card reasoning options now match provider capabilities.** Kimi launch
  cards expose only binary Reasoning on/off, while native GLM launch cards
  expose only off/high/max instead of the cross-provider fake `default` option.
- **Launch cards persist selections through Settings before start.** The
  next-step and Development Tree start cards now save selected provider,
  model and reasoning through the scoped settings path before creating a
  session. Workspace-scoped provider defaults stay in workspace settings, while
  global provider secrets such as native GLM API connection settings stay in
  the user-space settings file.
- **Development Tree starts no longer send one-shot model/reasoning payloads.**
  Core starts from settings truth, so session creation cannot drift from the
  persisted Settings state.

### Verification
- `npx tsx --test src/client/project-manager/components/shared/stage-confirmation-card.test.ts src/client/project-manager/services/workflow-step-start-settings-defaults.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `node --test packages/core/dist/remote-bridge/remote-bridge-development-tree-node-command-router.test.js packages/core/dist/remote-bridge/handlers/settings-persistence-service.test.js`
- `npm run build:webview`
- `npm run typecheck:webview`

## [1.2.544] - 2026-06-18
### Fixed
- **Kimi Reasoning toggle — first turn after toggle no longer fails.** The
  v1.2.543 `reconfigureThinking` left the Kimi adapter in an uninitialized
  state after a Reasoning toggle, so the next Kimi turn deterministically
  threw "Kimi provider adapter must be initialized before use." `reconfigureThinking`
  is now async (`Promise<boolean>`) and re-runs the Wire runtime setup so the
  adapter stays initialized across the reconfigure, preserving the stop-rebind
  contract.
- **Kimi thinking reconciler idempotency.** `reconcileKimiThinkingEnabled` now
  invalidates Kimi provider bindings only when `reconfigureThinking` reports a
  real restart. Saving unrelated settings (glossary, localization, etc.) no
  longer resets active Kimi sessions to pending rebind.
- **Settings reset reconciles Kimi thinking.** `handleReset` now invokes the
  same `reconcileKimiThinkingEnabled` path as `handleSave`, so resetting
  settings to defaults correctly reconfigures Kimi reasoning instead of
  silently leaving the Wire process on the previous flag.
- **Wire teardown diagnostics.** The `wireProcessBridge.stop()` rejection
  during reconfigure is now logged via the module reporter instead of being
  swallowed silently.

## [1.2.543] - 2026-06-18
### Added
- **Kimi Reasoning on/off toggle.** The Kimi provider Settings card now exposes
  a binary Reasoning toggle (separate from the existing "Reasoning in dialog"
  visibility toggle). It controls Kimi K2.7 Code thinking mode itself through
  the Wire process `--thinking` / `--no-thinking` CLI flag. CodeAI Hub defaults
  this managed-workflow toggle to ON; users who want to preserve a user-global
  Kimi CLI `default_thinking = false` must turn it off in CodeAI Settings.
  Changing the toggle force-restarts the active Kimi
  Wire process via `KimiProviderAdapter.reconfigureThinking(...)` and
  invalidates the provider binding so the next send re-spawns with the new
  flag. Kimi has no reasoning effort levels — only binary on/off.

## [1.2.542] - 2026-06-17
### Fixed
- **Already-Russian reasoning chunks are no longer retranslated.** The session
  translation path now skips thinking/reasoning blocks that are predominantly
  Russian while ignoring code-like Latin tokens, paths, file names and short
  identifiers.
- **Mixed English/Russian reasoning still goes through localization.** Reasoning
  that contains real English prose alongside Russian questionnaire quotes keeps
  the existing translation behavior.

### Verification
- `npx ultracite check packages/core/src/session-translation/session-translation-facade.ts packages/core/src/session-translation/session-translation-facade.mixed-reasoning.test.ts`
- `npm run build --workspace=@codeai-hub/core`
- `node --test packages/core/dist/session-translation/session-translation-facade.test.js packages/core/dist/session-translation/session-translation-facade.mixed-reasoning.test.js packages/core/dist/session-translation/session-translation-facade.localization-guards.test.js packages/core/dist/session-translation/session-translation-dispatcher.test.js`

## [1.2.541] - 2026-06-17
### Fixed
- **Native GLM requests now include OpenCode-style Z.AI session identity headers.** The provider sends `x-session-affinity`, `X-Session-Id` and a stable `User-Agent` with each streaming Chat Completions request.
- **Native GLM retry timing now follows provider hints before jitter.** Retryable HTTP/opening failures and pre-output stream resets honor `retry-after-ms` / `retry-after` when present, otherwise using capped exponential jitter instead of a fixed linear delay.

### Verification
- `npm run build --workspace=@codeai-hub/glm-module`
- `npm test --workspace=@codeai-hub/glm-module`
- `npx ultracite check packages/GLM_Module/src/provider/glm-native-adapter-utils.ts packages/GLM_Module/src/provider/glm-native-provider-adapter.ts packages/GLM_Module/src/provider/glm-native-provider-adapter.test.ts`

## [1.2.540] - 2026-06-17
### Fixed
- **Native GLM now writes full provider-home session logs.** Each turn
  records JSONL under
  `.codeai-hub/<workspace>/runtime/providers/glm-native/home/sessions/YYYY/MM/DD/`,
  including the effective profile, request headers/body, raw SSE frames, parsed
  provider chunks, tool calls/results, usage snapshots, retries and failures.
- **Native GLM diagnostics preserve local authorization details.** The log
  intentionally keeps the full `Authorization` header and API request body so
  reasoning-level and transport issues can be inspected without guessing what
  was sent.

### Verification
- `npm run build --workspace=@codeai-hub/glm-module`
- `npm test --workspace=@codeai-hub/glm-module`
- `npx ultracite check packages/GLM_Module/src/provider/glm-native-provider-adapter.ts packages/GLM_Module/src/provider/glm-native-session-log.ts packages/GLM_Module/src/provider/glm-native-stream-reader.ts packages/GLM_Module/src/provider/glm-native-provider-adapter.test.ts packages/GLM_Module/src/provider/glm-native-provider-adapter.tools.test.ts`

## [1.2.539] - 2026-06-17
### Fixed
- **Native GLM managed turns now receive system instructions and workflow tools.** Requests include the CodeAI Hub system prompt, `write_workflow_artifact`, `tool_choice: "auto"` and `tool_stream: true`, so GLM can create canonical `.codeai-hub/...` artifacts instead of pasting them into chat.
- **Native GLM streamed tool calls are executed and replayed correctly.** The provider accumulates streamed `tool_calls`, writes only safe workspace-relative artifacts, sends `role: "tool"` feedback, and continues the turn.

### Verification
- `npm run build --workspace=@codeai-hub/glm-module`
- `npm test --workspace=@codeai-hub/glm-module`
- `npx ultracite check packages/GLM_Module/src/provider/glm-native-adapter-utils.ts packages/GLM_Module/src/provider/glm-native-agent-runtime.ts packages/GLM_Module/src/provider/glm-native-provider-adapter.ts packages/GLM_Module/src/provider/glm-native-provider-adapter.test.ts packages/GLM_Module/src/provider/glm-native-provider-adapter.tools.test.ts packages/GLM_Module/src/provider/glm-native-sse-parser.ts packages/GLM_Module/src/provider/glm-native-stream-reader.ts`

## [1.2.538] - 2026-06-17
### Fixed
- **Native GLM assistant streaming now renders as one growing dialog bubble.** Assistant deltas are emitted with `tag: "live"`, using the existing UI merge path instead of creating one card per SSE frame.
- **Native GLM reasoning chunks are buffered into readable thinking blocks.** Provider micro-frames are accumulated to paragraph/size boundaries before becoming visible `thinking` messages, avoiding one artificial line per raw chunk.

### Verification
- `npm run build --workspace=@codeai-hub/glm-module`
- `npm test --workspace=@codeai-hub/glm-module`

## [1.2.537] - 2026-06-17
### Fixed
- **Native GLM connection settings are now global.** `apiKey` and `baseUrl` are stored in `~/.codeai-hub/settings/settings.json` under `providers.glmNative`, so new workspaces no longer require re-entering the same Z.AI key.
- **Native GLM stream resets are retried before first output.** If Z.AI closes the SSE connection with a retryable reset before any thinking, assistant text or usage event is emitted, the provider retries the whole stream attempt instead of failing the turn immediately.

### Verification
- `npm run build --workspace=@codeai-hub/glm-module`
- `npm test --workspace=@codeai-hub/glm-module`
- `npx tsx --test packages/core/src/remote-bridge/handlers/settings-persistence-service.test.ts packages/core/src/config/provider-settings-snapshot.test.ts`
- `npm run build --workspace=@codeai-hub/core`
- Live native GLM smoke with a large prompt: thinking, assistant text and token usage returned with no provider failure.

## [1.2.536] - 2026-06-17
### Fixed
- **Native GLM now follows the Z.AI preserved-thinking contract.** Requests send `thinking.clear_thinking: false` when reasoning is enabled and replay assistant `reasoning_content` in later turns, matching the documented Coding Plan/OpenAI-compatible behavior.
- **Native GLM transport failures are retryable and diagnosable.** Retryable opening failures and retryable HTTP statuses are retried without silently disabling reasoning or switching transport mode, and final failure messages preserve useful cause details such as `ECONNRESET`.
- **GLM reasoning Settings now expose only real effort choices.** The UI shows `max` and `high`, while legacy saved values are normalized safely and `none`/`minimal` disable thinking through the explicit toggle path.

### Verification
- `npm run build --workspace=@codeai-hub/glm-module`
- `npm test --workspace=@codeai-hub/glm-module`
- `npm run build --workspace=@codeai-hub/core`
- `npm run typecheck:webview`
- Live native GLM smoke with reasoning `max`: assistant text, thinking chunks and token usage returned with `failed=0`.
- Live native GLM smoke with thinking disabled: assistant text and token usage returned, thinking chunks `0`, `failed=0`.
- Live native GLM two-turn smoke: preserved `reasoning_content` replay completed both turns with `failed=0`.

## [1.2.535] - 2026-06-17
### Fixed
- **GLM Settings reasoning changes no longer crash Project Manager.** The GLM reasoning level control now follows the Codex/Gemini custom React dialog pattern instead of using a native `<select>` popup, avoiding the macOS CEF `NSApplication unrecognized selector` crash path.

### Verification
- `npx ultracite check src/client/ui/src/components/settings/glm-native-settings-card.tsx doc/TODO/todo-plan.md`
- `npm run typecheck:webview`
- `npm run build:webview`
- `npm run build:project-manager`

## [1.2.534] - 2026-06-17
### Added
- **Native `GLM` provider for GLM 5.2.** CodeAI Hub can now run GLM 5.2 directly through the Z.AI Coding Chat Completions API, streaming assistant text, reasoning chunks and token usage without OpenCode or Claude in the provider path.
- **GLM Settings now expose reasoning controls.** The `GLM` tab includes reasoning enabled/disabled, reasoning effort (`max`, `xhigh`, `high`, `medium`, `low`, `minimal`, `none`) and reasoning-in-dialog display controls. Defaults are reasoning enabled, display enabled and `max`.

### Fixed
- **GLM native turns apply the Settings reasoning level to API requests.** Core passes the selected reasoning controls into the GLM turn config, and the GLM module sends `thinking.type` plus `reasoning_effort` to Z.AI.

### Verification
- `npm run build --workspace=@codeai-hub/glm-module`
- `npm test --workspace=@codeai-hub/glm-module`
- `npm run build --workspace=@codeai-hub/core`
- `npm run typecheck:webview`
- `npm run build:webview`
- `npm run build:project-manager`
- Live native GLM smoke via `packages/GLM_Module/dist/index.js`: model `glm-5.2`, assistant chunks, reasoning chunks and token usage event returned successfully.

## [1.2.533] - 2026-06-16
### Fixed
- **OpenCode-backed sessions now report context-window token usage to the status panel.** GLM 5.2/OpenCode and Kimi K2.7/OpenCode emit the existing `token_usage` event shape after OpenCode returns assistant token counts, so the UI no longer stays at `0 (100%)` after a completed turn.
- **OpenCode token usage is monotonic within a turn.** If OpenCode emits multiple token snapshots, CodeAI Hub keeps the highest used-token count instead of letting the status panel jump backward.

### Verification
- `npx ultracite check packages/GLM_OpenCode_Module/src/provider/glm-opencode-sse-processor.ts packages/GLM_OpenCode_Module/src/provider/glm-opencode-turn-stream.ts packages/GLM_OpenCode_Module/src/provider/glm-opencode-sse-processor.test.ts packages/GLM_OpenCode_Module/src/provider/glm-opencode-output-normalizer.ts`
- `npm run build --workspace=@codeai-hub/glm-opencode-module`
- `node --test packages/GLM_OpenCode_Module/dist/provider/*.test.js`

## [1.2.532] - 2026-06-16
### Fixed
- **Mixed-language OpenCode reasoning chunks now still go through the reasoning translator.** Core no longer skips thinking/syncing messages just because a fragment contains Cyrillic text quoted from the user's questionnaire.
- **Ordinary dialog translation remains blocked before the localization path.** Assistant/user/system dialog messages are still rejected by the session translation dispatcher, so the fix only changes reasoning overlay behavior.

### Verification
- `npx ultracite check packages/core/src/session-translation/session-translation-facade.ts packages/core/src/session-translation/session-translation-facade.test.ts packages/core/src/session-translation/session-translation-facade.mixed-reasoning.test.ts`
- `npm run build --workspace=@codeai-hub/core`
- `node --test packages/core/dist/session-translation/session-translation-facade.test.js packages/core/dist/session-translation/session-translation-facade.mixed-reasoning.test.js packages/core/dist/session-translation/session-translation-facade.localization-guards.test.js packages/core/dist/session-translation/session-translation-dispatcher.test.js`
- `node --test packages/GLM_OpenCode_Module/dist/provider/*.test.js`

## [1.2.531] - 2026-06-16
### Changed
- **OpenCode Settings now has a default model selector.** The Settings tab lets users choose `GLM 5.2` or `Kimi K2.7` as the OpenCode default model, so questionnaire submission without a per-step card override no longer always starts GLM.

### Fixed
- **Session translation overlays are limited to thinking/syncing messages.** Ordinary assistant replies, Core validation messages and provider-visible system messages stay in the prompt-selected language instead of being translated a second time.
- **Unsupported OpenCode default selectors fall back to GLM 5.2.** Legacy GLM aliases are normalized to the current OpenCode selector, while the supported Kimi selector is preserved.

### Verification
- `npx ultracite check packages/core/src/session-translation/session-translation-dispatcher.ts packages/core/src/session-translation/session-translation-dispatcher.test.ts packages/core/src/session-translation/session-translation-facade.test.ts packages/core/src/session-translation/session-translation-facade.localization-guards.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.ts packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.test.ts`
- `npm run build --workspace=@codeai-hub/core`
- `node --test packages/core/dist/session-translation/session-translation-dispatcher.test.js packages/core/dist/session-translation/session-translation-facade.test.js packages/core/dist/session-translation/session-translation-facade.localization-guards.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-event-messages.test.js`
- `npx ultracite check src/client/ui/src/components/settings/glm-opencode-settings-card.tsx src/client/ui/src/components/settings/kimi-settings-state.ts src/client/ui/src/components/settings/settings-state-helpers.persistence.test.ts`
- `npm run typecheck:webview`
- `npm run build:webview`
- `npm run build:project-manager`

## [1.2.530] - 2026-06-16
### Fixed
- **OpenCode dialog text no longer goes through duplicate `ru -> ru` localization.** Core now skips the session-translation overlay when the target language is Russian and the provider-visible dialog fragment is already Cyrillic.
- **Marker-corrupted translation overlays are now rejected before they reach the UI.** If a translation result leaks `__CODEAI_HUB_LOCALIZATION_ENTRY__` markers, Core discards that overlay instead of patching gibberish into localized dialog content.
- **The localization guard stays within the 500-line architecture limit.** Session translation job execution and the new OpenCode localization guard coverage were split into dedicated micro-files so the fix passes the architecture hook cleanly.

### Verification
- `npm run build --workspace=@codeai-hub/core`
- `npx ultracite check packages/core/src/session-translation/session-translation-facade.ts packages/core/src/session-translation/session-translation-facade.test.ts packages/core/src/session-translation/session-translation-facade.localization-guards.test.ts packages/core/src/session-translation/session-translation-job-runner.ts`
- `node --test packages/core/dist/session-translation/session-translation-facade.test.js packages/core/dist/session-translation/session-translation-facade.localization-guards.test.js packages/core/dist/session-translation/session-translation-policy-resolver.test.js packages/core/dist/session-translation/session-message-localization-projector.test.js`
- Workspace evidence (`/Users/oleksandroliinyk/VSCODE/FinderWidget-Test01`): the source OpenCode session JSONL remained readable Russian, while the previous corruption was isolated to `.translations.jsonl` overlays created from already-Russian assistant/live fragments.

## [1.2.529] - 2026-06-16
### Changed
- **OpenCode wrapper now uses the official server/SSE transport.** The provider starts `opencode serve`, connects through `@opencode-ai/sdk/v2`, and reads `/event` SSE frames instead of depending on the old `opencode run --format json` line protocol.
- **Settings now surface OpenCode SDK diagnostics alongside the CLI version.** The OpenCode Settings version block now includes both `OpenCode CLI` and `OpenCode SDK`, with the SDK version sourced from the packaged provider bundle after install.

### Fixed
- **Native SDK loading no longer fails under the CommonJS provider runtime.** The wrapper uses native dynamic import for `@opencode-ai/sdk/v2`, avoiding the `ERR_PACKAGE_PATH_NOT_EXPORTED` failure caused by TypeScript lowering `import()` to `require(...)`.
- **SSE responses no longer hang waiting for a terminal snapshot after prompt failure.** The wrapper now treats non-OK `promptAsync` responses as immediate failures instead of waiting forever for `session.idle`.
- **Assistant/reasoning live deltas are now consumed from SSE.** The wrapper reads `message.part.delta` events, streams assistant tails immediately, and emits reasoning before the final answer when the provider exposes reasoning deltas.

### Verification
- `npm run build --workspace=@codeai-hub/glm-opencode-module`
- `node --test packages/GLM_OpenCode_Module/dist/provider/*.test.js`
- `npm run build --workspace=@codeai-hub/core`
- `npm run typecheck:webview`
- `npx ultracite check packages/GLM_OpenCode_Module/src/provider/... packages/core/src/remote-bridge/handlers/settings-provider-version-service.ts`
- `npm run check:knip`
- Live wrapper smoke (`workspace=/Users/oleksandroliinyk/VSCODE/FinderWidget-Test01`): `glm-5.2` emitted live assistant chunks at ~6438ms, a reasoning event at ~6534ms, then final `GREATER`; `kimi-k2.7-code` emitted live assistant chunks at ~4569ms, a reasoning event at ~4669ms, then final `GREATER`.

## [1.2.528] - 2026-06-16
### Changed
- **Deprecated `GLM-Claude-Code` has been fully removed from the active product surface.** Core registries, Settings tabs, Project Manager provider pickers, packaging scripts, manifests, and active SSOT docs no longer expose the old Claude-compatible GLM provider.
- **OpenCode is now the canonical GLM/Kimi wrapper runtime.** User-facing config and provider-home paths are documented and surfaced under `~/.codeai-hub/providers/opencode/...`, while runtime compatibility with older `glm-opencode` installs remains in the provider profile only.

### Fixed
- **Post-removal Core builds resolve workspace provider types again.** Core now keeps an explicit workspace type-resolution path for the built Claude module so provider cleanup does not break `@codeai-hub/core` TypeScript builds.
- **Release notes and live docs no longer point users to removed GLM-Claude-Code paths.** README, changelog, docs index and module/architecture docs now point users to the active OpenCode surface and current config locations.

### Verification
- `npm run build --workspace=@codeai-hub/claude-module`
- `npm run build --workspace=@codeai-hub/core`
- `npm run typecheck:webview`
- `npm run build:webview`
- `npm run plan:validate`

## [1.2.527] - 2026-06-16
### Fixed
- **`glmOpenCode` now behaves as a real OpenCode wrapper instead of a GLM-only skin.** User-facing labels, Settings, Session UI, start cards and Capture Workbench now treat the provider as `OpenCode`, while the verified selectors `zai-coding-plan/glm-5.2` and `kimi-for-coding/k2p7` are available through the same wrapper surface.
- **OpenCode auth/runtime is now OpenCode-owned.** CodeAI Hub copies the OpenCode auth catalog into the isolated provider runtime and still merges an explicit Z.AI key override when present, so GLM and Kimi can both run through the same isolated wrapper profile.
- **Adapter-launched `opencode run` no longer stalls on `init`.** The wrapper now starts OpenCode with closed child `stdin` (`stdio: ["ignore", "pipe", "pipe"]`), which removed the adapter-only hang while preserving successful live turns for both verified selectors.

### Verification
- `npm run build --workspace=@codeai-hub/glm-opencode-module`
- `node --test packages/GLM_OpenCode_Module/dist/provider/*.test.js`
- `npm run build --workspace=@codeai-hub/core`
- `npm run typecheck:webview`
- Live wrapper smoke via `GlmOpenCodeProviderAdapter`: `WRAPPER_GLM_OK`, `WRAPPER_KIMI_OK`

## [1.2.526] - 2026-06-16
### Fixed
- **Visible provider dialog updates use the reasoning translation overlay.** Ordinary assistant progress updates and Core-generated deferred user-role workflow messages now enter the session translation overlay, while actual human user input remains untouched.

### Verification
- `npx tsx --test packages/core/src/session-translation/session-translation-facade.test.ts packages/core/src/session-translation/session-translation-dispatcher.test.ts packages/core/src/remote-bridge/handlers/session-provider-event-router.test.ts`
- `npm run build --workspace=@codeai-hub/core`

## [1.2.525] - 2026-06-16
### Fixed
- **Stop unlocks stale thinking sessions across workflow steps.** Project Manager now keeps `idle + Thinking` locked only while the provider binding is still ready, so stopped sessions with stale visible thinking text no longer leave the input disabled.

### Verification
- `npx tsx --test src/client/ui/src/session/session-view.test.tsx src/client/ui/src/session/input-panel.test.tsx`
- `npm run typecheck:webview`

## [1.2.524] - 2026-06-15
### Fixed
- **Development Order Plan repair no longer loops on filled `agent-fill` blocks.** Core now treats only real `CODEAI_AGENT_FILL_SENTINEL` residue as incomplete draft content, so completed order-plan markdown can pass validation.
- **Stop unlocks Product Part managed repair sessions.** Manual Stop now force-releases Core managed input gates for `development_tree/materialized/product-parts/...` sessions, preventing a stopped GLM/Kimi repair turn from leaving the Project Manager input disabled.

### Verification
- `npx tsx --test packages/core/src/remote-bridge/handlers/product-part-development-order-plan-turn-controller.test.ts packages/core/src/remote-bridge/handlers/session-request-handler.stop.test.ts`
- `npm run build --workspace=@codeai-hub/core`

## [1.2.523] - 2026-06-15
### Fixed
- **Stale preliminary review gates no longer block downstream reviews.** When Core has already opened a managed downstream review, old Description or Virtual Simulation review messages are ignored for `userGateCursor`, preventing queued review bubbles and locked input on the current actionable step.

### Verification
- `npx tsx --test packages/core/src/remote-bridge/handlers/workflow-state-service-stale-user-gate.test.ts packages/core/src/remote-bridge/handlers/workflow-state-service-user-input-attention.test.ts packages/core/src/remote-bridge/handlers/workflow-state-service-user-action-attention.test.ts`
- `npm run build --workspace=@codeai-hub/core`

## [1.2.522] - 2026-06-15
### Fixed
- **Provider prompts now include the active workspace context.** Core prepends the canonical workspace name, slug and absolute root before `.codeai-hub/...` artifact instructions so agents resolve relative workflow outputs inside the active workspace, even when user materials contain external absolute paths.

### Verification
- `npx tsx --test --test-name-pattern "workspace context|outbound sends|rebinds stop-invalidated|unlock continuity locks|contextless" packages/core/src/remote-bridge/handlers/session-request-handler.create-resume.test.ts packages/core/src/remote-bridge/handlers/session-request-handler.test.ts packages/core/src/remote-bridge/handlers/session-request-handler.stop.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-codex-model-switch.test.ts`
- `npm run build --workspace=@codeai-hub/core`

## [1.2.521] - 2026-06-15
### Fixed
- **Legacy GLM settings migrate to the OpenCode GLM selector.** Persisted `glm-5.1`, `glm-5-turbo`, and `glm-4.5-air` values now normalize to `zai-coding-plan/glm-5.2` in Settings UI and Core model identity.

### Verification
- `npx tsx src/client/ui/src/components/settings/settings-state-helpers.persistence.test.ts`
- `npm run typecheck:webview`
- `npm run build --workspace=@codeai-hub/core`
- `node --test packages/core/dist/config/provider-settings-snapshot.test.js`
- Real workspace settings snapshot with `glm-5.1`, `glm-5-turbo`, and `glm-4.5-air` maps to `zai-coding-plan/glm-5.2` for UI and Core.

## [1.2.520] - 2026-06-15
### Changed
- **Kimi defaults now target Kimi K2.7 Code.** Provider registries, Core defaults, Project Manager capture/start surfaces, Session UI fallback labels and active SSOT docs now use `kimi-k2.7-code`.
- **OpenCode GLM defaults now target `zai-coding-plan/glm-5.2`.** Runtime model aliases, Core/provider descriptors, persisted settings defaults, capture settings, start cards, Session UI labels and active SSOT docs now use the canonical OpenCode selector.
- **Gemini CLI/Core dependencies are aligned to 0.46.0.** The Gemini compatibility layer now works with the 0.46.0 package layout.
- **Audit cleanup checks cover more non-gated risk.** Runtime security audit, duplicate/link/security CI coverage and pre-push checks now cover the audit gaps addressed in this scope.

### Fixed
- **New settings snapshots no longer seed Kimi with a GLM model id.**
- **GLM start cards no longer derive model options or fallbacks from the Kimi registry.**

### Verification
- `npm run build --workspace=@codeai-hub/kimi-module`
- `npm run build --workspace=@codeai-hub/claude-module`
- `npm run build --workspace=@codeai-hub/gemini-module`
- `npm run build --workspace=@codeai-hub/core`
- `npm run typecheck:webview`
- `npm run check:links`
- Live smoke: Kimi CLI with `--model kimi-k2.7-code` returned `MODEL_SMOKE_KIMI_27_OK` and provider logs included `kimi-k2.7-code`.
- Live smoke: GLM Claude-compatible endpoint returned HTTP 200 with response model `glm-5.2` and `MODEL_SMOKE_GLM_52_OK`.

## [1.2.519] - 2026-06-15
### Fixed
- **Project Manager locks session input during visible thinking.** If the active session's latest raw message is a thinking bubble, the input stays in the working state even when the status snapshot has already returned to idle.

### Verification
- `npm exec -- tsx src/client/ui/src/session/input-panel.test.tsx`
- `npm run build:webview`
- `npm run typecheck:webview`

## [1.2.518] - 2026-06-14
### Fixed
- **Development Tree user-gate focus is one-shot again.** Project Manager no longer repeatedly pulls the user back to the same active Product Part gate after manual navigation.
- **User-gate auto-open retries when the session appears.** The focus key now includes the Core-provided Product Part session identity, so a gate that appears before its session is attached can still open the session once it becomes available.
- **Product Part documentation agents start concurrently.** Core starts all Product Part documentation sessions and sends their first prompts before waiting for initial turns to settle, reducing secondary Product Part startup lag.

### Verification
- `npx tsx --test src/client/project-manager/components/layout/workflow-navigation.test.ts`
- `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-diagram-review-actions.test.ts`
- `npm run build --workspace packages/core`
- `npm run typecheck:webview`

## [1.2.517] - 2026-06-14
### Fixed
- **Project Manager refocuses the active Development Tree user gate when another node is selected.** The same active Product Part review gate can now pull the user back from `Application Skeleton` instead of being skipped as already focused.
- **Development Tree user-gate dialog intents target exact Core dialog ids.** When Core exposes `dialogId`, `rootSessionId`, and `sessionId`, Project Manager includes them in the open intent so the Product Part dialog is selected directly.

### Verification
- `npx tsx --test src/client/project-manager/components/layout/workflow-navigation.test.ts`
- `npm run typecheck:webview`

## [1.2.516] - 2026-06-14
### Fixed
- **Project Manager opens the active Development Tree user gate session.** When Core reports a Product Part review gate through `userGateCursor.activeUserGate`, the sidebar focus now also opens the Core-provided session instead of only highlighting the row while another workflow dialog stays visible.

### Verification
- `npx tsx --test src/client/project-manager/components/layout/workflow-navigation.test.ts`
- `npm run typecheck:webview`

## [1.2.515] - 2026-06-14
### Fixed
- **Application Skeleton no longer blocks on Product Part documentation dirt.** Main-workspace Product Part documentation paths are now neutral for the technical-stage dirty gate, so Product Part agents can keep writing drafts/TODO ledgers while the trunk proceeds to Application Skeleton.
- **Development Tree lock copy points at the real prerequisite.** Before `Diagram Modules` is accepted, the locked Development Tree placeholder now references `Diagram Modules` instead of `Quality Gates Baseline`.
- **Regression coverage matches the reported blocker.** The dirty-gate test now covers a dirty `ProductPartDevelopmentBrief.draft.md` and Product Part stage `todo-plan.md` while expecting the technical workspace status to remain clean.

### Verification
- `npx tsx --test packages/core/src/remote-bridge/handlers/technical-stage-dirty-gate.test.ts`
- `npx tsx --test src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.test.ts`

## [1.2.514] - 2026-06-14
### Changed
- **Product Part documentation sessions now run in the main workspace.** After accepted `Diagram Modules`, Core still bootstraps every planned Product Part session, draft artifact, Product Part TODO ledger, managed state, persisted prompt, and first provider turn, but it no longer creates Product Part pre-code worktrees.
- **Product Part managed state no longer requires `worktreePath`.** Project Manager can project Product Part sessions from main-workspace managed state and continuity, while legacy worktree projection remains compatibility behavior for older lanes.
- **Accepted Product Part brief/order-plan checkpoints are no-ops in main.** The checkpoint helpers now skip extra copy/commit work when the session already runs in the main workspace, keeping accepted documentation artifacts in place.

### Verification
- `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-diagram-review-actions.test.ts`
- `npx tsx --test packages/core/src/remote-bridge/handlers/product-part-development-brief-turn-controller.test.ts`
- `npm run build --workspace packages/core`

## [1.2.513] - 2026-06-14
### Changed
- **Accepted lead Product Part order plans now close the pre-code lane in main.** Core checkpoints the accepted `DevelopmentOrderPlan` draft/JSON, Product Part TODO ledger, unlock state, and managed decision state from the lane worktree back into the main workspace.
- **Product Part lane worktrees are removed after the final checkpoint.** The temporary Product Part pre-code worktree folders are no longer kept after accepted order-plan closeout.
- **Cluster/Module sessions no longer start from Product Part acceptance.** Downstream Cluster/Module execution stays locked for a later verified-main phase, after Application Skeleton and Quality Gates exist in the main workspace.

### Verification
- `npx tsx --test packages/core/src/development-tree/product-part-workflow/product-part-development-brief-plan-writer.test.ts packages/core/src/remote-bridge/handlers/product-part-development-brief-turn-controller.test.ts packages/core/src/remote-bridge/handlers/product-part-managed-review-decision-handler.test.ts packages/core/src/remote-bridge/handlers/product-part-development-brief-review-controller.lane.test.ts packages/core/src/remote-bridge/handlers/workflow-step-clear-product-part-restart.test.ts`
- `npm run build --workspace @codeai-hub/core`

## [1.2.512] - 2026-06-14
### Fixed
- **Managed review attention now clears on explicit user action.** When the user presses `Подтверждаю` or sends a message after a managed review gate, Core suppresses the active `userGateCursor` until a new Core-owned review opens.
- **Project Manager no longer waits for polling after user session messages.** User message events now request a fresh workflow-state snapshot, so the pulsing orange frame disappears immediately instead of lagging behind the confirmed/replied state.
- **Regression coverage locks the behavior.** Core tests cover consumed managed review gates, and Project Manager tests cover the user-message refresh trigger.

### Verification
- `npx tsx --test packages/core/src/remote-bridge/handlers/workflow-user-input-attention.test.ts packages/core/src/remote-bridge/handlers/workflow-state-service-user-input-attention.test.ts packages/core/src/remote-bridge/handlers/workflow-state-service-user-action-attention.test.ts src/client/project-manager/components/layout/workflow-navigation.test.ts`
- `npm run lint`
- `npm run build --workspace @codeai-hub/core`
- `npm run typecheck:webview`

## [1.2.511] - 2026-06-14
### Fixed
- **Clearing `Application Skeleton` no longer removes Product Part Development Tree lanes.** Workflow rollback now preserves Product Part pre-code artifacts, managed decisions, continuity chains, continuity index entries, and Development Tree TODO scaffolds when the cleared stage is `Application Skeleton` or `Quality Gates Baseline`.
- **Clearing `Diagram Modules` still removes Product Part lanes as downstream state.** The preserve/restore path is intentionally disabled for `Diagram Modules` and earlier documentation steps.

### Verification
- `npx tsx --test packages/core/src/remote-bridge/handlers/workflow-step-clear-service.test.ts packages/core/src/remote-bridge/handlers/workflow-step-clear-application-skeleton-boundary.test.ts`
- `npm run lint`
- `./scripts/check-architecture.sh`
- `npm run build --workspace @codeai-hub/core`

## [1.2.510] - 2026-06-13
### Fixed
- **Quality Gates no longer reboots Product Part pre-code lanes.** The stale `Quality Gates Baseline` terminal handoff bootstrap helper/API was removed, so Product Part sessions start from accepted `Diagram Modules` or explicit Product Part recovery paths only.
- **A regression test now locks the boundary.** Quality Gates completion with accepted Diagram Modules artifacts must not call the Development Tree gateway, create Product Part brief plans/drafts, or write the Product Part bootstrap commit.

### Verification
- `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.quality-gates.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-diagram-review-actions.test.ts packages/core/src/remote-bridge/handlers/workflow-step-clear-product-part-restart.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `./scripts/build-all.sh --allow-dirty`
- `./scripts/build-release.sh --use-current-version --allow-dirty`

## [1.2.509] - 2026-06-13
### Changed
- **Clean rebuild of the 1.2.508 persisted handoff fix under a new release number.** Runtime behavior is unchanged from 1.2.508; this release exists so the next retest installs a fresh package version.

### Verification
- `./scripts/build-all.sh --allow-dirty`
- `./scripts/build-release.sh --use-current-version --allow-dirty`

## [1.2.508] - 2026-06-13
### Fixed
- **Core now persists the next active stage after `Diagram Modules` acceptance.** The managed acceptance flow writes `workflow/state.json.lastActive.stage=application_skeleton` and the `Application Skeleton` artifact path, so Project Manager snapshot recovery no longer depends only on the realtime activation event.
- **The `Diagram Modules -> Application Skeleton` handoff has a Core regression test.** The acceptance test now verifies both `workspace.plan.md` stage advancement and the persisted `workflow/state.json.lastActive` value.

### Verification
- `npm run build --workspace @codeai-hub/core`
- `npx tsx --test packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-review-acceptance.test.ts`
- `npx tsx --test src/client/project-manager/components/layout/workflow-navigation.test.ts`
- `npm run typecheck:webview`
- `npm run build:project-manager`
- `npm run build:webview`

## [1.2.507] - 2026-06-13
### Fixed
- **Project Manager now recovers stage handoff from persisted workflow state.** Panel sync treats `workflowState.lastActive.stage` as a snapshot fallback and re-dispatches the shared `pm:stage:activated` route, so accepting `Diagram Modules` can still open `Application Skeleton` even if the realtime activation event was missed.
- **The sidebar selection, session panel, and artifact panel use the same recovery path.** Snapshot recovery no longer adds a separate UI truth path; it reuses the same stage activation event used by Core and tree clicks.

### Verification
- `npx tsx --test src/client/project-manager/components/layout/workflow-navigation.test.ts`
- `npm run typecheck:webview`
- `npm run build:project-manager`
- `npm run build:webview`

## [1.2.506] - 2026-06-13
### Fixed
- **Stage handoff replay now waits for the refreshed workflow snapshot.** Core-owned `workflow:stage:activate` events are retained and replayed by Project Manager panel sync after `workflowState.updatedAt` changes, so accepting `Diagram Modules` reliably opens the `Application Skeleton` card.
- **Projected Development Tree dialogs stay locked during runtime hydration.** Pending dialog bootstrap now applies a temporary `runtime_state_hydration` input lock until Core runtime snapshot/turn-state arrives, preventing Product Part sessions from reopening input while the agent is still working.
- **Documentation Tree and Development Tree now share one selected-node cursor.** Selecting a Product Part, Cluster, Module, or operation moves the green selected frame to that node and removes the stale selection from the previous Documentation Tree stage.

### Verification
- `npx tsx --test src/client/project-manager/components/layout/workflow-navigation.test.ts src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts`
- `npm run typecheck:webview`
- `npm run build:project-manager`
- `npm run build:webview`

## [1.2.505] - 2026-06-13
### Fixed
- **Project Manager now refreshes the tree when only the user-gate cursor changes.** The workflow-state change token includes active and queued `userGateCursor` identity, so pulsing attention markers appear immediately for newly opened review gates.
- **Repeated review gates on the same Development Tree node re-focus correctly.** The sidebar auto-focus key now includes gate identity and task data, so a Product Part brief review and later `DevelopmentOrderPlan` review do not collapse into one already-focused node.
- **Queued managed reviews no longer promise a missing confirm button.** Read-only queued review cards show a waiting message until Core promotes that gate to active, instead of rendering stale text that says to press `Подтверждаю` below.

### Verification
- `npm run typecheck:webview`
- `npx tsx --test src/client/project-manager/services/workflow-state-change-token.test.ts src/client/project-manager/components/layout/workflow-navigation.test.ts src/client/project-manager/components/sessions/project-manager-dialog-session-view-helpers.test.ts`
- `npm run build:project-manager`
- `npm run build:webview`

## [1.2.504] - 2026-06-13
### Fixed
- **Project Manager now focuses the active Core-owned user gate.** When Core exposes an active Documentation Tree or Development Tree user gate, the sidebar selects that node and opens the session/review card that needs the user response.
- **Development Tree Product Parts no longer auto-expand on hydration.** Product Part rows start collapsed, so the lead Product Part does not look like the next actionable task simply because it has nested clusters/modules.
- **P/C/M markers now own expansion while labels own selection.** Clicking a Product Part, Cluster, or Module marker expands/collapses that node; clicking the node name only selects it and opens its session/artifacts.

### Verification
- `npx tsx --test src/client/project-manager/components/layout/workflow-navigation.test.ts`
- `npm run typecheck:webview`
- `npm run build:project-manager`
- `npm run build:webview`

## [1.2.503] - 2026-06-13
### Fixed
- **Lead Product Part review is now Core-deferred until secondary briefs are accepted.** A lead Product Part draft can finish first, but Core records it as `ready_for_review_deferred` and does not show the user confirmation card until all secondary Product Part Development Briefs are accepted.
- **Secondary acceptance now promotes the deferred lead review in the lead session.** After the last secondary brief is accepted, Core sends the `managed-workflow-user-review` message to the lead Product Part session; the lead Development Order Plan assignment still waits for that lead review acceptance.
- **Development Tree draft prompts now list exact target paths.** Product Part, Cluster, and Module agents receive materialized relative paths for their draft files, reducing accidental writes to the lane worktree root.
- **Order-plan regression fixtures now include required contract seeds.** The targeted test suite covers the current v2 Development Order Plan validator contract while staying under the 500-line source guard.

### Verification
- `npm run build --workspace @codeai-hub/core`
- `node --test --test-reporter=spec packages/core/dist/development-tree/node-bootstrap/node-first-message-builder.test.js packages/core/dist/remote-bridge/handlers/product-part-brief-review-deferral.test.js packages/core/dist/remote-bridge/handlers/product-part-development-brief-turn-controller.test.js packages/core/dist/remote-bridge/handlers/product-part-development-brief-review-controller.lane.test.js packages/core/dist/remote-bridge/handlers/product-part-managed-review-decision-handler.test.js`

## [1.2.502] - 2026-06-13
### Fixed
- **Product Part pre-code work now runs in deterministic worktree lanes.** After `Diagram Modules` acceptance, Product Part draft sessions start in per-part precode Git worktrees while the main workspace keeps only Core-owned orchestration projection state.
- **Accepted secondary Product Part briefs checkpoint back to main sequentially.** The lead Product Part Development Order Plan prompt is dispatched only after all accepted Product Part briefs are present in main and embedded inline in the lead assignment.
- **Product Part root clear/undo now cleans lane runtime state.** Clear removes Product Part lane worktrees, temporary branches, continuity state, stale unified/provider sessions, then recreates a fresh precode lane for the selected Product Part.

### Verification
- `npm run build --workspace @codeai-hub/core`
- `node --test --test-reporter=spec packages/core/dist/remote-bridge/handlers/session-request-handler-diagram-review-actions.test.js packages/core/dist/remote-bridge/handlers/development-tree-product-part-lane-projected-session.test.js packages/core/dist/remote-bridge/handlers/product-part-development-brief-review-controller.lane.test.js packages/core/dist/remote-bridge/handlers/product-part-development-brief-review-controller.prompt.test.js packages/core/dist/development-tree/development-tree-user-gate-cursor.test.js packages/core/dist/remote-bridge/handlers/workflow-step-clear-product-part-restart.test.js packages/core/dist/remote-bridge/handlers/workflow-step-clear-development-tree-node.test.js`
- `npm run typecheck:webview`
- `npm run build:project-manager`
- `npm run build:webview`

## [1.2.501] - 2026-06-13
### Fixed
- **Product Part bootstrap from Diagram Modules review actions now waits for each initial agent turn.** The managed review action path now wraps the Development Tree agent gateway with `waitForInitialTurnSettled`, matching the Quality Gates handoff path.
- **Diagram Modules acceptance no longer dispatches Product Part first turns almost simultaneously.** Secondary and lead Product Part sessions still start automatically, but Core waits for the current Product Part turn to settle before starting the next one.
- **The Codex refresh-token race is no longer recreated by the early Product Part fan-out.** Workspaces that already hit `refresh token was already used` may still require one manual Codex sign-out/sign-in, but Core should not recreate the race after re-authentication.

### Verification
- `npm run build --workspace @codeai-hub/core`
- `node --test --test-reporter=spec packages/core/dist/remote-bridge/handlers/session-request-handler-diagram-review-actions.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-managed-workflow-turn.quality-gates.test.js`

## [1.2.500] - 2026-06-13
### Fixed
- **Managed review gates now share one complete attention cursor.** Core exposes active user attention for `Diagram Modules`, `Application Skeleton` final review, and repair-limit user review across `Diagram Modules`, `Application Skeleton`, and `Quality Gates Baseline`.
- **Development Tree review gates now reach the right rows.** Lead `DevelopmentOrderPlan` review and Cluster Contract review now participate in the same active/queued user-gate cursor as Product Part brief review.
- **Cluster gate ids map to visible Project Manager nodes.** Project Manager normalizes semantic `cluster:<part>/<cluster>` ids to the rendered `devtree:<part>:<cluster>` row so Cluster Contract review can pulse the cluster node itself.

### Verification
- `npm run build --workspace @codeai-hub/core`
- `node --test --test-reporter=spec packages/core/dist/remote-bridge/handlers/workflow-state-service-user-input-attention.test.js packages/core/dist/remote-bridge/handlers/workflow-user-input-attention.test.js packages/core/dist/development-tree/development-tree-user-gate-cursor.test.js`
- `npx tsx --test src/client/project-manager/components/layout/workflow-navigation.test.ts`
- `npm run typecheck:webview`
- `npm run build:project-manager`
- `npm run build:webview`

## [1.2.499] - 2026-06-13
### Fixed
- **Managed review attention now refreshes immediately.** Project Manager requests an immediate workflow-state refresh when Core emits `managed-workflow-user-review` or `managed-workflow-complete` session messages, so the orange animated marker appears with the review card and closes as soon as the user accepts.
- **Stage activation also refreshes the shared workflow-state snapshot.** Core-managed stage activation now nudges the same store, reducing stale tree state after review transitions.
- **FinderWidget retest questionnaire now requires two product parts.** The test fixture explicitly defines lead `finder-widget` and secondary `finder-widget-shell` so the next retest exercises lead/non-lead product-part orchestration.

### Verification
- `npm run typecheck:webview`
- `npm run build:project-manager`
- `npm run build:webview`
- `npx tsx --test src/client/project-manager/components/layout/workflow-navigation.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `node --test --test-reporter=spec packages/core/dist/remote-bridge/handlers/workflow-user-input-attention.test.js packages/core/dist/remote-bridge/handlers/workflow-state-service-user-input-attention.test.js`

## [1.2.498] - 2026-06-12
### Fixed
- **Preliminary Documentation Tree review now triggers the active attention marker.** Core detects open `Description` and `Virtual Simulation` preliminary review turns from session messages and exposes them through the same `userGateCursor` as other managed user gates.
- **Artifact presence no longer hides an open preliminary review.** `Final_Description.md` and `virtual-simulation.md` may already exist, but the tree row remains an active pulsing orange gate until Core records `managed-workflow-complete`.
- **The marker lifecycle follows the existing preliminary review contract.** `managed-workflow-user-review` opens the attention state, and `managed-workflow-complete` closes it without adding Project Manager-owned workflow truth.

### Verification
- `npm run build --workspace @codeai-hub/core`
- `node --test --test-reporter=spec packages/core/dist/remote-bridge/handlers/workflow-user-input-attention.test.js packages/core/dist/remote-bridge/handlers/workflow-state-service-user-input-attention.test.js packages/core/dist/remote-bridge/handlers/development-tree-user-gate-cursor.test.js`
- `npm run typecheck:webview`
- `npm run build:project-manager`
- `npm run build:webview`

## [1.2.497] - 2026-06-12
### Fixed
- **Quality Gates research review now triggers the active attention marker.** Core detects the open Quality Gates user review from the managed stage `todo-plan.md` review task, so `Quality Gates Baseline` gets the pulsing orange frame even while only `quality-gates-research.md` and `quality-gates-research.json` exist.
- **Research review artifact targets are explicit.** The workflow state cursor points the active gate at the research artifacts before the final `quality-gates.md` / `quality-gates.json` contract is created.
- **Stale managed decision JSON remains non-authoritative.** The marker is driven by the active stage plan review task, not by stale `workflow/managed/*.json` state from older completed turns.

### Verification
- `npm run build --workspace @codeai-hub/core`
- `node --test --test-reporter=spec packages/core/dist/remote-bridge/handlers/workflow-state-service-user-input-attention.test.js packages/core/dist/remote-bridge/handlers/workflow-user-input-attention.test.js packages/core/dist/remote-bridge/handlers/development-tree-user-gate-cursor.test.js`
- `npm run typecheck:webview`
- `npm run build:project-manager`
- `npm run build:webview`

## [1.2.496] - 2026-06-12
### Fixed
- **Attention markers now come from managed user gates, not continuable chats.** Core derives the Project Manager orange cursor from explicit managed user-review/user-gate state in the Documentation Tree and Development Tree. A formally completed step remains green even though its chat can still be resumed by the user.
- **Quality Gates Baseline now participates in the managed attention cursor.** When Quality Gates reaches `awaiting_acceptance`, the workflow state read model exposes it as the active `workflow:quality_gates` user gate.
- **The active tree row now pulses its orange frame.** Project Manager keeps the orange frame visible and animates its intensity instead of relying only on the small status/type marker.

### Verification
- `npm run build --workspace @codeai-hub/core`
- `node --test --test-reporter=spec packages/core/dist/remote-bridge/handlers/workflow-user-input-attention.test.js packages/core/dist/remote-bridge/handlers/workflow-state-service-user-input-attention.test.js packages/core/dist/development-tree/development-tree-user-gate-cursor.test.js`
- `npm run typecheck:webview`
- `npm run build:project-manager`
- `npm run build:webview`

## [1.2.495] - 2026-06-12
### Fixed
- **Project Manager now shows the active user-gate review cursor.** Core exposes a single active review gate plus queued gates, and Project Manager renders the active gate in the existing Documentation Tree / Development Tree with a pulsing amber marker.
- **Queued review gates are visible but read-only.** Queued managed review sessions keep their history visible, but the confirmation action is hidden and input is locked until Core promotes that gate.
- **Lead Product Part review is held until secondary briefs are handled.** Development Tree user-gate ordering presents non-lead Product Part brief reviews before the lead Product Part, so the lead `DevelopmentOrderPlan` remains the final user reaction in that group.
- **Documentation Tree review gates join the same attention model.** `Application Skeleton` and `Quality Gates Baseline` review prompts now participate in the top-level user-gate cursor when their managed review message waits for confirmation.

### Verification
- `npm run build --workspace @codeai-hub/core`
- `node --test --test-reporter=spec packages/core/dist/development-tree/development-tree-user-gate-cursor.test.js`
- `npx tsx --test src/client/project-manager/services/workflow-state-client.test.ts`
- `npm run typecheck:webview`
- `npm run build:project-manager`
- `npm run build:webview`

## [1.2.494] - 2026-06-12
### Fixed
- **Workflow boundary preflight now preserves dot-prefixed status paths.** `WorkflowBoundaryGit.statusPorcelain()` no longer trims the leading status column from `git status --porcelain`, so an unstaged modified tracked path such as `.codeai-hub/<workspace>/workflow/state.json` is not rewritten into `codeai-hub/<workspace>/workflow/state.json`.
- **Description -> Virtual Simulation can continue after workflow state changes.** Boundary preparation now stages the real `.codeai-hub/...` pathspec instead of failing with `fatal: pathspec 'codeai-hub/.../workflow/state.json' did not match any files`.

### Verification
- `npm run build --workspace @codeai-hub/core`
- `node --test --test-reporter=spec packages/core/dist/workflow/boundary/workflow-boundary-git.test.js packages/core/dist/workflow/boundary/workflow-boundary-facade.test.js packages/core/dist/remote-bridge/remote-bridge-session-create-router.test.js`

## [1.2.493] - 2026-06-12
### Fixed
- **Diagram Modules acceptance now starts Product Part pre-code agents.** Core materializes the neutral Development Tree artifact workspace and starts every planned Product Part brief session immediately after accepted Diagram Modules, using the full `leadProductPartId` / `productPartLeadershipOrder` / remaining planned-id order.
- **Quality Gates handoff is now recovery/idempotency, not the primary Product Part trigger.** The verified Quality Gates terminal handoff reruns the same Core bootstrap path only to recover missing Product Part sessions.

### Changed
- **Development Tree pre-code work is separated from code-readiness.** Product Part briefs may run in parallel with `Application Skeleton` and `Quality Gates Baseline`, while production code, code-ready downstream merge, and final integration still require committed skeleton materialization plus verified Quality Gates evidence.
- **SSOT docs now describe the two-lane model.** The active Development Tree planning document, System Architecture, and Workflow Steps overview distinguish early pre-code fan-out from the later code-generation gate.

### Verification
- `npm run build --workspace @codeai-hub/core`
- `node --test --test-reporter=spec packages/core/dist/remote-bridge/handlers/session-request-handler-diagram-review-actions.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-managed-workflow-turn.quality-gates.test.js`

## [1.2.492] - 2026-06-11
### Fixed
- **Quality Gates handoff now fans out to every planned Product Part.** Core builds the complete Product Part leadership order from `leadProductPartId`, declared `productPartLeadershipOrder`, and any remaining planned ids, then starts/restarts a Product Part agent session for each planned part.
- **Missing Product Part sessions fail closed instead of blocking silently.** If targeted recovery still cannot start a planned Product Part session, the Development Tree handoff raises an explicit Core error so the lead all-brief barrier cannot wait forever on a never-started Product Part.

### Changed
- **Development Tree docs now define Product Part root work as Core fan-out.** Cluster and Module sessions remain downstream-controlled by accepted Product Part order waves or explicit node commands, while Product Part root sessions are created by the Quality Gates terminal handoff.

### Verification
- `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.quality-gates.test.ts`
- `npm run build --workspace=@codeai-hub/core`

## [1.2.491] - 2026-06-11
### Fixed
- **Product Part Clear/Restart recreates the managed agent session.** Product Part bootstrap now starts a new agent session whenever the Product Part managed plan participates in bootstrap, even if plan/draft files already exist after a partial reset.
- **Product Part `Start node` no longer creates an empty shell session.** Project Manager start commands for Product Part roots route through Core-owned Product Part bootstrap, creating the managed plan, draft, prompt and dialog history together.
- **Stale Development Tree dialog projections are hidden.** Dialog list projection drops `development_tree/...` continuity entries when the selected dialog has no live runtime session and no persisted unified history file, so stale shells do not open as empty chats.

### Changed
- **Bootstrap/restart invariants are documented as Core-owned.** Development Tree docs now state that Product Part manual start and Product Part root Clear/Restart share one bootstrap path, and that Project Manager may render only live or persisted Development Tree dialogs.

### Verification
- `npx tsx --test packages/core/src/development-tree/node-bootstrap/development-tree-node-bootstrap-facade.test.ts`
- `npx tsx --test packages/core/src/remote-bridge/remote-bridge-development-tree-node-command-router.test.ts`
- `npx tsx --test packages/core/src/remote-bridge/handlers/dialog-list-service.test.ts`
- `npx tsx --test packages/core/src/remote-bridge/handlers/development-tree-projected-session.test.ts`
- `npm run build --workspace=@codeai-hub/core`

## [1.2.490] - 2026-06-11
### Fixed
- **Product Part review sessions are projected into Project Manager.** Managed Product Part brief-review state now resolves through main workspace continuity and is attached to the Product Part node as a started Development Tree session, so non-lead Product Part nodes can open their dialog instead of showing an empty placeholder.
- **Product Part review history is persisted before provider races can hide it.** Development Tree managed startup waits for dialog-message persistence after appending the agent start prompt and before dispatching the provider turn, preventing a translation overlay from existing without the primary unified JSONL history.
- **Lead `DevelopmentOrderPlan` waits for all Product Part briefs.** Core blocks the lead Product Part order-plan task until every planned Product Part brief has a Core-owned user-reviewed accepted state.
- **Secondary Product Part acceptance dispatches the unlocked lead turn to the lead session.** When the final non-lead brief opens the all-brief barrier, Core moves the previously blocked lead order-plan task to `IN_PROGRESS` and routes the continuation to the lead Product Part session instead of the current secondary session.

### Changed
- **Lead order-plan prompts now embed every accepted Product Part brief.** The prompt includes the full markdown text, status, and declared leadership order for all planned Product Parts, so the lead Product Part can plan waves across the whole product instead of seeing only its own brief.

### Verification
- `npx tsx --test packages/core/src/remote-bridge/handlers/development-tree-projected-session.test.ts`
- `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core-start-prompt-role.test.ts`
- `npx tsx --test packages/core/src/remote-bridge/handlers/product-part-development-brief-review-controller.prompt.test.ts`
- `npm run build --workspace=@codeai-hub/core`

## [1.2.489] - 2026-06-10
### Fixed
- **Cluster Contract first prompts now carry the runtime language contract.** The downstream cluster-contract bootstrap path resolves chat and artifact prose languages through the existing global localization settings loaders before sending the first prompt, so `reasoning=ru` no longer falls back to English agent progress/final chat.

### Changed
- **Russian language settings get an explicit reinforcement block.** Cluster Contract prompts now start with both the generic workflow language contract and a Russian reminder when the chat language is `ru`, while keeping canonical file names, ids, JSON keys, method/event names, structural headings, and status tokens in English.

### Verification
- `npx tsx --test packages/core/src/development-tree/node-bootstrap/cluster-contract-agent-bootstrapper.test.ts packages/core/src/development-tree/cluster-workflow/cluster-contract-prompt-builder.test.ts`
- `npx ultracite check packages/core/src/development-tree/cluster-workflow/cluster-contract-prompt-builder.ts packages/core/src/development-tree/node-bootstrap/cluster-contract-agent-bootstrapper.ts packages/core/src/development-tree/node-bootstrap/cluster-contract-agent-bootstrapper.test.ts`
- `npm run build --workspace=@codeai-hub/core`

## [1.2.488] - 2026-06-10
### Fixed
- **Cluster Contract acceptance no longer performs a draft-only mainline merge.** Accepting a downstream Cluster Contract now writes a Core-owned `.boundary-accepted.json` coordination checkpoint instead of copying `ClusterSpecification` / `ClusterFacadeContract` draft artifacts into the main workspace.
- **Cluster unlock state is no longer marked `merged` before code exists.** The downstream cluster worktree remains active after contract acceptance, and the `merged` state is reserved for a later code-ready integration that includes the cluster facade and module contents.

### Changed
- **Development Tree planning now distinguishes boundary acceptance from merge.** The downstream refactor plan defines `boundary_accepted`, `worktree_active`, `code_ready`, and `merged` as separate lifecycle states so future Cluster and Standalone Module work can share the same code-ready merge rule.

### Verification
- `npx tsx --test packages/core/src/development-tree/node-bootstrap/development-tree-node-merge-service.test.ts packages/core/src/remote-bridge/handlers/cluster-contract-review-controller.test.ts`
- `npx ultracite check packages/core/src/development-tree/node-bootstrap/development-tree-node-merge-service.ts packages/core/src/development-tree/node-bootstrap/development-tree-node-merge-service.test.ts packages/core/src/remote-bridge/handlers/cluster-contract-review-controller.ts`
- `npm run build --workspace=@codeai-hub/core`

## [1.2.487] - 2026-06-10
### Fixed
- **Quality Gates Phase 4 restore races are rejected.** A `verified` Quality Gates state now requires explicit sequential verification evidence (`verificationEvidence.executionMode: "sequential"` plus ordered command entries with `sequence` and `exitCode: 0`), so restore/install/delete-style formal verification cannot be accepted as a parallel or ambiguous run.

### Changed
- **Quality Gates verification prompts now serialize mutating commands.** Core continuation prompts, repair prompts, and the bundled Quality Gates agent template instruct agents to resolve scripts first, build one ordered verification plan, and run dependency restore/install/clean/delete commands plus hooks or aggregates that may invoke them as exclusive workspace mutation commands.
- **Sequential evidence is documented as the SSOT contract.** Managed workflow orchestration docs describe Phase 4 verification as an ordered workspace transaction before persistent return or Development Tree unlock.

### Verification
- `npx tsx --test packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-formal-verification-runner.test.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator-runner-evidence.test.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-prompt-builder.phase-envelope.test.ts packages/core/src/templates/quality-gates-bundled-templates.test.ts` - 19/19 green.
- `npm run build --workspace=@codeai-hub/core`

## [1.2.486] - 2026-06-10
### Fixed
- **Repair-limit gate continues the workflow.** Confirming the "repair attempt limit (3)" review gate now performs accept-as-is: workspace residue is auto-committed, the open repair task closes with an accepted-as-is disposition, the stage plan advances to its next phase (Quality Gates: review/verification/persistent return; Diagram Modules: user review; Application Skeleton: contract/final review), and the matching continuation is dispatched. Revision text dispatches a user-corrections repair prompt. Previously the confirmation died in a silent `managed_review_gate_unhandled` error and development stopped.
- **Unmatched review confirmations release the input.** A confirm that no handler can apply now appends a Core message naming the unmatched state with a concrete recovery action instead of an invisible session error.

### Changed
- **Name-agnostic Quality Gates validation.** Integration now validates entities, not names: each required gate must have `commands.<gate-id>.proposedCommand` as the single source of truth, the command must resolve through `package.json` (transitively), and it must be reachable from the matching `.husky` hook directly or through aggregate scripts. Script names and `qg:*` prefixes are a style recommendation, never a rejection reason. Verification accepts hook runs (`sh .husky/pre-commit` / `sh .husky/pre-push`) as enforcement proof without requiring aggregate script names. Diagnostics name the exact missing/unresolved/unreachable command, and the stage templates teach the same contract.

### Verification
- `npm run build --workspace @codeai-hub/core`
- `node --test` over the Quality Gates suite (validator, runner, reachability, name-agnostic regression, templates), repair-limit acceptance and dispatcher suites, and managed review session actions — 65/65 green.

## [1.2.485] - 2026-06-10
### Changed
- **No-stop dual-outcome policy for the orchestrator.** Every Core settlement of a managed turn, validation, or commit boundary now ends either as an agent repair/continuation dispatch or as a button gate with a concrete user action; informational "Core cannot continue" stop cards are removed as a class.
- **Dirty Git is eliminated as a stop.** Managed terminal boundaries, workflow boundary anchors, and accepted-step commits auto-commit with two-basket classification: step-owned residue joins the managed step commit, everything else is preserved in a separate `chore: preserve workspace changes` commit. Idempotent no-staged turns advance with the current HEAD hash instead of blocking.
- **Bounded repair loops.** Repair dispatch attempts per artifact are capped at 3; on exhaustion the artifact opens for review as is (accept to continue, or describe corrections) instead of looping forever.

### Fixed
- **Silent stops eliminated.** Agent continuation dispatch is awaited with one retry and reports delivery failure with a released input; settled managed turns now dispatch their prepared repair prompts (including Quality Gates `repair_integration`/`repair_verification`); managed turn-completion failures and Development Tree plan parse failures produce a released-input Core message instead of a hung dialog.
- **Managed turn arbitration is time-boxed (120s).** A hung handler can no longer hold "agent is working" forever.
- **Project Manager releases the input on every Core gate.** A `managed_input_gate` `active: false` event unlocks any managed lock reason (prefix-based), and the optimistic review-click lock expires after 60s without a Core ack.
- **Stage plan bookkeeping pauses are actionable.** Plan-state boundary messages now release the input and instruct re-validation instead of declaring "Core cannot continue".
- **Legacy red boundary tests repaired.** Three stale tests were rewritten to the current living-runtime semantics and the boundary suite is green.

### Documentation
- Stop-gate planning source rewritten to the accepted no-stop dual-outcome policy with the silent-stop audit classes; both Development Tree planning documents, Core/PM cluster SSOT invariants, and the workflow overview describe the new gates.

### Verification
- `npm run build --workspace @codeai-hub/core`
- `node --test packages/core/dist/workflow/boundary/*.test.js packages/core/dist/managed-workflow-orchestration/**/*.test.js packages/core/dist/remote-bridge/handlers/managed-internal-continuation-dispatch.test.js packages/core/dist/remote-bridge/handlers/session-provider-event-router.test.js`
- `npm run build:webview`
- `npm run typecheck:webview`
- `npx tsx --test src/client/project-manager/components/sessions/turn-state-stream.test.ts`

## [1.2.484] - 2026-06-10
### Fixed
- **Attached worktree sessions now live-stream to the main Project Manager client.** Core WebSocket scoped delivery treats `<mainWorkspace>.worktrees/...` as Core-owned attached runtime roots, so Cluster/Module sessions created in separate worktrees are no longer filtered out as unrelated workspaces.
- **Workspace reconnect now hydrates attached session scope.** When Project Manager selects or reconnects to the main workspace, Core pre-populates session/workspace mappings for all known sessions under the attached `.worktrees` root, not just exact main-workspace sessions.
- **Unrelated workspaces remain isolated.** The attachment predicate accepts only the main workspace and its sibling `.worktrees` subtree; prefix-only paths such as `.worktrees2` and other projects are rejected.

### Documentation
- **Planning docs now make runtime attachment Core-owned.** The Development Tree branch workflow and Product Part sub-agent orchestration plans specify that the component creating a worktree must attach it to the observation graph immediately; UI selection only renders already observed state.

### Verification
- `npm run build --workspace packages/core`
- `node --test packages/core/dist/remote-bridge/handlers/workspace-runtime-attachment-scope.test.js packages/core/dist/remote-bridge/handlers/websocket-attached-worktree-streaming.test.js`
- `npm run build:webview`
- `npm run typecheck:webview`

## [1.2.483] - 2026-06-09
### Fixed
- **Projected Cluster dialogs now keep the resolved worktree root.** Project Manager replaces the active dialog intent with the Core-resolved `worktreePath`, so live history refresh reads the cluster worktree JSONL instead of falling back to the main workspace runtime.
- **Projected Cluster review confirmations now use `dialog:send`.** The `Подтверждаю` action carries `turnOptions.managedReviewAction` through the worktree-backed dialog chain instead of bypassing it with a direct runtime session message.
- **Managed review clicks now show the correct wait state.** Project Manager applies a local managed-review lock while Core processes the confirmation, avoiding the contradictory free-text placeholder on a blocked input.

### Documentation
- **Development Tree planning docs now record the regression contract.** The branch workflow and sub-agent orchestration plans describe the symptoms, root causes, required Core/client invariants, and manual regression checks for projected worktree dialogs.

### Verification
- `npx tsx --test src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts`
- `npm run build --workspace packages/core`
- `node --test packages/core/dist/remote-bridge/handlers/session-request-handler-codex-model-switch.test.js`
- `npm run build:project-manager`
- `npm run typecheck:webview`

## [1.2.482] - 2026-06-09
### Fixed
- **Projected Cluster review messages now unlock the visible dialog during full-history replay.** Project Manager applies managed workflow side effects when replaying JSONL history, so `managed-workflow-user-review` releases stale `running` and continuation locks even if a live idle event was missed.
- **Stale managed Core gate locks no longer block the `Подтверждаю` action.** A replayed Core user-review handoff now also releases `managed_core_gated`, while unrelated resume locks remain protected.

### Verification
- `npx tsx --test src/client/project-manager/components/sessions/session-message-dedupe.test.ts src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts src/client/project-manager/components/sessions/turn-state-stream.test.ts`
- `npm run build:project-manager`
- `npm run typecheck:webview`
- `npm run build --workspace packages/core`
- `node --test packages/core/dist/remote-bridge/handlers/cluster-contract-turn-controller.test.js packages/core/dist/remote-bridge/handlers/cluster-contract-review-controller.test.js packages/core/dist/remote-bridge/handlers/product-part-managed-review-decision-handler.test.js packages/core/dist/remote-bridge/handlers/development-tree-snapshot.test.js`

## [1.2.481] - 2026-06-09
### Fixed
- **Projected Cluster dialogs now refresh from worktree turn-state events.** Core includes `providerSessionId` in `turn_state`, and Project Manager uses it to connect runtime worktree events to the visible projected cluster dialog.
- **Cluster dialog history now tails JSONL after matching stream events.** When the cluster sub-agent continues or settles, Project Manager requests the active dialog tail instead of staying on the early bootstrap message slice.
- **Turn-state idle now releases the stale working lock for projected dialogs.** The UI unlocks when the underlying turn settles unless a separate managed/resume gate is still active.

### Verification
- `npm run build --workspace packages/core`
- `npm run build:project-manager`
- `npm run typecheck:webview`
- `npx tsx --test src/client/project-manager/components/sessions/turn-state-stream.test.ts src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts`

## [1.2.480] - 2026-06-09
### Fixed
- **Cluster Contract validation failures now continue as repair turns.** When Core rejects incomplete `ClusterFacadeContract.draft.json` artifacts, it sends an internal repair prompt back to the same cluster-contract sub-agent instead of settling after the diagnostic system message.
- **Cluster repair prompts now restate the concrete facade contract requirements.** The prompt names the draft artifacts, repeats validator diagnostics, and requires facade class/file, method signatures, input/output DTOs, result union, and module boundary inputs/outputs.

### Verification
- `npx ultracite check packages/core/src/remote-bridge/handlers/cluster-contract-turn-controller.ts packages/core/src/remote-bridge/handlers/cluster-contract-turn-controller.test.ts`
- `npm run build --workspace packages/core`
- `node --test packages/core/dist/remote-bridge/handlers/cluster-contract-turn-controller.test.js`

## [1.2.479] - 2026-06-09
### Added
- **Lead Product Part order plans now require downstream contract seeds.** `DevelopmentOrderPlan.v2` validates `contractSeeds` for Cluster and Standalone Module nodes so lower agents receive parent-defined consumer, input, output, status/error, and blocking-question boundaries.
- **Cluster Contract sub-agents receive the accepted parent seed.** Core persists contract seeds in Product Part unlock-state and includes the selected seed in the first Cluster Contract prompt.

### Changed
- **Cluster Contract prompts now require concrete pre-code facade contracts.** Cluster agents are instructed to write facade class names, file paths, method signatures, DTOs, result unions, and module boundary contracts instead of abstract descriptions.
- **Cluster Contract review validates concrete facade JSON.** Core blocks `ClusterFacadeContract.draft.json` until it includes facade class/file/method/type/result/module-boundary fields.

### Verification
- `npm run build --workspace packages/core`
- `node --test packages/core/dist/development-tree/product-part-workflow/development-order-plan-v2-contract.test.js packages/core/dist/remote-bridge/handlers/product-part-development-brief-review-controller.prompt.test.js packages/core/dist/development-tree/node-bootstrap/cluster-contract-agent-bootstrapper.test.js packages/core/dist/development-tree/cluster-workflow/cluster-contract-prompt-builder.test.js packages/core/dist/remote-bridge/handlers/cluster-contract-turn-controller.test.js`

## [1.2.478] - 2026-06-09
### Fixed
- **Projected cluster dialogs now hydrate from the node worktree context.** Project Manager preserves the Core-provided `worktreePath`, restores the cluster runtime session inside that worktree, and can render the final `managed-workflow-user-review` message with the `Подтверждаю` action instead of staying locked as running.
- **Cluster bootstrap commits the main unlock-state session ledger.** Recording the cluster `sessionId`, branch, and worktree path no longer leaves the main Product Part workspace dirty before later review/merge boundaries.
- **Cluster/Module ClearUndo prunes empty worktree containers.** Removing the last downstream node worktree also removes the top-level `<workspace>.worktrees` folder.

### Verification
- `npm run build --workspace packages/core`
- `npm run typecheck:webview`
- `npm run build:project-manager`
- `npx tsx --test src/client/project-manager/components/sessions/project-manager-dialog-session-view-helpers.test.ts src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts`
- `node --test packages/core/dist/development-tree/node-bootstrap/cluster-contract-agent-bootstrapper.test.js`

## [1.2.477] - 2026-06-09
### Fixed
- **Projected cluster dialogs now use the real worktree continuity identity.** Core resolves the cluster node `dialogId`, `rootSessionId`, and `providerSessionId` from the worktree continuity index, so Project Manager opens the existing provider-backed JSONL instead of an empty runtime-UUID shell.
- **WorkflowBoundaryGit stages explicit managed-plan paths directly.** Deep `doc/TODO/.../clusters/.../todo-plan.md` paths now enter ledger commits correctly instead of being dropped by global exclude pathspecs.

### Verification
- `npm run build --workspace packages/core`
- `node --test packages/core/dist/remote-bridge/handlers/development-tree-projected-session.test.js packages/core/dist/workflow/boundary/workflow-boundary-git.test.js packages/core/dist/remote-bridge/handlers/cluster-contract-turn-controller.test.js`
- `npm run plan:validate`

## [1.2.476] - 2026-06-08
### Fixed
- **Projected cluster sessions now read history from their worktree runtime.** Project Manager can open a cluster node from the lead Product Part graph and render the real sub-agent JSONL instead of an empty projected shell.
- **Cluster Contract bootstrap commits its managed todo-plan immediately.** Newly created cluster worktrees now track the Core-owned cluster `todo-plan.md` before the provider session starts, preventing untracked plan residue after startup.

### Verification
- `npm run build --workspace packages/core`
- `node --test packages/core/dist/remote-bridge/handlers/development-tree-projected-session.test.js packages/core/dist/development-tree/node-bootstrap/cluster-contract-agent-bootstrapper.test.js packages/core/dist/remote-bridge/handlers/dialog-list-service.test.js`
- `npm run plan:validate`

## [1.2.475] - 2026-06-08
### Fixed
- **Cluster sessions are projected into the main Product Part workspace.** Automatically bootstrapped cluster-contract sessions now record their session id, stage, branch, worktree path, and inherited model binding in the main coordination state so Project Manager can show/open them from the lead Product Part graph.
- **Cluster Contract review leaves a clean worktree ledger.** Core now commits the cluster managed todo-plan and continuity ledger when opening review, preventing dirty/untracked worktree state after draft validation.
- **Cluster-contract worktree roots no longer look like artifact folders.** New downstream worktrees use `cluster-contracts/<cluster>` roots while Product Part cleanup remains compatible with legacy paths.
- **Cluster/Module ClearUndo is Core-owned.** Clearing a downstream node removes its Git worktree, prunes session/continuity projection state, commits the clear boundary, and returns the graph node to an unstarted marker instead of a stale yellow in-progress state.

### Verification
- `npm run build --workspace packages/core`
- `npm run typecheck:webview`
- `npm run build:project-manager`
- `node --test packages/core/dist/development-tree/node-bootstrap/cluster-contract-agent-bootstrapper.test.js packages/core/dist/remote-bridge/handlers/development-tree-projected-session.test.js packages/core/dist/remote-bridge/handlers/cluster-contract-turn-controller.test.js`
- `node --test packages/core/dist/development-tree/node-bootstrap/development-tree-node-worktree-service.test.js packages/core/dist/remote-bridge/handlers/workflow-step-clear-development-tree-node.test.js packages/core/dist/remote-bridge/handlers/workflow-step-clear-service.test.js`

## [1.2.474] - 2026-06-08
### Fixed
- **Downstream Product Part sessions now inherit the selected Codex model.** Automatically bootstrapped cluster-contract sessions receive the Product Part session model binding instead of falling back to workspace defaults.
- **Unsupported `gpt-5.3-codex` paths are removed from active selection.** Defaults, runtime fallbacks, capture UI defaults, invocation profiles, and persisted settings migration now move away from the provider-unsupported model.
- **Lead Product Part Phase 5 coordination is commit-backed.** New and existing accepted lead Product Part todo-plans receive the required `Git Commit: chore: coordinate <part> downstream development` line.
- **Product Part `Clear&Do` removes downstream worktrees.** Clearing a Product Part deletes its downstream cluster/module worktrees and prunes the empty top-level `<workspace>.worktrees` directory.

### Verification
- `npm run build --workspace packages/Codex_AppServer_Module`
- `npm run build --workspace packages/core`
- `npm run typecheck:webview`
- `node --test packages/core/dist/development-tree/product-part-workflow/product-part-development-brief-plan-writer.test.js packages/core/dist/remote-bridge/handlers/product-part-development-brief-turn-controller.test.js packages/core/dist/remote-bridge/handlers/workflow-step-clear-product-part-restart.test.js`
- `node --test packages/core/dist/remote-bridge/handlers/product-part-managed-review-decision-handler.test.js packages/core/dist/remote-bridge/handlers/settings-persistence-service.test.js`

## [1.2.473] - 2026-06-08
### Fixed
- **Lead Product Part order-plan acceptance now starts the first unlocked cluster-contract wave.** Confirming the accepted `DevelopmentOrderPlan.v2` no longer stops at Downstream Product Part Coordination; Core now routes the accepted unlock-state into the cluster-contract bootstrapper, creates the first cluster worktree/session, and sends the first cluster prompt.
- **The initial lead order-plan prompt now includes standalone module node guidance.** The assignment prompt now shows a valid `standalone-module:<part>/<module>` node with `kind: "standalone_module"` and explicitly forbids encoding standalone modules as two-segment `module:<part>/<module>` ids.

### Verification
- `npm run build --workspace packages/core`
- `node --test packages/core/dist/remote-bridge/handlers/product-part-development-brief-review-controller.prompt.test.js`
- `node --test packages/core/dist/remote-bridge/handlers/product-part-managed-review-decision-handler.test.js`

## [1.2.472] - 2026-06-08
### Fixed
- **Lead Product Part order-plan validation failures now continue the agent turn.** When Core rejects `DevelopmentOrderPlan.draft.json`, it emits diagnostics to the user and sends an internal repair continuation back to the same lead Product Part session instead of leaving the agent idle after `managed-workflow-validation`.
- **The repair prompt now spells out valid `DevelopmentOrderPlan.v2` node id shapes.** It distinguishes `cluster:<part>/<cluster>`, `module:<part>/<cluster>/<module>`, and `standalone-module:<part>/<module>` so the agent can fix standalone module references without another user nudge.

### Verification
- `npm run build --workspace packages/core`
- `node --test packages/core/dist/remote-bridge/handlers/product-part-development-order-plan-turn-controller.test.js`

## [1.2.471] - 2026-06-08
### Added
- **Lead Product Part order plans now use a Core-readable `DevelopmentOrderPlan.v2` unlock contract.** Core validates Product Part briefs, node references, dependencies, first-wave unlockability, and locked-node reasons before opening downstream work.
- **First-wave Cluster Contract sub-agents now run in dedicated Git worktrees/branches.** Core creates the worktree, writes a managed cluster plan, sends an inline-context prompt, validates `ClusterSpecification` and `ClusterFacadeContract` markdown/json artifacts, and opens a user/lead review gate.
- **Accepted Cluster Contract results merge back into the main workspace through Core-owned Git boundaries.** Acceptance writes review-result and merge-boundary evidence, merges accepted artifacts, marks the cluster `merged`, and keeps dependent modules `locked`.
- **Project Manager now renders the Product Part coordination graph from Core state.** Development Tree cluster/module rows consume optional `coordination.status` metadata from the workflow-state snapshot.

### Verification
- `npm run build --workspace packages/core`
- `node --test packages/core/dist/development-tree/product-part-workflow/development-order-plan-v2-contract.test.js packages/core/dist/remote-bridge/handlers/product-part-development-brief-turn-controller.test.js packages/core/dist/development-tree/node-bootstrap/cluster-contract-agent-bootstrapper.test.js packages/core/dist/development-tree/cluster-workflow/cluster-contract-prompt-builder.test.js packages/core/dist/remote-bridge/handlers/cluster-contract-turn-controller.test.js packages/core/dist/remote-bridge/handlers/cluster-contract-review-controller.test.js packages/core/dist/development-tree/node-bootstrap/development-tree-node-merge-service.test.js packages/core/dist/remote-bridge/handlers/development-tree-snapshot.test.js`
- `npm run typecheck:webview`
- `npm run build:project-manager`

## [1.2.469] - 2026-06-08
### Fixed
- **Lead Development Order Plan review acceptance now completes the Product Part lifecycle.** Confirming the Phase 4 order-plan review commits `docs: accept lead development order plan`, marks the review task and Git Commit line done, and moves the lead Product Part plan into `User Return And Revisions`.
- **Order-plan review completion does not accidentally launch downstream agents.** Cluster/module startup remains closed until the next Development Order Plan v2 orchestration contract is designed.

### Verification
- `npm run build --workspace packages/core`
- `node --test packages/core/dist/remote-bridge/handlers/product-part-development-brief-turn-controller.test.js`
- `npm run plan:validate`

## [1.2.468] - 2026-06-08
### Added
- **Lead Product Part acceptance now continues to Development Order Plan drafting.** After the user accepts the lead Product Part Development Brief, Core sends the next managed internal assignment into the same session for `DevelopmentOrderPlan.draft.md` and `DevelopmentOrderPlan.draft.json`.
- **Lead Development Order Plan completion opens its own user review gate.** Core validates the markdown/JSON artifacts, commits them, advances the Product Part todo-plan to `phase4.order-plan-review`, and leaves secondary Product Parts in `User Return And Revisions`.

### Verification
- `npm run build --workspace packages/core`
- `node --test packages/core/dist/remote-bridge/handlers/product-part-development-brief-turn-controller.test.js`
- `npm run plan:validate`

## [1.2.467] - 2026-06-08
### Fixed
- **Product Part managed review confirmation no longer touches ignored runtime session paths.** Acceptance commits now include the Product Part brief and continuity artifacts, but not `.codeai-hub/<workspace>/runtime/sessions/`, which is local-only runtime residue.
- **The `Подтверждаю` button should no longer remain pending for Product Part reviews.** This prevents the UI from staying locked when the workspace already contains ignored runtime session files.

### Verification
- `npm run build --workspace=packages/core`
- `node --test packages/core/dist/remote-bridge/handlers/product-part-development-brief-turn-controller.test.js`
- `npm run plan:validate`

## [1.2.466] - 2026-06-07
### Fixed
- **Codex workspace provider homes now share the global auth source.** Core replaces stale copied workspace `auth.json` files with a shared reference to `~/.codex/auth.json` before starting the Codex app-server, so refresh-token rotation cannot diverge between normal Codex and CodeAI Hub managed sessions.
- **Clear/Undo retests are protected across all Codex-managed workflow steps.** The fix is in the central Codex app-server process startup path, covering Description, Diagram Modules, Application Skeleton, Quality Gates, Product Part, and later Codex-backed managed sessions that use workspace provider homes.

### Verification
- `npm run build --workspace=packages/Codex_AppServer_Module`
- `node --test packages/Codex_AppServer_Module/dist/app-server/process/codex-provider-home-auth.test.js`
- `npm run plan:validate`

## [1.2.465] - 2026-06-07
### Fixed
- **Fresh Product Part bootstrap now waits for each initial agent turn.** Core waits for the current Product Part session to move from `running` back to `idle` before starting the next Product Part session after `Quality Gates Baseline`.
- **Primary and secondary Product Part drafts no longer launch overlapping Codex turns during initial handoff.** Workflows with multiple Product Parts should now avoid the `finder-widget-shell` symptom where the secondary session remained on the start prompt until stopped.

### Verification
- `npm run build --workspace=@codeai-hub/core`
- `node --test packages/core/dist/development-tree/node-bootstrap/node-agent-session-bootstrapper.test.js`
- `npm run plan:validate`

## [1.2.464] - 2026-06-07
### Fixed
- **Workspace runtime capsules now stay local-only.** Generated workspace `.gitignore` files ignore `.codeai-hub/*/runtime/`, capsule `.gitignore` files ignore `runtime/`, and Application Skeleton readiness rejects missing runtime ignore coverage.
- **Managed commits clean legacy tracked runtime files.** Accepted-step and managed-terminal boundaries remove previously tracked `.codeai-hub/<workspace>/runtime/**` entries from the Git index while leaving files on disk for the running process.
- **Runtime logs no longer count as rollback truth.** Provider homes, provider-native histories, unified session logs, shell snapshots, settings/localization runtime, caches and credentials are recreated from tracked workflow/product artifacts instead of being committed as development state.

### Verification
- `npm run build --workspace @codeai-hub/core`
- `node --test packages/core/dist/workflow/runtime/workspace-runtime-capsule-gitignore.test.js packages/core/dist/workflow/boundary/workflow-step-commit-facade.test.js packages/core/dist/managed-workflow-orchestration/managed-terminal-dirty-classifier.test.js`
- `npm run plan:validate`

## [1.2.463] - 2026-06-07
### Fixed
- **Codex provider operations now serialize access to the shared provider home.** `createSession`, `resumeSession`, `sendMessage`, usage-limit refresh, and native request capture now run through one provider-home queue inside the Codex adapter, preventing Core-side overlap against the same `CODEX_HOME` auth state.
- **Multi-Product-Part workflows are protected after Codex re-authentication.** Workspaces that already hit the `refresh token was already used` error still need one manual Codex sign-out/sign-in, but subsequent Product Part restarts should not recreate the same provider-home refresh-token race from Core.

### Verification
- `npm run build --workspace @codeai-hub/codex-app-server-module`
- `node --test packages/Codex_AppServer_Module/dist/provider/codex-provider-adapter.test.js`
- `npm run plan:validate`

## [1.2.462] - 2026-06-07
### Fixed
- **Product Part Clear/Undo restart is now scoped to the selected Product Part.** Core passes the cleared `partId` into Development Tree Product Part bootstrap, so clearing `widget-display` cannot also recreate `latest-note-search` or any other sibling Product Part session.
- **Multi-Product-Part workspaces no longer start sibling provider turns during single-node Clear/Undo.** The scoped restart prevents the avoidable concurrent Codex OAuth refresh race observed during the `1.2.461` retest.

### Verification
- `node --import tsx --test packages/core/src/remote-bridge/handlers/workflow-step-clear-service.test.ts packages/core/src/remote-bridge/handlers/workflow-step-clear-product-part-restart.test.ts`
- `npm run build --workspace packages/core`
- `npm run plan:validate`

## [1.2.461] - 2026-06-07
### Added
- **Product Part root Clear/Undo now clears and restarts the agent session.** For root Product Part nodes under `development_tree/materialized/product-parts/<part-id>`, Core removes the old managed session registration, provider-native/unified history, continuity entry, Product Part draft/order/research artifacts, and the Product Part stage `todo-plan.md`.
- **Core immediately recreates the Product Part plan/session from current Development Tree truth.** After cleanup, the orchestrator reruns Product Part bootstrap for the cleared part so `latest-note-search` and `widget-display` get fresh Product Part todo plans and sessions without rolling back `Quality Gates Baseline`.
- **Project Manager receives clear/restart details for retest.** The Clear/Undo event now includes Product Part restart metadata, including deleted and recreated paths, so the UI/test harness can prove the old Product Part session artifacts were replaced.

### Verification
- `npm run build --workspace packages/core`
- `node --import tsx --test packages/core/src/remote-bridge/handlers/workflow-step-clear-service.test.ts packages/core/src/remote-bridge/handlers/workflow-step-clear-product-part-restart.test.ts`
- `node --import tsx --test src/client/project-manager/components/layout/workspace-tree-clear-menu.test.ts`
- `npm run typecheck:webview`
- `npm run build:webview`
- `npm run plan:validate`

## [1.2.460] - 2026-06-07
### Fixed
- **Development Tree Product Part review actions are Core-owned.** Ordinary user messages during Product Part review continue the same provider revision session, while the `Подтверждаю` button submits a scoped managed review action instead of relying on typed acceptance text.
- **Secondary Product Parts now land in `User Return And Revisions`.** After Core accepts and commits a non-lead Product Part brief, the node plan enters a durable return/revision state that the user can resume later.
- **Lead Product Part acceptance now stops at the next assignment boundary.** The lead part prepares the `Development Order Plan Draft` task without starting downstream order-plan execution in the same slice.

### Verification
- `npm run build --workspace packages/core`
- `node --test packages/core/dist/remote-bridge/handlers/product-part-development-brief-turn-controller.test.js`
- `npm run plan:validate`

## [1.2.459] - 2026-06-06
### Fixed
- **Quality Gates Phase 4 now reads nested agent evidence.** Core accepts `verificationEvidence.commandRuns`, `verificationEvidence.commandEvidence`, `verificationEvidence.verificationCommandEvidence`, and top-level `verificationCommandEvidence` in addition to the preferred `verificationEvidence.commands[]` shape.
- **Verification repair prompts now explain the exact evidence contract.** Phase 4 repair prompts name the canonical `quality-gates.json` artifact, list accepted evidence paths, and include a minimal JSON snippet for the missing commands.
- **FinderWidget retest artifact validates to persistent return.** The current nested evidence artifact validates as `valid: true`, `phase: "verification"`, and `nextAction: "open_persistent_return"` with no diagnostics.

### Verification
- `node --test packages/core/dist/managed-workflow-orchestration/quality-gates/quality-gates-validator-runner-evidence.test.js packages/core/dist/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-verification-repair.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-managed-workflow-turn.quality-gates-repair-chain.test.js`
- `node --test packages/core/dist/managed-workflow-orchestration/quality-gates/quality-gates-prompt-builder.phase-envelope.test.js packages/core/dist/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-verification-repair.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-managed-workflow-turn.quality-gates-repair-chain.test.js`
- `npm run build --workspace=@codeai-hub/core`
- `npm run plan:validate`

## [1.2.458] - 2026-06-06
### Fixed
- **Quality Gates Phase 4 evidence no longer loops on JSON shape alone.** Core accepts `verificationEvidence` as either an object with `commands` or a top-level command array.
- **Formal verification now hard-gates the executable surface.** Evidence for `npm run qg:all`, phase aggregate scripts, direct hook commands, and explicit `sh .husky/pre-*` hook runs is enough to prove the configured gates are runnable without requiring every internal npm script to be listed separately.
- **Verified Quality Gates repair can proceed to Phase 5.** A valid verification repair with aggregate/hook evidence now returns `open_persistent_return` instead of repeatedly asking the agent to repair `missing_verification_evidence`.

### Verification
- `node --test packages/core/dist/managed-workflow-orchestration/quality-gates/quality-gates-validator-runner-evidence.test.js packages/core/dist/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-verification-repair.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-managed-workflow-turn.quality-gates-repair-chain.test.js`
- `npm run build --workspace=@codeai-hub/core`
- `npm run plan:validate`

## [1.2.457] - 2026-06-06
### Fixed
- **Quality Gates Phase 4 verification repair now stays in Phase 4.** Core creates `quality-gates.phase4.repair.taskN` after rejected formal verification evidence instead of falling back to draft or Phase 3 integration repair task ids.
- **Successful verification repair now opens persistent user return.** A valid Phase 4 repair advances the stage plan to `quality-gates.phase5.user-return.task1` and appends the Phase 5 persistent return boundary instead of rewinding to the Phase 2 review pointer.
- **Verification repair prompts now name the correct phase.** The repair dispatch sends a Phase 4 verification repair envelope and no longer tells the agent that Core must reopen Phase 4 after a Phase 4 evidence repair.

### Verification
- `node --test packages/core/dist/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-verification-repair.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-managed-workflow-turn.quality-gates-repair-chain.test.js`
- `npm run build --workspace=@codeai-hub/core`

## [1.2.456] - 2026-06-06
### Fixed
- **Quality Gates repair continuations now keep Core validation active.** Managed Core-gated sessions no longer suppress repeated `turn_completed` events while a managed continuation is still locked, so a Phase 4 verification repair can be validated by Core instead of leaving the user at the agent's final message.
- **Quality Gates verification repair now reopens Phase 4 before user return.** A regression covers the full chain: Phase 4 evidence failure, Phase 3 integration repair, repeated Phase 4 formal verification continuation, and persistent user return.

### Verification
- `node --test packages/core/dist/remote-bridge/handlers/session-provider-event-router.test.js`
- `node --test packages/core/dist/remote-bridge/handlers/session-request-handler-managed-workflow-turn.quality-gates-repair-chain.test.js`
- `node --test packages/core/dist/remote-bridge/handlers/session-request-handler-managed-workflow-turn.quality-gates.test.js`
- `node --test packages/core/dist/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.test.js`
- `npm run build --workspace=@codeai-hub/core`

## [1.2.455] - 2026-06-06
### Fixed
- **Quality Gates integration repair now opens formal verification.** A valid `quality-gates.phase3.repair.taskN` result follows the same Phase 4 verification path as the initial Phase 3 integration instead of completing the stage.
- **Quality Gates completion now fails closed before verification.** Core only treats `open_persistent_return` as terminal after the validator is in the `verification` phase.
- **Quality Gates prompts now carry explicit phase envelopes.** The initial prompt opens Phase 1 with the active stage todo-plan path, and Phase 2/Phase 3/repair continuation prompts include the same Core-owned zero-context resume envelope.

### Verification
- `node --test packages/core/dist/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.test.js`
- `node --test packages/core/dist/remote-bridge/handlers/session-request-handler-managed-workflow-turn.quality-gates.test.js`
- `node --test packages/core/dist/remote-bridge/handlers/workflow-prompt-pack-service.test.js`
- `node --test packages/core/dist/managed-workflow-orchestration/quality-gates/quality-gates-prompt-builder.phase-envelope.test.js`
- `node --test packages/core/dist/managed-workflow-orchestration/quality-gates/quality-gates-validator.test.js`
- `npm run build --workspace=@codeai-hub/core`

## [1.2.454] - 2026-06-05
### Added
- **Quality Gates now has a formal verification phase before persistent return.** After accepted integration, Core dispatches a dedicated verification turn instead of immediately completing the stage.
- **Development Tree bootstrap now requires verified gate evidence.** Core validates `verificationState: "verified"` plus per-command evidence for required scripts and Husky hook paths before Product Part work can start.

### Fixed
- **Integrated-but-unverified Quality Gates no longer unlock code-writing agents.** The read model and Development Tree bootstrap gate both require the verified state, not only `integrated: true`.

### Verification
- `node --import tsx --test packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.test.ts packages/core/src/templates/quality-gates-bundled-templates.test.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-formal-verification-runner.test.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator-runner-evidence.test.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.quality-gates.test.ts packages/core/src/development-tree/development-tree-bootstrap-gate.test.ts packages/core/src/remote-bridge/handlers/workflow-state-service-development-tree-bootstrap.test.ts`
- `node --import tsx --test packages/core/src/remote-bridge/handlers/technical-root-progress-projection.test.ts`
- `npm run build --workspace=@codeai-hub/core`
- `npm run plan:validate`

## [1.2.453] - 2026-06-05
### Fixed
- **Completed Quality Gates stays green in the Documentation Tree.** Project Manager no longer lets a stale or runtime-residue gating blocker repaint a Core-completed `Quality Gates Baseline` marker as blocked/red.
- **Completed stage visuals now outrank gating blockers.** `completed` workflow stages map to the active/green sidebar marker while `invalid`, `outdated`, and running states keep their existing warning/progress behavior.

### Verification
- `npm exec -- tsx --test src/client/project-manager/components/layout/workspace-tree-model.test.ts`
- `npm run typecheck:webview`
- `npm run build:project-manager`
- `npm run plan:validate`

## [1.2.452] - 2026-06-04
### Fixed
- **Provider-native workflow sessions are now tracked consistently across providers.** The workspace runtime capsule keeps Codex `home/sessions/**/*.jsonl`, Claude `home/.claude/projects/**/*.jsonl`, OpenCode GLM provider session state, Gemini `home/.gemini/tmp/<workspace>/chats/*.jsonl`, and Kimi `home/wire.jsonl` visible to Git when they are required for provider resume.
- **Gemini chat history under provider `tmp` no longer disappears from rollback ownership.** The runtime capsule `.gitignore` re-includes Gemini chat JSONL files while leaving auth files, package caches, and non-session provider tmp/cache files ignored.

### Verification
- `node --import tsx --test packages/core/src/workflow/runtime/workspace-runtime-capsule-gitignore.test.ts`
- `npm run build --workspace=@codeai-hub/core`
- `npm run plan:validate`

## [1.2.451] - 2026-06-04
### Fixed
- **Application Skeleton terminal completion no longer leaves dirty session files before Quality Gates.** Core now persists the final `managed-workflow-complete` message and translation overlay, commits that terminal session residue, and only then activates `Quality Gates Baseline`.
- **Application Skeleton handoff ordering is covered by a regression test.** The test asserts that final review acceptance, message persistence, terminal residue commit, and Quality Gates activation happen in the required order.

### Verification
- `node --import tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts`
- `npm run build --workspace=@codeai-hub/core`
- `npm run plan:validate`

## [1.2.450] - 2026-06-04
### Fixed
- **Accepted Description/Virtual Simulation steps now commit their final session translation overlay.** Core waits for the preliminary-review completion message and translation persistence before creating the accepted-step Git commit, preventing a post-acceptance dirty `runtime/sessions/unified/**/*.translations.jsonl` file.
- **Provider cache/log files stay out of Git-owned runtime sessions.** Workspace runtime capsule `.gitignore` now excludes provider `Caches/` folders and provider `*-cache.json` files while keeping real unified and provider-native workflow session histories tracked.
- **Legacy tracked provider cache files are untracked before accepted-step clean-Git checks.** Accepted-step commits now remove provider `Caches/` and `*-cache.json` files from the Git index before checking whether the workspace is clean.

### Verification
- `node --import tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-preliminary-review-committer.test.ts packages/core/src/workflow/boundary/workflow-step-commit-facade-residual-docs.test.ts packages/core/src/workflow/runtime/workspace-runtime-capsule-gitignore.test.ts packages/core/src/workflow/boundary/workflow-step-commit-facade.test.ts`
- `npm run build --workspace=@codeai-hub/core`
- `npm run plan:validate`

## [1.2.449] - 2026-06-04
### Changed
- **Workflow sessions are now Git-owned recovery state.** Core tracks provider-neutral unified histories and provider-native workflow session histories needed for resume under the workspace runtime capsule.
- **Clear/Undo removes future sessions through Git rollback.** Sessions created at or after the selected boundary disappear with the same `reset/clean` transaction that removes downstream workflow artifacts.
- **Provider secrets and noisy runtime state stay ignored.** Auth tokens, API/OAuth credentials, login files, package installs, caches, SQLite databases, logs, binaries, model caches, and other non-session provider runtime files remain outside Git.

### Verification
- `node --import tsx --test packages/core/src/workflow/runtime/workspace-runtime-capsule-gitignore.test.ts packages/core/src/workflow/boundary/workflow-step-commit-facade.test.ts packages/core/src/workflow/boundary/workflow-boundary-facade.test.ts packages/core/src/workflow/boundary/workflow-boundary-facade-runtime-sessions.test.ts packages/core/src/workflow/boundary/workflow-rollback-runtime-sessions.test.ts`
- `npm run build --workspace=@codeai-hub/core`
- `npm run plan:validate`

## [1.2.448] - 2026-06-03
### Changed
- **Rolled back broad Clear/Undo runtime history cleanup.** Clear/Undo no longer removes all workflow unified histories, Codex session and shell snapshot folders, Claude project/session logs, Gemini chat logs, or provider SQLite state from the selected workspace runtime capsule.
- **Clear/Undo is back to the narrower, resume-safer cleanup path.** The active code removes live Core runtime session registrations for cleared workflow steps and only attempts the older narrow provider-native cleanup when a concrete live provider session id is known.
- **Provider-native cleanup is deferred to a dedicated contract.** Future cleanup work must be provider-specific, resume-safe, and covered by tests that prove native session histories remain available until the owning workflow step is intentionally cleared.

### Verification
- `npm run build --workspace=@codeai-hub/core`
- `node --test packages/core/dist/remote-bridge/handlers/workflow-step-clear-service.test.js`
- `npm run plan:validate`

## [1.2.447] - 2026-06-03
### Fixed
- **Clear/Undo now finishes when rolling back to the first workflow boundary.** Core rematerializes the pruned workflow boundary registry before creating the clear commit, so clearing `Description` no longer fails on a missing `.codeai-hub/<workspace>/workflow/boundaries.json` pathspec.
- **Runtime session cleanup can run after first-boundary rollback.** Because the rollback commit now succeeds, Core reaches the cleanup step that removes workflow unified histories and provider-native session history files from the workspace runtime capsule.

### Verification
- `npm run plan:validate`
- `npm run build --workspace=@codeai-hub/core`
- `node --test packages/core/dist/workflow/boundary/workflow-boundary-clear-registry-projection.test.js`
- `node --test packages/core/dist/remote-bridge/handlers/workflow-step-clear-service.runtime-cleanup.test.js`

## [1.2.446] - 2026-06-03
### Fixed
- **Clear/Undo now prunes old unified workflow histories without relying on live sessions.** Core removes workflow `.jsonl` histories and translation overlays for cleared workflow work even when those sessions are no longer present in the runtime session registry.
- **Provider-native session history cleanup is workspace-wide.** Clear/Undo now prunes provider-native session history containers such as Codex `sessions/` and `shell_snapshots/`, Claude project/session logs, and Gemini chat session files inside the selected workspace runtime capsule.
- **Provider runtime state is still preserved.** Auth, settings, installation ids, caches, models, memories, and other non-session runtime files remain intact.

### Verification
- `npm run plan:validate`
- `npm run build --workspace=@codeai-hub/core`
- `node --test packages/core/dist/remote-bridge/handlers/workflow-step-clear-service.runtime-cleanup.test.js`

## [1.2.445] - 2026-06-02
### Fixed
- **Clear/Undo now removes unified runtime histories.** Workflow clear deletes downstream `.codeai-hub/<workspace>/runtime/sessions/unified/**` session histories and translation overlays instead of only removing in-memory Core sessions.
- **Clear/Undo now removes matching provider-native session files.** Core cleans matching native history files under `runtime/providers/**/home` for real provider ids such as `codexCli`, `claudeCodeCli`, `geminiCli`, and `glmOpenCode`.
- **Provider auth and cache files are preserved.** Cleanup targets workflow session histories and avoids provider credentials, settings, and cache files.

### Verification
- `npm run plan:validate`
- `npm run build --workspace=@codeai-hub/core`
- `node --test packages/core/dist/remote-bridge/handlers/workflow-step-clear-service.runtime-cleanup.test.js`
- `node --test --test-name-pattern 'workflow step clear (rejects invalid requests|restores workflow stages|prunes provider-native workflow sessions only|keeps development-tree node clear fail-closed|removes Diagram Modules work|removes Virtual Simulation)' packages/core/dist/remote-bridge/handlers/workflow-step-clear-service.test.js`

## [1.2.444] - 2026-06-02
### Fixed
- **Product Part agents now use global localization settings.** Product Part bootstrap resolves response and draft-artifact languages from the global settings source, so Russian workspaces use `ru/ru` instead of falling back to `en/en`.
- **Product Part start prompts are visible user turns.** Core persists Development Tree agent start prompts as auditable `user` messages while keeping Core acceptance/status feedback as system messages.
- **Accepted Product Part handoffs now keep the workspace clean.** Core includes `.codeai-hub/<workspace>/continuity/index.json` in the managed ledger commit when accepting a Product Part Development Brief.

### Verification
- `npm run plan:validate`
- `node --import tsx --test packages/core/src/development-tree/node-bootstrap/node-agent-session-bootstrapper.test.ts`
- `node --import tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core-start-prompt-role.test.ts`
- `node --import tsx --test packages/core/src/remote-bridge/handlers/product-part-development-brief-turn-controller.test.ts`
- `npm run build --workspace=@codeai-hub/core`

## [1.2.443] - 2026-06-02
### Fixed
- **Provider picker now receives the final warmup state.** Core rebroadcasts `core:state` after startup warmup completes, so Project Manager provider rows move from `starting` / unavailable to active once providers such as Claude are ready.
- **Claude provider display stays aligned with Core status.** The UI no longer has to rely on the stale warmup snapshot when `/api/v1/status` already reports `claudeCodeCli` as active.

### Verification
- `npm run plan:validate`
- `node --test packages/core/dist/remote-bridge/remote-bridge-provider-state-broadcast.test.js`
- `npm run build --workspace=@codeai-hub/core`

## [1.2.442] - 2026-06-02
### Fixed
- **Product Part agent outputs are now Core-accepted.** When a Product Part Development Brief agent fills the draft, Core validates the required blocks, commits the accepted draft, and advances that Product Part stage `todo-plan.md` to user review.
- **Accepted briefs now show real agent work.** Filled `ProductPartDevelopmentBrief.draft.md` artifacts keep explicit draft status and are marked `agentTouched: true` instead of looking like untouched generated templates.
- **Product Part sessions no longer regress workflow state.** Development Tree/Product Part sessions preserve the newer Documentation Tree stage after Quality Gates handoff instead of pushing `workflow/state.json` back to Description.
- **Product Part start prompts are visible in session history.** Core stores the first Product Part agent assignment as an auditable session message before sending it to the provider.

### Verification
- `npm run plan:validate`
- `npm run build --workspace=@codeai-hub/core`
- `node --test packages/core/dist/remote-bridge/handlers/product-part-development-brief-turn-controller.test.js`
- `node --test packages/core/dist/remote-bridge/handlers/workflow-state-last-active-resolver.test.js`
- `node --test --test-name-pattern "uses materialized node path" packages/core/dist/development-tree/node-bootstrap/node-agent-session-bootstrapper.test.js`

## [1.2.441] - 2026-06-02
### Fixed
- **Product Part Development Brief bootstrap now waits for Quality Gates.** Core no longer creates `ProductPartDevelopmentBrief.draft.md` or Product Part stage `todo-plan.md` files during Diagram Modules completion or `workflow-state` reads.
- **Quality Gates terminal handoff now owns Product Part bootstrap.** After accepted Quality Gates Baseline completion, Core materializes Product Part brief plans/drafts, starts Product Part agent sessions, and commits the bootstrap artifacts through the managed Quality Gates handoff.
- **Repair prompt extraction keeps managed workflow files below architecture limits.** Quality Gates repair prompt dispatch was split into a focused helper while preserving the Core-owned validation/repair lifecycle.

### Verification
- `npm run build --workspace=@codeai-hub/core`
- `npm run plan:validate`
- `node --test packages/core/dist/remote-bridge/handlers/workflow-state-service-development-tree-bootstrap.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-managed-workflow-turn.quality-gates.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-runtime-core.test.js`

## [1.2.440] - 2026-06-02
### Fixed
- **Removed legacy Contract Graph operation rows from the Development Tree.** Core no longer emits or materializes `Lead Product Part Orchestration`, `Contract Graph`, `Cross-Part Contracts`, `Shared Interfaces`, or `Execution Waves` under the lead Product Part.
- **Product Part bootstrap now covers every planned Product Part.** The Development Tree filesystem planner creates top Product Part folders for every Product Part from the leadership order before Product Part Development Brief bootstrap, instead of relying only on generated detailed part files.
- **Manual Product Part node start no longer depends on Contract Graph.** The node start route and Project Manager start card now use the Product Part Development Brief wave boundary.

### Verification
- `npm run build --workspace=@codeai-hub/core`
- `npm run build:project-manager`
- `npm run typecheck:webview`
- `node --test packages/core/dist/development-tree/filesystem-structurator/development-tree-filesystem-path-planner.test.js packages/core/dist/development-tree/development-tree-state-facade-metadata.test.js packages/core/dist/remote-bridge/handlers/workflow-state-service-development-tree-bootstrap.test.js packages/core/dist/remote-bridge/remote-bridge-development-tree-node-command-router.test.js`

## [1.2.439] - 2026-06-02
### Added
- **Product Part Development Brief bootstrap.** Core now creates `doc/TODO/stages/development-tree/product-parts/<part-id>/todo-plan.md`, materializes the first `ProductPartDevelopmentBrief.draft.md` artifact, and starts Product Part agent sessions from inline prompts.

### Changed
- **Development Tree startup stays shallow.** The bootstrap starts Product Part agents only; Cluster and Module agents remain pending until their parent Product Part brief flow is ready.

### Verification
- `npm run plan:validate`
- `npm run build --workspace=@codeai-hub/core`
- `node --test packages/core/dist/development-tree/product-part-development-brief-plan-writer.test.js`
- `node --test packages/core/dist/remote-bridge/handlers/workflow-state-service-development-tree-bootstrap.test.js`
- `node --test packages/core/dist/development-tree/development-tree-node-bootstrap-facade.test.js`
- `node --test packages/core/dist/development-tree/development-tree-state-facade-metadata.test.js`
- `node --test packages/core/dist/development-tree/development-tree-snapshot.test.js`
- `node --test packages/core/dist/development-tree/node-first-message-builder.test.js`
- `node --test packages/core/dist/development-tree/product-part-development-brief-draft-template.test.js`
- `node --test packages/core/dist/development-tree/product-part-development-brief-readiness.test.js`
- `node --test packages/core/dist/development-tree/product-part-development-brief-writer.test.js`

## [1.2.438] - 2026-06-02
### Changed
- **Development Tree cluster rows are compact.** Core no longer projects `Workers` / `Integration` operation children under cluster nodes, matching the compact module projection from 1.2.437.
- **Fresh Development Tree scaffolding mirrors only real product structure.** New `.codeai-hub/.../development_tree/...` and `doc/TODO/stages/development-tree/...` scaffolding creates Product Part / Cluster / Module folders only; worker progress and integration state live in right-panel workflow artifacts.

### Verification
- `npm run plan:validate`
- `npm run build --workspace=@codeai-hub/core`
- `npm run build:project-manager`
- `npm run build:webview`
- `npm run typecheck:webview`
- `node --test packages/core/dist/development-tree/development-tree-state-facade-metadata.test.js`
- `node --test packages/core/dist/development-tree/filesystem-structurator/development-tree-filesystem-path-planner.test.js`

## [1.2.437] - 2026-06-02
### Changed
- **Development Tree module rows are compact.** Core no longer projects module phase/operation children (`Module / Facade Specification`, `Implementation`, `Workers`, `Integration`) under each module node. The left tree now stays focused on Product Part / Cluster / Module structure, while module workflow details are documented as right-panel surfaces for the selected module.

### Verification
- `npm run plan:validate`
- `npm run build:core`
- `npm run build:project-manager`
- `npm run build:webview`
- `npm run typecheck:webview`
- `node --test packages/core/dist/development-tree/development-tree-state-facade-metadata.test.js`

## [1.2.436] - 2026-06-01
### Changed
- **Clear/Undo menu polished and relabelled.** The Development Tree context menu item is now flex-centered and compact (fixing the off-center, oversized item from 1.2.435), the confirm dialog uses compact 32px buttons (`.pm-tree-menu__btn`), and the destructive action is labelled `Clear/Undo` since it performs an undo via Git rollback. Behavior is unchanged.

### Verification
- `npm run build:project-manager`
- `npm run typecheck:webview`

## [1.2.435] - 2026-06-01
### Changed
- **Clear context menu and confirm dialog restyled to the design system.** The Development Tree right-click `Clear` menu and its confirmation dialog (`use-workspace-tree-clear-menu.tsx`) no longer use ad-hoc inline styles / hard-coded colors. They now use `.pm-tree-menu*` classes and `--pm-*` tokens, mirroring the `.pm-modal` / `.pm-workspace-menu` patterns, with a new tinted `.pm-modal__button--danger` variant for the destructive Clear action. Behavior is unchanged.

### Verification
- `npm run build:project-manager`
- `npm run typecheck:webview`

## [1.2.434] - 2026-06-01
### Changed
- **Session tab bar hidden.** The SESSIONS tab bar (`.session-app__header`) is set to `display: none` (kept in code, not removed), and the sessions-panel content top padding is reduced from 16px to the standard 8px gap, so the session ID bar rises to the top of the column and the rest of the session UI shifts up.

### Verification
- `npm run build:project-manager`
- `npm run typecheck:webview`

## [1.2.433] - 2026-06-01
### Fixed
- **OPEN SETTINGS button aligned with the status chips.** Follow-up to 1.2.432: the WORKSPACE `OPEN SETTINGS` button height now matches the *visible* status chip height (`min-height: 32px` — the stretched row height set by the tokens chip), and the footer zone uses symmetric `17px` top/bottom padding so the button's top and bottom edges line up exactly with the model / reasoning chips across both columns.

### Verification
- `npm run build:project-manager`

## [1.2.432] - 2026-06-01
### Changed
- **Project Manager bottom bar alignment.** The SESSIONS status panel now drops to the window bottom with only the standard 8px gap (removed the residual `.session-app` bottom padding and the sessions-panel `.pm-panel__content` bottom padding). The WORKSPACE `OPEN SETTINGS` button height now mirrors the session status chip button (`min-height: 28px`, `padding: 4px 12px`), its footer zone height matches the status panel (~50px), and the button is bottom-aligned with the status chips so both columns end on one horizontal line.

### Verification
- `npm run build:webview`
- `npm run build:project-manager`
- `npm run typecheck:webview`

## [1.2.431] - 2026-06-01
### Fixed
- **Provider picker rows refresh after warmup.** Core now broadcasts a fresh `core:state` provider snapshot on provider status events, so Project Manager replaces early `starting` rows with the final provider availability after warmup or retry completes.

### Tests
- `node --import tsx --test packages/core/src/remote-bridge/remote-bridge-provider-state-broadcast.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm run typecheck:webview`
- `npm run build:webview`

## [1.2.430] - 2026-06-01
### Fixed
- **Project Manager can open before provider warmup finishes.** Core now starts the remote bridge after template sync, startup self-test, and provider auto-update gating, then warms provider modules through the already-open status channel. Provider adapters remain unavailable until initialization succeeds.
- **First socket connection no longer triggers provider npm version checks.** Project Manager still supports explicit Settings version reloads, but cold startup no longer starts `settings:versions` automatically.
- **Claude Thinking mode is enabled by default.** New or missing Claude thinking settings now default to enabled while preserving explicit existing opt-outs.

### Tests
- `node --import tsx --test packages/core/src/orchestrator/core-orchestrator.test.ts packages/core/src/remote-bridge/handlers/settings-provider-auto-update-service.test.ts src/client/ui/src/components/settings/settings-auto-update-defaults.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm run typecheck:webview`
- `npm run build:webview`

## [1.2.429] - 2026-05-31
### Fixed
- **Application Skeleton lifecycle state now belongs to map JSON.** Core no longer rejects materialized Application Skeleton results because `application-skeleton.md` still contains stale draft/review prose; materialization authority stays in `application-skeleton-map.json` plus filesystem foundation evidence.
- **Quality Gates terminal state now belongs to JSON and evidence.** Integrated Quality Gates validation no longer treats `quality-gates.md` availability tables as machine state. Required gate availability is validated through `quality-gates.json`, package scripts, lifecycle hooks, declared `integratedPaths`, and runner evidence.

### Documentation
- Clarified the managed artifact authority model: Diagram Modules remains the intentional Markdown semantic SSOT exception, while paired Markdown/JSON stages use Markdown for user review and JSON/Core evidence for runtime state.

### Tests
- `node --import tsx --test packages/core/src/remote-bridge/handlers/application-skeleton-progress.test.ts`
- `node --import tsx --test packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.test.ts`
- `node --import tsx --test packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator-runner-evidence.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm run typecheck:webview`
- `npm run build:webview`
- `npm run check:links`

## [1.2.428] - 2026-05-31
### Fixed
- **Quality Gates integration lifecycle is now stack-generic but enforceable.** Core allows flexible Quality Gates prose, but rejects integration contracts where a gate has real runner evidence while still remaining in planned/not_integrated state.
- **Quality Gates repair diagnostics are phase-aware.** Repair prompts now explain integration-phase lifecycle conflicts without draft-phase wording and describe npm/Husky as one adapter, not as a product-specific universal requirement.
- **Quality Gates technical repair prompts stay out of the visible dialog.** Core now shows a concise user-facing repair notice and sends the full provider-visible repair prompt only through the managed agent continuation.

### Tests
- `node --import tsx --test packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.test.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator-runner-evidence.test.ts`
- `node --import tsx --test packages/core/src/templates/quality-gates-bundled-templates.test.ts`
- `node --import tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm run typecheck:webview`
- `npm run build:webview`

## [1.2.427] - 2026-05-31
### Fixed
- **Quality Gates workspace-local build artifacts return to agent repair.** Core now detects generated executable build outputs under `.artifacts/**`, such as `.artifacts/go/terminal`, as terminal residue diagnostics before Quality Gates handoff and instructs the agent to move future build output outside the workspace root.
- **Stop force-releases managed input gates.** Core Stop now emits a forced managed input gate unlock and idle projection for managed technical sessions, and Project Manager accepts that forced unlock even when stale managed lock reasons remain in the dialog snapshot.

### Tests
- `node --import tsx --test packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-terminal-residue-validator.test.ts src/client/project-manager/components/sessions/turn-state-stream.test.ts`
- `node --import tsx --test --test-name-pattern "force-releases managed input gates" packages/core/src/remote-bridge/handlers/session-request-handler.stop.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm run typecheck:webview`
- `npm run build:webview`

## [1.2.426] - 2026-05-31
### Fixed
- **Quality Gates required gate ids no longer double-prefix npm script names.** Core now accepts contract gate ids that already use the canonical `qg:*` script-name form, preventing false `qg:qg:*` missing-script and missing-hook diagnostics during Quality Gates Baseline integration repair validation.

### Tests
- `node --import tsx --test packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.test.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator-script-id.test.ts`
- `npm run build --workspace @codeai-hub/core`

## [1.2.425] - 2026-05-31
### Fixed
- **Quality Gates integration repair stays in the integration phase.** Core now uses the active Quality Gates stage-plan integration/repair microtask as phase authority before falling back to artifact lifecycle flags, so a provider repair cannot reopen draft user review by returning `accepted: false` / `integrated: false`.
- **Managed stage plan headings use one visible convention.** Numbered workflow phases now start at `Phase 1`; Core-only input checkpoints and repair cycles use unnumbered section headings instead of publishing `Phase 0` or duplicate `Phase 1` / `Phase 3` headings.

### Tests
- `node --import tsx --test packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator-plan-phase.test.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.test.ts`
- `node --import tsx --test packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.test.ts packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-review-acceptance.test.ts packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller.test.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.test.ts`
- `npm run build --workspace @codeai-hub/core`

## [1.2.424] - 2026-05-31
### Fixed
- **Quality Gates terminal cleanup stays Core-owned.** Core now classifies managed runtime ledgers as committable orchestration state, so terminal completion no longer asks the user to resolve Core-owned dirty workflow files.
- **Generated root build artifacts return to agent repair.** Quality Gates validation detects unclassified root executables such as `surfaces` before terminal handoff and routes them through a provider-visible repair turn instead of leaving the user input locked behind a manual dirty-Git blocker.
- **Managed workflow logs stay under the real workspace folder.** User-level managed lifecycle logs resolve by workspace basename, for example `~/.codeai-hub/logs/managed-workflow/CodeAI-Hub test01/`, and temporary/test workspace paths do not create stray folders unless `CODEAI_HUB_LOGS_DIR` is explicitly set.

### Tests
- `node --import tsx --test packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-terminal-residue-validator.test.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.test.ts packages/core/src/managed-workflow-orchestration/managed-terminal-dirty-classifier.test.ts`
- `node --import tsx --test packages/core/src/remote-bridge/handlers/managed-workflow-diagnostic-trace.test.ts`
- `npm run build --workspace @codeai-hub/core`

## [1.2.423] - 2026-05-31
### Fixed
- **Application Skeleton acceptance now stays Core-gated.** After the user confirms the reviewed Application Skeleton contract, Core immediately locks the managed input gate, performs materialization under that lock, and only releases on a Core-owned handoff.
- **Successful materialization no longer opens a second user review.** Core now completes the materialized Application Skeleton handoff and activates Quality Gates directly after validation succeeds.
- **Recoverable materialization failures return to the agent.** Failed scaffold/environment validation keeps the user handoff closed and dispatches a provider-visible repair turn instead of asking the user to adjudicate Core-generated errors.
- **Managed lifecycle logs use the real workspace folder.** User-level managed workflow JSONL traces are grouped under `~/.codeai-hub/logs/managed-workflow/<workspace-folder-name>/`, not by initiative/demo slug.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `node --import tsx --test --test-name-pattern 'Application Skeleton' packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts`
- `node --import tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.managed-review.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.quality-gates.test.ts`
- `node --import tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.application-skeleton-completion.test.ts packages/core/src/remote-bridge/handlers/managed-workflow-diagnostic-trace.test.ts`

## [1.2.422] - 2026-05-31
### Fixed
- **Application Skeleton materialization failures now return to the agent.** After the user confirms the Application Skeleton draft, Core records failed scaffold/environment validation as a managed rejected turn, keeps the user handoff closed, and dispatches a provider-visible repair prompt instead of showing a diagnostics-only System error to the user.
- **Failed materialization state is explicit.** The Core materializer rewrites `application-skeleton-map.json` and `application-skeleton.md` to `materialized: false` / `materializationState: "failed"` when post-materialization validation fails, so managed state no longer claims success before validation passes.

### Tests
- `node --import tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.managed-review.test.ts packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-core-materializer.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm run build:webview`
- `npm run typecheck:webview`

## [1.2.421] - 2026-05-31
### Fixed
- **Application Skeleton materialization now honors polyglot contracts.** Core creates every safe path declared by `projectFoundation.configFiles`, writes syntax-valid first-wave entrypoints by file type, and no longer forces npm package metadata into Python or Go Product Parts unless the accepted contract explicitly declares those files.

### Added
- **Managed lifecycle logs now cover all managed technical stages.** Core writes separate user-level JSONL traces for `Diagram Modules`, `Application Skeleton`, and `Quality Gates Baseline` under `~/.codeai-hub/logs/managed-workflow/<workspace-slug>/`.

### Tests
- `node --import tsx --test packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-core-materializer.test.ts`
- `node --import tsx --test packages/core/src/remote-bridge/handlers/managed-workflow-diagnostic-trace.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm run typecheck:webview`
- `npm run build:webview`

## [1.2.420] - 2026-05-31
### Fixed
- **Managed input gates now win over stale idle snapshots.** Project Manager preserves active managed workflow locks (`managed_core_gated`, `managed_workflow_core_agent_turn`, and `diagram_modules_sequence`) when later workspace snapshots report `idle` / `no_rollover_needed`, preventing Diagram Modules from reopening user input while Core and the agent are still exchanging managed subturns.
- **Diagram Modules diagnostics no longer dirty the workspace.** The lifecycle trace moved from `.codeai-hub/<workspace-slug>/runtime/logs/` to `~/.codeai-hub/logs/managed-workflow/<workspace-slug>/diagram-modules-lifecycle.jsonl`, so developer diagnostics cannot block managed workflow completion.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `node --import tsx --test packages/core/src/remote-bridge/handlers/managed-workflow-diagnostic-trace.test.ts src/client/project-manager/components/sessions/session-stream.test.ts src/client/project-manager/components/sessions/session-message-dedupe.test.ts`
- `npm run typecheck:webview`
- `npm run build:webview`

## [1.2.419] - 2026-05-31
### Added
- **Diagram Modules managed lifecycle trace.** Core now writes a workspace-local JSONL trace at `.codeai-hub/<workspace-slug>/runtime/logs/diagram-modules-lifecycle.jsonl` for Diagram Modules managed sessions, including persisted user/system/assistant/thinking messages with content hashes and Core managed input gate lock/unlock/no-op events.
- **Project Manager input-gate diagnostics.** Project Manager now reports managed continuation lock decisions, review/complete release handling, workspace snapshot input-state applications, stale managed gate preservation, and blocked idle unlocks through the `managed-input-gate` diagnostic channel in the Core log.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `npm run typecheck:webview`
- `npm run build:webview`
- `node --import tsx --test packages/core/src/remote-bridge/handlers/managed-core-gated-lock-controller.test.ts src/client/project-manager/components/sessions/session-message-dedupe.test.ts src/client/project-manager/components/sessions/session-stream.test.ts`

## [1.2.418] - 2026-05-30
### Fixed
- **Managed continuation `User` turns now carry the lock lifecycle marker.** Core tags visible managed continuation user messages with `managed-workflow-continuation`, so dialog history no longer looks idle while Core has already dispatched the next agent subturn.
- **Project Manager keeps input locked from the real continuation path.** The dialog projection now treats tagged Core-authored user continuations as active managed Core-agent work and releases the lock only on the existing managed review/complete handoff tags.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `node --import tsx --test packages/core/src/remote-bridge/handlers/managed-internal-continuation-dispatch.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts src/client/project-manager/components/sessions/session-message-dedupe.test.ts`
- `npm run typecheck:webview`
- `npm run build:webview`

## [1.2.417] - 2026-05-30
### Fixed
- **Managed dialog input gates survive stale idle snapshots.** Project Manager dialog projections now preserve an active Core-owned `managed_input_gate` lock until Core sends an explicit managed unlock/review handoff, preventing stale idle workspace snapshots from reopening the input during Core-agent managed exchange.
- **Diagram Modules Product Part continuations are compact delta user turns.** Inside the same live provider session, Core no longer resends embedded Product Part templates, field references, or merge rules on every Product Part subturn. The continuation now carries only the accepted boundary, next target artifact, Product Part id, accepted sibling list, and local turn constraints.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `node --import tsx --test packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-prompt-builder.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts src/client/project-manager/components/sessions/session-stream.test.ts src/client/project-manager/components/sessions/turn-state-stream.test.ts`
- `npm run typecheck:webview`
- `npm run build:webview`

## [1.2.416] - 2026-05-30
### Fixed
- **Managed continuations now start as visible User turns.** Core-authored prompts that are actually sent to the agent for the next managed subturn now go through the user-turn dispatch path instead of being shown only as System messages.
- **System messages stay limited to user-facing handoff/review notices.** Diagram Modules and Quality Gates no longer use `managed-workflow-continuation` System bubbles for provider-visible continuation prompts; the next agent prompt is recorded as a `User` message and re-enters the normal input-lock lifecycle.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `node --test packages/core/dist/remote-bridge/handlers/managed-internal-continuation-dispatch.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.js packages/core/dist/remote-bridge/handlers/quality-gates-review-decision-flow.test.js`
- `npm run typecheck:webview`
- `npm run build:webview`

## [1.2.415] - 2026-05-30
### Fixed
- **Managed workflow input is now gated by Core realtime state, not provider turn idleness.** Core emits `managed_input_gate` stream events when managed technical-stage work enters or leaves Core-owned agent/orchestrator exchange, so the input remains locked even if the visible provider turn appears idle.
- **Dialog/runtime projections receive the same Core gate.** Gate events include runtime, parent/dialog aliases, and provider-session identity, allowing Project Manager to lock the visible Diagram Modules, Application Skeleton, and Quality Gates views without owning the workflow truth or relying on local Project Manager triggers.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `node --test packages/core/dist/remote-bridge/handlers/managed-core-gated-lock-controller.test.js`
- `node --test packages/core/dist/remote-bridge/handlers/session-provider-event-router.test.js`
- `node --import tsx --test src/client/project-manager/components/sessions/turn-state-stream.test.ts`
- `npm run typecheck:webview`
- `npm run build:webview`

## [1.2.414] - 2026-05-30
### Fixed
- **Managed technical-stage input stays locked during Core conversation arbitration.** Core now treats provider `turn_completed` for managed technical stages as the start of Core-owned arbitration, asserts `managed_core_gated`, and emits `turn_state=running` before publishing the terminal event to clients.
- **The unlock trigger is now the Core user boundary, not provider idleness.** Diagram Modules, Application Skeleton, and Quality Gates keep input blocked while Core validates, commits, and dispatches internal managed continuations; the input opens only when Core creates a user review gate, blocked boundary, or complete user handoff.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `node --test packages/core/dist/remote-bridge/handlers/session-provider-event-router.test.js packages/core/dist/remote-bridge/handlers/managed-core-gated-lock-controller.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.js`
- `npm run typecheck:webview`
- `npm run build:webview`

## [1.2.413] - 2026-05-30
### Fixed
- **Managed technical-stage input lock is reasserted after Core continuation decisions.** Core now re-broadcasts the `managed_core_gated` lock when a managed turn remains `continued`, so stale terminal or idle snapshots cannot unlock input between the Core "next subturn" system message and the next provider turn.
- **Diagram Modules dispatch-next boundaries remain Core-gated until a real user boundary.** Product Part continuation turns now stay `continued` even if the provider prompt is unexpectedly absent; input is released only at explicit user review, blocked, or complete boundaries.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `node --test packages/core/dist/remote-bridge/handlers/managed-core-gated-lock-controller.test.js`
- `node --test packages/core/dist/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.js`
- `node --test packages/core/dist/remote-bridge/handlers/session-provider-event-router.test.js`
- `npm run typecheck:webview`
- `npm run build:webview`

## [1.2.412] - 2026-05-30
### Fixed
- **Managed technical-stage input locks before Core arbitration work begins.** Diagram Modules could still show an idle input while Core was validating artifacts, committing managed boundaries, and dispatching the next internal agent turn. Core now applies the `managed_core_gated` lock as soon as provider output reaches managed arbitration, before any validation/commit/continuation window can expose an idle snapshot.
- **Internal managed continuations no longer nest the next provider turn inside previous arbitration.** Diagram Modules, Application Skeleton, and Quality Gates dispatch internal continuation prompts asynchronously and immediately return `continued`, preserving one Core-owned lock lifecycle until the user-review gate or a blocked settlement.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `node --test packages/core/dist/remote-bridge/handlers/managed-core-gated-lock-controller.test.js`
- `node --test packages/core/dist/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.js`
- `npm run typecheck:webview`
- `npm run build:webview`

## [1.2.411] - 2026-05-30
### Fixed
- **Managed core-gated input lock no longer releases between continuation turns.** The 1.2.410 lock was keyed only to the managed turn result, but dispatch-next continuations report "settled" without an internal prompt, which released the lock mid core-gated work. Core now keeps the lock while a managed turn is "continued" or "settled" immediately after a continuation message (`managed-workflow-continuation`), releasing it only at the user-review gate or blocked outcomes.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `npm run typecheck:webview`
- `npm run build:webview`

## [1.2.410] - 2026-05-30
### Fixed
- **Input stays locked through the whole managed core-gated phase.** While a managed-workflow stage (e.g. Diagram Modules) runs Core-gated work across sub-steps, Core now holds a session continuityLock (reason `managed_core_gated`) whenever a managed turn keeps "continuing", and releases it when the stage reaches the user-review gate. The input no longer unlocks between agent turns; the lock is derived in Core from the managed run status (single source of truth) and the webview only reflects it.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `npm run typecheck:webview`
- `npm run build:webview`

## [1.2.409] - 2026-05-30
### Fixed
- **Input lock follows "waiting for the user" correctly.** Reverted the 1.2.408 gate-present lock that wrongly blocked the input while a managed review gate was shown — the input must be free there so the user can reply, edit, or confirm.
- **Input unlocks a short moment after the turn settles, not before.** A settle window (~450ms) keeps the input locked briefly after a turn goes idle so the agent's last streamed text finishes rendering first; a managed review gate unlocks immediately, and a new running turn re-locks immediately.

### Tests
- `npm run typecheck:webview`
- `npm run build:webview`

## [1.2.408] - 2026-05-30
### Fixed
- **Questionnaire scrolls to the submit footer reliably.** The auto-scroll re-pins to the target via a ResizeObserver while auto-height textareas expand after load, so a fully filled questionnaire lands on the "Submit questionnaire" footer instead of mid-list (previously the section-8 header).
- **Session dialog re-pins to the bottom after a reasoning bubble grows.** When a reasoning bubble's English text is replaced by a taller Russian translation, a ResizeObserver re-scrolls to the bottom while the view is pinned, keeping the latest message fully visible.
- **Chat input stays locked until the managed-workflow gate is confirmed.** The input lock now accounts for a present, unconfirmed managed review gate, so the input no longer unlocks prematurely after the turn goes idle but before/while the orchestrator gate is shown.

### Tests
- `npm run typecheck:webview`
- `npm run build:webview`

## [1.2.407] - 2026-05-30
### Changed
- **Project description questionnaire auto-scrolls.** On open the questionnaire resumes at the first unfilled required section, and once all required sections are filled (section 11 `out_of_scope` is the last required; section 12 `notes` is optional) it scrolls to the "Submit questionnaire" button. Auto-scroll target logic lives in a dedicated helper (`questionnaire-autoscroll.ts`) so the panel stays within the 500-line architecture limit; the shared questionnaire view gained an optional scroll mechanism, leaving the idea questionnaire unchanged.

### Tests
- `npm run typecheck:webview`
- `npm run build:webview`

## [1.2.406] - 2026-05-29
### Fixed
- **Claude visible reasoning summaries follow the target language.** The shared Claude workflow system prompt now explicitly instructs visible thinking/thought/reasoning summaries to use the runtime reasoning/chat language, including Russian summary headings and short progress labels for `ru` sessions.
- **Already Russian Claude thinking is not translated twice.** The provider-local thinking translation adapter skips TranslationFacade when the target language is Russian and the emitted thinking already contains Cyrillic text, preserving source-first Russian summaries.
- **Claude SSOT documents the language guard.** The module contract now records prompt-owned visible reasoning language policy and the Russian no-retranslate guard.

### Tests
- `npm run build --workspace @codeai-hub/claude-module`
- `node --test packages/Claude_Module/dist/messaging/claude-thought-translation-adapter.test.js`
- `npm test --workspace @codeai-hub/claude-module`

## [1.2.405] - 2026-05-29
### Fixed
- **CodeAI-owned LM Studio loads now receive TTL.** Translation/localization loads default to 300 seconds, reasoning translation loads to 600 seconds, and workflow-agent loads to 1800 seconds, with environment overrides for tuning.
- **Core cleans idle local model workers on provider lifecycle.** Local Models provider startup and shutdown now run best-effort cleanup for idle `codeaihub-*` LM Studio instances.
- **User-loaded LM Studio models stay untouched.** Cleanup is limited to idle CodeAI-owned identifiers and never uses `lms unload --all`.

### Tests
- `npx tsx --test packages/core/src/local-models/local-models-runtime-load-manager.test.ts packages/core/src/local-models/local-models-provider-adapter.test.ts packages/core/src/provider-registry/provider-descriptor-factory.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `node --test packages/core/dist/local-models/local-models-runtime-load-manager.test.js packages/core/dist/local-models/local-models-provider-adapter.test.js packages/core/dist/provider-registry/provider-descriptor-factory.test.js`

## [1.2.404] - 2026-05-29
### Fixed
- **Claude live/final assistant tails are deduped in Core.** A later ordinary assistant event that is already covered by immediately preceding `tag: "live"` chunks is suppressed; suffix-prefix overlaps are trimmed to the unseen continuation and kept as live content.
- **Claude live text no longer splits markdown links at URL periods.** `ClaudeTextLiveBuffer` treats URL/domain periods inside markdown links as unsafe flush boundaries and reconciles final suffix/window snapshots against already materialized live text.
- **Sources-list duplicate bubbles are prevented.** The observed `ills)` + repeated Sources tail is covered by both the Core persisted-history guard and the Claude buffer reconciliation path.

### Tests
- `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-live-tail-dedupe.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.test.ts packages/Claude_Module/src/messaging/claude-text-live-buffer.test.ts`
- `npm run build --workspace @codeai-hub/claude-module`
- `npm run build --workspace @codeai-hub/core`
- `node --test packages/core/dist/remote-bridge/handlers/session-request-handler-live-tail-dedupe.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-event-messages.test.js`
- `node --test packages/Claude_Module/dist/messaging/claude-text-live-buffer.test.js`

## [1.2.403] - 2026-05-29
### Fixed
- **Local Models workflow-agent calls now use LM Studio native chat.** The provider calls `/api/v1/chat`, parses final `message` output after reasoning blocks, and no longer depends on OpenAI-compatible `message.content` for reasoning-heavy local models.
- **Reasoning-only local outputs fail clearly.** If a model spends the output budget on reasoning without a final assistant message, Core reports that explicit condition instead of treating reasoning as a workflow artifact.
- **Idle local model workers are cleaned across purposes.** Core unloads idle `codeaihub-*` LM Studio workers from other model keys before creating a new selected load, preventing translation/localization and workflow-agent trials from leaving multiple heavy idle MLX workers in memory. Generating workers and manually loaded LM Studio identifiers are left alone.
- **Fetch/socket diagnostics now preserve cause details.** Local Models provider failures include the underlying fetch cause when available.

### Tests
- `npx tsx --test packages/core/src/local-models/local-models-runtime-load-manager.test.ts packages/core/src/local-models/local-models-provider-adapter.test.ts packages/core/src/local-models/local-models-facade.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `node --test packages/core/dist/local-models/local-models-runtime-load-manager.test.js packages/core/dist/local-models/local-models-provider-adapter.test.js packages/core/dist/local-models/local-models-facade.test.js`
- Live LM Studio smoke with `qwen3.6-27b-mlx`: native chat emitted `turn_started, assistant, turn_completed` for a one-word Russian prompt in `18336` ms, returned `готово`, and `lms ps --json` showed one loaded worker before the test unload.

## [1.2.402] - 2026-05-29
### Fixed
- **LM Studio context is now purpose-aware.** Reasoning translation keeps the fast `8192` profile, generic translation uses `16384`, localization materialization adapts to bounded batch size up to `32768`, and workflow-agent turns keep their separate provider profile.
- **Local Models no longer accumulate idle same-model clones.** Core reuses loaded LM Studio models with enough context and unloads idle base, CodeAI-owned, and `modelKey:N` duplicate instances before creating a new load.
- **Large MLX translation models are safer for UI localization.** Real `hy-mt2-30b-a3b-mlx` smoke verified an adaptive `16384` localization load, cleanup of the old idle `8192` clone, and a short reasoning translation without creating a second copy.

### Tests
- `npx tsx --test packages/core/src/local-models/local-models-runtime-load-manager.test.ts packages/core/src/local-models/local-models-facade.test.ts packages/core/src/local-models/local-models-provider-adapter.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm run build --workspace @codeai-hub/localization`
- Live LM Studio smoke with `hy-mt2-30b-a3b-mlx`: adaptive localization load selected `codeaihub-translation-localization-hy-mt2-30b-a3b-mlx-16384`, unloaded the idle base `8192` instance, translated `Open Settings.` to Russian, and left one loaded `hy-mt2` instance.

## [1.2.401] - 2026-05-29
### Fixed
- **Confirmation now opens the next workflow card.** After the user confirms an accepted artifact with `Подтверждаю`, Core emits `workflow:stage:activate` for the next trunk step only after the commit boundary succeeds.
- **Project Manager remains display-only.** PM listens for the Core activation event and updates the visible card/sidebar route, but it does not infer workflow acceptance from local UI state.
- **Preliminary and managed review gates share the next-stage command path.** Description, Virtual Simulation, and Diagram Modules acceptance now route to the next Core-active stage consistently.

### Tests
- `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-preliminary-review-committer.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-diagram-review-actions.test.ts`
- `npx tsx --test src/client/project-manager/components/layout/workflow-navigation.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm run build:project-manager`
- `npm run typecheck:webview`

## [1.2.400] - 2026-05-29
### Fixed
- **Post-turn managed workflow waits show working copy, not resume copy.** Project Manager no longer treats `context_check_pending` as a session-resume state; the input remains locked by the Core-owned snapshot, but the wait text is `Agent is working... Please wait.`.
- **Actual rollover/resume states keep the resume copy.** `threshold_reached`, `report_in_progress`, and `resume_bootstrap` still show `Agent is resuming your session... Please wait.`.
- **The Session UI contract now states the display-only boundary.** Project Manager chooses UX copy from Core-owned snapshot/lock reasons and does not own the lifecycle truth.

### Tests
- `npx tsx --test src/client/ui/src/session/input-panel.test.tsx`
- `npx tsx --test src/client/project-manager/components/sessions/session-stream-rollover-pending.test.ts`
- `npm run typecheck:webview`
- `npm run build:project-manager`

## [1.2.399] - 2026-05-29
### Fixed
- **Local Models preliminary artifacts are materialized from fenced markdown responses.** If an LM Studio workflow-step response includes the target artifact path plus a fenced markdown block, Core now writes that block to the canonical artifact file before opening review.
- **Description review is blocked when `Final_Description.md` is missing.** Preliminary stages now require their physical artifact files before user review can open, preventing confirmation from completing an empty Description step.
- **Virtual Simulation keeps the same fail-closed artifact gate.** The shared preliminary gate now validates both `Final_Description.md` and `virtual-simulation.md`.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `node --test packages/core/dist/remote-bridge/handlers/session-request-handler-preliminary-artifact-gate.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-managed-workflow-turn.preliminary.test.js`
- Smoke replay of the user Local Models JSONL where Core materialized `.codeai-hub/codeai-hub-codex-5-4/description/Final_Description.md` from the fenced markdown block.

## [1.2.398] - 2026-05-29
### Fixed
- **Local Models can handle large workflow-step prompts.** Workflow-agent turns now load and call a CodeAI-owned LM Studio model identifier with a provider-only context window, avoiding HTTP 400 failures when the Description step sends a large prompt.
- **Fast local translation remains on the short-context path.** The LM Studio translation engine is intentionally unchanged so UI and reasoning translation keep their existing batched, lower-latency behavior.
- **LM Studio 400 diagnostics now include the response body.** Provider failures expose the LM Studio error text, making future context/model-routing issues easier to diagnose.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `node --test packages/core/dist/local-models/local-models-provider-adapter.test.js`
- Live LM Studio smoke with a `46324` character Cyrillic Description-sized prompt through `gemma-4-26b-a4b-it`, using the CodeAI-owned `16384` context identifier and returning `turn_started, assistant, turn_completed`.

## [1.2.397] - 2026-05-29
### Fixed
- **LM Studio local models are visible immediately after settings load.** Core now sends the available localization engine catalog in the first `settings:loaded` payload, before full localization runtime materialization finishes.
- **Project Manager keeps translated UI runtime while refreshing local model catalogs.** Fast `availableEngines` updates are merged into the active runtime without clearing translated bundles, restoring Local Models settings, workflow model choices, dialog switching, and Localization Engine selectors.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `npm run typecheck:webview`
- `npm run build:project-manager`
- `node --test --test-name-pattern "resolves loaded localization" packages/core/dist/remote-bridge/handlers/settings-request-handler.localization-runtime.test.js`
- `npx tsx --test src/client/project-manager/components/settings/use-project-manager-settings.test.ts`
- Real LM Studio discovery smoke for 5 downloaded `lmstudio:*` engines and first-payload catalog availability before runtime materialization completes.

## [1.2.396] - 2026-05-29
### Fixed
- **Project Manager no longer drops translated runtime text during clear/rollback reloads.** Intermediate `settings:loaded` events with `localizationRuntime: null` now preserve the active translated runtime until Core sends a non-null replacement payload.
- **The shared Settings surface uses the same localization runtime guard.** Settings reloads no longer clear active browser localization while LM Studio resolves or refreshes localized payloads.

### Tests
- `npx tsx --test src/client/project-manager/components/settings/use-project-manager-settings.test.ts`
- `npm run typecheck:webview`
- `npm run build:webview`
- `npm run build:project-manager`
- Bundle smoke checks for `media/react-chat.js` and `packages/ui/project-manager/dist/app.js`.

## [1.2.395] - 2026-05-29
### Fixed
- **LM Studio UI localization bundles are sent in bounded batches.** Runtime localization materialization now splits structured bundle entries by entry count and character count before calling local models, avoiding one large request per UI category.
- **Local bundle materialization no longer leaves Project Manager stuck on English fallback for large local requests.** Failed bounded batches remain fail-closed, while successful batches are merged into the final localized bundle.

### Tests
- `npm run build --workspace @codeai-hub/localization`
- `node --test packages/localization/dist/localization-materializer.test.js packages/localization/dist/structured-batch-entry-recovery.test.js`
- Real LM Studio smoke with `lmstudio:gemma-4-26b-a4b-it` materializing a 13-entry `user_guidance` bundle as 2 bounded requests with `fallback=0` and `partial=0`.

## [1.2.394] - 2026-05-29
### Fixed
- **LM Studio local server is started by Core before local model calls.** Local model translation and provider execution now run a server preflight so Project Manager does not depend on a manually started LM Studio server.
- **LM Studio 0.4.14 server status output is parsed correctly.** The local model CLI runner now captures both stdout and stderr, matching the current `lms server status` behavior.
- **Bad local localization output is rejected instead of cached.** Interface localization materialization detects mostly unchanged English responses and falls back without marking the bundle ready.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `npm run build --workspace @codeai-hub/localization`
- `node --test dist/local-models/local-models-cli.test.js dist/local-models/local-models-facade.test.js dist/local-models/local-models-provider-adapter.test.js` from `packages/core`
- `node --test dist/localization-translation-quality.test.js dist/localization-materializer.test.js` from `packages/localization`
- `npm run typecheck:webview`
- `npm run build:project-manager`
- `npm run build:webview`
- Real LM Studio smoke for `lmstudio:gemma-4-26b-a4b-it` direct translation and localization materialization.

## [1.2.393] - 2026-05-29
### Added
- **Local Models is now a full Project Manager provider.** Downloaded LM Studio models are exposed as selectable model options for the `Local Models` provider and can be used from workflow step provider cards.

### Fixed
- **Downloaded local models are visible from GUI-launched runtime sessions.** Core now searches for the LM Studio CLI in standard app-runtime paths such as `~/.lmstudio/bin/lms`, so CEF/VS Code launches no longer depend on shell `PATH`.
- **UI Translation Engine selectors include local models.** The same downloaded LM Studio catalog is surfaced as dynamic `lmstudio:<modelKey>` translation engines for interface localization.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `npm run typecheck:webview`
- `npm run build:project-manager`
- `node --test dist/local-models/local-models-facade.test.js dist/local-models/local-models-cli.test.js dist/local-models/local-models-provider-adapter.test.js` from `packages/core`
- `npm run build:webview`
- Real LM Studio visibility smoke for provider options and `lmstudio:*` translation engines.

## [1.2.392] - 2026-05-28
### Added
- **LM Studio local models are selectable translation engines.** Core discovers downloaded LM Studio LLMs with `lms ls --json`, registers each model as `lmstudio:<modelKey>`, loads the selected model before first use, and calls the local OpenAI-compatible chat completions API.
- **Local models can drive both UI localization and visible Reasoning translation.** Settings now preserves `lmstudio:*` selections for `uiEngineId` and `reasoningEngineId`, and displays local entries as `LM Studio · <model>`.

### Fixed
- **Local model translation prompts use explicit payload delimiters.** The LM Studio prompt now names target languages as `Russian (ru)` style labels and wraps source text in `<text>...</text>` so instruction-like strings are translated instead of being treated as a request for more input.

### Tests
- `npm run build --workspace @codeai-hub/translation`
- `npm run build --workspace @codeai-hub/localization`
- `npm run build --workspace @codeai-hub/core`
- `npm run typecheck:webview`
- `npm run build:webview`
- `npm run build:project-manager`
- `node --test dist/local-models/local-models-facade.test.js` from `packages/core`
- `node --test dist/translation/core-translation-facade-factory.test.js` from `packages/core`
- `node --test dist/translation/core-localization-facade-factory.test.js` from `packages/core`
- `npx tsx --test src/client/ui/src/components/settings/settings-state-helpers.persistence.test.ts`
- Real LM Studio smoke with `lmstudio:gemma-4-26b-a4b-it` for reasoning translation, localization materialization, and unavailable-API fail-closed behavior.

## [1.2.391] - 2026-05-28
### Packaging
- Rebuilt the managed input lock hotfix under a new release number for installation and retest.
- Runtime behavior remains the v1.2.390 managed continuation lock fix: Project Manager keeps user input locked while Core owns internal agent turns and unlocks only on explicit user handoff.

### Tests
- Release build flow: `./scripts/build-all.sh`
- VSIX packaging flow: `./scripts/build-release.sh --use-current-version`

## [1.2.390] - 2026-05-28
### Fixed
- **Session input stays locked during Core-managed continuations.** Project Manager now locks the user input when Core emits `managed-workflow-continuation` and releases that managed lock only when Core hands control back through user review or completion.
- **Diagram Modules no longer unlocks input between product-part turns.** The Diagram Modules sequence lock now stays active for the full `generate_product_part` phase until aggregate/review readiness instead of relying on a narrow `pending` active-subturn status.

### Tests
- `npx tsx --test src/client/project-manager/components/sessions/session-message-dedupe.test.ts src/client/project-manager/components/sessions/use-diagram-modules-orchestration.test.ts src/client/project-manager/components/sessions/turn-state-stream.test.ts src/client/ui/src/session/input-panel.test.tsx`
- `npm run typecheck:webview`
- `npm run build:webview`
- Commit hooks: architecture, lint, knip, staged formatting

## [1.2.389] - 2026-05-28
### Fixed
- **Provider session JSONL no longer blocks workflow boundaries.** Core now treats provider-owned transcript directories under `.codeai-hub/<workspace>/runtime/sessions/unified/<provider>/` as mutable runtime state, including translation JSONL logs, while keeping Core-owned unified-session root files eligible for rollback ownership.
- **Residual workflow-neutral documents are committed automatically after step acceptance.** After the accepted step commit, Core auto-commits document-only leftovers in a separate `codeai-step: <Stage> residual documents` commit and appends a system message that lists the committed paths. Non-document code/config/unknown dirty files still block the next workflow step.

### Tests
- `npx tsx --test packages/core/src/workflow/boundary/workflow-step-commit-facade.test.ts packages/core/src/workflow/boundary/workflow-step-commit-facade-residual-docs.test.ts packages/core/src/workflow/runtime/workspace-runtime-capsule-gitignore.test.ts packages/core/src/workflow/boundary/workflow-boundary-facade-runtime-sessions.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `node --test packages/core/dist/workflow/boundary/workflow-step-commit-facade.test.js packages/core/dist/workflow/boundary/workflow-step-commit-facade-residual-docs.test.js packages/core/dist/workflow/runtime/workspace-runtime-capsule-gitignore.test.js packages/core/dist/workflow/boundary/workflow-boundary-facade-runtime-sessions.test.js`
- Commit hooks: architecture, lint, knip, staged formatting

## [1.2.388] - 2026-05-28
### Fixed
- **Existing OpenCode config is preserved during upgrades.** Runtime bootstrap now returns immediately when `~/.codeai-hub/providers/opencode/config.json` already exists, avoiding any write-open attempt against a user's API-key file while keeping first-time template creation for missing configs.
- **General user settings moved to global app settings.** Core now persists `general.coreControls`, `general.localization`, `general.responsePolicy`, and `general.textToSpeech` in the global app settings file while workspace settings keep provider/model/runtime values only.
- **Localization runtime is global.** Localization bundles, browser bootstrap payloads, and the user glossary now resolve under the global app localization root, and Project Manager saves the selected UI translation engine as canonical `general.localization.uiEngineId`.

### Tests
- `npx tsx --test packages/core/src/remote-bridge/handlers/settings-persistence-service.test.ts packages/core/src/workflow/runtime/workspace-runtime-capsule.test.ts packages/core/src/session-translation/session-translation-policy-resolver.test.ts packages/core/src/translation/core-localization-facade-factory.test.ts packages/core/src/remote-bridge/handlers/settings-request-handler.user-glossary.test.ts src/client/project-manager/components/settings/use-project-manager-settings.test.ts src/client/ui/src/components/settings/settings-state-helpers.persistence.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm run typecheck:webview`
- `npm run build:webview`
- Commit hooks: architecture, lint, knip, staged formatting

## [1.2.387] - 2026-05-28
### Fixed
- **OpenCode GLM uses the existing workspace capsule.** Core config now derives the fallback project slug from `path.basename(CLAUDE_WORKSPACE_PATH)` when `CLAUDE_PROJECT_SLUG` is missing, matching Project Registry and Workspace Runtime Capsule. The provider home now resolves to `.codeai-hub/<workspace-slug>/runtime/providers/opencode/home` instead of creating a second `.codeai-hub/users-...` capsule from the absolute workspace path.

### Tests
- `npx tsx --test packages/core/src/config/index.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `node --test packages/core/dist/config/index.test.js`
- Compiled `createGlmClaudeCodeAdapterInstance()` smoke check for `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4` with no `CLAUDE_PROJECT_SLUG`
- Commit hooks: architecture, lint, knip, staged formatting

## [1.2.386] - 2026-05-28
### Fixed
- **OpenCode config is created automatically.** Install/runtime bootstrap now creates `~/.codeai-hub/providers/opencode/config.json` with only `{ "apiKey": "" }` when the file is missing, while preserving any existing user config or secret.
- **The provider card gives exact API-key instructions.** The unavailable-provider message now explains that Claude login is not reused and tells the user to paste the Z.AI/GLM key into the JSON field `"apiKey"` in `~/.codeai-hub/providers/opencode/config.json`, then restart Core.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `node --test packages/core/dist/provider-registry/provider-recovery-coordinator.test.js`
- Commit hooks: architecture, lint, knip, staged formatting

## [1.2.385] - 2026-05-28
### Fixed
- **OpenCode GLM loads from its standalone provider runtime.** Core now resolves `~/.codeai-hub/providers/opencode/<version>` before any provider fallback, so the installed provider package is the adapter source while GLM keeps its separate provider home and settings contract.
- **Kimi reasoning translation uses the active session settings path.** Visible `Thinking`/reasoning bubbles and Core System translation now resolve language/engine policy from `session.modelBinding.settingsPath` before falling back to default settings, preventing Kimi reasoning from skipping Russian translation with `missing_target_language`.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `node --test packages/core/dist/provider-registry/provider-installed-path-resolver.test.js packages/core/dist/session-translation/session-translation-facade.test.js packages/core/dist/session-translation/session-translation-policy-resolver.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-event-messages.test.js`
- Commit hooks: architecture, lint, knip, staged formatting

## [1.2.384] - 2026-05-28
### Fixed
- **Application Skeleton artifact directory is prepared by Core.** `WorkflowRuntime.connectWorkspace()` now creates canonical workflow stage directories, including `.codeai-hub/<workspace>/application_skeleton/`, before provider prompts ask agents to write managed Application Skeleton artifacts.
- **Managed validation no longer exposes raw provider repair prompts.** Application Skeleton repair now displays a short Core-owned Russian System message while the full English repair prompt is sent only through the provider internal message path.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `npx tsx --test packages/core/src/workflow/runtime/workflow-runtime.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.test.ts`
- Commit hooks: architecture, lint, knip, staged formatting

## [1.2.383] - 2026-05-28
### Fixed
- **Description acceptance no longer blocks on tracked local timer state.** Core now untracks legacy workspace-local `.codeai-hub/state/` runtime files before the accepted-step clean-Git gate, including files that were already tracked, while leaving the runtime files on disk.
- **Workflow session creation reports the real Core error.** When workflow preflight rejects session creation before `session:created`, Project Manager receives `session:error` for the requesting client instead of falling through to `Session creation timed out.`.
- **Workflow blocker translation is covered.** Remaining Core workflow validation blockers stay on the System/Reasoning translation overlay, and the tracked timer-state case no longer emits the blocker at all.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `node --test packages/core/dist/remote-bridge/handlers/session-request-handler-event-messages.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-preliminary-routing.test.js packages/core/dist/workflow/boundary/workflow-step-commit-facade.test.js packages/core/dist/remote-bridge/remote-bridge-session-create-router.test.js`
- Commit hooks: architecture, lint, knip, staged formatting

## [1.2.382] - 2026-05-27
### Fixed
- **Virtual Simulation handoff requires the canonical artifact.** Core now blocks the preliminary user-review handoff when `virtual_simulation/virtual-simulation.md` is missing, preventing Gemini Virtual Simulation from appearing accepted while Diagram Modules later fails with `virtual-simulation.md not found`.
- **Session wait copy distinguishes work from resume.** Project Manager now shows `Agent is working... Please wait.` for ordinary running/blocked provider work and reserves `Agent is resuming your session... Please wait.` for explicit continuity/resume locks.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `npm run typecheck:webview`
- `node --test packages/core/dist/remote-bridge/handlers/session-request-handler-preliminary-artifact-gate.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-managed-workflow-turn.preliminary.test.js`
- `npx tsx --test src/client/ui/src/session/input-panel.test.tsx`
- Commit hooks: architecture, lint, knip, staged formatting

## [1.2.381] - 2026-05-27
### Fixed
- **OpenCode Settings can provide the API key.** The provider settings card now exposes a masked API key input and editable config/base/model fields, and Project Manager persists the GLM/OpenCode settings object so Core can read `providers.glmOpenCode.apiKey` after Save and Restart Core.

### Tests
- `npm run typecheck:webview`
- Commit hooks: architecture, lint, knip, staged formatting

## [1.2.380] - 2026-05-27
### Fixed
- **OpenCode GLM is a standalone provider artifact.** Release builds now produce and validate an OpenCode provider tarball/manifest, and workspace runtime capsules include an OpenCode-specific provider home.
- **Gemini startup no longer strands workflow start.** Core creates an early shell session for new workflow stages, applies a provider-session startup timeout, cleans up late Gemini sessions, and routes startup failures through provider recovery instead of leaving Project Manager at `Session creation timed out`.
- **Provider recovery clears failed startup shells.** Failed bootstrap now marks shell sessions failed even before a provider binding exists, so Codex/Claude/Kimi can be started after a Gemini startup failure or Core restart.
- **System messages use Reasoning translation routing.** Core workflow/status/error messages now use the same translation category as Reasoning, and latest System messages wait for translation persistence before UI binding returns.
- **Kimi Description handoff leaves Git clean.** Preliminary step acceptance enforces `.codeai-hub/state/` as ignored local runtime state before the clean-Git gate, preventing local timer metadata from blocking Virtual Simulation.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `npm run build --workspace @codeai-hub/kimi-module`
- `npm run typecheck:webview`
- `node --test packages/core/dist/remote-bridge/handlers/session-provider-session-resolver.test.js packages/core/dist/remote-bridge/handlers/session-shell-factory.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-session-bootstrap.test.js packages/core/dist/remote-bridge/handlers/session-provider-failure-recovery.test.js`
- `node --test packages/core/dist/session-translation/session-translation-facade.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-event-messages.test.js`
- `node --test packages/core/dist/workflow/boundary/workflow-step-commit-facade.test.js packages/core/dist/remote-bridge/handlers/technical-stage-dirty-gate.test.js`
- Commit hooks: architecture, lint, knip, staged formatting

## [1.2.379] - 2026-05-27
### Fixed
- **Gemini workspace auth is bootstrapped before session startup.** The Gemini provider home now copies missing auth/settings files from an existing `~/.gemini` login into the active workspace `.gemini` runtime home and reports missing login auth clearly.
- **Kimi runtime home follows the active workspace.** Core passes the configured workspace into Kimi adapter construction, Kimi avoids filesystem-root workspace fallbacks, and `~/.kimi/config.toml` remains the default credential source unless explicitly overridden.
- **OpenCode GLM reads workspace Settings as an auth fallback.** Non-empty `providers.glmOpenCode` workspace settings can provide API key/base URL/model defaults after env/config precedence, without writing secrets to tracked files.
- **Description provider picker shows truthful readiness.** Project Manager only enables providers that Core reports as active, while inactive/degraded providers keep their actionable recovery message visible.

### Tests
- `npm run build --workspace @codeai-hub/gemini-module`
- `node --test packages/Gemini_Module/dist/runtime/cli-bridge-provider-home.test.js packages/Gemini_Module/dist/session/gemini-session-bootstrapper.test.js`
- `npm run build --workspace @codeai-hub/kimi-module`
- `node --test packages/Kimi_Module/dist/provider/kimi-managed-agent-profile.test.js`
- `npm run test --workspace @codeai-hub/kimi-module`
- `npm run build --workspace @codeai-hub/core`
- `npm run typecheck:webview`
- `npm run plan:validate`
- Commit hooks: architecture, lint, knip, staged formatting

## [1.2.378] - 2026-05-27
### Fixed
- **Managed provider turns stay locked until Core settles.** Provider `turn_completed` events no longer unlock Project Manager input while Core is still persisting messages, arbitrating managed flow nodes, or opening a user-review gate.
- **Review confirmations are Core-owned and idempotent.** The Project Manager confirmation button now calls the active Core review action, rejects stale gates, suppresses duplicate actionable buttons, and does not send ordinary provider-visible text.
- **Application Skeleton review gates are distinguishable.** Core now labels draft-contract review separately from filesystem-skeleton review, so the two managed acceptance points are clear in history.
- **Managed review markers render as progress.** Application Skeleton and Quality Gates stages with current review artifacts now show the in-progress/yellow state instead of a stale invalid/red marker.
- **Quality Gates draft review keeps integration files clean.** Before pre-acceptance review commits, Core restores or removes prohibited integration edits such as `package.json`, hooks, lockfiles, and gate scripts so they cannot dirty the workspace before the user confirms integration.

### Tests
- `node --test --import tsx packages/core/src/remote-bridge/handlers/session-provider-event-router.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.managed-review.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts`
- `node --test --import tsx src/client/project-manager/components/sessions/project-manager-dialog-session-view-helpers.test.ts src/client/project-manager/components/sessions/project-manager-session-view.test.tsx`
- `node --test --import tsx packages/core/src/remote-bridge/handlers/technical-root-progress-projection.test.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm run typecheck:webview`
- `npm run build:webview`
- `npm run plan:validate`
- Commit hooks: architecture, lint, knip, staged formatting

## [1.2.377] - 2026-05-27
### Fixed
- **Quality Gates completion leaves Git clean.** Core now waits for the final `managed-workflow-complete` message to persist and commits that terminal handoff residue before returning control to Project Manager.
- **Clear rollback commits bypass workspace hooks.** Core-owned workflow boundary and Clear commits use `--no-verify`, so a user workspace pre-commit hook cannot strand Clear in a half-restored dirty state.
- **Boundary registry pruning is no-op stable.** Clearing a stage no longer rewrites `workflow/boundaries.json` with a timestamp-only diff when the target/downstream entries are already absent.
- **Project Manager explains dirty-Git blockers.** Start cards now show `cleanup required` plus the dirty file list from Core instead of misreporting the upstream artifact as `not found`.

### Tests
- `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.quality-gates.test.ts packages/core/src/workflow/boundary/workflow-rollback-coordinator.test.ts src/client/project-manager/services/workflow-gating-client.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm run typecheck:webview`
- `npm run build:webview`
- `npm run plan:validate`
- Commit hooks: architecture, lint, knip, staged formatting

## [1.2.376] - 2026-05-27
### Fixed
- **Workflow state writes are atomic.** Core now writes workflow `state.json` through a temporary file and rename, preventing malformed rollback boundary JSON after managed stages advance.
- **Clear Description keeps the Git tree clean.** Project Manager no longer rewrites an existing Description questionnaire just by loading it after Clear, avoiding projection-only dirtiness.
- **Clear prunes removed workflow provider sessions.** When Clear removes downstream workflow sessions, Core deletes the matching provider-native Codex/Claude session files while leaving unrelated runtime sessions alone.
- **Completed translation sessions are discarded automatically.** Successful Codex App Server and Claude Haiku localization/translation calls delete their native session files; finalized workspace localization artifacts remain the retained output.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `node --test packages/core/dist/workflow/state/workflow-last-active-store.test.js`
- `node --test packages/core/dist/remote-bridge/handlers/workflow-step-clear-service.test.js`
- `node --test --import tsx src/client/project-manager/services/description-questionnaire-service.test.ts`
- `npm run typecheck:webview`
- `npm run build --workspace @codeai-hub/codex-app-server-module`
- `node --test packages/Codex_AppServer_Module/dist/translation/codex-app-server-translation-service.test.js`
- `npm run build --workspace @codeai-hub/claude-module`
- `node --test packages/Claude_Module/dist/translation/claude-haiku-translation-service.test.js`
- Commit hooks: architecture, lint, knip, staged formatting

## [1.2.375] - 2026-05-26
### Fixed
- **Workflow watcher ignores deleted artifacts during Clear rollback.** Filesystem `rename` events emitted by `git reset --hard` / `git clean -fd` now produce workflow updates only when the target path still exists, preventing deleted downstream artifacts from being recorded again as `workflow.artifact.written`.
- **Clear no longer dirties `workflow/state.json` with stale downstream `lastActive`.** After clearing Application Skeleton / Diagram Modules back to the previous boundary, Core should keep the restored `lastActive` artifact instead of rewriting it to a removed Diagram Modules path.
- **Deleted workflow stage directories no longer look like new runs.** Stage-directory deletion events are ignored, while real stage directory creation still emits `workflow.run.created`.

### Tests
- `node --test --import tsx packages/core/src/workflow/watcher/workflow-watcher.test.ts packages/core/src/workflow/runtime/workflow-runtime.test.ts packages/core/src/workflow/boundary/workflow-boundary-facade.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm run plan:validate`
- Commit hooks: architecture, lint, knip, staged formatting

## [1.2.374] - 2026-05-26
### Fixed
- **Project Manager rehydrates session/status state after workflow Clear.** The session status hydrator now treats `pm:workflow-step:cleared` like a restart-equivalent signal, force-refreshing `/api/v1/status` and session histories so restored Description/Virtual Simulation sessions appear without manual Restart Core.
- **Complete provider homes are rollback-ignored workspace runtime.** The runtime capsule now excludes `.codeai-hub/<workspaceSlug>/runtime/providers/**/home/**` from workflow history while keeping Core logical sessions and accepted artifacts rollback-owned.
- **Clear preserves legacy-tracked provider runtime config.** The rollback coordinator snapshots current rollback-ignored runtime files before `git reset --hard`, restores them after `git clean -fd`, and untracks legacy provider-home entries so `config.toml` and similar provider runtime files are not reset to stale boundary contents.

### Tests
- `node --test --import tsx packages/core/src/workflow/runtime/workspace-runtime-capsule-gitignore.test.ts`
- `node --test --import tsx packages/core/src/workflow/boundary/workflow-boundary-facade.test.ts`
- `node --test --import tsx packages/core/src/workflow/boundary/workflow-step-commit-facade.test.ts`
- `node --test --import tsx src/client/project-manager/components/sessions/status-hydrator.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm run build:project-manager`
- `npm run typecheck:webview`
- Commit hooks: architecture, lint, knip, staged formatting

## [1.2.373] - 2026-05-26
### Fixed
- **Workspace localization runtime no longer dirties workflow Git history.** The runtime capsule now ignores `.codeai-hub/<workspaceSlug>/runtime/localization/**`, updates existing capsule `.gitignore` files, and migrates legacy tracked localization files out of the Git index without deleting the active workspace localization cache.
- **Provider-native session logs are rollback-ignored live runtime.** Provider session logs under `.codeai-hub/<workspaceSlug>/runtime/providers/**/home/sessions/**` are preserved as workspace runtime diagnostics but are removed from accepted-step/Clear commits and legacy indexes.
- **Clear/Undo keeps rollback truth focused on Core-owned artifacts.** Settings, localization runtime, and provider-native logs stay live and untracked, while Core logical sessions, applied config/model binding, and accepted workflow artifacts remain the reproducibility and rollback proof.

### Tests
- `node --test --import tsx packages/core/src/workflow/runtime/workspace-runtime-capsule-gitignore.test.ts packages/core/src/workflow/boundary/workflow-step-commit-facade.test.ts packages/core/src/workflow/boundary/workflow-boundary-facade.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `node --test --import tsx src/client/project-manager/services/workflow-step-start-service.settings-barrier.test.ts src/client/project-manager/services/workflow-step-start-service.gating.test.ts`
- `npm run build:project-manager`
- `npm run typecheck:webview`
- Commit hooks: architecture, lint, knip, staged formatting

## [1.2.372] - 2026-05-26
### Fixed
- **Workspace settings are no longer part of workflow Clear/Undo rollback.** The runtime capsule now ignores `.codeai-hub/<workspaceSlug>/runtime/settings/settings.json`, updates existing capsule `.gitignore` files, and migrates legacy tracked settings out of the Git index without deleting the workspace settings file.
- **Clear preserves current settings across Git reset/clean.** The rollback coordinator snapshots the current workspace settings file before `git reset --hard`, restores it after `git clean -fd`, rewrites the current capsule `.gitignore`, and untracks any restored legacy settings entry before committing the Clear projection.
- **Session starts no longer create settings commits.** Project Manager start-card model/settings changes remain live workspace settings, while accepted-step commits keep the immutable model binding, applied config, and provider/session artifacts needed for reproducibility.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `node --test dist/workflow/runtime/workspace-runtime-capsule-gitignore.test.js dist/workflow/boundary/workflow-step-commit-facade.test.js dist/workflow/boundary/workflow-boundary-facade.test.js dist/remote-bridge/remote-bridge-session-create-router.test.js dist/remote-bridge/handlers/settings-persistence-service.test.js dist/remote-bridge/handlers/settings-saved-broadcaster.test.js dist/remote-bridge/handlers/settings-request-handler.localization-runtime.test.js`
- `npm run build:project-manager`
- `npm run typecheck:webview`
- Commit hooks: architecture, lint, knip, staged formatting

## [1.2.371] - 2026-05-26
### Changed
- **Rebuilt the Clear confirmation UI fix as the next installable release.** No additional runtime logic changed after v1.2.370; this release packages the existing Project Manager Clear confirmation behavior for the next Clear Undo retest.

### Tests
- `./scripts/build-all.sh --allow-dirty`
- `./scripts/build-release.sh --use-current-version --allow-dirty`

## [1.2.370] - 2026-05-26
### Fixed
- **Clear confirmation closes when the Clear action is accepted.** The Project Manager workspace tree Clear confirmation popover now closes before the rollback HTTP request is awaited, so the destructive confirmation dialog does not remain visible after a successful Virtual Simulation rollback.
- **Clear rollback completion still refreshes Project Manager state.** The background request still dispatches `pm:workflow-step:cleared` on success and requests an immediate workflow-state poll; failures are normalized into `pm:workflow-step:clear-failed` instead of leaving an unhandled promise path.

### Tests
- `node --import tsx --test src/client/project-manager/components/layout/workspace-tree-clear-menu.test.ts`
- `npm run build:project-manager`
- `npm run typecheck:webview`
- Commit hooks: architecture, lint, knip, staged formatting

## [1.2.369] - 2026-05-26
### Fixed
- **Project Manager localization follows the active workspace settings scope.** Project Manager no longer issues an unscoped settings load during websocket startup, and the shell settings hook now accepts the active workspace-scoped settings payload so UI/help localization reads the selected workspace runtime instead of fallback defaults.
- **Settings commands no longer create fallback localization capsules.** User glossary opening now carries the active workspace scope through the remote bridge, preventing accidental writes under full-path slug folders such as `.codeai-hub/users-.../runtime/localization`.
- **Workspace slug derivation is covered for spaced project paths.** Regression coverage now locks the expected `codeai-hub-codex-5-4` slug for `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4` and verifies localization/glossary paths stay inside that active workspace capsule.

### Tests
- `node --import tsx --test src/client/project-manager/components/settings/use-project-manager-settings.test.ts src/client/project-manager/services/workspace-settings-payload-hook.test.ts src/client/project-manager/services/workflow-step-settings-transport.test.ts packages/core/src/workflow/runtime/workspace-runtime-capsule.test.ts packages/core/src/remote-bridge/handlers/settings-request-handler.localization-runtime.test.ts packages/core/src/remote-bridge/handlers/settings-request-handler.user-glossary.test.ts packages/core/src/remote-bridge/handlers/settings-persistence-service.test.ts packages/core/src/remote-bridge/handlers/settings-saved-broadcaster.test.ts packages/core/src/translation/core-localization-facade-factory.test.ts packages/localization/src/localization-runtime-bootstrap-store.test.ts packages/localization/src/localization-materializer.test.ts`
- `npm run build --workspace @codeai-hub/localization`
- `npm run build --workspace @codeai-hub/core`
- `npm run build:project-manager`
- `npm run typecheck:webview`
- `npm run build:webview`

## [1.2.368] - 2026-05-26
### Fixed
- **Project Manager localization sync uses the active workspace slug.** Settings save/reset/load now create Core localization runtime facades from the same `workspaceRoot` and `workspaceSlug` scope used by the workspace settings file, preventing localization bundles from being written to sibling slug folders such as `.codeai-hub/users-.../runtime/localization`.
- **Reasoning-only Apple Native settings no longer block UI localization materialization.** Apple Native readiness preflight now applies to UI-owned localization sync targets only, so selecting Apple Native for reasoning translation does not prevent Project Manager helper bundles from materializing through the selected UI engine.

### Tests
- `node --import tsx --test packages/core/src/remote-bridge/handlers/settings-request-handler.localization-runtime.test.ts packages/core/src/remote-bridge/handlers/settings-request-handler.user-glossary.test.ts packages/core/src/remote-bridge/handlers/settings-persistence-service.test.ts packages/core/src/remote-bridge/handlers/settings-saved-broadcaster.test.ts packages/core/src/translation/core-localization-facade-factory.test.ts packages/localization/src/localization-runtime-bootstrap-store.test.ts packages/localization/src/localization-materializer.test.ts`
- `npm run build --workspace @codeai-hub/localization`
- `npm run build --workspace @codeai-hub/core`
- `npm run typecheck:webview`
- `npm run build:project-manager`
- `npm run build:webview`
- Workspace/global localization path check for the `users-...` slug mismatch.

## [1.2.367] - 2026-05-26
### Fixed
- **Workspace localization runtime is the only localization authority.** Core, extension compatibility surfaces, metadata stores, browser bootstrap cache, and user glossary creation now resolve localization files under `.codeai-hub/<workspaceSlug>/runtime/localization/` instead of `~/.codeai-hub/localization`.
- **Project Manager bootstrap reads workspace settings before localization.** Localization bootstrap now loads the active workspace settings snapshot before resolving translated helper text, so language and translation choices saved in Project Manager apply to workflow views.
- **Provider and glossary fallbacks no longer write global runtime state.** Codex provider config sync writes to the active workspace provider home, and the Project Manager user glossary action creates files inside the workspace runtime localization capsule.

### Tests
- `node --import tsx --test src/extension-module/settings/codex-provider-config-sync.test.ts packages/localization/src/localization-runtime-bootstrap-store.test.ts packages/localization/src/localization-materializer.test.ts packages/core/src/translation/core-localization-facade-factory.test.ts packages/core/src/remote-bridge/handlers/settings-persistence-service.test.ts packages/core/src/remote-bridge/handlers/settings-saved-broadcaster.test.ts packages/core/src/remote-bridge/handlers/settings-request-handler.user-glossary.test.ts`
- `npm run build --workspace @codeai-hub/localization`
- `npm run build --workspace @codeai-hub/core`
- `npm run typecheck:webview`
- `npm run build:project-manager`
- `npm run build:webview`
- Global runtime path scan/classification for settings, localization, glossary, and provider-home writes.

## [1.2.366] - 2026-05-26
### Fixed
- **Project Manager Settings persist before localization sync.** Core writes `.codeai-hub/<workspaceSlug>/runtime/settings/settings.json` before running translation/localization runtime synchronization, so an Apple Native readiness/preflight failure no longer cancels the saved settings event.
- **Settings events are scoped to the active workspace.** The Project Manager Settings panel ignores stale load/save/error events from other workspaces and continues to save/reset with the active workspace scope.
- **Legacy global settings cannot become runtime truth through fallbacks.** Extension compatibility storage, Codex app-server fallbacks, request-capture diagnostics, and Core config now avoid `~/.codeai-hub/settings/settings.json` as a mutable settings source; an inherited `CLAUDE_SETTINGS_PATH` pointing there is ignored.

### Tests
- `node --import tsx --test packages/core/src/remote-bridge/handlers/settings-saved-broadcaster.test.ts packages/core/src/remote-bridge/handlers/settings-persistence-service.test.ts src/client/project-manager/components/settings/use-project-manager-settings.test.ts src/extension-module/settings/settings-storage.test.ts src/extension-module/settings/codex-provider-config-sync.test.ts packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.test.ts packages/core/src/config/index.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm run typecheck:webview`
- `npm run build --workspace @codeai-hub/codex-app-server-module`
- Settings reference scan for legacy global settings runtime reads.
- `npm run plan:validate`

## [1.2.365] - 2026-05-26
### Fixed
- **Workspace runtime settings are the only mutable settings authority.** Core no longer creates, reads, or seeds workflow settings from `~/.codeai-hub/settings/settings.json`; missing workspace settings are materialized in `.codeai-hub/<workspaceSlug>/runtime/settings/settings.json` from an existing configured workspace first, then from in-code defaults.
- **Project Manager settings traffic is workspace-scoped.** Settings load/save events carry workspace scope, workflow transport ignores unscoped or wrong-workspace replies, and start cards resolve model/reasoning defaults from the active workspace settings snapshot.
- **Provider/session fallbacks use workspace runtime capsules.** Provider bootstrap, localization bootstrap, session model binding, applied turn config, continuity thresholds, and default Core config settings paths no longer derive runtime settings from the legacy global settings directory.

### Tests
- `node --import tsx --test packages/core/src/remote-bridge/handlers/settings-persistence-service.test.ts src/client/project-manager/services/workflow-step-start-service.settings-barrier.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm run typecheck:webview`
- Settings reference scan for legacy global settings runtime reads.
- `npm run plan:validate`

## [1.2.364] - 2026-05-25
### Fixed
- **Workspace runtime settings are the workflow authority.** Workflow start cards now load the active workspace settings snapshot before saving selected provider/model defaults, preventing stale global settings from overwriting `.codeai-hub/<workspaceSlug>/runtime/settings/settings.json`.
- **Provider sessions use workspace-scoped model policy.** Core session model binding resolves defaults from the workspace settings file and carries that path into applied provider turn config, so model/reasoning and reasoning translation policy no longer fall back to `~/.codeai-hub/settings/settings.json` for workflow sessions.

### Tests
- `npx tsx --test src/client/project-manager/services/workflow-step-start-service.settings-barrier.test.ts src/client/project-manager/services/workflow-step-start-service.gating.test.ts`
- `npx tsx --test packages/core/src/session-model-binding/session-model-binding-facade.test.ts packages/core/src/session-model-binding/session-model-binding-resolver.test.ts`
- `npm run build --workspace=@codeai-hub/core`
- `npm run build:webview`
- `npm run typecheck:webview`
- `npm run plan:validate`

## [1.2.363] - 2026-05-25
### Fixed
- **Application Skeleton unlocks after Diagram Modules acceptance.** Diagram Modules user-return completion messages are persisted before the accepted-step commit, and workspace-owned runtime sessions/provider homes are classified as managed committable state instead of blocking the next stage.
- **Volatile Codex runtime residue is removed from workflow commits.** Accepted-step commits now untrack previously committed provider SQLite/model-cache/shell-snapshot files and the workspace runtime capsule ignores them for future starts.
- **Misleading `product-parts.index.md not found` blocker is avoided.** The file path was correct; the actual blocker was dirty Git state after Diagram Modules acceptance.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `node --test packages/core/dist/workflow/boundary/workflow-step-commit-facade.test.js packages/core/dist/managed-workflow-orchestration/managed-terminal-dirty-classifier.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-diagram-review-actions.test.js packages/core/dist/remote-bridge/handlers/technical-stage-dirty-gate.test.js packages/core/dist/remote-bridge/handlers/workflow-state-service-rewrite-boundary.test.js`
- `npm run plan:validate`

## [1.2.362] - 2026-05-25
### Fixed
- **All workflow start cards can create clean boundaries after model changes.** Core now commits explicit workspace runtime settings changes as `codeai-settings: <Stage> start selection` before creating the next `codeai-boundary: <Stage>` anchor, so start-card model/reasoning changes do not dirty the pre-step boundary.
- **Real Git status output is parsed for settings changes.** The pre-boundary settings commit recognizes the trimmed `M .codeai-hub/<workspaceSlug>/runtime/settings/settings.json` status form emitted by the Git helper, preventing the next stage from timing out on an uncommitted tracked settings edit.

### Tests
- Disposable workflow start walkthrough: `Description -> Virtual Simulation -> Diagram Modules -> Application Skeleton -> Quality Gates` with dirty settings before each post-Description boundary.
- `npm run build --workspace @codeai-hub/core`
- `node --test packages/core/dist/remote-bridge/remote-bridge-session-create-router.test.js`
- `node --test packages/core/dist/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.js`
- `node --test packages/core/dist/remote-bridge/handlers/workspace-session-service.test.js`
- `node --test packages/core/dist/remote-bridge/handlers/workspace-activate-service.test.js`
- `npx tsx --test src/client/project-manager/services/workflow-step-start-service.settings-barrier.test.ts`
- `npm run build:webview`
- `npm run typecheck:webview`
- `npm run plan:validate`

## [1.2.361] - 2026-05-25
### Fixed
- **Virtual Simulation can start after accepting Description.** Preliminary acceptance now records the Core completion handoff before the accepted-step Git commit, keeping the committed unified session history complete and preventing the next boundary from timing out on a dirty tree.
- **Volatile Codex runtime residue no longer blocks the next workflow stage.** The workspace runtime capsule ignores provider WAL/SHM/tmp files while keeping rollback-relevant settings, sessions, and provider home state trackable.
- **Start-card model changes are saved to workspace settings.** Workflow stage start cards now persist model/reasoning selections with the active workspace scope, so `.codeai-hub/<workspaceSlug>/runtime/settings/settings.json` updates before session creation.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `node --test packages/core/dist/remote-bridge/handlers/session-request-handler-preliminary-routing.test.js`
- `npm run build:webview`
- `npm run typecheck:webview`
- `npx tsx --test src/client/project-manager/services/workflow-step-start-service.settings-barrier.test.ts`
- `npm run plan:validate`

## [1.2.360] - 2026-05-25
### Changed
- **Workflow Clear is now plain workspace Git rollback.** Clear resolves the selected workflow boundary from Git history and restores it with `git reset --hard <boundaryHash>` plus `git clean -fd`, without runtime-slice copy/restore or path-scoped cleanup fallbacks.
- **Workflow runtime state now belongs to the workspace.** Workspace-scoped settings, unified sessions, and provider homes for workflow sessions live under `.codeai-hub/<workspaceSlug>/runtime/`, so Git rollback removes downstream native and unified sessions together with downstream artifacts.
- **Project Manager settings are workspace-scoped for workflow workspaces.** The active workspace now owns the settings file used for provider/model choices, preventing one workspace's workflow settings from becoming another workspace's rollback state.
- **Core release builds clean ignored `dist` before packaging.** `@codeai-hub/core` removes stale compiled output before `tsc`, preventing retired Clear/Undo files from entering the packaged runtime.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `node --test packages/core/dist/workflow/runtime/workspace-runtime-capsule.test.js packages/core/dist/workflow/runtime/workspace-runtime-capsule-gitignore.test.js packages/core/dist/workflow/boundary/workflow-boundary-facade.test.js packages/core/dist/workflow/boundary/workflow-step-commit-facade.test.js packages/core/dist/remote-bridge/handlers/workflow-step-clear-service.test.js packages/core/dist/remote-bridge/handlers/workspace-activate-service.test.js packages/core/dist/remote-bridge/remote-bridge-session-create-router.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.js packages/core/dist/remote-bridge/handlers/settings-persistence-service.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-continuity-root.test.js packages/core/dist/remote-bridge/handlers/dialog-list-service.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-preliminary-routing.test.js packages/core/dist/remote-bridge/handlers/workflow-state-service-rewrite-boundary.test.js packages/core/dist/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.test.js packages/core/dist/managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller.test.js packages/core/dist/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.test.js`
- `npm run check:workflow-rollback`
- Disposable workspace walkthrough: `Description -> Virtual Simulation -> Diagram Modules -> Clear Diagram Modules -> Clear Virtual Simulation -> Clear Description`
- `npm run plan:validate`

## [1.2.359] - 2026-05-25
### Fixed
- **Diagram Modules Start no longer times out on scaffold residue.** Project Manager websocket `session:create` now leaves the managed scaffold to the Core-owned managed start path, so Diagram Modules can create a clean pre-step Git boundary before `.husky`, `doc/TODO`, `package.json`, or `scripts` are written.
- **Managed scaffold checkpointing still happens before provider dispatch.** Core continues to install and commit the Diagram Modules managed workspace scaffold behind the boundary, preserving rollback semantics for Clear.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `node --test packages/core/dist/remote-bridge/remote-bridge-session-create-router.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.js packages/core/dist/workflow/boundary/workflow-boundary-facade.test.js`
- `npm run plan:validate`

## [1.2.358] - 2026-05-25
### Fixed
- **Description startup is serialized across activation/session requests.** Core now runs workflow boundary creation as a per-workspace transaction, so simultaneous Project Manager `workspace-activate` and `workspace-session` calls cannot race through `git init` or produce a dirty startup tree.
- **Boundary commits now stage explicit paths correctly.** Explicit workflow boundary files are no longer combined with broad exclude pathspecs that prevented `boundaries.json` from being staged.
- **Failed 1.2.357 pre-submit residue self-heals.** If a workspace only contains the pre-submit `.codeai-hub/<workspaceSlug>/description/questionnaire.md` bootstrap from the failed startup path, Description boundary creation commits it as the startup baseline instead of blocking the questionnaire.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `node --test packages/core/dist/workflow/boundary/workflow-boundary-facade.test.js packages/core/dist/workflow/boundary/workflow-step-commit-facade.test.js packages/core/dist/remote-bridge/handlers/workspace-activate-service.test.js packages/core/dist/remote-bridge/handlers/workspace-session-service.test.js`
- `npm run plan:validate`

## [1.2.357] - 2026-05-25
### Fixed
- **New workspaces can load the Description questionnaire again.** Workspace activation now creates the `Description` boundary before `.codeai-hub/<workspaceSlug>` bootstrap, so the strict dirty-tree boundary guard no longer rejects a brand-new workspace before Project Manager can create/read `description/questionnaire.md`.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `node --test packages/core/dist/remote-bridge/handlers/workspace-activate-service.test.js packages/core/dist/workflow/boundary/workflow-boundary-facade.test.js`
- `npm run plan:validate`

## [1.2.356] - 2026-05-25
### Fixed
- **Workflow boundaries are now clean pre-step anchors.** `codeai-boundary: <Stage>` commits no longer stage implicit workspace changes, and Core blocks stage start if Git is already dirty before the boundary can be created.
- **Runtime slice restore prunes downstream native sessions.** Provider session files created after the captured boundary are removed inside recorded provider session directories, while older session history remains intact.
- **Diagram Modules acceptance now creates a final accepted-step commit.** Core commits `codeai-step: Diagram Modules accepted` with runtime slices before unlocking Application Skeleton.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `node --test packages/core/dist/workflow/boundary/workflow-runtime-slice-snapshot.test.js packages/core/dist/workflow/boundary/workflow-step-commit-facade.test.js packages/core/dist/workflow/boundary/workflow-boundary-facade.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-diagram-review-actions.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-preliminary-routing.test.js`
- `npm run plan:validate`

## [1.2.355] - 2026-05-25
### Fixed
- **Accepted preliminary workflow steps now leave Git clean.** Description and Virtual Simulation acceptance captures runtime session slices, commits accepted step output as `codeai-step: <Stage> accepted`, ignores local timer state, and blocks next-step unlock if Git still has unclassified dirty files.
- **Clear now restores session slices as well as workspace files.** Core mirrors per-workspace unified sessions and provider-native session JSON/JSONL files into committed `runtime-slices` snapshots and restores them after boundary reset.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `node --test packages/core/dist/workflow/boundary/workflow-runtime-slice-snapshot.test.js packages/core/dist/workflow/boundary/workflow-step-commit-facade.test.js packages/core/dist/workflow/boundary/workflow-boundary-facade.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-preliminary-routing.test.js`
- `npm run plan:validate`

## [1.2.354] - 2026-05-25
### Changed
- **Workflow Clear now restores Core-owned Git boundaries.** Core creates `codeai-boundary: <Stage>` commits before workflow stages start, records them in `.codeai-hub/<workspaceSlug>/workflow/boundaries.json`, and restores workflow-stage Clear from that boundary instead of using undo ledgers, checkpoints, fallback path deletion, or last-active repair.
- **Description gets a boundary at workspace activation.** The first rollback anchor is created before questionnaire work and before workspace activation side effects.
- **Managed technical stages use the same boundary model.** Project Manager starts and managed dispatch paths create/verify boundaries before scaffold and stage-plan side effects.
- **Development Tree node Clear stays fail-closed.** Node-level Clear is left unavailable until it has a separate node-boundary design.

### Tests
- `node --test packages/core/dist/workflow/boundary/workflow-boundary-facade.test.js packages/core/dist/remote-bridge/handlers/workspace-activate-service.test.js packages/core/dist/remote-bridge/handlers/workspace-session-service.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.js packages/core/dist/remote-bridge/handlers/workflow-step-clear-service.test.js`
- `npm run build --workspace @codeai-hub/core`
- `npm run check:knip`
- `npm run check:links`
- `npm run plan:validate`

## [1.2.353] - 2026-05-24
### Fixed
- **Quality Gates terminal cleanup now handles Core-managed residue.** When Quality Gates integration or repair leaves accepted upstream Application Skeleton managed artifacts, workflow runtime metadata, continuity files, or formatter output dirty, Core now treats those paths as managed terminal residue and commits them before step completion instead of blocking the workflow with a dirty Git prompt.

### Tests
- `node --test packages/core/dist/managed-workflow-orchestration/managed-terminal-dirty-classifier.test.js`
- `npm run build --workspace @codeai-hub/core`
- `npm run plan:validate`

## [1.2.352] - 2026-05-24
### Fixed
- **Clear now rewinds stale `workflow/state.json` last-active data.** After clearing `Diagram Modules` in an app-created workspace that no longer has managed Git metadata, Core now resets `lastActive` to the latest existing upstream artifact instead of leaving it on the removed `diagram_modules/product-parts.index.md` artifact.

### Tests
- `node --import tsx --test packages/core/src/remote-bridge/handlers/workflow-step-clear-service.git-rollback.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm run plan:validate`

## [1.2.351] - 2026-05-24
### Fixed
- **Diagram Modules Clear now removes Core-created managed scaffold.** In app-created workspaces, clearing `Diagram Modules` back to the post-`Virtual Simulation` state now removes managed workflow scaffold such as `.git`, `.husky`, `doc`, `scripts`, root package files, TypeScript configs, `node_modules`, and downstream Product Part scaffold when Core created them for managed development.
- **Application Skeleton draft validation no longer blocks on Markdown prose.** Core keeps hard checks on the JSON contract, paths, tree shape, stack/foundation fields, and lifecycle state, but no longer repair-loops on non-machine-readable wording in `application-skeleton.md`.

### Tests
- `node --import tsx --test packages/core/src/workflow/git-rollback/workflow-git-rollback-facade.test.ts`
- `node --import tsx --test packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-framework-baseline-validator.test.ts packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-validator.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm run plan:validate`

## [1.2.350] - 2026-05-24
### Fixed
- **Managed Clear rollback now ignores scaffold-only stage plan commits.** `Diagram Modules` and `Application Skeleton` rollback boundaries are resolved from real stage output paths, preventing `stage_parent_boundary_missing` from making Clear appear to do nothing.
- **Diagram Modules progress no longer overwrites shared workflow state.** Subturn progress is persisted to `workflow/diagram-modules-progress.json`, while `workflow/state.json` remains the Core-owned last-active state.
- **Application Skeleton managed snapshots refresh after Core materialization.** Core now persists the post-materialization validation decision so Project Manager and restart recovery do not read stale draft state.

### Tests
- `npm exec -- tsx --test packages/core/src/workflow/git-rollback/workflow-git-rollback-facade.test.ts packages/core/src/remote-bridge/handlers/workflow-step-clear-service.git-rollback.test.ts packages/core/src/remote-bridge/handlers/diagram-modules-progress.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `./scripts/check-architecture.sh`
- `npm run plan:validate`

## [1.2.349] - 2026-05-24
### Fixed
- **Application Skeleton materialization now writes the config files it validates.** Core now creates root `tsconfig.json` when the accepted Application Skeleton map declares it in `projectFoundation.configFiles`.
- **Application Skeleton materialized state no longer self-rejects on `tsconfig.json`.** The Core-owned materializer adds root `tsconfig.json` to `materializedPaths` and keeps `projectFoundation.configFiles` aligned with validator expectations.

### Tests
- `node --import tsx --test packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-core-materializer.test.ts`
- `node --import tsx --test packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-validator.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm run plan:validate`

## [1.2.347] - 2026-05-24
### Fixed
- **Workflow Clear now completes cleanup after Git `already_at_boundary`.** Managed Clear no longer treats that Git result as a full rollback; Core continues through fallback cleanup so stale workflow state does not make the action appear to do nothing.
- **Git rollback cleanup removes stale workflow metadata.** `workflow/state.json` and `workflow/undo-ledger.json` are cleaned inside the managed rollback scope before the rollback commit is created.
- **Checkpoint-backed Clear still removes downstream generated artifacts.** After restoring an early-step checkpoint, Core now removes downstream workspace/doc/product-part/managed workflow paths instead of relying on the checkpoint alone.

### Tests
- `node --import tsx --test packages/core/src/remote-bridge/handlers/workflow-step-clear-service.checkpoint-cleanup.test.ts packages/core/src/remote-bridge/handlers/workflow-step-clear-service.git-rollback.test.ts packages/core/src/remote-bridge/handlers/workflow-step-clear-service.undo.test.ts packages/core/src/remote-bridge/handlers/workflow-step-clear-service.test.ts packages/core/src/remote-bridge/handlers/workflow-step-clear-session-cleanup.test.ts`
- `npm run build --workspace packages/core`
- `npm run plan:validate`

## [1.2.346] - 2026-05-24
### Fixed
- **Managed Clear now requires Git rollback for Git-managed stages.** Clearing `Diagram Modules`, `Application Skeleton`, or `Quality Gates` no longer falls back to deleting known paths when a Git repository exists but the stage rollback boundary is missing.
- **Managed Clear preserves tracked state on missing rollback boundaries.** Core now returns an explicit conflict instead of leaving dirty deleted stage artifacts that can later surface as misleading missing-input messages such as `application-skeleton-map.json not found`.

### Tests
- `npx tsx --test packages/core/src/remote-bridge/handlers/workflow-step-clear-service.git-rollback.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm run plan:validate`

## [1.2.345] - 2026-05-24
### Fixed
- **Cluster workflow nodes now render before modules.** Core projects cluster-owned `Workers` and `Integration` operations in the Development Tree snapshot, and Project Manager places them first inside the cluster before module nodes while preserving the existing tree row styling and connector geometry.
- **Development Tree snapshots now include cluster operations.** The client parser keeps `cluster.operations` from the Core-owned snapshot instead of relying on Project Manager-local assumptions.

### Tests
- `npx tsx --test src/client/project-manager/services/workflow-state-client.test.ts src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes-progress.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm run typecheck:webview`
- `npm run build:project-manager`

## [1.2.344] - 2026-05-24
### Fixed
- **Managed Clear resets left-sidebar completion markers.** Core now prunes the cleared workflow stage and all downstream managed stages from the workspace-level managed ledger after `Clear`, so Project Manager receives grey/todo statuses from the Core-owned workflow snapshot instead of stale green `completed` markers.
- **Managed Clear resets downstream stage routing.** `activeStage`, `activePlanPath`, downstream `unlockedStages`, downstream `acceptedCommits`, and `lastAcceptedCommit*` now move back to the first cleared managed stage, keeping the next restart/retry aligned with the cleared scope.

### Tests
- `node --import tsx --test packages/core/src/remote-bridge/handlers/workflow-step-clear-service.test.ts packages/core/src/remote-bridge/handlers/workflow-step-clear-service.git-rollback.test.ts packages/core/src/remote-bridge/handlers/workflow-step-clear-service.undo.test.ts packages/core/src/remote-bridge/handlers/workflow-step-clear-session-cleanup.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm run typecheck:webview`
- `npm run build:webview`
- `npm run build:project-manager`

## [1.2.343] - 2026-05-24
### Fixed
- **Quality Gates size policy is now structured.** Core recognizes the mandatory 500-line source/class gate through explicit `policy.type: "source_size_limit"`, `policy.maxLines: 500`, and `policy.appliesTo: ["source_files", "classes"]` metadata instead of relying on text search through the command object.
- **Quality Gates repair prompts explain the exact size-policy contract.** The `missing_required_size_policy_gate` repair now tells the agent which required hook scope and JSON `policy` shape Core expects.
- **Quality Gates bundled prompt carries the size-policy template.** Draft and integration prompts now show the structured policy snippet so agents do not guess between `size`, `size-policy`, `size_policy`, runner files, or config files.
- **Managed workflow Clear falls back when Git rollback is unavailable.** Clearing `Diagram Modules`, `Application Skeleton`, or `Quality Gates` no longer fails with a 409 when the workspace has no Git repository or no stage boundary; Core falls back to the existing clear/undo cleanup path and still reports the Git rollback reason in the response.

### Tests
- `node --import tsx --test packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-required-size-policy.test.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.test.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-planned-required-validator.test.ts packages/core/src/templates/quality-gates-bundled-templates.test.ts packages/core/src/remote-bridge/handlers/workflow-prompt-pack-service.test.ts`
- `node --import tsx --test packages/core/src/remote-bridge/handlers/workflow-step-clear-service.git-rollback.test.ts packages/core/src/remote-bridge/handlers/workflow-step-clear-service.undo.test.ts packages/core/src/remote-bridge/handlers/workflow-step-clear-session-cleanup.test.ts src/client/project-manager/components/layout/workspace-tree-clear-menu.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm run typecheck:webview`
- `npm run build:webview`
- `npm run build:project-manager`

## [1.2.342] - 2026-05-24
### Fixed
- **Quality Gates planned-required gates stay mandatory in draft contracts.** Core now rejects `plannedRequiredAfterIntegration` gates when their command entries are converted to advisory/deferred, lose `integrationRequired: true`, use the wrong availability, or omit planned integration paths.
- **Quality Gates contract repairs no longer target approved research artifacts.** Draft contract repair prompts now list only `quality-gates.md` and `quality-gates.json`, while preserving `quality-gates-research.md/json` as read-only source of truth.
- **Quality Gates repair diagnostics explain planned-required semantics.** Agents now receive explicit guidance that draft phase means “not executable yet,” not optional or non-blocking.
- **Quality Gates contract prompt forbids advisory downgrades.** The bundled template now states that gates planned for required integration must remain active, integration-required, and traceable to planned paths.

### Tests
- `node --import tsx --test packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-planned-required-validator.test.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-research-first-boundary.test.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.test.ts packages/core/src/templates/quality-gates-bundled-templates.test.ts packages/core/src/remote-bridge/handlers/workflow-prompt-pack-service.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm run build:webview`

## [1.2.341] - 2026-05-24
### Fixed
- **Quality Gates starts with research artifacts.** Core now targets `quality-gates-research.md` and `quality-gates-research.json` in the first Quality Gates provider prompt instead of prematurely targeting `quality-gates.md`.
- **Quality Gates prompt embeds exact artifact templates.** The bundled prompt now includes complete Markdown and JSON skeletons for both the research report and the later baseline contract, including the canonical `# Quality Gates Research` and `# Quality Gates Baseline` headings.
- **Quality Gates repair prompts stay phase-scoped.** Research-first validation failures now ask the agent to repair only research artifacts, preventing contract files from being recreated before user review.
- **Quality Gates stage todo-plan describes research-only drafting.** The managed stage task opened by Core now matches the research-first artifact lifecycle.

### Tests
- `node --import tsx --test packages/core/src/remote-bridge/handlers/workflow-prompt-pack-service.test.ts packages/core/src/templates/quality-gates-bundled-templates.test.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-research-first-boundary.test.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm run build:webview`

## [1.2.340] - 2026-05-24
### Fixed
- **Description Clear restart keeps provider inheritance.** `Virtual Simulation` now inherits the provider from the latest Description continuity chain when `description.primarySession` is absent after Clear/restart.
- **Description session navigation falls back to continuity.** Project Manager can reopen the rerun Description session from Core-owned continuity instead of treating the session as missing.
- **Left sidebar Description projection falls back to continuity.** The workflow tree keeps the Description session node and synchronized artifact/session selection after a Description Clear and rerun.

### Tests
- `node --import tsx --test src/client/project-manager/services/workflow-provider-resolver.test.ts src/client/project-manager/components/shared/stage-confirmation-card.test.ts`
- `npm run typecheck:webview`
- `npm run build:webview`
- `npm run build:project-manager`

## [1.2.339] - 2026-05-24
### Fixed
- **Quality Gates contract heading is Core-validated.** Core now rejects `quality-gates.md` when it does not start with the exact canonical `# Quality Gates Baseline` heading, matching the Project Manager artifact parser.
- **Quality Gates repair prompt uses the exact baseline heading.** Agents are now instructed to repair malformed contract headings to `# Quality Gates Baseline`, not the previously accepted looser `# Quality Gates` form.
- **Diagram Modules Clear resolves materialized development-tree boundaries.** Managed Git rollback now finds `Diagram Modules` stage commits through `.codeai-hub/<workspace>/development_tree`, continuity, and `doc/TODO/stages/development-tree` paths.

### Changed
- **Quality Gates research prioritizes AI-agent-oriented tooling.** The research prompt now asks agents to prioritize tools intended for AI-assisted codebases, including Ultracite-style guardrails.
- **Quality Gates contracts must carry the 500-line source/class policy.** Core validates that integrated Quality Gates include an executable required gate for the architecture size limit.

### Tests
- `node --import tsx --test packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.test.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-research-first-boundary.test.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.test.ts`
- `node --import tsx --test packages/core/src/workflow/git-rollback/workflow-git-rollback-facade.test.ts packages/core/src/remote-bridge/handlers/workflow-step-clear-service.git-rollback.test.ts`
- `npm run build --workspace @codeai-hub/core`

## [1.2.338] - 2026-05-23
### Added
- **Git-backed workflow rollback facade.** Core now has `WorkflowGitRollbackFacade` as the public contract for managed technical stage rollback beginning with `Diagram Modules`.

### Fixed
- **Managed workflow Clear uses Git for tracked workspace state.** Clearing `Diagram Modules`, `Application Skeleton`, or `Quality Gates` now restores tracked files to the pre-stage Git boundary and creates a rollback commit instead of deleting known paths by hand.
- **Clear refuses destructive fallback when Git is unavailable.** If a managed technical stage has no Git repository or no stage boundary commit, Core returns an explicit blocker and preserves files instead of producing an inconsistent workspace/read-model state.

### Tests
- `node --import tsx --test packages/core/src/workflow/git-rollback/workflow-git-rollback-facade.test.ts packages/core/src/remote-bridge/handlers/workflow-step-clear-service.git-rollback.test.ts packages/core/src/remote-bridge/handlers/workflow-step-clear-service.undo.test.ts`
- `npm run build --workspace @codeai-hub/core`

## [1.2.337] - 2026-05-23
### Fixed
- **Quality Gates research markdown heading is Core-validated.** Core now rejects `quality-gates-research.md` when it is missing the canonical `# Quality Gates Research` heading, so Project Manager is no longer the only surface that detects the malformed research artifact.
- **Quality Gates repair prompt explains the heading fix.** The managed repair prompt now tells the agent to start `quality-gates-research.md` with the exact heading before localized prose or sections.

### Tests
- `node --import tsx --test packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-research-first-boundary.test.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.test.ts packages/core/src/remote-bridge/handlers/quality-gates-review-decision-flow.test.ts`
- `npm run build --workspace @codeai-hub/core`

## [1.2.336] - 2026-05-23
### Fixed
- **Workflow undo metadata no longer blocks Diagram Modules acceptance.** Core now classifies workflow checkpoints and the undo ledger as Core-owned runtime metadata in the managed terminal acceptance gate, so the user is not asked to manually handle internal undo files in Git.
- **Technical-stage dirty state ignores undo/checkpoint metadata.** The workflow-state read model now treats the same files as volatile Core metadata, preventing sidebar/progress dirty-state noise after polling or restart.

### Tests
- `node --import tsx --test packages/core/src/managed-workflow-orchestration/managed-terminal-dirty-classifier.test.ts packages/core/src/remote-bridge/handlers/technical-stage-dirty-gate.test.ts packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-review-acceptance.test.ts`
- `npm run build --workspace @codeai-hub/core`

## [1.2.335] - 2026-05-23
### Fixed
- **Description questionnaire opens as an editor immediately after Clear.** Project Manager now bypasses the optimistic Description session guard when Core projects a questionnaire-only Description snapshot, so the preserved `questionnaire.md` opens as the editable restart form without a manual Help/Artifacts refresh.

### Tests
- `node --import tsx --test src/client/project-manager/components/layout/use-main-area-workflow-state.test.ts`
- `npm run typecheck:webview`
- `npm run build:webview`
- `npm run build:project-manager`

## [1.2.334] - 2026-05-23
### Fixed
- **Description read-model is sanitized after Clear.** Core no longer projects stale `Final_Description.md` or deleted session refs when those files were removed by workflow step Clear.
- **Description questionnaire is restored without `description-step.json`.** If Clear leaves only the filled `questionnaire.md`, Core rebuilds the Description snapshot from that file so Project Manager can reopen the editable questionnaire.
- **Project Manager refreshes artifact availability immediately after Clear.** The sidebar and artifact panel now re-probe workflow artifacts as soon as Clear succeeds, avoiding stale Virtual Simulation or Description labels.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `node --test packages/core/dist/workflow/description/description-step-store.test.js packages/core/dist/remote-bridge/handlers/workflow-step-clear-service.undo.test.js packages/core/dist/remote-bridge/handlers/workflow-step-clear-session-cleanup.test.js`
- real-workspace Description projection check for `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4`
- `npm run typecheck:webview`
- `npm run build:webview`
- `npm run build:project-manager`

## [1.2.333] - 2026-05-23
### Fixed
- **Codex provider-native workflow sessions are matched by metadata.** Clear now reads Codex native JSONL `session_meta.payload.id` instead of relying on the rollout file name containing the provider session id.
- **Codex translation-native sessions are cleaned up.** Disposable translation JSONL files under `~/.codeai-hub/providers/codex/home/sessions/**` are removed when their metadata shows `codeai-codex-translation-*` runtime cwd or the translation-only base instruction.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `node --test packages/core/dist/remote-bridge/handlers/workflow-step-clear-session-cleanup.test.js packages/core/dist/remote-bridge/handlers/workflow-step-clear-service.undo.test.js`

## [1.2.332] - 2026-05-23
### Fixed
- **Workflow step Clear removes stale session traces after checkpoint restore.** Clear now collects cleanup targets before restore and deletes them afterward even when checkpoint restore succeeds.
- **Unified session cleanup covers both workspace roots.** Core removes matching history/translation files under both the initiative slug and `sanitizeWorkspaceSlug(workspaceRoot)` session directories.
- **Provider-native session files are removed for cleared steps.** Codex rollout JSONL files and Claude provider-home project JSONL files linked by continuity `providerSessionId` are deleted with the cleared workflow step.
- **Checkpoints capture both user-space session roots.** New workflow step checkpoints include both initiative-slug and workspace-path session roots for exact future restores.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `node --test packages/core/dist/remote-bridge/handlers/workflow-step-clear-service.undo.test.js packages/core/dist/workflow/step-checkpoint/workflow-step-checkpoint-store.test.js`

## [1.2.331] - 2026-05-23
### Added
- **Workflow step checkpoint restore module.** Core now has a dedicated `workflow/step-checkpoint` module with `WorkflowStepCheckpointFacade` as the public contract/facade for creating and restoring restart-stable workflow step checkpoints.
- **Exact rollback scope for workflow stages.** Before the first Core start effect of a workflow stage, Core captures `.codeai-hub/<workspace>`, `doc/TODO/stages`, `product-parts`, and `~/.codeai-hub/sessions/<workspace>`.

### Fixed
- **Description Clear returns to the filled questionnaire state.** Clearing `Description` now restores the checkpoint taken before agent work starts, so Project Manager can render the editable questionnaire/read-model state instead of `Description artifact is not available yet`.
- **Checkpoint restore is the primary stage rollback path.** The mutation journal remains as audit/fallback coverage for uncheckpointed or narrower cleanup, but workflow-stage Clear first restores the Core-owned checkpoint.

### Tests
- `npm run build --workspace=@codeai-hub/core`
- `node --test packages/core/dist/workflow/step-checkpoint/workflow-step-checkpoint-store.test.js`
- `node --test packages/core/dist/remote-bridge/handlers/workflow-step-clear-service.undo.test.js`
- `node --test packages/core/dist/workflow/undo/workflow-mutation-journal-runtime.test.js`
- `node --test packages/core/dist/remote-bridge/handlers/workspace-file-service.test.js`
- `node --import tsx --test src/client/project-manager/services/description-questionnaire-service.test.ts`
- `npm run typecheck:webview`
- `npm run build:webview`
- `npm run build:project-manager`

## [1.2.330] - 2026-05-23
### Added
- **Centralized workflow mutation journal runtime.** Core now wraps durable workflow mutations with before/after snapshots of the stage workspace scope and `~/.codeai-hub/sessions/<workspace>`, derives filesystem/session diffs, and appends restart-safe undo entries automatically.
- **User-space undo entries.** The undo ledger can now resolve entries under `~/.codeai-hub`, allowing Clear to reverse recorded session-history files instead of relying only on continuity fallback cleanup.

### Changed
- **Workflow undo no longer depends only on per-writer path lists.** Workspace-session creation, workspace-file writes, artifact upserts and session message turns are now covered by the mutation journal wrapper.
- **Directory undo is non-recursive.** Created directory entries are removed only when empty, so preserved checkpoints such as `description/questionnaire.md` cannot be deleted by undoing their parent folder.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `node --test packages/core/dist/workflow/undo/workflow-mutation-journal-runtime.test.js`
- `node --test packages/core/dist/remote-bridge/handlers/workspace-file-service.test.js`
- `node --test packages/core/dist/remote-bridge/handlers/workflow-step-clear-service.undo.test.js`
- `node --import tsx --test src/client/project-manager/services/description-questionnaire-service.test.ts`
- `npm run typecheck:webview`
- `npm run build:webview`
- `npm run build:project-manager`

## [1.2.329] - 2026-05-23
### Fixed
- **Workflow step `Clear` now returns Description to an editable questionnaire.** The Description questionnaire is recorded as a preserved undo checkpoint, so clearing the step keeps `questionnaire.md`, removes generated final/draft outputs, and resets Description state back to the pre-submit editor.
- **Workflow file writes now have restart-safe reverse metadata.** Core records `workspace-file-write` operations in `.codeai-hub/<workspace>/workflow/undo-ledger.json` with previous content, allowing Clear to delete newly-created files or restore overwritten files after a Core restart.

### Tests
- `npm run build --workspace=@codeai-hub/core`
- `npx tsx --test packages/core/src/remote-bridge/handlers/workspace-file-service.test.ts packages/core/src/remote-bridge/handlers/workflow-step-clear-service.undo.test.ts packages/core/src/remote-bridge/handlers/workflow-step-clear-service.test.ts packages/core/src/remote-bridge/handlers/http-api-router.artifact-upsert.test.ts`

## [1.2.328] - 2026-05-23
### Added
- **Workflow step `Clear` now uses a persistent Core undo ledger.** Generated workflow artifacts and Development Tree materialization actions are recorded in `.codeai-hub/<workspace>/workflow/undo-ledger.json`, so clear operations can reverse actual Core-created outputs even after Core restarts.

### Fixed
- **Description input questionnaires are preserved during clear.** Legacy workspaces without an undo ledger keep `description/questionnaire.md` while generated Description final/draft outputs and downstream steps are removed.
- **Continuity indexes and user-space session traces are pruned.** Clear now removes matching `continuity/index.json` entries and unified session history/translation files under `~/.codeai-hub/sessions`.

### Tests
- `npm run build --workspace=@codeai-hub/core`
- `npx tsx --test packages/core/src/remote-bridge/handlers/http-api-router.artifact-upsert.test.ts packages/core/src/development-tree/filesystem-structurator/development-tree-filesystem-structurator-facade.test.ts packages/core/src/remote-bridge/handlers/workflow-step-clear-service.test.ts packages/core/src/remote-bridge/handlers/workflow-step-clear-service.undo.test.ts`

## [1.2.327] - 2026-05-23
### Fixed
- **Quality Gates is now a true research-first workflow.** Core accepts the first provider turn only when it contains `quality-gates-research.md` and `quality-gates-research.json`; premature `quality-gates.md/json` contract creation is rejected until the research report is reviewed.
- **Quality Gates research acceptance opens contract drafting, not integration.** After the user accepts the research report, Core sends a separate continuation prompt for the contract artifacts. The normal contract review and integration path starts only after that draft is validated.
- **Project Manager again shows the Quality Gates artifact split.** The artifact header resolves the real `QUALITY GATES BASELINE` tool label and exposes `Research`, `Contract`, and `Help` buttons.
- **The sidebar `Clear` menu opens reliably after the native crash fix.** Right-click now opens the in-app menu from the right-button mouse-down path while preserving destructive confirmation.

### Tests
- `npm run build --workspace=@codeai-hub/core`
- `npx tsx --test packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-research-first-boundary.test.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.test.ts packages/core/src/templates/quality-gates-bundled-templates.test.ts packages/core/src/remote-bridge/handlers/quality-gates-review-decision-flow.test.ts src/client/project-manager/components/layout/stage-artifact-mode.test.ts src/client/project-manager/components/layout/workspace-tree-clear-menu.test.ts`
- `npm run typecheck:webview`
- `npm run build:webview`
- `npm run build:project-manager`

## [1.2.326] - 2026-05-23
### Fixed
- **Project Manager no longer uses a native browser confirmation for sidebar `Clear`.** The workflow step clear action now opens an in-app confirmation panel, avoiding the CEF/macOS native-dialog crash path reported during right-click testing.
- **Sidebar right-click handling suppresses the native context menu earlier.** Clear targets now prevent the browser context-menu event at capture time and on right-button mouse down before rendering the Project Manager menu.

### Tests
- `npm run typecheck:webview`
- `npm run build:webview`
- `npm run build:project-manager`
- `npx tsx --test src/client/project-manager/components/layout/workspace-tree-clear-menu.test.ts`

## [1.2.325] - 2026-05-23
### Changed
- **Rebuilt the workflow step clear release under a fresh version number.** This replacement package keeps the v1.2.324 clear-action behavior and republishes it as v1.2.325 for a clean user retest.

### Tests
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

## [1.2.324] - 2026-05-22
### Added
- **Project Manager sidebar steps now expose a clear action.** Right-clicking a workflow step or Development Tree node opens a context menu with `Clear`, guarded by a destructive confirmation dialog.
- **Core owns workflow step reset.** `POST /api/v1/orchestrator/workflow-step-clear` removes selected-step and downstream artifacts, stage todo folders, Development Tree materialization, continuity data, active session records, and matching user-space unified session files.

### Fixed
- **Workflow steps can be restarted cleanly after generated state is no longer wanted.** Clearing a step removes stale workspace/user-space records so the selected step becomes available for a fresh start.

### Tests
- `npm run build --workspace=@codeai-hub/core`
- `node --test packages/core/dist/remote-bridge/handlers/workflow-step-clear-service.test.js`
- `npm run typecheck:webview`
- `npm run build:webview`
- `npm run build:project-manager`
- `npx tsx --test src/client/project-manager/components/layout/workspace-tree-clear-menu.test.ts src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes-progress.test.ts`

## [1.2.323] - 2026-05-22
### Added
- **Quality Gates now requires a first research artifact.** Core validates `quality-gates-research.md` and `quality-gates-research.json` before the Quality Gates baseline contract can move through the draft review path.
- **Quality Gates prompts include a current-tooling research phase.** The agent must research the detected stack, cite current sources, explain recommended tools by purpose, and keep the final gate contract traceable to the research artifact.
- **Project Manager exposes separate Quality Gates artifacts.** The artifact header now shows `Research`, `Contract`, and `Help` buttons for the Quality Gates step.

### Fixed
- **Quality Gates start cards only offer research-capable providers.** Codex and Claude remain available; Claude receives `WebSearch`, while providers without a clear search capability are not auto-selected for this step.

### Tests
- `npm run build --workspace=@codeai-hub/core`
- `node --test packages/core/dist/templates/quality-gates-bundled-templates.test.js packages/core/dist/managed-workflow-orchestration/quality-gates/quality-gates-validator.test.js`
- `npm run build --workspace=@codeai-hub/claude-module`
- `node --test packages/Claude_Module/dist/sdk/claude-sdk-manager.test.js packages/Claude_Module/dist/diagnostics/claude-native-request-capture-service.test.js`
- `npm run build --workspace=@codeai-hub/codex-app-server-module`
- `node --test packages/Codex_AppServer_Module/dist/app-server/process/codex-app-server-process.test.js packages/Codex_AppServer_Module/dist/diagnostics/codex-native-request-capture-applied-envelope.test.js`
- `npm run build:project-manager`
- `npm run typecheck:webview`
- `node --test --import tsx src/client/project-manager/services/workflow-provider-resolver.test.ts src/client/project-manager/components/shared/stage-confirmation-card.test.ts src/client/project-manager/components/layout/stage-artifact-mode.test.ts`

## [1.2.322] - 2026-05-22
### Added
- **Diagram Modules declares Development Tree leadership.** Core now validates `leadProductPartId` and `productPartLeadershipOrder` in the Diagram Modules index artifact and preserves that order in Development Tree snapshots.
- **Lead Product Part Orchestration is materialized and projected.** Core creates `lead-product-part-orchestration/` folders under the lead Product Part in both `.codeai-hub/.../development_tree/materialized` and `doc/TODO/stages/development-tree`, then exposes `Contract Graph`, `Cross-Part Contracts`, `Shared Interfaces`, and `Execution Waves` operation nodes to Project Manager.
- **Development Tree agents receive research artifact contracts.** First prompts now include a Core-owned `AgentResearch.draft.json` contract for any external research, tool/framework recommendation, quality gate recommendation, or runtime-practice recommendation.

### Fixed
- **Non-lead Development Tree nodes stay locked before Contract Graph freeze.** Core rejects direct node starts until the lead Product Part orchestration path is selected, and Project Manager shows the locked reason instead of offering a normal start flow.
- **Project Manager parses leadership metadata and operation locks.** The left sidebar renders lead orchestration children, preserves Core snapshot order, and carries `lockedReason` lifecycle data into node status.

### Tests
- `npm run build --workspace=@codeai-hub/core`
- `node --test packages/core/dist/development-tree/development-tree-state-facade-metadata.test.js packages/core/dist/development-tree/filesystem-structurator/development-tree-filesystem-path-planner.test.js packages/core/dist/remote-bridge/remote-bridge-development-tree-node-command-router.test.js packages/core/dist/development-tree/node-bootstrap/node-agent-session-bootstrapper.test.js`
- `npm run typecheck:webview`
- `npm run build:project-manager`
- `npm run plan:validate`
- `npm run check:links`
- `npm run check:architecture`

## [1.2.321] - 2026-05-21
### Fixed
- **VSIX packaging excludes local Swift native-helper build outputs.** The extension package no longer includes `native/apple-*-helper/.build`, Swift `ModuleCache`, or `dSYM` artefacts, restoring the lightweight installer/distributor package boundary.
- **Release builds guard the VSIX package surface.** `build-release.sh` now fails if native build-cache artefacts leak into the packaged extension.

### Tests
- `npx vsce ls | rg '^(native/|.*\\.build/|.*ModuleCache/|.*\\.dSYM/)' || true`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

## [1.2.320] - 2026-05-21
### Fixed
- **Diagram Modules mirrors the accepted Development Tree into TODO stage folders.** Core now creates `doc/TODO/stages/development-tree/product-parts/...` from the same accepted Product Part / Cluster / Module structure used for `.codeai-hub/<workspace>/development_tree/materialized/...`.
- **The left sidebar reveals Development Tree workflow nodes by default.** Project Manager auto-expands the first Product Part and Cluster when Core snapshot data appears, making Module / Facade Specification, Implementation, Workers, and Integration visible without manual tree drilling.
- **Clusters receive operation artifact folders.** Cluster roots now get `workers/` and `integration/` folders alongside `modules/` in both materialized roots, matching the cluster facade/contract workflow.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `node --test packages/core/dist/development-tree/filesystem-structurator/development-tree-filesystem-path-planner.test.js packages/core/dist/development-tree/filesystem-structurator/development-tree-filesystem-structurator-facade.test.js`
- `npm run typecheck:webview`
- `npm run build:project-manager`
- `npx tsx --test src/client/project-manager/components/layout/workspace-tree-development-expansion.test.ts src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes-progress.test.ts src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.test.ts`

## [1.2.319] - 2026-05-21
### Added
- **Diagram Modules materializes a Core-owned Development Tree artifact workspace.** Accepted Product Parts, Clusters, Modules, and module operations now map to `.codeai-hub/<workspace>/development_tree/materialized/...` for future agent artifacts.
- **Development Tree snapshots expose operation nodes.** Core now publishes artifact and code workspace paths plus Module/Facade Specification, Implementation, Workers, and Integration operations for each module.
- **Project Manager renders operation-level workflow nodes.** The left Development Tree sidebar shows Core-owned operation children under modules and routes operation selections into the existing Sessions/Artifacts surfaces.

### Changed
- **Project Manager remains projection-only.** Sidebar parsing and rendering consume Core-owned snapshots instead of scanning workspace folders or owning Diagram Modules parser truth.
- **Application Skeleton remains the production code mirror owner.** `product-parts/...` paths are attached only from accepted/materialized Application Skeleton data, while Diagram Modules owns artifact workspace materialization.

### Tests
- `npm run build --workspace @codeai-hub/core`
- `npm run typecheck:webview`
- `npm run build:project-manager`
- `node --test packages/core/dist/development-tree/filesystem-structurator/development-tree-filesystem-path-planner.test.js packages/core/dist/development-tree/filesystem-structurator/development-tree-filesystem-structurator-facade.test.js packages/core/dist/development-tree/development-tree-state-facade-metadata.test.js packages/core/dist/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.test.js packages/core/dist/remote-bridge/handlers/development-tree-snapshot.test.js`

## [1.2.318] - 2026-05-19
### Changed
- **Claude-Kimi is replaced by the GLM/OpenCode surface.** Active provider surfaces now expose native `Kimi` plus the GLM surface that later evolved into `OpenCode`; the archived `kimiClaudeCode` experiment is no longer an active Settings/card/status/capture option.
- **The GLM/OpenCode surface uses isolated config and provider home.** Runtime state lives under `~/.codeai-hub/providers/opencode/home`, and the user API key is read from `~/.codeai-hub/providers/opencode/config.json` or supported env vars without touching the real Claude home.
- **The GLM/OpenCode surface reuses the workflow runtime profile.** The provider keeps CodeAI-owned workflow system instructions, `settingSources: []`, and the compact `Read` / `Write` / `Edit` tool profile.

### Fixed
- **Native Kimi model defaults remain native Kimi.** Capture Workbench and session model identity use `kimi-for-coding` for Kimi and `glm-5.1` for the legacy GLM surface.
- **Missing GLM API key fails explicitly.** The preflight returns `api_key_missing` instead of leaving a session in an ambiguous startup state.

### Tests
- `npm test --workspace packages/Claude_Module`
- `npm test --workspace packages/core`
- `npm run build --workspace packages/Claude_Module`
- `npm run build --workspace packages/core`
- `npm run typecheck:webview`
- `npm run build:webview`

## [1.2.317] - 2026-05-19
### Fixed
- **Kimi provider variants are now explicit in Settings.** Settings shows separate `Kimi` and `Claude-Kimi` tabs instead of placing the Claude Agent SDK-compatible runtime inside the native Kimi section.
- **Workflow start cards show both Kimi providers.** Description, managed step start cards, Development Tree start cards, and Capture Workbench can distinguish native `Kimi` from `Claude-Kimi`.
- **Kimi model labels now match the selected runtime.** Native Kimi keeps `Kimi 2.6 / Kimi Code`, while Claude-Kimi shows `Kimi 2.6 / Claude-Kimi`.

### Tests
- `npm run typecheck:webview`
- `npm run build:webview`
- `npx tsx --test src/client/project-manager/services/workflow-provider-resolver.test.ts src/client/project-manager/services/workflow-step-start-service.settings-barrier.test.ts src/client/project-manager/components/layout/use-step-provider-resolver.test.ts packages/core/src/provider-network-capture/native-request-capture-facade.test.ts`

## [1.2.316] - 2026-05-19
### Added
- **Kimi-Claude-Code is available as a separate comparison provider.** Users can select `Kimi-Claude-Code` to run Kimi 2.6 through the Claude Code-compatible runtime while native `Kimi` remains the Wire-based provider.
- **Kimi-Claude-Code has isolated runtime/auth state.** The runtime uses `~/.codeai-hub/providers/kimi-claude-code/home`, maps Kimi's Anthropic-compatible endpoint through `ANTHROPIC_BASE_URL=https://api.kimi.com/coding`, and resolves the Kimi API key from explicit env or `~/.kimi/config.toml` without logging or persisting the secret.
- **Kimi-Claude-Code is wired through product surfaces.** Settings, Description/start cards, Development Tree cards, provider inheritance, Session UI identity, and Capture Workbench now recognize `kimiClaudeCode`.

### Changed
- **Claude and native Kimi boundaries are explicit.** Claude remains subscription/OAuth based, native Kimi remains Wire based, and Kimi-Claude-Code is documented as a third runtime condition.
- **Kimi-Claude-Code telemetry is honest.** Usage/context rows render as unavailable instead of reusing Claude telemetry or unproven native Kimi usage data.

### Tests
- `npm test --workspace packages/Claude_Module`
- `npm test --workspace packages/core`
- `node --test packages/core/dist/provider-registry/provider-descriptor-factory.test.js packages/core/dist/config/provider-settings-snapshot.test.js packages/core/dist/provider-network-capture/native-request-capture-reasoning-override.test.js packages/core/dist/provider-network-capture/native-request-capture-facade.test.js`
- `node --test packages/Claude_Module/dist/sdk/claude-sdk-manager.test.js packages/Claude_Module/dist/diagnostics/claude-native-request-capture-service.test.js`
- `npm run build --workspace packages/Claude_Module`
- `npm run build --workspace packages/core`
- `npm run build --workspace packages/Kimi_Module`
- `npm run build:webview`
- `npm run typecheck:webview`
- Live Kimi-Claude-Code SDK smoke: returned `KIMI_CLAUDE_CODE_LIVE_SMOKE_OK`.
- Live native Kimi Wire smoke: returned `KIMI_NATIVE_LIVE_SMOKE_OK`.

## [1.2.315] - 2026-05-19
### Added
- **Kimi usage limits now use live Kimi coding telemetry.** The Kimi adapter reads the existing `~/.kimi/config.toml` `providers.kimi-for-coding.api_key`, calls `https://api.kimi.com/coding/v1/usages`, and broadcasts `5h` plus `Weekly` usage rows without logging or persisting the secret.
- **Kimi context-window telemetry now reaches Session UI.** Kimi Wire `StatusUpdate.context_tokens`, `max_context_tokens`, and `context_usage` normalize into provider-neutral `tokenUsage` snapshots for the status panel.

### Fixed
- **Session context percentage is explicitly remaining context.** The status chip tooltip now distinguishes used tokens, context limit, and remaining percentage.
- **Kimi usage rows use provider-specific labels.** The Session ID usage bar renders `5h` and `Weekly` for live Kimi telemetry and degrades to unavailable labels instead of fake percentages when telemetry is missing.

### Tests
- `npx tsx --test packages/Kimi_Module/src/messaging/kimi-event-normalizer.test.ts packages/Kimi_Module/src/provider/kimi-usage-limits-reader.test.ts src/client/ui/src/session/status-panel.test.tsx src/client/ui/src/session/session-id-bar.test.tsx src/client/project-manager/components/sessions/token-usage-stream.test.ts packages/core/src/provider-usage-limits/provider-usage-limits-stream-event.test.ts`
- `npm run build --workspace @codeai-hub/kimi-module`
- `npm run build --workspace @codeai-hub/core`
- `npm run build:webview`
- `npm run typecheck:webview`
- Live Kimi usage probe with local authorized config: returned `5h=9%`, `Weekly=13%`.

## [1.2.314] - 2026-05-19
### Fixed
- **Kimi now remains selected across managed workflow start cards.** Provider inheritance recognizes `kimiCode` from Description primary sessions and upstream continuity segments, so the next step no longer falls back to Claude when Kimi was the previous provider.

### Tests
- `npx tsx --test src/client/project-manager/services/workflow-provider-resolver.test.ts`
- `npm run typecheck:webview`
- `npm run build:webview`

## [1.2.313] - 2026-05-19
### Fixed
- **Kimi progress summaries now have a thinking-block cadence.** The managed profile treats substantial hidden reasoning paragraphs, draft chunks, and planning blocks as internal thinking blocks and asks Kimi to publish an ordinary visible assistant summary after every 5-6 such blocks without a visible message.
- **Kimi long-turn progress is less dependent on visible reasoning.** Progress summaries must compress what was reviewed, what artifact area was drafted, what boundary/assumption/risk was found, and what happens next before Kimi continues.

### Tests
- `npm run build --workspace=@codeai-hub/kimi-module`

## [1.2.312] - 2026-05-19
### Fixed
- **Kimi now starts with a CodeAI-owned managed agent profile.** Runtime startup materializes `codeai-managed-agent/agent.yaml`, passes it through `--agent-file`, and isolates MCP/skills with CodeAI-owned empty config paths.
- **Kimi managed prompts no longer include AGENTS/project instruction injection.** CodeAI Core and the first Core-built user prompt remain the workflow authority; provider-global project instructions, skills, MCP resources, and unrelated repository implementation source are excluded from managed Kimi prompt truth.
- **Kimi managed tools are narrowed to file operations.** The profile allowlist includes read/media read/glob/grep/write/str-replace tools and explicitly keeps shell, web, subagents, background tasks, MCP tools, provider skills, and Git operations out of the managed runtime surface.
- **Kimi is instructed to emit visible progress updates during long managed work.** The profile mirrors the Codex/GPT-5.5 UX target by requiring ordinary assistant progress messages, not reasoning-only text, roughly every 30 seconds while work continues.

### Documentation
- Updated the Kimi module SSOT with the current managed profile runtime contract, replacement semantics, tool restrictions, and remaining reasoning-control limits.

### Tests
- `npm run build --workspace=@codeai-hub/kimi-module`
- `npm run test --workspace=@codeai-hub/kimi-module`
- Live Kimi Wire smoke with the managed agent profile and authorized user config.

## [1.2.311] - 2026-05-19
### Fixed
- **Kimi reasoning display now matches the current provider UX.** Kimi `think` content respects the Kimi `Reasoning in dialog` setting, renders in an expanded thinking bubble instead of the retired collapsed panel, and streams bounded reasoning chunks before long turns finish when Kimi Wire provides intermediate thinking content.
- **Kimi settings and Core visibility policy are wired end to end.** Kimi now persists `thinkingDisplaySyncEnabled`, Project Manager settings update that value, Core applies it in turn config and translation visibility, and the webview bundle includes the Kimi settings mapping.

### Documentation
- Documented Kimi's provider-native agent control capabilities: `--agent-file` system prompt replacement, explicit tool allowlists, MCP isolation, skills directories, hooks, and recommended future managed profiles.

### Tests
- `npm run build --workspace=@codeai-hub/kimi-module`
- `npm run test --workspace=@codeai-hub/kimi-module`
- `npm run build --workspace=@codeai-hub/core`
- `npm run build:webview`
- `npm run typecheck:webview`

## [1.2.310] - 2026-05-18
### Fixed
- **Kimi review gates now unlock the user input panel after provider completion.** Kimi `TurnEnd` now normalizes to Core-compatible `turn_completed` with `postTurnTokenUsageUnavailable=true`, so Core resolves post-turn continuity arbitration as no-rollover and returns the runtime session to `idle` after the `managed-workflow-user-review` card appears.

### Tests
- `npm run plan:validate`
- `npm run build --workspace=@codeai-hub/kimi-module`
- `npm run test --workspace=@codeai-hub/kimi-module`
- `npm run build --workspace=@codeai-hub/core`
- `./scripts/check-architecture.sh`

## [1.2.309] - 2026-05-18
### Fixed
- **Installed Kimi sessions now apply the Core-provided workspace before Wire startup.** When Core creates a Kimi session with `createSession(workspacePath)`, the adapter rebuilds its Wire runtime config before the first process starts, so `--work-dir` and process `cwd` use the actual project workspace instead of the early Core launcher directory.
- **Kimi workspace override handling is isolated in a micro-class.** The adapter delegates override decisions to `KimiWorkspaceOverrideState`, keeping the facade under the architecture line limit while preserving a single public provider entrypoint.

### Tests
- `npm run build --workspace=@codeai-hub/kimi-module`
- `npm run test --workspace=@codeai-hub/kimi-module`
- `./scripts/check-architecture.sh`
- Source-runtime workspace override smoke: adapter initialized with a wrong workspace and rebuilt Kimi CLI args to `--work-dir /Users/oleksandroliinyk/VSCODE/CodeAI-Hub kimi`.
- Source-runtime Kimi turn smoke after workspace override: emitted `turn_started`, aggregated `thinking`, aggregated `assistant`, then `turn_completed`.

## [1.2.308] - 2026-05-18
### Fixed
- **Kimi responses now appear in the dialog history.** Kimi Wire `ContentPart` records are normalized into Core-compatible root `assistant.content` and `thinking.content` events instead of ignored `assistant_delta` events.
- **Kimi streaming chunks are aggregated per turn.** The adapter buffers Kimi `think` and `text` chunks and flushes one thinking message and one assistant message before `turn_completed`, preventing token-sized dialog bubbles while preserving Core message persistence order.
- **Managed Kimi turns run in the intended workspace.** Kimi Wire startup now includes `--work-dir <workspace>` and uses protocol-compatible approval response literals, so artifact-writing managed workflow prompts no longer run relative to `/`.

### Tests
- `npm run build --workspace=@codeai-hub/kimi-module`
- `npm run test --workspace=@codeai-hub/kimi-module`
- `npm run check:knip`
- Live Kimi Wire smoke: a short prompt emitted one aggregated `thinking`, one aggregated `assistant`, then `turn_completed`.

## [1.2.307] - 2026-05-18
### Fixed
- **Kimi sessions bind to Core session shells correctly.** The Kimi provider facade now implements the required `ProviderAdapter.subscribe(...)` method, preventing installed Kimi sessions from closing before the first prompt is displayed or dispatched.

### Tests
- `npm run build --workspace=@codeai-hub/kimi-module`
- `npm run test --workspace=@codeai-hub/kimi-module`
- Restricted-PATH Kimi runtime smoke: adapter resolved `/Users/oleksandroliinyk/.local/bin/kimi`, created a `kimi:*` session, subscribed through the Core-compatible `subscribe(...)` method, and emitted lifecycle events through `turn_completed`.

## [1.2.306] - 2026-05-18
### Fixed
- **Kimi starts correctly from the installed Core runtime.** The Kimi module now resolves the user-local CLI from `KIMI_CLI_PATH`, `~/.local/bin/kimi`, Homebrew locations, or the inherited `PATH`, so launcher-managed Core no longer fails when its PATH does not include the user's shell bins.
- **Kimi Wire requests use protocol-compatible ids.** JSON-RPC request ids are now strings, preventing Kimi Wire from returning `Invalid request` with `id:null` and leaving `initialize`/session startup pending.

### Tests
- `npm run build --workspace=@codeai-hub/kimi-module`
- `npm run test --workspace=@codeai-hub/kimi-module`
- Restricted-PATH Kimi runtime smoke: adapter resolved `/Users/oleksandroliinyk/.local/bin/kimi`, `createSession()` returned `kimi:*`, and a short prompt emitted lifecycle events through `turn_completed`.

## [1.2.305] - 2026-05-18
### Added
- **Kimi Code / Kimi 2.6 is now a first-class provider module.** The new `packages/Kimi_Module` exposes a `KimiProviderAdapter` facade over `kimi --wire`, uses `KIMI_SHARE_DIR=~/.codeai-hub/providers/kimi/home`, and references the authenticated `~/.kimi/config.toml` without writing CodeAI runtime state into the user Kimi home.
- **Kimi appears across the main provider surfaces.** Settings, Description submit provider selection, workflow start/fix cards, provider theme colors, and Session UI status/model display all understand `kimiCode` with default model `kimi-for-coding`.
- **Kimi release packaging is wired end to end.** `build-all.sh`, `build-core.sh`, `build-release.sh`, provider manifests, runtime validation, and VSIX exclusions now include `kimi-module-<version>.tar.bz2`.

### Tests
- `npm run build --workspace=@codeai-hub/kimi-module`
- `npm run test --workspace=@codeai-hub/kimi-module`
- `npm run build --workspace=@codeai-hub/core`
- `npm run build:webview`
- `npm run typecheck:webview`
- `bash -n scripts/build-kimi-module.sh`
- `bash -n scripts/build-all.sh`
- `bash -n scripts/build-release.sh`

## [1.2.304] - 2026-05-18
### Fixed
- **Application Skeleton final acceptance now navigates to Quality Gates.** After the user presses `Подтверждаю` on the final Application Skeleton review card, Core emits `workflow:stage:activate` for `quality_gates`, and Project Manager routes it through the existing `pm:stage:activated` path so the visible card moves to `Quality Gates Baseline`.
- **The stale Application Skeleton completion message is no longer shown after final acceptance.** Final acceptance records the Core-managed stage boundary and activates the next technical stage instead of appending the old `managed-workflow-complete` handoff.

### Tests
- `npx tsc --noEmit --pretty false -p packages/core/tsconfig.json`
- `npm run typecheck:webview`
- `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts src/client/project-manager/components/layout/workflow-navigation.test.ts`

## [1.2.303] - 2026-05-18
### Fixed
- **Application Skeleton now opens a final post-materialization review gate.** After Core validates and commits materialization, it sends the `managed-workflow-user-review` card with the inline `Подтверждаю` action instead of publishing `managed-workflow-complete`.
- **Quality Gates stays locked until explicit final acceptance.** The Application Skeleton completed marker, persistent return stream, and `quality_gates` unlock now happen only after the user confirms the final review card.
- **Final Application Skeleton corrections stay managed by Core.** User feedback at the post-materialization gate is routed as a materialized-scope revision prompt, revalidated, committed, and then returned to the same final review gate.

### Tests
- `npx tsc --noEmit --pretty false -p packages/core/tsconfig.json`
- `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller.test.ts`

## [1.2.302] - 2026-05-18
### Fixed
- **Description and Virtual Simulation now show the post-turn Core review card again.** After the provider finishes and asks follow-up questions, Core appends the `managed-workflow-user-review` system message with the inline `Подтверждаю` button.
- **Preliminary acceptance is gated and exact.** Startup prompts that mention `подтверждаю` still go to the provider; Core consumes only a short explicit confirmation while its preliminary review gate is already open, so edits or answers containing the word continue to reach the agent.

### Tests
- `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.preliminary.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-preliminary-routing.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts src/client/ui/src/session/input-play-stop-button.description-runtime.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm run typecheck:webview`
- `npm run build:webview`
- `npm run build:project-manager`

## [1.2.301] - 2026-05-18
### Fixed
- **Description and Virtual Simulation startup prompts now reach the provider even when they mention `подтверждаю`.** Core no longer runs provider-direct preliminary stages through the managed review acceptance classifier, so the initial complex prompt is not consumed as a false user confirmation.
- **Preliminary steps stay separate from managed technical orchestration.** The old preliminary handoff hook was removed; Diagram Modules and later managed stages keep their Core-owned `Подтверждаю` acceptance flow, while Description and Virtual Simulation start as direct provider work.

### Tests
- `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-preliminary-routing.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.preliminary.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts src/client/ui/src/session/input-play-stop-button.description-runtime.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm run typecheck:webview`
- `npm run build:webview`
- `npm run build:project-manager`

## [1.2.300] - 2026-05-18
### Fixed
- **Description and Virtual Simulation no longer show a premature Core completion card at session start.** Core suppresses the preliminary review handoff for these provider-direct steps even when canonical artifacts already exist on disk, so the agent starts normally after the initial prompt.
- **Managed review acceptance remains scoped to managed technical stages.** Diagram Modules and later managed review stages keep the inline `Подтверждаю` flow without leaking the same completion card into Description or Virtual Simulation startup.

### Tests
- `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.preliminary.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts src/client/ui/src/session/input-play-stop-button.description-runtime.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm run typecheck:webview`
- `npm run build:webview`
- `npm run build:project-manager`

## [1.2.299] - 2026-05-18
### Changed
- **Description and Virtual Simulation now use the same Core review confirmation handoff as managed technical stages.** When either step has a final artifact and the next step is available, the Session UI renders the Core-owned `Подтверждаю` button on the system card.
- **Confirming a ready step opens the next step card immediately.** The confirmation path accepts the current step and activates the next workflow node so the user can continue from the next-step card without extra navigation.
- **The next-step card is cleaner and model selection is wider.** The obsolete Managed Workflow Orchestration preview block is gone, and the model selector popup expands so full model names fit horizontally.

### Tests
- `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.preliminary.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts src/client/ui/src/session/input-play-stop-button.description-runtime.test.ts src/client/project-manager/components/shared/stage-confirmation-card.test.ts`
- `npm run typecheck:webview`
- `npm run build --workspace @codeai-hub/core`
- `npm run build:project-manager`
- `npm run build:webview`

## [1.2.298] - 2026-05-17
### Changed
- **Project Manager main area keeps a matching edge gutter.** The session/artifact working area now reserves the same unhighlighted 8px bottom/right breathing room as the internal panel rhythm, so session status controls and Settings footer buttons do not touch the outer PM edge.

### Tests
- `npm run build:project-manager`
- `npm run typecheck:webview`

## [1.2.297] - 2026-05-17
### Changed
- **Project Manager Settings moved into the sidebar.** The `Open Settings` action now sits at the bottom of the left sidebar below the workflow trees and still opens the existing in-shell Settings takeover in the right panel.
- **Project Manager footer removed.** The bottom footer/status bar and `Workflow Tree MVP` label are gone, allowing the session and artifact panes to use the reclaimed vertical space.

### Tests
- `npx tsx --test src/client/project-manager/components/layout/workflow-navigation.test.ts`
- `npm run typecheck:webview`
- `npm run build:project-manager`
- `npm run build:webview`

## [1.2.296] - 2026-05-17
### Changed
- **Managed review handoff cards now use an inline confirmation button.** Core review messages for managed stages no longer instruct the user to type `подтверждаю`; the Session UI renders a `Подтверждаю` button on the same system card and sends the existing Core acceptance intent.
- **Managed acceptance authority stays in Core.** The button path reuses the existing review decision flow, so Diagram Modules still reaches terminal `User Return And Revisions`, while Application Skeleton and Quality Gates advance through their Core-owned next phases.

### Tests
- `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts`
- `npx tsx --test packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-review-acceptance.test.ts`
- `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts`
- `npx tsx --test src/client/project-manager/components/sessions/project-manager-dialog-session-view-helpers.test.ts`
- `npm run typecheck:webview`
- `npm run build:webview`

## [1.2.295] - 2026-05-17
### Fixed
- **Diagram Modules Product Part rows now count resolved visible module cards.** Automatic Product Part columns reject rows where adjacent Clusters plus standalone Modules would render more than three horizontal module cards, so standalone Modules wrap instead of appearing as a fourth card on the right.

### Tests
- `npx tsx --test src/client/project-manager/components/diagram-editor/diagram-editor-layout-params.test.ts`
- `npm run typecheck:webview`
- `npm run build:webview`

## [1.2.294] - 2026-05-17
### Fixed
- **Diagram Modules Cluster boundaries now stay tight to their module grid.** Long Cluster titles or purpose text wrap inside the compact module-grid width instead of inflating the dashed Cluster container and leaving excessive right-side empty space.

### Tests
- `npx tsx --test src/client/project-manager/components/diagram-editor/diagram-editor-ownership-renderer.test.tsx`
- `npx tsx --test src/client/project-manager/components/diagram-editor/diagram-editor-layout-params.test.ts`
- `npm run typecheck:webview`
- `npm run build:webview`

## [1.2.293] - 2026-05-17
### Changed
- **Rebuilt the Diagram Modules compact layout release package.** This release republishes the current accepted compact visual layout state with fresh provider, core, launcher, webview, Project Manager, and VSIX artifacts.

### Tests
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

## [1.2.292] - 2026-05-17
### Fixed
- **Single-cluster Diagram Modules layouts no longer stretch across the viewport.** Cluster cards now size to occupied content, module tracks use compact card bounds, and free horizontal space is no longer distributed into huge gaps between module cards.
- **Diagram Modules auto-fit supports narrower Project Manager panels.** The visual graph can scale further down before horizontal scrolling, so compact docked and detached windows keep the graph inside the visible area more reliably.

### Tests
- `npx tsx --test src/client/project-manager/components/diagram-editor/diagram-editor-ownership-renderer.test.tsx`
- `npx tsx --test src/client/project-manager/components/diagram-editor/diagram-editor-layout-params.test.ts`
- `npm run typecheck:webview`
- `npm run build:webview`

## [1.2.291] - 2026-05-17
### Fixed
- **Diagram Modules auto layout now respects the visible row budget.** Automatic layout caps one horizontal Product Part row to three actual module cards across adjacent clusters and standalone modules, while preserving explicit user sidecar overrides.
- **Product Part aspect-ratio selection is visible in auto layout.** `targetAspectRatio` now influences automatic column selection, including square layouts that can choose a more vertical one-column composition.
- **Detached Diagram Modules windows live-refresh semantic updates.** The detached popup subscribes to Core-owned workflow-state changes and reloads the graph when later Product Parts materialize, without requiring the user to close and detach again.

### Tests
- `npx tsx --test src/client/project-manager/components/diagram-editor/diagram-editor-layout-params.test.ts`
- `npx tsx --test src/client/project-manager/components/diagram-editor/detached-diagram-view.test.ts`
- `npm run typecheck:webview`
- `npm run build:webview`

## [1.2.290] - 2026-05-17
### Fixed
- **Quality Gates completion now requires artifact/runtime consistency.** Core rejects integrated Quality Gates artifacts when required gates remain `not_integrated` in JSON or Markdown, when required package scripts or hooks are missing, or when declared integrated paths do not exist in the workspace.
- **Managed workflow return tests now cover the stricter Quality Gates contract.** The persistent return fixture exercises executable Quality Gates wiring and keeps Application Skeleton test scaffolds inside managed or ignored paths.

### Tests
- `npx tsx --test packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.test.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts`
- `npm exec -- ultracite check packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-consistency-validator.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts`
- `npm run build --workspace=@codeai-hub/core`
- `npm run typecheck:webview`

## [1.2.289] - 2026-05-17
### Fixed
- **Terminal completion now cleans Core metadata residue before opening persistent user return.** Core auto-commits classified metadata such as continuity chains, workflow state, stage ledgers, and non-semantic step state while still blocking unclassified files.
- **Local runtime timer state no longer dirties managed Git.** Terminal cleanup ensures `.codeai-hub/state/` is ignored, and Application Skeleton environment checks now require that local runtime state boundary in generated workspaces.

### Tests
- `npx tsx --test packages/core/src/managed-workflow-orchestration/managed-terminal-dirty-classifier.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-environment-readiness-audit.test.ts packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-review-acceptance.test.ts packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller.test.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.test.ts`
- `npm run build --workspace=@codeai-hub/core`
- `npm run typecheck:webview`

## [1.2.288] - 2026-05-17
### Fixed
- **Diagram Modules completion now saves generated flow sidecars.** Managed Git commits stage dot-directory sidecars such as `.codeai-hub/<workspace>/diagram_modules/module-map.flow.json` without Git exclude pathspecs, so the standard Module Graph layout file is committed automatically.
- **Terminal dirty-tree errors no longer produce empty file lists.** If classified generated files fail to auto-save after retries, the user sees a clear retry message instead of an empty `Files:` block or a manual commit choice for standard Core-generated files.

### Tests
- `npx tsx --test packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.test.ts packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-review-acceptance.test.ts packages/core/src/managed-workflow-orchestration/managed-terminal-dirty-classifier.test.ts packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller.test.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.test.ts`
- `npm run build --workspace=@codeai-hub/core`
- `npm run typecheck:webview`

## [1.2.287] - 2026-05-17
### Fixed
- **Description and Virtual Simulation completion markers now finish during retest.** If either direct stage was already yellow and its final artifact exists, filesystem hydration promotes it to green when the next step becomes available.
- **Diagram Modules terminal cleanup now accepts generated flow sidecars robustly.** `.codeai-hub/<workspace>/diagram_modules/module-map.flow.json` is treated as stage-owned output even when the runtime has to recover the workspace slug.
- **Dirty Git blockers now tell the user what to do.** If truly unknown files remain, the message presents clear actions instead of Core/classifier internals.

### Tests
- `npx tsx --test packages/core/src/remote-bridge/handlers/workflow-state-filesystem-hydration.test.ts packages/core/src/managed-workflow-orchestration/managed-terminal-dirty-classifier.test.ts packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-review-acceptance.test.ts packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller.test.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.test.ts packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts packages/core/src/remote-bridge/handlers/workflow-state-service-managed-state.test.ts src/client/project-manager/components/layout/workspace-tree-model.test.ts`
- `npm run build --workspace=@codeai-hub/core`
- `npm run typecheck:webview`

## [1.2.286] - 2026-05-17
### Fixed
- **Managed trunk markers are now Core-owned and deterministic.** Project Manager renders gray/yellow/green only from Core workflow-state and no longer promotes stages to green from artifacts, sidecars, `reviewReady`, or local parser success.
- **Managed stages now finish through a clean terminal Git boundary.** Diagram Modules, Application Skeleton, and Quality Gates run a terminal dirty-tree checkpoint before publishing green completion; Core commits classified managed residue and blocks unclassified files.
- **Marker state survives Core and Project Manager restart.** Yellow markers recover from persisted continuity chains, and green managed markers recover from the managed workspace `completedStages` ledger.

### Tests
- `npx tsx --test packages/core/src/managed-workflow-orchestration/managed-terminal-dirty-classifier.test.ts packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-review-acceptance.test.ts packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller.test.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.test.ts packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts packages/core/src/remote-bridge/handlers/workflow-state-service-managed-state.test.ts src/client/project-manager/components/layout/workspace-tree-model.test.ts`
- `npm run build --workspace=@codeai-hub/core`
- `npm run typecheck:webview`

## [1.2.285] - 2026-05-16
### Fixed
- **Quality Gates completion marker now matches the other managed stages.** The persistent `User Return And Revisions` synthetic Git Commit line is created as `DONE` with its sentinel hash, so a completed Quality Gates stage does not stay red after integration succeeds.

### Tests
- `npx ultracite check packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-model.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.test.ts`
- `npx tsx --test packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.test.ts`
- `npm run build --workspace @codeai-hub/core`

## [1.2.284] - 2026-05-16
### Fixed
- **Diagram Modules confirmation is now Core-intercepted.** When the stage is in `User-Led Review`, user `подтверждаю` is accepted by Core, is not forwarded to the agent, and opens the persistent `User Return And Revisions` stream.
- **Diagram Modules completion unlocks the next managed stage.** The review acceptance path marks Diagram Modules complete, updates the workspace plan to Application Skeleton, and emits the stable Core completion message for future user revisions.

### Tests
- `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-diagram-review-actions.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts`
- `npm run build --workspace @codeai-hub/core`

## [1.2.283] - 2026-05-16
### Fixed
- **Core now owns managed user-review handoff messages.** Diagram Modules, Application Skeleton, and Quality Gates use a shared Core message when user review opens, so the user sees the same instruction after each agent turn: answer the agent, ask for corrections, or type `подтверждаю` to accept the current result.
- **`подтверждаю` is a hard acceptance trigger.** Application Skeleton and Quality Gates no longer reinterpret confirmation as review feedback just because `openQuestions` or wording such as `но` remain in the message; confirmation accepts the current contract as-is and opens the next managed materialization/integration phase.
- **Persistent return messages are Core-owned.** Completed Application Skeleton and Quality Gates materialization/integration now use a stable Core message that says the step is complete and the user can return later with changes.

### Tests
- `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts`
- `npm run build --workspace @codeai-hub/core`

## [1.2.282] - 2026-05-16
### Fixed
- **Application Skeleton review dialogue remains agent-owned.** Core no longer publishes duplicate visible review-question messages while the agent is clarifying `openQuestions`; user answers are routed back to the active review task through an internal repair/review prompt.
- **Managed Git commits no longer stage ignored generated outputs as positive paths.** The commit boundary filters `node_modules`, `dist`, `build`, and `coverage` before `git add` and keeps safe glob excludes for broad managed roots.

### Tests
- `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-validator.test.ts packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.test.ts`
- `npm run build --workspace @codeai-hub/core`

## [1.2.281] - 2026-05-16
### Fixed
- **Application Skeleton now enforces Git hygiene for generated outputs.** The prompt and contract require a root `.gitignore` before install/build readiness, and Core rejects missing ignore coverage for npm install output and TypeScript build output.
- **Generated install/build outputs no longer count as materialized skeleton.** Core rejects `materializedPaths` entries such as `node_modules` and package `dist`, while managed Git commits exclude generated output directories even when a broad materialized directory is staged.
- **Application Skeleton JSON must preserve the nested Product Part tree.** Core rejects flat top-level Cluster/Module entries in `productParts`; the map must keep Product Parts at the top, Clusters under their owning Product Part, and Modules under their owning Cluster or `standaloneModules`.

### Tests
- `npx tsx --test packages/core/src/templates/application-skeleton-bundled-templates.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-materialization-validator.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-environment-readiness-audit.test.ts packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.test.ts`
- `npm run build --workspace @codeai-hub/core`

## [1.2.280] - 2026-05-16
### Fixed
- **Application Skeleton materialization now proves local environment readiness.** The prompt and contract require the accepted clean install command to run after package metadata and lockfiles exist, require local install outputs such as `node_modules` for npm foundations, and require every declared `projectFoundation.requiredScripts` command to pass before readiness is claimed.
- **Core now rejects folder-only or lockfile-only foundations.** Materialization validation runs the declared install command and required scripts from the workspace root after static artifact validation; missing install output or failed build/typecheck/smoke scripts keep the step in repair instead of unlocking downstream work.
- **Generated bundled templates carry the same readiness contract.** The bundled-template regression now asserts the clean-install, `node_modules`, and required-script requirements so installed releases cannot drift from the agent assets.

### Tests
- `npx tsx --test packages/core/src/remote-bridge/handlers/application-skeleton-environment-readiness-audit.test.ts packages/core/src/templates/application-skeleton-bundled-templates.test.ts packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-validator.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-materialization-validator.test.ts`
- `npm run build --workspace @codeai-hub/core`

## [1.2.279] - 2026-05-16
### Fixed
- **Application Skeleton now has a code-ready foundation baseline as its primary outcome.** The prompt and contract tell the agent to prepare the workspace for real implementation work, including concrete language/runtime/framework/package/build decisions and minimal source/config targets after acceptance.
- **Framework decisions can no longer disappear behind empty arrays.** Core rejects `stack.frameworks: []` unless the draft also carries a framework/shell-specific dialogue question with a recommended option first.
- **Unresolved framework prose is no longer accepted in Markdown.** Drafts that say the framework is not fixed, pending, TBD, unknown, or equivalent now fail validation instead of reaching review as a valid stack decision.
- **The Product Part / Cluster / Module tree remains a Project Manager Development Tree mirror.** The prompt and contract preserve the exact Development Tree identity and hierarchy while still allowing conventional package metadata at accepted roots.

### Tests
- `npx tsx --test packages/core/src/templates/application-skeleton-bundled-templates.test.ts packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-validator.test.ts packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-framework-baseline-validator.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts`
- `npm run build --workspace @codeai-hub/core`

## [1.2.278] - 2026-05-16
### Fixed
- **Application Skeleton questions now belong to dialogue, not Markdown.** The provider prompt and contract define Markdown as the proposed/agreed decision artifact, keep JSON `openQuestions` as a Core signal, and require all unresolved decisions to be asked in chat.
- **Application Skeleton review now surfaces draft questions before acceptance.** Core passes `openQuestions` into the user-review message and keeps confirmation blocked until those dialogue decisions are resolved.
- **Placeholder stack choices no longer count as real framework decisions.** Draft validation rejects values such as pending/unknown/unresolved framework placeholders while allowing an empty framework list only when a blocking dialogue question is open.

### Tests
- `npx tsx --test packages/core/src/templates/application-skeleton-bundled-templates.test.ts packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-validator.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts`
- `npm run build --workspace @codeai-hub/core`

## [1.2.277] - 2026-05-16
### Fixed
- **Application Skeleton unresolved questions now open user review instead of repair loops.** Draft contracts with `openQuestions` remain structurally valid for review, so Core no longer repeatedly sends `open_questions_block_materialization` repair prompts to the agent.
- **Application Skeleton acceptance stays blocked while questions remain open.** A user `подтверждаю` response no longer opens materialization until `openQuestions` is empty; Core keeps review active and shows the unresolved decisions.

### Tests
- `npx tsx --test packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-validator.test.ts packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-materialization-validator.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-progress.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-completion-observer.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-phase-state.test.ts packages/core/src/development-tree/development-tree-bootstrap-gate.test.ts`
- `npm run build --workspace @codeai-hub/core`

## [1.2.276] - 2026-05-16
### Changed
- **Application Skeleton now requires an installable project foundation.** The provider-facing prompt and Core validators require stack/package/workspace decisions, empty `openQuestions`, deterministic install metadata, required scripts, config files, and first-wave production entrypoints before materialization can complete.
- **Downstream readiness now depends on `foundationReady`.** Quality Gates and Development Tree readiness stay locked when Application Skeleton output is only a folder outline or has incomplete foundation evidence.

### Tests
- `npx tsx --test packages/core/src/development-tree/development-tree-bootstrap-gate.test.ts packages/core/src/templates/application-skeleton-bundled-templates.test.ts packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-validator.test.ts packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-materialization-validator.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-progress-state.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-phase-state.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-premature-materialization-validator.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-completion-observer.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-progress.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-in-progress-materialization.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.ts`
- `npm run build --workspace @codeai-hub/core`

## [1.2.275] - 2026-05-16
### Changed
- **Fresh retest release for the merged Core managed orchestrator baseline.** Rebuilds the current `main` branch after the large orchestrator merge under a new package version so the merged workflow can be installed and tested without reusing the previous release identity.

## [1.2.274] - 2026-05-16
### Fixed
- **Application Skeleton now shows active work in the documentation tree.** Core hydrates workflow state from the active Application Skeleton continuity chain, so Project Manager receives `in_progress` while the provider session is running instead of leaving the step grey until artifacts appear.
- **Application Skeleton prompts now pin production scaffold paths to the workspace root.** The bundled prompt states `workspaceRoot: "."`, forbids `.codeai-hub/**` as a production `codePath` or `materializedPaths` root, and leaves structural validation to Core unless Core explicitly asks for extra diagnostics.

### Tests
- `node --test --import tsx packages/core/src/remote-bridge/handlers/workflow-state-service-managed-state.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-progress.test.ts packages/core/src/templates/application-skeleton-bundled-templates.test.ts packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-validator.test.ts`
- `node --test --import tsx packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.ts`
- `node --test --import tsx src/client/project-manager/components/layout/workspace-tree-model.test.ts src/client/project-manager/services/workflow-state-client.test.ts src/client/project-manager/services/workflow-state-change-token.test.ts src/client/project-manager/services/workflow-step-start-service.gating.test.ts`
- `npm run build --workspace=@codeai-hub/core`
- `npm run build:webview`
- `npm run typecheck:webview`

## [1.2.273] - 2026-05-16
### Fixed
- **Diagram Modules Phase 0 now closes its commit pair.** When Core records the managed input checkpoint hash, the paired `Git Commit: docs: checkpoint managed workflow inputs` line is marked `DONE` instead of remaining `TODO` in the stage plan.
- **Managed commits clean macOS metadata before staging.** Core removes `.DS_Store` files from the workspace tree before managed Git commits, preventing Finder metadata from being committed or left as dirty workspace state.
- **Runtime metadata ledgers are committed with managed stage ledgers.** Core includes `.codeai-hub/<workspace>/continuity/**` and `.codeai-hub/<workspace>/workflow/state.json` in ledger commits, so Diagram Modules provider/session metadata updates do not leave Git dirty after accepted turns.

### Tests
- `node --test --import tsx packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.ts packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.test.ts`
- `node --test --import tsx packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller.test.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.test.ts`
- `npm run build --workspace=@codeai-hub/core`
- `npm run build:webview`
- `npm run typecheck:webview`

## [1.2.272] - 2026-05-16
### Fixed
- **Diagram Modules now checkpoints managed inputs before the first provider prompt.** Core commits Description, Virtual Simulation, continuity/workflow scaffold, managed stage plans, and plan hook files before opening the Product Parts index microtask, so the first commit-backed Diagram Modules task starts from clean Git.
- **Managed workflow ledgers no longer leak as dirty state between microtasks.** Diagram Modules, Application Skeleton, and Quality Gates now create a Core-owned `chore: advance managed workflow ledger` commit after artifact commits and user-review state transitions, keeping `doc/TODO/stages/**/todo-plan.md` and `doc/TODO/workspace.plan.md` out of the next agent task's dirty set.
- **Downstream transitions were rechecked as Core-owned state, not Project Manager logic.** Application Skeleton remains available after Diagram Modules, Quality Gates remains available after Application Skeleton materialization, and Quality Gates completion unlocks development tree cards from Core-owned workflow state.

### Tests
- `node --test --import tsx packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.test.ts packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller.test.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts packages/core/src/remote-bridge/handlers/workflow-state-service-development-tree-bootstrap.test.ts packages/core/src/remote-bridge/handlers/workflow-state-service-rewrite-boundary.test.ts`
- `node --test --import tsx src/client/project-manager/services/workflow-step-start-service.gating.test.ts src/client/project-manager/services/workflow-state-client.test.ts src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.test.ts`
- `npm run build --workspace=@codeai-hub/core`
- `npm run build:webview`
- `npm run typecheck:webview`

## [1.2.271] - 2026-05-16
### Fixed
- **Diagram Modules graph sidecars no longer block workflow progress.** Core technical-stage dirty gating ignores the non-semantic `.codeai-hub/<workspace>/diagram_modules/module-map.flow.json` layout file, so a valid Product Parts aggregate remains ready even when Project Manager graph layout state is untracked.
- **Application Skeleton stays unlocked after Diagram Modules review opens.** The Core workflow state regression now covers committed Product Parts plus an untracked graph sidecar and still returns `diagram_modules.status=completed` with `gating.blocked.application_skeleton=false`.
- **Adjacent technical-stage gates were rechecked.** Application Skeleton and Quality Gates still classify their semantic dirty files by owning stage, while completed upstream Application Skeleton is not re-blocked by unrelated technical-stage Git dirt.

### Tests
- `node --test --import tsx packages/core/src/remote-bridge/handlers/technical-stage-dirty-gate-flow-sidecar.test.ts packages/core/src/remote-bridge/handlers/technical-stage-dirty-gate.test.ts packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts`
- `npx tsx --test src/client/project-manager/services/workflow-step-start-service.gating.test.ts src/client/project-manager/services/workflow-state-client.test.ts src/client/project-manager/components/layout/workspace-tree.test.ts`
- `npm run build --workspace=@codeai-hub/core`
- `npm run typecheck:webview`
- `npm run build:webview`
- `npm run plan:validate`

## [1.2.270] - 2026-05-16
### Fixed
- **Diagram Modules review readiness now completes the Core workflow stage.** The Core-owned workflow read-model promotes `diagram_modules` from `in_progress` to `completed` when Diagram Modules progress reports `aggregateReady=true`, so Project Manager, future mobile clients, and any other client projection read the same completed state.
- **Application Skeleton unlocks from the same Core snapshot.** The downstream gate now sees the aggregate-ready Diagram Modules handoff even when the stage was already running before the final Product Part was accepted.
- **Adjacent managed terminal gates were rechecked.** Application Skeleton and Quality Gates continue to complete from Core-owned progress state (`materialized` / `integrated`) rather than Project Manager logic.

### Tests
- `node --test --import tsx packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-progress.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-progress-state.test.ts packages/core/src/remote-bridge/handlers/technical-stage-dirty-gate.test.ts`
- `npx tsx --test src/client/project-manager/services/workflow-step-start-service.gating.test.ts src/client/project-manager/components/layout/workspace-tree-model.test.ts src/client/project-manager/services/workflow-state-change-token.test.ts`
- `npm run build --workspace=@codeai-hub/core`
- `npm run typecheck:webview`
- `npm run build:webview`
- `npm run plan:validate`

## [1.2.269] - 2026-05-16
### Fixed
- **Diagram Modules prompts now carry the full artifact contract inline.** Core embeds the Product Parts index template, Product Part template, field reference, and merge rules directly into first/continuation/repair prompts instead of relying on path-only references.
- **Diagram Modules validation and graph rendering now share the Core-owned Product Part parser.** Core rejects artifacts that Project Manager cannot render, including missing Product Part identity fields, before stage acceptance.
- **Artifact repair attempts now stay inside the managed commit lifecycle.** Rejected Diagram Modules turns are committed with real hashes, new repair microtasks plus paired `Git Commit` items are appended, and Core dispatches the provider-visible repair prompt only after that boundary succeeds.
- **Project Manager no longer authors repair prompts for managed artifacts.** The UI opens the managed stage session, while Core owns target selection, diagnostics, prompt text, and repair lifecycle state.

### Tests
- `node --test --import tsx packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-prompt-builder.test.ts packages/core/src/remote-bridge/handlers/workflow-prompt-pack-service.test.ts`
- `node --test --import tsx src/client/project-manager/components/diagram-editor/diagram-modules-staged-part-parser.test.ts`
- `node --test --import tsx packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core.test.ts packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-prompt-builder.test.ts`
- `npm run typecheck:webview`
- `npm run build --workspace=@codeai-hub/core`
- `npm run plan:validate`

## [1.2.268] - 2026-05-15
### Added
- **Quality Gates now runs through the managed orchestration module.** Core creates the managed stage plan, validates `quality-gates.md` and `quality-gates.json`, records managed decision snapshots, opens user review, routes acceptance or review corrections, and opens accepted-only integration before persistent return.
- **All five trunk steps are now covered by the replacement orchestration boundary.** `Description` and `Virtual Simulation` remain provider-direct, while `Diagram Modules`, `Application Skeleton`, and `Quality Gates` run through Core-owned managed dispatch, validation, Git commit boundaries, review gates, and continuation prompts.

### Fixed
- **Quality Gates integration is guarded by concrete executable evidence.** Core requires `accepted: true`, `integrated: true`, `integrationState: "integrated"`, required package scripts, and direct hook calls for required commit/push gates before completing the step.
- **Review acceptance is no longer treated as provider-visible work.** User acceptance advances the Quality Gates stage plan to integration without forwarding the acceptance text to the agent; requested corrections stay in the active review task as scoped Core prompts.

### Tests
- `npx tsx --test packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.test.ts packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.ts` passed, 14/14 tests.
- `npm run build:core`
- `npm run build:project-manager`
- `npm run plan:validate`

## [1.2.267] - 2026-05-15
### Added
- **Application Skeleton now runs through the managed orchestration module.** Core creates the managed scaffold, validates draft/materialized contract artifacts, records managed decision snapshots, and advances the stage plan through review, materialization, and persistent return phases.
- **Application Skeleton review decisions are Core-mediated.** User acceptance opens materialization without provider-visible chatter, while requested corrections stay inside the current review task and are sent to the agent as a scoped Core instruction.

### Fixed
- **Application Skeleton managed commits include the workflow decision ledger.** Core-owned `.codeai-hub/**/workflow/managed/application_skeleton.json` is now part of the managed commit boundary, preventing a dirty untracked ledger after validation.

### Tests
- `npm run build:core`
- `npm run lint`
- `npm run plan:validate`
- Application Skeleton validator/controller/review/session/runtime, dirty-gate, and workflow-state targeted tests passed, 48/48 tests.

## [1.2.266] - 2026-05-15
### Fixed
- **Diagram Modules user-review plans now keep the required commit pair.** Core opens Phase 2 user review with `diagram-modules.phase2.review.task1` and a paired `Git Commit: docs: open diagram modules user review` item instead of `expected commit: none`.
- **Core-managed review ledger metadata no longer blocks Application Skeleton.** Technical-stage dirty gating ignores Core-owned `doc/TODO/workspace.plan.md` and managed stage todo-plan metadata, so a completed Diagram Modules aggregate can unlock the next stage when only review-ledger files are dirty.

### Tests
- `npm run build:core`
- Diagram Modules stage-plan controller, runtime Core arbitration, and technical-stage dirty-gate tests passed, 16/16 tests.
- `npm run plan:validate`

## [1.2.265] - 2026-05-15
### Fixed
- **Project Manager now refreshes workflow state when derived gates change.** `Diagram Modules` turns green after Core opens user review, and `Application Skeleton` stops showing a stale blocked `product-parts.index.md not found` card once `diagramModulesProgress.aggregateReady` unlocks the next step.

### Tests
- `npx tsx --test src/client/project-manager/services/workflow-state-change-token.test.ts src/client/project-manager/components/layout/workspace-tree-model.test.ts src/client/project-manager/services/workflow-step-start-service.gating.test.ts` passed, 14/14 tests.
- `npm run typecheck:webview`
- `npm run build:webview`
- `npm run plan:validate`

## [1.2.264] - 2026-05-15
### Fixed
- **Root workflow markers now use the correct completion boundary.** `Description` and `Virtual Simulation` turn green once their draft artifact exists, while `Diagram Modules` stays orange through Product Part turns and turns green only after Core opens the user-review/aggregate-ready phase.

### Tests
- `npx tsx --test src/client/project-manager/components/layout/workspace-tree-model.test.ts` passed, 4/4 tests.
- `npm run typecheck:webview`
- `npm run build:webview`
- `npm run plan:validate`

## [1.2.263] - 2026-05-15
### Fixed
- **Diagram Modules sidebar state now stays active until user review opens.** Product Part artifacts no longer make the left-side step marker green while the managed Product Part sequence is still running.
- **Core/system dialog messages now render as dialog cards.** System messages use a subtle dedicated card with the shared border/shadow treatment and symmetric side offsets matching the larger assistant-card offset.

### Tests
- `npx tsx --test src/client/project-manager/components/layout/workspace-tree-model.test.ts src/client/project-manager/components/sessions/project-manager-dialog-session-view-helpers.test.ts` passed, 9/9 tests.
- `npm run typecheck:webview`
- `npm run build:webview`
- `npm run plan:validate`

## [1.2.262] - 2026-05-15
### Fixed
- **Diagram Modules managed commits now retry transient Git index locks.** Core serializes the managed boundary per workspace and retries `.git/index.lock` failures before deciding whether to block continuation.
- **Persistent managed Git lock failures now stop safely.** Core keeps the next Product Part/user-review transition blocked until the accepted subturn commit hash is actually recorded.
- **Core/system dialog messages now use the selected Messages for the User language.** Session translation routes `system` messages through the `messages_for_the_user` policy while preserving source content, ids, tags, paths, DSL tokens, and persisted translation overlays.

### Tests
- `npm run build:core`
- Diagram Modules managed boundary, runtime continuation, prompt-builder, session translation policy/facade, and Core event-message tests passed, 24/24 tests.
- `npm run plan:validate`

## [1.2.261] - 2026-05-15
### Fixed
- **Diagram Modules now advances the managed stage plan after accepted subturns.** Core records real Git hashes in `doc/TODO/stages/diagram-modules/todo-plan.md`, injects Product Part microtasks, and opens the Phase 2 review task only after the final Product Part commit boundary succeeds.
- **Greenfield Diagram Modules workspaces now get a Core-owned local Git boundary.** If the workspace has no `.git`, Core initializes it before the managed commit and stages only managed Diagram Modules/scaffold paths.
- **Continuation and review prompts now wait for the managed commit boundary.** Core no longer opens the next Product Part or user review over an uncommitted accepted artifact.

### Tests
- `npm run build:core`
- Diagram Modules stage-plan controller, runtime post-turn arbitration, scaffold, prompt-builder, and managed facade tests passed, 17/17 tests.
- `npm run plan:validate`

## [1.2.260] - 2026-05-15
### Fixed
- **Diagram Modules managed scaffold is now created on the real `session:create` runtime path.** Core installs `doc/TODO/workspace.plan.md`, stage TODO plans, plan scripts, and hooks before provider dispatch starts.
- **Invalid Product Part artifacts now trigger provider-visible repair prompts.** Core sends the exact target path, deterministic diagnostics, and required `# Product Part: <part-id>` heading to the provider instead of only appending a passive visible diagnostic.
- **Product Part continuation prompts now state the required heading contract.** This aligns provider instructions with Core validation before each Product Part artifact is written.

### Tests
- `npm run build:core`
- Diagram Modules scaffold, runtime repair-prompt, prompt-builder, and managed facade tests passed, 15/15 tests.
- `npm run plan:validate`

## [1.2.259] - 2026-05-15
### Fixed
- **Diagram Modules no longer stops after creating only `product-parts.index.md`.** Core now creates the managed workspace scaffold at stage start and runs post-turn managed arbitration after provider completion.
- **Diagram Modules Phase 1 is now subturn-aware.** The first Product Part index is accepted as a valid subturn, Core extracts Product Part ids, and each completed Product Part turn dispatches the next Product Part prompt.
- **User-led review opens only after the last Product Part is accepted.** Core appends visible localized feedback during continuation and moves to review when the managed sequence is complete.

### Tests
- `npm run build:core`
- Diagram Modules prompt/validation and managed facade tests passed, 16/16 tests.
- Remote-bridge provider-event and managed-workspace tests passed.
- `npm run plan:validate`

## [1.2.258] - 2026-05-15
### Added
- **All five documentation trunk steps are routed through the replacement Managed Workflow Orchestration cluster boundary.** `Description` and `Virtual Simulation` keep provider-direct sessions; `Diagram Modules`, `Application Skeleton`, and `Quality Gates` now use managed dispatch.
- **Application Skeleton and Quality Gates are no longer preview-only technical stages.** Project Manager can launch them through Core's managed dispatch policy while preserving upstream gating and existing-session reuse.

### Fixed
- **Managed technical starts no longer create preview placeholder sessions after the replacement boundary takes ownership.** Remote-bridge session creation, user-message dispatch, and rollover continuation now share the managed dispatch path for all technical trunk stages.

### Tests
- `npm run build:core`
- `npm run typecheck:webview`
- Managed workflow orchestrator tests passed, 17/17 tests.
- Remote-bridge managed dispatch and workflow-state tests passed, 9/9 tests.
- Project Manager workflow-state/start-surface tests passed, 17/17 tests.
- `npm run build:webview`

## [1.2.257] - 2026-05-15
### Added
- **Preliminary workflow steps are registered in the replacement Managed Workflow Orchestration cluster.** `Description` and `Virtual Simulation` now have provider-direct controller metadata next to the technical trunk controllers.
- **Core projects explicit start policy and read-only state.** The workflow state payload now exposes `startPolicy` per registered stage and a `readOnlyStages` list computed from real downstream technical progress.

### Fixed
- **Project Manager no longer treats active managed preview as an upstream lock.** Completed Description sessions and the Virtual Simulation start card stay visible while only the technical preview boundary is active.
- **Provider-direct preliminary starts remain provider-direct.** Core preview boundary sessions are still limited to `Diagram Modules`, `Application Skeleton`, and `Quality Gates`.

### Tests
- `npm run build:core`
- `node --test packages/core/dist/managed-workflow-orchestration/managed-workflow-orchestration-facade.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-workflow-session.rewrite-blocker.test.js packages/core/dist/remote-bridge/handlers/workflow-state-service-managed-state.test.js` passed, 8/8 tests.
- `npm run typecheck:webview`
- `npx tsx --test src/client/project-manager/components/layout/main-area-panel-content.test.ts src/client/project-manager/services/workflow-step-start-service.gating.test.ts src/client/project-manager/components/shared/stage-confirmation-card.test.ts` passed, 18/18 tests.
- `npm run build:webview`

## [1.2.256] - 2026-05-15
### Added
- **Managed Workflow Orchestration preview boundary.** Core now exposes a read-only `ManagedWorkflowOrchestrationFacade` slice with registered controllers for `Diagram Modules`, `Application Skeleton`, and `Quality Gates`.
- **Project Manager visual control point.** Technical stage cards show the new managed preview status, registered controller, and Core-owned reason before full provider dispatch is restored in step-specific releases.

### Changed
- **Managed technical stage starts fail through the new Core boundary instead of the retired generated orchestrator.** Starting a managed technical stage creates a Core-authored preview session message and avoids native provider dispatch.

### Tests
- `npm run build:core`
- `npm run build:project-manager`
- `npm run typecheck:webview`
- Targeted Core managed workflow/session tests: 27 passed.
- Targeted Project Manager preview/session tests: 26 passed.

## [1.2.255] - 2026-05-14
### Changed
- **Clean servicing-tail audit rebuild.** Confirms `scripts/plan-orchestrator/**` is repository plan-lifecycle tooling for `npm run plan:*` and Husky hooks, not the removed managed step/workflow orchestrator.
- **Release-facing wording no longer presents the retired controller as current behavior.** README now focuses on the current verification package instead of carrying the old managed-release history inline.
- **Architecture-debt comments no longer reference the old Application Skeleton orchestration pilot.** The remaining oversized dispatch entry is tracked as provider-message rewrite debt.

### Tests
- `npm run plan:validate` passed during servicing-tail cleanup.
- Targeted servicing grep verified active SSOT/release-facing files no longer describe the deleted managed workspace lifecycle as an active runtime contract.

## [1.2.254] - 2026-05-14
### Changed
- **Clean rebuild of the managed orchestration cleanup verification package.** Rebuilds the v1.2.253 cleanup baseline after clearing stale local release outputs, under a new release identity for retesting.
- **Legacy managed step orchestration remains disabled by design.** The old generated plan CLI/shim wiring, accept-contract runners, repair/revision dispatchers, managed commit transaction, and post-turn orchestration side effects continue to fail closed until the replacement cluster orchestrator is implemented.

### Tests
- Clean rebuild release checks are recorded in the active cleanup plan.

## [1.2.253] - 2026-05-14
### Changed
- **Legacy managed step orchestration is removed from the runtime baseline.** The generated plan CLI/shim wiring, accept-contract runners, repair/revision dispatchers, managed commit transaction, and post-turn orchestration side effects now fail closed or no-op before the replacement cluster orchestrator is implemented.
- **Formed workflow step materials remain available without the old controller.** Diagram Modules, Application Skeleton, and Quality Gates planning/contract documentation stays in place for the next implementation cycle, while legacy runtime ownership no longer mutates workflow state.
- **Verification release for a clean orchestration baseline.** This build is expected to compile and run with the managed step flows disabled until the new cluster orchestrator is introduced.

### Tests
- `npm run build:core` passed.
- `npm run build:project-manager` passed.
- `npm run typecheck:webview` passed.
- `npm run check:knip` passed.
- `npm run check:links` passed.
- `npm run check:dup` passed with 2.76% duplicated lines, under the 3% threshold.

## [1.2.252] - 2026-05-13
### Changed
- **Hidden Claude reasoning no longer spends tokens on a summary the user does not see.** When `Thinking in dialog` is disabled (`thinkingDisplaySyncEnabled = false`), the Claude SDK turn now requests `thinking: { type: "adaptive", display: "omitted" }` plus the resolved `effort` instead of `display: "summarized"`. The model still reasons internally but no plain-text `thinking_delta` is streamed.
- **Native request capture diagnostics mirror the same `display` selection.** Capture artifacts reproduce the actual runtime payload for both `display: "summarized"` and `display: "omitted"` Claude turns.
- **`Thinking in dialog` toggle is now a two-effect switch.** It still filters visible thinking bubbles at the Session UI (presentation-only) and additionally selects the provider-side `thinking.display` option. When `Thinking in dialog` is enabled, behavior is unchanged.

### Tests
- `npm run build --workspace packages/Claude_Module` passed.
- `node --test packages/Claude_Module/dist/sdk/claude-sdk-manager.test.js` passed (8/8) including a new `ClaudeSDKManager omits reasoning display when thinking is hidden in dialog` regression.
- `node --test packages/Claude_Module/dist/diagnostics/claude-native-request-capture-service.test.js` passed (5/5) including a new `ClaudeNativeRequestCaptureService mirrors hidden-thinking display selection` regression.

## [1.2.251] - 2026-05-13
### Fixed
- **Session continuity files no longer hide existing sessions after recoverable corruption.** Core now serializes `chain.json` / `index.json` writes per path and writes them atomically through temp-file rename.
- **Project Manager can recover legacy trailing-corrupt continuity chains.** A file containing one complete JSON object followed by trailing corrupt bytes is treated as valid session evidence and rewritten as clean JSON on the next save.
- **The invariant is provider-neutral and stage-family wide.** The same recovery path covers `description`, `virtual_simulation`, `diagram_modules`, `application_skeleton`, `quality_gates`, and nested `development_tree/...` sessions.

### Tests
- `npm run build --workspace @codeai-hub/core` passed.
- `node --test packages/core/dist/session-continuity/continuity-store.test.js` passed with coverage for trunk and Development Tree continuity paths.
- A real Claude workspace recovery probe found the previously hidden Application Skeleton continuity chain.

## [1.2.250] - 2026-05-13
### Fixed
- **Quality Gates in-progress integration attempts now become actionable repairs.** After the accepted contract commit, Core validates required lifecycle hook wiring even when the agent leaves `integrated: false` with `integrationState: "in_progress"`.
- **The Quality Gates Phase 3 continuation prompt no longer defers hook wiring to Core.** The provider is told that `.husky/pre-commit` and `.husky/pre-push` required calls are Quality Gates integration-owned content, while Core still owns validation, Git, and plan advancement.
- **Application Skeleton now follows the same post-turn invariant.** A terminal `materializationState: "in_progress"` attempt is treated as observed materialization and validated immediately, so missing production paths become repairable failures instead of a silent materializing state.

### Tests
- Targeted managed in-progress verification passed: `20/20` tests across Quality Gates progress, Quality Gates post-turn repair routing, Application Skeleton in-progress materialization, and Application Skeleton progress.
- `npm run build --workspace @codeai-hub/core` passed before release documentation.
- `npx ultracite check` passed through the planned commit hooks.

## [1.2.249] - 2026-05-13
### Fixed
- **Quality Gates now opens the persistent user-return phase after split integration.** A validated `quality-gates.phase3.integration.task2+` commit now opens `Phase 4 - Persistent Quality Gates User Return` instead of falling through to another generic Phase 3 continuation task.
- **The Quality Gates shim matches Application Skeleton terminal behavior.** The user-return anchor is created after the accepted integration is validated, even when the materialization required multiple managed commits.
- **Regression coverage locks the no-task3 path.** The shim test now verifies that an incomplete first integration commit may create `task2`, while the validated follow-up commit creates `quality-gates.phase4.user-return.task1` and does not create `quality-gates.phase3.integration.task3`.

### Tests
- Targeted Quality Gates split-integration verification passed: `10/10` tests across the Quality Gates mutator and installed child-plan shim.
- `npx ultracite check` passed for the Quality Gates mutator and shim regression.
- `npm run build --workspace packages/core` passed before release packaging.

## [1.2.248] - 2026-05-13
### Fixed
- **Application Skeleton root scaffold files are stage-owned when declared by the accepted map.** `package.json`, `package-lock.json`, `tsconfig*.json`, and any safe relative path listed in `application-skeleton-map.json` materialization fields are classified as Application Skeleton materialization work instead of outside-allowlist noise.
- **Repairable Application Skeleton failures no longer dead-end the agent.** If Core rejects materialization with a repairable boundary failure, provider-visible feedback now gives an actionable repair path instead of combining the error with `Do not update... Wait for Core...`.
- **Managed child-plan scopes match the actual skeleton scaffold contract.** Application Skeleton Phase 3, repair, and user-return scopes now include root scaffold files alongside `product-parts/**` and canonical skeleton artifacts.

### Tests
- Targeted managed feedback dead-end verification passed: `29/29` tests across Application Skeleton ownership, Application Skeleton actionable feedback, Diagram Modules feedback, Quality Gates action lines, post-turn repair routing, and Application Skeleton / Quality Gates child-plan shims.
- `npx ultracite check` passed for the changed Core handlers, managed Application Skeleton mutator, and focused regressions.
- `npm run build --workspace packages/core` passed before release packaging.

## [1.2.247] - 2026-05-13
### Fixed
- **Quality Gates ownership now follows the accepted contract.** Core reads Quality Gates integration paths from `quality-gates.json` and also recognizes common QG toolchain paths such as `scripts/qg/**`, `.ox*.json`, and `tsconfig.qg*.json`.
- **Phase 3 repair feedback no longer dead-ends on QG-owned files.** Missing Husky hook wiring remains provider-actionable, so the agent is told to continue Phase 3 repair instead of receiving `Do not update... Wait for Core...` for its own materialization files.
- **Required hook wiring is explicitly agent-owned during Phase 3.** The prompt and contract now forbid finishing with `.husky/pre-commit` / `.husky/pre-push` left as Core-owned pending regeneration.
- **Installed child-plan shim scope matches the runtime scope.** Fallback shim wording now includes dynamic QG paths rather than preserving the old `scripts/quality-gates/**`-only integration scope.

### Tests
- Targeted dynamic Quality Gates ownership verification passed: `36/36` tests across dirty-file ownership, action-line feedback, post-turn repair targeting, bundled templates, mutators, shim lifecycle, progress validation, and continuation dispatch.
- `npx ultracite check` passed for the changed Core handlers, managed-workspace mutators/shim source, prompt assets, bundled templates, and regressions.
- `npm run build --workspace packages/core` passed before release packaging.

## [1.2.246] - 2026-05-13
### Fixed
- **Quality Gates Phase 3 integration repair is now actionable.** Accepted-but-invalid Quality Gates integration work is classified as Phase 3 repair, so Core opens `phase3.integration.repairN` work instead of sending the provider back into a stale Phase 2 acceptance loop.
- **Quality Gates materialization paths are stage-owned.** Core now allows `scripts/quality-gates/**` and `biome.jsonc` during the managed Quality Gates commit gate while ignoring volatile `node_modules/**` install noise.
- **Failed integration feedback no longer tells the agent to wait.** When hook wiring or integration evidence is missing, Core now tells the agent to continue materialization and fix the concrete missing lifecycle wiring.
- **The Quality Gates prompt requires explicit hook wiring.** The prompt and bundled contract now define materialization as complete only after scripts, package commands, direct Husky `npm run qg:<gate-id>` commands, and accepted artifact state are all ready for Core validation.

### Tests
- Targeted Quality Gates integration repair verification passed: `39/39` tests across managed post-turn arbitration, dirty-file ownership, acceptance feedback, bundled templates, child-plan mutators, shim lifecycle, progress validation, and continuation dispatch.
- `npx ultracite check` passed for the changed Core handlers, managed-workspace mutators, prompt assets, bundled templates, and regression tests.
- `npm run build --workspace packages/core` passed before release packaging.

## [1.2.245] - 2026-05-13
### Fixed
- **Quality Gates acceptance now uses the committed workspace ledger.** Progress derives `acceptanceCommitted` from `doc/TODO/workspace.plan.md` accepted commit evidence, matching Application Skeleton, so `docs: accept quality gates contract` can trigger the Phase 3 integration continuation even when `quality-gates.json` still says `acceptanceCommitted: false`.
- **Managed review revisions are injected before the commit transaction.** Application Skeleton and Quality Gates now create the concrete `revisionN.task1` pair before Core commits an artifact-changing review/user-return turn, keeping the stable review anchor open without creating generic follow-up tasks.
- **Stale Phase 2 review tasks are closed on acceptance.** Acceptance now closes the current `phase2.review.taskN` anchor, including legacy synthetic `task2` entries, and the bundled shim refuses to manufacture `Continue managed ...` tasks for managed review/user-return anchors.
- **Cross-stage regressions lock the repaired lifecycle.** Application Skeleton and Quality Gates now cover the one-correction-then-accept path, while Diagram Modules user-return coverage verifies it does not regress into generic continuation tasks.

### Tests
- Targeted managed review-anchor cleanup verification passed: `47/47` tests across Quality Gates progress/continuation, managed post-turn arbitration, Application Skeleton and Quality Gates mutators, and Application Skeleton, Quality Gates, and Diagram Modules shim lifecycle tests.
- `npx ultracite check` passed for the changed progress, post-turn, mutator, shim, and regression files.
- `npm run build --workspace packages/core` passed before release packaging.

## [1.2.244] - 2026-05-12
### Fixed
- **Quality Gates acceptance now survives an in-flight post-turn pass.** If Core records `docs: accept quality gates contract` while an earlier Quality Gates post-turn arbitration is still running, the follow-up continuation is now queued and replayed instead of being dropped as a concurrent invocation.
- **Typed `Подтверждаю` now reaches the Quality Gates integration prompt in the same session.** The child plan can advance into `phase3.integration` without losing the provider-visible continuation turn that tells the agent to start integrating the accepted baseline.
- **Post-turn regression coverage now locks the continuation re-entry race.** A targeted test keeps the managed post-turn service from regressing back to the lost-rerun behavior after future acceptance-path edits.

### Tests
- Targeted managed acceptance continuation verification passed: `32/32` tests across post-turn rerun queuing, Quality Gates acceptance runner, continuation dispatcher, and production bootstrap routing.
- `npm run build --workspace packages/core` passed before release packaging.

## [1.2.243] - 2026-05-12
### Fixed
- **Quality Gates typed acceptance now reaches the correct production Core runner.** The live bootstrap callback dispatches by managed session stage, so an explicit acceptance phrase such as `Подтверждаю` in `quality_gates` no longer falls into the Application Skeleton handler and disappears.
- **Managed contract review prompts now end with one exact user-facing confirmation sentence.** Application Skeleton and Quality Gates both finish every pre-acceptance review turn with `Пожалуйста, подтвердите контракт или перечислите правки, которые нужно внести перед интеграцией.` and do not append optional “I can also...” follow-ups after that boundary.
- **Prompt/template regressions now lock the shared review-closing phrase.** Bundled template coverage fails if either managed contract prompt drifts away from the exact confirmation sentence or if the production typed-acceptance bootstrap path regresses again.

### Tests
- Targeted managed typed acceptance verification passed: `33/33` tests across production bootstrap dispatch, typed acceptance handlers, post-turn phrase recognition, and bundled prompt/template synchronization.
- `npm run build --workspace packages/core` passed before release packaging.

## [1.2.242] - 2026-05-12
### Fixed
- **Quality Gates now exposes an explicit review-boundary action in Project Manager.** The `quality-gates.md` panel renders a local `Accept Contract` button with a revision-in-chat hint, so the user no longer has to guess how to advance the managed review phase.
- **Contract draft prompts now ask the user for confirmation instead of asking Core for approval.** Application Skeleton and Quality Gates both end the draft turn by telling the user to confirm the contract or list revisions, while Core remains responsible only for structural validation, managed commits, and post-acceptance continuation.
- **Typed contract acceptance now reaches the same Core acceptance command for both managed review stages.** A recognized acceptance phrase in `quality_gates` no longer stalls in the dispatch router; it follows the same `typed-fallback` Core path as the PM button.
- **Ambiguous short acknowledgements stay in the normal revision path.** Short replies like `Окей`, `Давай дальше`, and `Все хорошо` are explicitly excluded from contract acceptance recognition, preventing accidental lifecycle advancement.

### Tests
- Targeted managed contract review verification passed: `52/52` tests across bundled prompt/template sync, the Quality Gates PM button, accept-command HTTP transport, typed acceptance routing, post-turn phrase recognition, and PM transport clients.
- `npm run build --workspace packages/core`, `npm run typecheck:webview`, and `npm run build:webview` all passed before release packaging.

## [1.2.241] - 2026-05-12
### Fixed
- **Validated handoff now gates downstream unlocks across all managed technical stages.** Diagram Modules, Application Skeleton, and Quality Gates no longer advance on a terminal-looking commit message alone; Core first rereads the committed artifacts and opens the downstream stage only from the validated post-completion anchor.
- **Completed upstream stages keep their own active Phase 4 anchor.** Unlocking the next stage now seeds the downstream child plan without stealing `activeStage`, so upstream user-return revisions remain committable after handoff instead of becoming blocked behind the downstream stage.
- **Application Skeleton and Quality Gates now open idle post-completion anchors instead of auto-opening `revision1`.** Real user-return diffs create the first revision pair, which removes the premature blocked task pairs observed during the `v1.2.240` retest.
- **Application Skeleton Phase 4 runtime classification now accepts clean handoff turns.** The idle handoff anchor stays reachable because clean post-completion discussion is treated as discussion, while owned diffs reopen a revision pair only when the user actually changes stage-owned files.

### Tests
- Targeted managed handoff verification passed: `38/38` tests across Diagram Modules, Application Skeleton, Quality Gates, installer lifecycle, and post-completion revision coverage.
- `npx ultracite check` passed for the managed handoff barrier files and `npm run build --workspace packages/core` passed before release packaging.

## [1.2.240] - 2026-05-12
### Fixed
- **Quality Gates owned-artifact gating now matches the Application Skeleton flow.** Core treats `doc/TODO/stages/quality-gates/todo-plan.md` and `doc/TODO/workspace.plan.md` as owned Quality Gates artifacts during the managed acceptance flow, so release retest no longer fails with false out-of-owner dirty paths.
- **Quality Gates feedback stays contract-only until acceptance is fully committed.** Draft, review, and accepted-but-not-committed states now keep the provider focused on contract repair instead of asking for hook integration before the Core-owned acceptance boundary is complete.
- **Phase 3 continuation is gated by the real acceptance commit boundary.** The integration prompt opens only after `accepted`, `acceptanceCommitted`, and the accepted substep are all true, which prevents the release-retest regression where Core resumed integration from a failed Phase 2 state.
- **Review-revision task injection renumbers downstream items correctly.** Quality Gates Phase 2 no longer duplicates numbered task pairs or repeats item `3` when Core injects a revision task before the open review slot.

### Tests
- Targeted release-feedback suites passed for `managed-git-stage-gate`, `workflow-agent-acceptance-feedback`, `quality-gates-continuation-dispatcher`, and `managed-quality-gates-plan-mutator`.

## [1.2.239] - 2026-05-12
### Added
- **Quality Gates managed orchestration lifecycle.** Core now drives Quality Gates Baseline through dynamic child-plan task-pair injection: draft (`docs: draft quality gates contract`), per-revision review (`docs: revise quality gates contract - revision N`), Core-owned acceptance (`docs: accept quality gates contract`), integration (`feat: integrate quality gates baseline`), repair attempts (`docs: repair quality gates <phase> attempt N`), and post-completion user-return revisions (`docs: revise quality gates user return revision N`).
- **Quality Gates accept-contract runner and HTTP endpoint.** Typed and UI Quality Gates acceptance both route through the Core-owned runner: the runner injects the acceptance task pair, patches `quality-gates.json` (`accepted: true`), and marks the session for the integration continuation.
- **Quality Gates contract guard, feedback, and repair orchestration.** Every Core rejection requests a concrete repair (no "do nothing" responses) and commits either a valid owned diff or tracked attempt evidence under `.codeai-hub/<slug>/quality_gates/attempts/`.
- **Committed-evidence stage-light truth.** A new helper derives Application Skeleton / Quality Gates completion from `workspace.plan.md` `acceptedCommits`, keeping completed upstream LEDs green even while downstream stages are dirty.

### Changed
- **Static Quality Gates follow-up seeding removed.** The bundled managed-plan shim creates only the draft task pair and grows the child plan dynamically through the new Quality Gates plan mutator.
- **Quality Gates hook integration validates against the managed hook registry section** instead of matching gate ids anywhere in the hook file.
- **Quality Gates agent prompt and contract** make acceptance a Core-owned boundary: the agent never flips `accepted: true` or starts integration in the same turn that carries a user acceptance phrase.

### Tests
- 65/65 Quality Gates-related tests pass across plan mutator, accept-runner, continuation dispatcher, contract guard, repair orchestration, user-return revision, hook registry, bundled templates, and managed transaction commit.

## [1.2.238] - 2026-05-11
### Fixed
- **Application Skeleton stays green after completion.** A global managed dirty-state no longer sets `gating.blocked.application_skeleton` after Application Skeleton is materialized. Starting the next technical step can block that current/downstream target, but it must not recolor the completed upstream stage.

### Deferred
- **Quality Gates scenario work remains out of scope.** This release does not implement or redesign Quality Gates orchestration; its planning document and TODO plan will be created later as a separate scope.

### Tests
- Targeted LED-boundary suite passed: `12/12` tests across managed Git gating and Application Skeleton progress.
- `npm run build --workspace packages/core` and `npm run plan:validate` both pass before release packaging.

## [1.2.237] - 2026-05-11
### Fixed
- **Application Skeleton misplaced product-parts materialization is now actionable.** When Core detects `.codeai-hub/<workspace>/product-parts/**` after Application Skeleton materialization, it tells the provider to move the projection to root `product-parts/**` and remove the misplaced copy instead of sending a wait-only lifecycle-boundary message.
- **Application Skeleton no longer appears complete before materialization.** Workflow-state hydration downgrades stale completed markers when materialized progress is unavailable, keeping Quality Gates blocked until the managed lifecycle is actually ready.
- **Application Skeleton repair commits can complete materialization.** A successful `docs: repair application skeleton phase3.materialize attempt N` commit with root `product-parts/**` now opens the persistent user-return phase, creates the Quality Gates child plan, and advances the workspace ledger to `activeStage: "quality_gates"`.

### Tests
- Targeted repair suite passed: `27/27` tests across Application Skeleton feedback, plan mutator, workflow-state progress, and the managed plan shim.
- `npm run build --workspace packages/core` and `npm run plan:validate` both pass before release packaging.

## [1.2.236] - 2026-05-11
### Fixed
- **Application Skeleton creates the Quality Gates child plan before handoff.** After `feat: materialize application skeleton`, the generated managed shim now creates `doc/TODO/stages/quality-gates/todo-plan.md`, includes it in the workspace-ledger commit, switches `workspace.plan.md` to `activeStage: "quality_gates"`, and leaves the managed workspace Git status clean.
- **Application Skeleton Phase 2 review anchors close on acceptance.** When the user accepts the draft without a review revision, Core marks the open review anchor and its paired revision commit as completed with a not-created marker, preventing stale `IN_PROGRESS` review state after acceptance/materialization.

### Tests
- Targeted handoff suite passed: `13/13` tests across the managed plan shim and Application Skeleton plan mutator.
- `npm run build --workspace packages/core` and `npm run plan:validate` both pass before release packaging.

## [1.2.235] - 2026-05-11
### Fixed
- **Virtual Simulation alias artifacts are recovered before gating.** If a provider writes `virtual-simulation.md` into `.codeai-hub/<workspace>/virtual-simulation/` instead of canonical `.codeai-hub/<workspace>/virtual_simulation/`, Core moves it into the canonical directory during workflow-state filesystem hydration.
- **Diagram Modules no longer blocks on a false missing Virtual Simulation artifact.** The next-step gate now sees the recovered canonical `virtual_simulation/virtual-simulation.md` before validation and readiness checks.

### Tests
- Targeted workflow-state alias recovery suite passed: `5/5` tests across filesystem hydration and workflow-state behavior.
- `npm run build --workspace packages/core` and `npm run plan:validate` both pass before release packaging.

## [1.2.234] - 2026-05-11
### Fixed
- **Managed stage plans are created progressively again.** Starting Diagram Modules now creates the active Diagram Modules child plan only; Application Skeleton and Quality Gates child plans are not pre-seeded as ACTIVE future-stage plans.
- **Post-turn arbitration is scoped to the active provider stage.** Diagram Modules turns can no longer trigger Application Skeleton repair orchestration or mutate the Application Skeleton child plan before Diagram Modules is accepted.
- **Diagram Modules index has its own commit boundary.** A dirty or uncommitted `product-parts.index.md` stays on the index subturn until Core commits it, then advances to the first Product Part.
- **Dirty pending Diagram Modules state is visible.** Core-owned dirty commit-gate feedback is emitted even when the active subturn is pending, preventing the silent wait observed in v1.2.233.

### Tests
- Targeted managed stage isolation suite passed: `39/39` tests across managed plan bootstrap, session-create stage routing, post-turn stage scope, Diagram Modules progress, and Diagram Modules feedback.
- `npm run build --workspace packages/core` and `npm run plan:validate` both pass before release packaging.

## [1.2.233] - 2026-05-11
### Changed
- **Clean retest rebuild after clearing old local tails.** Repackages the Application Skeleton managed lifecycle upgrade fix from v1.2.232 under a fresh version so Project Manager and the extension runtime can be tested from a clean install state.

### Tests
- Rebuild target remains the v1.2.232 managed lifecycle fix: Core commits managed workspace lifecycle/shim upgrades before Application Skeleton provider work, and Application Skeleton out-of-owner dirty feedback stays non-actionable for the provider.

## [1.2.232] - 2026-05-11
### Fixed
- **Application Skeleton no longer stalls on managed lifecycle shim upgrades after extension reinstall.** Existing managed workspaces now commit Core-owned lifecycle updates, including `scripts/plan-orchestrator/plan-cli.mjs`, before Application Skeleton provider work starts. This prevents the upgraded shim from appearing as out-of-stage dirty state and blocking the draft artifact commit.
- **Application Skeleton out-of-owner dirty feedback is non-actionable for the provider.** Core now tells the agent to wait for Core lifecycle-boundary repair instead of sending artifact edit instructions when the blocker is a Core-owned managed lifecycle file.

### Tests
- Added managed workspace lifecycle regression coverage for upgrading an existing workspace with a stale committed plan shim before Application Skeleton starts.
- Added Application Skeleton feedback regression coverage for out-of-owner dirty blockers.
- Targeted lifecycle suite passed: `11/11` tests. `npm run build --workspace packages/core` and `npm run plan:validate` both pass before release packaging.

## [1.2.231] - 2026-05-11
### Fixed
- **Application Skeleton unlocks after Core restart/reinstall when Diagram Modules artifacts are valid.** Volatile Core metadata such as `.codeai-hub/state/task-timers.json` and timestamp-only `.codeai-hub/<workspace>/description/description-step.json` refreshes no longer count as managed dirty state for downstream gate blocking.
- **The misleading `product-parts.index.md not found` blocker is removed for the restart path.** Workflow-state recovery now reports `gating.blocked.application_skeleton: false` when the Product Parts index and Product Part artifacts are present and valid on disk, even if Core refreshed its own runtime metadata after reinstall.

### Tests
- Added managed Git status coverage for volatile Core metadata after restart.
- Added workflow-state regression coverage for a restarted Core with valid Diagram Modules artifacts and only volatile metadata dirty state.
- Targeted restart-gate suite passed: `9/9` tests. `npm run build --workspace packages/core` and `npm run plan:validate` both pass before release packaging.

## [1.2.230] - 2026-05-11
### Fixed
- **Application Skeleton now uses the managed dynamic plan lifecycle.** The generated child plan starts with the draft contract task and grows at runtime for Core rejection repairs, review revisions, explicit acceptance, materialization, and post-completion user-return revisions. User-visible Core correction turns and user-return edits now receive concrete microtasks with paired `Git Commit` lines.
- **Acceptance and materialization are committed at separate boundaries.** Core commits the accepted contract state before requesting materialization, and materialization can start only after that acceptance commit evidence exists in the workspace ledger.
- **Rejected Application Skeleton attempts are preserved.** Invalid retry attempts write tracked evidence under `.codeai-hub/<workspace>/workflow/revisions/application-skeleton/attempts/` and are committed, so failed Core-agent repair loops remain visible in Git history.

### Tests
- Targeted Application Skeleton managed-workflow suite passed: `80/80` tests.
- `npm run build --workspace packages/core` and `npm run plan:validate` both pass before release packaging.

## [1.2.229] - 2026-05-11
### Fixed
- **Diagram Modules user-return revisions now have commit pairs.** After all Product Parts are accepted, Core opens `diagram-modules.user-return.revision1.task1` with a paired `Git Commit` instead of the v1.2.228 no-commit `diagram-modules.user-return.task1` anchor. Each committed user-return revision opens the next `revisionN` task and commit pair, preserving the phase as an ongoing return surface without losing Git history.
- **Post-completion Project Manager edits are committed.** A user-requested update to `product-parts/project-manager.md` after Diagram Modules completion now routes through the managed documentation commit transaction and is committed as `docs: revise diagram modules user return revision N` instead of being left as Core-owned dirty state with no expected commit.

### Tests
- Added installed-shim coverage for final Product Part -> `revision1` and revision commit -> `revision2`.
- Added managed commit transaction coverage for a user-requested Project Manager artifact revision after Diagram Modules completion.
- Targeted Diagram Modules managed-workflow suite passed: `26/26` tests. `npm run build --workspace=@codeai-hub/core` and `npm run plan:validate` both pass.

## [1.2.228] - 2026-05-11
### Fixed
- **Diagram Modules Core rejection lifecycle.** Core now turns every rejected Diagram Modules provider-visible correction into a managed `repairN` microtask pair before sending feedback to the agent. The rejected task and paired commit line are blocked, the repair task becomes the only current child-plan task, and the repair commit message is pinned to the target artifact and attempt number.
- **Rejected repair attempts are committed.** If the repair attempt still fails validation or produces no accepted artifact diff, Core writes tracked JSON evidence under `.codeai-hub/<workspace>/workflow/revisions/diagram-modules/attempts/` and commits the repair attempt instead of losing it in session/runtime state. Repair commits no longer make dirty Product Part files look accepted.
- **Persistent Diagram Modules return phase.** After all Product Parts are accepted, Diagram Modules now opens `diagram-modules.user-return.task1` with `expected commit: none` instead of the old one-shot review commit. The workspace ledger unlocks Application Skeleton separately, so users can return to Diagram Modules later without blocking downstream handoff.

### Tests
- Added deterministic forced-rejection integration coverage: valid Product Part index, invalid Product Part artifact, `repair1` injection before feedback, repair feedback payload, failed-attempt evidence, managed repair commit, and clean temp workspace.
- Targeted Diagram Modules managed-workflow suite passed: `25/25` tests. `npm run build --workspace=@codeai-hub/core` and `npm run plan:validate` both pass.

## [1.2.227] - 2026-05-11
### Fixed
- **Application Skeleton Phase 4 handoff anchor regex match (Phase 30 retest follow-up).** Phase 30 retest of v1.2.226 confirmed end-to-end acceptance and materialization land cleanly through `b5049d1` (Phase 3 commit). However the Phase 4 handoff seed line in `managed-todo-tree.ts` did not contain the literal `expected commit:` substring (it said `(scope: chat/process observation only; no commit required)` instead), so `TASK_LINE_RE` in `managed-plan-orchestrator-shim-source.ts` (which requires `.*expected commit: (?:\`([^\`]+)\`|none)`) could not match it. After Phase 3 materialize commit, advancement could not find the next task line and fell into the fallback-insert branch (`managed-plan-orchestrator-shim-source.ts:242–259`), synthesizing a `phase3.materialize.task2` continuation pair with the same commit message `feat: materialize application skeleton` and producing a visible duplicate Pin 7 in the plan with `phase3.materialize.task2` stuck IN_PROGRESS.
- **Single-line seed fix.** The handoff seed line now reads `(scope: chat/process observation only; expected commit: none — reserved handoff anchor)`. The task id and stream heading are unchanged. Post-Phase-3-materialize advancement now lands on `application-skeleton.handoff.task1` with `expectedCommitMessage: null`; no fallback-insert pollution; the workspace stage transition mapping switches `activeStage` to `quality_gates` through the normal `recordWorkspaceCommit` path.

### Tests
- 57/57 targeted Core tests pass across the shim, seed-shape, development-tree bootstrap gate, acceptance writer, runner, handler, continuation dispatcher, post-turn service, end-to-end, and workflow-session managed-workspace modules. The existing handoff regex assertions only pin the task id and heading text; the new "expected commit" clause does not break them.
- `npm run build --workspace @codeai-hub/core` and `npm run typecheck:webview` both clean.

### Manual upgrade note
- Test workspaces that already ran the Phase 30 retest of v1.2.226 have a polluted plan (synthesized `phase3.materialize.task2` continuation pair). Before installing v1.2.227, delete `doc/TODO/stages/application-skeleton/todo-plan.md` in those workspaces so the new seed (with the regex-matchable handoff anchor) is generated fresh on the next workflow tick. Fresh workspaces are not affected.

## [1.2.226] - 2026-05-11
### Fixed
- **Application Skeleton acceptance callback wiring (release-blocker for v1.2.225).** Phase 26 retest of v1.2.225 confirmed the writer/runner from Phase 24 are correct and unit-tested, but the typed-fallback router's optional `handleManagedAcceptContractCommand` callback was never assigned in production. `grep -rn "handleManagedAcceptContractCommand:" packages/core/src` (excluding tests) returned exactly one match — the **read** site `session-request-handler-message-dispatch.ts:183` — and zero **write** sites. The optional chain at `application-skeleton-typed-acceptance-router.ts:31` therefore silently no-op'd, runner never executed, map.json never patched, no Phase 2 commit, no Phase 3 continuation. The Phase 5.accept.task3 audit had explicitly recorded this as debt ("production wiring of the Core handler into the dispatch deps remains a follow-up via the new optional callback"); the Phase 16 and Phase 24 audits both relied on a (incorrect) agent report claiming the callback was wired. Reality grep proves otherwise.
- **Wiring closed in three composition layers + two interface layers.** `remote-bridge-bootstrap.ts` adds `handleManagedAcceptContractCommand: (params) => workflowStateService?.managedPostTurnService.handleApplicationSkeletonAcceptContractCommand(params) ?? Promise.resolve(undefined)` to the `SessionRequestHandler` options, mirroring the existing late-bound `onTurnCompleted` pattern (the `workflowStateService` is forward-declared on line 86 and assigned on line 116). `session-request-handler.ts` forwards the option into `createSessionRequestHandlerRuntime`. `session-request-handler-runtime-core.ts:267–280` hands it to the `SessionRequestHandlerMessageDispatch` factory deps. The interface field is mirrored in `session-request-handler-types.ts::SessionRequestHandlerOptions` and `session-request-handler-runtime-types.ts::SessionRequestHandlerRuntimeDependencies`.
- **End-to-end pipeline now closed.** Typed-fallback router → `handleApplicationSkeletonAcceptContractCommand` on `ManagedWorkflowPostTurnService` → `managed-stage-accept-contract-runner.ts` → `writeApplicationSkeletonAcceptance` → `application-skeleton-map.json::accepted: true` → managed commit gate auto-commits `docs: accept application skeleton contract` (Phase 2) → next read-model snapshot reports `progress.accepted === true` → `sendApplicationSkeletonContinuationIfReady` fires Phase 3 materialization prompt. PM Accept Contract button (via HTTP endpoint) funnels through the same runner.

### Tests
- 43/43 targeted Core tests pass across the writer, runner, handler, continuation dispatcher, post-turn service, and end-to-end modules. The wiring change is structural; existing unit tests with DI mocks continue to lock down the runtime contract.
- `npm run build --workspace @codeai-hub/core` and `npm run typecheck:webview` both clean.

## [1.2.225] - 2026-05-11
### Fixed
- **Application Skeleton acceptance write-path completed (Variant A — Core runner owns the `accepted: true` write).** Phase 22 retest of v1.2.224 confirmed the recognizer length-cap (the session bootstrap reaches codex-cli, Phase 1 draft commits cleanly), but typed acceptance attempts were silently dropped: Core log showed `Skipping managed contract acceptance phrase, phrase: "Подтверждаю контракт" / "Accept Contract"` with no follow-up `Dispatching message to provider adapter`, no Phase 2 accept commit, no Phase 3 continuation. Root cause: a Phase 5 design hole that survived through Phase 16 — every acceptance entry point (PM Accept Contract button via HTTP endpoint, typed-fallback recognizer router, Core accept-contract handler decision) only set the in-memory `recentlyAcceptedSessions` Set; nobody patched `application-skeleton-map.json::accepted: true`. The Phase 3 continuation dispatcher (Stream 16D Option C) gates on `progress.accepted === true` reading the file, so it never fired.
- **New writer module** `application-skeleton-acceptance-writer.ts`: pure helper that reads the map file, patches `accepted: true` (and `reviewState: "accepted"` when the prior reviewState was draft; materialized state is preserved), and writes the file back. Idempotent — re-entry on an already-accepted map returns `noop` without touching the file. Returns `path_unresolved` / `map_missing` / `invalid_json` failure states for caller observability.
- **Runner integration in `managed-stage-accept-contract-runner.ts`.** On `evaluateApplicationSkeletonAcceptContractCommand` returning `kind: "accepted"`, the runner calls the writer before `markAccepted` + `handle`. Writer-injection is dependency-injected (`writeAcceptanceFlag?` deps callback) for testability; production wiring uses the default `writeApplicationSkeletonAcceptance` import. The writer result is logged on `Application Skeleton acceptance map.json write` so operators see whether the patch landed (`patched` / `noop` / `map_missing` / etc.) without crawling the filesystem.
- **Both PM button and typed-fallback funnel through the same runner.** The HTTP endpoint `/api/v1/orchestrator/managed-stage-accept-contract` and the typed-fallback router both call `handleApplicationSkeletonAcceptContractCommand` on `ManagedWorkflowPostTurnService`, which delegates to the same runner instance. Variant A single-owner contract holds for both.

### Tests
- 43/43 targeted Core tests pass across `application-skeleton-acceptance-writer.test.ts` (7 new tests), `managed-stage-accept-contract-runner.test.ts` (3 new tests — patch on accept, no-write on reject, writer-status forwarded into log payload), `managed-stage-accept-contract-handler.test.ts` (8), `application-skeleton-continuation-dispatcher.test.ts` (8), `managed-workflow-post-turn-service.test.ts` (15, including the Phase 20 release-blocker recognizer guard), `application-skeleton-end-to-end.test.ts` (2).
- `npm run build --workspace @codeai-hub/core` and `npm run typecheck:webview` both clean.

## [1.2.224] - 2026-05-11
### Fixed
- **Release-blocker hot-fix: Application Skeleton session never started under v1.2.223.** The Phase 16E broadening of `recognizeManagedContractAcceptancePhrase` (bare `accept`/`accepted` verbs without the mandatory `контракт` noun) matched Core's ~100 KB bootstrap prompt because the prompt contains instructional text about the PM "Accept Contract" button. The Application Skeleton typed-fallback router (`application-skeleton-typed-acceptance-router.ts`) intercepted the bootstrap prompt as a typed acceptance and refused to deliver it to codex-cli, so the agent session never started. Symptom in Core log: `Session message received contentLength: 107827` immediately followed by `Skipping managed contract acceptance phrase, phrase: "Accept Contract"` and no `Dispatching message to provider adapter` line; the seeded `doc/TODO/stages/application-skeleton/todo-plan.md` existed but no agent jsonl was ever written. The hot-fix adds a 200-character length cap at the top of `recognizeManagedContractAcceptancePhrase`. Short user-typed phrases (1–50 chars, the realistic acceptance phrase shape) continue to match the Phase 16E broadened recognizer; multi-paragraph Core bootstrap prompts (10 KB–200 KB) are excluded before regex matching. A new regression test (`recogniser rejects long-form prompts that incidentally contain acceptance verbs (release-blocker regression guard)`) locks down the v1.2.223 failure mode.

### Tests
- 33/33 targeted Core tests pass across `managed-workflow-post-turn-service.test.ts` (15 — including the new regression guard), `application-skeleton-end-to-end.test.ts`, `application-skeleton-continuation-dispatcher.test.ts`, and `managed-stage-accept-contract-handler.test.ts`.
- `npm run build --workspace @codeai-hub/core` and `npm run typecheck:webview` both clean.

## [1.2.223] - 2026-05-11
### Fixed
- **Application Skeleton acceptance flow refactor (Option C).** The Phase 2 retest of v1.2.222 exposed five orthogonal defects in the Application Skeleton acceptance machinery. This release lands the Option C reconciliation:
  - **Phase 2 stage plan restructure.** The Application Skeleton seed in `managed-todo-tree.ts` now pins Phase 2 as `task + Git Commit (docs: accept application skeleton contract)`, symmetric with Phase 1 and Phase 3. Acceptance commit policy moves from Option B (folded into Phase 3 transition) to Option C (explicit accept commit observable in the managed plan).
  - **Core map.json observer.** `application-skeleton-continuation-dispatcher.ts::sendApplicationSkeletonContinuationIfReady` now gates on `progress.accepted === true` plus `progress.substep !== "artifact"` and `!progress.materialized`. The `recentlyAcceptedSessions` marker stays as an optional hint, no longer the exclusive gate. Any path that records `accepted: true` in `application-skeleton-map.json` (Core handler, PM button, typed-fallback, agent self-set) triggers Phase 3 continuation.
  - **Application Skeleton feedback visibility.** `workflow-agent-acceptance-feedback.ts` drops `turnOptions: { userMessageVisibility: "deferred" }` from feedback dispatches. Core corrective prompts are now plain-string payloads appended to the codex-cli session jsonl as visible `role: "user"` entries — aligned with the Diagram Modules continuation dispatcher pattern. PM transcript shows what Core told the agent.
  - **Acceptance phrase recognizer broadening.** `recognizeManagedContractAcceptancePhrase` accepts bare Russian verbs (`принимаю`/`подтверждаю`/`утверждаю`) and bare English acceptance verbs (`accept`/`accepted`/`confirm`/`confirmed`/`approve`/`approved`) without requiring the noun `контракт`. Negated forms (`не принимаю …`, `not accepted`, `don't accept`, `cannot confirm`) still resolve to `null`. Word boundaries use Unicode-aware lookaround (`(?<!\p{L})…(?!\p{L})`) so cyrillic letters match correctly.
  - **`materializedPaths` normalization.** `application-skeleton-materialization-validator.ts` trims whitespace, strips trailing slashes, and deduplicates `materializedPaths` entries before checking filesystem existence. Noisy-but-real path lists from the agent (directories with trailing slashes, blank lines) no longer raise spurious `application skeleton materializedPath is missing: …` validation errors.

### Documentation
- `WorkflowSteps_Overview.md` and `Application_Skeleton_Architecture.md` document the Option C acceptance flow, the broadened recognizer, visible feedback dispatch, and `materializedPaths` normalization.

### Tests
- 67/67 targeted Core tests pass across the touched managed-workspace, development-tree, and remote-bridge handler modules. The end-to-end fixture (`buildAwaitingAcceptanceProgress`) was re-pinned to the Option C invariant (`accepted: true`, `substep: "accepted"`).
- `npm run build --workspace @codeai-hub/core` and `npm run typecheck:webview` both clean.
- Six pre-existing baseline failures from Phase 12 (auto-commit suites in `workflow-state-managed-documentation-commit.test.ts` and acceptance-feedback scenarios in `workflow-state-service-development-tree-bootstrap.test.ts`) remain out of scope for this refactor.

## [1.2.222] - 2026-05-11
### Fixed
- **Application Skeleton advancement-skip bug.** The managed plan orchestrator's `TASK_LINE_RE` regex in `managed-plan-orchestrator-shim-source.ts` now accepts both backticked `expected commit: \`<message>\`` lines and open-ended `expected commit: none — open until acceptance` lines. Before this fix, the post-commit scan silently skipped Pin 3 (`application-skeleton.phase2.review.task1`, open-ended user-led review) and jumped `currentTaskId` straight to the next backticked task — Pin 4 (`application-skeleton.phase3.materialize.task1`). After the fix, the open-ended review task receives `expectedCommitMessage: null` and `currentTaskId` lands on the review phase, exactly as the stage seed prescribes. A regression test in `managed-plan-orchestrator-installer.test.ts` locks down the post-draft advancement order.
- **Phase numbering refactor — plain `Phase 1 / Phase 2 / Phase 3`.** Task IDs across the Application Skeleton seed, classifier consumers, fixtures, and SSOT prose are renamed from `phase1a` / `phase1b` / `phase2.materialize` to plain `phase1` / `phase2` / `phase3.materialize` so the task IDs read consistently with the managed plan headings (`Phase 1` / `Phase 2` / `Phase 3`). Renamed surfaces include:
  - `managed-todo-tree.ts` stage seed (task IDs + stream-heading prefixes); the Development Tree bootstrap gate target id realigns from `application-skeleton.phase2.materialize.task1` to `application-skeleton.phase3.materialize.task1`.
  - Internal `ApplicationSkeletonPhase` classifier values (`phase_1a_draft` / `phase_1b_review` / `phase_2_materialization` → `phase_1_draft` / `phase_2_review` / `phase_3_materialization`); `phase_handoff` stays.
  - Dynamic revision injection labels (`phase1b.review.revisionN.task1` → `phase2.review.revisionN.task1`) in `managed-documentation-commit-transaction.ts` and `application-skeleton-revision-injection-runner.ts`.
  - Per-revision managed commit message text: `docs: revise application skeleton contract — phase 1B revision N` → `docs: revise application skeleton contract — revision N` (the embedded phase-type label is dropped because Type B is a domain attribute, not commit text).
  - All eight handler / managed-workspace test fixtures and the end-to-end test.
- **SSOT sync.** `WorkflowSteps_Overview.md` and `Application_Skeleton_Architecture.md` are updated to describe the shipped `Phase 1 → Phase 2 → Phase 3` model and clarify that Type A / Type B describes phase ownership, not the phase number.

### Tests
- 54/60 targeted Core handler, managed-workspace, development-tree and end-to-end tests pass after the refactor. 6 pre-existing baseline failures (`workflow-state-managed-documentation-commit.test.ts` auto-commit suites and `workflow-state-service-development-tree-bootstrap.test.ts` acceptance-feedback scenarios) were verified to exist on the v1.2.221 baseline (commit `68742258e`) and are out of this scope; one previously failing bootstrap test now passes after the rename.
- `npm run build --workspace @codeai-hub/core` and `npm run typecheck:webview` both clean.

## [1.2.221] - 2026-05-10
### Added
- **Application Skeleton Phase B orchestration pilot.** The Application Skeleton stage now runs as an explicit `Phase 1A → Phase 1B → Phase 2` sequence with the following surfaces:
  - **Phase classifier** (`application-skeleton-phase-state.ts`) maps progress snapshots to `phase_1a_draft` / `phase_1b_review` / `phase_2_materialization` / `phase_handoff`.
  - **Phase 1A structural guard** (`application-skeleton-contract-guard.ts`) implements the Observe-vs-Dispatch rule and Readiness Resolution table: terminal + owned diff = implicit readiness; terminal + no diff in Phase 1A = a single non-commit `repair_no_progress` corrective turn; structurally invalid drafts emit `repair_invalid_draft` with the gaps; phases outside Phase 1A are noop.
  - **Phase 1A corrective feedback** (`application-skeleton-contract-feedback.ts`) is a pure prompt-builder that produces content-readiness wording without ever asking the agent to run Git, staging, or plan commands.
  - **Phase 1B revision-vs-discussion classifier** (`application-skeleton-review-turn-classifier.ts`): tracked owned diff = revision (Core injects a `phase1b.review.revisionN.task1 + Git Commit` pair before the open-ended review task and the managed commit boundary fires `docs: revise application skeleton contract — phase 1B revision N`); no owned diff = discussion / no-op recorded only in standard session history.
  - **Phase 1B revision injection** in the Application Skeleton stage plan (`application-skeleton-revision-injection-runner.ts` + helper in `managed-documentation-commit-transaction.ts`) and the per-phase managed commit boundary (`workflow-state-managed-documentation-commit.ts`) now reused for Phase 1A draft, every Phase 1B revision, and Phase 2 materialization.
  - **Core-owned Accept Contract command** (`managed-stage-accept-contract-handler.ts` pure decision + `managed-stage-accept-contract-runner.ts` async runner) validates Phase 1B preconditions (Core-clean draft, no uncommitted owned diff, no out-of-owner dirty paths) and routes the session through the existing Phase 2 dispatcher (Acceptance Commit Policy: Option B — acceptance folded into the Phase 2 transition).
  - **HTTP transport** at `POST /api/v1/orchestrator/managed-stage-accept-contract` (`http-api-managed-stage-accept-contract.ts`); transport-only handler that parses the body and delegates to the Core decision.
  - **Typed-fallback router** (`application-skeleton-typed-acceptance-router.ts`) routes recognized acceptance phrases through the same Core handler when the Application Skeleton stage is acceptance-eligible; the matched phrase is never delivered to the provider as a regular user message.
  - **Project Manager Accept Contract button** (`application-skeleton-accept-contract-button.tsx`) and HTTP client (`managed-stage-accept-contract-client.ts`); disabled-state reasons are derived from the workflow-state read-model only — the button never queries Core gating logic on its own.
  - **Premature-materialization validator** (`application-skeleton-premature-materialization-validator.ts`) derives the blocked path set from the Application Skeleton map (declared `materializedPaths` plus every productPart / cluster / module `codePath`) and runs from both Phase 1A and Phase 1B post-turn structural guards. Any owned write inside that scope before T3 acceptance produces a single corrective `repair_premature_materialization` turn at the readiness + terminal boundary; the block lifts the moment the Accept Contract command fires.
  - **Phase 2 dispatcher gate** (`application-skeleton-continuation-dispatcher.ts`) only emits the materialization continuation prompt when the post-turn arbitration runs, the session is present in the Core-owned `recentlyAcceptedSessions` marker set, and the substep is at least `awaiting_acceptance` and not yet `materialized`. User text alone never authorizes Phase 2.
  - **Stage plan seed** (`managed-todo-tree.ts`) is reshaped to seed Phase 1A draft, Phase 1B open-ended review, Phase 2 materialization, and a reserved post-closeout handoff anchor for Application Skeleton; the legacy `application-skeleton.stream1.task2` materialization gate identifier in `development-tree-bootstrap-gate.ts` is realigned to `application-skeleton.phase2.materialize.task1`, and the three core fixture tests that hardcoded the legacy ids are migrated to the phased ids.

### Tests
- **End-to-end A→B→A regression** (`application-skeleton-end-to-end.test.ts`) now exercises the classifier, structural guard, premature validator, review-turn classifier, and accept-contract command on a single fixture chain.
- **HTTP transport tests** (`http-api-managed-stage-accept-contract.test.ts`) cover the missing-sessionId path, the accepted JSON shape, the typed-fallback `source` round-trip, and the rejected-with-reasons path.
- **PM client and button tests** (`managed-stage-accept-contract-client.test.ts` + `application-skeleton-accept-contract-button.test.tsx`) cover the request body, accepted/rejected decisions, the typed-fallback source, and the button disabled-state under SSR.
- All 67 targeted Core handler tests, both PM service / button tests, `npm run build --workspace @codeai-hub/core`, and `npm run typecheck:webview` pass clean for this scope.

### Documentation
- `WorkflowSteps_Overview.md` and `Application_Skeleton_Architecture.md` document the shipped Phase 1A/1B/2 model, the Core-owned command surface, the Observe-vs-Dispatch rule, and the premature-materialization block. `SystemArchitecture.md` carries a top-of-file pointer to those updated docs.

### Repaired side-effects
- One unrelated baseline regex mismatch in `session-request-handler-workflow-session.managed-workspace.test.ts` (`DIAGRAM_MODULES_PLAN_COMMIT_RE`) was fixed opportunistically because the regex sat in a file already touched by this scope.

## [1.2.220] - 2026-05-10
### Fixed
- **Single source of truth for managed-workflow context bundle.** Core gains `buildManagedWorkflowContextBundleForInitialStage` (a thin adapter over the existing `buildManagedWorkflowContextBundle`) and a new HTTP endpoint `/api/v1/orchestrator/managed-context-bundle` that returns the assembled bundle text. Project Manager's `managed-workflow-initial-context.ts` is rewritten as a thin HTTP wrapper that fetches the assembled bundle and embeds it verbatim; PM no longer reads `doc/TODO/workspace.plan.md` directly nor parses workspace ledger / stage todo-plan state. This removes the dual-builder drift surfaced during the 1.2.219 retest where PM's reads were silently rejected by the workflow-artifact endpoint allowlist (only `.codeai-hub/<slug>/...` paths were permitted) and produced `activeStage: null` for managed stages.

### Tests
- **3 new test commits** cover the Core endpoint round-trip (positive, unsupported stage, missing workspacePath), and the rewritten PM HTTP wrapper (verbatim relay, non-managed-stage shortcut, endpoint failure). Targeted node:test runner reports 8/8 PASS across Phase 11 spec files.

## [1.2.219] - 2026-05-10
### Fixed
- **Managed-workspace stage advance now writes `activeStage`.** The embedded plan-orchestrator shim's `recordWorkspaceCommit` consults `STAGE_TERMINAL_COMMITS` and `NEXT_STAGE_AFTER` mappings (exported from `managed-todo-tree`) to roll `workspace.plan.md` forward when a stage's terminal commit lands (`docs: review diagram modules product map`, `feat: materialize application skeleton`, `feat: integrate quality gates baseline`). The previously-large installer file is split into a dedicated shim-source module so each file stays under the 500-line architecture limit.
- **Managed contract acceptance recogniser accepts natural Russian phrasings.** `recognizeManagedContractAcceptancePhrase` replaces exact-match `localeCompare` against three canonical strings with a normalised contains-keyword recogniser that requires an acceptance verb (`принимаю` / `подтверждаю` / `утверждаю`) plus the noun `контракт` and rejects negated forms (`не принимаю …`). Recognition is gated on acceptance-eligible Type B sessions via `recognizeManagedAcceptanceForStage` so non-managed stages stay unaffected.
- **Application Skeleton materialisation continuation dispatcher.** A new `application-skeleton-continuation-dispatcher` mirrors the Diagram Modules pattern: after Core registers an acceptance command on a session in awaiting-acceptance state, the dispatcher emits an explicit Phase 2 materialisation prompt to the agent. `ManagedWorkflowPostTurnService` tracks recently-accepted sessions in-memory and clears the marker once `applicationSkeletonProgress.materialized` is observed, so the dispatcher does not refire after materialisation completes.

### Tests
- **8 new test commits landed alongside the Phase 10 fixes** covering the stage advance writer, broadened acceptance phrase variants, dispatcher gating + dedup, completion observer flip detection, end-to-end chained surfaces and a forced-rollover Phase B regression. Targeted node:test runner over six Phase 10 spec files reports 26/26 PASS.

## [1.2.218] - 2026-05-10
### Fixed
- **Managed feedback ownership leak removed from corrective text.** `managed-git-stage-gate` and the workflow agent acceptance feedback no longer ask the provider to commit/clean files or run Git commands; corrective wording is now neutral content-readiness ("Core has not yet finalized the managed commit … respond with a content-readiness note", "Core is blocked by unrelated dirty paths … provider should not act on this").
- **Post-turn arbitration deduplicates terminal events.** `SessionProviderEventRouter` computes a Core-normalized terminal-event identity (provider id/timestamp + Core-owned monotonic fallback) and tracks a per-session processed-event ledger; duplicate `turn_completed` / `turn_failed` deliveries are no-op. `ManagedWorkflowPostTurnService` adds an in-flight guard so concurrent post-turn invocations do not re-enter arbitration.
- **Per-stage managed arbitration retry guard.** Managed post-turn now counts attempts per `(sessionId, stage)` and resets when managed Git becomes clean for owned files. A configurable retry limit (default `N=5`) emits a structured `ManagedArbitrationRetryNotice` and pauses dispatch when exceeded.
- **Inbound managed contract acceptance commands.** Phrases "Подтверждаю контракт", "Принимаю контракт", "Утверждаю контракт" are recognized in user input via full-message normalization (trim, collapse whitespace, case-insensitive); matched messages skip provider dispatch and route as Core-owned acceptance commands. `ManagedWorkflowPostTurnService.handleContractAcceptance` resets the retry counter, logs the acceptance, and re-runs arbitration.
- **Managed commit boundary generalized across phases.** Owned-path filtering is now strategy-driven per managed stage; Diagram Modules keeps its per-task narrowing while Application Skeleton and Quality Gates use the existing dirtyByStage allowlist with shared stage-aware structure.
- **Managed Core message channels split.** The workflow events feed now carries `type: "managed.core.message"` events for live UI delivery (kind: `managed_corrective` | `managed_continuation` | `managed_acceptance_check` | `managed_post_turn_decision`). A durable `<basename>.audit.jsonl` audit stream is appended alongside the primary provider session log via `UnifiedSessionStorage.appendManagedAuditRecord`; provider replay, rollover prompts, transcript reconstruction, and dialog history reader ignore the audit suffix.
- **Managed rollover envelope preserves resumed microtask state.** Documentation continuation envelope keeps the Core-built workflow contract, managed context bundle (active stage, active plan path, current task, expected commit, last recorded commit, accepted commits), Continuation Mode marker, last user-visible assistant message, and current user message; for managed stages it now appends an explicit `## Artifact Mode` marker `artifact_mode: continue_active_microtask` so agents do not fall back to `create_initial_draft` on resumption. Non-managed stages (`description`, `virtual_simulation`) keep the prior cold-start envelope unchanged.

### Tests
- **17 commits worth of regression coverage landed alongside the runtime fixes:** managed feedback ownership wording, terminal-event dedup with provider id and timestamp fallbacks, retry-limit notifier, managed contract acceptance recognition, managed commit boundary refactor, managed audit append/skip-on-unknown-session, managed audit isolation by filename, managed rollover envelope shape for Application Skeleton and Quality Gates, non-managed rollover preservation, materialization validator happy path, Quality Gates awaiting-acceptance gate, and Diagram Modules subturn happy path. Targeted node:test suites (15 spec files) report 42/42 PASS in 871ms.

## [1.2.216] - 2026-05-09
### Fixed
- **Managed documentation providers no longer own durable commits.** Application Skeleton and Quality Gates prompts now stop at content readiness; Core owns validation, staging, managed commits, child-plan advancement, workspace ledger updates, continuation, and downstream unlock.
- **Initial managed prompts receive the same context contract as continuations.** Diagram Modules, Application Skeleton, and Quality Gates cold starts now receive a Core-built managed workflow context bundle with active stage, active plan path, current task, expected commit, and last accepted commit data.
- **Rollover prompts are covered by the managed ownership invariant.** Documentation rollover coverage now verifies managed stages keep the context bundle and do not expose provider-side `npm run plan:commit`, `git commit`, or staging instructions.

### Tests
- **Focused bundled prompt, Project Manager prompt-pack, managed initial-context, managed Core bundle, and documentation rollover tests passed before release assembly.**

## [1.2.215] - 2026-05-09
### Fixed
- **Core managed continuation now belongs to the post-turn pipeline.** Provider-visible acceptance and continuation messages are dispatched only after provider message flush and Core turn arbitration, not from workflow state read paths.
- **Workflow contracts now document Core Runtime as a contract-owned Product Part boundary.** `WorkflowSteps_Overview.md` records the single ingress/egress rule for Project Manager, providers, managed Git, rollover, and stage continuation.
- **Plan Orchestrator commits now enforce current task scope.** `plan:commit` stages dirty files inside the active microtask scope automatically and blocks dirty or manually staged files outside that scope.

### Tests
- **Focused Core managed continuation tests and the full Plan Orchestrator test suite passed before release assembly. The next session starts with user workflow testing of v1.2.215.**

## [1.2.214] - 2026-05-09
### Fixed
- **Claude Diagram Modules turns now recover from native assistant `end_turn`.** Claude provider sessions emit Core turn completion even when native Claude output ends without a separate result event.
- **Workflow prompt tails now preserve exact relative output targets.** Initial and rollover prompts for Description, Virtual Simulation, Diagram Modules, Application Skeleton, and Quality Gates keep the write target visible without reintroducing input-document path labels.
- **Managed agent prompts no longer ask providers to read plan files.** Diagram Modules, Application Skeleton, and Quality Gates templates now use Core-embedded workspace plan text, active stage todo-plan text, and plan status as the context source.

### Tests
- **Focused Claude, Core, Project Manager prompt, rollover envelope, bundled managed template, generated prompt scan, Core build, Claude build, Claude provider tests, and webview typecheck coverage passed before release assembly.**

## [1.2.213] - 2026-05-09
### Fixed
- **Claude managed turns now complete at the provider stream boundary.** `turn_completed` is emitted only after final visible assistant chunks are flushed, so Core cannot send the next Diagram Modules continuation inside the tail of the previous response.
- **Core no longer uses timed quiet-window waits for managed continuation.** The old timer-based boundary watcher was removed; managed workflow continuation now relies on provider `turn_completed` / Core turn ownership instead of seconds-based settling.
- **Diagram Modules continuation tests now cover the event-driven contract.** Stale quiet-window expectations were removed from Core tests.

### Tests
- **Focused Claude and Core coverage verifies stream-boundary turn completion, Core build, Claude build, Claude provider tests, and Diagram Modules continuation dispatch without timed boundary waiting.**

## [1.2.212] - 2026-05-09
### Fixed
- **Diagram Modules Core continuation now waits for a settled provider turn boundary.** Core samples the latest session message id before sending the next Product Part prompt, preventing accepted continuation messages from appearing inside the tail of the previous assistant response.
- **Managed handoff input locking is covered by regression invariants.** Project Manager must keep input locked during the async Core state read and cannot unlock from the queue cleanup path before Core state is known.

### Tests
- **Focused Core and Project Manager coverage verifies settled-boundary continuation order, unsettled-boundary suppression before provider turn start, Core build, Project Manager orchestration invariants, and webview typecheck.**

## [1.2.211] - 2026-05-09
### Fixed
- **Core now owns Diagram Modules continuation messages.** Project Manager no longer sends automatic provider messages between managed workflow turns; it only refreshes/read state and keeps UI locks from Core state.
- **Diagram Modules Product Part continuation is single-boundary.** Core sends exactly one authoritative next-target message only after validation and managed commit state allow continuation, and waits while commit gates are dirty.
- **Diagram Modules now separates automatic generation from user review.** Phase 1 remains Core/agent-owned through all Product Parts; Phase 2 opens only after all Product Parts are accepted and belongs to user-driven corrections.

### Tests
- **Focused Core and Project Manager coverage verifies Core-owned continuation, dirty commit-gate suppression, one-at-a-time Product Part advancement, Phase 2 insertion, Project Manager no-message invariants, Core build, Project Manager bundle generation, and webview typecheck.**

## [1.2.210] - 2026-05-09
### Fixed
- **Diagram Modules Product Part continuation now waits for successful managed commits.** Project Manager no longer sends the next Product Part target while workflow-state still reports managed dirty or out-of-target dirty files.
- **Product Part managed commit feedback is target-scoped.** Core commit-gate feedback tells the provider not to create or update Product Part artifacts instead of asking for all planned Product Parts.
- **Product Part index status updates are committed with the active Product Part.** Core includes `product-parts.index.md` in the current Product Part managed commit allowlist while still rejecting sibling Product Part files.

### Tests
- **Focused Core and Project Manager coverage verifies target-scoped feedback, managed commit allowlists, Product Part sequencing, Core build, Project Manager bundle generation, and webview typecheck.**

## [1.2.209] - 2026-05-09
### Fixed
- **Diagram Modules managed plans now expose Product Parts one at a time.** After the index commit, Core opens only the next Product Part microtask and waits for its accepted commit before adding the following Product Part.
- **Product Part id extraction is now strict.** Core reads Product Part ids only from canonical `### Product Part: <id>` headers, so fields like `Id`, `Title`, `Purpose`, `Status`, and comment prose cannot become fake Product Part tasks.

### Tests
- **Focused Core coverage verifies strict Product Part extraction and sequential task exposure across index and Product Part commits.**

## [1.2.208] - 2026-05-09
### Changed
- **Managed workflow rollover now uses embedded Core context bundles.** Diagram Modules, Application Skeleton, and Quality Gates continuation sessions receive upstream artifact text, workspace/stage plan text, derived plan status, current target, and accepted commit context instead of path-based recovery instructions.
- **Managed stage plans now track accepted microtask boundaries.** Diagram Modules creates a commit task for the index and for each Product Part from the accepted index; Application Skeleton and Quality Gates split draft and materialized/integration target groups into Core-owned tasks.
- **Development Tree node prompts no longer expose embedded input artifact paths.** Product Part, Cluster, and Module first prompts keep source text inline and show fallback paths only when an excerpt is explicitly truncated.

### Tests
- **Targeted coverage verifies managed context bundles, documentation rollover, Diagram Modules/Application Skeleton/Quality Gates managed commits, Development Tree node prompts, Core build, Project Manager bundle generation, and webview typecheck.**

## [1.2.207] - 2026-05-09
### Fixed
- **Claude Diagram Modules no longer receives stale aggregate failure feedback during pending Product Part subturns.** Core suppresses legacy `0/N`, `1/N`, `2/N`, and `3/N` aggregate failure feedback while a single Product Part continuation is pending, including the Core-owned dirty managed commit gate after index acceptance.
- **Diagram Modules continuation turns now state the authoritative scope explicitly.** The provider is told that the current Core target supersedes older aggregate missing-artifact feedback and that already-written sibling Product Part files do not expand the turn scope.

### Tests
- **Targeted coverage verifies pending-subturn feedback suppression, Diagram Modules continuation prompt hardening, Core build, webview typecheck, and webview bundle generation.**

## [1.2.206] - 2026-05-09
### Changed
- **Diagram Modules now advances as Core-orchestrated subturns.** Providers create `product-parts.index.md` first, then Core validates, commits, and sends exactly one Product Part target per continuation turn.

### Fixed
- **Diagram Modules repair feedback is now artifact-scoped and fresh.** Core repair turns include the current target artifact, validation snapshot metadata, and exact diagnostics instead of stale aggregate rejection noise.
- **Workflow input stays locked across Core validation and continuation dispatch.** The Project Manager keeps the user input disabled while Core validates, commits, queues feedback, or sends the next Product Part instruction.
- **Claude micro-fragments are filtered from live dialog output.** One-character punctuation and short orphan suffix chunks no longer render as standalone message cards.

### Tests
- **Targeted coverage verifies Core progress snapshots, artifact-scoped feedback, UI continuation orchestration, tree progress projection, Claude live text filtering, webview typecheck, and affected Core/Claude builds.**

## [1.2.205] - 2026-05-08
### Fixed
- **Core no longer sends stale Diagram Modules rejection feedback from old workflow-state polls.** Managed progress and Git status are refreshed immediately before Core feedback or managed documentation commits, preventing Claude from seeing already-written Product Part files as missing.

### Tests
- **Regression coverage verifies stale `0/N missing` managed progress is refreshed to the current valid Product Part set before feedback can be sent.**

## [1.2.204] - 2026-05-08
### Fixed
- **Claude/Core feedback turns now stay ordered and locked.** Core marks managed feedback turns as running before dispatch and serializes per-session message persistence/broadcast so deferred Core feedback is shown before the next reasoning block instead of appearing late.
- **Diagram Modules validation feedback now reports exact Product Part failures.** Core preserves per-part validator diagnostics and separates semantic artifact errors from Core-owned dirty/commit gates, so Claude receives the failed pattern instead of a generic rejection.

### Tests
- **Targeted regression coverage verifies Diagram Modules diagnostics, Core-owned feedback wording, feedback-turn locking, deferred-message ordering, and provider event routing.**

## [1.2.203] - 2026-05-08
### Fixed
- **Claude workflow turns now stay coherent through Core feedback.** Deferred Core feedback is delivered at provider turn boundaries, provider turn state keeps workflow input locked while Claude continues working, and orphan punctuation/suffix chunks are suppressed instead of becoming standalone dialog bubbles.
- **Diagram Modules agents now receive required Markdown format contracts inline.** Core embeds canonical `product-parts.index.md` and `product-parts/<part-id>.md` examples in the first workflow prompt so providers do not need to search template files before writing managed artifacts.

### Tests
- **Targeted regression coverage verifies deferred Core feedback, Claude live text chunk suppression, and Diagram Modules prompt contract inclusion.**

## [1.2.202] - 2026-05-08
### Fixed
- **Project Manager keeps workflow input locked during queued provider turns.** Direct `turn_state` stream events now update session connection state immediately, preventing user input from unlocking while Claude continues streaming reasoning or processing Core feedback turns.
- **Application Skeleton feedback is now phase-safe before user acceptance.** Draft-stage Core feedback no longer asks agents to materialize `product-parts/**` or mark the skeleton accepted/materialized before explicit user acceptance.

### Tests
- **Targeted regression coverage verifies turn-state stream locking and pre-acceptance Application Skeleton feedback wording.**

## [1.2.201] - 2026-05-08
### Fixed
- **Workflow starts now bind provider models from Settings only.** Start cards persist provider/model defaults, wait for the confirmed `settings:saved` event, and then create the real provider session so Application Skeleton and other workflow stages use the selected model instead of a stale default.

### Tests
- **Targeted regression coverage verifies Application Skeleton waits for Settings persistence before creating the workflow session.**

## [1.2.200] - 2026-05-08
### Fixed
- **Managed documentation commits are now Core-owned.** Diagram Modules, Application Skeleton, and Quality Gates no longer depend on provider shell access for `plan:commit`; Core validates artifacts, stages only active-stage owned files, commits with the child plan expected message, and rechecks Git/plan/stage state before downstream unlock.
- **Out-of-owner dirty files now block managed stage acceptance.** Core refuses the commit transaction when unrelated workspace paths are dirty and sends actionable owning-session feedback instead of asking provider agents to run shell commands.

### Tests
- **Regression coverage verifies Core auto-commits valid managed artifacts and refuses unrelated dirty paths across Diagram Modules, Application Skeleton, and Quality Gates.**
- **Bundled prompt tests verify managed stage prompts no longer instruct provider agents to run plan commits.**

## [1.2.199] - 2026-05-08
### Fixed
- **Managed workflow handoffs now fail closed on dirty Git state.** From Diagram Modules onward, Core checks the workspace Git status, blocks downstream stage availability, and sends owning-stage feedback when managed files are uncommitted.
- **Dirty managed files are attributed to the responsible stage.** Diagram Modules, Application Skeleton, and Quality Gates leftovers now produce concrete file-level blocker messages instead of silently allowing the next agent to inherit them.

### Tests
- **Targeted regression coverage verifies dirty managed paths are classified by stage, downgrade progress, and block downstream stage unlocks.**

## [1.2.198] - 2026-05-08
### Fixed
- **Project Manager Start card selectors no longer use native CEF dropdowns.** Provider, model, and reasoning controls now use the existing in-app DOM listbox, avoiding the macOS/CEF crash seen when changing model or reasoning during acceptance testing.

### Tests
- **Targeted regression coverage verifies workflow and Development Tree Start cards avoid native `<select>` controls while preserving selected provider/model/reasoning payloads.**

## [1.2.197] - 2026-05-08
### Added
- **Workflow start cards now expose provider, model, and reasoning selection.** The selected model becomes the provider default in Settings before the managed stage starts.
- **Development Tree nodes now start from explicit user cards.** Core no longer creates every cluster/module session and draft immediately after Quality Gates unlock; each node is started only when the user chooses it.

### Fixed
- **Development Tree node starts now materialize only the selected node drafts.** Core validates clean Git, resolves the selected workflow path, writes that node's specification/contract drafts, and creates only that node session with actionable blocker messages.

### Tests
- **Targeted regression coverage verifies model-default persistence, disabled auto fanout, startable node metadata, selected-node draft materialization, and the user-started workflow evidence.**

## [1.2.196] - 2026-05-08
### Fixed
- **Core acceptance feedback is now repair-aware.** Identical validation failures are deduped only on the same workspace commit; after an agent repair commit, the same remaining blocker is sent back to the owning managed stage session again.
- **Managed stage feedback now includes diagnostic check context.** Diagram Modules, Application Skeleton, and Quality Gates feedback reports what Core checked, observed counters/lifecycle flags, and the specific failed part/path/gate.
- **The feedback contract now documents retry semantics.** Managed lifecycle docs require repeated feedback after failed repair attempts instead of leaving agents silent behind a locked downstream stage.

### Tests
- **Targeted regression coverage verifies repeated feedback after repair commits and diagnostic messages for all managed acceptance stages.**

## [1.2.195] - 2026-05-08
### Fixed
- **Quality Gates aggregate hook wiring now unlocks Development Tree correctly.** Core accepts `qg:before-commit` and `qg:before-push` when those scripts dispatch the corresponding required gate arrays from `quality-gates.json`.
- **Quality Gates agent instructions now match runtime acceptance.** Phase 2 must preserve Core lifecycle commands and wire `.husky/pre-commit` / `.husky/pre-push` before reporting `integrated: true`.
- **Live retest workspace validation now reaches Development Tree unlock.** The aggregate hook repair path evaluates to `qualityGatesProgress.integrated: true` and `developmentTreeBootstrapGate.unlocked: true`.

### Tests
- **Targeted regression coverage verifies aggregate hook acceptance, bundled Quality Gates prompt sync, and Development Tree bootstrap gating.**

## [1.2.194] - 2026-05-08
### Fixed
- **Managed acceptance failures are now returned to the owning agent session.** Core sends actionable repair feedback to Diagram Modules, Application Skeleton, and Quality Gates sessions when runtime validation rejects an agent commit.
- **Development Tree progression stays locked until real stage state passes Core validation.** Downstream workflow stages no longer rely on a single accepted/integrated flag when required materialized artifacts, hook wiring, or lifecycle evidence are missing.
- **Quality Gates feedback now explains the missing work.** If baseline gates are not actually wired into managed lifecycle hooks, Core reports the failed acceptance check back to the Quality Gates agent.

### Tests
- **Targeted regression coverage verifies Core feedback parity for Diagram Modules, Application Skeleton, and Quality Gates.**

## [1.2.193] - 2026-05-07
### Fixed
- **Application Skeleton can unlock Quality Gates from the materialized JSON map.** Core now treats `application-skeleton-map.json` as the machine lifecycle source and no longer requires `application-skeleton.md` to duplicate lifecycle fields verbatim when the Markdown is a narrative artifact.
- **Stale/draft Markdown contradictions are still rejected.** If `application-skeleton.md` explicitly says draft, unaccepted, or not materialized, the handoff remains blocked.

### Tests
- **Targeted regression coverage verifies narrative materialized Markdown unlocks Quality Gates while stale Markdown and stale JSON still fail.**

## [1.2.192] - 2026-05-07
### Fixed
- **Quality Gates integration now requires lifecycle hook wiring.** A `quality-gates.json` contract with `integrated: true` is treated as failed until every `requiredBeforeCommit` gate is present in `.husky/pre-commit` and every `requiredBeforePush` gate is present in `.husky/pre-push`.
- **Development Tree bootstrap now starts after accepted Quality Gates integration.** Workflow state reads trigger materialized Development Tree folders, draft templates, and node sessions once Application Skeleton and Quality Gates commits are accepted.
- **Development Tree bootstrap avoids duplicate sessions.** Existing unchanged draft files suppress repeated node-session creation after a Core restart or repeated state read.

### Tests
- **Targeted regression coverage verifies Quality Gates hook enforcement, Development Tree bootstrap side effects, bootstrap gate locking, and repeat-read duplicate protection.**

## [1.2.191] - 2026-05-07
### Fixed
- **Plan orchestrator runtime guardrails now fail loudly instead of silently closing or hanging managed workflow work.** Orphan `IN_PROGRESS` tasks are rejected, implicit terminal closeout requires an explicit anchor, and failed plan commands print deterministic repair guidance.
- **Core now blocks managed workflow progression on active plan debt or blocked plan state.** Downstream stage unlocks wait until `plan:repair`/plan validation recover the lifecycle instead of proceeding over an unfinished transaction.
- **Application Skeleton completion accepts the agent's lifecycle Markdown table format.** Materialized skeleton output can unlock Quality Gates when declared files exist.
- **Codex workflow turns default to non-interactive full access.** Core and AppServer defaults avoid invisible permission prompts during managed Git/filesystem work.

### Tests
- **Targeted regression coverage verifies orchestrator validation, recovery repair, managed workspace blockers, Codex permissions, and Application Skeleton to Quality Gates unlock behavior.**

## [1.2.190] - 2026-05-07
### Fixed
- **Project Manager now stays behind a startup readiness gate while Core/provider bootstrap is still running.** Workspace actions and Settings are blocked until Core HTTP readiness is available.
- **Codex workflow sessions now use full managed workspace access for ordinary workflow/documentation turns.** Managed stages can write artifacts and complete required `plan:commit` Git lifecycle operations instead of hanging on invisible permission escalation.
- **Gemini workflow sessions now keep explicit `yolo` approval flags.** Runtime flags are no longer downgraded by persisted settings, avoiding hidden approval prompts during managed workflow work.

### Tests
- **Provider permission coverage now checks Codex thread start, Core Codex defaults, and Gemini bridge approval behavior.** Targeted builds and node tests cover the affected provider paths before packaging.

## [1.2.189] - 2026-05-07
### Fixed
- **Codex workflow sessions now default to writable workspace mode.** Fresh clean-cache Description sessions no longer depend on Codex provider defaults that can resolve to `read-only` and block `Final_Description.md` materialization.

### Tests
- **Workflow sandbox defaults are covered for both Core adapter construction and Codex thread start.** Regression coverage verifies the empty-env/default path uses `workspace-write` while explicit sandbox settings remain respected.

## [1.2.188] - 2026-05-07
### Fixed
- **Post-clean-cache rebuild of the provider startup ready-gate release.** Rebuilds the current provider startup gate package after the local CodeAI Hub runtime cache was fully cleared, producing fresh provider, Core, UI, launcher, and VSIX artifacts under a new version.

## [1.2.187] - 2026-05-07
### Fixed
- **Clean rebuild of the provider startup ready-gate release.** Rebuilds the v1.2.186 provider startup gate changes under a fresh version after the previous package was built while live testing was still running.

### Process
- **Release builds now require explicit user confirmation after fixes are ready.** Future fix streams should stop at implementation/verification unless the user explicitly asks to build the next release.

## [1.2.186] - 2026-05-07
### Fixed
- **Project Manager now waits for provider startup readiness before accepting sessions.** Core completes provider auto-update and provider initialization before opening the RemoteBridge, preventing Description from starting Codex while the Codex CLI is still being installed.
- **Codex startup no longer races provider auto-update.** The `spawn codex ENOENT` path seen during v1.2.185 startup is blocked by the new startup order.

### Tests
- **Provider startup ready-gate coverage locks the startup order.** Targeted tests verify Core starts RemoteBridge only after auto-update and provider initialization, and that Codex CLI auto-update is awaited before startup completes.

## [1.2.185] - 2026-05-07
### Fixed
- **Filesystem workflow stages now start with committed draft contracts.** Fresh Application Skeleton and Quality Gates child plans split draft/contract checkpoints from materialization/integration, so long user review loops no longer collapse into one oversized commit.
- **Application Skeleton and Quality Gates prompts now require draft commits before destructive work.** Agents must commit canonical draft artifacts, verify clean Git, and only then proceed to materialization or gate script/package integration after user acceptance.
- **Development Tree unlock now requires managed transaction evidence.** Core checks accepted Application Skeleton materialization and Quality Gates integration commits in `doc/TODO/workspace.plan.md`, plus advanced child plans and clean Git.
- **Workflow-state reads no longer create Development Tree draft files as a side effect.** Read-only snapshots do not materialize downstream drafts while the Quality Gates agent is finishing.

### Tests
- **Managed draft lifecycle coverage verifies split child plans, prompt wording, transaction gates, and side-effect isolation.** Targeted tests cover generated `plan-cli.mjs` stage advancement, bundled templates, Development Tree gate evidence, and read-only snapshot behavior.

## [1.2.184] - 2026-05-07
### Fixed
- **Development Tree now waits for a committed Quality Gates transaction.** Dirty `quality-gates.json` content with `integrated: true` no longer unlocks downstream work unless `doc/TODO/workspace.plan.md` records an accepted `quality_gates` commit, the Quality Gates child plan advanced past the integration task, and Git is clean.
- **Quality Gates prompt now requires the managed commit before final integrated/unlocked status.** Phase 2 instructs the agent to run `npm run plan:commit -- "feat: integrate quality gates baseline"`, verify `npm run plan:status`, and confirm `git status --short` is empty before it can report the root gate as complete.

### Tests
- **Transaction-gate coverage reproduces the v1.2.183 retest failure.** Core tests now keep Development Tree locked when Quality Gates artifacts are dirty/integrated but not committed, and unlock only after managed ledger evidence plus clean Git.

## [1.2.183] - 2026-05-07
### Fixed
- **Core now owns managed stage handoff before each filesystem agent starts.** Application Skeleton and Quality Gates launches switch `doc/TODO/workspace.plan.md` to the correct active stage/child plan before the first provider prompt, while prompts explicitly stop on Core preflight mismatch instead of repairing lifecycle files by hand.
- **Application Skeleton completion now accepts the canonical map identifier contract.** Materialized maps with stable `id` fields for Product Parts, Clusters, and Modules can unlock Quality Gates, while validation errors stay distinct from missing-artifact failures.
- **Malformed managed workflow state no longer masks existing artifacts.** A damaged `.codeai-hub/<workspace>/workflow/state.json` is ignored during workflow-state reads so filesystem evidence still reports materialized skeleton progress and Quality Gates availability.

### Tests
- **Managed handoff, completion-gate, and malformed-state behavior are covered by targeted Core tests.** Coverage verifies stage-correct child plan routing, prompt-boundary wording, canonical skeleton materialization, Quality Gates unlock behavior, and recovery from bad workflow state JSON.

## [1.2.182] - 2026-05-07
### Fixed
- **Managed workspace Core ledger now records accepted stage commits.** Generated `npm run plan:commit` advances the active child plan, commits the agent artifacts, records the accepted commit hash/message/task in `doc/TODO/workspace.plan.md`, and creates a separate Core ledger commit so the workspace stays clean.
- **Session-create coverage now matches the managed TODO tree contract.** Diagram Modules and Application Skeleton activation checks assert `doc/TODO/workspace.plan.md` plus the active child plan under `doc/TODO/stages/<stage>/todo-plan.md`, and reject root `doc/TODO/todo-plan.md`.

### Tests
- **Managed workspace ledger behavior is covered by targeted Core tests.** Coverage verifies root plan absence, active child-plan status, workspace ledger accepted-commit entries, clean Git status after `plan:commit`, and synced managed-stage prompts.

## [1.2.181] - 2026-05-07
### Fixed
- **Managed user workspaces now use the per-stage child TODO plan as the active agent ledger.** Fresh Diagram Modules workspaces no longer create root `doc/TODO/todo-plan.md`; generated `npm run plan:*` reads `doc/TODO/workspace.plan.md` and advances the active child plan from `activePlanPath`.
- **Filesystem-stage prompts now point agents at the managed child plan.** Diagram Modules, Application Skeleton, and Quality Gates wording now references `workspace.plan.md` plus `doc/TODO/stages/<stage>/todo-plan.md` instead of the removed root plan path.
- **Managed lifecycle metadata exposes the workspace plan path.** Core validators, manifest path metadata, and Project Manager lifecycle payloads now report `doc/TODO/workspace.plan.md` as the recovery ledger.

### Tests
- **Child-plan behavior is protected by targeted Core and template tests.** Coverage verifies fresh managed workspaces do not create the root plan, `plan:status` and `plan:commit` operate on the active child plan, bundled prompts stay synced, and adoption/reconciler validation remains green.

## [1.2.180] - 2026-05-07
### Added
- **Managed workspace planning now has a Core-owned master TODO tree.** Fresh managed workspaces create `doc/TODO/workspace.plan.md` plus per-stage child plans under `doc/TODO/stages/<stage>/todo-plan.md`, while preserving the existing active-stage `npm run plan:*` compatibility path.

### Fixed
- **Diagram Modules layout sidecars no longer dirty managed Git.** Core ignores `.codeai-hub/*/diagram_modules/module-map.flow.json`, so UI/runtime graph layout state stays out of agent artifact commits.

### Tests
- **Managed TODO tree and sidecar handling are covered by targeted Core tests.** Bootstrapper, reconciler, plan-installer, and workflow-session managed workspace checks verify the new plan tree, idempotent ignore entries, and pre-provider lifecycle setup.

## [1.2.179] - 2026-05-07
### Fixed
- **Managed workspace runtime state no longer dirties project Git.** Core ignores live continuity chains and workflow runtime state under `.codeai-hub/*/`, while keeping durable lifecycle artifacts tracked.
- **Managed `plan:commit` now advances the active plan inside the artifact commit.** The generated plan shim updates `doc/TODO/todo-plan.md`, stages it, and commits it with the agent-created artifacts so Diagram Modules can continue from a clean tree.

### Tests
- **Managed lifecycle coverage now checks ignored runtime state and clean post-commit plan advancement.** Targeted tests verify adoption commits skip live runtime files and the generated plan shim leaves a temporary workspace clean after `npm run plan:commit`.

## [1.2.178] - 2026-05-07
### Fixed
- **Managed workspace lifecycle now creates its first commit at Diagram Modules.** Core commits the lifecycle baseline and accepted upstream evidence before the first `Diagram Modules` provider turn, so later `Application Skeleton` sessions start from a clean Git tree instead of inheriting uncommitted setup files.
- **Diagram Modules prompt now follows the managed commit flow.** The agent is told to read `doc/TODO/todo-plan.md`, use the Core-created clean baseline, keep upstream stages read-only, and commit its own staged artifacts through `npm run plan:commit`.

### Tests
- **Session-create coverage verifies the real managed entrypoint.** Targeted tests assert that `Diagram Modules` receives `.git`, hooks, plan scripts, tracked upstream evidence, an initial adoption commit, and a clean `git status` before provider session creation.

## [1.2.177] - 2026-05-07
### Fixed
- **Managed workspace bootstrap now activates the generated Husky hooks.** Core configures `core.hooksPath=.husky` during managed preflight, so normal `git commit` and `git push` run the managed `pre-commit`, `commit-msg`, `post-commit`, and `pre-push` scripts.
- **Managed workspace `.gitignore` now ignores `.DS_Store`.** Fresh project workspaces no longer show macOS metadata files as untracked lifecycle noise.

### Tests
- **Bootstrapper coverage verifies hook-path configuration and ignore baseline.** Targeted tests assert `git config core.hooksPath .husky`, `.DS_Store`, managed runtime/cache/log ignores, and idempotency.

## [1.2.176] - 2026-05-07
### Fixed
- **Managed workspace plans now parse fenced JSON state reliably.** The generated plan CLI strips Markdown fences before reading `codeai-plan-state`, so fresh managed workspaces can run `npm run plan:status`.
- **Filesystem-aware workflow stages now seed the correct expected commit.** `Application Skeleton` starts with `feat: materialize application skeleton`, and `Quality Gates` starts with `feat: integrate quality gates baseline`.
- **Application Skeleton now commits materialized scaffold output.** The prompt and contract require tracked `README.md` placeholders for Product Part / Cluster / Module directories and a managed `plan:commit` before the final materialization response.

### Tests
- **Managed lifecycle hotfix coverage now spans parser, stage seed, session create, and Application Skeleton templates.** Targeted tests verify generated plan status, real session bootstrap, stage-aware initial plans, synced bundled templates, and `@codeai-hub/core` build.

## [1.2.175] - 2026-05-07
### Fixed
- **Application Skeleton activation now bootstraps the managed workspace from the real Project Manager session path.** The generic `session:create` route runs the same Git/hooks/plan preflight as workflow gateway sessions before creating `Application Skeleton` or `Quality Gates` provider sessions.

### Tests
- **Session-create coverage now verifies the managed baseline in a real temporary workspace.** The regression asserts `.git`, `.husky/pre-commit`, `doc/TODO/todo-plan.md`, `scripts/plan-orchestrator/plan-cli.mjs`, and `.codeai-hub/workflow` exist before the provider session is created.

## [1.2.174] - 2026-05-07
### Fixed
- **Managed workspace baseline is now reconciled before every filesystem-aware workflow stage.** Core runs the Git/hooks/plan preflight before `Diagram Modules`, `Application Skeleton`, and `Quality Gates`, so older or drifted sessions cannot skip `doc/TODO/todo-plan.md`, plan scripts, hooks, and `.codeai-hub/workflow`.
- **Upstream read-only panels now use localized Project Manager copy.** `Description` and `Virtual Simulation` both replace editable sessions with the same localization-backed read-only panel after the managed lifecycle starts.

### Tests
- **Managed lifecycle activation coverage now includes Application Skeleton and Quality Gates.** Targeted tests verify provider sessions are not created before managed workspace preflight for the technical stages, plus the localized upstream read-only panel coverage.

## [1.2.173] - 2026-05-07
### Added
- **Managed workspace lifecycle now starts at Diagram Modules.** Core bootstraps the project repo, `.codeai-hub/workflow` ledger, `doc/TODO/todo-plan.md`, plan scripts, and managed hook baseline before filesystem-aware workflow stages begin.
- **Workflow revision tracking now supports downstream migration planning.** Accepted Diagram Modules, Application Skeleton, and Quality Gates artifacts can be snapshotted, diffed, and converted into downstream migration tasks without mutating project files automatically.

### Fixed
- **Upstream stages become read-only after Diagram Modules starts.** Description and Virtual Simulation history remains viewable, but new editing turns are blocked once the managed lifecycle is active.
- **Application Skeleton and Quality Gates prompts now assume Core-owned lifecycle controls.** Agents receive concise instructions to use the managed repo and plan state instead of creating git, hooks, lifecycle ledgers, or separate handoff sessions.

### Tests
- **Managed lifecycle regression coverage now spans Core, prompt, and Project Manager behavior.** Targeted tests cover bootstrap/reconciliation, hook manifest validation, revision diff planning, managed rollover recovery, upstream read-only gating, and prompt wording.

## [1.2.172] - 2026-05-07
### Fixed
- **Quality Gates Baseline no longer hardcodes JavaScript-specific tools as universal policy.** The first prompt now keeps universal architecture gates, including the `<= 500` source file/class rule, while requiring stack-specific tool selection from user preference, project evidence, or research.
- **Quality Gates integration stays in the same session.** Final integration wording now reports whether the Quality Gates root gate is integrated/unlocked instead of asking about separate Development Tree sessions.

### Tests
- **Quality Gates contract validation now rejects array-shaped `commands`.** Targeted coverage keeps `quality-gates.json` on the command-map contract and verifies the stack-neutral prompt constraints.

## [1.2.171] - 2026-05-07
### Fixed
- **Quality Gates Baseline now starts from a compact two-phase prompt.** The bundled prompt and contract separate draft artifacts from post-acceptance file-system integration, persist user-selected tooling such as Ultracite and Knip into `quality-gates.md` / `quality-gates.json`, and avoid duplicate runtime phase instructions.

### Tests
- **Quality Gates prompt and contract consistency are covered by targeted checks.** Core tests verify synced bundled templates, the compact integration-aware prompt surface, and stricter `quality-gates.json` validation for advisory, planned, and not-integrated gates.

## [1.2.170] - 2026-05-06
### Fixed
- **Application Skeleton validation now requires canonical identifier fields.** Materialized maps must use `partId` for Product Parts, `clusterId` for Clusters, and `moduleId` for clustered and standalone Modules, so generic `id` fields cannot silently pass the runtime gate.

### Tests
- **Application Skeleton materialization validator coverage now catches missing canonical identifiers.** A focused regression verifies that materialized maps with missing `partId`, `clusterId`, or `moduleId` stay invalid.

## [1.2.169] - 2026-05-06
### Fixed
- **Application Skeleton validation now checks standalone module paths.** Product Part-level `standaloneModules` are included in materialization validation, so missing standalone folders cannot unlock Quality Gates accidentally.

### Tests
- **Application Skeleton progress coverage now includes missing standalone module directories.** The targeted regression keeps the stage failed when a materialized map declares a standalone module path that does not exist.

## [1.2.168] - 2026-05-06
### Fixed
- **Application Skeleton now has a runtime validation gate for materialized artifacts.** Core treats the filesystem skeleton as part of the stage artifact surface and blocks Quality Gates when Markdown, JSON, or declared paths disagree after materialization is observed.
- **Application Skeleton materialization is detected from filesystem facts, not only agent-declared JSON state.** Existing `product-parts`, declared `codePath`, and `materializedPaths` now force materialized-state validation even if the agent forgets to update lifecycle fields.
- **Automation-first is now a standing agent rule.** Repeatable, formally checkable workflow issues should be solved with scripts, validators, hooks, or gates before relying on prompt wording alone.

### Tests
- **Application Skeleton progress coverage now includes stale Markdown, stale JSON, and missing path failures.** Targeted tests keep Quality Gates locked until the canonical artifacts and filesystem are consistent.

## [1.2.167] - 2026-05-06
### Fixed
- **Application Skeleton now treats upstream technology hints as strong baseline evidence.** Named shells, launchers, runtimes, frameworks, package formats, and deployment targets from prior artifacts must be used in the recommended baseline or explicitly rejected with rationale.
- **Application Skeleton keeps `product-parts` as the default source root.** The prompt and contract now require `sourceRoot: "product-parts"` unless the user explicitly accepts another production root.
- **Application Skeleton final responses are language-aware.** Draft and materialization completion messages now describe the required state transition in the chat language instead of emitting fixed English template text.

### Tests
- **Bundled template coverage protects technology inference and source-root defaults.** The targeted Application Skeleton template test now asserts upstream technology hint handling, localized final-response semantics, and the `product-parts` source root rule.

## [1.2.166] - 2026-05-06
### Fixed
- **Application Skeleton first-turn instructions are now shorter and more directive.** The bundled prompt keeps the universal draft/materialization lifecycle, Development Tree filesystem mirror, and user stack-decision handling while removing duplicated guidance that made the first prompt noisier.
- **Application Skeleton post-materialization cleanup is stricter.** The agent is now explicitly told to remove stale draft/future claims from both Markdown and JSON after creating the filesystem, including deferred notes that still say the filesystem was not materialized.

### Tests
- **Bundled template coverage tracks the compact prompt contract.** The Application Skeleton template test now protects the shorter prompt wording and the stale-draft cleanup rule.

## [1.2.165] - 2026-05-06
### Fixed
- **Application Skeleton now treats the Development Tree as the default production filesystem shape.** The bundled prompt/contract require Product Part roots under `product-parts/<product-part-id>`, clustered modules under `clusters/<cluster-id>/modules/<module-id>`, and standalone modules under the Product Part instead of scattering Product Parts across `apps/`, `packages/`, or `extensions`.
- **Application Skeleton JSON now has a canonical lifecycle shape.** Draft and materialized maps must use explicit `reviewState`, `materialized`, `materializationState`, `materializedPaths`, and array-based `stack.languages`, `stack.frameworks`, and `stack.runtimes` fields.
- **Post-materialization artifacts must describe the current filesystem, not a future draft.** The prompt now tells the agent to rewrite draft/future-tense Markdown after it creates the accepted skeleton.

### Tests
- **Bundled template coverage protects the Development Tree mirror contract.** Targeted tests assert the Product Part-aligned filesystem rules, canonical JSON fields, and post-materialization Markdown cleanup requirements.

## [1.2.164] - 2026-05-06
### Fixed
- **Application Skeleton runtime prompt pack now matches the discovery-first stage direction.** The Project Manager prompt pack no longer injects legacy “ask stack questions first” phase guidance and keeps draft contract creation separate from post-acceptance filesystem materialization.
- **Application Skeleton now receives complete upstream Diagram Modules context.** The first-turn prompt inlines Final Description, Virtual Simulation, the Product Parts index, and generated Product Part artifacts derived from the index.
- **Application Skeleton path contracts now distinguish workflow artifacts from production code.** The bundled prompt/contract forbid `.codeai-hub/...` as `sourceRoot` and require cluster-owned modules under `<productPartPath>/clusters/<cluster-id>/modules/<module-id>`.

### Tests
- **Prompt pack and bundled template tests cover the corrected behavior.** Targeted tests verify discovery-first runtime phase guidance, source artifact descriptor generation, and stricter source/module path contract wording.

## [1.2.163] - 2026-05-06
### Fixed
- **Application Skeleton no longer starts by blocking on stack-choice questions.** The bundled prompt now requires a discovery/research pass first, asks the agent to propose one recommended baseline when the inputs support it, and limits blocking questions to genuinely ambiguous decisions.

### Tests
- **Template coverage protects the discovery-first prompt rule.** The Application Skeleton bundled template test now asserts that the prompt forbids early blank-choice stack questions and requires recommended-baseline confirmation style.

## [1.2.162] - 2026-05-06
### Fixed
- **Application Skeleton now owns post-acceptance filesystem materialization.** The bundled agent prompt separates draft contract creation from accepted skeleton materialization, writes explicit `materialized` state, and keeps Quality Gates blocked until the real scaffold exists.
- **Quality Gates Baseline now owns post-acceptance gate integration.** The bundled prompt and contract separate accepted gate baselines from integrated tooling, and Development Tree bootstrap now waits for `quality-gates.json` to report `integrated: true`.

### Tests
- **Materialization and integration gates are covered by targeted Core checks.** Tests verify Application Skeleton materialized progress, Quality Gates integrated unlock, Development Tree filesystem path application, template sync, `@codeai-hub/core` build, and webview type-check.

## [1.2.161] - 2026-05-06
### Fixed
- **Quality Gates agents now start with a universal research-first prompt.** The stage infers the current project shape from the accepted Application Skeleton, compares suitable tooling strategies, drafts minimal/recommended/strict baselines, and designs a first-class architecture gate without assuming a CodeAI Hub-specific stack.
- **Quality Gates contracts now separate active blockers from deferred tooling.** The bundled contract reference requires selected baseline metadata, advisory/deferred sections, and keeps materialization, hooks, CI, scripts, and production files outside the Quality Gates stage unless explicitly allowed.

### Tests
- **Template sync and Core build checks cover the prompt update.** Targeted template tests and the `@codeai-hub/core` build passed after regenerating bundled templates.

## [1.2.160] - 2026-05-06
### Added
- **Codex workflow agents now run with research-capable documentation tooling.** The documentation workflow process keeps implementation-heavy capabilities disabled but no longer disables browser/search tools, so Diagram Modules, Application Skeleton, and Quality Gates discussions can compare frameworks, architecture options, and external references when the user asks for research.
- **A restricted Codex workflow process profile remains available.** Translation and no-research contexts keep browser/search/tool discovery disabled, preserving the narrow tool surface where external research is not appropriate.

### Fixed
- **Application Skeleton agents now have an explicit completion boundary.** After the accepted skeleton contract is written, the agent must stop, avoid materialization/root file creation, and direct the user to Quality Gates Baseline.

### Tests
- **Provider and template profile coverage verifies the new tooling split.** Targeted checks cover Codex app-server process args, translation isolation, model invocation profile keys, template sync/update behavior, and affected package builds.

## [1.2.159] - 2026-05-06
### Fixed
- **Application Skeleton and Quality Gates sessions now keep their workflow stage identity in continuity.** New sessions for the technical root steps are stored under `application_skeleton` / `quality_gates` instead of `unknown`, so Project Manager can attach the started dialog to the selected workflow row.

### Tests
- **Technical root continuity is covered by Core regression tests.** The hotfix verifies canonical continuity paths for `application_skeleton` and `quality_gates`, dialog reconciliation coverage, and the `@codeai-hub/core` build.

## [1.2.158] - 2026-05-06
### Fixed
- **Workflow session empty states no longer show a stale `Creating session` placeholder.** If a Diagram Modules branch node, Application Skeleton, or another workflow surface has no session/help content yet, the session panel now falls back to the generic empty state instead of showing an indefinite spinner.

### Tests
- **The empty-state regression is covered by targeted Project Manager session tests.** The hotfix verifies that the shared empty state no longer references the pending copy or spinner and that Project Manager workflow session routing still stays scoped to live stage/session intents.

## [1.2.157] - 2026-05-06
### Added
- **Application Skeleton and Quality Gates Baseline are now first-class workflow stages.** After Diagram Modules, the Project Manager exposes dedicated technical root rows, prompt packs, artifact panels, confirmation cards, and SSOT documentation for creating the application skeleton before development-tree execution begins.
- **Development Tree execution is locked until skeleton and gates are accepted.** The workflow now prevents Product Part / Cluster / Module agent-session automation from starting until the application skeleton and quality baseline artifacts are produced and accepted.

### Tests
- **The workflow expansion is covered by targeted Core and Project Manager verification.** Prompt-pack, stage-start, workflow-state, panel-routing, workspace-tree, Core build, webview type-check, and webview build checks were run before release packaging.

## [1.2.156] - 2026-05-06
### Fixed
- **Apple Native reasoning translation retries the transient first-call readiness failure.** If Apple Translation reports `TranslationError.Cause.notInstalled` during the first runtime call even though the language pair is installed, the Apple Native engine now performs a bounded retry instead of leaving the first `Thinking` bubble in source English.

### Tests
- **The retry guard is covered by translation package regression tests.** New Apple Native engine tests verify that transient `runtime_failure` / `notInstalled` is retried and that real language-pack failures are not retried.

## [1.2.155] - 2026-05-06
### Fixed
- **Text-to-Speech now selects the Apple voice language from the bubble text.** When no explicit speech language is provided by the UI, the packaged Apple Speech helper detects the text language and resolves Russian Cyrillic text to `ru-RU` instead of falling back to the system/default English voice.

### Tests
- **Apple Speech helper language detection is covered without audible playback.** The Swift fixture suite now runs a dry-run `speak` request for Russian text and asserts `resolvedLanguage: ru-RU` with a real Apple voice identifier, alongside the existing helper build and fixture checks.

## [1.2.154] - 2026-05-06
### Fixed
- **Text-to-Speech Speak clicks now pass Core WebSocket validation.** The Core incoming message validator accepts `session:speech:speak-message` and `session:speech:stop`, so bubble Speak buttons reach the speech router instead of being rejected as unknown commands.

### Tests
- **The hotfix is covered by Core regression tests and build verification.** Targeted checks cover accepted speech commands, malformed speech payload rejection, speech handler/router/service behavior, Ultracite validation, and the `@codeai-hub/core` build.

## [1.2.153] - 2026-05-05
### Added
- **Apple Native Text-to-Speech is available for session bubbles on macOS.** Assistant and thinking bubbles now expose provider-styled `Speak` controls that read the visible bubble text through the packaged Apple Speech helper, with stop behavior on the active bubble.
- **Text-to-Speech rate is configurable in General Settings.** The persisted `general.textToSpeech.rate` setting is clamped to `0.75x-2.0x` and sent with each speech request.

### Tests
- **Text-to-Speech integration is covered across helper, Core, UI, and packaging.** Targeted verification covers Swift helper fixtures, Core speech service and websocket routing, settings persistence, bubble Speak rendering, PM speak/stop command building, Core/webview type-check/build, and release validation for the packaged Apple Speech helper executable.

## [1.2.152] - 2026-05-05
### Fixed
- **Apple Native Settings save now resolves the packaged helper from the Core runtime path.** The Project Manager launcher can start Core with `cwd=/`; Settings preflight and runtime translation now also look beside the packaged Core entry point, so `Apple Native - On-Device` no longer fails helper discovery in installed builds.

### Tests
- **Installed runtime helper discovery was verified against the `1.2.151` Core layout.** The resolved path maps to `app/native/apple-translation-helper/.build/release/apple-translation-helper`, and the helper returns `ok:true` for `en -> ru` preflight.

## [1.2.151] - 2026-05-05
### Fixed
- **Apple Native release packaging now ships the executable helper in the Core runtime.** macOS release builds compile `native/apple-translation-helper` and bundle the executable under the Core app runtime path used by Settings preflight and translation requests.
- **Release validation now blocks missing Apple helper binaries.** `build-release.sh --use-current-version` fails on macOS if the packaged Core runtime does not contain an executable Apple Translation helper.

### Tests
- **The `1.2.151` release build supersedes the local `1.2.150` VSIX candidate.** This avoids VS Code extension caching of the previously built package number and gives user acceptance a fresh installable artifact.

## [1.2.150] - 2026-05-05
### Added
- **Apple Native translation is available as an on-device engine on supported macOS builds.** Settings can select `Apple Native - On-Device` for both UI and Reasoning translation after Core verifies macOS Translation framework readiness, the Swift helper, Xcode toolchain availability, and installed language packs.
- **Apple Native readiness failures now give actionable setup guidance.** Users are told whether they need to update macOS, install Xcode, build/ship the helper, or download the required Translation Languages packs before retrying.

### Tests
- **Apple Native integration has helper, package, Core, Localization, and UI verification.** The release includes live Swift helper smoke coverage for installed/missing language packs plus targeted builds/tests for translation, localization, Core settings preflight, and webview type-checking.

## [1.2.149] - 2026-05-05
### Fixed
- **Workflow and Development Tree prompts now start with localized instructions for Russian settings.** Description, Virtual Simulation, Diagram Modules, and Development Tree node first prompts now materialize a Russian instruction block when Settings > General > Reasoning is `ru`, while preserving filenames, ids, statuses, DSL markers, `agent-fill`, method/event names, and structural headings as canonical tokens.
- **Development Tree contract draft prose now stays localized.** `ModuleFacadeContract.draft.md` and `ClusterFacadeContract.draft.md` are no longer treated as English-prose exceptions; only canonical identifiers remain English.
- **Draft readiness now rejects malformed `agent-fill` marker balance.** Filled drafts with orphaned or unbalanced fill markers stay `in_progress` instead of being marked ready.

### Tests
- **Localized prompt materialization has targeted regression coverage.** Tests now compare localized and non-localized prompt variants, lock protected canonical tokens, verify cache/materializer dimensions, and cover workflow prompt language plus Development Tree marker readiness.

## [1.2.148] - 2026-05-05
### Fixed
- **Development Tree readiness now refreshes after draft writes.** Core includes Development Tree draft artifact mtimes in the workflow state freshness signal, so completed Product Part, Cluster, and Module drafts can turn ready without switching steps.
- **Active Development Tree artifact panels now re-read filled drafts.** Project Manager refreshes the right artifact panel for the selected Development Tree node when workflow state freshness changes, replacing stale empty drafts with the agent-filled artifact content.

### Tests
- **Live readiness refresh has targeted regression coverage.** Tests now cover Core readiness recomputation after draft writes, client parsing of refreshed Development Tree metadata, and sidebar color updates from refreshed snapshots.

## [1.2.147] - 2026-05-05
### Fixed
- **Development Tree draft-pass agents now stay inside first-prompt context.** Product Part, Cluster, and Module first-draft prompts now explicitly forbid reading, searching, listing, or opening additional workspace files during the automatic draft pass.
- **Truncated scoped context now becomes an Open question instead of a file read.** If a Development Tree excerpt is incomplete, the agent records the uncertainty in the draft and waits for explicit user permission before reading more files.

### Tests
- **Draft-pass read boundaries are covered by Core prompt tests.** Tests assert the no-read boundary, user-permission rule, and truncated-excerpt behavior in Development Tree node prompts.

## [1.2.146] - 2026-05-05
### Fixed
- **Development Tree Product Part prompts now receive exact owner Markdown in full.** When `diagram_modules/product-parts/<part-id>.md` exists for the selected Product Part node, Core sends the complete file as protected context instead of letting scoped snippet ranking reduce it to a heading.
- **Scoped context ranking now stays reserved for indirect sources.** `Final_Description.md`, `virtual-simulation.md`, and `product-parts.index.md` still provide bounded excerpts, while direct owner Markdown cannot be displaced by broad anchor matches.

### Tests
- **Exact owner context is covered by oracle-style Core tests.** The new regression test independently reads and parses real-shape source artifacts, assembles expected Product Part / Cluster / Module context, and compares that expectation against the first prompt emitted by Core Runtime.

## [1.2.145] - 2026-05-05
### Fixed
- **Workflow stage directories are now prepared by Core Runtime before agent sessions start.** Description, Virtual Simulation, and Diagram Modules sessions get their parent artifact directories pre-created before provider session creation, so the first prompt cannot arrive before the target directory exists.
- **Workflow agent prompts now keep directory ownership out of agent work.** Description, Virtual Simulation, and Diagram Modules instructions now state that agents write artifact content at the provided target path while Core Runtime owns parent workflow directory preparation.

### Tests
- **Directory preflight order is covered by targeted Core verification.** Tests assert `diagram_modules/` and `diagram_modules/product-parts/` already exist inside `session:create` before the provider session is created, plus workflow template contract tests and Core build.

## [1.2.144] - 2026-05-05
### Fixed
- **Description first prompts now include the full questionnaire inline.** The questionnaire is sent as an authoritative fenced source block with provenance/fallback paths, so the agent does not need a separate turn just to read the initial answers.
- **Active artifact viewers now refresh when agents write drafts.** Project Manager refreshes the right artifact pane for both normal workflow artifacts and Development Tree draft artifacts while the user stays on the active session.
- **Development Tree node prompts now wait briefly for detailed Product Part context.** Product Part / Cluster / Module agents retain scoped excerpts and Product Part sessions no longer miss `diagram_modules/product-parts/<part-id>.md` when it appears moments after bootstrap starts.

### Tests
- **Follow-up workflow behavior is covered by targeted Project Manager and Core verification.** Tests lock Description inline source prompts, active artifact refresh matching, Development Tree prompt context extraction, delayed detailed Product Part context loading, webview typecheck, webview build, and Core build.

## [1.2.143] - 2026-05-05
### Fixed
- **Workflow prompt language now separates chat and artifact prose.** Description, Virtual Simulation, and Diagram Modules first prompts now carry Settings > General > Reasoning as the chat language and Settings > General > Artifacts for the User as the artifact prose language, while English examples/templates remain format-only and contract tokens stay stable.
- **Early workflow steps now receive upstream artifacts inline.** Virtual Simulation receives the full `Final_Description.md`; Diagram Modules receives the full `Final_Description.md` and `virtual-simulation.md` in the first prompt with provenance and fallback paths.

### Tests
- **Workflow prompt language behavior is covered by targeted Project Manager and Core verification.** Tests lock prompt language separation, settings-backed start wiring, inline source payloads, template sync, and Diagram Modules structural-token boundaries.

## [1.2.142] - 2026-05-05
### Fixed
- **Development Tree node-agent prompts now use scoped upstream context.** Product Part, Cluster, and Module bootstrap prompts no longer paste broad upstream artifacts into every node; Core extracts deterministic excerpts that match the selected node, its Product Part, and its Cluster.
- **Development Tree draft artifacts now follow the configured artifact language.** Node-agent first prompts separate chat language from Settings > General > Reasoning and draft prose language from Settings > General > Artifacts for the User, while preserving canonical ids, filenames, generated blocks, and structural labels.

### Tests
- **Scoped prompt and artifact-language behavior is covered by targeted Core tests.** Tests now lock context extraction, bootstrap loading, response-language resolution, and settings-backed draft artifact language selection.

## [1.2.141] - 2026-05-05
### Fixed
- **Development Tree node-agent first prompts now include existing workflow context.** New Product Part, Cluster, and Module bootstrap prompts include bounded prior context from `Final_Description.md`, `virtual-simulation.md`, `product-parts.index.md`, and the selected Product Part artifact when those files exist in the workspace.
- **Node agents are told not to restart discovery from zero.** The prompt now treats upstream artifacts as prior context and explicitly tells the agent not to ask the user to re-explain information already present there.

### Tests
- **Prompt artifact context is covered by targeted Core tests.** Tests now verify both prompt rendering and workspace-backed artifact loading during node session bootstrap.

## [1.2.140] - 2026-05-05
### Fixed
- **Development Tree node session tabs now show only the node name.** Tabs for `development_tree/...` sessions no longer expose the full materialized path and instead render the final Product Part, Cluster, or Module segment in readable Title Case.
- **Development Tree node-agent first prompts now carry the configured reasoning language.** New node bootstrap prompts include the response-language instruction from Settings > General > Reasoning, with the persisted default language as fallback.

### Tests
- **Session polish is covered by targeted UI/Core tests.** Tests now lock short tab labels, prompt-level response-language text, and settings-backed language resolution during node session bootstrap.

## [1.2.139] - 2026-05-05
### Fixed
- **Development Tree node selection now clears stale Diagram Modules session state.** Product Part, Cluster, and Module clicks now outrank an older Diagram Modules `stepStartedIntent`, and the Project Manager session surface ignores live dialog overrides whose stage no longer matches the selected node `development_tree/...` startup stage.

### Tests
- **Stale dialog routing is covered by targeted Project Manager regression tests.** Tests now lock selected-node priority over `stepStartedIntent`, stage-scoped dialog overrides, exact dialog matching, runtime node-path fallback, webview typecheck, and webview bundle generation.

## [1.2.138] - 2026-05-05
### Fixed
- **Development Tree node selection no longer falls back to the Diagram Modules dialog.** When a selected Product Part, Cluster, or Module has draft artifacts but no exact session metadata in the branch event, Project Manager now clears the Diagram Modules dialog intent and scopes the left runtime session list by the selected node `development_tree/...` path.

### Tests
- **Runtime session fallback is covered by targeted Project Manager verification.** Logs confirmed node sessions exist in continuity and provider JSONL while PM still resolved `diagram_modules`; tests now lock the selected-node `initialDialogIntent=null` fallback and node-path `startupStage` behavior.

## [1.2.137] - 2026-05-05
### Fixed
- **Development Tree node selection now opens the exact node session.** Product Part, Cluster, and Module selections pass the concrete `dialogId`, `rootSessionId`, and `sessionId` into the Project Manager session surface, so the left pane resolves the selected node dialog before falling back to provider/stage matching.

### Tests
- **Node session routing has targeted regression coverage.** Project Manager tests now verify that exact node dialog identity wins over a newer generic `Diagram Modules` dialog, with webview typecheck and build verification before release prep.

## [1.2.136] - 2026-05-05
### Fixed
- **Development Tree sidebar is back to pure Product Part / Cluster / Module structure.** Node draft artifacts and sessions are no longer rendered as child rows inside the sidebar tree.
- **Selecting a Development Tree node opens its working surfaces.** Product Part, Cluster, and Module selection now routes node metadata into Project Manager: the node session opens in the left session pane and the node draft artifacts are available in the right artifact pane with per-file switching.

### Tests
- **Node detail routing is covered by targeted Project Manager verification.** Tests confirm artifact/session metadata stays out of sidebar rows, remains available on branch selection, and the webview typecheck/build path passes.

## [1.2.135] - 2026-05-05
### Fixed
- **Development Tree node sessions now keep their concrete workflow identity.** Product Part, Cluster, and Module bootstrap sessions now use the materialized node path under `development_tree/materialized/...` instead of falling into `continuity/unknown`, and dialog IDs include the concrete node suffix instead of a generic `development-tree` suffix.
- **Development Tree node sessions inherit the actual workflow provider.** Node bootstrap now resolves the provider from the latest `diagram_modules` continuity chain for the workspace, with the configured provider only as fallback.
- **Project Manager now shows node-level artifacts and sessions.** Core exposes draft artifacts and latest session metadata per Product Part / Cluster / Module, Project Manager parses that metadata, and the Development Tree renders `Artifact: ...` and `Session: ...` rows under their owning nodes.

### Tests
- **Retest verification covers the namespace, continuity, session naming, parser, and PM rendering path.** Targeted Core and Project Manager checks passed before this release prep, including core build, webview typecheck, webview bundle generation, and plan validation.

## [1.2.134] - 2026-05-04
### Added
- **Development Tree now materializes after Diagram Modules.** Core builds the existing Project Manager Development Tree snapshot into a neutral workspace-owned filesystem tree under `.codeai-hub/<workspace-slug>/development_tree/materialized/`, then bootstraps structural draft artifacts and first-message agent session intents for materialized Product Part, Cluster, and Module nodes.
- **Development Tree readiness now reaches the sidebar.** Draft content is classified as `idle`, `in_progress`, or `ready`, exposed through the Core snapshot payload, parsed by Project Manager, and rendered as gray/orange/green branch-node state.

### Fixed
- **Diagram Modules completion now requires real Product Part structure.** Product Part artifacts with only headings, missing `Part ID`, mismatched IDs, or no valid Cluster/Module nodes no longer count as completed.
- **Skeleton-only planned Product Parts no longer create folders, drafts, or sessions.** Planned entries stay visible as skeleton nodes until their matching Product Part artifact exists.

### Tests
- **Development Tree materialization coverage now spans Core and PM.** Targeted tests cover artifact validation, filesystem planning/apply, draft preservation, first-message session bootstrap, readiness aggregation, Project Manager parsing/rendering, and manual workspace verification.

## [1.2.133] - 2026-05-03
### Fixed
- **Documentation Tree continuity rollover no longer blocks on agent-authored reports.** `Description`, `Virtual Simulation`, and `Diagram Modules` now use a fast synthetic rollover path that creates the next session, unlocks input after target materialization, skips Create Report/report polling/resume bootstrap, and attaches the continuation contract only to the next real user message.
- **Continuation turns now preserve the user's visible conversation context.** The first user turn after rollover carries the normal workflow start/step contract, explicit `Continuation Mode`, the last user-visible assistant message from the previous session, and the user's answer while UI/history keep showing only the original user text.

### Tests
- **Fast rollover coverage added across direct and production paths.** Targeted Core tests cover stale report-state cleanup, no internal bootstrap turn, inherited Codex model/reasoning binding, all three Documentation Tree stages through post-turn token usage, and the continuation instruction envelope contract.

## [1.2.132] - 2026-05-03
### Fixed
- **Codex flow-node continuity rollover now preserves workflow context and per-turn model/reasoning.** Reopened `Description`, `Virtual Simulation`, and `Diagram Modules` trunk sessions materialize with their workspace/stage context, rollover-created Codex sessions inherit the current session binding, and stale-provider retry re-sends with the active Codex turn config instead of falling back to stale defaults.
- **Post-turn continuity decisions no longer leave PM input stuck in resuming state.** Terminal snapshot reasons (`no_rollover_needed`, `resume_ready`, `resume_failed`, `resume_timeout`) return the session stream to idle, including aborted plain turns.

### Tests
- **Continuity hotfix coverage added across Core and PM snapshot reconciliation.** Targeted tests cover Codex restored dialog context hydration, trunk rollover eligibility, delayed usage arbitration for `Virtual Simulation`, continuity model-binding refresh, inherited rollover binding, stale rebind retry, and no-indefinite-resuming terminal decisions.

## [1.2.131] - 2026-05-03
### Fixed
- **Codex app-server startup is compatible with `codex-cli 0.128.0`.** CodeAI Hub no longer passes legacy partial `mcp_servers.*.enabled=false` config overrides that make Codex reject startup with `invalid transport in mcp_servers.codex` and leave reopened Codex sessions at `Provider codexCli unavailable`.

### Tests
- **Codex startup profile now has targeted regression coverage and a direct process smoke.** The app-server process profile test covers the updated startup args, and the built `CodexAppServerProcess.start()` path was smoke-tested against local `codex-cli 0.128.0`.

## [1.2.130] - 2026-05-02
### Fixed
- **Gemini provider module is bundled in the clean Core runtime.** The Core runtime now carries `@codeai-hub/gemini-module` as an explicit dependency, so a VSIX plus matching runtime release folder can load Gemini before checking CLI authentication instead of reporting `Gemini provider module is not installed`.

### Tests
- **Release validation now fails if Core runtime is missing the Gemini provider module.** `build-release.sh` checks and loads the bundled Gemini module from the staged Core runtime alongside the existing provider and localization bundle checks.

## [1.2.129] - 2026-05-02
### Changed
- **Capture Workbench accepted build is repackaged under a clean handoff release number.** This release preserves the accepted `1.2.128` behavior and provides a fresh VSIX/runtime tarball set for clean-install archival and external handoff.

### Notes
- **External handoff still needs the runtime tarballs alongside the VSIX.** The VSIX installs the extension shell; Core, Launcher, and UI runtime archives are resolved from `~/.codeai-hub/releases/` during installation/startup, and provider CLI/auth setup remains user-owned.

## [1.2.128] - 2026-05-02
### Fixed
- **Capture Workbench reasoning switches now use one parent-owned selection state.** The selector bar and Managed snapshot row no longer keep separate selection copies, so switching Claude reasoning from `thinking-high` to `thinking-off` and immediately re-capturing targets the visible slot on the first click.

### Tests
- **Selection bar regression coverage now rejects duplicate local selection state.** The Workbench selector test asserts the bar is controlled by the detached parent and still preserves sticky load/save wiring.

## [1.2.127] - 2026-05-02
### Changed
- **Capture Workbench workflow fix is repackaged under a fresh release number.** This release preserves the `1.2.126` workflow-state transport fix and provides a clean install target after an interrupted local VSIX installation.

## [1.2.126] - 2026-05-02
### Fixed
- **Capture Workbench workflow-step captures now keep the Project Manager API receiver bound.** Description, Virtual Simulation, and Diagram Modules managed capture can resolve workflow state without throwing `this.getHttpUrl is not a function`; Translation remains on the direct capture path.

### Tests
- **Workbench runner coverage now reproduces class-style API receiver binding.** The regression test exercises workflow scenario prompt building with a transport method that depends on `this.getHttpUrl()`.

## [1.2.125] - 2026-05-02
### Fixed
- **Detached Capture Workbench selectors no longer use native HTML popup controls.** Step, Provider, Model, and Reasoning now render DOM-owned button/listbox controls to avoid the standalone CEF/macOS native popup crash path seen in `1.2.124`.

### Tests
- **Capture Workbench selector regression coverage now rejects native selects.** The selection bar test verifies the rendered selector surface and selector source files do not reintroduce `<select>`, `<option>`, or `<optgroup>`.

## [1.2.124] - 2026-05-02
### Added
- **Capture Workbench MVP is ready for release packaging.** Settings → General now opens a detached Project Manager workbench for managed provider-native request snapshots, explicit Step/Provider/Model/Reasoning selection, two-generation slot rotation, artifact links, and semantic `Managed: current vs previous` diff sections over Core-owned capture artifacts.

### Changed
- **Native request capture diagnostics moved out of the Settings card.** The shared Settings surface now owns only the launcher button, while Project Manager owns the detached workbench UI, PM bridge/index store, Core-backed `workbench:state:*` persistence, and `workbench:artifact:read` records path.

### Tests
- **Capture Workbench coverage added across Core, providers, PM bridge, and UI.** Focused tests cover applied capture envelopes, reasoning override transport, Core state/artifact bridge, Workbench selection persistence, managed recapture slot rotation, provider diff extractors, diff renderer modes, and Settings launcher migration.

## [1.2.123] - 2026-05-01
### Fixed
- **Provider Native Request Capture now works on empty workspaces for workflow scenarios.** The Project Manager capture runner bypasses upstream artifact gating only for the diagnostic capture path, so `Virtual Simulation` and `Diagram Modules` captures can generate provider request artifacts before `Final_Description.md` or `virtual-simulation.md` exists. Normal workflow turns still enforce the `Workflow_CLI.md` upstream artifact contract.

### Tests
- **Capture bypass verification added.** New Project Manager unit coverage checks the resolver default guard behavior, diagnostic bypass canonical paths, runner capture payloads for `Virtual Simulation` / `Diagram Modules`, and the unchanged direct `Translation` path.

## [1.2.122] - 2026-05-01
### Changed
- **Cleanup release for dead-code and stale-reference hygiene.** Removed the unused `diagram-modules-agent` source stub, deleted dead CSS selectors from the legacy webview/session and Project Manager stylesheets, removed stale localization keys, and corrected documentation/config references that no longer matched the current codebase.
- **Repository analysis config now reflects current packages.** `knip.json`, `.vscodeignore`, and direct workspace dependencies now include the active Codex app-server module and shared translation package edges without legacy package names.

### Tests
- **Cleanup verification passed before release packaging.** Passed architecture, lint, knip, markdown links, duplication, Project Manager/webview builds, webview typecheck, and targeted Core/Claude/Gemini workspace builds.

## [1.2.121] - 2026-05-01
### Changed
- **Status Panel pickers behave like provider-tinted buttons.** The model card and the reasoning card now share the same default → hover → active state model as the toggle buttons below them. The active option is highlighted in the provider color (Claude warm peach, Codex cyan, Gemini cool lavender) using the same RGBA tokens as `session-status-button--*`, hover lights the option up in the provider hue, and clicking a different option swaps the active highlight from the previous option to the new one before closing the popup. Smooth 120 ms transitions on background/border/color, plus a `focus-visible` outline for keyboard navigation.

## [1.2.120] - 2026-05-01
### Changed
- **Status Panel model/reasoning switches are now decoupled.** Both Claude and Codex Status Panel switches travel as two independent transport commands per provider, never one coupled payload: `session:claude:model-switch` carries only `targetModelId`, the new `session:claude:thinking-switch` carries only `thinkingEnabled` + optional `targetReasoningEffort`; `session:codex:model-switch` carries only `targetModelId`, and the new `session:codex:reasoning-switch` carries only `targetReasoningEffort`. Model-only handlers preserve the previous `reasoningEffort`/`thinkingEnabled` from `Session.modelBinding`; reasoning-only handlers preserve the previous `baseModelId`. This fixes the regression where switching reasoning unintentionally rebound the model (and vice versa) on stale UI snapshots.
- **Status Panel pickers no longer mix dimensions.** The model card lists only model names, the reasoning card lists only effort levels. The active option in both cards is highlighted through `data-active="true"` + `data-provider` against the same RGBA tokens as the toggle button below the picker; the previous reasoning suffix on each model row and the textual `active` label on the active reasoning row are removed.

### Tests
- **Decoupled switch coverage across Core and PM/UI.** New tests for `session-request-handler-claude-thinking-switch.ts` and `session-request-handler-codex-reasoning-switch.ts` cover effort transitions, base-model preservation, unsupported-effort/unknown-model rejection, and non-target-provider session ignore. Existing model-switch and dialog-helpers/picker tests rewritten around the model-only callbacks and the new active-highlight contract.

## [1.2.119] - 2026-05-01
### Added
- **Claude Status Panel model/thinking switch is now active.** Claude sessions can switch `Sonnet` / `Opus` / `Haiku` and thinking `off | low | medium | high | xhigh | max` from the lower status chips. Core updates the logical `Session.modelBinding`, broadcasts `session:model:update`, keeps Settings defaults untouched, and applies the selected model/thinking config on the next Claude SDK turn.

### Tests
- **Claude switch coverage includes native request evidence.** Passed focused Claude capability/provider/SDK/native-capture tests, Core switch tests, PM/UI picker and dispatch tests, plus targeted Claude/Core/Project Manager/webview builds before release packaging.

## [1.2.118] - 2026-04-30
### Fixed
- **Codex Spark model switch now sends explicit `summary: "none"`.** Runtime logs showed that omitting `turn/start.summary` lets Codex app-server default Spark turns to `detailed`, which then becomes unsupported native `reasoning.summary`. Spark now receives explicit `summary: "none"` in workflow turns, model-switch turns, native capture, translation capture, and Core invocation profiles.
- **User retest accepted the final Codex switch contract.** Native rollout evidence confirmed one Codex session using `gpt-5.4-mini` → `gpt-5.3-codex-spark` → `gpt-5.5`, with Spark recorded as `summary=none`. This supersedes the failed `1.2.116`/`1.2.117` omit/neutralize attempts.

### Tests
- **Spark summary-none contract covered across runtime paths.** Passed focused Codex App Server facade/helper/capture/translation tests, Core model invocation profile smoke tests, and targeted Codex/Core workspace builds before release packaging.

## [1.2.117] - 2026-04-30
### Fixed
- **Codex Spark model switch no longer inherits provider-home reasoning summary fallback.** Provider-home `model_reasoning_summary` is now forced to `none` by both runtime startup materialization and extension-side settings sync, so switching an active Codex session from `gpt-5.2` to `gpt-5.3-codex-spark` cannot reintroduce unsupported native `reasoning.summary` through global config.

### Tests
- **Spark summary neutralization covered before release packaging.** Added provider-home materializer and settings-sync regression tests, reran the Spark raw `turn/start` payload test, and passed Codex App Server module build plus root TypeScript compilation.

## [1.2.116] - 2026-04-30
### Added
- **Codex Status Panel model/reasoning switch is restored with a capability-gated same-session path.** Codex sessions can switch model and reasoning from the lower status chips without resending the previous user message. Core updates the live session binding, broadcasts `session:model:update`, injects one `<model_switch>` instruction item on the next turn, and keeps Settings defaults from overwriting the selected model/reasoning.

### Fixed
- **Spark switch payloads no longer send unsupported reasoning summary fields.** Codex turn payloads are rebuilt from the runtime model capability registry, so `gpt-5.3-codex-spark` omits explicit `summary` while non-Spark models keep the shared reasoning summary policy.
- **Dialog resume no longer overwrites a newer live switch with stale continuity binding.** Existing runtime sessions only hydrate continuity `modelBinding` snapshots when the continuity timestamp is newer than the live binding.

### Tests
- **Model switch regression coverage added before release packaging.** Added registry parity tests, Core switch transport and dialog-send continuity tests, PM dispatch wiring tests, UI picker tests, and Codex raw turn payload coverage for Spark model switch without `summary`.

## [1.2.115] - 2026-04-30
### Changed
- **Release rebuilt from the rollback point after the failed status-panel switcher scope.** The in-place status-panel model/reasoning switching implementation from releases `1.2.112` through `1.2.114` has been removed. The lower Session Status Panel keeps the passive model and reasoning chips that existed in `1.2.111`; future provider/model/reasoning switching will be redesigned around provider-segment handoff compatibility instead of mutating an incompatible native provider thread in place.
- **Release process guardrails are retained.** The User Visual Acceptance Gate remains documented so built artifacts are not treated as completed scope until the user installs/runs the release and explicitly confirms acceptance.

### Tests
- **Rollback verification passed before release packaging.** Passed webview typecheck/build, Claude/Codex/Gemini provider builds, Core build after provider modules, focused Session Status Panel and Project Manager session-view tests, plus commit-hook architecture/lint/knip checks.

## [1.2.111] - 2026-04-29
### Fixed
- **Runtime reliability follow-up hardens teardown and diagnostics.** Core WebSocket server/client error events are now owned and logged, startup/workspace best-effort failures produce sanitized diagnostics, runtime dispose/stop paths clear owned maps and provider recovery timers, legacy continuity handoff state can retry after failure, unified-session close keeps writer ownership until terminal close promises settle, and the remaining rollover runtime factory definite-assignment bypass is replaced by an explicit deferred reference.
- **Core Bridge reconnect status avoids error/close churn.** Browser-side websocket `error` events now log diagnostics and delegate reconnect status ownership to the scheduler/dedupe path.

### Tests
- **Targeted runtime reliability verification passed.** Passed Core build, webview typecheck/build, and focused Node tests for WebSocket error handling, continuity retry, session runtime dispose, provider recovery scheduler dispose, runtime factory wiring, and unified-session storage close.

## [1.2.110] - 2026-04-29
### Fixed
- **Sidebar tint reflects strict per-step attribution.** The 1.2.109 upstream inheritance (virtual_simulation falling back to Description's provider, diagram_modules falling back to VS chain or Description) was a regression: the StageConfirmationCard inherited-provider badge is a preselect hint the user can change, not a binding, so the sidebar tint must not anticipate that hint. `useStepProviderResolver.forStage` now returns `null` for idle VS/DM stages even when an upstream chain has provider attribution; the row renders neutral until the step's own session actually attaches. The legitimate `description.primarySession.providerId` fallback for the description stage itself is preserved (it is description's own session, not upstream inheritance).

## [1.2.109] - 2026-04-29
### Fixed
- **Idle workflow steps inherit upstream provider tint.** Until v1.2.108, an idle workflow step (no own continuity chain) rendered fully neutral, even when an upstream step had already established a provider. Now `useStepProviderResolver.forStage` mirrors `resolveInheritedProviderId` from `workflow-provider-resolver.ts`: virtual_simulation falls back to `description.primarySession.providerId`; diagram_modules falls back to the latest virtual_simulation chain and then to description. The sidebar tint stays consistent with the inherited-provider badge that `StageConfirmationCard` already shows when preselecting the next step.
- **Selected idle step no longer inherits legacy green.** A truly idle step (no own chain AND no upstream attribution) selected in the sidebar previously showed `--pm-accent-strong` (green) fill + border via the legacy selection rules. An explicit `:not([data-provider]).pm-tree__item--selected` override now applies a neutral `rgba(255,255,255,0.04)` fill, `rgba(255,255,255,0.18)` border, and `var(--pm-text-primary)` label so fresh-workspace selections stay color-free.

### Changed
- **Stage Confirmation Card provider radio pills tinted per provider.** The Claude / Codex / Gemini selection pills (and the inherited-provider badge) now use the same corporate tokens as the sidebar tree and the model/reasoning chips — Claude warm peach, Codex cyan, Gemini cool lavender — instead of the legacy hardcoded `rgba(95,227,186,*)` (green) selection state. Tokens live in `src/client/project-manager/components/shared/stage-confirmation-card-provider-tint.ts` and mirror `doc/SolidWorks-WorkFlow/DesignSystem/CorporateDesign.html`.

## [1.2.108] - 2026-04-29
### Fixed
- **Development Tree branch nodes stay neutral.** Until v1.2.107, the P/C/M branch nodes (Product Part / Cluster / Module) inherited the provider tint of the latest `diagram_modules` trunk chain — but the Development Tree skeleton is materialized from that artifact and the individual branch items do not have a provider session of their own yet. `useStepProviderResolver.forBranchPart` / `forBranchCluster` / `forBranchModule` now always return `null` for v1, so branch nodes render with the neutral `--pm-text-primary` label and no `data-provider` attribute. When per-branch sessions (`Cluster Design` / `Module Design`) materialize, the resolver will be extended to return real attribution per `partId` / `clusterId` / `moduleId` without changing the call-site contract.

## [1.2.107] - 2026-04-29
### Fixed
- **Idle workflow steps now render neutral.** A regression in v1.2.106 caused workflow steps without any continuity attribution (never been worked on by any provider) to inherit the `codex` cyan tint via the resolver's default fallback. The `useStepProviderResolver` hook now returns `SidebarProviderId | null` and `workspace-tree.tsx` omits the `data-provider` attribute when the resolver returns null, so unattributed steps fall back to the existing neutral `--pm-text-primary` label and stay free of any provider color until they receive their first provider segment. The `fallbackProviderId` parameter remains available for callers that explicitly want a tint default.

## [1.2.106] - 2026-04-29
### Added
- **Workflow Tree sidebar tinted per provider.** Each row of the Project Manager sidebar (trunk Documentation Tree stages and Development Tree branch nodes — Product Part / Cluster / Module) now carries a `data-provider` attribute resolved from `WorkflowStateSnapshot.continuity.chains[].segments[].providerId`, so unselected steps render their label in the provider's accent hue and selected steps render with a soft provider fill + provider border + muted text. Branch nodes inherit the provider of the latest `diagram_modules` chain until per-branch sessions exist; idle stages fall back to the resolver's default provider.
- **Corporate design system folder.** New `doc/SolidWorks-WorkFlow/DesignSystem/CorporateDesign.html` documents the canonical provider color tokens (Claude warm peach, Codex cyan, Gemini cool lavender) and the neutral selected-text + light font-weight tokens; this is the first SSOT entry for the corporate design and will grow with future sections (typography, spacing, semantic colors).

### Changed
- **Sidebar legacy hardcodes replaced.** The `pm-tree__type-marker` in-progress `#d9a441` (yellow) and done `--pm-accent-strong` (green), the `pm-tree__type-marker--has-children` outline, the `pm-tree__pp-wrapper--open` PP frame border, and the `pm-tree__cluster-children` connector lines now all read from per-row provider variables (`--row-soft`, `--row-border`, `--row-accent`) instead of the old uniform tokens. Sidebar font-weight is now `300` (light) regardless of node type. Legacy `--pm-accent-strong` rules remain as a defensive fallback when `[data-provider]` is absent.

## [1.2.105] - 2026-04-29
### Changed
- **Tokens chip metric is muted to match the model/reasoning chips.** The numeric `used (remaining%)` value inside the right-most session status chip now uses the same neutral grey `#b0b0b0` as the default-state model and reasoning button chips, so the digits stop pulling visual attention away from the model identity.

## [1.2.104] - 2026-04-29
### Changed
- **Session status row split into four chips.** The status surface directly under `InputPanel` now renders as a label chip (`Модель:`), a provider-tinted button chip carrying the model display name, an optional provider-tinted button chip carrying the reasoning value, and a right-most tokens chip with the `used (remaining%)` metric and a free right edge reserved for future per-session signals. The component now returns nothing when Core is not ready or `models[0]` is missing; the legacy `Core Supervisor: starting…` and single-line summary fallbacks were removed.
- **Localization key for the new label.** Added `session.status.model_label` to the approved `messages_for_the_user.json` dictionary and the legacy `system_feedback.json` mirror.

### Tests
- **Four-chip status panel is covered by unit tests.** `status-panel.test.tsx` asserts the four-chip layout per provider, the reasoning chip omission rule, the tokens metric, the not-ready and missing-models null returns, and the optional debug strip.

## [1.2.103] - 2026-04-28
### Fixed
- **Runtime WebSocket boundaries are now explicit and validated.** Project Manager Core stream connection is idempotent with intentional disconnect cleanup, PM/Core incoming WebSocket frames pass structural validators before dispatch, and malformed frames fail at the boundary instead of relying on raw casts.
- **Core Bridge and provider runtime stability diagnostics are safer.** Browser/Core Bridge best-effort failures now emit sanitized diagnostics for server-message parsing, session history hydration, status snapshots, and supervisor requests without changing reconnect UX.
- **Hot-path settings reads are cached without moving settings ownership.** Core settings/default/translation reads use path-scoped short TTL snapshots with invalidation after settings writes, and Claude/Codex/Gemini provider-local fallback reads use short path-scoped caches instead of repeated synchronous `settings.json` reads.
- **Gemini and Core runtime lifecycle wiring is more deterministic.** Gemini adapter-owned session listeners are disposed/reassigned on close/session id changes, and Core runtime factory callback cycles now use explicit deferred refs instead of definite assignment assertions.

### Tests
- **Runtime remediation verification passed before release packaging.** Passed focused PM/Core/provider regression tests plus webview typecheck/build, Project Manager build, Claude/Codex/Gemini provider builds, and Core build.

## [1.2.102] - 2026-04-28
### Fixed
- **Session model binding now survives real workflow continuity.** Core persists `session.modelBinding` into continuity segment/index data, hydrates restored Project Manager dialogs from that binding, and clones it for `Remaining context threshold (%)` continuation sessions instead of rereading the current Settings default.
- **Project Manager no longer relabels bound sessions from unbound runtime fallbacks.** Client bridge normalization preserves Core `modelBinding`, dialog bootstrap carries it into placeholders, and runtime model sync refuses to overwrite a binding-owned label with a Settings-derived update.

### Tests
- **Persistent binding regression coverage passed before release packaging.** Passed Core build, webview build/typecheck, Project Manager build, and focused regressions for same-provider sessions with different bound models, restored dialog binding, continuity persistence, and rollover inheritance.

## [1.2.101] - 2026-04-28
### Added
- **Workflow sessions now bind their model identity at creation time.** Core stores a session-scoped effective model binding, serializes it through session/runtime snapshots, and uses it for later turns instead of letting Settings changes rewrite existing sessions.
- **Explicit model switching now updates the session binding intentionally.** The `switch_model` path mutates the logical session binding and preserves the effective `session:model:update` broadcast contract.

### Fixed
- **Project Manager keeps bound session labels stable across Settings edits.** Session snapshots are seeded from `SessionRecord.modelBinding`, Settings sync no longer overwrites binding/runtime-owned model info, and same-provider sessions can display different frozen model labels.

### Tests
- **Targeted SMB verification passed before release packaging.** Passed Core build, webview build, webview typecheck, and focused regression coverage for session-bound model labels and Settings sync ownership.

## [1.2.100] - 2026-04-28
### Changed
- **Codex GPT translation engines are now translator-only by contract.** `gpt-5.4-mini` and `gpt-5.3-codex-spark` translation calls use dedicated translation instructions that forbid workflow-agent work, tools, shell/file/patch access, web search, planning, and user-input requests.
- **Codex translation capture is guarded against workflow prompt leakage.** The `Translation` native request capture route now verifies the `translation` purpose, `codex:translation` process profile, `codex:translation-tools-minimal` policy key, `workflowPrompt = null`, and zero workflow prompt metadata.

### Tests
- **Targeted Codex/Core verification passed before release packaging.** Passed Codex App Server and Core builds plus focused native capture, Codex diagnostic capture, and model invocation profile tests.

## [1.2.99] - 2026-04-28
### Added
- **Model invocation profiles now separate workflow-agent and translation purposes.** Core resolves provider/model/step profiles with compatible model lists, keeps `diagnostic` as a capture mode rather than a profile, and loads user-editable text-only instruction fragments without exposing process flags, tools, sandbox, or approval policy.
- **Template sync now preserves user-modified instruction templates.** Clean bundled templates update in place, user edits are preserved, incoming bundled candidates are staged under `.incoming/<version>/`, and Project Manager settings can resolve updates by group or file.
- **Codex GPT translation engines now use the Codex App Server path first.** Core registers provider-owned Codex translation wrappers for the public Codex GPT translation ids, uses the translation-specific App Server profile, and keeps the shared `codex exec` engine as fallback during migration.
- **Provider Native Request Capture includes a real Translation scenario.** The Settings capture card adds `Translation`; Core routes it through the translation invocation profile with a small fixed sample instead of a workflow first-turn prompt.

### Tests
- **Targeted profile and release checks passed before release packaging.** Passed Codex App Server, Core, translation, webview typecheck/build, Project Manager build, and focused regression tests for profile resolution, template overrides, Codex translation fallback, engine registration, and translation native request capture.

## [1.2.98] - 2026-04-27
### Changed
- **Main repository release rebuilt after retest merge.** This release packages the merged `main` line after `1.2.97`, combining the main-line Codex reasoning paragraph/translation timeout work with the retest-line Spark compatibility, progress-update guard, provider SDK/raw log removal, and provider-home summary config materialization.

### Tests
- **Release verification build planned from a clean main tree.** The release flow rebuilds provider modules, Core, UI bundles, CEF launcher, runtime tarballs, and the final VSIX from the merged repository state.

## [1.2.97] - 2026-04-27
### Changed
- **Merged the main-line Codex reasoning paragraph stream work into the retest release line.** Codex reasoning summaries keep stable per-block ids and can be emitted paragraph-by-paragraph for progressive translation overlays.
- **Merged the main-line reasoning translation timeout adjustment.** Live reasoning overlay translation keeps the longer timeout profile from the main branch, reducing fallback English paragraphs for large Codex reasoning summaries.

### Fixed
- **Codex Spark remains compatible without reintroducing the unsupported turn parameter.** `gpt-5.3-codex-spark` still omits explicit `turn/start.summary`, and the Codex App Server process materializes provider-home `model_reasoning_summary = "auto" | "none"` from shared Codex settings before startup. User retest showed Spark still may not emit readable reasoning summaries; this is left as a provider-side limitation while preserving successful turns.
- **Non-Spark Codex summary behavior is guarded.** Other Codex models keep the existing explicit `turn/start.summary = "detailed" | "none"` path, so the Spark compatibility fix does not weaken normal visible reasoning controls.

### Tests
- **Targeted Codex provider checks passed.** Passed `npm run build --workspace @codeai-hub/codex-app-server-module` and direct Node tests for provider-home summary materialization, Spark summary omission, non-Spark `gpt-5.5` summary preservation, native request capture parity, and main-line reasoning paragraph streaming.
- **Targeted Core session-translation verification passed on the main line before merge.** Passed `npm run build --workspace=@codeai-hub/core` plus `node --test packages/core/dist/session-translation/session-translation-facade.test.js`.

## [1.2.96] - 2026-04-27
### Fixed
- **Codex Spark no longer receives unsupported explicit reasoning-summary parameters.** Normal Codex App Server turns and native request capture now omit `turn/start.summary` for `gpt-5.3-codex-spark`, avoiding the provider error `Unsupported parameter: 'reasoning.summary'`.
- **Codex Spark translation runtime is protected too.** Localization/reasoning translation uses `codex exec`, not App Server, but its temporary `config.toml` also now omits explicit `model_reasoning_summary` for `gpt-5.3-codex-spark`. Other Codex translation models still keep `model_reasoning_summary = "none"`.

### Tests
- **Targeted Codex provider checks passed.** Passed `npm run build --workspace @codeai-hub/codex-app-server-module` and regression tests for normal runtime/native capture Spark summary omission.
- **Targeted translation checks passed.** Passed `npm run build --workspace @codeai-hub/translation` and `node --test packages/translation/dist/codex-translation-runtime-home-facade.test.js`.

## [1.2.95] - 2026-04-27
### Changed
- **Codex progress updates are explicitly non-terminal.** The shared Codex early-workflow prompt now states that after an ordinary visible progress update, Codex must continue the same turn until the promised work or requested artifact is complete.
- **The guard is provider-level, not Description-specific.** No Description templates were changed; the rule applies through the shared Codex workflow prompt used by all Codex models and current early-workflow steps.

### Tests
- **Targeted Codex provider build passed before release.** Passed `npm run build --workspace @codeai-hub/codex-app-server-module`; runtime prompt and synced Codex prompt artifact have matching `Progress Updates` sections.

## [1.2.94] - 2026-04-27
### Changed
- **Provider-owned SDK/raw file logs are removed from runtime.** Claude, Codex, and Gemini no longer construct or call the file-backed mirrors under `~/.codeai-hub/logs/{claude,codex,gemini}`.
- **Codex app-server logger code is gone, not just disabled.** The deleted transport logger path removes SDK-log serialization from `child.stdin.write(...)` and app-server notification fan-out.
- **Runtime evidence is now explicit.** Audits should use live provider streams, session-local normalized history, provider-home artifacts, and optional native request capture instead of always-on SDK/raw JSONL mirrors.

### Tests
- **Provider cleanup verification passed.** `rg` found no runtime references to the removed SDK/raw loggers in `packages`, and targeted builds passed for Codex app-server, Claude, and Gemini provider modules.

## [1.2.93] - 2026-04-27
### Changed
- **Codex SDK transport logs are disabled.** `codex-app-server-session-logger.ts` is now a no-op compatibility shim and no longer creates process-wide or per-thread JSONL files under `~/.codeai-hub/logs/codex/`.
- **Runtime evidence stays on the real runtime paths.** Codex behavior continues to come from the live app-server JSON-RPC stream, provider-home rollout artifacts, session-local normalized dialog JSONL, and optional native request capture rather than from SDK transport logs.
- **Diagnostic report updated with the `1.2.92` result.** The retest confirmed that split file names were not the trigger; the remaining risk was filesystem work from SDK transport logging, which this release removes.

### Tests
- **Targeted Codex provider build passed before release.** Passed `npm run build --workspace @codeai-hub/codex-app-server-module`; Husky pre-commit gates passed on the implementation commit.

## [1.2.92] - 2026-04-27
### Changed
- **Diagnostic retest: Codex app-server logs keep split names but return to the flat log root.** Process-wide logs now use `~/.codeai-hub/logs/codex/sdk-codex-app-server-process-*.jsonl`, while per-thread logs use `~/.codeai-hub/logs/codex/sdk-codex-thread-<threadId>-*.jsonl`.
- **The split-folder `app-server-process/` and `threads/` layout from `1.2.91` is intentionally removed for this test.** This isolates whether ordinary Codex progress-message loss follows separate log folders / thread-log mkdir timing rather than file naming.
- **Diagnostic report added.** `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_Progress_Message_Regression_Diagnostics_1.2.91.md` records the evidence from `1.2.90` and `1.2.91`, including provider-native confirmation that system instructions were present.

### Tests
- **Targeted Codex provider build passed before release.** Passed `npm run build --workspace @codeai-hub/codex-app-server-module`; Husky pre-commit gates passed on the implementation commit.

## [1.2.91] - 2026-04-27
### Changed
- **Diagnostic retest: Codex app-server logs use split folders without the extra creation event.** Process-wide logs are written under `~/.codeai-hub/logs/codex/app-server-process/sdk-codex-app-server-process-*.jsonl`, and per-thread logs are written under `~/.codeai-hub/logs/codex/threads/sdk-codex-thread-<threadId>-*.jsonl`.
- **The `thread_log_created` process-log record from `1.2.89` remains disabled.** This isolates whether the folder/name split alone affects ordinary Codex progress-message emission.

### Tests
- **Targeted Codex provider build passed before release.** Passed `npm run build --workspace @codeai-hub/codex-app-server-module`; Husky pre-commit gates passed on the implementation commit.

## [1.2.90] - 2026-04-27
### Changed
- **Rollback retest: Codex diagnostic log layout returns to the `1.2.88` shape.** The per-thread SDK sublog remains enabled, but process and thread JSONL files are again written side-by-side under `~/.codeai-hub/logs/codex/` with the `sdk-codex-app-server-*.jsonl` and `sdk-codex-app-server-thread-<threadId>-*.jsonl` names.
- **The `1.2.89` folder split is intentionally removed.** This release is meant to test whether ordinary Codex progress messages return when only the log-layout cleanup is rolled back.

### Tests
- **Targeted Codex provider build passed before release.** Passed `npm run build --workspace @codeai-hub/codex-app-server-module`; Husky pre-commit gates passed on the rollback commit.

## [1.2.89] - 2026-04-27
### Changed
- **Codex app-server diagnostics now separate process and thread logs by folder.** Process-wide transport logs are written under `~/.codeai-hub/logs/codex/app-server-process/sdk-codex-app-server-process-*.jsonl`, while per-rollout/thread mirrors are written under `~/.codeai-hub/logs/codex/threads/sdk-codex-thread-<threadId>-*.jsonl`.
- **Process logs now point to their thread sublogs.** When a thread sublog is created, the process log records `thread_log_created` with the `threadId` and target path, making the two diagnostic layers explicit instead of looking like duplicate SDK sessions.

### Tests
- **Targeted Codex provider build passed before release.** Passed `npm run build --workspace @codeai-hub/codex-app-server-module`; Husky pre-commit gates passed on the implementation commit.

## [1.2.88] - 2026-04-27
### Added
- **Codex app-server now writes per-thread SDK sublogs.** In addition to the process-wide `sdk-codex-app-server-*.jsonl`, the Codex transport logger now writes `sdk-codex-app-server-thread-<threadId>-*.jsonl` for each rollout/thread so retests can inspect one Description run without manually filtering a long-lived app-server process log.
- **Thread sublogs preserve the app-server request/response boundary.** `thread/start` is attached after the returned `threadId` is known, while `turn/start` requests, matching responses, and thread-scoped notifications are written directly to the matching sublog.

### Tests
- **Targeted Codex provider build passed before release.** Passed `npm run build --workspace @codeai-hub/codex-app-server-module`; Husky pre-commit gates passed on the implementation commit.

## [1.2.87] - 2026-04-27
### Changed
- **Controlled Codex progress-message rollback release.** This release is intentionally built from the `1.2.86` baseline so the Codex Description-step retest can verify whether ordinary user-visible assistant progress messages still appear before the later reasoning paragraph streaming changes.
- **No implementation behavior is changed before the retest.** The goal is to produce a clean installable package from the known-good progress cadence baseline and collect runtime evidence.

### Tests
- **Full release automation is the acceptance gate.** `./scripts/build-all.sh` and `./scripts/build-release.sh --use-current-version` must complete for this rollback/retest package.

## [1.2.86] - 2026-04-27
### Changed
- **Codex progress-update cadence is stricter for long turns.** The early-architecture prompt now tells Codex not to continue silently through several internal analysis/tool cycles and to send a visible update about every 30 seconds while still working.
- **Codex has a work-cycle fallback when elapsed time is hard to estimate.** After 3-5 substantial tool calls, file-reading steps, or internal analysis cycles without a visible update, the prompt asks for one short visible assistant message before continuing.

### Tests
- **Targeted Codex provider build passed before release.** Passed `npm run build --workspace=@codeai-hub/codex-app-server-module` and Husky pre-commit gates on the prompt cadence change commit.

## [1.2.85] - 2026-04-27
### Changed
- **Codex progress-update prompt wording now targets visible chat messages.** The CodeAI Hub-owned Codex early-architecture prompt asks for ordinary user-visible assistant chat messages and explicitly excludes reasoning summaries, hidden commentary, tool-call notes, metadata, and other non-user-visible channels.
- **The agreed Codex system-prompt artifact stays in sync with runtime.** `Codex_My_System_Prompt.md` and `CODEAI_CODEX_EARLY_ARCHITECTURE_SYSTEM_PROMPT` now match exactly for the tuned Progress Updates section.

### Tests
- **Targeted Codex provider build passed before release.** Passed `npm run build --workspace=@codeai-hub/codex-app-server-module` and Husky pre-commit gates on the prompt change commit.

## [1.2.84] - 2026-04-27
### Added
- **Codex Settings now exposes `gpt-5.2` and `gpt-5.3-codex-spark`.** The shared Codex model registry and Core settings defaults accept both model IDs with default reasoning `medium`.
- **Codex model order is numeric/provider-family ascending.** Settings now lists `gpt-5.2`, `gpt-5.3-codex-spark`, `gpt-5.3-codex`, `gpt-5.4-mini`, `gpt-5.4`, then `gpt-5.5`.

### Fixed
- **Settings General footer no longer scrolls past the action bar.** The Settings shell clips outer overflow, the tab body owns vertical scrolling, and the footer remains anchored/reachable.

### Tests
- **Targeted checks covered the changed UI/Core surfaces.** Passed `npm run build:webview`, `npm run build:core`, and Husky pre-commit gates on all implementation commits.

## [1.2.83] - 2026-04-25
### Changed
- **Main merge verification release.** Confirms that the completed `codex/claude-instruction-stack-tests` work is present on `main` and that the merged branch can pass the full release packaging flow.
- **No new runtime behavior is introduced.** The `1.2.82` provider instruction/tool-profile baseline is carried forward unchanged.

### Tests
- **Release automation is the acceptance gate.** `./scripts/build-all.sh` and `./scripts/build-release.sh --use-current-version` must complete for `1.2.83`, including SDK exclusion verification, production dependency pruning and VSIX package creation.

## [1.2.82] - 2026-04-25
### Changed
- **Codex App Server теперь тестирует documentation tool profile.** Normal Codex runtime и Settings diagnostic capture стартуют с отключенными `multi_agent`, browser/computer surfaces, `image_generation`, plugins/apps/tool-search и provider-home MCP servers `codex` / `playwright`.
- **Retest должен проверить минимальный provider-native tool surface.** Ожидаемый keep-list: `exec_command`, `write_stdin`, `apply_patch`, `update_plan`, `web_search`, `view_image`; ожидаемое удаление: `mcp__playwright__`, `mcp__codex__`, MCP resource tools и `image_generation`.
- **`request_user_input` остается evidence-gated.** Отдельного подтвержденного removal knob пока нет: `default_mode_request_user_input` уже был `false`, но tool оставался в предыдущем capture.

### Tests
- **Targeted checks закрывают startup-profile wiring.** Пройдены `npm run build --workspace=@codeai-hub/codex-app-server-module` и direct node tests для `codex-app-server-process`, `codex-app-server-facade`, `codex-native-request-capture-service`.

## [1.2.81] - 2026-04-25
### Changed
- **Codex App Server теперь тестирует отключение `multi_agent`.** Normal Codex runtime и Settings diagnostic capture стартуют `codex app-server --disable multi_agent`, чтобы проверить удаление subagent tool family из provider-native request.
- **Retest должен проверить уменьшение Codex `body.tools`.** Ожидаемый target: `spawn_agent`, `send_input`, `resume_agent`, `wait_agent`, `close_agent` отсутствуют; остальные Codex tool classes пока не меняются.

### Tests
- **Targeted checks закрывают startup-flag wiring.** Пройдены `npm run build --workspace=@codeai-hub/codex-app-server-module` и direct node tests для `codex-app-server-process`, `codex-app-server-facade`, `codex-native-request-capture-service`.

## [1.2.80] - 2026-04-25
### Changed
- **Claude workflow runtime теперь тестирует explicit `Read` / `Write` / `Edit` tool allowlist.** Normal SDK turns и Settings diagnostic capture передают `tools: ["Read", "Write", "Edit"]`, чтобы проверить, заменяет ли Claude Agent SDK default Claude Code tool declarations или добавляет allowlist поверх них.
- **Retest должен проверить удаление Agent/Skill шума.** Ожидаемый native request target: `body.tools` содержит только `Read`, `Write`, `Edit`; `Agent`, subagents, `Skill`, `ScheduleWakeup`, `ToolSearch` и broad exploration guidance отсутствуют.

### Tests
- **Targeted checks закрывают SDK option wiring.** Пройдены `npm run build --workspace=@codeai-hub/claude-module` и direct node tests для `claude-sdk-manager` / `claude-native-request-capture-service`.

## [1.2.79] - 2026-04-25
### Fixed
- **Native Request Capture Markdown больше не размножает большие prompt payload.** Raw request body, ignored request details и provider diagnostic context теперь печатаются как summary; полный читаемый system/tools/messages остается в extracted sections, а full-fidelity payload сохраняется в JSONL.
- **Claude и Codex capture logs стали менее неоднозначными.** Claude workflow prompt больше не повторяется в `.md` через parsed body/bodyText/section extracts, а Codex custom system prompt не дублируется через diagnostic context.

### Tests
- **Targeted checks закрывают Markdown dedupe.** Пройдены `npm run lint`, `npm run build --workspace=@codeai-hub/core`, `node --test packages/core/dist/provider-network-capture/native-request-capture-writer.test.js packages/core/dist/provider-network-capture/native-request-capture-facade.test.js`.

## [1.2.78] - 2026-04-25
### Fixed
- **Provider startup auto-update восстановлен для Project Manager settings.** Core на старте читает persisted `settings.json`, применяет `providers.*.autoUpdate.enabled`, последовательно запускает update targets и только после этого инициализирует provider registry.
- **Claude auth preflight больше не запускает интерактивный `npx @anthropic-ai/claude-code --version`.** SDK/runtime/diagnostic/translation paths передают установленный `claude` executable из `SDKInstaller`; `ensureInstalled()` больше не делает скрытый latest-check при каждом старте.
- **Native Request Capture различает unsupported и not-ready provider.** Для известного provider descriptor без initialized adapter Core возвращает `provider_not_ready`, что делает стартовую ошибку Claude/Opus диагностически честной.

### Tests
- **Targeted checks закрывают startup update, Claude preflight и capture readiness.** Пройдены `npm run build --workspace=@codeai-hub/core`, `npm run build --workspace=@codeai-hub/claude-module`, direct node tests для `settings-provider-auto-update-service`, `native-request-capture-facade`, `claude-sdk-manager`, `claude-native-request-capture-service` и `claude-haiku-translation-service`.

## [1.2.77] - 2026-04-25
### Changed
- **Codex runtime теперь использует CodeAI Hub-owned early-architecture instruction profile.** Normal `thread/start` и Settings diagnostic capture передают compact `baseInstructions` и `config.project_doc_max_bytes = 0`.
- **Claude runtime теперь использует общий CodeAI Hub workflow `systemPrompt`.** Normal SDK turns и diagnostic capture передают `CODEAI_CLAUDE_WORKFLOW_SYSTEM_PROMPT`, сохраняя `settingSources: []`.

### Tests
- **Targeted checks закрывают request-shape changes.** Пройдены targeted builds/tests для `@codeai-hub/codex-app-server-module` и `@codeai-hub/claude-module`.

## [1.2.76] - 2026-04-25
### Added
- **Codex settings теперь включают `gpt-5.5`.** Shared Codex model registry добавляет `GPT-5.5`, и Settings -> General -> Provider Native Request Capture получает новую кнопку через существующий `CODEX_SETTINGS_MODELS` source of truth.
- **Core defaults принимают GPT-5.5 reasoning state.** Core settings resolver и persisted snapshot defaults знают `gpt-5.5` с default reasoning `medium`, сохраняя те же уровни `low` / `medium` / `high` / `xhigh`, что и у `gpt-5.4`.

### Tests
- **Targeted checks закрывают UI/Core model propagation.** Пройдены `npm run build --workspace=@codeai-hub/core`, `npm run build:webview` и `npm run typecheck:webview`.

## [1.2.75] - 2026-04-25
### Changed
- **Codex diagnostic capture временно убирает compact `baseInstructions`.** Temporary App Server `thread/start` снова не отправляет `baseInstructions`, чтобы retest мог собрать полный provider/system base prompt для выбранной Codex-модели.
- **X8 cleanup остается включенным.** `config.project_doc_max_bytes = 0` сохраняется, поэтому model-specific base prompt собирается без project `AGENTS.md` / `turn_context.user_instructions` шума.

### Tests
- **Targeted checks закрывают full-base-prompt retake request shape.** Пройдены `npm run build --workspace=@codeai-hub/codex-app-server-module` и direct node test для `codex-native-request-capture-service`.

## [1.2.74] - 2026-04-25
### Changed
- **Codex diagnostic capture теперь отправляет compact `baseInstructions`.** Temporary App Server `thread/start` получает diagnostic-only compact system prompt через `baseInstructions` и сохраняет X8 cleanup `config.project_doc_max_bytes = 0`.
- **Retest проверяет замену system/base prompt, а не developer instructions.** Capture должен показать новый compact prompt в `thread/start.request.baseInstructions`, native `response.create.instructions` и provider-home `base_instructions.text`.

### Tests
- **Targeted checks закрывают compact baseInstructions request shape.** Пройдены `npm run build --workspace=@codeai-hub/codex-app-server-module` и direct node test для `codex-native-request-capture-service`.

## [1.2.73] - 2026-04-25
### Changed
- **Codex diagnostic capture снова включает X8 `project_doc_max_bytes = 0`.** Temporary App Server `thread/start` получает diagnostic-only `config.project_doc_max_bytes = 0`, чтобы проверить удаление project `AGENTS.md` уже после фикса полной observability.
- **Проверка теперь должна проходить по одному artifact.** `.md` / `.jsonl` содержит `thread/start`, native WebSocket frame и embedded `codex_provider_home_rollout_context`; retest должен показать отсутствие `AGENTS.md` и пустой/без-project `turn_context.user_instructions` без ручного открытия rollout-файла.

### Tests
- **Targeted checks закрывают X8 full-capture request shape.** Пройдены `npm run build --workspace=@codeai-hub/codex-app-server-module` и direct node test для `codex-native-request-capture-service`.

## [1.2.72] - 2026-04-25
### Fixed
- **Codex native capture теперь встраивает provider-home rollout context в основной artifact.** Diagnostic run читает rollout JSONL из `thread/start.response.thread.path` и пишет его в `Provider Diagnostic Context` как `codex_provider_home_rollout_context`, чтобы `.md` / `.jsonl` показывали полный `turn_context.user_instructions` / `AGENTS.md` слой без ручного поиска второго файла.
- **Диагностический X8 flag убран из текущего baseline-релиза.** `project_doc_max_bytes = 0` больше не отправляется в `thread/start`; релиз нужен для no-flag baseline полной структуры запроса перед следующими flag experiments.

### Tests
- **Targeted checks закрывают rollout snapshot и no-flag request shape.** Пройдены `npm run build --workspace=@codeai-hub/codex-app-server-module` и direct node test для `codex-native-request-capture-service`.

## [1.2.71] - 2026-04-25
### Changed
- **Codex diagnostic capture теперь отправляет `project_doc_max_bytes = 0` в App Server `thread/start`.** Это первый X8 flag experiment для проверки, можно ли убрать project `AGENTS.md` из Codex instruction sources без изменения normal workflow runtime path.
- **Флаг ограничен Settings -> General native request capture.** `CodexNativeRequestCaptureService` меняет только временный isolated App Server diagnostic process; обычные Codex sessions остаются на прежнем `CodexAppServerFacade` path.

### Tests
- **Targeted checks закрывают X8 diagnostic request shape.** Пройдены `npm run build --workspace=@codeai-hub/codex-app-server-module` и direct node test для `codex-native-request-capture-service`.

## [1.2.70] - 2026-04-25
### Changed
- **Claude diagnostic capture перешёл с Claude Code preset на custom-only neutral system prompt.** `ClaudeNativeRequestCaptureService` теперь передает строковый `systemPrompt` с нейтральными operating rules вместо `{ type: "preset", preset: "claude_code" }`.
- **System prompt не содержит product/wrapper identity.** Новый diagnostic prompt не упоминает CodeAI Hub, orchestrator/wrapper или third-party app, а фиксирует только instruction priority, source boundaries, artifact-first workflow, assumptions/scope control и communication rules.
- **Workflow templates остаются user-message contract.** Stage-specific инструкции из template path не переносятся в system prompt; capture должен подтвердить, что они остаются в `body.messages`.

### Tests
- **Targeted checks закрывают custom systemPrompt option.** Пройдены `npm run build --workspace @codeai-hub/claude-module` и direct node test для `claude-native-request-capture-service`.

## [1.2.69] - 2026-04-24
### Fixed
- **Claude native capture больше не завершается на translation/localization request.** Core diagnostic proxy теперь требует agent-loop tool declarations для Claude `api.anthropic.com/v1/messages` target rule, поэтому Haiku translation requests записываются как ignored/intermediate и не закрывают capture раньше workflow request.

### Tests
- **Targeted checks закрывают corrective filter.** Пройдены `npm run build --workspace @codeai-hub/core` и direct node test для `native-request-capture-facade`.

## [1.2.68] - 2026-04-24
### Changed
- **Claude diagnostic capture включает Claude Code preset system prompt.** `ClaudeNativeRequestCaptureService` теперь передает SDK option `systemPrompt: { type: "preset", preset: "claude_code" }` вместе с существующим `settingSources: []`.
- **Capture path остается изолированным экспериментом.** Изменение не трогает tools, permissions, sandbox, model selection, thinking policy или normal workflow send path.

### Tests
- **Targeted checks закрывают новый SDK option.** Пройдены `npm run build --workspace @codeai-hub/translation`, `npm run build --workspace @codeai-hub/claude-module` и direct node test для `claude-native-request-capture-service`.

## [1.2.67] - 2026-04-24
### Added
- **Codex capture artifacts получили `Provider Diagnostic Context`.** JSONL/Markdown теперь сохраняют provider-supplied diagnostic records отдельно от native request body.
- **Codex diagnostic run записывает app-server payloads.** Temporary App Server capture фиксирует `thread/start` request/response и `turn/start` request/response, включая полный workflow prompt в `turn/start.input[0].text`.

### Changed
- **Codex capture теперь честно показывает два слоя.** Native WebSocket request остаётся provider-network surface с системными инструкциями/tools, а app-server context показывает фактический turn payload, который CodeAI Hub отправил через штатный diagnostic path.
- **Markdown writer вынес форматирование в отдельный helper.** `native-request-capture-writer.ts` больше не находится у 500-line limit и остаётся тонким владельцем записи артефактов.

### Tests
- **Targeted checks закрывают новый diagnostic context path.** Пройдены сборки Core/Codex App Server module и node tests для native capture writer/facade/WebSocket плюс Codex native request capture service.

## [1.2.66] - 2026-04-24
### Added
- **Settings -> General получил workflow scenario selector для Native Request Capture.** Диагностика теперь может отправить `Description`, `Virtual Simulation` или `Diagram Modules` first-turn prompt вместо generic probe.

### Changed
- **Capture prompt строится через штатный Project Manager workflow path.** PM использует `buildWorkflowPromptPack(...)` для выбранного сценария и передаёт `scenarioPrompt` в Core; provider diagnostics используют `workflowPrompt ?? probePrompt` без создания workflow sessions или записи артефактов.
- **Capture artifacts фиксируют scenario metadata.** JSONL/Markdown `capture_start` показывает выбранный сценарий рядом с model/applied config, чтобы сравнивать эффект изменений флагов и инструкций на одном и том же workflow turn.

### Fixed
- **Codex WebSocket capture теперь выбирает full-turn payload.** Proxy пишет несколько client frames и ждёт useful frame с non-empty `input` / non-`generate:false`, поэтому Markdown primary request больше не оказывается ранним служебным frame.

### Tests
- **Targeted checks закрывают scenario prompt и full-turn capture.** Пройдены webview/core/provider сборки, provider diagnostic tests, writer tests и Codex WebSocket multi-frame tests.

## [1.2.65] - 2026-04-24
### Added
- **Settings -> General теперь позволяет выбрать модель для Native Request Capture.** Claude и Codex capture controls получили provider-local model selectors; выбранная модель применяется только к диагностическому запуску и не сохраняется как default.

### Changed
- **Native Request Capture теперь идёт по app-path config resolver.** Webview/Project Manager/Core протягивают `modelId`, Core резолвит normal applied turn config, а provider diagnostics используют selected/applied model, Claude thinking/effort и Codex effort/summary вместо старых diagnostic-only defaults.
- **Capture artifacts показывают applied config и все matched requests.** JSONL `capture_start` фиксирует selected model и resolved applied config; Markdown перечисляет все захваченные provider requests, выбирает последний matched request как primary и извлекает Codex `instructions` / `input` в читаемые sections.

### Tests
- **Targeted checks закрывают новый capture путь.** Пройдены `build:webview`, `typecheck:webview`, сборки core/Claude/Codex modules и node tests для writer + provider diagnostic services.

## [1.2.64] - 2026-04-24
### Fixed
- **Native Request Capture теперь умеет читать первый Codex WebSocket payload.** Diagnostic proxy отвечает локальным `101 Switching Protocols`, разбирает masked client frame и пишет фактический JSON body в JSONL/Markdown вместо одного HTTP upgrade без тела.
- **Ignored provider requests стали диагностируемыми.** Для `request_path_not_matched` и других ignored events JSONL/Markdown теперь фиксируют method/path, redacted headers, bodyText/body, reason и target, чтобы было видно, что именно клиент пытался отправить.
- **TLS socket errors больше не затирают уже собранную трассу.** Ошибки TLS-сокета после observed request записываются как ignored diagnostics, а не как преждевременный terminal `tls_trust_failed`.

### Tests
- **Добавлены targeted regression tests для WebSocket frame parsing и ignored diagnostics.** Core tests проверяют RFC accept header, masked JSON frame parsing, Markdown/JSONL ignored details и proxy ignored CONNECT event.

## [1.2.63] - 2026-04-24
### Fixed
- **Native Request Capture больше не вызывает provider adapter method без class receiver.** Core `NativeRequestCaptureFacade` вызывает `captureNativeRequest` через adapter object, поэтому class-based Claude/Codex adapters сохраняют `this.nativeRequestCaptureService` и не падают до запуска diagnostic runtime.
- **Ранний provider failure теперь виден в capture artifacts.** JSONL получает `provider_runtime_error`, Markdown получает `Provider Runtime Error` с message/stack, поэтому пустой capture больше не выглядит как молчаливый timeout без причины.
- **Proxy stop очищает pending capture timeout.** При provider failure Core останавливает proxy без позднего второго `capture_end timeout`, чтобы artifact не смешивал первичную runtime ошибку с вторичным ожиданием.

### Tests
- **Regression test покрывает найденный live bug.** Core facade test теперь использует class-style adapter, чей `captureNativeRequest` пишет в `this`, и отдельно проверяет provider runtime diagnostics в `.jsonl` / `.md`.

## [1.2.62] - 2026-04-24
### Added
- **Settings -> General получил native request capture диагностику для Claude и Codex.** Новая bottom card запускает one-shot commands `Capture Claude Native Request` и `Capture Codex Native Request`, показывает running/success/error state и возвращает пути к `.md` / `.jsonl` артефактам.
- **Core добавил локальный provider-native capture слой.** `provider-network-capture` запускает `127.0.0.1` CONNECT/TLS proxy, готовит diagnostic CA/host certs, пишет Markdown + JSONL, редактирует credential-bearing headers и завершает captured request без forwarding к Anthropic/OpenAI.

### Changed
- **Claude capture идёт через Agent SDK runtime path, а Codex capture — через временный isolated App Server process.** Оба пути используют тот же provider bootstrap/auth/settings контур, который нужен для сборки native request, но diagnostic run не привязывается к обычной workflow continuity.
- **Remote Bridge и Project Manager получили новый settings command/result contract.** Host принимает `settings:native-request-capture`, возвращает `settings:native-request-capture:result`, а Settings UI отображает artifact paths без сохранения каких-либо новых settings.

### Docs
- **SSOT обновлён под новый diagnostic feature.** `SystemArchitecture.md`, `Modules/Claude.md`, `Modules/Codex.md`, `Modules/UI_Bundles.md` и `Docs_Index.md` фиксируют capture-and-abort contract, provider boundaries, artifact output и Settings ownership.

## [1.2.61] - 2026-04-23
### Fixed
- **Canonical settings path теперь жёстко зафиксирован на `~/.codeai-hub/settings/settings.json`.** Core config bootstrap больше не выбирает `claude.json` как runtime fallback path, поэтому launcher/Core startup и Core-owned settings persistence больше не могут resurrect full unified snapshot под legacy filename.
- **Core materialize-ит default `settings.json` уже на startup/settings bootstrap, если canonical файла нет.** `SettingsPersistenceService` делает best-effort startup prime для normalized default snapshot, так что после удаления `claude.json` новый persisted settings file появляется сразу на canonical path.

### Changed
- **VS Code extension settings storage полностью перестал консультироваться с `claude.json`.** Extension-side `loadSettingsSnapshot()` теперь работает только с `settings.json`; legacy fallback удалён, вместе с мёртвым exported helper для old Claude-only thinking migration.
- **SSOT обновлён под hard cutover.** `SystemArchitecture.md` и `EffectiveModelIdentity_And_Settings_SSOT.md` теперь явно фиксируют, что `settings.json` — единственный поддерживаемый runtime settings snapshot, а `claude.json` не участвует в нормальном read/write contract.

## [1.2.60] - 2026-04-23
### Fixed
- **VS Code extension webview теперь получает локализованный bootstrap snapshot при первом рендере.** `HomeViewProvider` ранее всегда передавал `localizationBootstrap: null` в `WebviewHtmlGenerator.generate`, из-за чего `window.__CODEAI_LOCALIZATION_BOOTSTRAP__` стартовал пустым, и `SettingsOnlyHost` рендерил English fallback вплоть до прихода `settings:loaded` message (на практике пользователь видел English не дожидаясь update'а). Теперь `resolveWebviewView` вызывает `LocalizationRuntimeService.loadRuntimeBootstrapSnapshot(loadSettingsSnapshot())` и инжектит результат в HTML до mount'а React — тот же контракт, что уже работает в Project Manager.

### Changed
- **Retag `extension_shell.role.title` как UI Labels.** Короткий section title классифицируется как `UI Labels` per `UserFacing_Text_Localization_Boundary §3.1`, не как `UI Helper Text`. Ключ перенесён из `assets/localization/source/en/ui_helper_text.json` в `assets/localization/source/en/ui_labels.json`; `SettingsOnlyHost` теперь резолвит заголовок через runtime категорию `ui_interface`. Body и Hint остаются в `user_guidance` как explanatory paragraphs.

## [1.2.59] - 2026-04-23
### Changed
- **VS Code extension webview (SettingsOnlyHost) теперь показывает steady-state описание роли расширения**, а не устаревшее сообщение о переезде настроек в Project Manager. Новый текст: "This extension is for install and updates only" + два параграфа про то, что весь функционал живёт в Project Manager (иконка на рабочем столе после первого запуска).
- **Локализация**: добавлены approved ключи `extension_shell.role.{title,body,hint}` в `assets/localization/source/en/ui_helper_text.json` (категория `user_guidance`). Ключи переводятся на активный UI language через стандартный UI Helper Text pipeline.
- **Retired**: fallback-only ключи `settings.only.compat_{body,hint,notice}` удалены из компонента (в source dictionary их никогда и не было). Третий `<p>` compat notice удалён — сообщение теперь двухабзацное.
- **aria-label** webview region мирроррит локализованный заголовок вместо хардкод-английского "Settings moved to Project Manager".

## [1.2.58] - 2026-04-23
### Fixed
- **CI quality-gate Lint step больше не падает за 0 секунд на Ubuntu runner.** Root cause: Biome доставляет native binary через platform-specific optional packages (`@biomejs/cli-<os>-<arch>`), и наш `package-lock.json` генерируется на macOS Apple Silicon → в `packages` секции lockfile только `@biomejs/cli-darwin-arm64`. `npm ci` строго следует lockfile, не устанавливает Linux binary, shim `biome` падает `require.resolve` мгновенно. Фикс: все 7 non-host `@biomejs/cli-*` пакетов добавлены в root `optionalDependencies` с exact pinned version 2.4.7, что делает их tracked в `packages` секции lockfile с `os/cpu` guards. На каждой платформе npm ставит только свой binary; CI Ubuntu теперь находит Linux binary. Предыдущие 9 runs (#43-#52) падали по этой причине.

### Changed
- **Knip step в CI переведён в advisory режим** (`continue-on-error: true`). Knip завершается с exit 1 на Ubuntu runner за ~1 секунду без видимого output, при этом локально на macOS с теми же lockfile/config/Node version exit 0 даже в `CI=true GITHUB_ACTIONS=true`. Pre-commit hook локально продолжает запускать Knip в strict режиме, поэтому dead code detection сохранена как gate перед push; на CI она advisory до диагностики Linux-specific причины.
- **SystemArchitecture.md: Invariant §34 добавлен** — "CI quality-gate platform-binary invariant". Фиксирует контракт: при bump'е Biome (и других toolchain с native binaries) все platform-specific CLI packages обязаны быть в root `optionalDependencies` синхронно, иначе CI на non-host платформах упадёт без объяснений.

## [1.2.57] - 2026-04-23
### Changed
- **PM footer: убран дубликат workspace identity.** `StatusBar` больше не рендерит левый блок с плашкой `CONTEXT` и именем workspace — workspace selector в левом sidebar остаётся единственным visible surface для workspace identity. Prop `workspaceName` удалён из `StatusBar`, связанные локализационные ключи (`pm.status_bar.context_label`, `pm.status_bar.no_workspace_label`) удалены из approved dictionary.
- **PM footer: кнопка `Open Settings` выведена в primary action.** Кнопка получила выделенный CSS-класс `pm-status-open-settings` вместо generic `pm-status-zoom`. Typography выровнена с `WORKFLOW TREE MVP` (uppercase, letter-spacing `0.08em`, font-size 12px), но выделена цветом через PM accent. Три визуальные фазы: default (accent border + tinted background), hover (brighter accent, primary text), active/pressed (deeper accent + inset shadow + translateY(1px)), плюс focus-visible outline для keyboard navigation.

## [1.2.56] - 2026-04-23
### Fixed
- **Detached Digital Models popup больше не закрывает весь standalone Project Manager.** `LauncherWindowDelegate` теперь различает main window и popup window, поэтому auxiliary detached diagram popup больше не маршрутизируется в whole-app `RequestNativeApplicationTermination()` path.
- **Detached popup больше не наследует autosaved frame главного PM окна.** Launcher перестал применять restore/tracking/persist path к popup browsers, а PM detach action теперь даёт explicit popup-sized open hint (`width=1180,height=820`), так что окно стартует в более узком artifact-oriented формате.

### Changed
- **CEF/PM contract уточнён на уровне bug history и SSOT.** `BugRegistry.md`, `Launcher_CEF.md` и `Project_Manager.md` теперь фиксируют split между главным PM окном и detached diagram popup: popup не является owner-window приложения и не должен reuse-ить main-window autosave state.

## [1.2.55] - 2026-04-22
### Fixed
- **`UI Translation Engine` больше не роняет standalone Project Manager на macOS 26.x.** Shared `TranslationEngineSelector` переведён с native `<select>` на DOM-owned button/listbox selector, поэтому PM больше не заходит в Chromium/AppKit popup path, который завершался `NSApplication unrecognized selector`.
- **`Reasoning Translation Engine` получил тот же fix-path.** Один и тот же custom selector теперь покрывает оба translation-engine controls и сохраняет availability labels, disabled engines и keyboard navigation без native popup branch.

### Changed
- **CEF/macOS boundary уточнена на уровне SSOT.** `BugRegistry.md`, `UI_Bundles.md` и `Launcher_CEF.md` теперь фиксируют, что shared translation-engine controls не должны использовать native HTML `<select>` в standalone CEF-host, потому что launcher-side close-button workaround из `1.2.52` не гарантирует безопасность всех Chromium/AppKit popup branches.

## [1.2.54] - 2026-04-22
### Fixed
- **Project Manager Settings больше не живут в отдельном popup-окне.** `Open Settings` теперь переводит правую панель PM в in-shell settings mode, а `Close Settings` возвращает предыдущий panel context вместо закрытия Project Manager window вместе с detached settings flow.
- **`Restart Core` вернулся в `Settings -> General`.** Shared `Core Controls` снова доступны в PM-mode, а standalone CEF-host получил явный restart bridge `codeai://core-restart` и native `RestartCoreProcess()`, так что recovery UX больше не деградирует до декоративной кнопки или отсутствующего control.
- **Provider-only saves больше не показывают ложный overlay `Synchronizing localization`.** Shared settings state теперь использует фактический `settings:localization-sync-status`, поэтому blocking localization UI появляется только на реальном strict sync busy-state.

### Changed
- **PM settings stabilization оформлена как in-shell contract, а не popup lifecycle.** `SystemArchitecture.md`, `Project_Manager.md`, `UI_Bundles.md`, `Launcher_CEF.md` и `BugRegistry.md` синхронизированы под новую границу: PM owns the visible settings surface, launcher bridge остаётся узким, а три регрессии `1.2.53` закрыты в `1.2.54`.

## [1.2.53] - 2026-04-22
### Added
- **Project Manager now owns the only live Settings window.** Footer action `Open Settings` opens or focuses a detached CEF window on `?mode=detached-settings`, and the shared `SettingsView` is reused there in `mode="project-manager"` through PM-owned transport/state hooks.

### Changed
- **Core is now the sole backend owner for settings flows.** The remote bridge settings cluster now owns `settings:load`, `settings:save`, `settings:reset`, `settings:update-provider`, `settings:versions`, and `settings:open-user-glossary-file`, together with the downstream `settings:loaded`, `settings:saved`, `settings:save-error`, `settings:localization-sync-status`, and `settings:user-glossary-file` broadcasts.
- **Project Manager settings actions no longer depend on the extension-side webview path.** PM websocket contracts and settings state now drive save/reset/provider-update/version/glossary flows directly against Core, while the PM-host bridge handles editor-aware glossary file opening.
- **VS Code extension is no longer a runtime bootstrap owner.** Activation no longer starts or attaches the Core runtime and no longer runs the extension-owned provider auto-update/runtime keep-alive path; the extension remains only a distribution/install/bootstrap-components shell.
- **Legacy VS Code Settings webview was de-scoped to a compatibility surface.** `codeaiHub.openSettings` now lands on a localized compat notice instead of a live settings product surface.

### Docs
- **SystemArchitecture.md, Project_Manager.md, and UI_Bundles.md** were synchronized to lock the new ownership contract: PM-only Settings UI, Core-owned settings backend, PM bootstrap authority for user-facing runtime start, and extension distribution-only role.

## [1.2.52] - 2026-04-22
### Fixed
- **Red NSWindow close button no longer triggers the "quit unexpectedly" dialog on macOS 26.x — true fix, not another mitigation.** User retest on 1.2.51 confirmed the `-[NSApplication reportException:]` swizzle alone did not prevent the crash: on macOS 26 the exception apparently reaches `+[NSApplication _crashOnException:]` through a route that does not go via `-reportException:`. Rather than chase the exception through another layer, 1.2.52 stops running the buggy Chromium teardown callback in the first place.

### Changed
- **`LauncherWindowDelegate::CanClose` in `packages/cef-launcher/src/launcher_app.cc` now short-circuits on macOS.** Instead of calling `browser->GetHost()->TryCloseBrowser()` (which is the entry point into Chromium 141's async browser-teardown that crashes on macOS 26), the `#if defined(__APPLE__)` branch invokes a new cross-platform helper `codeai::launcher::RequestNativeApplicationTermination()` and returns `false`. The helper is declared in `packages/cef-launcher/src/launcher_handler.h` (namespace `codeai::launcher`) and implemented in `packages/cef-launcher/src/platform/mac/launcher_handler_mac.mm` as `[NSApp terminate:nil]`. The red close button now follows the same `-[NSApplication terminate:]` → `-[NSApplication stop:]` → orderly AppKit unwind → `main()` returns → `CefShutdown()` path that Cmd+Q and Dock Quit already use cleanly. The buggy Chromium callback is never invoked, so the exception is never thrown, and `+[NSApplication _crashOnException:]` is never called.
- **Windows/Linux `CanClose` behaviour is unchanged** — the `#else` branch keeps the existing `TryCloseBrowser` flow.

### Retained as safety net
- **The 1.2.51 `-[NSApplication reportException:]` swizzle** (category `NSApplication (CodeAIHubReportExceptionSuppression)` in `app_main_mac.mm` with `+load` / `method_exchangeImplementations`) stays in place as a belts-and-suspenders fallback. Matching pattern is narrow, overhead is negligible, and if a future CEF update ever introduces another path that throws the same signature, the swizzle covers it without needing a new release. It will be removed together with the CEF/Chromium upgrade.

### Known deferred issue
- **CEF/Chromium upgrade is still the only proper root-cause fix** for `BUG-2026-04-22-01` — Chromium 141 inside our CEF binary remains incompatible with macOS 26.3.1 around that specific teardown callback. With the short-circuit in place the observable crash is gone, but the upgrade remains tracked as a separate investigation scope. Urgency is now low because users do not see the crash.

### Not touched
- NSApplication remains plain (no `CefAppProtocol` shell, no `sendEvent:` override, no `terminate:` override, no `NSApplicationDelegate`). `Info.plist` is not changed. `LauncherHandler::DoClose`, `LauncherHandler::OnBeforeClose` and `LauncherHandler::CloseAllBrowsers` are not changed. Paste (Cmd+V), SuperWhisper, Cmd+C/X/A, the Edit menu, Cmd+Q, Dock Quit and dock reopen continue to behave exactly as in 1.2.49 / 1.2.50 / 1.2.51.

### Docs
- **SystemArchitecture.md §3 Invariant 32** rewritten around the 1.2.52 short-circuit as the primary fix; both prior exception-pipeline attempts (1.2.50, 1.2.51) are now explicitly recorded as failed, with the reasons spelled out. 1.2.51 swizzle is noted as retained-as-safety-net. Канон list points at `launcher_app.cc`, `launcher_handler.h`, `launcher_handler_mac.mm` and `app_main_mac.mm`.
- **Launcher_CEF.md** gains a new "Shutdown-crash primary fix (1.2.52 — CanClose short-circuit)" subsection before the 1.2.51 subsection (now tagged "[superseded as primary, retained as safety net]"). Narrative explains the pivot from catching the exception to preventing the buggy callback.
- **BugRegistry.md** — `BUG-2026-04-22-01` flipped from MITIGATED to FIXED. Current-resolution block is rewritten around the short-circuit; the 1.2.51 swizzle attempt moves into a "Superseded attempts (kept for history)" timeline entry alongside the existing 1.2.50 entry.

## [1.2.51] - 2026-04-22
### Fixed
- **Red NSWindow close button no longer shows "quit unexpectedly" dialog on macOS 26.x.** User retest on 1.2.50 confirmed that the `NSSetUncaughtExceptionHandler()` approach did not intercept the crash. Two reasons: AppKit reinstalls its own `NSApplicationUncaughtExceptionHandler` during `-[NSApplication finishLaunching]` (overwriting ours, which was installed pre-`CefExecuteProcess`); and `+[NSApplication _crashOnException:]` — a private Apple path — bypasses the standard uncaught-exception chain on macOS 26 regardless of what's registered via `NSSetUncaughtExceptionHandler`. The standard ObjC uncaught chain is simply not the right layer for this issue.

### Changed
- **Switched mitigation from `NSSetUncaughtExceptionHandler` to an Objective-C method swizzle on `-[NSApplication reportException:]`.** The new mitigation lives in `packages/cef-launcher/src/platform/mac/app_main_mac.mm` as category `NSApplication (CodeAIHubReportExceptionSuppression)`, whose `+load` method performs `method_exchangeImplementations(reportException:, codeai_reportException:)`. The Objective-C runtime invokes `+load` during dyld image load — before `main()` and before any AppKit / CEF init — so AppKit cannot undo the swap. When AppKit subsequently calls `-[NSApplication reportException:]`, the runtime dispatches into our `codeai_reportException:`, which inspects the exception and returns without reaching `+[NSApplication _crashOnException:]` when it matches the Chromium-141 × macOS-26 signature (`NSInvalidArgumentException` whose reason contains both `unrecognized selector sent to instance` and `NSApplication`). Non-matching exceptions are forwarded to the original IMP through `[self codeai_reportException:exception]` — the standard ObjC swizzle trampoline.
- **Removed dead 1.2.50 `NSSetUncaughtExceptionHandler` code** (`g_previous_uncaught_handler`, `CodeAIHubUncaughtExceptionHandler`, `InstallCodeAIHubUncaughtExceptionHandler` and its call from `main()`). Atomic swap in the same commit so no one has to guess which mitigation is actually active.

### Known deferred issue
- **`BUG-2026-04-22-01` remains MITIGATED, not root-fixed.** The swizzle absorbs the specific Chromium-141 × macOS-26 exception signature, but the underlying Chromium 141 teardown callback is still sending an AppKit-private selector that no longer exists on macOS 26. A proper root-cause fix requires upgrading CEF to a build that ships Chromium 142+ or 143+. That CEF upgrade is still tracked as a separate investigation scope. If a future macOS patch moves the problematic path off `-reportException:`, this mitigation stops covering and we'll need the CEF upgrade or a different attack vector.

### Not touched (explicit preservation of 1.2.49 / 1.2.50 behaviour)
- NSApplication remains plain (no `CefAppProtocol` shell, no `sendEvent:` override, no `terminate:` override, no `NSApplicationDelegate`). Paste (Cmd+V), SuperWhisper (synthetic Cmd+V via CGEvent), Cmd+C/X/A, the Edit menu, Cmd+Q, Dock Quit, the red close button teardown path and dock reopen all continue to behave exactly as in 1.2.49 / 1.2.50. `Info.plist` is not changed. `LauncherWindowDelegate::CanClose` / `LauncherHandler::DoClose` / `LauncherHandler::OnBeforeClose` are not changed.

### Docs
- **SystemArchitecture.md §3 Invariant 32** rewritten around the new swizzle mitigation. Explicitly records that 1.2.50 `NSSetUncaughtExceptionHandler` failed and why, and updates the permanent CEF acceptance matrix with the new stderr signature (`suppressed NSApplication unrecognized selector via reportException: swizzle`).
- **Launcher_CEF.md** shutdown-crash mitigation subsection rewritten fully: trigger, root cause, why 1.2.50 failed, 1.2.51 swizzle mechanism, what the mitigation still does NOT touch, runtime flow on interception, and the documented limits of the swizzle approach.
- **BugRegistry.md** — `BUG-2026-04-22-01` still MITIGATED, but the current-resolution block is rewritten around the swizzle; the failed 1.2.50 `NSSetUncaughtExceptionHandler` attempt is preserved inline as a timeline entry with both root causes spelled out (AppKit reinstall + `_crashOnException:` bypass).

## [1.2.50] - 2026-04-22
### Fixed
- **Red NSWindow close button no longer triggers the "CodeAI Hub Project Manager quit unexpectedly" dialog on macOS 26.x.** User retest on 1.2.49 pinpointed the crash as deterministic on the red close button path only (`LauncherWindowDelegate::CanClose` → `browser->GetHost()->TryCloseBrowser()` → Chromium async browser teardown), while Cmd+Q and Dock Quit remained clean because they unwind through `-[NSApplication stop:]` and bypass the Chromium teardown callback entirely. The failing callback sends an AppKit-private selector to `-[NSApplication ...]` that no longer exists on macOS 26.3.1 under Chromium 141 (shipped inside our CEF binary `141.0.10+chromium-141.0.7390.123`).

### Added
- **`InstallCodeAIHubUncaughtExceptionHandler()` in `packages/cef-launcher/src/platform/mac/app_main_mac.mm`.** The handler is installed from `main()` immediately after `CefScopedLibraryLoader::LoadInMain()` and before `CefExecuteProcess`. It captures the previous handler via `NSGetUncaughtExceptionHandler()`, intercepts `NSInvalidArgumentException` whose reason contains both `unrecognized selector sent to instance` and `NSApplication`, logs a `CodeAIHubLauncher: suppressed NSApplication unrecognized selector: ...` line to stderr and returns without propagation. All other uncaught exceptions are forwarded to the previous handler so real bugs still reach AppKit's default crash reporter. With the exception absorbed before `+[NSApplication _crashOnException:]`, the remainder of the browser teardown (`OnBeforeClose` → `CefQuitMessageLoop` → `main()` returns → `CefShutdown`) completes cleanly.

### Known deferred issue
- **`BUG-2026-04-22-01` moves from DEFERRED to MITIGATED.** The mitigation is a targeted workaround, not a root-cause fix. A proper fix requires upgrading CEF to a build containing Chromium 142+/143+ that understands the macOS 26 selector semantics. That CEF upgrade is tracked as a separate investigation scope.

### Not touched (explicit preservation of 1.2.49 behaviour)
- NSApplication remains plain (no `CefAppProtocol` shell, no `sendEvent:` override, no `terminate:` override, no `NSApplicationDelegate`). Paste (Cmd+V), SuperWhisper (synthetic Cmd+V via CGEvent), Cmd+C/X/A, the Edit menu, Cmd+Q, Dock Quit, the red close button flow and dock reopen all continue to behave exactly as in 1.2.49. `Info.plist` is not changed. `LauncherWindowDelegate::CanClose` / `LauncherHandler::DoClose` / `LauncherHandler::OnBeforeClose` are not changed.

### Docs
- **SystemArchitecture.md §3 Invariant 32** extended with the 1.2.50 mitigation note, the refined window-close-only crash trigger, and the requirement that any future shutdown hardening pass the full clipboard + quit + red-close + reopen acceptance matrix before merge.
- **Launcher_CEF.md** gains a new "Shutdown-crash mitigation (1.2.50)" subsection covering trigger, root cause, handler install point, explicit non-goals, and the stderr log signature that indicates the handler fired.
- **BugRegistry.md** — `BUG-2026-04-22-01` flipped from DEFERRED to MITIGATED with the full narrative (window-close-only trigger, Chromium 141 × macOS 26.3.1 incompat, handler implementation, commit hash, deferred proper fix). The 1.2.46 → 1.2.48 → 1.2.49 rollback history is preserved as context.

## [1.2.49] - 2026-04-22
### Reverted
- **Full rollback of the 1.2.46 CEF macOS bootstrap refactor and the 1.2.48 follow-up.** After a second round of user retesting on 1.2.48, Cmd+V / paste and SuperWhisper (synthetic Cmd+V via CGEvent) still failed to reach the Chromium input field inside the standalone Project Manager. The narrow 1.2.48 fix (dropping the Edit menu and restoring the standard `applicationShouldTerminate:` quit path) was theoretically reasonable but did not address the real breaker — which lives inside the `CodeAIHubApplication : NSApplication <CefAppProtocol>` shell itself, not in the cosmetic surfaces around it. The full CEF bootstrap refactor was therefore reverted.

### Fixed
- **Paste (Cmd+V), clipboard shortcuts and SuperWhisper work again in the Project Manager input on macOS.** Delivered by rolling the launcher back to the 1.2.45 baseline: `codeai_hub_application_mac.{h,mm}` are deleted, `app_main_mac.mm` is restored to the `70ac9a6ac` state (plain `[NSApplication sharedApplication]` + inline `CreateApplicationMenu` + `CefInitialize` + `CefRunMessageLoop`), and the corresponding entries are removed from `packages/cef-launcher/CMakeLists.txt`.

### Known deferred issue
- **`BUG-2026-04-22-01` — rare non-deterministic `NSApplication unrecognized selector` crash-on-quit for the standalone Project Manager on macOS is re-opened as DEFERRED.** The 1.2.46 hardening attempt that suppressed this crash broke clipboard shortcuts, so its rollback leaves the crash as a known, accepted trade-off until a new investigation produces a fix that does not regress Cmd+V / SuperWhisper. Any future CEF bootstrap change must pass the full clipboard + quit + reopen acceptance matrix before merge.

### Docs
- **SystemArchitecture.md §3 Invariant 32** rewritten as a rollback note describing why the CefAppProtocol shell was removed and pointing at the deferred shutdown-crash bug. Invariant 33 (introduced in 1.2.48 for the custom shell) deleted entirely.
- **Launcher_CEF.md** macOS Bootstrap Lifecycle Boundary collapsed to "plain `NSApplication` bootstrap + deferred shutdown crash" and now carries the clipboard+quit acceptance guardrail for any future hardening attempt.
- **BugRegistry.md** — `BUG-2026-04-22-01` flipped to DEFERRED with the full rollback history retained; `BUG-2026-04-22-04` moved to FIXED (via rollback in 1.2.49) with the 1.2.48 narrow-fix description kept as "superseded, for history".

## [1.2.48] - 2026-04-22
### Fixed
- **Paste (Cmd+V) and synthetic Cmd+V from SuperWhisper work again inside the standalone Project Manager input.** The Cut/Copy/Paste/Select All menu items with `target:nil` have been removed from the CEF launcher application menu — they hijacked `NSMenu performKeyEquivalent:` after the 1.2.46 bootstrap refactor dropped the implicit CEF-swizzle of `-[NSApplication sendEvent:]`, and the web view does not answer Cocoa `paste:` / `cut:` / `copy:` / `selectAll:` selectors. Chromium now observes the raw NSKeyDown event and handles clipboard shortcuts on the render-process side, as originally intended.
- **Dock right-click Quit, Cmd+Q and app-menu Quit close the launcher reliably on the first click again.** The `-[CodeAIHubApplication terminate:]` override and the matching `tryToTerminateApplication:` delegate method have been removed. Quit requests now flow through the standard AppKit path `terminate:` → `applicationShouldTerminate:`; the delegate force-closes CEF browsers via `LauncherHandler::CloseAllBrowsers(true)` and returns `NSTerminateCancel`, while `OnBeforeClose` drives `CefQuitMessageLoop()` once the last browser is gone so `main()` returns from `CefRunMessageLoop()` and reaches `CefShutdown()`.

### Changed
- **`CodeAIHubApplication` keeps the `CefAppProtocol` shell and `CefScopedSendingEvent` wrapper from 1.2.46** — the shutdown-crash fix remains in place, only the AppKit-facing side (terminate override + Edit menu) is rolled back.

### Docs
- **SystemArchitecture.md §3** — Invariant 32 (1.2.46) rewritten to drop `tryToTerminateApplication` / `CloseAllBrowsers(false)`; new Invariant 33 (1.2.48) locks the standard terminate path, bans the Edit menu, and pins the permanent CEF acceptance matrix.
- **Launcher_CEF.md** — macOS bootstrap lifecycle boundary refined: override `terminate:` forbidden, Cut/Copy/Paste/SelectAll menu items forbidden, `applicationShouldTerminate:` + force `CloseAllBrowsers(true)` is the only canonical quit contract.
- **BugRegistry.md** — `BUG-2026-04-22-04` added newest-first, tracing paste / SuperWhisper / Dock Quit regression from 1.2.46 through the 1.2.48 fix.

## [1.2.46] - 2026-04-22
### Fixed
- **Standalone Project Manager on macOS no longer relies on a plain `NSApplication` bootstrap.** The CEF launcher browser-process entrypoint now creates a dedicated `CodeAIHubApplication : NSApplication <CefAppProtocol>` and a delegate-driven shutdown/reopen seam before entering the CEF message loop. This aligns the launcher more closely with the official CEF macOS sample and removes the crash-on-quit class where AppKit/CEF hit `NSApplication unrecognized selector` during orderly shutdown.

### Changed
- **macOS launcher lifecycle ownership is now explicit.** `codeai_hub_application_mac.{h,mm}` owns `sendEvent:` wrapping via `CefScopedSendingEvent`, `terminate:` redirection into `LauncherHandler::CloseAllBrowsers(false)`, dock reopen, and secure restorable state; `app_main_mac.mm` is back to a thin wiring layer.

## [1.2.45] - 2026-04-22
### Fixed
- **Claude and Codex reopened dialogs now show truthful usage limits before the next user message.** PM keeps a provider-scoped usage cache (`providerScopeKey = {providerId}:global`), seeds reopened runtime/dialog snapshots from it, and Core treats `dialog_opened` as an explicit pre-turn usage-refresh boundary: cached limits are replayed immediately, then a cheap provider refresh runs even when cached payload already exists. This closes the UX gap where old dialogs stayed empty until the first new assistant response.
- **Empty first warmup probes no longer permanently suppress later `binding_ready` refreshes.** `UsageLimitsWarmupTracker` now effectively warms a provider only after a real payload reaches the stream; a null Claude/Codex probe after cold start no longer blocks the next ready-binding attempt.

### Added
- **Explicit pending-state usage bar for cold opens.** `SessionIdBar` now renders a visible loading state for provider usage telemetry instead of silent empty rails, and shows reset timestamps in parentheses for the 5-hour / weekly buckets as soon as `resetsAt` is known.
- **Explicit `dialog_opened` transport path for usage limits.** PM reuses `session:refreshUsageLimits` with `lifecycleTrigger: "dialog_opened"` so pre-turn refresh stays lifecycle-driven instead of mount-driven.

### Docs
- **SystemArchitecture.md**, **SessionUI_Behavior.md**, and **Dialogs_And_Continuity_Routing.md** now define the reopened-dialog pre-turn usage refresh contract, provider-scoped PM seeding, and the distinction between replay-first delivery and explicit `dialog_opened` freshness refresh.

### Tests
- **`usage-limits-stream.test.ts`**, **`project-manager-session-view.test.tsx`**, **`session-id-bar.test.tsx`**, and **`session-request-handler.usage-limits.test.ts`** now cover replay-before-snapshot caching, provider-scoped seeding, explicit `dialog_opened` refresh, and the empty-warmup retry path.

## [1.2.44] - 2026-04-21
### Fixed
- **Usage-limits widget no longer stays empty or shows fake `0%` for Claude and Codex in the cold-cache window.** Hotfix to `1.2.43`. PM emits `binding_ready` usage-limits refresh per reopened dialog after Core restart, and under the `1.2.39` materializer paper-binding those first refreshes raced against provider hydration: `ClaudeLiveHeadersReader` and `CodexAppServerFacade.refreshUsageLimits` returned null payloads, the cache never filled, and subsequent `binding_ready` triggers kept hitting the same race. The cache key is already account-scoped (`providerScopeKey = `${providerId}:global``), so one successful probe is enough to populate every session of a provider — but nothing stopped the parallel storm of failing probes. `SessionRequestHandler` now owns `UsageLimitsWarmupTracker: Set<providerId>`: the first `binding_ready` for a provider dispatches, subsequent `binding_ready` for the same provider skip the dispatch and fall back to cached replay (empty rows stay hidden instead of surfacing as false `0%`). Other lifecycle triggers (`turn_completed`, `reconnect`, `manual`, `provider_session_rebound`, `dialog_opened`, `session_opened`) bypass dedup because they represent real state changes.

### Added
- **`UsageLimitsWarmupTracker`** + **`handleRefreshUsageLimitsFlow`** (`packages/core/src/remote-bridge/handlers/session-request-handler-usage-limits-warmup.ts` + `session-request-handler-usage-limits-refresh.ts`) — extracted from `SessionRequestHandler` so the main handler stays under the 500-line architecture limit and the new dedup / diagnostic logic is independently testable.

### Docs
- **SystemArchitecture.md §3 Invariant 1** — single-probe warmup policy recorded alongside existing stale-binding auto-recovery rules.
- **BugRegistry.md** — new entry `BUG-2026-04-21-06` capturing the cold-cache race.

### Tests
- **`session-request-handler.usage-limits.test.ts`** — new case: cold-cache failed warmup (second `binding_ready` for a different session of the same provider must not re-dispatch) + `turn_completed` pass-through even when the provider is already warmed.

## [1.2.43] - 2026-04-21
### Fixed
- **Codex provider no longer gets stuck in "Provider codexCli unavailable" after a benign child-process restart.** Hotfix to release `1.2.42`. `CodexAppServerProcess.startInternal` inherits `process.env` from the VS Code extension host, which on macOS GUI-launched VS Code often ships without the user's shell PATH additions (`~/.npm-global/bin`, Homebrew). The first spawn at boot could succeed case-by-case; after a graceful `process.stop` (fired when all Codex sessions close), every subsequent spawn raised `spawn codex ENOENT`, and the provider-recovery scheduler looped forever with `write EPIPE` against a dead stdin. The spawn env now prepends a curated set of common install directories (`~/.npm-global/bin`, `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin` on POSIX; `%APPDATA%\npm` on Windows) — inherited PATH stays the primary lookup, candidates only get appended when absent. No hardcoded absolute paths in the runtime.
- **Claude and Codex `usage_limits` widget no longer stays empty after a Core restart.** PM emits the `binding_ready` `usage_limits` refresh exactly once per logical session. After the `1.2.39` continuity materializer paper-binding, that first refresh races against provider hydration — Claude's HTTP probe and Codex's app-server handshake — and the payload is dropped. Gemini's proactive refresh path hides this for it; Claude and Codex widgets just stayed empty. The `1.2.42` stale-binding retry branch now triggers one additional `adapter.refreshUsageLimits` for the freshly hydrated session via the new `triggerPostRebindUsageLimitsRefresh` helper, so the widget catches up automatically on the same user message that drove the rebind.

### Added
- **`triggerPostRebindUsageLimitsRefresh`** (`packages/core/src/remote-bridge/handlers/session-request-handler-post-rebind-usage-limits.ts`) — exported helper extracted from `SessionRequestHandlerMessageDispatch` so the dispatch file stays under the 500-line architecture limit and the new logic is independently testable.

### Docs
- **SystemArchitecture.md §3 Invariant 1** — post-rebind usage_limits refresh contract (required after successful rebind) and Codex PATH augmentation note added to the existing stale-binding auto-recovery text.
- **BugRegistry.md** — new entry `BUG-2026-04-21-05` with the two symptom split, root cause, fix, commits, and guards.

### Tests
- **`session-request-handler-post-rebind-usage-limits.test.ts`** — 4 contract cases: adapter without `refreshUsageLimits` produces no broadcasts; `refreshUsageLimits` invoked exactly once with the retry binding; only normalized `usage_limits` events are broadcast; synchronous adapter failures are logged and swallowed.

## [1.2.42] - 2026-04-21
### Fixed
- **First user message in a reopened Claude/Codex dialog no longer vanishes after a Core restart.** Follow-up to `BUG-2026-04-21-01`/release `1.2.39`. The continuity materializer correctly journaled paper-bindings with `providerSessionStatus: "ready"` (so PM input stopped sticking in "Agents is working…"), but the dispatch path trusted `ready` as "provider hydrated" and called `adapter.sendMessage` without first resuming. In Claude, `ClaudeSDKManager.sendMessage` threw a generic `Error("Session <id> not found")`; in Codex, `turn/start` hit the freshly spawned app-server child which had never seen the thread. The failure classifier marked both as retryable, but no retry was wired for generic errors — the message was silently dropped. Each provider adapter now throws a typed `ClaudeSessionStaleBindingError` / `CodexSessionStaleBindingError` (symmetric to Gemini's `GeminiSessionStaleBindingError` from `1.2.8`), and the Core dispatch detector is generalized over the shared set of provider-scoped codes so the one-shot `invalidateProviderBinding + ensureSessionReadyForSend + resend` recovery path fires for all three providers.

### Added
- **`ClaudeSessionStaleBindingError`** (`packages/Claude_Module/src/provider/claude-session-stale-binding-error.ts`) with `code: "CLAUDE_SESSION_STALE_BINDING"` and carried `providerSessionId`.
- **`CodexSessionStaleBindingError`** (`packages/Codex_AppServer_Module/src/provider/codex-session-stale-binding-error.ts`) with `code: "CODEX_SESSION_STALE_BINDING"` and carried `providerSessionId`.
- **`handshakedThreadIds` guard in `CodexAppServerFacade`** — populated in `createSession` / `resumeSession`, consulted in `sendMessage` before `turn/start`, cleared in `closeSession`. Raises the typed error when a paper-binding points at a thread the current app-server child has never seen.

### Docs
- **SystemArchitecture.md §3 Invariant 1** now records that `ready` paper-binding means "journaled" and not "provider hydrated" — every adapter must raise a typed stale-binding error on first-send-after-restart, generic `Error` is forbidden because the retryable classifier would drop it silently.
- **BugRegistry.md** — new entry `BUG-2026-04-21-04` with full forensics, root cause split, fix, commits, and guards.

### Tests
- **`claude-session-stale-binding-error.test.ts`** and **`codex-session-stale-binding-error.test.ts`** — error contract tests (code / providerSessionId / message / name / Error prototype) pinning the throw-site ↔ Core catch-site handshake.

## [1.2.41] - 2026-04-21
### Fixed
- **Diagram Modules Artifacts panel composition now actually fits under auto-fit zoom.** Hotfix to release `1.2.40`. The previous cycle introduced `width: max-content + minWidth: 100%` on the inner composition div, intending to expose the natural grid width through `scrollWidth`. In practice the intrinsic-sizing keyword let prose (purpose text, long titles) and `1fr` column tracks inside ProductPart / Cluster / Module cards expand into unwrappable single lines, so the natural width grew to thousands of pixels and auto-fit collapsed straight to the floor `0.25` — composition overflowed horizontally even at Cmd+Ctrl+0 (100% user-zoom) and Cmd+scroll → 25%. The inner div is now back on natural grid sizing: `scrollWidth` on a normally-sized grid already reports `max(clientWidth, rightmost-child.right)`, which matches the auto-fit measurement path once real card min-content (`minWidth: 220`, `minmax(240px, 1fr)`) overflows the track. Source-level regression assertion inverted to `max-content === false` so the keyword cannot silently return.

### Docs
- **SystemArchitecture.md §6.4** — rephrased auto-fit zoom contract: no intrinsic-sizing keyword on the composition-container, and an explicit note on why (prose / `1fr` tracks would expand into unwrappable lines and blow the natural width past any reasonable floor).
- **BugRegistry.md** — new entry `BUG-2026-04-21-03` capturing the root cause split, user-visible symptom on workspace `CodeAI-Hub claude`, fix, commits, and guards.

## [1.2.40] - 2026-04-21
### Fixed
- **Development Tree sidebar no longer flickers between correct and phantom standalone modules on `diagram_modules` artifacts.** `packages/core/src/remote-bridge/handlers/development-tree-snapshot.ts` consumed its `NEXT_SECTION_RE` singleton through direct `.exec()` calls, so the global regex's `lastIndex` accumulated between calls in the long-lived Core process and produced alternating hit/null results on the same artifact. When the clamp slipped, the standalone body extended past `## Simple Relations` and the non-strict `MODULE_ROW_RE` happily matched the `from-id` in 4-column relation rows as a module id. Any sidebar cluster expand/collapse triggered a `/workflow-state` refetch and re-rolled the alternation. The parser now routes every `/g` regex through `.matchAll()` (lastIndex-free) or a fresh factory instance, and `MODULE_ROW_RE` is strict 2-column (`[^|\n]+` in column 2 + `|\s*$` anchor) so Simple Relations rows physically cannot match even if the clamp ever slips again.
- **Diagram Modules Artifacts panel composition no longer gets cut off when the PM window is narrow.** `DiagramEditorFacade` now auto-fits the rendered composition to the container width via `ResizeObserver` + the composition's natural `scrollWidth`: `effectiveZoom = autoFitScale * userZoom`, where `autoFitScale = min(1, containerWidth / naturalWidth)` with a floor of `0.25`. Manual Cmd/Ctrl+scroll becomes an overlay on top of the auto-fit base, and Cmd/Ctrl+0 clears only the user overlay without breaking auto-fit.

### Docs
- **SystemArchitecture.md §6.4** records two new invariants: regex lastIndex safety for `development-tree-snapshot` (no direct `.exec()` / `.test()` on module-level `/g` regex), and the auto-fit zoom contract (auto-fit base × user-zoom overlay, natural width advertised through `width: max-content + min-width: 100%`).

### Tests
- **`development-tree-snapshot.test.ts`** adds a 10-run idempotency regression (lastIndex drift guard) and a cluster-module-as-Simple-Relations-`From` guard that reproduces the original sidebar symptom.
- **`diagram-editor-facade.test.tsx`** adds source-level regression coverage for the auto-fit API surface (`autoFitScale`, `userZoom`, `effectiveZoom`, `ResizeObserver`, `scrollWidth`, `max-content`, `setUserZoom(1)`).

## [1.2.39] - 2026-04-21
### Fixed
- **Reopened workflow dialog no longer sticks in "Agents is working, please wait..." after Core cold-start.** Previously Core only rehydrated a runtime session for the `lastActive` stage on startup; other reopened dialogs (e.g. `virtual_simulation`, `diagram_modules`) had no record in `workspace:snapshot`. PM `createInitialSnapshot` started workflow sessions with `connectionState: "running"` expecting a Core-initiated turn, but the expected idle snapshot update never arrived, and the initial "running" remained indefinitely. `RemoteBridgeDialogCommandRouter.handleDialogList` now materializes a stub runtime session for every continuity entry via the new `materializeContinuityEntries` helper, so the existing snapshot reconciliation (`snapshotSignalsIdleUnlocked`, released in `1.1.646`) flips the UI to idle automatically.
- **Stop button on a reopened workflow dialog now works.** The same underlying asymmetry caused `SessionRequestHandlerStopAction.handleStop` to return `"Session not found"` without emitting `turn_state: "idle"`, so clicking Stop did nothing. Because the dialog list now always materializes a session + paper-binding in Core, `handleStop` finds both lookups and invalidates the binding normally.

### Added
- **`SessionManager.registerSessionWithId`** — externally-id-preserving session registration (no UUID regeneration) for restore-from-continuity paths; `providerSessionStatus` is set to `"ready"` without invoking any provider adapter.
- **`SessionProviderBindingService.registerRestoredBinding`** — paper-binding registration in `providerSessions` Map for restored sessions; no adapter subscription is created, `invalidateProviderBinding`'s existing `unsubscribe()` call is a safe no-op.
- **`session-continuity-materializer.ts`** — helper that walks a `ContinuityIndexEntry[]` and, for each entry with a complete `latestSessionId + providerId + providerSessionId` triple that is not yet known to `SessionManager`, registers a stub session, paper-binding, and `WorkspaceRuntimeFacade.notifySessionCreated` hydration with `turnState: "idle"`, `continuityLockActive: false`, `bindingStatus: "ready"`. Idempotent on repeated `dialog:list`.

### Unchanged
- **External Codex contract stays stable.** Provider `thread/resume` remains lazy — it is triggered by the first user message through the existing `resolveProviderSessionId` dispatch path, not by materialization. Codex app-server `closeSession` is safe on paper-bindings because it only interrupts an active turn (none exist for stubs) and deletes its internal map entry.

### Docs
- **SessionInputLock SSOT §3.3, SessionUI_Behavior §4.4, CoreOrchestrator §3, SystemArchitecture §3 Invariant 1** all updated to record the runtime session materialization invariant. New `BugRegistry` entry `BUG-2026-04-21-01` captures the full forensics, root cause, fix, and guards.

### Tests
- **`session-continuity-materializer.test.ts`** — happy path stub creation (session / binding / workspace runtime hydration), idempotency across repeated `dialog:list`, skip behavior for incomplete entries, and explicit assertion that post-materialize state satisfies both `handleStop` preconditions (`sessionManager.getSession` + `providerSessions.get` both non-null).

## [1.2.38] - 2026-04-21
### Removed
- **Legacy Codex SDK-based provider module deleted.** `packages/Codex_Module/` and its transitive dependency `@openai/codex-sdk@0.53.0` are removed from the repository and the workspace lockfile. The module had been orphaned since release `1.2.22`, when the `codex app-server` line in `packages/Codex_AppServer_Module/` became the sole active runtime; no active `import` from `@codeai-hub/codex-module` existed in Core / provider-registry / build scripts / tests. `knip.json` and `.vscodeignore` entries for the legacy package are cleaned up in the same change.

### Unchanged
- **External Codex contract stays stable.** Provider id remains `codexCli`, provider-home slot remains `~/.codeai-hub/providers/codex`, and the release artifact name remains `codex-module-<version>.tar.bz2` (now built from `packages/Codex_AppServer_Module/` with the same name as an explicit installer contract). No installer migration required.

### Docs
- **Canonical SSOT documents retargeted at the app-server module.** `Modules/Codex.md`, `System/SystemArchitecture.md`, the then-active `Contracts/Formal_Module_Cluster_Facade_Architecture.md` (now archived at `Plans/Archive/Formal_Module_Cluster_Facade_Architecture.md`), `Contracts/ProviderFailure_Recovery_And_ProviderSwitch.md`, and `Contracts/EffectiveModelIdentity_And_Settings_SSOT.md` no longer describe the legacy module as a fallback and no longer reference files under `packages/Codex_Module/`. Historical docs (`CHANGELOG.md` entries for releases ≤ 1.2.21, `doc/TODO/Archive/`, `doc/SolidWorks-WorkFlow/Plans/Archive/`, `doc/Sessions/`, `doc/BugRegistry.md`) are preserved as audit trail.

## [1.2.37] - 2026-04-21
### Fixed
- **Diagram Modules module tables now render.** Both the Project Manager diagram canvas parser (`diagram-modules-staged-part-parser.ts`) and the Core Development Tree snapshot (`development-tree-snapshot.ts`) now accept the canonical 2-column `| \`module-id\` | Responsibility |` module table. Previously the parsers still required a third backtick-wrapped column (the removed `ModuleKind` slot from refactor `c488df065`), so new staged artifacts rendered as `Modules: 0` in clusters and lost all standalone modules.
- **`## Simple Relations` rows no longer leak as phantom standalone modules.** The Core snapshot now clamps the `## Standalone Modules` body at the next `##` header, so `From` / `To` entries from Simple Relations are no longer mis-surfaced as standalone nodes in the PM sidebar Development Tree.

### Changed
- **Parser tests updated to the 2-column contract.** Staged-part parser and development-tree-snapshot tests now exercise the canonical 2-column shape and include a regression test for Simple Relations isolation.

### Docs
- **SystemArchitecture §6.4 records the 2-column module table invariant.** The staged `product-parts/<part-id>.md` format and the standalone-section clamping rule are now SSOT for both readers of the staged artifact.

## [1.2.36] - 2026-04-20
### Added
- **Dedicated `UI Translation Engine` and `Reasoning Translation Engine` selectors in the Settings localization card.** The UI engine drives interface bundle materialization and the browser bootstrap payload; the reasoning engine drives live translation of visible Thinking / Reasoning bubbles and defaults to `Google GTX Free` for stability.
- **Fifth user-facing `Reasoning` localization category with its own language selector.** Visible Thinking / Reasoning bubbles now use a dedicated `reasoning` target language, decoupled from `Messages for the User`. Hidden reasoning continues to bypass the translation pipeline entirely.

### Changed
- **Reasoning engine and reasoning language changes are runtime-only.** They never enter the strict localization sync path, never block Settings save / Project Manager / new session sends, and never rebuild browser bootstrap bundles. Only the UI translation engine and the four UI-owned category languages still trigger the strict sync path.
- **Core-owned live reasoning overlay translation now reads `reasoningEngineId` and `reasoningLanguage`.** Provider-local applied-turn-config adapters (Claude, Codex, Gemini) prefer the new envelope fields and fall back to the legacy `translationEngineId` / `messagesForTheUserLanguage` aliases only while Core still forwards both.

### Migration
- **Legacy settings migrate on first load.** `general.localization.engineId` is migrated into `general.localization.uiEngineId` (legacy key dropped from persisted state), `general.localization.reasoningEngineId` is seeded to `google-gtx`, and the new `categories.reasoning` target language is seeded from `messagesForTheUser` so existing installations keep the same visible reasoning language on upgrade.

### Tests
- **Regression coverage added for the split routing.** `SessionTranslationPolicyResolver` now has dedicated tests covering the reasoning engine routing on both the enabled and `localization_sync_pending` paths, the reasoning-language decoupling from `Messages for the User`, and the on-read legacy-migration fallback.
- **Applied turn-config envelope tests updated.** The session request handler fixtures now assert the new `reasoningEngineId` and `reasoningLanguage` fields flow through alongside the legacy aliases.

## [1.2.35] - 2026-04-20
### Fixed
- **Main thinking body text is now slightly brighter on both internal paths.** The readable content inside both legacy `role="thinking"` and assistant-tagged reasoning cards (`Claude · Thinking`, `Codex · Thinking`, `Gemini · Thinking`) now uses `rgba(173, 178, 186, 0.7)` instead of `rgba(173, 178, 186, 0.6)`.
- **The rest of the thinking visual contract remains unchanged.** Fill, stroke, shadow, provider-colored header, and the more-muted timestamp stay on the accepted `1.2.34` baseline while only the main body text is retuned.

### Tests
- **Targeted shared-UI verification passed.** `npm run build:webview` and `npm run build:project-manager` both completed successfully before release packaging.

## [1.2.34] - 2026-04-20
### Fixed
- **Both internal `Thinking` bubble paths now share one chrome contract.** The legacy `role="thinking"` surface and the assistant-tagged reasoning path (`Claude · Thinking`, `Codex · Thinking`, `Gemini · Thinking`) now use the same muted fill `rgba(44, 50, 48, 0.45)` and stroke `rgba(71, 71, 74, 0.45)` instead of rendering with different chrome values.
- **Thinking-card shadow is now unified and softened.** Both thinking paths now keep the same visible shadow `0px 6px 14.1px 3px rgba(0, 0, 0, 0.5)`, replacing the previous split between `no shadow` on the legacy strip and the heavier opaque shadow on the assistant-tagged path.

### Tests
- **Targeted shared-UI verification passed.** `npm run build:webview` and `npm run build:project-manager` both completed successfully before release packaging.

## [1.2.33] - 2026-04-20
### Fixed
- **Visible provider `Thinking` bubbles now render as full cards again.** Assistant-tagged reasoning cards such as `Codex · Thinking`, `Claude · Thinking`, and `Gemini · Thinking` no longer inherit the flatter legacy compact-strip treatment; the user-facing bubble path restores the message-card shadow.
- **Muted provider `Thinking` chrome is now tuned against the real Session dialog backdrop.** The user-facing reasoning bubble surface no longer falls into the darker panel-gray composite caused by sharing the legacy alpha treatment directly on top of the dialog panel background, while the compact `role="thinking"` strip keeps its separate transition-surface contract.

### Tests
- **Shared provider-facing `Thinking` verification passed.** `npm exec -- tsx --test src/client/ui/src/session/dialog-panel-message-utils.test.ts`, `npm run build:webview`, and `npm run build:project-manager` all completed successfully before release packaging.

## [1.2.32] - 2026-04-20
### Fixed
- **Muted thinking-card chrome now uses the exact approved design colors.** The shared reasoning surface no longer relies on approximate near-gray values; fill now resolves from `#2C3230` at `45%` alpha and stroke from `#47474A` at `45%` alpha, matching the intended spec more precisely.

### Tests
- **Targeted shared-UI verification passed.** `npm run build:webview` and `npm run build:project-manager` both completed successfully for the exact-color retune before release packaging.

## [1.2.31] - 2026-04-20
### Fixed
- **Provider `Thinking` headers now keep their accent instead of fading to neutral gray.** Assistant-tagged reasoning cards such as `Codex · Thinking`, `Claude · Thinking`, and `Gemini · Thinking` now preserve the provider hue at `0.6` alpha, so the header remains visibly provider-scoped while still reading as secondary content.
- **Muted thinking bubble chrome is slightly stronger.** The shared thinking surface now uses `0.45` alpha for fill and border instead of `0.4`, improving contrast without restoring the ordinary assistant-card weight.

### Tests
- **Targeted shared-UI verification passed.** `npm run build:webview` and `npm run build:project-manager` both completed successfully for the provider-accent retune before release packaging.

## [1.2.30] - 2026-04-20
### Fixed
- **Visible `Thinking` cards now receive the muted alpha contract on the actual user-facing render path.** Session UI now applies the softened background/border/text treatment not only to `role="thinking"` bubbles but also to assistant messages tagged as thinking, so cards such as `Codex · Thinking` no longer fall back to the ordinary assistant surface.

### Tests
- **The real `assistant + tag="thinking"` path is now regression-covered.** `src/client/ui/src/session/dialog-panel-message-utils.test.ts` now locks the dedicated styling hook for tagged thinking cards, and targeted verification passed with `npm exec -- tsx --test src/client/ui/src/session/dialog-panel-message-utils.test.ts`, `npm run build:webview`, and `npm run build:project-manager`.

## [1.2.29] - 2026-04-20
### Changed
- **Session dialog message cards now use a shared `1px` stroke.** The base bubble contract in `media/session-view.css` no longer uses the heavier `2px` border, so user, assistant, and thinking cards render with a lighter frame across the whole dialog surface.
- **Thinking cards are visually muted across Claude, Codex, and Gemini.** Provider reasoning bubbles now use alpha-softened background and border colors plus dimmer header/body/toggle typography, so visible `Thinking` stays readable but no longer competes with the final assistant answer.

### Tests
- **Targeted shared-UI bundle verification passed.** `npm run build:webview` and `npm run build:project-manager` both completed successfully before the release packaging phase.

## [1.2.28] - 2026-04-20
### Fixed
- **Late translation growth of the last dialog bubble now re-triggers bottom-lock autoscroll.** Session UI now derives the dialog scroll anchor from the last visible bubble display payload (`localizedContent ?? content`) instead of native `content` alone, so when a late Core translation overlay expands the already-rendered last thinking/assistant bubble in place, the view stays pinned to the newest bottom edge automatically.

### Tests
- **Localized last-bubble autoscroll is now regression-covered.** `src/client/ui/src/session/dialog-panel-scroll-anchor.test.ts` now proves that a change in `localizedContent` alone is enough to invalidate the last-bubble scroll anchor, and targeted verification passed for the scroll-anchor test plus `build:webview`.

## [1.2.27] - 2026-04-20
### Fixed
- **Codex app-server commentary is visible again in the dialog trail.** `phase: "commentary"` agent messages now materialize as non-terminal assistant `dialog_message` entries with `tag: "commentary"` instead of being dropped after transport normalization, while `final_answer` stays the terminal assistant reply.
- **Merged Codex thinking cards now preserve a blank boundary before the next standalone bold heading block.** The Session merge helper remains marker-repair aware for split list items, but now inserts a paragraph break before the next `**Heading**` block so completed reasoning sections keep their scan rhythm.
- **Standalone bold heading spacing is now narrowed to real body/list followers.** The Session stylesheet no longer uses an over-broad wildcard sibling rule after bold-only heading paragraphs; the zero-gap rule now targets only the immediately following paragraph/list body, preserving the intended heading rhythm more precisely.

### Tests
- **Codex commentary and heading-boundary regressions are covered on both provider and UI paths.** The app-server router test now locks commentary preservation, and the Session merge-helper test now locks the blank-line contract before standalone bold heading blocks. Targeted verification also passed for `@codeai-hub/codex-app-server-module`, `dist` router tests, the UI merge test, and `build:webview`.

### Contracts
- **Codex hybrid/app-server contract now explicitly preserves commentary and completed reasoning structure.** SSOT docs now state that `Hybrid` cannot collapse user-facing progress down to reasoning + final answer only, and that the Session UI owns boundary-aware merge/spacing repair for completed bold heading sections.

## [1.2.26] - 2026-04-20
### Fixed
- **Claude live ordered lists no longer split on marker-only stream fragments.** The Claude thinking and assistant live buffers now backtrack to the previous safe boundary instead of flushing a chunk that ends with a bare markdown marker such as `1.`, `2.`, `-`, `*`, or `+`.
- **Project Manager now repairs Claude thinking fragments that still arrive with a split list boundary.** The dialog merge layer rejoins `2.` + `Первоначальный запуск` style fragments into one markdown list item before the visible thinking bubble is persisted.
- **Session ordered lists now keep their markers on the outside line box.** The dialog stylesheet no longer renders loose markdown lists with `list-style-position: inside`, which previously pushed the ordered-list number onto its own visual line when the item started with a paragraph block.

### Tests
- **Claude list-marker regressions are covered on both provider and UI paths.** Regression tests now cover thinking/text live buffers, the Claude stream router fallback path, and the Project Manager thinking merge repair utility.

### Contracts
- **Claude session formatting contract is now marker-safe across provider and UI boundaries.** Provider live buffers must not emit marker-only fragments, while the Session UI remains responsible for secondary repair and outside-marker rendering when provider chunking still arrives imperfectly.

## [1.2.25] - 2026-04-19
### Fixed
- **Codex reasoning no longer splits semantic sections across live `thinking` bubbles.** The app-server line now waits for `item/completed` and emits user-facing reasoning from completed summary blocks instead of readable live fragments built from `summaryTextDelta` / `textDelta`, so heading/body pairs such as `**Exploring model synchronization**` and `**Crafting concise questions**` stay intact.
- **Standalone bold reasoning headings now keep the correct spacing after the heading line.** Session dialog CSS now suppresses the extra gap after bold-only paragraph headings while preserving the normal gap before them, so heading paragraphs read as the title of the following text block.

### Tests
- **Codex completed-summary reasoning emission is now regression-covered.** `packages/Codex_AppServer_Module/src/app-server/codex-app-server-event-router.test.ts` covers completion-only reasoning emission, accumulated summary fallback when `item.summary[]` is absent, and raw-text fallback when only `textDelta` exists.

### Contracts
- **Codex reasoning contract is now completion-first on the app-server line.** User-facing reasoning waits for completed summary blocks on `item/completed`; live deltas remain provider-local fallback/diagnostic inputs and no longer define the visible dialog stream.

## [1.2.24] - 2026-04-19
### Fixed
- **Translation overlays now normalize missing spaces on `latin <-> cyrillic` boundaries.** Shared translation post-processing repairs mixed-script prose such as `parallelдля`, `вродеpwd`, and `lsилиsed` before the text reaches dialog overlays, while protected `inline code` and fenced code blocks remain untouched.
- **Assistant and thinking messages now preserve paragraph boundaries before standalone bold section titles.** Shared text formatting repair turns glued patterns such as `...data.**Clarifying ...**` into readable section blocks on both the source message path and the localized overlay path.
- **Nested markdown lists no longer render with inflated blank gaps in ordinary assistant replies.** Session dialog CSS now collapses structural whitespace at the `li` layer instead of surfacing markdown indentation/newline artefacts as empty vertical blocks.

### Contracts
- **Shared text-format normalization is now layered, not UI-provider-specific.** Mixed-script spacing and standalone bold section-title repair are owned by the shared translation/core formatting path, while nested-list whitespace collapse stays owned by the session markdown renderer.

## [1.2.23] - 2026-04-19
### Fixed
- **Codex app-server reasoning is now emitted incrementally from the real-time stream.** `item/reasoning/summaryTextDelta` and optional `item/reasoning/textDelta` now materialize readable append-only `thinking` bubbles while the turn is still running, and `item/completed` only flushes the unseen tail or acts as fallback when deltas are absent.
- **Codex app-server transport diagnostics are restored under `~/.codeai-hub/logs/codex`.** The active process bridge now writes rotate-safe JSONL `sdk-codex-app-server-*.jsonl` files containing JSON-RPC requests/responses/notifications, protocol log records, stderr, and malformed stdout lines, complementing the existing session `*-description.jsonl` and provider-home rollout/history artifacts.

### Changed
- **Codex app-server package builds now start from a clean `dist/`.** `packages/Codex_AppServer_Module` removes stale compiled outputs before `tsc`, preventing deleted `*.test.*` artefacts from leaking into `codex-module-<version>.tar.bz2` and the final VSIX.

### Contracts
- **Codex live reasoning contract is now delta-first on the app-server line.** User-facing incremental reasoning comes from app-server `summaryTextDelta` / `textDelta` notifications, while `summary = "detailed" | "none"` remains governed by the shared settings snapshot and `Reasoning in dialog` toggle.
- **Codex diagnostics are now explicitly three-layered.** The active release line keeps separate CodeAI Hub transport JSONL (`logs/codex`), session-local normalized `description.jsonl`, and provider-native provider-home artifacts instead of collapsing everything into one raw-log surface.

## [1.2.22] - 2026-04-19
### Changed
- **Codex provider runtime switches to the new app-server transport module.** Core keeps the same external provider contract (`codexCli`, provider slot `~/.codeai-hub/providers/codex`, same installer artefact name `codex-module-<version>.tar.bz2`), but the bundled/runtime adapter path now resolves to `@codeai-hub/codex-app-server-module` instead of the legacy SDK-stream package.
- **Core/provider packaging and version orchestration follow the new workspace package.** `build-core.sh`, `build-codex-module.sh`, `build-all.sh`, and release packaging now build/package/version `packages/Codex_AppServer_Module`, remove the old Codex workspace from the staged Core dependency graph, and keep VSIX/provider artefacts aligned to the app-server line.

### Contracts
- **Codex contract stays externally stable while the transport changes internally.** The provider id remains `codexCli`, the provider home remains `~/.codeai-hub/providers/codex/home`, and the release artefact contract remains `codex-module-<version>.tar.bz2`; only the internal transport/runtime implementation changes from legacy SDK rollout streaming to `codex app-server`.

## [1.2.21] - 2026-04-19
### Fixed
- **Strict localization sync now retries isolated missing structured bundle entries before failing Save.** When a provider-owned translation engine returns a marker-preserving runtime bundle with one missing segment, `LocalizationMaterializer` now retries only the missing entry and stitches it back into the bundle instead of persisting a partial-fallback bundle and rejecting synchronization.

### Contracts
- **Whole-bundle localization stays strict, but single-entry recovery is now part of the contract.** Runtime localization bundles still materialize as one structured batch and still fail if unresolved fallback entries remain after recovery, but a single dropped batch segment is no longer treated as an automatic hard failure when it can be recovered deterministically.

## [1.2.20] - 2026-04-19
### Changed
- **Neutral packaging refresh for the duplication and PM refresh line.** `1.2.20` carries forward the runtime fix-set introduced in `1.2.19` and finalizes the archived planning/docs closeout without changing runtime behavior.

### Contracts
- **Runtime contracts are unchanged from `1.2.19`.** Single terminal assistant emission, replay-first usage ownership, and visibility-aware polling remain the governing contracts for this release line.

## [1.2.19] - 2026-04-19
### Fixed
- **Official release closeout for the duplication and PM refresh fix-set.** Claude order-safe finalization, Codex terminal-answer dedupe, Project Manager `Stop` → resend reconciliation, replay-first usage telemetry delivery, and visibility-aware polling budget are now shipped together as the public `1.2.19` line.

### Changed
- **Planning closeout is archived and finalized.** The completed umbrella planning scope moved into `doc/SolidWorks-WorkFlow/Plans/Archive/`, active operational docs now point to the finalized `1.2.19` release/docs flow, and the active `todo-plan` has been reset to an empty placeholder.

### Contracts
- **Single terminal assistant emission and replay-first usage ownership remain the governing contracts for this release line.** Final assistant text is single-owner across Claude/Codex/PM paths, while usage telemetry belongs to provider turn completion plus Core replay/bootstrap rules rather than to UI-owned refresh loops.

## [1.2.18] - 2026-04-18
### Fixed
- **Claude final live text finalization is now order-safe.** Late `content_block_stop` events can no longer append an orphan tail after the canonical final assistant text has already been materialized. The live buffer tracks the finalized text per session and emits only unseen canonical tail content.
- **Codex terminal assistant emission is now single-owner.** When rollout produces equivalent `final_answer` and `task_complete` terminal payloads for the same turn, the first authoritative terminal answer wins and the fallback duplicate is suppressed even in the observed missing-`turn_id` case.
- **Project Manager canonical history now reconciles optimistic `Stop` → resend user bubbles.** When the user stops a turn and immediately resends the same message, the canonical history entry replaces the recent optimistic placeholder instead of rendering side-by-side as a duplicate user bubble.
- **Usage telemetry is replay-first and lifecycle-owned.** Codex and Gemini now deliver fresh usage telemetry on turn completion, Core replays cached `usage_limits` on reopen/reconnect before considering a provider refresh, and the ready-binding bootstrap refresh is allowed only once per binding lifecycle instead of re-triggering on every idle dialog reopen.
- **Idle dialog restore and background polling churn are reduced.** Session usage refresh ownership moved out of the PM UI, idle dialog restore no longer self-refreshes usage limits, and workflow/artifact/diagram polling now uses a visibility-aware budget (`foreground`, `background`, `hidden`) instead of one constant cadence.

### Contracts
- **Single terminal assistant emission.** Claude live finalization, Codex rollout terminal delivery, and PM canonical history now follow a one-owner dedupe contract: final assistant text and canonical user history replace optimistic/intermediate material instead of appending parallel duplicates.
- **Display-only usage UI with replay-first delivery.** `Session ID + Usage Limits` is a passive surface; authoritative usage telemetry belongs to provider turn-completion delivery plus Core websocket replay/bootstrap rules, while PM observers only render the latest snapshot and adjust polling cadence to window visibility.

## [1.2.17] - 2026-04-18
### Fixed
- **Claude localized pre-tool text no longer leaks as assistant/live output before `tool_use`.** In localized workflow turns, Claude could emit an English pre-tool progress fragment such as `I've read the Final_Description.md... Let me create the directory...` and our live text path persisted it as an ordinary assistant/live message between two `Thinking` bubbles. The fragment was therefore shown as a normal answer and skipped the thinking translation overlay. The Claude messaging path now holds localized pre-tool text off the assistant/live branch until the message outcome is known and routes `tool_use` preambles through the thinking contract instead of through the ordinary assistant path.

### Contracts
- **Claude pre-tool text classification.** Claude text that belongs to a message resolving to `tool_use` must not surface as a visible assistant/live bubble in localized sessions; it follows the thinking rendering/translation path instead. Ordinary `end_turn` assistant text keeps the existing assistant contract.

## [1.2.16] - 2026-04-18
### Fixed
- **Claude false `resuming` continuity lock after a successful final reply.** A Claude turn could complete normally, persist the final assistant response, and then fail during post-turn `/context` usage refresh because the Unix probe path launched `node <executablePath> ...` even when `claude` resolved to a native bundled executable. `packages/Claude_Module/src/sdk/claude-context-usage-probe.ts` now executes native Claude binaries directly on Unix and uses `process.execPath` only for real JS entrypoints.
- **Core continuity arbitration now has an explicit provider-side fallback for missing trailing usage snapshots.** When an eligible flow-node session reaches `turn_completed` without a usable usage snapshot, Core still does not auto-assume `no_rollover`. But if the provider explicitly marks post-turn usage as unavailable, `packages/core/src/remote-bridge/handlers/session-request-handler-turn-arbitration.ts` now resolves the turn to `no_rollover` instead of leaving the session stuck in `context_check_pending`.

### Contracts
- **Claude post-turn usage-unavailable signal.** Claude completion flow may emit an explicit `postTurnTokenUsageUnavailable` signal when `/context` usage probing fails after a completed turn.
- **Continuity arbitration invariant.** Shared Core continuity logic may fall back to `no_rollover` only on an explicit provider signal that trailing usage is unavailable; absence of usage alone is still not enough.

## [1.2.15] - 2026-04-17
### Fixed
- **Client-side label fallback flicker.** Companion fix to 1.2.13 (which addressed only the Core-side broadcast path). `src/client/ui/src/session/model-info-builder.ts` `resolveModelReasoning` for Gemini/Codex branches was returning the raw thinking/reasoning level from settings without the provider-specific prefix, so the initial client render produced `(high)` / `(medium)` while `parseEffectiveModelId` on effective ids produced `(thinking high)` / `(reasoning medium)`. First render matched settings, then Core's `session:model:update` replaced it — user saw a one-frame flicker most visible on temp-session start. Fallback now wraps the level as `thinking ${level}` / `reasoning ${level}`. Both paths now produce identical labels.

### Contracts
- **Invariant 14** (Effective model identity SSOT) client-side extension: client `ModelInfo` builder fallback path to settings MUST wrap raw level values in the same provider-specific prefix that Core emits in effective modelIds (`thinking ` for Gemini, `reasoning ` for Codex; Claude keeps its own `thinking off` convention).

## [1.2.14] - 2026-04-17
### Fixed
- **Gemini post-tool stalled-turn watchdog bumped 120s → 240s** in `packages/Gemini_Module/src/session/gemini-session-lifecycle.ts` (`DEFAULT_POST_TOOL_STALLED_TURN_WATCHDOG_MS`). 1.2.13 retest on Gemini 3.1 Pro + `thinkingLevel=high` showed the post-tool leg killed at exactly 120s after a two-tool-call initial turn — Gemini was still in silent deep-reasoning phase when the watchdog fired. The 1.2.11 asymmetry (initial 240s, post-tool 120s) was based on an incorrect assumption that follow-up legs always respond faster than initial reasoning. Both legs are now 240s. Per-session overrides preserved.

### Contracts
- **Invariant 7** (Gemini stalled-turn watchdog) updated: `DEFAULT_POST_TOOL_STALLED_TURN_WATCHDOG_MS = 240_000` now symmetric with `DEFAULT_STALLED_TURN_WATCHDOG_MS = 240_000`. Adaptive-per-thinking-level watchdog remains planned as a future follow-up only if 240s/240s proves too generous or too tight.

## [1.2.13] - 2026-04-17
### Fixed
- **SESSION UI model label flicker between `(thinking high)` and `(high)`.** Cosmetic only — real applied thinkingLevel was always correct. Root cause: `broadcastRuntimeModelUpdate` in `packages/core/src/remote-bridge/handlers/session-provider-event-router.ts` was forwarding raw `data.model` from the provider SDK's `model_info` event (e.g. `"gemini-3.1-pro-preview"`) without the effective-identity suffix, while `session-request-handler-message-dispatch.ts` was broadcasting the same event with the full effective id (`"gemini-3.1-pro-preview thinking:high"`). UI renderer in `src/client/ui/src/session/model-info-builder.ts` matched/fell-back differently on the two shapes. Core now enriches the SDK-path broadcast through `SessionRequestHandlerAppliedTurnConfig.resolveEffectiveModelId(providerId, targetModelId)`, which reuses the same `buildProviderEffectiveModelId` helper the dispatch path already uses. Both paths now emit identical effective ids and the UI label stops flickering.

### Contracts
- **Invariant 26** (Effective model identity SSOT) extended: any `session:model:update` broadcast MUST carry the effective modelId (with thinking/reasoning suffix), never a raw base id from the provider SDK. Raw `data.model` values arriving from SDK `model_info` events must be enriched via `AppliedTurnConfig.resolveEffectiveModelId` before broadcast.

## [1.2.12] - 2026-04-17
### Fixed
- **Core daemon no longer crashes on Gemini cli-core self-abort.** `@google/gemini-cli-core` `GeminiClient.processTurn` calls `controller.abort()` internally when its own loop-detection fires (observed in 1.2.11 retest with Gemini 3.1 Pro + `thinkingLevel=high`). The resulting node-fetch AbortError lives in a background Promise chain that is NOT owned by our `runTurn` try/catch, so it bubbles as uncaughtException and kills the daemon. `packages/core/src/index.ts` now installs a `process.on("uncaughtException", handler)` that inspects the error and selectively swallows `AbortError` only when `error.stack` contains `@google/gemini-cli-core`. All other uncaughtExceptions still crash the process — crash-safety for real bugs is preserved.
- **Gemini mis-routed thinking content rerouted to thinking overlay.** On `thinkingLevel=high` with large Description Agent prompts, Gemini 3.1 Pro streams its internal meta-prompt through `Content` events instead of `Thought` events. `packages/Gemini_Module/src/messaging/gemini-assistant-event-normalizer.ts` now has a `hasMisroutedThinkingPrefix(text)` detector that checks the finalised assistant segment against known leaks (`sthought`, `CRITICAL INSTRUCTION`, `Related tools:`, `Plan:\n`, `Drafting the content`). When matched, the whole segment is rerouted through the existing `thought-translator-service` overlay path (same helper as the 1.2.9 `[Thought: true]` splitter), so the user never sees an English meta-prompt in the assistant dialog. Detector runs after Bug A splitter and Bug B pre-tool heuristic from 1.2.9.

### Contracts
- **Invariant 7** (Provider dialog segment preservation) Gemini branch extended: mis-routed thinking prefixes in `Content` event streams must be rerouted through the thought-translator overlay.
- **Invariant 30** (new): Core has a process-level `uncaughtException` handler that selectively suppresses `AbortError` from embedded provider SDK stacks (currently `@google/gemini-cli-core`). Embedded SDKs run background Promise chains parallel to our turn runner, and their internal aborts cannot be captured by per-turn try/catch. Any future provider SDK with similar background abort behaviour should be added to the allowlist explicitly.

## [1.2.11] - 2026-04-17
### Fixed
- **Gemini initial-leg stalled-turn watchdog bumped 60s → 240s** (`packages/Gemini_Module/src/session/gemini-session-lifecycle.ts` `DEFAULT_STALLED_TURN_WATCHDOG_MS`). Fixes 1.2.10 retest regression where Gemini 3.1 Pro Preview + `thinkingLevel=high` on the Description step produced 60s silence on the stream channel during deep reasoning and got killed by our watchdog. Post-tool watchdog (`DEFAULT_POST_TOOL_STALLED_TURN_WATCHDOG_MS = 120_000`) unchanged. Single-constant bump; to be validated in retest and narrowed later if 240s proves too generous.

### Contracts
- **Invariant 7** (Gemini stalled-turn watchdog): new baseline is 240s for initial leg, 120s for post-tool leg. Adaptive-per-thinking-level watchdog deferred to a follow-up scope.

## [1.2.10] - 2026-04-17
### Changed
- **Audit cleanup release** (no runtime behaviour change; no retest required). Scope split across four directions: (A) docs + config verification — all three audit-flagged items investigated; `Docs_Index.md` template section extended to document both bundled-template source paths AND per-workspace instance paths (audit had confused the two layers), `knip.json` diagram-DSL exclusion kept (intentional: chain used only through `diagram-editor-facade.test.tsx`), spec-creator TODO lives in a third-party published package (not under our control); (B) localization cleanup — 99 unused keys removed from the four approved source dicts (`ui_labels`, `ui_helper_text`, `messages_for_the_user`, `artifacts_for_the_user`) after a grep-partial dry-run ruled out dynamic template-literal usage; (C) duplication refactor — `useBootstrapSettings` extracted to `src/client/shared/hooks/`, `createWorkspaceFileHandler` factory introduced in `workspace-file-service.ts`, `idea-collector-schema-utils.ts` now imports from `@codeai-hub/agents-shared` instead of duplicating; (D) process formalization — new `doc/SolidWorks-WorkFlow/Checklists/PeriodicAudit.md` documents the recurring audit cadence and parallel audit-pass workflow.
- `check:dup` duplication metric: 3.68% → ~3.2% (stays under the 3%* threshold with headroom; 200+ remaining clones are documented as legitimate parallel provider scaffolding + client↔core boundary mirrors per the new SSOT invariant).

### Contracts
- **SystemArchitecture** gains an explicit "Acceptable parallel-scaffolding duplication" invariant: Claude/Codex/Gemini parallel provider boilerplate (installer, session-logger, provider-adapter, session-registry, auth bridge) and symmetric client↔core type-contract mirrors are NOT debt. Future audits must classify by blast radius (provider isolation + layer independence) rather than by raw LOC.

## [1.2.9] - 2026-04-17
### Fixed
- **Gemini inline `[Thought: true]` marker now splits into a thinking bubble + final assistant reply**: post-tool follow-up turns sometimes arrive as a single `content` stream containing an English thought-like summary, the literal token `[Thought: true]`, and the final target-language answer — without any `ptype: "thought"` events. `packages/Gemini_Module/src/messaging/gemini-assistant-event-normalizer.ts` `handleFinishedEvent` now regex-splits the assembled segment on `/\[Thought:\s*(true|false)\]/`. The pre-marker half is routed through the existing `thought-translator-service` overlay path (same one native `ptype: "thought"` events use), the post-marker half becomes the assistant bubble, and the literal token itself is dropped from dialog.
- **Gemini pre-tool non-target-language progress text reroutes to thinking overlay**: `TurnAccumulator` now snapshots the assembled assistant text at the first `tool_call_request` event of each turn into `preToolAssistantSegment`. At `handleFinishedEvent`, if Messages-for-the-User target is in the Cyrillic family (`ru` / `uk` / `bg` / `sr` / `mk` / `be` / `ky` / `kk` / `mn` / `tg` / `ab`) and the snapshotted pre-tool text contains zero Cyrillic characters (U+0400..U+052F), the segment is rerouted through `thought-translator-service` as a thinking bubble and excluded from the final assistant bubble. Target `en` disables the heuristic entirely. In-target-language pre-tool text keeps current behaviour (prepended to the assistant bubble unchanged).

### Contracts
- **Invariant 7** (Provider dialog segment preservation) — Gemini branch now documents that inline `[Thought: true]` markers and non-target-language pre-tool progress text are not part of the final assistant bubble; both surface through the thought-translator overlay path.

## [1.2.8] - 2026-04-17
### Fixed
- **Gemini post-stop resume now actually loads the prior chat**: `packages/Gemini_Module/src/session/gemini-session-bootstrapper.ts` now runs the full resume pipeline inside our embed path (1.2.7's `argv.resume` was a no-op because only the `gemini` main binary consumes that flag). The bootstrap scans `config.storage.getProjectTempDir()/chats` for `session-*-<uuid-first-8>.json`, picks the file whose full `sessionId` matches and has the most messages (defensive against pre-1.2.8 mess with two files for one UUID), calls `config.setSessionId(...)`, converts `messages` via the newly exposed `convertSessionToClientHistory` from `@google/gemini-cli-core`, and finishes with `await client.resumeChat(history, { conversation, filePath })`. The existing chat file is reused by `ChatRecordingService.initialize(resumedSessionData)` instead of a new empty one being created.
- **Stale-seed send recovery**: when `GeminiProviderAdapter.sendMessage` catches `Gemini session <id> not found. Available: [] Aliases: []` it throws a tagged `SessionStaleBindingError`. `packages/core/src/remote-bridge/handlers/session-request-handler-provider-send.ts` catches that error, invalidates the binding, seeds the pre-stop `providerSessionId`, re-runs `ensureSessionReadyForSend` (post-stop resume path), and retries the send once. Only one auto-retry per turn; a second failure surfaces as an ordinary provider error. Covers the case where Project Manager dialog bootstrap creates a new Core session with a dead provider session id + `providerSessionStatus: "ready"` and the user send bypasses `hasStopInvalidatedBinding`.

### Removed
- **Legacy `SwitchRecoveryBanner`**: `src/client/ui/src/session/switch-recovery-banner.tsx`, `src/client/project-manager/components/sessions/use-dialog-switch-offer.ts`, `src/client/project-manager/dialog-switch-types.ts`, related CSS and localization keys. Recovery is now silent end-to-end through 1.2.7 post-stop resume + 1.2.8 stale-seed guard.

### Contracts
- **Invariant 24** extended further: providers with `requiresPostStopResume` must publish a recognizable "session not found" surface so that Core can auto-heal mid-send stale-seed cases without prompting the user.

## [1.2.7] - 2026-04-17
### Fixed
- **Gemini `Stop` no longer wipes provider chat history**: `packages/Gemini_Module/src/session/gemini-session-lifecycle.ts` `closeSession` no longer calls `session.client.resetChat()`. That call materialized a new empty `GeminiChat` against the same `Config.sessionId` and wrote a new empty chat file under `~/.gemini/tmp/<projectSlug>/chats/`, orphaning the prior chat file. The abort path is now `abortController.abort()` + `sessionStore.removeSession()` only, so the pre-stop provider chat file stays intact.
- **Core-side post-stop Gemini rebind resumes by provider session id**: Core's `SessionProviderBindingService.invalidateProviderBinding` now remembers the live `providerSessionId` in a pre-stop map before setting the binding to `null`, and `SessionRequestHandlerStopRebind.performRebind` threads that id into `resolveProviderSessionId`'s `requestedProviderSessionId` for providers with the new `requiresPostStopResume` capability. `GeminiProviderAdapter.resumeSession` forwards it to Gemini CLI Core `argv.resume`, which loads the prior chat file with full Description Agent system instructions and prior dialog. Claude/Codex paths are unchanged (their post-stop continuity is already owned provider-natively).

### Contracts
- **Invariant 24** extended: `Provider Stop` is now also required not to discard provider-native chat history. For providers declaring `requiresPostStopResume`, Core must persist the pre-stop provider session id and resume against it on rebind.

## [1.2.6] - 2026-04-17
### Fixed
- **Codex `Stop` aborts the active subprocess instead of waiting for `turn_completed`**: `packages/Codex_Module/src/sdk/codex-sdk-patches.ts` registers the `ChildProcess` spawned by `streamCodexExec` in a module-scoped Map keyed by `threadId` and exports `killActiveCodexProcess(threadId)` which issues `SIGTERM`. `packages/Codex_Module/src/session/session-manager.ts` `closeSession` calls this hook before `lifecycle.closeSession` and the `processingLoop` await, so the underlying `codex exec` stdout closes promptly, the readline `for await` unblocks, the existing `finally` cleans up, and the processing loop resolves. Previously Stop only resolved the outer message generator; the child kept running until Codex naturally finished the turn.
- **PM Stop-button no longer stacks clicks**: `src/client/ui/src/session/input-panel.tsx` tracks a new `stopInFlight` state that flips true on a Stop click and resets when `agentBusy` flips to false. While in-flight the handler short-circuits before calling `stopSession`. `src/client/ui/src/session/input-play-stop-button.tsx` gains a `stopPending` prop that disables the button and switches the aria-label to `Stopping current turn…`.
- **Core `handleStop` re-entry guard**: `packages/core/src/remote-bridge/handlers/session-request-handler-stop-action.ts` early-returns when `hasStopInvalidatedBinding(sessionId)` is already true, preventing a duplicate cleanup path when the PM debounce is bypassed.

### Out of scope (still planned)
- **Gemini Stop → Continue retest** — not yet run, will be covered in a follow-up once the user validates 1.2.6.

## [1.2.5] - 2026-04-17
### Fixed
- **Stop → Continue input lock no longer sticks**: `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts` now (1) mirrors `onSessionBinding` into the `SessionRecord.binding` in addition to the snapshot-level binding, (2) remembers the last known `providerSessionId` in `lastProviderSessionIdRef` the moment the binding flips to `null`, and (3) accepts a new session in `onSessionCreated` via an `isPostStopRebindSwap` branch when the created session carries the remembered `providerSessionId`. Placeholder cleanup and ref reset cover the new adoption path. The UI now switches `activeSessionId` onto the new session the moment Core creates it, so the next user message correctly locks the input panel and surfaces the `Agents is working, please wait...` wait-copy.

### Removed
- **1.2.3 Core `stopdiag_` instrumentation** gone from `stop-action.ts`, `stop-rebind.ts`, `message-dispatch.ts`, `runtime-callbacks.ts` (emit stack-capture), `provider-event-router.ts`.
- **1.2.4 PM `pmdiag_` instrumentation** gone from PM `api.ts`, `session-stream.ts`, `project-manager-runtime-session-view.tsx`, `project-manager-dialog-session-view.tsx`.
- **`pm:diag:log` → project-manager.log appender** reverted: the Core remote-bridge handler again routes PM diagnostic entries through `logger.info` into `core.log`. The dedicated `~/.codeai-hub/logs/project-manager/project-manager.log` file and its `CODEAI_PROJECT_MANAGER_LOG_FILE` env override are no longer written.

### Outstanding (planned for 1.2.6)
- **Codex `adapter.closeSession` abort**: the 1.2.3 Codex trace showed that Stop clicks stack in Core until Codex naturally emits `turn_completed`. Closing must abort the active turn instead of waiting.
- **PM Stop-button debounce**: while a `session:stop` is in flight, `InputPlayStopButton` should not re-fire on subsequent clicks.
- **Gemini Stop → Continue retest** — not covered by 1.2.3 / 1.2.4 retests yet.

## [1.2.4] - 2026-04-17
### Diagnostics
- **PM-side Stop → Continue trace (temporary)**: the 1.2.3 Claude retest proved Core emits `turn_state=running` correctly for the new sessionId that carries the post-Stop turn; PM keeps the old sessionId active in UI state, so the running snapshot lands on a session the input panel is not reading. New logs are routed to a dedicated file `~/.codeai-hub/logs/project-manager/project-manager.log` via the PM `logDiagnostic` transport and a local appender in the Core remote-bridge handler (path overridable via `CODEAI_PROJECT_MANAGER_LOG_FILE`):
  - `src/client/project-manager/api.ts` — `pmdiag_api_stop_session` on every Stop click, `pmdiag_api_send_session_message` on every outbound user message, both with the `sessionId` the UI actually resolved.
  - `src/client/project-manager/components/sessions/session-stream.ts` — `pmdiag_workspace_snapshot_apply` on every `workspace:snapshot` push, with a per-session summary (`turnState`, `continuityLockActive`, `continuityLockReason`, `providerSessionId`, `resumeMode`, `finalTurnCompleted`).
  - `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx` — `pmdiag_active_session_changed` on every `setActiveSessionId` transition with `from`, `to`, `workspacePath`, and a truncated call-site stack (7 frames) so the caller site is identifiable.
  - `src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx` — `pmdiag_dialog_active_session_changed` when the dialog controller swaps `session.id`, with `providerId` / `stage` / `providerSessionId` from the current intent.
- **Core logging split**: `pm:diag:log` messages no longer flow into `core.log` via `logger.info` — the remote-bridge handler in `packages/core/src/remote-bridge/remote-bridge-message-router.ts` now writes PM entries through a dedicated appender to `~/.codeai-hub/logs/project-manager/project-manager.log`. Core stays the authoritative writer, PM stays the author, but the two tiers are separated on disk.
- **Codex observation (from 1.2.3 trace)**: `Codex adapter.closeSession` does not abort the active turn; Stop clicks accumulate in Core and only drain when Codex emits `turn_completed` naturally. This is a separate baseline bug from the Claude Stop → Continue input lock; fix planned for 1.2.5 alongside a PM input-panel Stop debounce.
- Scheduled for removal in 1.2.5 together with the 1.2.3 Core `stopdiag_` logs once the PM-side fix lands.

## [1.2.3] - 2026-04-17
### Diagnostics
- **Stop → Continue input lock trace (temporary)**: after a Claude turn is interrupted via `Stop` and the user sends a follow-up message, the reply streams but the input panel stays unlocked — no `Agents is working, please wait...` wait-copy and no disabled fieldset. Core-only structured logs prefixed `stopdiag_` are emitted to `~/.codeai-hub/logs/core/core.log` from:
  - `packages/core/src/remote-bridge/handlers/session-request-handler-stop-action.ts` — `stop_begin`, `stop_close_done/error`, `stop_lifecycle_pre`, `stop_finalize_flow_lock`, `stop_emit_no_rollover_unlock`, `stop_invalidate_done`, `stop_emit_idle`.
  - `packages/core/src/remote-bridge/handlers/session-request-handler-stop-rebind.ts` — `rebind_gate`, `rebind_await_existing`, `rebind_no_adapter`, `rebind_begin`, `rebind_resolve_error`, `rebind_create_done` (with `supportsImmediateBinding`), `rebind_seed_done`, `rebind_attach_done/error`.
  - `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts` — `dispatch_begin`, `dispatch_append_skipped`, `dispatch_no_binding`, `dispatch_resolve_binding`, `dispatch_emit_running`, `dispatch_send_done`, `dispatch_send_error`.
  - `packages/core/src/remote-bridge/handlers/session-request-handler-runtime-callbacks.ts` — `emit_turn_state` on every `emitTurnStateEvent` with a truncated `new Error().stack` so every caller is pinpointed to its source.
  - `packages/core/src/remote-bridge/handlers/session-provider-event-router.ts` — `router_typed_event`, `router_handle_typed`, `router_turn_failed`.
- Scheduled for removal in 1.2.4 once the fix lands.

## [1.2.2] - 2026-04-16
### Fixed
- **Core `settings:load` no longer reverts Claude `xhigh` back to `medium`**: `packages/core/src/remote-bridge/handlers/settings-request-handler-claude-thinking.ts` carried an independent hardcoded whitelist `Set(["low","medium","high","max"])` — `xhigh` was missing. Every PM / websocket `settings:load` ran through this whitelist, treated `xhigh` as legacy numeric, normalized it to `DEFAULT_CLAUDE_THINKING_EFFORT = "medium"`, flagged `changed=true`, and persisted the rewritten snapshot to disk. Added `xhigh` plus a matching legacy anchor (`maxTokens: 20000`) and a comment pointing at SystemArchitecture §Invariant 27.

### Removed
- **1.2.0 / 1.2.1 diagnostic instrumentation**: `settings-file-watcher.ts`, persist/load/save debug logging in `settings-storage.ts` and `settings-message-handler.ts`, and the watcher start/stop hooks in `src/extension.ts` are gone.

### Documentation
- **SystemArchitecture §Invariant 27 added**: `settings.json` is re-normalized by two independent layers (extension-side `parseSettingsSnapshot` + Core `SettingsRequestHandler.handleLoad`). Provider effort/thinking values accepted by one layer but not the other are silently rewritten to the Core default on PM boot. New effort/reasoning/thinking levels must be added to all four canonical files in the same commit: UI model registry, extension-side normalizer, shared defaults resolver, Core remote-bridge handler.
- **Modules/Claude.md**, **Modules/Codex.md**, **Modules/Gemini.md** each gain a matching invariant bullet so per-provider work sees the cross-boundary rule.

## [1.2.1] - 2026-04-16
### Diagnostics
- **Settings.json fs watcher (temporary)**: the 1.2.0 trace proved that `persistSettingsSnapshot` alone cannot explain the stale-persist regression — one persist=xhigh log entry was followed by a silent on-disk rewrite to medium. Add a polling `fs.watchFile` started in extension activate and stopped in deactivate before `disposeExtensionLogger`; every mtime/size change on `~/.codeai-hub/settings/settings.json` is logged as `settings_debug_watcher_change` regardless of writer. Removed once the root cause is fixed.

## [1.2.0] - 2026-04-16
### Diagnostics
- **Settings storage trace (temporary)**: `loadSettingsSnapshot`, `persistSettingsSnapshot`, and `handleSaveRequest` now emit structured entries into `~/.codeai-hub/logs/extension/extension.log` via `getExtensionLogger()`. Persist trace includes a full stack trace of the caller. Used to identify the regression where launching Project Manager rewrites `claude.thinking.effort` back to `medium` after the user saved `x-High`. Scheduled for removal in a follow-up release once the root cause is fixed.

## [1.1.999] - 2026-04-16
### Fixed
- **Claude live assistant text no longer renders as one card per sentence**: the Phase 1 live-text ingestion shipped in 1.1.998 still emits each readable fragment as a stable append-only `SessionMessage` (so Core translation overlays can attach `localizedContent` per fragment), but the UI layer now collapses consecutive live fragments into one growing assistant card. The provider tags live emits with `tag: "live"`, Core `appendProviderMessage` forwards the tag into `SessionMessage.tag`, and `mergeLiveAssistantMessages` in `dialog-panel-message-utils.ts` performs the UI merge symmetric to `mergeThinkingMessages`.

### Documentation
- **System SSOT invariant 25** extended with a one-line note about the `tag: "live"` marker and the UI-side merge contract.
- **Modules/Claude.md** dialog-emitter section mirrors the same note.

## [1.1.998] - 2026-04-16
### Fixed
- **Claude visible text is now live**: a new `ClaudeTextLiveBuffer` + `ClaudeContentStreamHandler` ingest `content_block_delta` `text_delta` fragments and emit append-only assistant bubbles at sentence/paragraph boundaries. The previous ~2-minute silence between pre-tool assistant text and `stop_reason="tool_use"` (while Claude streamed large `input_json_delta` for `Write`/`Edit`) is eliminated. Finalization reconciles the assembled text against what was already materialized so nothing is duplicated.
- **Opus 4.7 plain-text thinking is visible again**: SDK option `thinking.display: "summarized"` is forwarded whenever thinking is enabled. Without it, Opus 4.7 only streams `signature_delta` (encrypted, zero plain-text). Safe no-op on Sonnet/Haiku/older Opus where plain-text thinking was already exposed.

### Added
- **x-High reasoning effort**: `ClaudeThinkingEffort` union extended with `xhigh` between `high` and `max`. Documented by the Claude Agent SDK as Opus-only "Deeper than high; falls back to High elsewhere". Settings UI renders it with a new radio row and localized label `x-High`.

### Changed
- **Claude model labels stop shipping hard-coded versions**: `CLAUDE_MODEL_ALIASES[].displayName` is now `Sonnet` / `Opus` / `Haiku`. Descriptions call out that the Anthropic SDK auto-resolves each alias to the latest concrete version at query time (today: `opus → claude-opus-4-7`).

### Documentation
- **System SSOT invariant 25** rephrased from "Provider live thinking" to "Provider live content" and extended to cover live `text_delta` ingestion too.
- **System SSOT invariant 26** added: Claude model aliases stay unversioned in UI, effort union is 5-level, `thinking.display = "summarized"` is the Opus-visibility contract.
- **Modules/Claude.md** updated: new messaging cluster files (`claude-content-stream-handler`, `claude-text-live-buffer`, `claude-structured-output-helpers`), new SDK options, and effort/alias contract.

## [1.1.997] - 2026-04-16
### Fixed
- **`Stop` is now shutdown-safe for Claude**: pressing `Stop` while Claude is streaming reaches the SDK as a clean interrupt and the resulting `aborted_streaming` terminal reason is treated as the expected outcome of a stopped turn. Late processor / dispatch / processing errors arriving after shutdown are suppressed instead of being emitted into a torn-down session error channel, so core no longer crashes with `ERR_UNHANDLED_ERROR` on the post-`Stop` window.
- **Claude provider error envelope reaches Core symmetrically to Codex**: `ClaudeProviderAdapter` now bridges `session.eventEmitter.on("error", ...)` into the standard provider error envelope, so active stream failures continue to surface to Core without depending on listeners that are about to be removed.

### Added
- **Live Claude `Thinking` streaming**: reasoning is now surfaced incrementally as Claude streams `thinking_delta` fragments. A new per-session `ClaudeThinkingLiveBuffer` accumulates raw fragments and emits readable segments at sentence/paragraph boundaries (default flush threshold ~240 chars), wrapped in a dedicated `ClaudeThinkingStreamHandler` micro-class. The dialog no longer goes silent during long Claude reasoning.
- **Live thinking dedupe vs final block**: the final assembled `thinking` block from Claude is now reconciled against what was already materialized live. If the final block is a superset, only the unseen tail is emitted; if it diverges, the canonical block wins and is emitted in full; if no live path ran, the legacy "emit full block" behavior is preserved.

### Documentation
- **System SSOT now documents two new invariants**: invariant 24 (provider `Stop` is shutdown-safe) and invariant 25 (provider live thinking is incremental and dedup-safe) so future provider work cannot regress the behavior silently.
- **Claude module SSOT and Shared Runtime Translation module SSOT** updated to reflect the new live-thinking ingestion path, finalization dedupe contract, and the per-bubble overlay translation requirement (multiple stable `messageId`s per turn).

## [1.1.996] - 2026-04-16
### Fixed
- **Project Manager `Stop` now reaches the correct session transport**: the shared input-panel stop action now delegates to the Project Manager transport when that frontend is active, instead of sending through the regular chat webview bridge that is not initialized inside the standalone workflow shell.
- **Hung continuity rollovers can now be interrupted from the input bar**: when Project Manager is stuck on `Agent is resuming your session`, the `Stop` button can again send a real `session:stop` request for the active session and release the UI from a transport-level dead button.
- **Regression coverage locks the Project Manager stop delegation path**: a dedicated core-bridge test now asserts that `stopSession()` forwards to the Project Manager hook when the shared session UI runs outside the regular webview bootstrap.

## [1.1.995] - 2026-04-16
### Fixed
- **Description no longer reuses stale workflow snapshots during workspace switch**: the Project Manager main area now ignores workflow-store payloads whose `workspaceSlug` and `workspacePath` do not match the current active workspace, preventing the previous workspace from reselecting its `Final_Description.md` during the switch window.
- **Workspace switch restores the correct pre-submit Description surface**: when the newly selected workspace has no `Final_Description.md`, Project Manager now keeps the questionnaire/editor path instead of showing the false `Description artifact is not available yet` placeholder on the right panel.
- **Regression coverage locks the current-workspace guard**: the main-area workflow-state test now asserts that Description artifact derivation stays gated by the active workspace identity, reducing the chance of cross-workspace regressions returning silently.

## [1.1.994] - 2026-04-16
### Fixed
- **Translation engine availability now follows real provider status**: the Settings localization engine selector keeps `Google GTX Free` available by default, but disables `OpenAI Codex` and `Anthropic Claude` engines when their backing provider stack is unavailable in live `core:state`.
- **Unavailable provider-owned engines now explain themselves instead of looking ready**: disabled translation options surface the provider recovery/status message so users see that CLI access or provider runtime readiness must be restored before those engines can be selected.
- **The UI no longer implies a non-existent subscription check**: CodeAI Hub still does not have a first-class entitlement signal for OpenAI or Anthropic, so the selector now gates by actual provider availability/auth state rather than pretending model access was explicitly verified.

## [1.1.993] - 2026-04-16
### Fixed
- **Google GTX strict sync now survives large localization bundles**: the shared Google translation client no longer forces long marker-preserving runtime bundles through a `GET ...&q=...` URL; large payloads now use `POST application/x-www-form-urlencoded`, preventing full-bundle fallback on categories such as `system_feedback`.
- **Whole-bundle localization batching remains unchanged for Google-backed runtime sync**: `LocalizationMaterializer` still uses one structured no-chunk batch per runtime bundle, but the transport layer now chooses a payload-safe request method instead of failing closed before translation begins.
- **Regression coverage locks the transport split**: the translation package now tests both short `GET` requests and large `POST` requests for `google-gtx`, protecting the runtime save path from reintroducing the `83 fallback translations` error.

## [1.1.992] - 2026-04-16
### Fixed
- **Haiku startup bundle translation now masks `Ultrathink` trigger literals before dispatch**: the Claude Haiku translation-only runtime replaces prompt-triggering literals such as `Ultrathink` with internal placeholders before sending localization/help text to the provider and restores them after translation, preventing provider-native `ultrathink_effort` from reappearing on the first large startup bundle.
- **Runtime localization bootstrap is no longer strictly one bundle at a time**: `LocalizationFacade` now resolves the runtime-priority bundle set with bounded concurrency `2`, shortening cold-start and strict save-sync latency on slower engines while preserving the existing strict-ready semantics.
- **Thinking translation no longer bottlenecks on a single global worker**: the session translation dispatcher now runs `2` concurrent jobs, reducing queue-driven delay when Codex/Claude/Gemini emit several visible thinking bubbles in quick succession.

## [1.1.991] - 2026-04-16
### Fixed
- **Haiku translation-only runtime now hard-disables thinking at the SDK level**: the provider-owned Claude translation path still sends `thinking: { type: "disabled" }`, but now also passes `settings.alwaysThinkingEnabled = false`, so literal help text such as `Ultrathink` can no longer reactivate hidden Claude reasoning during interface/help bundle materialization.
- **Regression coverage now locks the transport profile**: the Haiku translation service test asserts the SDK `alwaysThinkingEnabled: false` flag together with the existing translate-only prompt and disabled-thinking query profile.
- **Claude SSOT now records the no-thinking translation contract**: the module documentation explicitly states that translation-only Haiku requests must keep prompt-triggered reasoning heuristics disabled even when the source text contains thinking-related literals.

## [1.1.990] - 2026-04-16
### Fixed
- **Haiku translation prompts are now explicit and marker-safe**: the provider-owned Claude Haiku runtime no longer sends raw source text as a bare user request; it wraps every translation in a translate-only prompt, repeats the `__CODEAI_HUB_LOCALIZATION_ENTRY__` preservation rule for `localization_bundle`, and keeps helper/help/interface materialization aligned with the existing one-bundle no-chunk path.
- **Dedicated Haiku translation runtime JSONL are restored under the intended project slug**: translation turns keep `persistSession: true`, but the query runtime now executes from the dedicated `translation-runtime-haiku` project directory while auth/bootstrap still reuse provider-home, so native Claude traces are written into a stable translation-only bucket again.
- **Live reasoning translation no longer duplicates identical Haiku jobs**: Core reuses one in-flight translation per `engineId + targetLanguage + sourceHash`, preventing live reasoning plus rollout replay from enqueueing the same visible thinking block twice behind the single-worker session-translation dispatcher.

## [1.1.989] - 2026-04-15
### Fixed
- **Haiku save-path false mismatch removed**: extension-side strict localization sync now normalizes to the same canonical five-category runtime snapshot that Core returns from `/api/v1/localization/bootstrap`, so selecting `Anthropic Claude · Haiku 4.5` no longer fails with `Core localization bootstrap does not match the current settings snapshot`.
- **Regression coverage for canonical bootstrap matching**: added unit coverage for the exact Haiku bootstrap snapshot shape that Core emits, preventing future reintroduction of the five-category vs nine-key mirrored comparison bug.

## [1.1.988] - 2026-04-15
### Fixed
- **Settings and Project Manager startup unblocked**: both UI clients now stop waiting for `/api/v1/localization/bootstrap` before the first React render, removing the blank shell / long apparent hang when Haiku helper/help bundles are still catching up.
- **Settings now reflects `settings.json` immediately**: load paths broadcast the persisted settings snapshot first and deliver localization runtime in a second pass, so the Settings panel no longer sits on default values while localization resolves.
- **Localization bootstrap is cache-first**: Core now returns the persisted bootstrap snapshot when it matches the active settings and no longer triggers a strict helper/help bundle rematerialization on every bootstrap GET.

## [1.1.987] - 2026-04-15
### Fixed
- **Haiku reasoning translation no longer falls back silently to Google GTX**: the provider-owned Claude Haiku service is now injected into the live Core session-translation runtime, and explicit `anthropic-claude-haiku-4-5` requests fail closed with diagnostics instead of quietly resolving to the default engine.
- **Core-only Haiku localization path now stays authoritative**: `/api/v1/localization/bootstrap` rebuilds a strict snapshot from current settings for `anthropic-claude-haiku-4-5`, extension-host save/bootstrap flows must consume that Core-produced snapshot, and helper/help/message bundles no longer degrade to locally materialized English fallback content under `ru`.
- **Provider-native Haiku diagnostics and traces restored**: Claude Haiku translation queries now persist native provider JSONL under the dedicated `translation-runtime-haiku` slug, and session-translation logs record requested/resolved engine metadata so runtime mismatches are visible without indirect log reading.

## [1.1.986] - 2026-04-15
### Added
- **Anthropic Claude Haiku 4.5 translation engine**: new engine `anthropic-claude-haiku-4-5` is exposed in Localization settings as `Anthropic Claude · Haiku 4.5`. UI bundle materialization and Core-owned live reasoning overlays can now dispatch through Claude Haiku reusing the existing Anthropic subscription and provider-home auth bootstrap.
- **Provider-owned translation service**: `ClaudeHaikuTranslationService` (+ category-aware `buildClaudeHaikuTranslatorInstruction`) lives next to the Claude provider and runs a dedicated translation-only query profile (`tools: []`, `maxTurns: 1`, `persistSession: false`, `thinking: { type: "disabled" }`, `model: "claude-haiku-4-5-20251001"`, project slug `translation-runtime-haiku`). Translation turns do not create native Claude session JSONL.
- **Core-backed translation and localization factories**: `createCoreTranslationFacade(...)` composes built-in engines with the Haiku wrapper, `createCoreLocalizationFacade(...)` threads that facade into the localization pipeline, `SessionTranslationFacade` now delegates facade construction through this factory, and the shared translation package exports a reusable `createDefaultTranslationEngines(...)`.

### Changed
- **Extension-host skips local Haiku materialization**: `LocalizationRuntimeService.synchronizeRuntimePayload` falls back to `resolveRuntimePayload` when the active engineId is Core-only, so extension-host does not attempt to run Claude translation locally and keeps reading the persisted bootstrap snapshot from disk.
- **Translation engine profile registry**: adds a chunk policy entry for `anthropic-claude-haiku-4-5` (`soft 400 / hard 600`, `mode: "auto"`) as a registry placeholder; live localization/reasoning paths continue to dispatch without chunking.
- **Localization facade injection path**: `LocalizationFacade` now accepts an optional `translationFacade` via `LocalizationTranslationFacadeContract`, and `LocalizationMaterializer` consumes that contract instead of a concrete `TranslationFacade` class.

## [1.1.985] - 2026-04-15
### Changed
- **Incremental settings save sync**: Settings save path classifies every save through `LocalizationSettingsImpactClassifier` and `LocalizationSelectiveSyncPlanner`; provider-only, response-mode, and continuity saves skip the localization overlay, while engine/category saves rebuild only the planned runtime bundle set.
- **Messages for the User owns visible Thinking / Reasoning**: user-facing localization boundary, Localization module SSOT, and Settings helper copy explicitly classify visible provider Thinking / Reasoning under `Messages for the User`.

### Fixed
- **Hidden thinking never enters translation**: `SessionTranslationPolicyResolver` resolves per-provider visibility from the active settings snapshot, and `SessionTranslationFacade` short-circuits thinking/reasoning translation when the owning provider's display toggle is off.
- **Forward-only thinking visibility**: persisted `SessionMessage` records now carry an immutable `visibilityAtEmission` decision; shared Session transcript filters honor it over the current settings flag, so re-enabling `Thinking in dialog` / `Reasoning in dialog` inside a long-running session no longer reveals previously hidden reasoning.

## [1.1.984] - 2026-04-14
### Fixed
- **Reasoning defaults to one-block translation**: shared translation request normalization now resolves `category = reasoning` to `chunkingMode = "disabled"` unless a caller explicitly opts back into chunking.
- **Live thinking overlays stop paying sequential chunk latency**: Codex, Gemini, and Claude reasoning messages now translate as one provider-emitted block instead of `2-5` sequential subrequests through the shared chunk planner.
- **Chunk planner preserved for non-reasoning content**: `generic` and `document` translation keep the existing engine-aware chunk policy, so long-form bundle/document translation does not lose its current fallback protections.

## [1.1.983] - 2026-04-14
### Fixed
- **Canonical bootstrap path for live thinking translation**: `SessionTranslationPolicyResolver` now reads the persisted browser localization bootstrap from `~/.codeai-hub/localization/cache/browser-runtime-bootstrap.json` instead of constructing a double-prefixed `~/.codeai-hub/.codeai-hub/...` path.
- **Codex reasoning overlays no longer stall behind a false pending gate**: when the persisted bootstrap already matches the active localization settings, Core now enables the live translation policy and allows `thinking` fragments to reach async translation dispatch instead of skipping them forever as `localization_sync_pending`.
- **Regression coverage for release runtime layout**: added a production-like settings/bootstrap path test so future changes cannot silently break the `~/.codeai-hub/settings/` -> `~/.codeai-hub/localization/cache/` bootstrap contract again.

## [1.1.982] - 2026-04-14
### Fixed
- **Bundle-level interface localization batching**: localization save-sync now translates each selected interface bundle as one structured marker-preserving request instead of dispatching Codex per entry, eliminating the multiplicative slowdown that kept the localization spinner active for minutes.
- **Warm Codex translation bootstrap reuse**: temp translation-only Codex runtimes now reuse cached plugin/bootstrap artifacts from the resolved Codex home, removing repeated plugin bootstrap overhead during interface localization.
- **Project Manager blank screen after localization blocking**: PM main-area busy placeholders now keep hook order invariant across `busy -> ready`, so the UI recovers cleanly after strict localization sync instead of rendering an empty shell.

## [1.1.981] - 2026-04-14
### Fixed
- **Bundle-level interface localization batching**: localization save-sync now translates each selected interface bundle as one structured marker-preserving request instead of dispatching Codex per entry, eliminating the multiplicative slowdown that kept the localization spinner active for minutes.
- **Warm Codex translation bootstrap reuse**: temp translation-only Codex runtimes now reuse cached plugin/bootstrap artifacts from the resolved Codex home, removing repeated plugin bootstrap overhead during interface localization.
- **Project Manager blank screen after localization blocking**: PM main-area busy placeholders now keep hook order invariant across `busy -> ready`, so the UI recovers cleanly after strict localization sync instead of rendering an empty shell.

## [1.1.980] - 2026-04-14
### Fixed
- **Blocking localization readiness on save**: localization `Save Changes` now waits for Core to rematerialize and activate the required runtime bundles in deterministic priority order before Project Manager resumes interactive work.
- **Whole-request interface localization**: Settings/Help/User-message bundle materialization no longer uses chunk fan-out; it now relies on dynamic watchdog timeouts plus automatic retries and rejects fallback / `partial_fallback` results for required categories.
- **Serialized live translation dispatch**: live session translation now resolves current localization settings on each dispatch, stays disabled until the persisted bootstrap matches those settings, and runs through a shared single-worker queue to prevent restart races and overloaded translation bursts.
- **Hydration drift in UI/runtime model state**: the localization engine selector now preserves unknown persisted engine ids instead of coercing to `Google GTX Free`, and early runtime model updates are buffered until the session snapshot exists so the visible model label matches the real session.

## [1.1.979] - 2026-04-14
### Added
- **Universal chunk planner in shared translation**: long translation requests now split at safe paragraph/list/sentence/clause boundaries, respect protected Markdown/code/link/placeholder spans, and run through engine-specific conservative chunk budgets before dispatch.
- **Chunked translation regression tests**: added dedicated coverage for protected-boundary resolution, multi-chunk round-trip planning, and partial-fallback assembly in `@codeai-hub/translation`.

### Changed
- **Core translation diagnostics now trace chunk execution**: session translation logs include chunk plan metadata, per-chunk dispatch/completion with elapsed time, and final assembly summary under the existing `sessionId` / `messageId` / `sourceHash` correlation path.
- **Localization materialization now uses the shared chunk contract explicitly**: long localized help/settings strings opt into shared `chunkingMode = "auto"` and materialization results now expose counts for whole-string fallback versus `partial_fallback` across unique translation operations.

## [1.1.978] - 2026-04-13
### Added
- **Core-side thinking translation trace logging**: every user-visible thinking message now writes a correlation trail to `~/.codeai-hub/logs/core/core.log`, covering message persistence, translation dispatch start, translation completion/fallback, overlay append, and session/dialog translation patch broadcast.

### Changed
- **Diagnostic release for mixed-language Codex thinking**: this build is meant to capture why only part of a multi-fragment Codex reasoning burst receives localized overlay patches. It does not yet change UI aggregation or translation-engine policy.

### Not fixed yet
- **Partial thinking localization remains under investigation**: native rollout segmentation and unified-session persistence are already confirmed correct; the open issue is why some reasoning `messageId`s complete the overlay path while others end in `fallback / empty_translation`.

## [1.1.977] - 2026-04-13
### Fixed
- **PM artifact-language restart regression**: workflow prompt-pack assembly now falls back to the persisted browser localization bootstrap snapshot when live settings have not reloaded yet, so `Artifacts for the User` no longer silently degrades from `ru` to `en` after Project Manager reconnect/cold-start.
- **Codex translation runtime bootstrap**: isolated translation-only Codex runs now resolve auth/cache artifacts from provider home first and fall back to legacy `~/.codex` data when the provider-owned home is not present yet.
- **Thinking overlay chunk identity**: Codex reasoning delta messages now emit deterministic per-chunk ids instead of reusing one provider item id, preventing later translation overlays from overwriting earlier thinking fragments in live/replay/history paths.

## [1.1.976] - 2026-04-13
### Fixed
- **Codex rollout thinking translation**: rollout-backed Codex thinking now follows the same source-first plus Core overlay path as the rest of the thinking pipeline, instead of triggering a second provider-local translation attempt inside the active Codex turn.
- **Missing final reply under `outputSchema`**: plain-text rollout `final_answer` messages now fall back to raw assistant output when structured parsing does not produce `assistantText`, so workflow turns no longer end with thinking only and no visible final answer.

### Changed
- **Codex rollout cleanup**: the obsolete provider-local Codex thought-translation adapter was removed after rollout thinking translation ownership moved entirely into the Core overlay path.

## [1.1.975] - 2026-04-13
### Added
- **Selectable translation engines**: `Settings -> Localization -> Translation engine` now offers `Google GTX Free`, `OpenAI Codex · GPT-5.4 Mini`, and `OpenAI Codex · GPT-5.3 Codex Spark`.

### Changed
- **Shared engine propagation**: the selected `translationEngineId` now travels from persisted localization settings through Core applied turn config into Codex, Claude, and Gemini live translation paths.
- **Catalog-backed selector stability**: the settings UI keeps all supported translation-engine options visible even before localization runtime bootstrap finishes loading.

## [1.1.974] - 2026-04-13
### Changed
- **Release rebuild only**: this package is a clean rebuild of the already shipped `1.1.973` baseline with a fresh release number for distribution and validation.

### Not changed
- **No new product logic in this rebuild**: the source-first thinking overlay pipeline, persisted localized history projection, and Claude translation packaging fix remain exactly as shipped in `1.1.973`.

## [1.1.973] - 2026-04-13
### Changed
- **Source-first thinking delivery**: Gemini, Codex, and Claude now emit visible thinking into session history immediately in the provider's native language, while translation runs asynchronously in Core instead of blocking the first render path.
- **Localized history projection**: Core persists translated thinking overlays per session and reapplies them on runtime/dialog history load through `localizedContent`, so previously translated thoughts reopen already localized without rewriting the canonical transcript.

### Fixed
- **Mixed-language thinking race**: the first reasoning chunks no longer fall back permanently to English just because the live translation request times out or returns late; the UI can now patch the already-rendered message when the translation arrives.
- **Claude packaging gap**: release packaging now vendors and validates `@codeai-hub/translation` inside the installed Claude provider bundle, preventing runtime failures in the remaining provider-local pre-tool translation path.

## [1.1.972] - 2026-04-13
### Added
- **Inline provider override on trunk confirmation cards**: idle `Virtual Simulation` and `Diagram Modules` stages now show a visible provider selector in the confirmation card. The previous-step provider is preselected and marked inline, but the user can switch to any connected provider before launching the next step.

### Fixed
- **Chosen-provider bootstrap identity**: Project Manager now seeds dialog/bootstrap snapshots from the explicit step-start provider intent when opening a new trunk-step session, so the lower status/model panel starts on the correct provider context even before the final runtime model update arrives.
- **Provider-correct restore request path**: runtime restore/bootstrap no longer re-reads a stale provider identity from dialog-list payloads when the explicit step-start provider should remain authoritative.
- **Limits follow the selected provider**: after the new step session becomes `ready`, `Session ID + Usage Limits` refreshes against the selected provider/runtime identity and shows the correct provider-family limits instead of lingering on the previous step provider.

## [1.1.971] - 2026-04-13
### Fixed
- **PM/Core `sessionKind` mismatch removed from restore adoption**: Project Manager no longer requires `sessionKind` equality when adopting the real runtime session after dialog auto-restore, because Core `session:created` does not preserve that PM-only field.
- **First auto-opened step can now leave placeholder state**: the restored dialog session is adopted on the first workspace open, so the active snapshot can reach the existing ready-time usage-limits refresh path without a manual stage switch.
- **Smaller restore contract**: the dialog restore path now keys only on actual continuity identity (`workspace`, `stage`, `run`, `provider`, `providerSessionId`) instead of accumulating extra PM-only conditions.

## [1.1.970] - 2026-04-13
### Fixed
- **Auto-select dialog restore race**: Project Manager no longer sends manual usage-limits refresh while the dialog restore path still points at a placeholder bootstrap session without a materialized runtime session.
- **Runtime-session adoption after restore**: when Core creates the real runtime session for a restored dialog continuity entry, PM now swaps the placeholder snapshot to that runtime session and keeps the existing dialog history attached.
- **Ready-only refresh effect**: `Session ID + Usage Limits` now waits for `binding.status === ready`, so the manual refresh request is emitted only after runtime restore/rebind has completed.

## [1.1.969] - 2026-04-13
### Changed
- **Project Manager diagnostics now persist to Core logs**: standalone PM forwards usage-limits investigation events into Core over the websocket bridge, so restore/bootstrap diagnostics land in `~/.codeai-hub/logs/core/core.log` instead of depending on browser console access.
- **Usage-limits refresh decision logging**: Core records whether the manual refresh path found the runtime session, resolved a bound `providerSessionId`, and actually dispatched the request to the provider adapter.
- **Investigation-only release**: this package is intended to capture the auto-select refresh race after workspace open; it does not yet claim a user-visible fix for that regression.

## [1.1.968] - 2026-04-12
### Fixed
- **Dialog-session refresh wiring**: Project Manager dialog-mode session screens now pass `onRefreshUsageLimits` into `SessionView`, restoring live usage-limits refresh on active workflow stage dialogs.
- **Limits visible again across providers**: Codex, Claude, and Gemini usage limits render again in Project Manager because the manual refresh request is now sent from both runtime-session and dialog-session surfaces.
- **No backend contract rollback**: the release keeps the existing provider-global, live-only usage-limits contract from `1.1.967`; this patch only restores the missing UI trigger path.

## [1.1.967] - 2026-04-12
### Fixed
- **Provider-global usage limits**: the same provider now shares one canonical usage-limits scope across workflow sessions instead of keeping separate limits per provider session id.
- **Persistent cache removal**: `Session ID + Usage Limits` no longer falls back to browser-stored usage-limit snapshots, so the panel reflects only fresh live snapshot data.
- **Legacy scope normalization**: restored sessions with old session-specific `providerScopeKey` values are normalized into the provider-global contract when usage limits propagate through Project Manager.

## [1.1.966] - 2026-04-12
### Fixed
- **Session-scoped usage limits refresh**: `Session ID + Usage Limits` now sends manual refresh requests with the real active session context (`sessionId`, `providerId`, `providerSessionId`) instead of a provider-wide synthetic scope.
- **Runtime-scoped refresh broadcast**: Core now routes manual usage-limits refresh results back into the concrete runtime `sessionId`, so the active Project Manager snapshot rerenders immediately through the normal `session:stream` path.
- **Bound provider session reads**: Claude, Codex, and Gemini manual refresh paths now read usage limits for the active bound provider session instead of the synthetic `proactive` bucket.
- **Regression coverage**: added dedicated Core coverage for the session-scoped refresh path and documented the factual `SessionIdUsageBar` contract.

## [1.1.965] - 2026-04-12
### Fixed
- **Codex rate limits**: replaced broken RPC reader (`codex app-server` fails on `prolite` plan type) with direct HTTP reader that calls `chatgpt.com/backend-api/wham/usage`. Session and weekly limits now display reliably.
- **Gemini rate limits**: expanded model whitelist to cover all current Gemini models (3.1 Pro, 3 Pro, 3 Flash, 3.1 Flash Lite, 2.5 Pro, 2.5 Flash). Unknown model IDs are now auto-formatted instead of silently dropped.
- **Proactive rate limits on session open**: all three providers (Codex, Claude, Gemini) now fetch usage limits immediately on session create/resume instead of waiting for the first completed turn.

## [1.1.965] - 2026-04-12
### Fixed
- **Confirmation card localization**: added all missing message IDs to approved source dictionaries (`ui_labels.json`, `ui_helper_text.json`, `messages_for_the_user.json`) so confirmation card texts are localizable. Fixed `confirm_warning` to use template variable `{upstreamStage}` instead of JS template literal.
- **Session auto-restore on workspace open**: auto-select retries session dispatch when chains are not yet available. WorkflowStateStore emits when chain count changes. Dialog list retry no longer overwrites already-loaded message history — the `dialog:list:result` handler now skips re-bootstrap if the dialog was already matched and loaded.
- **Right panel jitter during agent responses**: memoized `MainAreaArtifactContent` JSX via `useMemo` so Help/Artifacts panel does not re-render when session messages stream in. Wrapped `MainAreaArtifactContent` with `React.memo` for additional protection.

## [1.1.938] - 2026-04-11
### Added
- **Stage confirmation card**: clicking an idle trunk stage (Virtual Simulation, Diagram Modules) in the sidebar shows a confirmation card in the left panel. The card displays the upstream artifact name and availability status, a warning that Start confirms readiness, and a Start button that creates the agent session and sends the instruction pack automatically. When the upstream artifact is missing, the button is disabled and a blocked message is shown. Localized via `ui_interface` / `user_guidance` / `system_feedback` categories.

### Changed
- **Prop-based session intent**: `ProjectManagerSessionView` receives `initialDialogIntent` as a prop resolved from workflow state continuity chains, instead of relying on `pm:dialog:open` broadcast events for startup and navigation. Sessions load instantly on workspace open and stage switch regardless of React mount timing. The event listener remains for runtime-only scenarios (confirmation card Start, manual sidebar clicks). Scales to any number of sessions without timing workarounds.
- **Neutral empty state**: session panel shows "No active session" / "Select a workflow step in the sidebar" instead of Description-specific questionnaire instructions.
- **Dynamic startupStage**: session scope reflects the active stage immediately instead of hardcoded "description".

## [1.1.935–1.1.937] - 2026-04-11
- Intermediate releases (superseded by 1.1.938).

## [1.1.934] - 2026-04-11
### Changed
- **Type markers**: development tree branch nodes now display P/C/M letter markers (19×19px) instead of separate toggle triangles and type badges. Marker color follows three-state scheme: gray (idle), orange (in-progress), green (done). Expandable markers with children show a green outline with 2px offset.
- **Nested sidebar structure**: development tree renders as nested DOM with ProductPart wrapper (accent frame on expand), cluster wrapper with vertical/horizontal connector lines to child modules. Row click expands/collapses without separate chevron.
- **Accordion behavior**: only one ProductPart and one Cluster can be expanded at a time. Opening a new node collapses the previous one.

## [1.1.932] - 2026-04-10
### Changed
- **Module kind field removed**: the internal DSL classifier (`service`, `adapter`, `gateway`, etc.) is removed from the entire codebase — types, parsers, serializer, diff service, agent templates, and all tests. The field was never used for behavioral decisions.
- **Diagram card cleanup**: module cards no longer show the redundant cluster/standalone footer line. Visual hierarchy already communicates membership.
- **Accent-colored titles**: module, cluster, and product part names on the diagram now use the accent color for better readability.
- **Development tree module names**: the sidebar now displays humanized module IDs (e.g. "Extension Entry Shell") instead of DSL kind tokens ("service").

## [1.1.931] - 2026-04-10
### Added
- **Development Tree baseline**: after Diagram Modules completes, the sidebar projects a Product Part / Cluster / Module tree from generated artifacts. Skeleton parts appear as `todo`; materialized parts as `draft` with nested children.
- **Branch-node selection routing**: clicking a dev tree node dispatches `pm:branch:selected` and updates the panel header and artifact surface.

### Changed
- **Sidebar-only trunk navigation**: the top stage toolbar is removed; the workspace tree is the sole navigation surface.
- **Section separators and leaf stage nodes**: workspace root replaced by "Documentation Tree" / "Development Tree" separators. Trunk stages are flat leaf nodes; panel sync via `pm:stage:activated`.
- **Three-color stage indicators**: gray (idle), orange (in progress), green (artifact available). Stage color derived from artifact availability, not core completed event.
- **Auto-select last active stage**: on workspace open, the last non-idle stage is selected instead of always starting at Description.
- **Zoom badge in status bar**: diagram zoom indicator moved from scrollable canvas to the bottom status bar for consistent visibility.

### Not changed
- Branch session lifecycle (lazy start, provider inheritance, restore) is deferred to a follow-up release. Branch panels show a placeholder surface.

## [1.1.923] - 2026-04-09
### Changed
- **Projection naming cleanup (internal refactor)**: the Diagram Modules adapter layer no longer carries React Flow naming. `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.ts*` and `module-stage-react-flow.ts` are renamed to `domain-model-to-projection.ts*` and `module-stage-projection.ts`. Eight types move from `DiagramFlow*` / `ProductPartFlowNodeData` / `ClusterFlowNodeData` / `ModuleFlowNodeData` to their `Projection`-prefixed equivalents, and `domainModelToReactFlow()` becomes `domainModelToProjection()`. Sidecar-related names (`FlowSidecarDocument`, `parseFlowSidecar`, `buildFlowSidecarDocument`, `applyFlowSidecarPositions`, `applyFlowSidecarLayoutParams`, `FlowSidecarLayoutParams`, `FlowSidecarViewport`) are kept as-is because they reference the on-disk `module-map.flow.json` sidecar file, not React Flow.
- **Archive compression (docs hygiene)**: `doc/SolidWorks-WorkFlow/Plans/Archive/` (77 historical planning documents) and `doc/TODO/Archive/` (19 historical todo-plans) were compressed into `Archive.zip` files with accompanying `Archive.README.md` pointer notes. Grep-based dead-code / dead-links audits no longer hit ~62 stale inline references inside closed historical plans. Git history is preserved — `git log --all --follow` on any archived path still works.

### Not changed
- **No user-visible behavior changes**: Diagram Modules rendering, layout params context menu, sidecar v2 persistence, zoom, and every other product surface behave identically to `1.1.922`. This is an internal hygiene release built on top of the same behavior baseline.

## [1.1.922] - 2026-04-09
### Added
- **Sidecar v2 persists Diagram Modules layout params**: `module-map.flow.json` schema bumped to `version: 2` with a new `layoutParams` section storing per-ProductPart (`columns`, `targetAspectRatio`) and per-Cluster (`moduleColumns`) CSS Grid overrides. Right-click context-menu selections now survive diagram reload, PM restart, and cross-window sidecar sync.
- **Backwards-compat parser**: `parseFlowSidecar` accepts both `version: 1` and `version: 2` payloads. Invalid enum values in the `layoutParams` section are dropped per entry instead of failing the whole sidecar; workspace sidecar files from `1.1.921` keep loading without errors and fall back to defaults until the first context-menu edit upgrades them to v2.
- **Stable sidecar diffs**: `buildFlowSidecarDocument` writes `nodes`, `layoutParams.productParts`, and `layoutParams.clusters` in alphabetical order, so user-visible git diffs of `module-map.flow.json` stay minimal when a single entry changes.

### Changed
- **Diagram editor shell**: right-click layout param handlers (`columns`, `targetAspectRatio`, `moduleColumns`) now push the updated nodes through `onNodesChange`, which the persistence hook writes into the sidecar file. The projection-reset `useEffect` still prefers `initialNodes` as the first source so persisted overrides ride the next projection rebuild via `applyFlowSidecarLayoutParams`.
- **Downgrade behavior (documented caveat)**: if a workspace opens a v2 sidecar with `1.1.921` the older parser will reject it (it required `version === 1` exactly) and the diagram will render with defaults. This is graceful degradation, not corruption.

## [1.1.921] - 2026-04-08
### Changed
- **React Flow removed from Diagram Modules**: the `@xyflow/react` dependency is deleted. ProductPart cards now render in a single-column CSS Grid instead of a React Flow canvas. Native browser scroll replaces pan/zoom.
- **Context menu fixed**: right-click layout param selection (columns, aspect ratio) now applies correctly — React Flow's `pointer-events: none` was blocking clicks, and sidecar persistence was resetting changes.
- **Cmd/Ctrl+scroll zoom**: CSS transform-based zoom (25%–200%) with smooth 1%-per-tick sensitivity. Cmd/Ctrl+0 resets to 100%. Clickable zoom badge appears when zoomed.
- **Sidebar hint updated**: reflects new CSS Grid zoom controls instead of legacy React Flow pan/drag instructions.

## [1.1.917] - 2026-04-08
### Changed
- **`Diagram Modules` layout replaced with CSS Grid**: the entire self-written iterative settle-loop layout engine (~1350 lines, 7 files) has been deleted and replaced with browser-native CSS Grid layout inside ProductPart nodes. Clusters and Modules are now rendered as regular React components (not separate React Flow nodes), and all sizing is computed by the browser from actual text content — no more height estimation or multi-pass normalization.
- **Layout context menu (right-click)**: ProductPart nodes support `Columns` (Auto / 2–5) and `Aspect Ratio` (Landscape / Wide / Square) overrides; Cluster cards support `Module Columns` (Auto / 1–3) overrides. Changes apply instantly via CSS Grid re-render.
- **Edges between modules removed**: relation edges are no longer rendered on the diagram canvas.

## [1.1.916] - 2026-04-08
### Reverted
- **`Diagram Modules` measurement bridge now ships again with the pre-`1.1.915` baseline instead of the stabilized live measurement experiment**: the release removes the extra runtime hooks added in `1.1.915`, including `ResizeObserver`, post-font re-measure after `document.fonts.ready`, and window-resize measurement rescheduling.
- **Release `1.1.916` is a rollback rebuild on top of the stable `1.1.914` baseline**: this package is intended to remove the hangs/trim/manual-layout regression path introduced in `1.1.915` while the remaining autolayout defect is investigated separately.

## [1.1.915] - 2026-04-08
### Fixed
- **`Diagram Modules` first-open autolayout now waits for stabilized live measurement instead of trusting the first DOM snapshot**: the measurement bridge re-emits geometry after the next animation frame, after late `document.fonts.ready`, and after real node/header resize events, so ownership containers can resize from the final card heights rather than from an early under-measured pass.
- **Bridge dedupe now includes runtime owner style bounds as part of the measurement signature**: `Cluster` and `Product Part` reflow passes are no longer dropped just because the initial measurement arrived before the owner boxes completed their first resize cycle.

## [1.1.914] - 2026-04-08
### Fixed
- **`Diagram Modules` now reserves the real lower shadow tail of module cards before ownership containers resize**: shared visual bounds no longer stop at the DOM measured border-box height, so lower `Cluster` / `Product Part` borders follow the visible card bottom instead of visually cutting through the last module.
- **The tightened module visual-bottom allowance is now shared across first-open autolayout and manual normalization**: both layout paths compute deepest direct child bottoms from the same shadow-aware helper, removing the last split where lower-boundary safety could still depend on path-specific geometry assumptions.

## [1.1.913] - 2026-04-08
### Changed
- **Release `1.1.913` rebuilds the already shipped `1.1.912` baseline without new product-logic changes**: the package was reissued under a fresh version so clients that did not refresh the previous Project Manager delivery can consume a new release identity.
- **Standalone Project Manager and VSIX artifacts were rebuilt end-to-end**: the standard release pipeline was rerun to publish a fresh `project-manager` tarball and a new extension package on top of the current `main` snapshot.

## [1.1.912] - 2026-04-08
### Fixed
- **`Diagram Modules` now measures ownership header boundaries in zoom-safe flow coordinates before initial autolayout runs**: the React Flow bridge converts rendered header height back through the current viewport zoom before emitting `bodyStartY`, eliminating the regression where first-open module cards could start inside `Product Part` or `Cluster` header text on fit-scaled diagrams.
- **First-open `Diagram Modules` packing now uses horizontal-overlap conflict rules instead of exact seed-column identity**: wide `Cluster` boxes and standalone `Module` cards inside one `Product Part` are repacked whenever their actual horizontal bounds intersect, so different `x` seeds no longer let ownership bottoms overlap visually.
- **The released first-open layout contract now combines top-boundary and bottom-boundary safety explicitly**: top clearance comes from zoom-correct measured header starts, while bottom clearance comes from overlap-aware sibling packing plus deepest-direct-child container resize; persisted sidecar layouts keep the conservative preserve path for manual compositions.

## [1.1.911] - 2026-04-08
### Fixed
- **First-open `Diagram Modules` autolayout now rebuilds ownership from measured hierarchy instead of repairing heuristic carry-over**: when no `module-map.flow.json` is applied, the measured path repacks `Module` cards inside `Cluster`, then repacks finalized `Cluster` boxes and standalone modules inside `Product Part`, and repeats until the ownership geometry reaches a stable fixed point.
- **The diagram shell now distinguishes seed autolayout from persisted sidecar composition explicitly**: projections carry a `layoutSource` flag, so the measured pipeline can apply the stronger packer only for initial layout and avoid repacking saved manual layouts from scratch.
- **Persisted `module-map.flow.json` layouts keep the manual composition from `1.1.910` while still resizing ownership safely**: the conservative preserve-and-normalize branch remains active for sidecar-backed diagrams, so the user no longer trades away manual placement stability to get a safe first-open autolayout.

## [1.1.910] - 2026-04-08
### Fixed
- **`Diagram Modules` now shares one visual-bounds engine between first-open autolayout and manual drag**: the measured post-render path and the shell drag-resize path both derive `Cluster` / `Product Part` heights from the deepest direct child visual bottom, eliminating the split contract where manual moves could still leave lower-boundary overlaps.
- **Lower ownership borders now respect visible module chrome instead of only React Flow border-box height**: module cards reserve explicit visual-bottom allowance for their outer shadow, so dense cards no longer appear to run into cluster or product-part bottoms when the underlying border box was technically still inside the container.
- **`module-map.flow.json` now rejects stale geometry from the pre-unified boundary contract**: the layout metric version advances again, preventing older sidecars from restoring positions calculated before the shared visual-bounds engine existed.

## [1.1.909] - 2026-04-08
### Fixed
- **`Diagram Modules` now rebuilds ownership layout from measured children instead of patching guessed container heights**: after React Flow measures the actual cards, the runtime derives `Cluster` and `Product Part` geometry bottom-up from finalized module boxes and measured ownership header boundaries.
- **`Cluster` and `Product Part` lower boundaries now follow finalized measured columns**: ownership containers no longer trust stale seed heights when dense content expands a child card, so the visible lower border grows from the deepest finalized child bottom plus padding.
- **`module-map.flow.json` now rejects stale `1.1.908` ownership geometry**: the layout metric version was bumped again for the measured-first reflow contract, so pre-fix repair-pass sidecars no longer override the released ownership layout pipeline.

## [1.1.908] - 2026-04-08
### Fixed
- **`Diagram Modules` now normalizes first-open layout against measured React Flow node sizes**: after the browser renders the actual ownership cards, the shell repacks later siblings downward and expands `Cluster` / `Product Part` containers so dense localized content no longer overlaps siblings or container bottoms.
- **The released diagram surface now enforces a hard `4px` minimum safe gap on actual ownership boxes**: `Product Part`, `Cluster`, and `Module` cards keep a real post-render separation contract instead of relying only on projection-time height guesses.
- **`module-map.flow.json` now rejects stale pre-measured geometry again**: the layout sidecar compatibility fingerprint was bumped for the measured-layout contract, so old saved positions no longer override the repaired runtime normalization path.

## [1.1.907] - 2026-04-08
### Fixed
- **`Diagram Modules` localized first-open layout now keeps dense cards inside their boundaries**: the initial React Flow projection uses a more conservative height budget for `Product Part`, `Cluster`, and `Module` cards, preventing the dense `Project Manager Workflow Ui`-style scenarios from crossing sibling cards or container bottoms on Russian long-copy baselines.
- **`module-map.flow.json` now rejects stale geometry after layout-metric changes**: the layout sidecar includes a `layoutMetricVersion` compatibility guard, so positions saved under the previous height model no longer override the repaired computed layout.
- **Release verification now includes localized dense diagram regressions explicitly**: targeted PM diagram tests now cover dense cluster and standalone boundary safety alongside the sidecar compatibility path before the release build.

## [1.1.906] - 2026-04-07
### Removed
- **`Foundation Envelope` is removed from the active workflow**: the supported trunk now stops at `Diagram Modules`, and branch design starts directly from `Product Part Specification` without a separate FE stage.

### Changed
- **Core, PM, startup restore, continuity, and prompt routing now follow the reduced trunk end-to-end**: `foundation_envelope` no longer participates in workflow state, gating, artifact routing, diagram loading, localization, repair flows, or regression coverage.
- **The former FE release wave is preserved as history only**: archived plans, TODOs, and session reports are explicitly marked retired so future scopes do not treat `Foundation Envelope` as active navigation or a dormant supported contract.

## [1.1.905] - 2026-04-07
### Added
- **`Foundation Envelope` now renders as a React Flow diagram in the Project Manager `Artifacts` surface**: once the canonical `foundation-envelope.md` exists, the user sees the stage as a diagram-first review surface instead of a raw markdown-only panel.

### Changed
- **`foundation-envelope.flow.json` is now the runtime-owned layout sidecar for the stage**: semantic ownership remains in `foundation-envelope.md`, while node positions and view-state persistence are stored separately and routed through the shared workflow artifact endpoints.
- **The shared PM diagram pipeline now covers `Foundation Envelope` end-to-end**: the stage reuses the common diagram loader, persistence path, repair scaffold, help localization contract, workflow-tree parity checks, and webview typecheck expectations instead of maintaining a markdown-only branch.

## [1.1.904] - 2026-04-07
### Fixed
- **Standalone PM dialog file links now decode launcher query paths as real filesystem paths**: the launcher no longer forwards `%2FUsers%2F...` into Visual Studio Code after the PM bridge has already handed off the file target.
- **The remaining `Path does not exist` regression from `1.1.903` is narrowed to the correct boundary and repaired there**: the `path` query parameter now uses filesystem-oriented URI unescape rules before the final `vscode://file/...` URI is assembled.

### Deferred
- **Broader method/knowledge documentation for the multi-step standalone file-link debugging sequence remains deferred until the user confirms this release works**.

## [1.1.903] - 2026-04-07
### Fixed
- **Standalone PM dialog file links now decode percent-encoded absolute paths before the open pipeline continues**: agent-provided paths such as `...%20...` are normalized back into real filesystem paths before PM routes them to VS Code.
- **Launcher-side `vscode://file/...` generation now preserves path separators**: the standalone fallback no longer re-encodes `/` or `:` into broken values like `/%2FUsers/...%2520...`, so Visual Studio Code no longer receives a non-existent path after the confirmation prompt.
- **The remaining standalone safeguard prompt is now explicitly treated as a platform-level behavior, not a PM regression**: the PM/UI/launcher docs now lock the contract that the prompt may still appear, but confirming it must open the real target file and location.

## [1.1.902] - 2026-04-07
### Fixed
- **Standalone PM dialog file links no longer open a second Chromium window with `ERR_UNKNOWN_URL_SCHEME`**: the dialog surface no longer tries to navigate CEF directly to `vscode://file/...` after the user clicks an agent-provided file reference.
- **Standalone file-link fallback now routes through the launcher host**: PM uses a dedicated `codeai://open-in-vscode?...` bridge in standalone mode, `OnBeforeBrowse` cancels in-window navigation, and the launcher opens the final `vscode://file/...` target through the operating system.
- **The launcher hotfix is now synchronized across PM/UI/launcher docs and targeted validation**: PM opener coverage, native launcher build verification, and SSOT docs now protect the corrected standalone fallback boundary.

## [1.1.901] - 2026-04-07
### Fixed
- **Project Manager dialog file links now open in the VS Code editor path instead of a generic text handler**: absolute local file links rendered inside agent dialog markdown are intercepted on the dialog surface and routed to the editor-aware open flow.
- **Dialog file targets now preserve explicit location metadata**: supported `:line:column` and `#LlineCcolumn` links now resolve correctly for both unix and windows absolute paths, so the editor route can reveal the intended file position.
- **The open contract is now covered across PM, webview, and docs**: PM opener tests, parser regressions, the VS Code handler contract guard, and the PM/UI/launcher docs now lock the dialog-only interception scope plus the `vscode://file/...` standalone fallback boundary.

## [1.1.900] - 2026-04-07
### Fixed
- **The left Project Manager tree now highlights the current workflow step explicitly**: stage selection from the toolbar, tree rows, startup route, and nested artifact/session clicks now converges on one visible selected-stage state in the sidebar.
- **Only the active workflow branch now stays expanded in the left sidebar**: the tree behaves as an `activeStage` accordion, so inactive workflow steps collapse instead of leaving stale artifact/session rows open after navigation.
- **The navigation contract and regression coverage now include the left sidebar explicitly**: PM SSOT/cluster docs plus the workflow navigation source-test now require the left tree highlight/accordion behavior to stay aligned with the shared `activeStage`.

## [1.1.899] - 2026-04-07
### Fixed
- **Workspace startup is temporarily pinned to `Description` across Core and Project Manager**: workspace open, switch, reconnect, and cold-start restore now force `Description` as the startup stage instead of deriving it from continuity recency or late-step artifact timestamps.
- **Startup restore no longer leaks later-stage sessions into the left panel**: automatic runtime fallback is now Description-scoped, so `Virtual Simulation`, `Diagram Modules`, and `Foundation Envelope` sessions no longer appear on startup unless the user explicitly navigates there.
- **The released docs and PM regression tests now protect the temporary contract**: Project Manager SSOT/cluster docs plus startup routing source-tests now explicitly lock `workspace open => Description`, `Final_Description.md`/`questionnaire.md` startup selection, and the removal of the old `lastActive` startup selector.

## [1.1.898] - 2026-04-06
### Fixed
- **Workflow startup truth is now canonical across the released trunk chain**: Core now repairs `lastActive` from the combined workflow-state, continuity, and semantic artifact evidence, so late trunk steps no longer depend on ad hoc per-stage heuristics after restart.
- **Stale workspace metadata now self-heals instead of freezing startup on an older step**: workspace activation and semantic artifact writes persist repaired `lastActive` snapshots back into canonical state, which prevents `Description`-era pointers from surviving after the workspace has already advanced to `Diagram Modules` or `Foundation Envelope`.
- **Project Manager startup routing now uses one stage resolver end-to-end**: workspace-open auto-select, toolbar navigation, tree clicks, artifact selection, and dialog/session restore all route through the same stage-to-artifact/session mapping driven by `workflow-state.lastActive`.
- **Formal symmetry regression coverage now protects the retrofit**: dedicated core and PM tests now lock canonical `lastActive`, stale-state self-heal, late-step cold-start hydration, shared startup routing, and the existing history-backed continuity baseline before release packaging.

## [1.1.897] - 2026-04-06
### Fixed
- **Project Manager startup restore now follows workflow-scoped truth instead of browser-local dialog cache**: workspace reopen no longer revives a stale `foundation_envelope` dialog intent from `localStorage`, so Toolbar, workflow tree, artifact panel, and session panel recover from the same `workflow-state` + `continuity` route.
- **`Diagram Modules` no longer falls back to a false `todo` state after restart**: cold-start workflow-state hydration now derives `diagram_modules` status from the canonical staged progress snapshot, restoring `in_progress` or `completed` when the semantic artifacts already prove readiness.
- **Workflow new-step guardrails now explicitly ban split startup restore paths**: the system SSOT now requires one startup source of truth, shared stage normalization, canonical cold-start readiness hydration, and history-backed continuity recovery for every new workflow step.

## [1.1.896] - 2026-04-06
### Fixed
- **`Foundation Envelope` dialog history now survives cold-start restore correctly**: continuity root resolution no longer normalizes the official `foundation_envelope` stage to `unknown`, so restart/resume reuses the existing history-backed dialog instead of creating a fresh empty dialog id.
- **Duplicate continuity entries no longer steal PM dialog restore**: when stale duplicate `Foundation Envelope` roots exist for the same provider session, dialog restore now prefers the entry that actually has persisted JSONL history instead of the newer but empty duplicate.
- **New-step rollout guardrails now explicitly forbid local stage-normalizer drift**: the workflow SSOT now requires all continuity/root/handoff/cold-start restore paths to share one canonical stage normalization contract and to test duplicate-root recovery explicitly.

## [1.1.895] - 2026-04-05
### Changed
- **The workflow step is now canonically named `Foundation Envelope` end-to-end**: the old three-word naming is removed from runtime code, PM UI, templates, contracts, tests, and architectural docs so the trunk step now matches the two-word naming pattern used by the rest of the workflow.
- **The stage id, artifact path, and prompt/template routes now follow the shorter contract**: the step now uses `foundation_envelope`, `foundation-envelope.md`, `foundation-envelope-prompt.md`, and the matching `foundation-envelope-contract` API path across client/core release surfaces.
- **Deferred visual sidecar naming is pre-aligned with the new step title**: future-wave docs and prompt assets now reserve `foundation-envelope.flow.json`, preventing the older mixed naming from leaking back into the next implementation wave.

## [1.1.894] - 2026-04-05
### Fixed
- **`Diagram Modules` now keeps canonical entity naming in English even when `Artifacts for the User` is localized**: `Product Part`, `Cluster`, and `Module` names/titles no longer follow the artifact-language translation path, while explanatory prose such as `Purpose`, `Responsibility`, notes, and assumptions still follows the selected user-facing artifact language.
- **The runtime prompt contract now separates canonical structural names from localizable prose**: the `diagram_modules` prompt pack and bundled prompt assets explicitly protect English-only entity naming, eliminating the earlier ambiguity that let the agent translate `Product Part` titles into Russian.
- **Bundled template sync coverage now guards the naming boundary**: prompt-pack and template-sync tests now fail if the shipped `Diagram Modules` assets stop enforcing English-only entity names.

## [1.1.893] - 2026-04-05
### Changed
- **Codex user-visible output now uses provider-native raw rollout JSONL as the single dialog source of truth**: `thinking`, `commentary`, and `final_answer` segmentation now follows rollout `event_msg` semantics instead of the semantically poorer SDK `item.*` mirror.
- **Live Codex turns now tail rollout output directly during the turn lifecycle**: rollout-backed normalization drives live updates, terminal drain, replay, and cold-start reconstruction with stable segment ids and session-local dedupe, so reconnect-style rereads do not duplicate already-emitted dialog segments.
- **`sdk-codex-*.jsonl` is now diagnostics-only**: SDK feedback logging remains for transport/runtime debugging, but it no longer participates in semantic dialog routing or history reconstruction.

### Fixed
- **The reported second-turn Description regression no longer mixes commentary into `Thinking`**: rollout `agent_message.phase = commentary` is now emitted as assistant progress text while `agent_reasoning` remains the only source of `Thinking`.
- **Replay and resume now stay deterministic under the rollout cutover**: the Codex test surface now protects in-session dedupe, saved-rollout replay, and cold-start rebuild from duplicate segment emission.
- **Empty-terminal recovery remains green after the rollout migration**: if Codex reaches `task_complete` with a substantive `last_agent_message` but no usable `final_answer`, the user still receives the real assistant completion instead of a thinking-only end state.

## [1.1.892] - 2026-04-05
### Fixed
- **Codex empty-terminal turns now preserve the last substantive assistant answer**: when Codex emits a real user-facing `agent_message`, then drifts into a late reasoning tail and finally ends the turn with an empty terminal assistant payload, the bridge now restores that earlier substantive answer instead of leaving the dialog with giant `Thinking` output and no completion.
- **The recovery is intentionally scoped to the observed reasoning-tail failure mode**: only substantive assistant candidates demoted by a later `reasoning` item are remembered as fallback completions, which avoids promoting ordinary short progress commentary into the final assistant reply.
- **Regression coverage now locks the exact Codex failure sequence**: dedicated messaging tests cover `substantive agent_message -> reasoning tail -> progress check -> empty terminal agent_message`, and the patched `@codeai-hub/codex-module` package builds cleanly before release packaging.

## [1.1.891] - 2026-04-05
### Fixed
- **`Foundation Envelope` continuity chains no longer fall back to `unknown`**: core continuity stage normalization now recognizes `foundation_envelope` during chain creation, root promotion, and tracker matching, so the left Project Manager tree can discover the session branch under the canonical continuity folder.
- **Foundation Envelope handoff artifacts now keep the canonical stage path**: handoff prompt rendering and handoff report path generation now preserve `foundation_envelope`, preventing Foundation Envelope handoff files from drifting into `continuity/unknown/...`.
- **Foundation Envelope survives workflow last-active readback on cold start**: the workflow-state parser now accepts `foundation_envelope` as a valid persisted last-active stage, so restarts no longer drop the stage identity after the artifact has already been created.
- **Core regression coverage now protects the persistence hotfix**: dedicated tests verify Foundation Envelope continuity chain paths, handoff report paths, and last-active readback, and the patched `@codeai-hub/core` package builds cleanly before release packaging.

## [1.1.890] - 2026-04-05
### Fixed
- **`Foundation Envelope` workflow tree parity**: the new stage now materializes the same two-line left-sidebar contract used by mature workflow steps, exposing both the provider session line and the canonical artifact line for `foundation-envelope.md`.
- **Foundation Envelope stage selection consistency across PM entrypoints**: toolbar activation, stage clicks, child-node clicks, and workspace auto-select now reopen the same continuity/dialog session while selecting the canonical artifact whenever it already exists.
- **Right-panel empty state no longer falls back to Description for Foundation Envelope**: the shared session empty-state surface now understands the current workflow stage and routes `Foundation Envelope` through dedicated localization keys instead of showing Description questionnaire guidance.
- **Regression coverage now protects the parity hotfix**: new PM tests verify tree artifact/session wiring, stage-aware empty-state routing, and the localized source-dictionary path for the Foundation Envelope empty-state copy before release packaging.

## [1.1.889] - 2026-04-05
### Fixed
- **`Foundation Envelope` help now follows the selected user-message language**: the new stage help panel and load fallback now resolve through canonical `Messages for the User` entries instead of falling back to English-only inline copy when the user selects Russian.
- **New stage shell labels now participate in `UI Labels` lookup**: the toolbar label, workflow-tree label, blocked-title, and session branch label for `Foundation Envelope` now have stable source-dictionary ids, including a provider-aware session-label template with translation variables.
- **The stage guidance is now synchronized with the workflow SSOT**: the help copy now explicitly covers `Application Root`, `Shared Zones`, `Integration Seams`, technology intent, and placement/dependency rules, matching the actual contract of the stage shell.
- **Regression coverage now protects the localization surface of the new stage**: dedicated Project Manager tests verify the dictionary backfill and stage-label wiring so future trunk-step additions do not repeat the same omission.

## [1.1.888] - 2026-04-05
### Added
- **`Foundation Envelope` workflow stage shell**: the trunk workflow now continues after `Diagram Modules`, exposes the canonical artifact `.codeai-hub/<workspace>/foundation_envelope/foundation-envelope.md`, and ships the new bundled contract/prompt path end-to-end.

### Changed
- **Core workflow gating and persistence now include the new stage**: `Foundation Envelope` unlocks only after `diagramModulesProgress.aggregateReady === true`, and the stage now participates in workflow-state ordering, cold-start hydration, HTTP contract exposure, and artifact upsert routing.
- **Project Manager workflow surfaces now understand the new trunk step**: toolbar routing, tree labels, auto-select priority, branch-node sync, stage panel sync, session recovery, and the dedicated panel shell now keep `Foundation Envelope` consistent with the rest of the workflow.

### Fixed
- **Shared artifact repair flow now reaches `foundation-envelope.md`**: the shared stage artifact view/fix button path can now reopen the correct workflow stage and request a repair session for the new canonical markdown artifact.
- **Workflow verification fixtures now match the expanded stage map**: the remaining Project Manager test fixtures now include the `foundation_envelope` stage key, restoring a clean `npm run typecheck:webview` verification surface before release packaging.

## [1.1.887] - 2026-04-04
### Fixed
- **Codex provider-owned config now tracks the selected model**: `~/.codeai-hub/providers/codex/home/config.toml` now rewrites its `model = ...` line from shared settings instead of leaving stale `gpt-5.4` values behind while only updating `model_reasoning_summary`.
- **Codex `Reasoning in dialog` now reaches runtime event routing**: Core applied turn config now carries the Codex display-sync flag just like Claude and Gemini, and the Codex provider stores that flag in session-local runtime state before routing streamed items.
- **Visible Codex thinking is restored from provider-native `agent_message` progress**: intermediate completed `agent_message` items now become `Thinking` only when later tool/file/command events prove that work continued, while the last `agent_message` of the turn still remains the final assistant reply.
- **Native `gpt-5.4` reasoning remains on the original path**: Codex messaging coverage now explicitly protects the native `item.type = "reasoning"` route, so the `gpt-5.3-codex` `agent_message` fallback does not regress visible `Thinking` for `gpt-5.4`.
- **Settings saves no longer trigger the stale stub overlay**: the extension no longer shows `Settings saved (stub implementation).`, which keeps the Settings WebView footer visible and preserves the existing in-WebView `Saving...`/`settings:saved` feedback flow as the only save confirmation path.

## [1.1.886] - 2026-04-04
### Fixed
- **Clean-runner workspace compile order**: the root `compile` script now builds `@codeai-hub/translation`, `@codeai-hub/localization`, and `@codeai-hub/core-supervisor` before browser/root type-check, so public GitHub runners no longer fail on missing `@codeai-hub/localization` declarations after a fresh `npm ci`.
- **Public CI documentation parity**: README now reflects the actual GitHub Actions gates (`check:knip`, not the stale `check:tsprune`) and documents the workspace build-order prerequisite behind the compile gate.

## [1.1.885] - 2026-04-04
### Fixed
- **Growing last dialog bubbles now auto-scroll correctly**: when the user is already pinned to the bottom, Session and Project Manager dialogs now continue following appended text inside the same logical bubble instead of waiting for a new message count change.
- **Shared dialog panel now tracks a bottom-anchor fingerprint**: auto-scroll no longer keys only off `displayMessages.length`, which prevents long provider `Thinking` streams from extending below the visible viewport while the user is still at the bottom.
- **Project Manager help-text color retune**: all PM help/spravka surfaces based on `pm-details` now use `rgba(115, 130, 140, 1)` while keeping the existing `14px`, medium-weight presentation.

## [1.1.884] - 2026-04-04
### Fixed
- **Claude same-message thinking continuity**: when Claude emits `thinking`, then a short `text` continuation, and then `tool_use` within the same provider-native message id, the intermediate text is now rendered as `Thinking` instead of appearing as a separate assistant reply.
- **Claude provider-native classification rule**: the thinking/assistant split now follows Claude `message.id` ownership plus `message_delta.delta.stop_reason = "tool_use"` vs `end_turn`, avoiding brittle text-based heuristics for this boundary.
- **Project Manager help-text color retune**: all PM help/spravka surfaces based on `pm-details` now use `rgba(100, 130, 155, 1)` while keeping the existing `14px`, medium-weight presentation.

## [1.1.883] - 2026-04-04
### Fixed
- **Claude long-thinking translation overflow**: visible Claude reasoning is now translated in smaller transport-safe chunks before reassembly, so oversized Google GTX GET requests no longer force large thinking blocks to fall back to English.
- **Claude pre-tool progress localization**: short assistant progress text is now buffered until Claude reports `message_delta.delta.stop_reason = "tool_use"`, which allows user-facing pre-tool messages to be localized while leaving final `end_turn` assistant replies untouched.
- **Claude visible-thinking readability**: oversized Claude reasoning is now emitted as multiple smaller `Thinking` dialog bubbles instead of one giant block, which keeps long model reasoning readable in the Session UI.
- **Project Manager help-text presentation**: all PM help/spravka surfaces based on `pm-details` now use the requested `14px`, medium-weight, `rgba(87, 147, 225, 1)` style.

## [1.1.882] - 2026-04-04
### Fixed
- **Persistent startup localization bootstrap**: the localization runtime now saves a startup-ready browser snapshot in `~/.codeai-hub/localization/cache/browser-runtime-bootstrap.json` and reuses it across restarts instead of rebuilding first paint from English component fallbacks.
- **Settings cold-start no longer flashes English**: the extension host injects the persisted localization bootstrap payload into the generated webview HTML before JS boot, so Settings UI labels and help text render from the selected language on the first paint.
- **Project Manager startup now preloads localization before mount**: PM fetches `/api/v1/localization/bootstrap` from Core before `root.render(...)` and seeds its runtime state from the returned snapshot, removing the temporary English Help/UI state on cold launch.

## [1.1.881] - 2026-04-04
### Fixed
- **Project Manager `Add workspace` modal now fully localizes**: the dialog title, field labels, placeholders, buttons, and validation errors now resolve through explicit localization dictionaries instead of staying hardcoded in the modal component.
- **Glossary editing now targets a user-owned file instead of a browser draft**: `Settings -> Localization -> Do-not-translate terms` now opens `~/.codeai-hub/localization/glossary/do-not-translate-terms.txt` in the current VS Code window, seeds it with known preserve terms on first open, and stops relying on a localStorage-only draft flow.

## [1.1.880] - 2026-04-04
### Fixed
- **Claude thinking settings now use explicit effort levels**: the settings UI, persisted snapshot, Core applied turn config, and Claude SDK bridge now use `thinking.enabled + effort` instead of the deprecated `maxThinkingTokens` expectation, so Claude effort changes are again meaningful on modern SDK builds.
- **Claude runtime model sync now reflects effort switches**: when Claude thinking is enabled, Session UI now receives effective identities such as `sonnet reasoning:high` and `sonnet reasoning:max`, instead of a generic `thinking:on` style state that no longer captured the real Claude SDK behavior.
- **Claude display-sync settings now load correctly from the shared snapshot**: Core now carries `thinkingDisplaySyncEnabled` from the persisted Claude provider settings, which keeps the visible-thinking presentation toggle aligned with the actual saved settings state.

## [1.1.879] - 2026-04-04
### Fixed
- **Claude visible thinking now follows `Messages for the User`**: the Claude provider runtime now consumes `messagesForTheUserLanguage` from the Core-applied turn config and translates visible thinking bubbles through the shared translation facade, so Russian user-facing localization no longer leaves Claude thought summaries in English.
- **Claude reasoning-language sync is now covered in module tests**: Claude messaging tests now verify both the applied-turn runtime language handoff and the translated visible-thinking path, which closes the earlier provider gap left after Codex and Gemini were fixed in `1.1.878`.

## [1.1.878] - 2026-04-04
### Fixed
- **Selected user-message language now reaches provider thinking bubbles**: Core applied turn config now carries `messagesForTheUserLanguage` from the shared settings snapshot, so Codex and Gemini runtime adapters can localize visible reasoning/thought output to the same language selected under `Messages for the User`.
- **Gemini visible thoughts are no longer pinned to English**: Gemini thought translation now uses the runtime-selected target language and skips translation entirely when the selected language is `en`, preserving the original provider wording as the default fallback.
- **Codex reasoning bubbles now use the same localization contract**: Codex runtime state now receives the live user-message language per turn, which keeps visible reasoning aligned with Gemini and prevents the same English-only regression from resurfacing on the Codex path.

## [1.1.877] - 2026-04-04
### Fixed
- **Gemini CLI `0.36.x` runtime compatibility**: the Gemini provider bridge now supports global bundle-only `@google/gemini-cli` installs plus the relocated scheduler export from `@google/gemini-cli-core`, so provider selection no longer fails on missing legacy `dist/src/config/*` modules.
- **Safe Gemini settings bootstrap inside Core**: compatibility startup now reads `~/.gemini/settings.json` and workspace `.gemini/settings.json` directly instead of importing Gemini CLI bundle chunks, avoiding telemetry-global side effects that could break provider initialization in the host process.
- **Bundle-layout regression coverage**: Gemini runtime bridge tests now cover the modern bundle-only CLI layout and the adapted scheduler contract before release packaging.

## [1.1.876] - 2026-04-03
### Fixed
- **Claude full SDK isolation**: provider-driven Claude sessions now use empty `settingSources`, which puts CodeAI Hub-managed turns into SDK isolation mode and disables filesystem `CLAUDE.md` / settings auto-discovery entirely.
- **Parent-directory `CLAUDE.md` leak closed**: Claude no longer walks up from the active workspace and treats `/Users/oleksandroliinyk/.claude/CLAUDE.md` as a `Project` memory file, so assistant chat replies stop inheriting personal Russian-only memory while thinking and artifacts remain English.

## [1.1.875] - 2026-04-03
### Fixed
- **Claude provider-home memory isolation**: Claude query options no longer pass the real user `homedir()` as an extra `CLAUDE.md` discovery root, so provider-home sessions stop importing global `~/.claude/CLAUDE.md` as project memory.
- **Workspace-scoped Claude setting sources**: provider-driven Claude sessions now load only `project` / `local` Claude filesystem settings, which keeps global user settings outside CodeAI Hub’s isolated provider-home runtime contract.

## [1.1.874] - 2026-04-03
### Fixed
- **English-only internal workflow prompt boundary**: packaged runtime prompt scaffolding plus bundled `Description`, `Virtual Simulation`, and `Diagram Modules` internal templates now stay English-only, so installed workflow sessions no longer surface Russian agent instructions when user-facing language remains English.
- **Bundled template snapshot parity**: `bundled-templates.ts`, template sync verification, and idea-contract tests now track the translated English internal sources instead of shipping or asserting stale Russian base64/template snippets.
- **Thinking language no longer forced to Russian**: Codex and Gemini runtime thought translation adapters no longer hardcode `ru` as the target language, so visible reasoning/thinking now falls back to the provider’s original language by default.

## [1.1.873] - 2026-04-03
### Fixed
- **Standalone settings-shell intro**: the `Settings only` explanatory body and hint now resolve through `UI Helper Text`, so the installed standalone shell no longer keeps that intro block in English when helper language changes.
- **Provider update risk banner**: the warning shown in `Claude`, `Codex`, and `Gemini` version-management sections now participates in `Messages for the User` lookup instead of staying hardcoded English.
- **Per-model explanatory sentences**: the descriptions under each `Claude`, `Codex`, and `Gemini` model option now resolve through `UI Helper Text`, so packaged provider settings show visible Russian helper changes beyond the top card descriptions.

## [1.1.872] - 2026-04-03
### Added
- **Localization ownership guardrail**: the architecture SSOT now includes an explicit user-facing text boundary contract, so new product-authored copy must be classified up front instead of relying on later localization cleanup.

### Fixed
- **General helper response**: `Settings -> General -> Response Mode` now resolves its explanatory copy through `UI Helper Text`, making the packaged settings surface react visibly to helper-language changes.
- **Provider-tab helper coverage**: `Claude`, `Codex`, and `Gemini` settings now route the major visible helper blocks for default-model selection, auto-update guidance, session continuity, and Claude thinking through explicit localization dictionaries instead of leaving those areas hardcoded.
- **Provider-dialog guidance**: Codex reasoning and Gemini thinking modal subtitles now participate in `UI Helper Text` lookup instead of staying English-only in installed builds.

## [1.1.871] - 2026-04-03
### Fixed
- **Packaged post-release localization gaps**: `Settings -> Localization` glossary-editor copy now resolves through explicit localization categories instead of inline hardcoded strings, so the installed release responds more visibly when `UI Helper Text` changes.
- **Description provider picker ownership**: the picker title, buttons, availability labels, description, and status line now resolve through `UI Labels` and `Messages for the User` instead of Russian literals embedded directly in the Project Manager component.
- **Project Manager shell placeholders**: the default `Sessions` / `Artifacts` panel headers and empty placeholders now participate in localization lookup instead of staying English-only in the installed shell.

## [1.1.870] - 2026-04-03
### Added
- **Approved four-category localization settings**: the user-facing settings model now exposes `UI Labels`, `UI Helper Text`, `Messages for the User`, and `Artifacts for the User`, with `Default Language (English)` as the reset state when a category override is cleared.

### Changed
- **Existing copy is now category-owned**: Settings shell text, Session status/empty-state feedback, Project Manager navigation/help, and Description questionnaire entrypoints now resolve through explicit localization categories instead of mixed legacy buckets.
- **Artifact-language runtime threading**: prompt-pack assembly and workflow start/submit flows now pass `Artifacts for the User` language into Description, Virtual Simulation, and Diagram Modules so final user-facing artifacts and brief user-facing chat updates follow the selected language.

### Fixed
- **Internal prompt boundary is now enforced**: bundled workflow prompts, appendices, and agent-only templates are classified as `Internal Agent Instructions`, excluded from user-facing runtime bundles, and verified to stay English-only while Russian localization materializes only marked user-facing text.

## [1.1.869] - 2026-04-02
### Fixed
- **Release `1.1.868` Core bootstrap regression**: the staged standalone Core runtime now carries the localization runtime dependency chain plus bundled source dictionaries under `app/assets/localization/source/en`, so startup no longer stalls before `/api/v1/health` on installed builds.

### Changed
- **Installed-Core release validation**: `build-release.sh` now verifies the staged Core bundle itself by checking for bundled `@codeai-hub/localization`, bundled `@codeai-hub/translation`, packaged source dictionaries, and a successful `settings-request-handler.js` require through the installed runtime node binary before packaging succeeds.

## [1.1.868] - 2026-04-02
### Fixed
- **Release `1.1.867` startup regression**: the packaged localization runtime now resolves bundled source dictionaries from both supported deployment topologies, so extension activation no longer fails on missing `interactive_templates.json` after VSIX install.

### Changed
- **VSIX runtime smoke coverage**: `build-release.sh` now extracts the packaged extension and requires `@codeai-hub/localization/dist/source-dictionary-registry.js` from the installed extension layout, which catches packaged path regressions before release.

## [1.1.867] - 2026-04-02
### Fixed
- **Release `1.1.866` startup regression**: the VSIX now ships `@codeai-hub/localization`, so extension activation no longer fails on `Cannot find module '@codeai-hub/localization'`.
- **Localization runtime transitive packaging**: the final VSIX now keeps `@codeai-hub/translation` alongside the shipped localization package, preserving the runtime dependency chain used by the host hydration path.

### Changed
- **Release packaging guards**: `build-release.sh` now validates the final VSIX surface and fails if required localization runtime packages are missing or if repo-only entries such as `.github/**` and `.nvmrc` leak into the archive.
- **Unified version bump coverage**: `build-all.sh` now includes `packages/localization` in the shared release-version update flow.

## [1.1.866] - 2026-04-02
### Added
- **Searchable localization picker UX**: localization settings now provide searchable language comboboxes plus a catalog-backed engine selector, replacing the earlier free-form language/engine entry flow.

### Changed
- **Hydrated browser localization runtime**: extension settings load/save and Project Manager settings load now materialize `LocalizationRuntimePayload` through `@codeai-hub/localization`, then deliver resolved bundles and engine catalogs into a shared browser-side provider.
- **Shared PM localization provider**: Project Manager help/questionnaire/navigation surfaces now consume one root localization provider instead of reloading settings and resolving bundles independently in each localized leaf.

### Fixed
- **Browser delivery boundary closed**: localized browser surfaces now resolve translated and source bundle entries from host-materialized runtime payloads instead of falling back to bundled English source catalogs after settings load.
- **Localization selector semantics**: the visible `English` source option now maps cleanly to canonical persisted `source`, avoiding duplicate `en`/`source` semantics in the settings UI and browser runtime.

## [1.1.865] - 2026-04-01
### Added
- **Persistent localization module**: `@codeai-hub/localization` now owns bundled English source catalogs, language catalog metadata, glossary protection, user override storage, and localized bundle persistence under `~/.codeai-hub/localization/`.
- **Localization SSOT**: the architecture index and system/module SSOT now include a dedicated live `Localization` module document.

### Changed
- **Dictionary-driven UI copy**: Settings, Session system feedback, Project Manager help/questionnaire, and Project Manager shell/navigation surfaces now resolve product copy through stable message ids instead of inline component-owned strings.
- **Shared browser localization runtime**: the settings host now provides one browser lookup helper for webview settings surfaces, while Project Manager localization consumers resolve the same persisted policy through shared settings snapshots.

### Notes
- **Current browser delivery boundary**: non-`source` language selections, glossary policy, and localized bundle materialization are implemented and persisted, but browser lookup still falls back to bundled English source catalogs until a host-side translated-bundle delivery bridge is added.

## [1.1.864] - 2026-04-01
### Fixed
- **GitHub Actions compile dependency order**: the root `compile` script now builds `@codeai-hub/core-supervisor` before `tsc -p .`, so CI no longer fails on missing `@codeai-hub/core-supervisor` declarations after `npm ci`.
- **End-to-end public CI bootstrap**: together with the new `.nvmrc`, the repository now provides both the Node version hint and the compile-time supervisor build step required for `Repository CI` to run the real quality gates.

## [1.1.863] - 2026-04-01
### Fixed
- **GitHub Actions bootstrap failure**: the repository now includes a root `.nvmrc`, so `actions/setup-node@v4` can resolve the intended Node version instead of failing before dependency installation.
- **Push-triggered CI false negatives**: `Repository CI` now gets past `Setup Node.js` and can execute the actual quality gates, which stops the repeated failure emails caused by the missing Node version file.

## [1.1.862] - 2026-04-01
### Fixed
- **Core Controls visual alignment**: the `Restart Core` button and restart-status pill now share the same height and sit on the same vertical axis instead of looking offset from each other.
- **Balanced control-row spacing**: the restart action and its status feedback now render as a visually matched pair, which makes the Core Controls row read cleanly across hover, pressed, and busy states.

## [1.1.861] - 2026-04-01
### Fixed
- **Core restart now follows an explicit staged flow**: `Settings -> General -> Core Controls` performs `stop -> wait -> start` instead of a fire-and-forget restart request, matching the operational contract used by the standalone core control script.
- **Core Controls feedback is now visible in-place**: the Settings card reports stop, waiting, start, success, and failure states beside the button, instead of leaving restart progress invisible to the user.
- **Restart button interaction states**: `Restart Core` now exposes clear hover, pressed, and busy states so the action no longer looks inert when clicked.

## [1.1.860] - 2026-04-01
### Fixed
- **Thinking visibility is now presentation-only**: Claude and Gemini `Thinking in dialog` toggles no longer suppress provider-side history emission; they only filter whether thinking bubbles are rendered in the Session dialog.
- **Restored-dialog parity**: the same thinking visibility toggle now applies to reopened/reloaded dialog history, including continuation chains, instead of affecting only newly emitted runtime messages.

## [1.1.859] - 2026-04-01
### Fixed
- **Thinking display snapshot backfill**: older settings snapshots now backfill Claude and Gemini `thinkingDisplaySyncEnabled` on load, so the UI toggle and Core payload stay aligned after restart.
- **Claude visible thinking contract**: Claude reasoning now renders as a standard assistant bubble with a `Thinking` label when display sync is on.

## [1.1.858] - 2026-04-01
### Fixed
- **Session dialog link readability**: clickable markdown links in user, assistant, and thinking bubbles now use a shared high-contrast light-blue color instead of the browser default blue.
- **Dialog link presentation consistency**: session-dialog links now render with medium weight and no underline across Claude, Codex, Gemini, and user message surfaces.

## [1.1.857] - 2026-03-31
### Added
- **Codex `gpt-5.4-mini` settings exposure**: the Codex settings baseline now includes `gpt-5.4-mini` with the same reasoning effort choices as `gpt-5.4`.

### Changed
- **Codex reasoning summary setting**: Codex settings now expose `Reasoning in dialog` as the canonical toggle for provider reasoning summaries. `On` maps to `model_reasoning_summary = "auto"` and `Off` maps to `"none"`.
- **Provider-home config ownership**: `~/.codeai-hub/providers/codex/home/config.toml` is now a provider-owned materialized file derived from `~/.codex/config.toml` plus CodeAI overrides, instead of a direct symlink to the user config.
- **Immediate Codex settings sync**: toggling the Codex reasoning setting in the UI rewrites the provider-owned `config.toml` immediately, while saved settings remain the restart-proof source of truth for future provider bootstrap.

### Fixed
- **Duplicate Codex truth paths removed**: Codex no longer keeps a second display-only runtime gate for translated reasoning bubbles; visible reasoning now depends only on whether upstream Codex actually sends reasoning summaries.
- **Saved settings bootstrap parity**: Codex auth/bootstrap and SDK config sanitization now resolve reasoning summary mode from the shared persisted settings snapshot instead of hardcoding `"auto"`.

## [1.1.856] - 2026-03-31
### Fixed
- **Codex provider bundle dependency**: the build pipeline now vendors `@codeai-hub/translation` into the installed Codex provider root, so Core can load Codex startup-time reasoning translation support without workspace `node_modules`.
- **Release validation parity**: build/release smoke checks now require both the installed Codex and Gemini bundles to load successfully with their bundled shared translation package before packaging.

## [1.1.855] - 2026-03-31
### Added
- **Thinking display sync controls**: provider settings now expose per-provider toggles for Codex and Gemini visible thinking sync, while the translation and reasoning pipelines stay active even when the visible bubble is disabled.

### Changed
- **Codex reasoning display parity**: Codex reasoning now uses the shared runtime translation path and the same visible assistant-thinking bubble contract as Gemini, with provider-level display sync gating handled through the applied turn config.
- **Release preparation docs**: README current-release notes and architecture SSOT now reflect the thinking display sync controls before version bump.

## [1.1.854] - 2026-03-31
### Fixed
- **Gemini provider bundle dependency**: the build pipeline now vendors `@codeai-hub/translation` into the installed Gemini provider root, so the bundled provider can resolve the shared translation facade without workspace `node_modules`.
- **Release validation**: build/release smoke checks now require the installed Gemini bundle to load successfully before packaging, which catches missing bundled translation dependencies early.

## [1.1.853] - 2026-03-31
### Added
- **Shared runtime translation module**: `packages/translation` now provides the reusable translation facade and Google GTX engine for runtime translation use cases.

### Changed
- **Gemini thought translation adapter**: Gemini thoughts now flow through `GeminiThoughtTranslationAdapter` backed by the shared facade, and `thought-translator-service.ts` remains a compatibility re-export.
- **Gemini session wiring**: `GeminiSessionManager` and `GeminiTurnRunner` now own the adapter directly, keeping translated thinking visible as tagged assistant output without changing the UI contract.

### Fixed
- **Gemini flush semantics**: when no thought translations are pending, finished turns now emit the final assistant segment synchronously; deferred flush still handles pending translations.
- **Verification surface**: `@codeai-hub/translation` and `@codeai-hub/gemini-module` builds plus focused `message-processor` / `gemini-session-manager` tests passed before release packaging.

## [1.1.852] - 2026-03-31
### Changed
- **Workspace runtime test split**: `packages/core/src/workspace-runtime/workspace-runtime-facade.test.ts` now keeps snapshot/select/flush coverage, while continuity and resume scenarios moved into `packages/core/src/workspace-runtime/workspace-runtime-facade-continuity.test.ts`.
- **Session request handler test-support split**: `packages/core/src/remote-bridge/handlers/session-request-handler.test-helpers.ts` is now a smaller harness-focused root, with event counters in `session-request-handler.test-event-helpers.ts` and continuity/bootstrap utilities in `session-request-handler.test-continuity-helpers.ts`.
- **Gemini post-tool regression split**: `packages/Gemini_Module/src/session/gemini-session-manager.test.ts` now keeps baseline/recoverable and translated-thinking coverage, while nested post-tool watchdog scenarios moved into `packages/Gemini_Module/src/session/gemini-session-manager.post-tool.test.ts`.

### Fixed
- **Architecture warning-zone debt**: the remaining test/support files from the `400-500` warning band are now below the threshold, so the architecture gate reports zero warning-zone files again.
- **Release verification surface**: cleanup was verified with focused source-level tests for all newly split files plus package builds for `@codeai-hub/core` and `@codeai-hub/gemini-module` before release packaging.

## [1.1.851] - 2026-03-30
### Changed
- **Claude auth façade decomposition**: `packages/Claude_Module/src/auth/sdk-auth-manager.ts` is now a thin coordinator over dedicated helpers instead of a mixed provider-home/runtime auth root.
- **Provider-home auth bridge**: macOS Keychain bridge, legacy `.claude.json` link/copy handling, and legacy credentials migration now live in `packages/Claude_Module/src/auth/claude-auth-home-bridge.ts`.
- **Runtime auth split**: OAuth bootstrap/cache refresh, auth environment assembly, `npx @anthropic-ai/claude-code` preflight probe, and final auth check now live in `packages/Claude_Module/src/auth/claude-auth-runtime.ts`.

### Fixed
- **Warning-zone closure**: the last production hotspot from the originally agreed runtime `400-500` wave (`sdk-auth-manager.ts`) is now below the architecture warning threshold without changing the public Claude auth contract.
- **Release verification coverage**: Claude auth decomposition was verified with `@codeai-hub/claude-module` build, package tests, and a compiled `SDKAuthManager` env-contract smoke check before release packaging.

## [1.1.850] - 2026-03-30
### Fixed
- **Gemini final-answer deduplication**: deferred translated-thought flush now completes before segmented-vs-fallback assistant accounting, so a terminal Gemini answer emitted once by the provider is written once to dialog history instead of being duplicated locally.
- **Deferred finalization ordering**: `GeminiTurnRunner` now waits for deferred Gemini dialog emits before detaching assistant-segment listeners or deciding late-stall-after-answer completion, keeping terminal-answer accounting consistent with the actual emitted segments.

### Added
- **Dedup regression coverage**: added a focused Gemini session test for delayed translated `thinking` followed by one terminal assistant answer and no aggregate fallback duplicate.

## [1.1.849] - 2026-03-30
### Fixed
- **Gemini post-tool terminal-leg contract**: assistant progress output from a leg that emitted `tool_call_request` no longer satisfies whole-turn completion; only the nested terminal leg without new tool requests can complete the turn.
- **Adaptive post-tool timeout policy**: Gemini stalled-turn watchdog now distinguishes `initial` and `post_tool` legs, so follow-up after successful tool execution uses a longer timeout window instead of inheriting the aggressive initial-leg threshold.

### Added
- **Post-tool regression coverage**: added Gemini session tests for `progress -> write_file -> nested stall`, delayed post-tool final answer, and late silent tail after a terminal nested answer.

## [1.1.848] - 2026-03-30
### Fixed
- **Gemini terminal-answer contract**: `thinking`/translated thoughts no longer satisfy terminal answer accounting, so a Gemini turn cannot silently complete on thoughts alone.
- **Late-stall handling**: Gemini stalled-turn timeout now resolves based on whether a real non-thinking assistant answer was already emitted; answer-then-stall completes, no-answer stall remains recoverable failure.
- **History-visible failure outcome**: recoverable Gemini `turn_failed` is now appended to session/dialog history as a system message, so reload preserves the failure outcome beside prior thinking output.

### Added
- **Regression coverage**: added focused Gemini/Core tests for thinking-without-answer stall, answer-then-stall completion, and `turn_failed` history materialization.

## [1.1.847] - 2026-03-30
### Fixed
- **Test debt eliminated**: all 145 tests passing (was 139/151). Removed stale dist artifacts, replaced `Function()` hack with lazy `require("node:crypto")` in `computeDiagramRevision`, synchronized 5 test assertions with current template/router content.

## [1.1.845] - 2026-03-30
### Changed
- **Architecture line limit raised to 500**: `MAX_LINES` 300→500, `WARNING_LINES` 250→400 in `check-architecture.sh`; updated `AGENTS.md` principles.
- **Oversized file refactoring**: split all 5 files that exceeded 500 lines into focused modules: `unified-session-backfill.ts`, `workspace-runtime-facade-task-timer.test.ts`, `cli-parser.ts`, `core-runtime-resolver.ts`, `session-request-handler-types.ts`, `session-request-handler.test-helpers.ts`. Debt allowlist cleared to zero entries.

## [1.1.844] - 2026-03-30
### Changed
- **Dead code detection**: replaced deprecated `ts-prune` with `knip` in pre-commit hook, CI workflow, and AGENTS.md; knip now blocks commits on unused files, unused exports, and duplicate exports.
- **Dead code cleanup**: removed 59 verified dead files (~6900 lines) and cleaned 105 unused exports across all packages; each deletion manually verified via grep before removal.
- **Quality gate docs**: updated `AGENTS.md`, CI workflow, and continuity templates to reference `knip` instead of `ts-prune`.

## [1.1.843] - 2026-03-30
### Fixed
- **Workspace switch session visibility**: switching between workspaces with active sessions no longer flashes the "Start with the Description questionnaire" placeholder. Root cause: workspace-tree auto-select fired `handleStateUpdate` with a stale previous-workspace snapshot before the store emitted data for the new workspace, permanently consuming `pendingWorkspaceIdRef` and preventing the correct `pm:dialog:open` dispatch. Fix: added `storeState.workspaceSlug === workspaceSlug` guard so auto-select only processes snapshots that belong to the current workspace. Additionally, the reset effect no longer unconditionally clears `hasDescriptionSession`, and a `workflowStoreLoaded` guard prevents the questionnaire panel from rendering until the store loads.

## [1.1.841] - 2026-03-29
### Fixed
- **Session panel connects after submit**: after submitting the Description questionnaire, the session panel now switches to dialog mode (same path as clicking a session node in the tree), so it connects to the newly created session via dialog API immediately instead of relying on Core stream events that runtime mode may miss during mount timing. Fixes "Creating session..." stuck state for all providers.

## [1.1.840] - 2026-03-29
### Fixed
- **Session display after questionnaire submit**: the runtime session view no longer resets `activeSessionId` when the preferred session is not yet in the visible list. Previously the visibility sync effect raced against Core's `session:created` delivery, causing the session panel to stay stuck on "Creating session..." until the user manually clicked the session node. Fix is provider-agnostic (Claude, Codex, Gemini).

## [1.1.839] - 2026-03-29
### Fixed
- **Session view unmount on store activation**: suppressed the intermediate null-snapshot emit from `WorkflowStateStore.activate()` that caused a render-cycle lag, briefly flipping `showDescriptionHelpInSessionPanel` to true and unmounting the active `ProjectManagerSessionView`.
- **Derivation guard**: workflow state derivation now skips all setter calls until the store completes its first poll (`loaded` flag), preventing stale state from reaching the UI between workspace switches.

## [1.1.838] - 2026-03-29
### Fixed
- **Description session flicker**: post-submit Description UI no longer reverts to Help+Questionnaire when polling returns a snapshot before backend persists the session binding.
- **False Final_Description.md**: legacy `description.md` draftPath no longer appears as `Final_Description.md` in the workspace tree or central panel; only the canonical path contract is shown.
- **Description gating alignment**: downstream workflow steps now require `finalPath` (not legacy `draftPath`) to unblock, matching the actual step-start contract.

### Added
- **Shared WorkflowStateStore**: MainArea and WorkspaceTree now share a single polling cycle, eliminating split-brain between the two components.
- **Description artifact availability probe**: a readability gate prevents showing Description artifacts that don't exist at the canonical HTTP endpoint.

## [1.1.837] - 2026-03-29
### Changed
- **Provider-feedback rollback**: removed the normalized `provider_feedback` observability seam for Claude, Codex, and Gemini from the active baseline after real runs showed that it did not provide trustworthy cross-provider exact-level confirmation.
- **Provider-native audit path restored**: exact applied model/reasoning/thinking should again be verified from provider-native artifacts such as Claude provider-home JSONL, Codex raw rollout `turn_context`, and Gemini raw session/stream traces.
- **Effective model identity baseline preserved**: the runtime/UI effective identity contract from `1.1.835` remains active; only the extra SDK observability layer from `1.1.836` was rolled back.

## [1.1.836] - 2026-03-29
### Added
- **Provider-confirmed SDK feedback logs**: Claude, Codex, and Gemini now write normalized `provider_feedback` records into their SDK JSONL diagnostics only when the provider runtime actually echoes model/thinking/reasoning signals back.

### Changed
- **Codex observability seam**: raw `turn_context` feedback is now promoted into `sdk-codex-*.jsonl`, preserving provider-confirmed `model`, `effort`, and `reasoningEffort` instead of treating outbound applied config as proof.
- **Claude observability seam**: `sdk-claude-*.jsonl` now records provider-confirmed `message.model` and `thinking` blocks as dedicated `provider_feedback` entries.
- **Gemini observability seam**: `sdk-gemini-*.jsonl` now persists structured `logEvent(...)`, normalizes provider-confirmed `model_info`, `thought`, and `usageMetadata.thoughtsTokenCount`, and explicitly avoids faking feedback from local `thinkingLevel`.


## [1.1.835] - 2026-03-29
### Changed
- **Effective model identity contract**: `modelId` across Core transport/runtime/UI now represents the full effective identity, with Codex reasoning and Claude/Gemini thinking semantics treated as part of the runtime identity instead of auxiliary UI-only fields.
- **Provider-neutral next-turn resolver**: Core now resolves `baseModelId`, effective `modelId`, and provider-specific reasoning/thinking payload from the shared persisted settings snapshot before outbound send, then threads that contract through provider capabilities and applied turn config.

### Fixed
- **Codex reasoning-only switches**: changing Codex reasoning on the same base model now mutates the live thread runtime on the next turn instead of staying split between settings, runtime model, and UI labels.
- **Outbound runtime model updates**: `session:model:update` now publishes the effective identity that Core will actually use on the next turn, rather than only the base model id.
- **PM/webview label parity**: Project Manager and the standard webview now consume runtime effective model updates directly and preserve ready-session reasoning/thinking labels instead of rebuilding stale labels from settings-only defaults.

## [1.1.834] - 2026-03-29
### Changed
- **Session-scoped Stop contract**: Session UI, websocket bridge, and Core now use `session:stop` as the canonical stop path, so `Stop` targets only the active logical session/turn instead of triggering global Core shutdown.
- **Stop-triggered provider rebind path**: Core now keeps the logical session alive after `Stop`, invalidates only the live provider binding, and creates a fresh provider session on the next send when that binding was intentionally stopped.
- **Gemini recoverable stalled-turn path**: Gemini stalled-stream watchdog failures now surface as provider `turn_failed` on the recoverable session path instead of escalating through generic provider-runtime failure recovery.

### Fixed
- **Stop no longer kills Core runtime**: the Session input button no longer calls `/api/v1/shutdown`, no longer relies on supervisor restart on the next send, and no longer drops the active dialog into a stop-core UX.
- **Gemini silent stall deadlock**: stalled Gemini streams after `model_info` or partial progress now fail back to `idle` instead of leaving Core/UI in an infinite `Agent is working... Please wait.` state.
- **Recovery regression coverage**: Core and Gemini test suites now lock in stop-mid-turn survival, stuck-lock release, rebinding on next send, stalled-stream timeout, recoverable retry, and the absence of phantom partial assistant flush before `finished`.

## [1.1.833] - 2026-03-29
### Changed
- **SessionRequestHandler runtime graph split**: constructor/service bootstrap for continuity, resume, provider binding, flow-node rollover, and turn arbitration now lives in `session-request-handler-runtime{,-core,-types}.ts` instead of one inline root constructor block.
- **SessionRequestHandler action split**: switch resend flow, regular message ingress, rollover-pending send guards, and delete cleanup now live in `session-request-handler-session-actions.ts`, reducing the root handler to a narrower orchestration surface.

### Fixed
- **Phase 81 carry-over closure**: the remaining post-`1.1.832` decomposition tail is now isolated into dedicated helpers without regressing the provider-neutral applied-config contract or the already verified Claude/Codex/Gemini next-turn model switching path.
- **Release docs/runtime alignment**: this build is the doc-synced post-plan verification release after the full `Phase 81` refactor pass, so release-facing docs, SSOT, and packaged artifacts now describe the same architecture baseline.

## [1.1.832] - 2026-03-28
### Changed
- **Provider-neutral applied config contract**: Core now resolves per-provider next-turn model/thinking through a shared registry + capability contract, so outbound send attachment and PM runtime label sync no longer depend on `if (providerId === ...)` bridge branches.

### Fixed
- **Claude/Codex/Gemini model-sync onboarding path**: adding a provider to the model-switch pipeline now centers on Core resolver/capability registration instead of separate PM sync and outbound-bridge hotfixes.
- **Gemini runtime thinking parity**: Gemini now stages both `model` and `thinkingLevel` from the shared applied turn config for fresh and existing sessions, instead of only overriding the model while leaving bootstrap thinking state stale.
- **Gemini local settings precedence**: Gemini session bootstrap no longer reasserts `model` / `thinkingLevel` from provider-local `settings.json` when Core already supplied authoritative runtime defaults.

## [1.1.831] - 2026-03-28
### Fixed
- **Applied runtime model label sync on regular next turns**: Core now emits `session:model:update` directly from the outbound applied turn config on normal send paths, so Project Manager updates the lower session label even when the provider does not emit a follow-up runtime `model_info` / `system` event.

## [1.1.830] - 2026-03-28
### Changed
- **Settings SSOT next-turn config path**: Core now resolves persisted `model` / `reasoning` once and threads the applied turn config through remote-bridge outbound send and switch paths instead of leaving providers to refresh those values independently.

### Fixed
- **Codex real next-turn model switching**: Codex now applies Core-owned model/reasoning overrides directly onto the active thread runtime before each turn, so the provider-native rollout uses the same model that Project Manager and Core expect.
- **Codex split-brain removal**: `codex-sdk-manager` no longer re-reads `settings.json` to decide the current runtime model for live turns; bootstrap defaults come from Core and live overrides come from the applied turn config contract.
- **PM applied model labels**: ready session labels no longer jump to a new model purely because settings changed; they now wait for `session:model:update` and can still refresh reasoning/thinking when Core confirms another turn on the same model.
- **Gemini/Claude next-turn parity**: Gemini and Claude outbound send paths now consume the same Core-applied next-turn model payload, so they no longer rely on provider-local current-model refresh for live send behavior.

## [1.1.829] - 2026-03-28
### Fixed
- **Runtime model labels now refresh reasoning/thinking from settings**: Project Manager no longer freezes the `reasoning` / `thinking` suffix when a session is already marked with a runtime model override. The active runtime model is preserved, but its reasoning/thinking label is rebuilt from the latest settings snapshot on refresh.

## [1.1.828] - 2026-03-28
### Fixed
- **Forced live session model refresh**: Project Manager now tracks whether a session status model label came from `settings` or from a runtime `session:model:update` event. This prevents stale settings-era model IDs from being preserved as fake runtime overrides after a model change, and the standard runtime session panel now subscribes to `session:model:update` just like the dialog panel.

## [1.1.827] - 2026-03-28
### Fixed
- **Session status model labels now follow live settings**: Project Manager reloads the shared settings snapshot when a runtime/dialog session becomes active and immediately before each user send, so the lower session status bar reflects the currently selected provider model and reasoning/thinking level across Claude, Codex, and Gemini without requiring a Core restart.

## [1.1.826] - 2026-03-28
### Changed
- **Phase 79 session-request-handler decomposition**: `packages/core/src/remote-bridge/handlers/session-request-handler.ts` now offloads bootstrap, session resolution, message dispatch, flow-node rollover/report state, dialog segment metadata, provider-event message persistence/parsing, and retry/pending-intent state into dedicated helper modules while preserving the existing runtime behavior.
- **Repository truthfulness baseline**: root metadata, release workflow wording, and hook ownership are aligned around the real Husky-first process; stale Lefthook leftovers are removed from the active dependency/workflow surface.

### Added
- **Public CI baseline**: `.github/workflows/ci.yml` now runs the root repository gates (`check:architecture`, `lint`, `check:tsprune`, `compile`) on pushes to `main` and on pull requests.

## [1.1.825] - 2026-03-28
### Fixed
- **Broken Gemini global runtime installs**: `packages/Gemini_Module/src/installer/gemini-installer.ts` now validates the installed top-level `@google/gemini-cli-core` dependency graph before provider startup and automatically reinstalls Gemini CLI/Core when corrupted dependencies like a truncated `fast-uri` payload are detected.
- **Nested/bridge Gemini dependency sanity**: `packages/Gemini_Module/src/runtime/cli-bridge.ts` now treats broken bridge-side runtime dependencies as compatibility failures during bridge loading instead of letting them surface later as Core-killing crashes.
- **Stale npm rename debris during repair**: Gemini runtime reinstall now removes leftover hidden npm temp directories (for example `.gemini-cli-core-*`) before `npm install -g`, preventing `ENOTEMPTY` rename failures from blocking automatic recovery.

## [1.1.824] - 2026-03-28
### Fixed
- **Gemini loop-recovery crash**: `packages/Gemini_Module/src/session/gemini-session-bootstrapper.ts` now patches the vulnerable `gemini-cli-core` loop-recovery path so internal aborts no longer propagate `AbortError: The user aborted a request.` into Core and tear down the process mid-turn.

## [1.1.823] - 2026-03-28
### Added
- **Core fatal crash log**: `packages/core/src/index.ts` now appends `uncaughtExceptionMonitor` crash records to `~/.codeai-hub/logs/core/core-fatal.log` so abrupt provider-boundary failures leave a synchronous stack trace on disk.
- **Bridge observer log**: `src/extension-module/core/core-keep-alive.ts` now mirrors extension-side bridge lifecycle messages into `~/.codeai-hub/logs/observer/bridge-observer.log`, giving post-mortem visibility even when Core exits before flushing its own logs.

## [1.1.822] - 2026-03-28
### Changed
- **Wave 2 oversized debt cleanup**: `packages/core/src/workspace-runtime/workspace-runtime-facade.ts`, `packages/core/src/config/index.ts`, `packages/core/src/remote-bridge/types.ts`, and `packages/core/src/workflow/diagram-dsl/diagram-modules-parser.ts` are now thin façade/aggregation surfaces over focused helper clusters.
- **Provider messaging clusters**: Claude, Codex, and Gemini `message-processor.ts` roots now delegate stream routing, finish/usage sync, and assistant/system normalization to dedicated helper modules.
- **Codex structured output controller**: `packages/Codex_Module/src/messaging/structured-output-stream-controller.ts` is now a focused façade over parser/state helpers, preserving passthrough and session-promotion behavior.

### Fixed
- **Oversized allowlist truthfulness**: root files that dropped under the 300-line handwritten limit were removed from the explicit debt allowlist in the same refactor wave; blocking non-allowlisted oversized source files remain at zero.

## [1.1.821] - 2026-03-27
### Changed
- **Remote bridge façade split**: `packages/core/src/remote-bridge/index.ts` is now a thin façade over dedicated bootstrap, server-lifecycle, websocket command-router, dialog command-router, and workspace command-router modules.

### Fixed
- **Oversized architecture debt**: `packages/core/src/remote-bridge/index.ts` was removed from the explicit oversized-file allowlist immediately after the façade cut.

## [1.1.820] - 2026-03-27
### Changed
- **Core HTTP router decomposition**: `packages/core/src/remote-bridge/handlers/http-api-router.ts` is now a thin façade over dedicated session, system, artifact validation, and artifact upsert helpers; the root router left the explicit oversized-file debt allowlist.

### Fixed
- **VSIX packaging surface**: `.husky/_` helper files and repository hook scripts are no longer shipped inside the extension package.

## [1.1.819] - 2026-03-27
### Changed
- **Repository quality gates**: repo-wide `npm run lint` is green again; `.husky/pre-commit` now runs architecture + lint + ts-prune and formats only staged files via stash-safe restore.
- **Provider registry façade**: `packages/core/src/provider-registry/index.ts` is now a façade over dedicated installer-path, installed-path, module-loader, descriptor-factory, usage-limits bridge, and recovery modules.
- **Gemini session façade**: `packages/Gemini_Module/src/session/gemini-session-manager.ts` now delegates bootstrap, settings, store/lifecycle, turn runner, and tool-call orchestration to focused submodules.

### Added
- **Gemini session regression split**: dedicated `gemini-session-bootstrapper.test.ts` and `gemini-turn-runner.test.ts` suites alongside the façade smoke test.

### Fixed
- **Oversized architecture debt**: `packages/core/src/provider-registry/index.ts` and `packages/Gemini_Module/src/session/gemini-session-manager.ts` were removed from the explicit oversized-file allowlist after the façade cuts.

## [1.1.818] - 2026-03-26
### Fixed
- **Rate limit display**: filter stale model buckets (e.g. `gemini-3-pro-preview`) from Google Quota API and show human-readable display names ("Gemini 3.1 Pro", "Gemini 3 Flash") instead of raw model IDs.
- **Model label after switch**: `StatusPanel` now updates immediately when switching models via recovery banner. Three-layer fix: explicit `session:model:update` broadcast on `switch_model`, snapshot ID fallback for dialog sessions, and `useSettingsModelsSync` skip when runtime override is active.
- **Optimistic user message**: user messages in PM dialog sessions appear instantly on send instead of waiting for `dialog:history:result` round-trip.

## [1.1.810] - 2026-03-26
### Changed
- **Gemini ThoughtTranslator**: replaced Flash-Lite LLM translation with free Google Translate API — latency drops from 1-71s to ~100ms, no chain-of-thought leakage.
- **Thought rendering**: translated thoughts now display as visible "Gemini · Thinking" messages instead of collapsed English-only blocks.
- **JSONL format**: one record per thought (`role: "assistant"`, `tag: "thinking"`) instead of two (thinking + assistant). English originals no longer written to JSONL.

### Added
- **SessionMessage `tag` field**: optional string tag propagated through Core storage, JSONL, and UI for semantic message classification.
- **Buffered thought ordering**: translations are awaited before real response emit, guaranteeing correct JSONL ordering.

## [1.1.806] - 2026-03-26
### Fixed
- **Recovery offer pipeline (BUG-2026-03-26-01)**: provider timeout/failure now emits `dialog:switch:offer` event so PM can show recovery banner with retry/switch options — previously only silent input unlock occurred.

### Added
- **FailureRecoveryBridge** (`packages/core/src/recovery/`): translates classified failure into `DialogSwitchOfferPayload` using `RecoveryTargetResolver`.
- **useDialogSwitchOffer** hook: PM-side listener for `dialog:switch:offer` events with session-scoped state.
- **SwitchOfferBanner** in session view: renders `SwitchRecoveryBanner` above input panel when recovery offer is active.

## [1.1.804] - 2026-03-26
### Fixed
- **Provider failure resilience (BUG-2026-03-25-01)**: transient provider errors no longer destroy session binding, degrade the whole provider, or deadlock UI in perpetual running state.
- **No-silent-drop**: user messages at missing binding now get explicit error + pending intent tracking instead of being silently dropped.

### Added
- **ProviderFailureClassifier** (`packages/core/src/recovery/`): classifies errors into `transient_turn_failure`, `session_binding_recoverable`, `provider_runtime_failure`, `terminal_session_failure`.
- **Bounded retry budget**: 1 silent retry for transient errors, 1 auto-resume for recoverable bindings, 60s TTL for pending user intent.
- **DialogSwitchOrchestrator**: same-provider retry and model switch via `retry_in_place`/`switch_model` modes.
- **RecoveryTargetResolver**: MVP hardcoded fallback matrix for cross-provider recovery (Gemini/Claude/Codex).
- **Provider-neutral transfer builders**: `CanonicalSessionPreambleResolver`, `ProviderFacingDialogBuilder` (plain `User:/Assistant:` transcript), `UnifiedDialogTransferBuilder` (handoff + bootstrap prompt).
- **Generic `dialog:switch:*` protocol**: `dialog:switch:offer/progress/result` outgoing events, `dialog:switch:request/confirm/cancel` incoming commands.
- **CoreHealthBanner**: PM-side crash/unavailable UX with retry/restart CTAs.
- **SwitchRecoveryBanner**: session-level switch options (retry in place, switch model, switch provider, dismiss).
- **PM dialog-switch-types.ts**: extracted switch types to stay within 300-line architectural limit.

## [1.1.801] - 2026-03-25
### Fixed
- **Gemini tool execution**: full compatibility with `gemini-cli-core@0.35.0` — build `AgentLoopContext` from Config deprecated getters, pass to `CoreToolScheduler` (fixes `TypeError: Cannot read properties of undefined (reading 'messageBus')`).

### Added
- **Gemini Thought Translator**: real-time Russian translation of Gemini agent thoughts via `gemini-2.0-flash-lite` (fire-and-forget, zero-cost, graceful degradation).
- **New event handlers**: `ModelInfo`, `AgentExecutionStopped`, `AgentExecutionBlocked` events from `gemini-cli-core@0.35.0`.

### Removed
- **Legacy nonInteractiveToolExecutor**: dead code path removed from `cli-bridge`, `cli-types`, and tool executor facade.

## [1.1.800] - 2026-03-25
### Added
- **Detachable diagram window**: `Detach` button in artifact header opens a full-viewport ReactFlow popup via `window.open()`; shared sidecar file with BroadcastChannel sync on drop.
- **Dynamic container resizing**: Product Part and Cluster containers auto-grow/shrink when child nodes are dragged toward or away from edges; `containerConstraints` stored in flow node data.
- **Collision avoidance**: AABB minimum-translation-vector with 12px gap between siblings within the same container and between Product Parts at top level.
- **Multi-column layout**: clusters with 3+ modules use 2-column grid (`CLUSTER_MULTI_COL_THRESHOLD = 2`).
- **Controls hint**: muted text in artifact header — `Zoom: scroll · Pan: drag · Move node: ⌥(Alt)+drag` — shown only for Diagram Modules.
- **Auto-select Diagram Modules**: workspace open now checks DM sessions before Virtual Simulation.

### Changed
- **Option(Alt)+drag** replaces Ctrl/Meta for node movement — Ctrl+click on macOS triggers context menu.
- **Canvas cleanup**: removed description block, toolbar header, and zoom controls; ReactFlow fills 100% of panel area.
- **Detach button relocated** from above the graph to the artifact header (left of Artifacts toggle) via `extraActions` slot.
- **Documentation reorganization**: Plans/ cleaned (9 deleted, 9 archived, 8 moved to System/Contracts); SystemArchitecture.md and Project_Manager.md updated.

### Removed
- **Diagram Facades workflow step**: trunk now ends at Diagram Modules. Deleted: `diagram-facades-agent`, facade panel/help, facade parser, facade editor components, ~3,500 lines of code across 86 files.
- **module-inventory.md aggregate**: Module Graph now built progressively from individual `product-parts/<part-id>.md` files.
- **Separate detached sidecar**: detached window now shares the same `module-map.flow.json` as the main PM.

## [1.1.786] - 2026-03-24
### Fixed
- **First module overlaps cluster purpose**: `getClusterHeaderHeight` now includes `CL_PAD_TOP=14` (clusterCardStyle padding-top) and `MODULE_CARD_GAP` gap after header content. Purpose text uses `CL_PURPOSE_LH=16` (lineHeight:1.4) instead of LH11=14.
- **Purpose panel flush against clusters**: `PRODUCT_PART_HEADER_BODY_GAP` raised from 4 to 12 — all vertical gaps now uniform at MODULE_CARD_GAP=12.
- **Responsibility truncated at pipe chars**: `|` inside backtick expressions (e.g. `` `a|b` ``) was treated as column separator by optional group regex. Fix: removed raw-text alternative — only backtick-wrapped values valid as extra columns.
- **Module kind always "service"**: parser now preserves actual kind from col2 (`gateway`, `adapter`, `store`, etc.) instead of hardcoding `"service"`.

## [1.1.783] - 2026-03-24
### Fixed
- **Clusters overlap Purpose panel**: `getProductPartHeaderHeight` now includes `productPartCardStyle` padding-top (18px), so clusters start below the card padding instead of overlapping the Purpose panel content.
- **3-column module table N-1 bug**: `\s*` in `OUTLINE_MODULE_ROW_RE` optional group matched `\n`, causing the regex to span two lines and swallow the next data row (N-1 visible modules per cluster). Fix: `[ \t]*` prevents newline crossing.
- **Phantom header row**: table header `| \`module-id\` | \`kind\` | Responsibility |` was matched as a real module. Now filtered by id.
- **Module title shows kind**: when agent produces 3-column tables (`module-id | kind | Responsibility`), col2 is now detected as kind and module-id is humanized for display title instead of showing "service"/"store"/etc.

## [1.1.778] - 2026-03-24
### Changed
- **Diagram Modules step-by-step workflow**: removed hidden auto-continuation. The agent now pauses after creating the product parts index and after each product part, giving the user full control over the conversation flow.
- **Prompt rewritten**: agent instructions updated from auto-continuation to explicit step-by-step schema with index turn + part turns.
- **Module Graph sidebar**: artifact renamed from `module-inventory.md` to `Module Graph`; Source mode removed for Diagram Modules (graph is the primary artifact).

### Fixed
- **Graph refresh**: diagram graph now auto-refreshes when a new product part artifact is persisted (`pm:diagram:refresh` event).
- **Auto-layout sidecar fallback**: when `flow.json` does not cover all nodes in the current projection, computed layout is used instead of a partially stale sidecar.
- **Purpose panel width**: CSS changed from `minmax(240px, 320px)` to `minmax(240px, 1fr)` so the Purpose panel stretches to fill available space; layout chars-per-line recalculated dynamically from actual product part width.
- **Height underestimation**: `MODULE_CARD_MIN_HEIGHT` increased from 132 to 148; 16px safety buffer added to cluster and product part container heights to prevent node overlap.

## [1.1.777] - 2026-03-23
### Fixed
- **Critical**: `normalizeWorkflowContract` in `description-submit-service.ts` was rejecting `diagram_modules` and `diagram_facades` contracts because `needsTemplate` was true but these stages deliver templates via `promptAppendix`, not via a `template` path. The agent was falling back to a generic prompt and never received `module-inventory-prompt.md` or canonical templates. Fix: `needsTemplate = stage === "description"`.
- Canonical product-part template rewritten from legacy inventory-first list DSL (`# Module Inventory`) to Outline format (`# Product Part: <Title>`) with Identity table, Purpose prose, `## Owned Clusters` with module tables, and `## Standalone Modules` — fully aligned with the existing Outline parser path.
- Continuation prompts for `generate_product_part` substeps now embed the canonical product-part template content, so the agent no longer relies on "memory" from the first turn and format drift is eliminated.
- Parser compatibility shim added for existing drift files: `## Cluster Ownership` section and `### Cluster: \`id\`` headers now recognized alongside canonical forms.
- Semantic validation hardening: aggregate compose now explicitly rejects Product Part files that parse OK but contain zero Clusters and zero Modules, instead of silently producing shallow results.
- Bundled template delivery layer regenerated and synced with canonical source assets.

## [1.1.776] - 2026-03-23
### Fixed
- `Diagram Modules` now accepts the live identity-table `product-parts/<part-id>.md` continuation format (`# Product Part: ...`, `## Identity`, `## Owned Clusters`, module rows with `Status`), so the first materialized part no longer fails on the legacy `- \`part_id\`: ...` expectation.
- The shared staged parser now tolerates both `Owned Clusters` / `Cluster Inventory` aliases and both three-column and four-column module tables, keeping progressive graph materialization aligned with the actual agent-authored markdown.
- Added aggregate regression coverage for the same identity-table format, so `module-inventory.md` must still be composed from the live continuation files that power the progressive `Diagram Modules` graph.

## [1.1.775] - 2026-03-23
### Fixed
- `Diagram Modules` now accepts the live `product-parts.index.md` canonical-order heading format (`## Canonical Order`, `### <n>. \`part-id\``, `Name:`, `Purpose:`), so the stage no longer produces an empty graph or stalls hidden continuation when the agent writes the newer index shape.
- The same parser recovery now powers both the client-side staged skeleton and the server-side `diagramModulesProgress` snapshot, restoring `Product Part` cards and automatic continuation together instead of leaving one path behind.
- Added regression coverage for the live canonical-order heading format while keeping the earlier ordered-list and table-based index variants intact.

## [1.1.774] - 2026-03-23
### Fixed
- `Diagram Modules` now accepts the live outline `product-parts/<part-id>.md` continuation format (`# Product Part: ...`, `## Purpose`, `## Cluster Inventory`, `## Direct Standalone Modules Under This Part`) in the shared staged parser, so the first materialized part no longer crashes on the legacy `# Module Inventory` title requirement.
- The same shared parser keeps backward compatibility with the earlier table-based staged `Product Part` format from `1.1.773`, so progressive rendering and runtime aggregate composition continue to work across both live continuation shapes.
- Added explicit aggregate regression coverage for the outline format, so `module-inventory.md` must still be built from the same live continuation files that power the progressive graph.

## [1.1.773] - 2026-03-23
### Fixed
- `Diagram Modules` now parses the live human-readable staged `product-parts/<part-id>.md` format in the progressive loader, so the first continuation file expands the graph instead of failing on legacy `Metadata`, `Simple Relations`, or flat inventory section requirements.
- Compatibility aggregate composition now uses the same staged `Product Part` parser, allowing runtime to build `module-inventory.md` from the real continuation files after the staged sequence completes.
- Added regression coverage for both paths: the progressive UI must accept the live staged part format, and aggregate composition must emit canonical inventory DSL from those same files.

## [1.1.772] - 2026-03-23
### Fixed
- `Diagram Modules` `Source` now becomes available as soon as `product-parts.index.md` exists; the availability gate no longer waits for `module-inventory.md` before opening the staged canonical artifact.
- `Diagram Modules` now reads the live Markdown table format under `Canonical Product Parts`, so the first `product-parts.index.md` immediately produces a visible staged skeleton instead of an empty canvas.
- The same table-format parser recovery restores hidden continuation after the index write by resolving planned parts and the next `currentPartId` from the real live artifact shape.
- Added regression coverage for both fixes: `Source` availability must follow `product-parts.index.md`, and staged parser tests now accept the live table-based index alongside the earlier heading/list formats.

## [1.1.771] - 2026-03-23
### Fixed
- `Diagram Modules` now reads both the legacy `### Product Part: ...` index blocks and the live numbered `Canonical order` format written by the staged agent, so the first `product-parts.index.md` immediately produces a visible React Flow skeleton instead of an empty canvas.
- The same parser recovery restores the hidden continuation path after the index write: `diagramModulesProgress` again resolves the next `currentPartId`, which prevents the stage from stalling on `substep: index` when the live numbered format is used.
- `Diagram Modules` panel/source surfaces now treat `product-parts.index.md` as the primary stage artifact: intro copy, source label/path, and pending messaging no longer point users back to `module-inventory.md` as if the stage were still inventory-first.
- Empty-state messaging in the visual shell now explains the staged `index -> product-parts/<part-id>.md -> runtime aggregate` flow, replacing the misleading suggestion to “add semantic entities” or rerun the step while staged materialization is still in progress.

## [1.1.770] - 2026-03-23
### Changed
- `Diagram Modules` prompt composition now states exact current-turn inputs and explicit non-inputs, so the stage no longer suggests searching compatibility inventory, staged examples, continuity files, legacy helper artifacts, or generic templates unless runtime explicitly passed them.
- `Diagram Facades` now follows the same strict input contract: author from the current `module-inventory.md`, embedded appendix content, and explicitly listed project files instead of spending a turn on continuity/template scouting.
- Diagram-stage contract assembly now injects staged templates, field references, and merge rules directly into the prompt payload while removing the generic stage-level `templatePath` hint for both `diagram_modules` and `diagram_facades`.

### Fixed
- Closed the follow-up `1.1.769` composite prompt drift found during live retest, where the agent could still produce discovery chatter such as checking compatibility inventory, staged examples, or a missing formal staged template before writing the real artifact.
- Added regression coverage for diagram prompt/contract composition, so legacy strings, unwanted template hints, and weakened strict-input restrictions are caught before the next release.

## [1.1.769] - 2026-03-23
### Changed
- `Diagram Modules` live prompt/template surface now follows one explicit staged contract: first `product-parts.index.md`, then one `product-parts/<part-id>.md` per hidden continuation, while `module-inventory.md` remains runtime-owned compatibility output.
- Bundled template delivery now includes dedicated staged templates for `product-parts.index.md` and a single materialized `Product Part`, so synced `~/.codeai-hub/templates/diagram_modules/...` assets match the repaired PM prompt surface instead of only shipping the old monolithic inventory template.

### Fixed
- Hidden `Diagram Modules` continuation now rereads `workflowState` after `turn_completed`, so direct file-write / file-change Codex turns continue automatically even when no `structured_output` event is emitted.
- Added regression coverage for the live failure mode `index written -> no structured_output -> continuation still starts`, reducing the chance that future transport-path changes silently break staged orchestration again.

## [1.1.768] - 2026-03-23
### Changed
- `Diagram Modules` now starts from `product-parts.index.md` and then materializes one `product-parts/<part-id>.md` at a time, so the stage can progressively reveal the system instead of waiting for one giant inventory turn.
- React Flow now follows the staged `Product Part` order from the index artifact, shows visible generation progress in Project Manager, and keeps the graph readable while new parts appear.
- Runtime now composes `module-inventory.md` as a compatibility aggregate after the last `Product Part`, preserving the downstream single-file contract for `Diagram Facades` without giving that file back to the agent as the primary authoring target.

### Fixed
- `Diagram Facades` remains blocked until the full `Diagram Modules` product-part sequence reaches `awaiting_review` and the compatibility aggregate exists; intermediate staged part files no longer unlock the next step too early.
- `Codex` no longer aborts long silent diagram turns on a hard idle timeout while the provider is still working, which removes the failure mode where large `Diagram Modules` sessions died before `structured_output`.
- Late provider assistant/commentary messages now preserve their original provider timestamps in the session transcript even if they arrive after `turn_completed`, reducing drift between raw provider logs and the infinite session history.

## [1.1.767] - 2026-03-23
### Changed
- `Product Part` purpose panels in `Diagram Modules` now claim a wider right-side column, reducing artificial line wrapping in dense review scenarios.
- The dense `Diagram Modules` autolayout baseline now treats header/body separation as a two-pass measurement problem for both `Product Part` and `Cluster`, instead of relying on shortened header budgets.

### Fixed
- `Product Part` cluster sections no longer begin inside the visible purpose area when the top-level description is long; the body start now follows the measured bottom edge of the full header block.
- Cluster stacks now reserve enough space for long cluster descriptions before placing the first module card, eliminating the remaining overlap reported in the `1.1.766` retest.
- Standalone-band regression tests now validate layout invariants against measured cluster bottoms instead of brittle absolute coordinates, so second-pass header tuning does not break unrelated release gates.

## [1.1.766] - 2026-03-23
### Changed
- `Diagram Modules` is now explicitly documented as the primary user-review step before `Diagram Facades`, and `Product Part` / `Cluster` cards show short purpose text directly in the visual hierarchy.
- Dense `Diagram Modules` first-open layout now follows a deterministic `measure -> place` contract: cluster/module placement budgets are derived from content length instead of only from a fixed row step.

### Fixed
- Cluster containers now reserve header space for title/meta/purpose text, so tall module cards no longer collide with cluster headers or with the next module in the same stack.
- Standalone modules inside a `Product Part` now dock under the shorter measured column, and the product-part frame closes around the actual occupied content instead of leaving a large empty lower band.

## [1.1.765] - 2026-03-22
### Changed
- Runtime-synced `Diagram Modules` and `Diagram Facades` template packs are now localized for the user-facing surface: explanatory text is Russian, while DSL terms and field names remain English.
- Bundled template delivery is now regenerated from those localized source assets and verified by `TemplateSyncService`, so the synced `~/.codeai-hub/templates/...` copies match the release bundle instead of drifting behind repo changes.

### Fixed
- `Diagram Modules` first-open autolayout now gives stacked module cards inside clusters enough vertical space, eliminating the visible overlap regression from the `1.1.764` live pass.
- Standalone modules inside a `Product Part` now use tighter horizontal spacing, so the standalone band no longer stretches far wider than the cluster columns next to it.

## [1.1.764] - 2026-03-22
### Changed
- `Product Part` is now the canonical top-level term across `Description`, `Virtual Simulation`, and `Diagram Modules` help/prompt/template surfaces, replacing the longer explanatory wording that previously drifted away from the actual diagram DSL.
- `Diagram Modules` no longer treats `Role` as a required user-facing field in `module-inventory.md`; `Title`, `Purpose`, `Clusters`, and `Standalone Modules` now carry the semantic weight of the top-level ownership layer instead.

### Fixed
- The `Diagram Modules` parser remains backward-compatible with legacy inventories that still contain `Role:` under `Product Part`, but new serializer/template output no longer emits that field.
- The diagram UI now explicitly labels module cards as `Module` and demotes `Kind` (`service`, `store`, `library`, etc.) to a secondary label instead of letting the kind masquerade as the entity level.
- `Product Part` cards no longer show the removed display-only role tag; the visible hierarchy now reads through top-level ownership counts instead of a brittle role enum.

## [1.1.763] - 2026-03-22
### Fixed
- `Description Help` now explicitly matches the real `Submit questionnaire` flow: provider selection appears immediately after submit, the provider is chosen once per workflow workspace in the current MVP, and the dialog continues until the user considers the document strong enough for the next step.
- `Diagram Modules` and `Diagram Facades` runtime prompts no longer duplicate the appended `Field Reference` and `Merge Rules` blocks when both synced templates and bundled fallback assets are present.
- `Source` for `Diagram Modules` and `Diagram Facades` now shows workflow-aware pending copy before the canonical stage artifact exists, instead of opening the generic artifact surface with a `file not found` error.

## [1.1.762] - 2026-03-22
### Changed
- The live first workflow step is now consistently `Description` across Project Manager bootstrap, provider picker, workflow start/fix flows, and active SSOT documents; `Idea / Idea Collector` no longer appears as user-facing product semantics for the current workflow.
- Cleanup documentation now explicitly classifies the remaining legacy `idea-*` zone as internal compat helpers, provider parser internals, redirect-only aliases, or disabled old-flow remnants instead of presenting it as active architecture.

### Fixed
- `build-all` / `build-core` no longer try to build or stage the removed `@codeai-hub/idea-collector` package during local release packaging.

### Removed
- Unused PM legacy wrappers and provider accessors that no longer had active callers after the `Description` naming migration.

## [1.1.761] - 2026-03-22
### Fixed
- `Description Help` in Project Manager now renders locally by the same pattern as the other workflow step helps, instead of depending on `description-contract` and runtime template availability.
- Closed the UI architecture regression where `Description` alone could degrade into `template недоступен` while `Virtual Simulation`, `Diagram Modules`, and `Diagram Facades` already used stable built-in help surfaces.

## [1.1.760] - 2026-03-22
### Fixed
- `Description` workflow contracts now self-heal missing synced visible templates: if `~/.codeai-hub/templates/description/description-template.md` is absent, runtime restores it from the bundled release assets before serving `Description Help` or the `description-contract`.
- Closed the regression where the `Description` `Help` button could degrade to `template недоступен` immediately after install/restart even though the release already contained the canonical help/template markdown.

## [1.1.759] - 2026-03-22
### Changed
- `Description` now has a stricter document-level DoD: `Final_Description.md` must contain an explicit user-readable scenario section, and the number of scenarios is driven by product coverage instead of a fixed cap.
- The visible `Description Help` surface now comes from the same synced markdown template that runtime ships into `~/.codeai-hub/templates/description/description-template.md`, so pre-submit help and post-submit `Help` tab can no longer drift apart.

### Fixed
- Closed the remaining `Description` drift where scenario coverage could stay implicit inside narrative sections even when the questionnaire already contained concrete user flows.
- Closed the help-source split where Project Manager held one copy of `Description Help` in React and runtime/contracts shipped another copy through the bundled template layer.

## [1.1.757] - 2026-03-22
### Changed
- `Description` runtime questionnaire is now universal for any software product: the question order is a simple-to-complex ladder, `тип продукта / платформа` moved near the top, and the stage now explicitly offers cluster-modular architecture as a recommended way to describe a product for AI instead of assuming internal CodeAI terminology.
- `Description Help` now explains the same universal baseline as the installed questionnaire, including why cluster-modular architecture is recommended and how users can answer in plain language without pre-knowing `shell` / `cluster` / `module` vocabulary.
- Downstream `Description`, `Virtual Simulation`, and `Diagram Modules` prompts now explicitly treat the questionnaire as universal input: they must infer architecture from user language and project-local artifacts instead of expecting product-specific workflow facts or ready-made module lists in `Description`.

### Added
- A full `Diagram Facades` runtime prompt surface aligned with the current workflow contract: artifact-first behavior, project-local source boundaries, direct dependence on `module-inventory.md`, and user-readable facade/relation authoring guidance.
- Matching `Diagram Facades Help` guidance in Project Manager, so the visible UI now explains the same boundary-map baseline that the runtime prompt expects.

### Fixed
- Closed the prompt/help drift where `Diagram Facades` still used a minimal generic prompt while upstream stages already followed the richer artifact-first greenfield contract.
- Closed the downstream expectation drift where later stages could overread `Description` as if it already contained technical architecture vocabulary, fixed workflow facts, or a finished module inventory.

## [1.1.756] - 2026-03-21
### Changed
- Empty-workspace `Virtual Simulation` and `Diagram Modules` runtime prompts now explicitly restrict themselves to project-local artifacts, current-stage continuity files, and files the user named for the current project, instead of drifting into internal CodeAI Hub implementation context.
- `Diagram Modules` user-facing prompt/reference/template surface now treats `Product Part` ownership as parser-critical authoring contract: `Clusters:` / `Standalone Modules:` must exactly match nested blocks, and the runtime-visible template/checklist now calls that out directly.
- Pending `Artifacts` surfaces for `Virtual Simulation`, `Diagram Modules`, and `Diagram Facades` now reuse the exact same help content as the `Help` tab, so the stage intro no longer diverges before the first canonical artifact exists.

### Added
- Ownership-aware regression coverage for first-open `Diagram Modules` layout: top-level `Product Part` rows, dedicated standalone-module band placement, and external provider boundary projection outside product-part containers.

### Fixed
- Closed the greenfield prompt drift where diagram stages could consult internal parser/runtime code instead of staying inside the current project artifact boundary.
- Fixed the first-open `Diagram Modules` readability regressions where wide product parts could overlap, internal standalone modules could blow out container width, and the selected external AI provider could render as if it were inside a product part.

## [1.1.755] - 2026-03-21
### Changed
- `Description`, `Virtual Simulation`, and `Diagram Modules` now share the approved compact runtime surface: user-facing help, runtime prompts, and visible template delivery all use the same glossary, artifact-first baseline, and stop-questioning contract.
- `Virtual Simulation` now treats the old runtime scenario cap as a formatting concern only; the prompt surface explicitly requires enough combined scenario coverage to expose the whole visible system.
- `Diagram Modules` now moves from the flat inventory baseline to `Product Part -> Cluster -> Module`, so top-level ownership is part of the semantic model instead of being hidden in notes or flattened into decorative clusters.

### Added
- New `ProductPartEntity` / ownership-aware `ModuleMapModel` contract in the diagram DSL runtime, including explicit `productPart` ownership on clusters and modules.
- Dual-read parser migration for `module-inventory.md`: legacy flat inventories now materialize a synthetic `default-product-part`, while v2 inventories preserve explicit product-part hierarchy.
- Nested React Flow rendering for `Diagram Modules`: product parts render as top-level containers, clusters render as child containers, and standalone modules stay inside their owning product part.
- Ownership-aware sidecar coverage proving that `module-map.flow.json` still stores only layout coordinates and only replays them when the diagram revision matches.

### Fixed
- Closed the greenfield diagram flattening gap where prompts could already express ownership/runtime placement, but the visible diagram still collapsed everything into one flat `cluster + module` layer.
- Synchronized the runtime-visible prompt/help surface and the bundled template checks so the installed app delivers the same compact contract that the codebase assets now define.

## [1.1.754] - 2026-03-20
### Changed
- `Description` now starts the greenfield polygon grammar earlier: the prompt surface explicitly captures application archetype, visible deployable/runtime contours, and candidate system boundaries instead of only product narrative.
- `Virtual Simulation` now turns upstream scenarios into `archetype-aware shell constraints`, candidate clusters, standalone modules, and simple boundary-sensitive interactions for downstream diagram work.
- `Diagram Modules` prompt grammar now treats clusters as formal subsystem containers with nested modules, keeps standalone modules outside clusters by default, and discourages loose analytical labels such as `core`, `shared`, `services`, or `stores`.

### Added
- Contract and sync coverage for the new polygon surface:
  - `virtual-simulation` contract smoke-checks now assert the new architecture-aware prompt sections
  - `diagram_modules` contract tests now verify bundled prompt/template invariants for cluster containers and standalone modules
  - template-sync tests now verify that `Description`, `Virtual Simulation`, and `Diagram Modules` ship the updated visible prompt surface into `~/.codeai-hub/templates`

## [1.1.753] - 2026-03-20
### Changed
- `Codex gpt-5.4` resume no longer unconditionally starts a fresh thread during ordinary reopen/recovery; the provider now reuses the existing thread id by default.
- Project Manager cold-open bootstrap now deduplicates runtime restore requests per dialog continuity entry, so repeated `dialog:list` refreshes do not spam the same stale `providerSessionId`.

### Fixed
- Core continuity now eagerly tracks freshly rebound runtime sessions, preventing continuity/index drift when a recovered dialog is rebound before the next outbound user turn.
- Closed the reopen/recovery loop where `diagram_modules` dialogs could remain stuck in `Agent is working… Please wait.` after restarting Project Manager / Core with no `module-inventory.md` yet on disk.

## [1.1.752] - 2026-03-19
### Changed
- `Diagram Modules` now treats `module-inventory.md` as the only semantic workspace artifact for the stage; `module-map.flow.json` remains the layout-only sidecar used by the visual canvas.
- `Diagram Facades` now starts and gates from `module-inventory.md`, aligning the downstream contract with the actual inventory-first workflow.
- Project Manager help/pending copy, loader paths, and runtime prompts no longer advertise a raw `module-map.md` file as part of the visible `Diagram Modules` contract.

### Fixed
- Removed the last inventory-only regression tails where PM/runtime/docs still mixed the old `module-map.md` workspace contract into start, gating, and repair expectations.

## [1.1.751] - 2026-03-19
### Changed
- `Diagram Modules` now starts from an explicit inventory-first session prompt: the agent sees `Final_Description.md` and `virtual-simulation.md`, targets `module-inventory.md`, and is told to follow `read -> discuss inventory -> derive module map`.
- `Fix with agent` now opens the correct dialog session for the active workflow stage and forwards the current parse/validation error into that session as a repair prompt.

### Fixed
- Saving `module-inventory.md` now automatically materializes the derived `module-map.md`, so `Diagram Facades` and downstream gating no longer stall when only the agreed inventory exists.
- Corrected the broken `v1.1.750` PM/runtime split where `Diagram Modules` still targeted `module-map.md` directly and a parse failure could not be sent back into the agent session from the repair button.

## [1.1.750] - 2026-03-19
### Changed
- `Diagram Modules` now derives the visible `module-map.md` from `module-inventory.md` before React Flow projection, so the inventory stays the first agreement layer and the visual diagram remains cluster-aware.
- `Diagram Modules` help/pending copy now explains the inventory-first flow and the derived visual map.

### Fixed
- `Diagram Modules` no longer depends on the raw `module-map.md` file as the first semantic handoff when the inventory agreement already exists.

## [1.1.749] - 2026-03-19
### Changed
- `Diagram Modules` and `Diagram Facades` now expose a visual-only manual-layout surface: the visible UI no longer shows `Auto-layout`, layout profiles, `Edit Modules`, `Edit Relations`, or the facade editing sections.
- `*.flow.json` continues to store only user-owned geometry, and the bottom-right minimap was removed so the canvas keeps more room for the graph itself.
- Semantic changes are now handled through agent-driven updates or direct canonical Markdown editing, keeping the main surface layout-first.

### Fixed
- Removed the launcher-risky inline semantic editing surface from the diagram panels, which left the UI focused on navigation, manual layout, and read-only source inspection.

## [1.1.748] - 2026-03-19
### Changed
- `Diagram Modules` and `Diagram Facades` now follow a manual-layout-first contract: the visible diagram surface no longer exposes `Auto-layout`, `Vertical`, `Horizontal`, `Compact`, `Fill space`, or the old `Layout saved` chrome.
- The diagram editor shell is now simplified to React Flow rendering plus persisted manual drag positions; `*.flow.json` stores only user-owned geometry and no longer carries ELK profile state.
- `Edit Modules`, `Edit Relations`, and the facade editing sections remain available as secondary inline DSL editors beneath the main diagram surface.

### Fixed
- Removed the whole ELK-driven runtime pipeline from the product UX, so manually corrected diagram compositions are no longer at risk of being re-imposed by a fallback auto-layout action.

### Removed
- The runtime dependency `elkjs`.

## [1.1.746] - 2026-03-19
### Fixed
- `Diagram Modules` layout profile choice now takes effect immediately on the current graph instead of only changing local UI state with no visible impact.
- The selected profile is now persisted in `module-map.flow.json`, so reopening or restarting Project Manager restores the last chosen mode instead of reverting to the default vertical layout.

### Changed
- The launcher-safe toolbar control introduced in `1.1.745` is now connected to the actual flow-state lifecycle: profile selection immediately triggers a fresh layout pass and saves the resulting profile together with node positions.

### Added
- Targeted coverage for layout-profile restore flow: sidecar parse/serialize now covers `layoutProfile`, and source-level checks verify that `Diagram Modules` restores the profile from sidecar and auto-applies it through the shared shell.

## [1.1.747] - 2026-03-19
### Fixed
- `Diagram Modules` no longer renders module nodes through a broken cluster-parent nesting path that could hide real ELK coordinate changes from the visible React Flow canvas.
- Layout profile switching (`Vertical`, `Horizontal`, `Compact`, `Fill space`) should now change the actual diagram surface instead of only updating persisted flow-state.

### Changed
- The diagram shell now uses explicit node renderers for `cluster`, `module`, and `facade`, so the canvas reflects the corrected runtime projection rather than React Flow fallback rendering.
- `Diagram Modules` clustered modules are now projected as top-level visual nodes, which keeps profile-driven layout changes visible and avoids fake parent geometry interfering with React Flow placement.

### Added
- Targeted projection coverage proving that `Diagram Modules` clustered modules no longer rely on `parentId` / `extent="parent"` for their visual layout contract.

## [1.1.745] - 2026-03-19
### Fixed
- `Diagram Modules` no longer uses a native HTML `<select>` for layout profile choice inside the Project Manager launcher.
- This closes the new macOS launcher crash from `v1.1.744`, where opening the profile chooser and selecting `Vertical` could collapse the whole CEF window through an AppKit exception path outside the React/ELK layer.

### Changed
- The four approved profiles `Vertical`, `Horizontal`, `Compact`, and `Fill space` are now exposed through a custom toolbar button-group next to `Auto-layout`.
- The layout algorithms themselves are unchanged in this corrective release; the scope is launcher stability and safe profile selection.

### Added
- Targeted regression coverage proving that the diagram toolbar no longer renders a native `<select>` for layout profiles.

## [1.1.744] - 2026-03-18
### Changed
- `Diagram Modules` now exposes multiple concrete layout profiles next to `Auto-layout`: `Vertical`, `Horizontal`, `Compact`, and `Fill space`.
- The new `Fill space` profile is intended to occupy the available canvas area instead of leaving the module graph compressed into a single long strip.
- The `Diagram Modules` artifact surface now stretches to the full available height of the right panel, so the canvas absorbs spare vertical space and collapsed editing sections no longer float above a large empty lower area.

### Added
- Targeted coverage for the new layout-profile contract and for the full-height stage scaffold behavior.

## [1.1.743] - 2026-03-18
### Fixed
- Shared diagram auto-layout feedback: `Diagram Modules` and `Diagram Facades` now refit the live React Flow viewport immediately after the new ELK layout is applied, so the user sees the rearranged graph in the current screen instead of only after leaving and reopening the stage.
- This closes the newly confirmed UX bug where `Auto-layout` persisted fresh node positions into `module-map.flow.json` / `facade-map.flow.json` but left the active canvas on a stale camera framing until remount.

### Changed
- The shared diagram shell now emits an explicit viewport-refresh signal after both:
  - the first automatic layout when the diagram has no meaningful saved positions yet;
  - a manual click on the `Auto-layout` button.
- The shared React Flow facade now performs an in-place `fitView` when that signal arrives, without changing the `Artifacts | Source | Help` contract or exposing the internal `*.flow.json` sidecar.

## [1.1.742] - 2026-03-18
### Changed
- Repository-wide duplication debt is back under control: `jscpd` now reports `1207` duplicated lines out of `447` scanned sources, or `2.8%`, which is below the enforced `3%` threshold.
- The duplication gate is now single-source: `check-architecture.sh`, `npm run check:dup`, and release packaging all run the same repo-wide duplication command instead of disagreeing about the scanned surface.
- The largest diagram-related clone clusters were collapsed into shared building blocks:
  - shared provider option dialog shell for Codex/Gemini settings
  - shared diagram stage scaffold for `Diagram Modules` / `Diagram Facades`
  - shared relation editor shell for module/facade relation editing
  - shared dialog-segment meta helper across PM and UI surfaces

### Fixed
- Release builds no longer emit the recurring repository-wide duplication advisory that had been hovering around `4.17%` to `4.25%` in recent diagram releases.

## [1.1.741] - 2026-03-18
### Changed
- Project Manager diagram stages now expose an explicit `Artifacts | Source | Help` contract: `Artifacts` keeps the visual diagram primary, `Source` shows read-only canonical Markdown, and `Help` remains separate guidance.
- `Diagram Modules` and `Diagram Facades` reopen back into the visual diagram instead of silently replacing the right panel with raw `module-map.md` / `facade-map.md`.
- Both diagram panels are now diagram-first surfaces: the canvas renders before semantic editing controls, internal `artifact -> sidecar` path chrome is removed from the default UI, and `*.flow.json` stays hidden as a runtime-only sidecar.
- The shared React Flow shell now supports manual node repositioning in addition to optional `Auto-layout`, and those layout changes persist across reopen/resume without changing semantic Markdown DSL content.

### Added
- Regression coverage for the new diagram header/source contract and updated facade-shell chrome.

### Known Issues
- Dense diagrams can still require manual layout cleanup after the first automatic placement; this release makes that path available and persistent, but does not yet redesign the graph projection itself.

## [1.1.740] - 2026-03-18
### Fixed
- Diagram workflow contract delivery: `Diagram Modules` / `Diagram Facades` now inject their strict field-reference and merge-rules assets directly into the emitted prompt, so the provider sees the canonical DSL enum constraints before generating the first artifact.
- This closes the newly exposed post-launch failure where a session started correctly but produced a non-renderable `module-map.md` with invalid enum values such as `Kind: application`.

### Changed
- Added regression coverage for diagram-stage contract assembly, proving that both contracts now embed field-reference and merge-rules text into the final prompt payload.
- Synchronized `SystemArchitecture`, the audit plan, and the recovered `todo-plan` around the stricter diagram contract requirement: fresh stage success now means both `session` launch and immediate PM parseability of the first artifact.

### Known Issues
- This release fixed prompt-contract parseability but still left the user-facing surface unfinished; the follow-up `1.1.741` release moves the diagram itself back to the primary panel and adds `Source` as the explicit secondary debug view.

## [1.1.739] - 2026-03-18
### Fixed
- Core workflow-state recovery: `/workflow-state` now hydrates canonical workflow artifacts from disk on cold start, so `Diagram Modules` / `Diagram Facades` no longer stay silently blocked just because the current Core/watchers lifetime missed the original filesystem events.
- Diagram-stage gating now follows the agreed manual-transition contract: if `virtual-simulation.md` or `module-map.md` exists, the next toolbar step unlocks even when the upstream stage is currently marked `invalid` or `outdated`.

### Changed
- Added regression coverage for cold-start workflow-state hydration and for the case where an invalid upstream `virtual-simulation.md` must remain diagnostically invalid but still allow manual launch of `Diagram Modules`.
- Synchronized `SystemArchitecture`, the audit plan, and the recovered `todo-plan` around the corrected bootstrap contract: stage validation state and next-step start gating are now treated as separate concerns.

### Known Issues
- This release closes the three confirmed gating/bootstrap blockers. Live verification of the deeper runtime path `session:create -> session:created -> session:binding -> sendSessionMessage` remains open until the new VSIX is rechecked in the running UI.

## [1.1.738] - 2026-03-18
### Fixed
- Project Manager diagram-stage bootstrap: `Diagram Modules` and `Diagram Facades` no longer require the upstream workflow stage to be exactly `completed` before a fresh toolbar launch. If the canonical upstream artifact already exists and gating is open, the next-step session can now start.

### Changed
- Added behavioral regression coverage for diagram-stage bootstrap, verifying that artifact availability is sufficient for launch while blocked gating still rejects the start.
- Synchronized `Workflow_CLI`, `WorkflowSteps_Overview`, and `SystemArchitecture` around the corrected launch contract for `Diagram Modules` / `Diagram Facades`.

### Known Issues
- This release fixes the first confirmed toolbar-bootstrap blocker. The broader audit of `session:create -> session:created -> session:binding -> sendSessionMessage` remains open until the full fresh-start path is revalidated in the running UI.

## [1.1.737] - 2026-03-16
### Added
- Hardening coverage for the interactive diagram workflow: concurrent merge regression tests, continuity normalization guards for `diagram_modules` / `diagram_facades`, Markdown DSL BOM/CRLF parsing checks, serializer CRLF normalization checks, and targeted tree-node status coverage for diagram branches.

### Changed
- Project Manager visual shell now keeps the last ready diagram visible during background refresh instead of blanking the canvas on every poll; empty graphs expose an explicit placeholder, and auto-layout failures surface through the shared save-status indicator.
- Workflow tree child nodes under `Diagram Modules` and `Diagram Facades` now mirror the real stage status (`active`, `outdated`, `blocked`) and tooltip copy instead of always rendering as active children.
- Markdown DSL normalization is stricter and more fault-tolerant: parser input accepts UTF-8 BOM + CRLF files, while serializer output normalizes multiline text blocks back to canonical LF-based Markdown.

### Known Issues
- Starting a fresh toolbar session for `Diagram Modules` / `Diagram Facades` remains a deferred blocker outside this release scope; this release hardens parsing, semantic merge safety, and PM workflow visualization for already-existing diagram artifacts.

## [1.1.736] - 2026-03-16
### Added
- `Diagram Facades` semantic editing: Project Manager now exposes facade create/update/delete controls plus methods, ports, and facade relation editing directly on top of the visual shell.
- Local facade patch pipeline and facade relation patch pipeline now exist as explicit client-side domain transforms, giving the UI deterministic semantic updates before serialization back to `facade-map.md`.

### Changed
- Semantic facade edits now autosave into canonical `facade-map.md`, while `facade-map.flow.json` continues to store only layout/view state.
- Local edits preserve provenance by converting modified agent-owned facades and relations from `origin: agent` to `origin: merged`.
- The PM session now keeps a facade-specific patch queue and reapplies it over incoming facade-map refreshes, surfacing preserved-edit conflict warnings instead of discarding local semantic changes immediately.

### Known Issues
- Fresh toolbar bootstrap for `Diagram Modules` / `Diagram Facades` is still outside this release scope, so repeated-agent manual verification remains limited to workspaces where the diagram artifacts already exist.

## [1.1.733] - 2026-03-16
### Fixed
- Core runtime packaging: `build-core.sh` now ships `packages/agents/diagram-modules-agent/assets/` and `packages/agents/diagram-facades-agent/assets/` into the installed core runtime, so release builds can resolve the new Markdown DSL diagram contracts instead of missing the prompt/template assets.
- Template sync: startup cleanup now removes stale home-cache diagram templates `modules-diagram-prompt.md`, `modules-diagram-template.mmd`, `facades-graph-prompt.md`, and `facades-graph-template.mmd`.

### Changed
- Corrective validation target for this release is the real installed workflow surface: `Diagram Modules` / `Diagram Facades` must start from the toolbar using Markdown DSL assets, while local `~/.codeai-hub/templates` must no longer expose the removed Mermaid diagram files.

## [1.1.734] - 2026-03-16
### Added
- Project Manager visual shell: `Diagram Modules` and `Diagram Facades` now render canonical Markdown DSL artifacts through a read-only React Flow canvas with ELK first-layout and an `Auto-layout` action.
- Flow sidecar persistence: `module-map.flow.json` and `facade-map.flow.json` are now loaded and saved from the PM side so layout survives reopen/resume without semantic writes into the canonical `.md`.

### Changed
- Diagram panels no longer default to raw Markdown-only rendering once `module-map.md` / `facade-map.md` exist; the primary user-facing surface is now the visual shell, while `.md` remains the semantic SSOT.
- Browser bundle compatibility: the diagram DSL parser path now has a browser-safe revision fallback, allowing PM/UI to parse canonical diagram artifacts without bundling `node:crypto`.
- Validation target for this release moves from contract alignment to visible diagram inspection: render `module-map.md`, render `facade-map.md`, use `Auto-layout`, persist `*.flow.json`, and verify layout restoration after reopen.

### Known Issues
- Starting a fresh toolbar session for `Diagram Modules` / `Diagram Facades` remains a deferred blocker outside this release scope; this release focuses on visualizing and persisting already-created diagram artifacts.

## [1.1.735] - 2026-03-16
### Added
- `Diagram Modules` semantic editing: Project Manager now exposes module create/update/delete controls and relation create/update/delete controls on top of the visual shell.
- Local module patch pipeline and relation patch pipeline now exist as explicit client-side domain transforms, giving the UI deterministic semantic updates before serialization back to `module-map.md`.

### Changed
- Semantic edits now autosave into canonical `module-map.md`, while `module-map.flow.json` continues to store only layout/view state.
- Local edits preserve provenance by converting modified agent-owned module entities and relations from `origin: agent` to `origin: merged`.
- The PM session now keeps a local patch queue and reapplies it over incoming module-map refreshes, surfacing conflict warnings instead of discarding local semantic changes immediately.

### Known Issues
- Fresh toolbar bootstrap for `Diagram Modules` / `Diagram Facades` is still outside this release scope, so repeated-agent manual verification remains limited to workspaces where the diagram artifacts already exist.

## [1.1.732] - 2026-03-16
### Fixed
- Project Manager: toolbar start, gating, artifact availability, tree labels, and panel/help copy for `Diagram Modules` / `Diagram Facades` now follow `module-map.md` and `facade-map.md` instead of the removed Mermaid `.mmd` files.

### Changed
- UI/PM contract: the active diagram workflow surface no longer exposes `modules-diagram.mmd` or `facades-graph.mmd` as user-facing canonical artifacts.
- Validation target for this release shifts from runtime foundation only to an actual PM smoke: stage launch from the top toolbar and opening canonical `.md` artifacts from the tree.

## [1.1.731] - 2026-03-16
### Added
- Core diagram DSL foundation: strict Markdown parsers/serializers for `module-map.md` and `facade-map.md`, revision metadata helpers, and baseline diff/change-summary services for repeated agent runs.
- Agent packages: dedicated asset packs for both diagram workflow steps (`prompt`, `template`, `field-reference`, `merge-rules`) now live under `packages/agents/diagram-modules-agent/assets/` and `packages/agents/diagram-facades-agent/assets/`.

### Changed
- Workflow runtime: canonical diagram artifacts are now `module-map.md` / `facade-map.md` plus auxiliary `*.flow.json` and `*.agent-baseline.md`; legacy Mermaid `.mmd` files are no longer part of the active workflow contract.
- Workflow prompts: runtime now assembles diagram prompt packs from agent-owned assets and injects generated `Change Summary` blocks instead of relying on legacy bundled Mermaid templates.
- Docs/SSOT: synchronized `System/WorkflowSteps_Overview.md`, `Workflow_CLI.md`, and `SystemArchitecture.md` so Diagram Modules / Facades explicitly describe the Markdown DSL triplet and the non-semantic role of `*.flow.json`.

## [1.1.730] - 2026-03-15
### Fixed
- Core continuity arbitration: flow-node/document-node rollover is now deferred to the post-turn boundary, so a low remaining-context `token_usage` snapshot can no longer preempt an active user one-shot turn before `turn_completed`.

### Changed
- Tests: added regression coverage for both provider event orders, guarding `Gemini` (`token_usage -> turn_completed`) and `Claude/Codex` (`turn_completed -> token_usage`) plus cache reset between outbound turns.
- Docs/SSOT: synchronized the continuity contract so `token_usage` acts as post-turn arbitration input, trailing usage can complete pending decisions, and cached usage from a previous turn cannot leak into the next one.
- Validation: manual `Gemini` document-node smoke on March 15, 2026 confirmed that the active one-shot turn in `v1.1.730` now completes before continuity handoff/bootstrap starts.

## [1.1.729] - 2026-03-15
### Fixed
- Gemini dialog history: `GeminiMessageProcessor` now flushes each assistant segment on `finished`, and `GeminiSessionManager` suppresses the old final aggregate `assistant` block when segmented replies were already emitted through `dialog_message`.

### Changed
- Tests: added regression coverage for both Gemini paths: segmented `content -> finished` delivery without duplicate final assistant output and fallback aggregate delivery when a turn ends without a `finished` segment flush.
- Docs/SSOT: synchronized the architecture invariant that provider normalization layers must preserve real assistant segment boundaries instead of collapsing them into a single post-turn blob.

## [1.1.728] - 2026-03-15
### Fixed
- Core transport: `WebSocketManager` now caches canonical `usage_limits` stream-events and replays them after websocket connect and workspace-scope changes, so `Codex` usage limits survive late `Project Manager` / `Session UI` attach instead of disappearing after the first live emission.

### Changed
- Tests: replaced the previous source-level `WebSocketManager` guard with a live websocket regression that verifies out-of-scope `usage_limits` are filtered live but replay correctly after scope switch with `providerScopeKey` preserved.
- Docs/SSOT: synchronized the architecture invariant that stateful session signals such as `token_usage` and `usage_limits` must have replay-safe delivery across scope rebinds.

## [1.1.727] - 2026-03-14
### Added
- Core: introduced a universal provider usage-limits module in `packages/core`, with shared types/cache/facade, provider-specific readers/normalizers, and a canonical `providerScopeKey` contract for `Claude`, `Codex`, and `Gemini`.

### Changed
- Claude, Codex, and Gemini now emit usage limits through the same shared pipeline `reader -> normalizer -> shared snapshot -> compat stream payload`; live provider surfaces are primary, while provider-specific fallback paths remain secondary.
- Codex usage limits now prefer runtime payloads and `app-server account/rateLimits/read`; rollout JSONL is retained only as fallback rather than the main source.
- Session UI and Project Manager now cache/fan-out usage limits by `providerScopeKey`, and `Session ID bar` renders provider-aware labels from the shared snapshot instead of hardcoded `session/weekly`.

### Fixed
- Usage-limits refreshes now expose source-aware diagnostics (`cache_hit`, `fresh_read`, `fallback_cached`, `unavailable`), making fallback/debug analysis explicit in the shared facade and Codex runtime logs.

## [1.1.726] - 2026-03-14
### Fixed
- Codex runtime: saved `providers.codex.defaultModel` from `~/.codeai-hub/settings/settings.json` now wins over stale `CODEX_DEFAULT_MODEL` in long-lived core/provider processes, so a user-selected `gpt-5.4` no longer silently starts new turns as `gpt-5.3-codex`.

### Changed
- Tests: added regression guards in both core config and Codex SDK manager to lock the priority order `settings snapshot -> env fallback -> hardcoded/workspace fallback` for Codex default model resolution.

## [1.1.725] - 2026-03-14
### Changed
- Documentation lifecycle: introduced `doc/SolidWorks-WorkFlow/Plans/` as the only place for pre-implementation planning docs before `doc/TODO/todo-plan.md`; implemented SSOT remains only in `System/`, `Clusters/`, `Modules/`, and `Contracts/`.
- Agent instructions governance: `AGENTS.md` is now the sole git-tracked instruction source, while local `GEMINI.md` and `.claude/CLAUDE.md` are reduced to redirect notes outside repository tracking.

## [1.1.724] - 2026-03-13
### Changed
- Description workflow: removed the last product-visible legacy `description` architecture tails from PM/UI, core artifact routing, bundled fallback schemas, and active SSOT docs; the release now presents only the canonical `questionnaire.md` -> `Final_Description.md` flow.

### Fixed
- Project Manager: `questionnaire.md` no longer exposes the old manual `↻ Restart attempt` control, and compat `draftPath` no longer leaks the label `description.md` into tree/main-area routing.
- Core: obsolete `/api/v1/orchestrator/idea-artifact` transport and the remaining restart-era artifact bridge semantics are removed; active persistence stays on `/api/v1/orchestrator/artifact-upsert`.
- Validation: added final regression guards for Description cleanup invariants and revalidated the cleanup contour with targeted core/webview builds and tests.

## [1.1.723] - 2026-03-13
### Changed
- Mainline release verification: the primary `main` branch was hard-synchronized with baseline line `v1.1.722`, so subsequent work and the release cycle now proceed from the verified response-mode stable baseline.

### Fixed
- Codex runtime: the baseline fix for response-mode session promotion (`Debug/Raw` / `Hybrid`) is now available directly from the primary `main`, without depending on a separate baseline worktree.

## [1.1.722] - 2026-03-13
### Fixed
- Codex runtime: preserved response-mode state across `temp session id -> real thread id` promotion, so `Debug/Raw` and `Hybrid` no longer fall back to the default structured-output config after `thread.started`.
- Codex dialog history: ordinary text replies from `gpt-5.4` in `Debug/Raw` once again reach downstream `assistant` persistence instead of disappearing after the provider rollout is promoted to the real thread id.

### Changed
- Tests: added a regression guard for the session-promotion path in `StructuredOutputStreamController`, covering both `Hybrid` and `Debug/Raw` passthrough behavior.

## [1.1.721] - 2026-03-13
### Added
- General Settings: a new dedicated `Response Mode` card for Codex with `Strict`, `Hybrid`, and `Debug/Raw`, kept separate from `Core Controls`.

### Changed
- Codex runtime now reads `general.responsePolicy` from the persisted settings snapshot; baseline workflow sessions default to `Hybrid`.
- `Strict` mode exposes editable schema/instruction text, while ordinary turns in `Hybrid` and `Debug/Raw` no longer inherit the baseline default JSON-only shaping automatically.
- Commentary suppression in the Codex messaging path is now response-policy-aware instead of unconditional.

### Fixed
- Codex SDK diagnostics preserve historical `sdk-codex-*.jsonl` content across `resume` on the same `thread_id`.

## [1.1.720] - 2026-03-12
### Changed
- Codex baseline settings/UI/runtime replace the general-purpose model `gpt-5.2` with `gpt-5.4`, while keeping `gpt-5.3-codex` as the dedicated coding model.
- Codex settings snapshots now persist only two user-facing model keys in `reasoningByModel`: `gpt-5.3-codex` and `gpt-5.4`.
- Stable baseline release rebuilt from the pre-`gpt-5.4` workflow line, avoiding later PM workflow-state/hydration refactors while updating only the Codex model selection surface.

## [1.1.711] - 2026-03-05
### Fixed
- Project Manager: a watchdog retry was added for cold-open history, so a stalled first `dialog:history` request (`cursor=0`) is automatically reset and retried through a forced route without user intervention.
- Project Manager: fixed an intermittent `No messages yet` case on workspace open where history appeared only after a second click on the session/stage in the left tree.

### Changed
- Tests: `dialog-session-snapshot-replay.test.ts` was expanded with watchdog invariant coverage (`pending timeout -> forced retry`).

## [1.1.710] - 2026-03-05
### Fixed
- Project Manager: fixed the first dialog-mode open race, so `dialog:history:result` is no longer lost between `dialog:list:result` and the session identity update.
- Project Manager: on cold-open workspace, stage dialog history (JSONL) now hydrates immediately without requiring a second click on `Virtual Simulation` or another workflow step.

### Changed
- Tests: added a `dialog-session-snapshot-replay.test.ts` guard for the order `bind sessionRef -> requestDialogHistory`.

## [1.1.709] - 2026-03-05
### Fixed
- Project Manager: fixed workflow navigation desync between the Toolbar, the left tree (stage/session/artifact), and auto-select; the active step is now synchronized through a single `activeStage` route.
- Project Manager: removed stage-specific exceptions (`skipSession`) from stage activation semantics, so selecting a step now consistently opens the aligned dialog session.

### Changed
- Project Manager: the right-side header was unified for all workflow steps (`<Step Name> + Artifacts/Help`), and `Artifacts/Help` now works across steps.
- Project Manager: added help panels for non-description stages (`Virtual Simulation`, `Diagram Modules`, `Diagram Facades`).
- Tests: added a `workflow-navigation.test.ts` guard to prevent regressions in stage-selection synchronization.

## [1.1.708] - 2026-03-05
### Fixed
- Session UI: token usage now hydrates correctly for dialog-mode sessions resumed from continuity (fixes Codex showing `0 tokens / 100%`).

## [1.1.707] - 2026-03-05
### Changed
- Rebuild of the stable workflow baseline from `v1.1.706` as the new main release line (no workflow approval markers).

## [1.1.706] - 2026-03-01
### Changed
- Virtual Simulation is now prompt-only (no artifact template shipped); the agent writes `virtual-simulation.md` from `Final_Description.md`.

### Fixed
- Workflow: aligned Virtual Simulation prompt-only status and gating checks for downstream stages.

## [1.1.701] - 2026-02-28
### Changed
- Description runtime/core: removed reviewer auto-runtime branch and fixed description session persistence to collector-only mode for active flow.
- Project Manager UI: removed reviewer auto-focus/visibility branches from runtime session view and workspace-tree resume paths for `description`.
- Workflow templates: `description` bundle now uses only single-session collector wording; reviewer terminology removed from `description-collector-prompt.md`.

### Fixed
- Workspace activate/runtime resume: reviewer session slots are ignored for active delivery, preventing accidental reopen into legacy reviewer path.
- Template sync: legacy files `~/.codeai-hub/templates/description/reviewer-prompt.md` and `reviewer-template.md` are removed during sync.

## [1.1.696] - 2026-02-27
### Changed
- Workflow templates: simplified the Description questionnaire from 16 to 10 sections with plain-language names and inline examples for non-programmers.
- Workflow templates: aligned `description-template.md`, `description-collector-prompt.md`, `reviewer-prompt.md`, and `reviewer-template.md` with the new questionnaire structure.
- Reviewer Agent prompt: removed artificial 3-question limit; agent now discusses module/cluster composition as a first approximation.
- Description Agent prompt: when `modules_draft` is empty, agent proposes its own decomposition based on described scenarios and capabilities.
- Code: simplified `buildDefaults()` in `description-questionnaire-utils.ts` to only set `meta.title`; removed dead `formatDate()` and `resolveAuthorName()`.

### Added
- Workflow docs: `System/WorkflowSteps_Overview.md` — SSOT for all six workflow steps (Description → Virtual Simulation → Diagram Modules → Diagram Facades → Module Specifications → TODO Plan), including philosophy, artifacts, feedback loop, and adaptive templates concept.
- Workflow docs: `QuestionnaireTemplate_Draft.md` — intermediate draft used during the questionnaire redesign discussion.
- Docs index: added Workflow Overview section linking to `System/WorkflowSteps_Overview.md`.

## [1.1.695] - 2026-02-27
### Changed
- Project Manager: refactored duplicated stage artifact panel state rendering into shared components (`StageArtifactStateView`, `StageArtifactPendingLayout`) to keep duplication checks under the pre-push threshold.

### Fixed
- Release pipeline: `pre-push` duplication gate now passes again after the panel deduplication (`jscpd` back under 3%).

## [1.1.694] - 2026-02-27
### Fixed
- Project Manager: toolbar stage highlight is now workspace-scoped, so switching workspaces always reflects that workspace's last active step (`Description`, `Virtual Simulation`, `Diagram Modules`, or `Diagram Facades`).
- Project Manager: dialog open resume now checks runtime session presence in `workspace:snapshot` and triggers `session:create` when the dialog session is missing after restart.
- Virtual Simulation cold-start recovery: stale running lock and reset `total` timer are normalized/restored from snapshot + persisted timer state.

## [1.1.691] - 2026-02-26
### Fixed
- Project Manager: when opening a stage dialog after Core restart and `dialog:list` has no `latestSessionId`, the UI now triggers `session:create` resume so workspace snapshots include the stage session again.
- Virtual Simulation: reopen after restart no longer remains stuck in default `running` lock while waiting for user input.
- Session timers: `total` restores after restart because the resumed stage session receives `taskTimer.totalSeconds` via `workspace:snapshot`.

## [1.1.690] - 2026-02-26
### Fixed
- Project Manager: layout-level `workspace-scope-sync` now stores incoming `workspace:snapshot` payloads in `workspaceSnapshotStore` independently from runtime session view mount timing.
- Project Manager: Virtual Simulation no longer gets stuck with `Agent is working...` on late tab open after reload when the turn is already idle and waiting for user input.
- Session UI: `total` timer is restored on late mount because the latest snapshot is retained even when `workspace:snapshot` arrived before the tab subscribed.

## [1.1.689] - 2026-02-26
### Fixed
- Project Manager: on runtime hydrate, the UI now reapplies the latest stored `workspace:snapshot` from `workspaceSnapshotStore`, preventing stale default `running` lock when snapshot arrives before `core:state`.
- Project Manager: Virtual Simulation restart/reopen path now keeps input unlocked and task timer state aligned with the latest snapshot after reconnect/reload.

## [1.1.688] - 2026-02-26
### Fixed
- Core: cold-start recovery now normalizes stale `running` runtime sessions to `idle` on workspace selection when turn completion is already known and no bootstrap continuity lock is active.
- Core: persisted task timer totals are restored even when runtime sessions hydrate before the first `workspace select` call.
- Docs (SSOT): synchronized input lock and task timer contracts for the `Virtual Simulation` cold-start recovery rules.

## [1.1.687] - 2026-02-26
### Fixed
- Project Manager: Session EmptyState no longer tells users to start from “buttons above”; it now explains the actual Description flow (`Artifacts` questionnaire → `Submit questionnaire` → provider picker).
- Project Manager: Description questionnaire CTA labels are now English (`Submit questionnaire`, `Close`) to match PM UI terminology.
- Project Manager: stage panel “Fix with agent” callbacks are type-aligned with `WorkflowStepStartService`, restoring green `npm run typecheck:webview`.

## [1.1.685] - 2026-02-26
### Fixed
- Project Manager: false "Creating session…" spinner no longer appears when a stale dialog intent is restored from `localStorage` (e.g. on the Description tab in a fresh workspace). The pending indicator is now driven exclusively by the `pendingSessionCreate` flag (`emptyStatePending`), not by the mere presence of a dialog intent.

## [1.1.684] - 2026-02-26
### Fixed
- Project Manager: all side-effects for gated toolbar buttons (Virtual Simulation, Diagram Modules, Diagram Facades) — `setActiveTool`, `setPendingSessionCreate`, `dispatchStageActivated`, `pm:dialog:open` — are now deferred until the async gating check passes. Clicking these buttons when the upstream artifact is missing produces zero UI changes.

## [1.1.683] - 2026-02-26
### Added
- Project Manager: new **Diagram Modules** workflow step — toolbar click launches an agent session that produces `modules-diagram.mmd`; artifact panel with mermaid validation (`%% Modules Diagram` header + `subgraph`) and "Fix with agent" recovery.
- Project Manager: new **Diagram Facades** workflow step — toolbar click launches an agent session that produces `facades-graph.mmd`; artifact panel with mermaid validation (`%% Facades Graph` header + edge syntax) and "Fix with agent" recovery.
- Project Manager: artifact availability polling hooks for both diagram stages (10 s interval, `maxBytes: "1"` probe).
- Project Manager: Workspace tree branch nodes for Diagram Modules / Facades (session child + artifact child), with gated progression (Diagram Modules requires VS done; Diagram Facades requires Diagram Modules done).
- Project Manager: table-driven toolbar handler (`DIAGRAM_STAGE_MAP`) for diagram clicks; `renderStagePanel()` helper eliminates duplicate workspace-check pattern in `main-area.tsx`.

## [1.1.681] - 2026-02-26
### Added
- Implementation of Diagram Modules & Diagram Facades workflow steps (code only; see `1.1.682` for the doc-synced release).

## [1.1.680] - 2026-02-26
### Added
- Project Manager: every click that says "I want stage X" (toolbar buttons, tree parent labels, tree child nodes) now syncs both artifact and session panels together via `resolveStageSyncPayload()` and the `pm:stage:activated` event.
- Project Manager: auto-select the latest workflow step (Virtual Simulation or Description) when opening a workspace.

### Fixed
- Project Manager: clear stale artifact when the VS session has no artifact file yet.

## [1.1.676] - 2026-02-26
### Changed
- Core: task timer storage is now per-workspace (stored in `<workspaceRoot>/.codeai-hub/state/task-timers.json`); legacy global file is cleaned up on startup.

## [1.1.675] - 2026-02-25
### Fixed
- Project Manager: remove the confusing Back button from the artifact viewer.

## [1.1.674] - 2026-02-25
### Fixed
- Project Manager: show `virtual-simulation.md` in the Workspace tree only after the artifact exists (avoids 404 when clicking).

## [1.1.673] - 2026-02-25
### Fixed
- Project Manager: Virtual Simulation reuses the provider selected for Description (prevents accidental provider switches).
- Session UI: workflow tabs use stage labels for non-description stages (e.g., `Virtual Simulation`) instead of showing `Reviewer`.
- Project Manager: Workspace tree now shows the `virtual-simulation.md` artifact as a child node under Virtual Simulation.

## [1.1.672] - 2026-02-25
### Fixed
- Project Manager: Virtual Simulation now immediately switches the Sessions panel into a pending state and auto-opens the stage dialog once it becomes available.
- Project Manager: Workspace tree shows the Virtual Simulation session (collapsible stage node with a session child).

## [1.1.671] - 2026-02-25
### Fixed
- Project Manager: Virtual Simulation toolbar now opens the stage session (and reveals the hint panel) instead of acting like a dead click.
- Project Manager: bridge config derives missing `httpUrl` from `wsUrl` (prevents workflow API calls from silently failing).

## [1.1.670] - 2026-02-25
### Added
- Workflow: new `Virtual Simulation` step with bundled prompt+template (file-first from `Final_Description.md`).
- Project Manager: start Virtual Simulation from the toolbar, show a hint panel until the artifact exists, and offer “Fix with agent” when validation fails.

### Changed
- Workflow state: record watcher events and compute deterministic gating + `OUTDATED` propagation.

## [1.1.669] - 2026-02-24
### Fixed
- Reviewer sessions: Stop → Play no longer resets task timer total (BUG-2026-02-24-04).

## [1.1.668] - 2026-02-24
### Fixed
- Project Manager (one-shot Description): after ↻ Restart attempt, auto-focus the newly created session (no manual click in the tree) (BUG-2026-02-24-03).

## [1.1.667] - 2026-02-24
### Changed
- Rebuild of `1.1.666` to avoid the `666` version number; no functional differences.

## [1.1.666] - 2026-02-24
### Changed
- One-shot Description: ↻ Restart attempt confirmation now uses an inline Apply/Cancel bar (Session UI + `questionnaire.md` header), instead of a 2-step arm/confirm click.

## [1.1.665] - 2026-02-24
### Fixed
- Standalone Project Manager (CEF): avoid crash when confirming ↻ Restart attempt in one-shot Description (replaced native `window.confirm` with a 2-step arm/confirm UX).

### Changed
- Session UI: ↻ Restart icon is now 1.6× larger.

## [1.1.664] - 2026-02-24
### Added
- One-shot Description: ↻ Restart attempt recovery to re-submit the questionnaire and start a fresh attempt when the original attempt hangs mid-turn.

## [1.1.663] - 2026-02-23
### Fixed
- Session UI: Stop (■) icon is now ~10% smaller for better visual balance.

## [1.1.662] - 2026-02-23
### Fixed
- Standalone Project Manager (CEF): after Stop (■), the next Enter/▶ now starts Core again via the Launcher bridge (instead of getting stuck with Core stopped).

## [1.1.661] - 2026-02-23
### Fixed
- Session UI: ■ now reliably stops Core by calling the shutdown endpoint (`POST /api/v1/shutdown`) and no longer leaves the “Agent is working…” placeholder visible after Stop.

## [1.1.660] - 2026-02-23
### Changed
- Session UI: the input Play/Stop button now stops Core on ■ (instead of a quick restart), then resumes on the next send (▶ / Enter starts Core and submits after reconnect).
- Session UI: refined the Stop icon visuals (larger ■, clearer red background, better vertical alignment).

## [1.1.659] - 2026-02-23
### Added
- Session UI: added a Play/Stop button next to the input (▶ sends like Enter; ■ restarts Core to abort the active turn and immediately unlock input for a new request).

## [1.1.658] - 2026-02-23
### Changed
- Session UI: locked input “please wait” placeholders now pulse opacity from 20% to 40% every 1000ms (provider color).

## [1.1.657] - 2026-02-23
### Changed
- Session UI: locked input “please wait” placeholders now pulse opacity from 5% to 50% every 1000ms (provider color).

## [1.1.656] - 2026-02-23
### Fixed
- Session UI: locked input “please wait” placeholders now actually pulse opacity from 5% to 80% every 500ms (provider color).

## [1.1.655] - 2026-02-23
### Changed
- Session UI: locked input “please wait” placeholders now pulse opacity from 5% to 80% every 500ms (provider color).

## [1.1.654] - 2026-02-23
### Changed
- Session UI: locked input “please wait” placeholders now use the provider wait color (matching the live turn timer) at 80% opacity.

## [1.1.653] - 2026-02-23
### Fixed
- Session timers: one-shot Description sessions (`resumeMode="no_resume"`) now show the live turn timer while running, without accumulating total time.

## [1.1.652] - 2026-02-22
### Changed
- Session timers: moved SSOT to Core and deliver via workspace snapshots so totals stay consistent across multi-workspace/multi-tab Project Manager usage and Project Manager reloads.

## [1.1.651] - 2026-02-22
### Changed
- Session UI: aligned footer `total:` label typography with timer digits (same font-size/family) for consistent visual weight.
- Session UI: aligned turn/total timers to a shared right anchor so upper and lower values are horizontally aligned.

## [1.1.650] - 2026-02-22
### Changed
- Session UI: total timer in footer is now static during lock/working state (always gray), then updates by jump when the turn completes; footer copy now shows `total:  00h 00m 00s`.
- Session UI: live turn timer in the input area is shown without background badge/pill (plain overlay text on the input field).

## [1.1.649] - 2026-02-22
### Fixed
- Session UI: task timers now match the contract semantics — total is always visible in the footer while input is locked; per-turn timer resets each new turn.
- Session UI: removed legacy manual force unlock toggle (no longer needed after continuity lock fixes).

### Changed
- Session UI: timer display format is now text-only `00h 00m 00s` (no flip animation).

## [1.1.648] - 2026-02-22
### Added
- Session UI: persistent task execution timer (HH:MM:SS) with 3D flip digits — shows live time while the agent is working and keeps an accumulated total per workflow-agent across continuity rollovers and Core restarts.

## [1.1.647] - 2026-02-22
### Fixed
- Project Manager / Session UI (BUG-2026-02-22-01): avoid stuck “resuming/blocked” on cold start — unlock input when `workspace:snapshot` reports `turnState=idle` and `continuityLockActive=false`, even if `continuityLockReason` is missing.
- Core / Workspace snapshots: normalize idle resume-in-place sessions to emit an explicit unlock hint `continuityLockReason="no_rollover_needed"` (defense-in-depth; reason is never a hard unlock gate).
- Crash/restart resilience: after Core restarts mid-turn, input unblocks automatically when the snapshot is `idle/unlocked`; sending “Continue” resumes the interrupted turn.

### Changed
- Docs: update release notes (`README.md`, `CHANGELOG.md`) before packaging.
- Note: `1.1.647` is a doc-synced rebuild of `1.1.646` artifacts (no additional code changes).

## [1.1.646] - 2026-02-22
### Fixed
- Project Manager / Session UI (BUG-2026-02-22-01): avoid stuck “resuming/blocked” on cold start — unlock input when `workspace:snapshot` reports `turnState=idle` and `continuityLockActive=false`, even if `continuityLockReason` is missing.
- Core / Workspace snapshots: normalize idle resume-in-place sessions to emit an explicit unlock hint `continuityLockReason="no_rollover_needed"` (defense-in-depth; reason is never a hard unlock gate).
- Crash/restart resilience: after Core restarts mid-turn, input unblocks automatically when the snapshot is `idle/unlocked`; sending “Continue” resumes the interrupted turn.

### Changed
- Release notes: `1.1.646` artifacts were packaged before the docs were updated; use `1.1.647` for the doc-synced release.

## [1.1.643] - 2026-02-21
### Fixed
- Claude / Recovery hints: corrected provider-home auth command in user-facing errors to `HOME=~/.codeai-hub/providers/claude/home claude /login`.

## [1.1.642] - 2026-02-20
### Changed
- Release maintenance rebuild: regenerated unified local artifacts (providers/core/UI/launcher) and VSIX for clean install validation.

## [1.1.641] - 2026-02-19
### Fixed
- Core / Codex Session Continuity: prevent duplicate rollover / double session separators when report generation is slow (no timeout-based retries; ignore rollover triggers from stale continuity segments).

## [1.1.640] - 2026-02-19
### Fixed
- Extension / UI: fix UI bundle installation (extract tarballs without an extra top-level folder) so VS Code Settings and Launcher UI can load from `~/.codeai-hub/packages/ui/*/current/*` without `ERR_FILE_NOT_FOUND`.

## [1.1.639] - 2026-02-19
### Fixed
- UI / Sessions: show “resuming session…” placeholder during continuity rollover locks (avoid misleading “agent working” copy while switching/bootstraping a new workflow session).

## [1.1.638] - 2026-02-18
### Fixed
- UI / Sessions: show “resuming session…” placeholder during session binding (avoid misleading “agent working” copy while switching/hydrating a new workflow session).

## [1.1.637] - 2026-02-18
### Fixed
- Core / Templates: bundle and install `reviewer-template.md`, and pass its absolute path into Reviewer instructions (so the agent uses the template instead of searching for a missing file).

## [1.1.636] - 2026-02-18
### Fixed
- Claude / Session Continuity: compute context remaining % from the real `/context` snapshot (provider JSONL) and avoid incorrect rollovers caused by `modelUsage`/cache token totals.

## [1.1.635] - 2026-02-18
### Fixed
- Project Manager / Dialog sessions: prevent stuck-locked input by replaying the latest `workspace:snapshot` after dialog session hydration / rollover.

## [1.1.634] - 2026-02-18
### Fixed
- Core / Workspace snapshots: preserve session lock fields during partial updates (fixes missed unlock after continuity rollover).

## [1.1.626] - 2026-02-17
### Fixed
- Project Manager / Session UI: token usage now refreshes reliably after turns (including dialog sessions that hydrate snapshots after stream events).

## [1.1.625] - 2026-02-17
### Fixed
- Project Manager: auto-open the `Reviewer` dialog after live `Description → Reviewer` handoff (mirrors workflow tree click via `pm:dialog:open`).

## [1.1.624] - 2026-02-17
### Fixed
- Project Manager: fix live `Description → Reviewer` auto-handoff by resolving the reviewer runtime session deterministically (prevents hiding the reviewer before binding is ready).

## [1.1.623] - 2026-02-17
### Fixed
- Project Manager: live auto-handoff now focuses `Reviewer` session after one-shot `Description` completes (without manual click in workflow tree).
- Guardrail: reviewer auto-focus is scoped to `description/collector` transition to avoid stealing focus from unrelated active sessions.

## [1.1.622] - 2026-02-17
### Fixed
- Project Manager / Session UI: show a spinner in the left session area while a workflow session is being created (so the UI does not look frozen).

### Docs
- SolidWorks-Flow: archive non-contract drafts, clarify SSOT boundaries, and normalize doc statuses/metadata.
- Knowledge base: model selection/aliases are documented as SSOT-in-code (see `src/types/*-model-registry.ts`).

## Previous releases (summary)
Earlier releases in the `1.1.57x–1.1.62x` series focused on SSOT routing (dialog vs runtime), snapshot-first lock/usage authority, and continuity/resume reliability across providers. For the full history, use `git log` / tags.
