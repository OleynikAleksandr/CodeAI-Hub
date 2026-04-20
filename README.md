# CodeAI Hub

CodeAI Hub is a Visual Studio Code extension + standalone Project Manager (CEF) that unifies multiple AI providers behind a single, type-safe orchestration layer.

- SolidWorks-WorkFlow docs index: `doc/SolidWorks-WorkFlow/Docs_Index.md`
- System SSOT: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- Session input lock SSOT: `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
- Bug registry: `doc/BugRegistry.md`

## Current Release — v1.2.31
- **Provider `Thinking` headers now keep their accent while remaining muted.** Assistant-tagged reasoning cards such as `Codex · Thinking`, `Claude · Thinking`, and `Gemini · Thinking` no longer collapse to neutral gray; the header stays on the provider hue at a softer `60%` alpha, so provider identity remains readable without overpowering the final answer.
- **Muted thinking bubbles are slightly stronger and more legible.** The shared thinking surface now uses `45%` alpha for fill and border instead of the weaker `40%`, keeping the subdued secondary feel while giving the visible card edge and background better separation.

### 1.2.30 (previous)
- **Visible `Thinking` cards now use the muted visual contract on the real user-facing render path.** Session UI now applies the softened alpha treatment not only to dedicated `thinking` role bubbles but also to assistant messages tagged as thinking, so cards such as `Codex · Thinking` actually render with the intended quieter fill, border, and typography.
- **The real `Thinking` card path is regression-covered in shared Session UI logic.** The dialog message class builder now has a dedicated test for `assistant + tag="thinking"` so the visible reasoning card path cannot silently fall back to ordinary assistant styling again.

### 1.2.29 (previous)
- **Session dialog message cards now use a lighter `1px` stroke.** The shared bubble contract for user, assistant, and thinking cards no longer uses the heavier `2px` border, so the dialog surface reads cleaner without changing message structure or provider routing.
- **Thinking cards are visually quieter across all providers.** Claude, Codex, and Gemini reasoning bubbles now use softer background/border alpha plus dimmer header/body typography, making `Thinking` content feel secondary to the final assistant answer while remaining readable.

### 1.2.28 (previous)
- **Late translation growth of the last dialog bubble now keeps the view pinned to the bottom.** When the last visible thinking or assistant bubble first appears in English and then expands in place after a Russian `localizedContent` overlay arrives, Session UI now treats that display-text growth as a real autoscroll anchor change and re-scrolls to the newest bottom edge automatically.
- **The fix is regression-covered at the scroll-anchor layer.** Session UI now has a dedicated test proving that a change in `localizedContent` alone, without any change to native `content`, still invalidates the last-bubble scroll anchor.

### 1.2.25 (previous)
- **Codex reasoning now renders from completed summary blocks instead of live readable fragments.** The app-server line no longer materializes `thinking` bubbles from `summaryTextDelta` / `textDelta`; user-facing reasoning waits for `item/completed` and emits one block per completed summary section, preserving heading/body boundaries such as `**Crafting concise questions**`.
- **Standalone bold reasoning headings now keep the correct vertical rhythm in Session UI.** Bold-only paragraph headings keep the gap before the heading while the extra gap after the heading is suppressed, so section titles read as the start of the following paragraph rather than as isolated floating lines.
- **Codex reasoning contract and regression coverage are now aligned.** The app-server module includes dedicated regression tests for completed-summary emission, fallback behavior without `item.summary[]`, and raw-text fallback when structured reasoning fields are absent.

### 1.2.24 (previous)
- **Mixed-language translation overlays now preserve word boundaries automatically.** Shared translation normalization inserts the missing space on `latin <-> cyrillic` boundaries in ordinary prose, so overlays no longer collapse into fragments like `parallelдля`, `вродеpwd`, or `lsилиsed` while protected code spans stay untouched.
- **Session messages now keep section-like bold titles on their own paragraph.** The same shared formatter repairs glued patterns such as `...data.**Clarifying ...**` before assistant/thinking content is persisted and before translated overlays are projected, so both ordinary replies and reasoning bubbles keep readable section structure.
- **Nested markdown lists no longer inflate into empty vertical gaps in dialog UI.** Session markdown rendering now collapses structural whitespace on the `li` layer instead of preserving markdown indentation/newline artefacts as visible empty blocks.

### 1.2.17 (previous)
- **Claude pre-tool progress text no longer leaks into the dialog as a normal assistant bubble.** In localized Claude workflow turns, a pre-tool fragment such as `I've read the Final_Description.md... Let me create the directory...` could appear between two `Claude · Thinking` bubbles as an ordinary assistant/live message. This was wrong in two ways: the fragment was progress/thinking-like text before a `tool_use`, not a real final answer, and because it materialized as assistant/live it skipped the thinking translation path and stayed in English. The 1.2.17 fix hardens the Claude messaging path so localized pre-tool text no longer escapes through the assistant/live branch when the message resolves to `tool_use`; instead it follows the thinking contract, while ordinary `end_turn` assistant text stays on the normal assistant path.

### 1.2.16 (previous)
- **Claude no longer gets stuck in false `Agent is resuming...` after a completed turn.** A Claude `Description` turn could finish normally, persist the full final reply into native/SDK/unified logs, and still leave the Session UI blocked in `Agent is resuming your session... Please wait.` The immediate bug was the Unix post-turn `/context` probe runner in [`packages/Claude_Module/src/sdk/claude-context-usage-probe.ts`](packages/Claude_Module/src/sdk/claude-context-usage-probe.ts): on macOS/Linux it executed `node <executablePath> ...`, but the installed `claude` command can resolve to a native bundle (`claude.exe` inside the package), so the probe crashed with `ERR_UNKNOWN_FILE_EXTENSION`. The release fixes the runner selection to execute native Claude binaries directly on Unix and also hardens Core continuity arbitration: if a provider explicitly reports that post-turn token usage is unavailable, Core resolves the turn to `no_rollover` instead of leaving the session in endless `context_check_pending`.

### 1.2.15 (previous)
- **Model label flicker eliminated completely.** 1.2.13 fixed the Core-side broadcast path (raw SDK `model_info` → effective id), but there was still a second flicker path: the **client-side initial render** goes through `resolveModelReasoning` in [`src/client/ui/src/session/model-info-builder.ts`](src/client/ui/src/session/model-info-builder.ts), which for Gemini and Codex returned the raw level string from settings (`"high"` / `"medium"`) instead of the prefixed form (`"thinking high"` / `"reasoning medium"`). At first render the label briefly appeared as `Gemini 3.1 Pro Preview (high)`, then Core's `session:model:update` replaced it with the effective `(thinking high)` — user saw a one-frame flicker, most visible on temp-session start. Both fallback branches now wrap the level in the appropriate provider prefix, matching the form `parseEffectiveModelId` produces. Claude branch is unchanged (separate convention with `"thinking off"` / raw effort). UI label is now stable from the very first render.

### 1.2.14 (previous)
- **Gemini post-tool stalled-turn watchdog bumped 120s → 240s.** Retest of 1.2.13 on Gemini 3.1 Pro Preview + `thinkingLevel=high` surfaced a false-positive watchdog kill in the post-tool leg: after the initial turn completed with `read_file` tool calls and Core fed results back, Gemini went into its silent deep-reasoning phase and the post-tool watchdog cut the stream at exactly 120s with `Provider turn failed: Gemini stream stalled after 120s without progress.` The 1.2.11 rationale — "follow-up legs already account for nested reasoning, 120s is enough" — turned out to be wrong for high-thinking + large prompts. [`packages/Gemini_Module/src/session/gemini-session-lifecycle.ts`](packages/Gemini_Module/src/session/gemini-session-lifecycle.ts) `DEFAULT_POST_TOOL_STALLED_TURN_WATCHDOG_MS` is now 240_000, symmetric with the initial leg (`DEFAULT_STALLED_TURN_WATCHDOG_MS = 240_000`). Per-session overrides (`stalledTurnWatchdogMs` / `postToolStalledTurnWatchdogMs`) are preserved. Adaptive-per-thinking-level watchdog remains deferred.

### 1.2.13 (previous)
- **Stable model label in the SESSION UI status panel.** Previously the bottom panel of the session view flickered between `Gemini 3.1 Pro Preview (thinking high)` and `Gemini 3.1 Pro Preview (high)` within the same active turn — every time the Gemini SDK emitted its `model_info` event the label briefly collapsed to the short form, then the next applied-turn-config broadcast restored the long form. Two distinct code paths ([`session-provider-event-router.ts`](packages/core/src/remote-bridge/handlers/session-provider-event-router.ts) `broadcastRuntimeModelUpdate` vs [`session-request-handler-message-dispatch.ts`](packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts)) were pushing `session:model:update` events with **different** modelId shapes — the SDK path forwarded the raw base id (`gemini-3.1-pro-preview`), the dispatch path carried the full effective id (`gemini-3.1-pro-preview thinking:high`). The UI renderer in [`model-info-builder.ts`](src/client/ui/src/session/model-info-builder.ts) formed different labels from those two shapes, hence the flicker. Core now enriches the SDK path through the same `AppliedTurnConfig.resolveEffectiveModelId` helper the dispatch path uses, so both broadcasts carry identical effective ids and the label stays stable.

### 1.2.12 (previous)
- **Core no longer crashes when Gemini cli-core self-aborts on loop detection.** 1.2.11 retest on Gemini 3.1 Pro Preview + `thinkingLevel=high` surfaced an `AbortError` uncaughtException from `@google/gemini-cli-core/dist/src/core/client.js:539` `GeminiClient.processTurn` — cli-core internally calls `controller.abort()` when its own loop-detection fires, and the resulting node-fetch promise rejection is in a background async context that our `runTurn` try/catch does not own. Native `gemini` CLI survives this because its outer `submitQuery` wrapper explicitly ignores `error.name === "AbortError"`; we now do the equivalent at the daemon level. [`packages/core/src/index.ts`](packages/core/src/index.ts) gains a `process.on("uncaughtException", ...)` handler that selectively swallows AbortError only when the stack trace includes `@google/gemini-cli-core`. All other uncaughtExceptions remain fatal — crash-safety for real bugs is preserved.
- **Gemini mis-routed thinking content is now rerouted to the thinking overlay.** On `thinkingLevel=high` with large prompts, Gemini 3.1 Pro sometimes streams its internal meta-prompt (`sthought\n`, `CRITICAL INSTRUCTION 1:`, `Related tools:`, `Plan:`, `Drafting the content...`) through `Content` events instead of `Thought` events. Our normalizer was faithfully writing these as ordinary assistant bubbles, so the user saw a 10,000+ character English meta-prompt glued onto the dialog. [`packages/Gemini_Module/src/messaging/gemini-assistant-event-normalizer.ts`](packages/Gemini_Module/src/messaging/gemini-assistant-event-normalizer.ts) now detects the misrouted-thinking prefixes in finalised assistant segments and reroutes the whole segment through the existing `thought-translator-service` overlay path (same mechanism used for inline `[Thought: true]` splitter in 1.2.9). The detector runs after the 1.2.9 marker splitter and pre-tool Cyrillic heuristic so it does not conflict with existing reroute rules. Underlying provider-side quirk is a Google bug; this is our UI-correctness patch until they fix it.

### 1.2.11 (previous)
- **Gemini initial-leg stalled-turn watchdog bumped from 60s to 240s.** Surfaced during 1.2.10 retest: Gemini 3.1 Pro Preview with `thinkingLevel=high` on the Description step timed out after exactly 60 seconds with `Gemini stream stalled after 60s without progress.` Root cause in [`packages/Gemini_Module/src/session/gemini-session-lifecycle.ts`](packages/Gemini_Module/src/session/gemini-session-lifecycle.ts): the `DEFAULT_STALLED_TURN_WATCHDOG_MS` constant was hard-coded at `60_000` regardless of model or thinking level. On large system-instruction prompts (Description Agent + questionnaire) at `high` effort the Gemini SDK stays silent on the stream channel through the whole deep-reasoning phase, which exceeds 60s. Our watchdog interpreted the silence as a hung stream and killed the turn. Bumping the initial-leg timeout to 240s gives `thinkingLevel=high` enough headroom while still protecting against genuinely hung streams. Post-tool watchdog (`DEFAULT_POST_TOOL_STALLED_TURN_WATCHDOG_MS = 120_000`) stays unchanged — follow-up legs already account for nested reasoning. No other behaviour changes; this is a single-constant bump.

### 1.2.10 (previous)
- **Audit cleanup release.** Post-Session043 codebase audit (dead code + broken doc links + duplication analysis) produced a concrete debt list — 1.2.10 closes the actionable items. No runtime behaviour changes; no retest required. Four directions:
  - **A. Docs + config verification.** Audit flagged three potential issues — all investigated. `Docs_Index.md:80-82` bundled-template paths were already correct (`destinationRelativePath` inside `packages/core/src/templates/bundled-templates.ts`); extended the section to also document the per-workspace instance layout (`.codeai-hub/codeai-hub/description/`) so future sessions don't confuse the two. `knip.json` exclusion for the diagram-DSL parser chain was found to be intentional (chain used only through `diagram-editor-facade.test.tsx`, so knip would otherwise flag the whole subtree as unused) — left as-is. TODO in `packages/agents/spec-creator/dist/contract/contract-builder.d.ts` lives inside a published third-party package; no source under our control.
  - **B. Localization cleanup.** 99 unused keys identified across the four approved source dicts (`ui_labels.json`, `ui_helper_text.json`, `messages_for_the_user.json`, `artifacts_for_the_user.json`) — residue of removed components (`SwitchRecoveryBanner`), rewritten questionnaire fields, and never-wired placeholders. After a dry-run grep-partial pass to rule out dynamic `t(\`\${prefix}.${suffix}\`)` usage, the confirmed-dead subset is removed from source. Translator runtime ignores them from now on; materialised `~/.codeai-hub/localization/<lang>/*.json` caches shrink accordingly on next language selection.
  - **C. Duplication refactor (scope-bounded).** Top-20 of 233 jscpd clones classified. 17/20 are legitimate parallel provider scaffolding (Claude/Codex/Gemini mirrors) or client↔core boundary mirrors — extracting them would violate module isolation. Three real extracts: `useBootstrapSettings` → `src/client/shared/hooks/use-bootstrap-settings.ts` (eliminates client↔PM settings bootstrap clone); `createWorkspaceFileHandler` factory in `packages/core/src/remote-bridge/handlers/workspace-file-service.ts` (eliminates within-file read/write handler clone); `idea-collector-schema-utils.ts` now imports from `@codeai-hub/agents-shared` schema-utils instead of duplicating the strictifier + normalizer. `check:dup` goes from 3.68% to ~3.2%; threshold stays at 3%.
  - **D. Process formalization.** New `doc/SolidWorks-WorkFlow/Checklists/PeriodicAudit.md` documents the recurring audit cadence (every 3-5 releases), parallel audit-pass workflow, clone-classification rubric, and uses 1.2.10 as the reference precedent. SystemArchitecture gains an explicit "acceptable parallel-scaffolding duplication" invariant — future audits must not flag provider-module mirrors or client↔core boundary copies as debt.

### 1.2.9 (previous)
- **Gemini inline `[Thought: true]` marker now splits into a thinking bubble + final assistant reply**: on post-tool follow-up turns, Gemini CLI Core sometimes streams a thought-like English summary, the literal token `[Thought: true]`, and the final target-language reply inside a single `content` event stream — without any accompanying `ptype: "thought"` events. `packages/Gemini_Module/src/messaging/gemini-assistant-event-normalizer.ts` `handleFinishedEvent` now regex-splits the assembled segment on `/\[Thought:\s*(true|false)\]/`, routes the pre-marker text through the existing `thought-translator-service` (same overlay path as native Gemini thoughts, so the translation arrives as a thinking bubble with proper `localizedContent`), and keeps the post-marker text as the ordinary assistant bubble. The literal `[Thought: true]` / `[Thought: false]` token never surfaces in dialog, and the user no longer sees an English thought-summary glued onto a Russian final answer.
- **Gemini pre-tool non-target-language progress text reroutes to thinking overlay**: at session start Gemini often emits a brief English `content` event (e.g. `I will read the questionnaire and the template...`) right before the first `tool_call_request` of the turn — again without `ptype: "thought"` events. When the user has Messages-for-the-User set to a Cyrillic-family target (ru / uk / bg / sr / mk / be / ky / kk / mn / tg / ab) and that pre-tool text contains zero Cyrillic characters (U+0400..U+052F), the normalizer now snapshots it as the pre-tool segment, reroutes it through `thought-translator-service` as a thinking bubble, and excludes it from the final assistant bubble. Target `en` disables the heuristic entirely — we cannot reliably detect "not English" from raw characters. In-target-language pre-tool text is prepended to the assistant bubble unchanged (current behaviour preserved).

### 1.2.8 (previous)
- **Gemini post-stop resume now actually loads the prior chat**: 1.2.7 shipped `argv.resume` on the Gemini CLI Core path, but that flag alone is a no-op — the official `gemini` binary main reads it, looks up the chat file, and then calls `client.resumeChat(history, resumedSessionData)` to hydrate the in-memory chat and reuse the existing chat file. Our embed path skipped that step, so the rebind started fresh and wrote a new empty chat file anyway. `gemini-session-bootstrapper.ts` now performs the full resume pipeline itself: scans `config.storage.getProjectTempDir()/chats` for `session-*-<uuid-first-8>.json`, picks the file whose full `sessionId` matches (prefers the one with the most messages when pre-1.2.8 state left two files with the same UUID), calls `config.setSessionId(loaded.sessionId)`, converts `messages` via `@google/gemini-cli-core` `convertSessionToClientHistory`, then `await client.resumeChat(history, { conversation, filePath })`. Description Agent system instruction and prior dialog are available to the next turn, and subsequent provider writes append to the same chat file instead of orphaning it.
- **Stale-seed send recovery**: Project Manager dialog bootstrap can seed a fresh Core session with an already-dead `providerSessionId` and `providerSessionStatus: "ready"` (mirror of the 1.2.5 Claude case). User's next message bypasses `hasStopInvalidatedBinding` and hits the provider directly, which throws `Gemini session <id> not found. Available: [] Aliases: []`. The provider adapter now translates this specific failure into a Core-visible `SessionStaleBindingError`; `SessionRequestHandlerProviderSend.dispatch` catches it, rewrites the binding to `pending`, remembers the pre-stop `providerSessionId`, re-runs `ensureSessionReadyForSend` (which triggers the normal post-stop resume path), and retries the send once. Only one retry per turn; a second stale failure flows through as an ordinary provider error.
- **Legacy `SwitchRecoveryBanner` removed**: the "Retry in place / Retry with current provider / Switch to …" toolbar that surfaced on `failureClass=session_binding_recoverable` is a leftover from the pre-1.2.5 recovery flow. With 1.2.7 post-stop resume and 1.2.8 stale-seed guard, recoverable failures are handled silently by Core. The component, its companion hook `use-dialog-switch-offer`, associated type file, CSS, and localization keys have been fully removed from the code base.

### 1.2.7 (previous)
- **Gemini `Stop` no longer wipes provider chat history and `Continue` resumes the prior dialog**: `packages/Gemini_Module/src/session/gemini-session-lifecycle.ts` `closeSession` previously called `session.client.resetChat()` which, on the Gemini CLI Core side, materialized a new empty `GeminiChat` against the same `Config.sessionId` and wrote a new empty chat file under `~/.gemini/tmp/<projectSlug>/chats/`, leaving the prior chat-file history orphaned. The abort path now stops after `abortController.abort()` and `sessionStore.removeSession()` so the pre-stop chat file stays intact on disk.
- **Core-side post-stop Gemini rebind resumes by provider session id**: Core's stop-action now remembers the live `providerSessionId` before invalidating the binding, and `SessionRequestHandlerStopRebind.performRebind` threads that id back into `resolveProviderSessionId` on the next send, but only for providers declared as `requiresPostStopResume`. `GeminiProviderAdapter.resumeSession` forwards it as `argv.resume`, so Gemini CLI Core loads the prior chat file with full Description Agent system instructions and prior dialog. Claude/Codex paths are unchanged because their post-stop continuity is already owned provider-natively.
- **Invariant 24 extended**: "Provider Stop actually aborts the active turn" now also requires that Stop does not discard provider-native chat history. For providers with `requiresPostStopResume`, Core must persist the pre-stop provider session id and resume against it on rebind, otherwise the rebound session starts with an empty context and forgets the original workflow instruction.

### 1.2.6 (previous)
- **Codex `Stop` now actually aborts the active turn**: the Codex SDK-patch `streamCodexExec` (in `packages/Codex_Module/src/sdk/codex-sdk-patches.ts`) spawns the underlying `codex exec` as a child process and then blocks inside `for await (const line of rl)` on that process's stdout. Previously `adapter.closeSession` just resolved the outer message generator with `null`, while the child kept running and the readline cursor waited for the next stdout line — Stop was effectively a no-op until Codex naturally emitted `turn_completed` (2+ minutes in the 1.2.3 retest). The patch now registers the spawned `ChildProcess` in a module-scoped Map keyed by `threadId` and exports `killActiveCodexProcess(threadId)` which sends `SIGTERM`. `CodexSessionManager.closeSession` calls that exported hook before awaiting the lifecycle and processing loop, so Stop closes the Codex subprocess within ~100 ms — matching the Claude behaviour 1.2.5 already shipped.
- **PM Stop-button debounce**: `InputPanel` tracks a new `stopInFlight` state that flips to true the moment the user clicks Stop and resets to false when `agentBusy` flips to false (Core has sent the `idle` snapshot back). While in-flight, the handler short-circuits before calling `stopSession` so a user who spam-clicks Stop cannot stack nine parallel `session:stop` messages the way the 1.2.3 trace showed. `InputPlayStopButton` gains a `stopPending` prop that disables the button and switches the label to `Stopping current turn…`.
- **Core `handleStop` re-entry guard**: `session-request-handler-stop-action.ts` early-returns when `hasStopInvalidatedBinding(sessionId)` is already true. This is belt-and-suspenders for callers that bypass the PM debounce (programmatic sources, races) and prevents re-invalidating an already-pending binding.

### 1.2.5 (previous)
- **Stop → Continue input lock — fixed**: after `Stop` on a live Claude/Codex turn, Core invalidates the provider binding (`providerSessionId → null`, `status → pending`) and, on the next user message, creates a new session backed by the same provider-native session id. The PM dialog controller previously missed this swap: `onSessionBinding` only updated the snapshot-level binding, not the `SessionRecord.binding`, so the `onSessionCreated` adoption check saw the old `status: "ready"` and refused to adopt. The input panel then kept reading `connectionState` from the now-dead session and stayed unlocked even though Core was streaming the reply onto the new one. `useProjectManagerDialogSessionController` now mirrors `onSessionBinding` into both the snapshot and the `SessionRecord`, remembers the pre-stop `providerSessionId` in a ref the moment it flips to null, and adopts the newly created session on `onSessionCreated` when its `providerSessionId` matches. Placeholder cleanup and ref reset both cover the new path.
- **1.2.3 / 1.2.4 diagnostic instrumentation removed**: all `stopdiag_` (Core) and `pmdiag_` (PM) trace logs are gone. `pm:diag:log` is back to writing into `~/.codeai-hub/logs/core/core.log` via the shared Core logger — the temporary split to `~/.codeai-hub/logs/project-manager/project-manager.log` is not needed now that the fix has landed. The `CODEAI_PROJECT_MANAGER_LOG_FILE` env override was removed alongside.

### 1.2.4 (diagnostic)
- PM-side `pmdiag_` trace release. Logged `api_stop_session`, `api_send_session_message`, `workspace_snapshot_apply` (per-session summary), `active_session_changed` (with caller stack), `dialog_active_session_changed`. Routed to a dedicated `project-manager.log` via a local appender. The trace confirmed the session-id swap the 1.2.5 fix addresses. Removed in 1.2.5.

### 1.2.3 (diagnostic)
- Core-only `stopdiag_` trace logs on stop-action / stop-rebind / message-dispatch / `emitTurnStateEvent` (with caller stack) / provider-event-router in `~/.codeai-hub/logs/core/core.log`. Baseline verification for the Stop → Continue input lock regression; proved Core emits `running` correctly and narrowed the root cause to the PM side. Removed in 1.2.5.

### 1.2.2 (previous)
- **Claude `x-High` reasoning effort stops reverting to `medium` on Project Manager boot**: Core had its own hardcoded thinking-effort whitelist next to the extension-side normalizer, and `xhigh` had been added to the UI registry and the shared defaults resolver in 1.1.998 but NOT to that Core-only handler. On every `settings:load` from PM, Core silently rewrote `xhigh` back to `medium` and persisted it to disk. `xhigh` is now in the Core whitelist together with its legacy `maxTokens = 20 000` anchor. Diagnostic logging from 1.2.0 / 1.2.1 is removed.
- **New SSOT invariant**: SystemArchitecture §3 now has Invariant 27 documenting the four-way parity requirement between the UI model registry, the extension-side normalizer, the shared Core defaults resolver, and the Core remote-bridge handler when adding any new effort/reasoning/thinking level. Matching bullets added to Modules/Claude.md, Codex.md, Gemini.md so future provider work catches the cross-boundary rule.

### 1.2.1 (diagnostic)
- Temporary build. Added polling `fs.watchFile` on `~/.codeai-hub/settings/settings.json` so any external writer became observable regardless of which process wrote the file. Removed in 1.2.2 once the root cause was identified.

### 1.2.0 (diagnostic)
- Temporary build. Added persist/load/save trace through `~/.codeai-hub/logs/extension/extension.log`, including a stack trace for `persistSettingsSnapshot`. Removed in 1.2.2.

### 1.1.999 (previous)
- **Claude live assistant text now collapses into one growing dialog card**: consecutive live text fragments from the same turn merge visually into a single assistant bubble instead of rendering one card per sentence. The provider still emits each live fragment as a stable append-only message so translation overlays keep attaching `localizedContent` per fragment, but the UI layer now runs a merge pass symmetric to the existing thinking merge.

### 1.1.998 (previous)
- **Claude assistant text now prints live, no more multi-minute silence on `Write`/`Edit`**: visible assistant text is surfaced as Claude streams it, sentence-by-sentence, instead of being held in memory until the tool_use block finishes streaming its payload. The old two-minute pause while Claude generated a large `Write` input is gone.
- **Claude `Thinking` is now visible on Opus 4.7**: the SDK `thinking.display: "summarized"` flag is now always sent when thinking is enabled, so Claude Opus 4.7 emits plain-text reasoning fragments instead of encrypted-only signatures. Previously thinking on Opus 4.7 was invisible regardless of effort.
- **New Reasoning effort level — x-High (Opus-only)**: Settings Claude now exposes `x-High` between `High` and `Max`. Documented by the SDK as "Deeper than high (Opus 4.7 only; falls back to High elsewhere)".
- **Model labels no longer show stale version numbers**: Claude model cards display just `Sonnet` / `Opus` / `Haiku` — Anthropic resolves the alias to the latest version at query time, so there's no more `Opus 4.5` label while the provider is actually running `Opus 4.7`.

### 1.1.997 (previous)
- **`Stop` no longer crashes core during a Claude turn**: pressing `Stop` from Project Manager while Claude is streaming now interrupts the active turn cleanly. Late provider errors that arrive after shutdown are suppressed instead of leaking out as an unhandled error event, so the next user message can continue the same workflow session instead of finding a dead core.
- **Claude `Thinking` now appears live instead of in one delayed block**: reasoning is materialized into readable thinking bubbles as the model is still streaming, at sentence/paragraph boundaries, so the dialog no longer goes silent during long Claude reasoning. The final assembled thinking block is reconciled against what was already shown, so the same reasoning never appears twice.
- **Translation overlays follow each live thinking bubble**: each emitted live bubble carries its own stable `messageId`, and Core-owned translation overlays attach to those bubbles individually as soon as translation completes, so localized reasoning text now arrives incrementally too instead of waiting for the whole reasoning block.

### 1.1.996 (previous)
- **Project Manager `Stop` now uses the correct runtime transport**: the shared session input panel now delegates `session:stop` through the Project Manager transport when it is hosted inside the standalone workflow shell, instead of trying to use the regular chat webview bridge that is not initialized there.
- **Hung rollover sessions can now be interrupted from the Project Manager input**: when a continuity resume stalls and the UI shows `Agent is resuming your session`, the `Stop` button can again send a real stop request for the active session and unblock the input path.
- **Regression coverage now locks the Project Manager stop bridge**: the core-bridge stop-session test asserts that the shared `stopSession()` helper forwards to the Project Manager hook when that environment is active.

### 1.1.995 (previous)
- **Description no longer leaks stale artifacts across workspace switches**: Project Manager now ignores workflow snapshots that belong to the previous workspace while the new workspace handshake is still settling, so the right panel no longer reopens an old `Final_Description.md`.
- **Description startup recovers the correct pre-submit surface after switching workspace**: when the newly selected workspace only has `questionnaire.md`, the main area now stays aligned with the active workspace and shows the questionnaire editor instead of the false `Description artifact is not available yet` placeholder.
- **Regression coverage now locks the workspace-snapshot guard**: the main-area workflow-state test asserts that artifact derivation only accepts snapshots whose `workspaceSlug` and `workspacePath` match the current active workspace.

### 1.1.994 (previous)
- **Translation engine availability now follows the real provider runtime state**: the Settings `Translation engine` selector keeps `Google GTX Free` available by default, but disables OpenAI Codex and Anthropic Claude engines when their backing provider stack is unavailable in live `core:state`.
- **Provider-owned engines no longer look selectable when access is missing**: unavailable `Codex` and `Claude` translation entries now surface the provider recovery/status message instead of behaving like always-ready engines.
- **The product now stays honest about what it knows**: CodeAI Hub still does not perform a first-class subscription entitlement check, so the UI now gates by actual provider availability/auth status instead of implying that model access has been verified.

### 1.1.993 (previous)
- **Google GTX no longer fails strict localization sync on large runtime bundles**: long marker-preserving localization batches such as `system_feedback` now switch from `GET` to `POST application/x-www-form-urlencoded`, avoiding URL-length overflow and preventing full-bundle fallback during Settings save.
- **The whole-bundle localization contract stays intact for Google**: `LocalizationMaterializer` still sends one structured no-chunk batch per runtime bundle, but `GoogleTranslateClient` now uses transport appropriate for the payload size instead of forcing long bundles through query-string transport.
- **Regression coverage now locks the Google transport split**: the shared translation package tests both short `GET` requests and large `POST` requests, so future changes cannot silently reintroduce the `83 fallback translations` failure on `system_feedback`.

### 1.1.991 (previous)
- **Haiku translation runtime now hard-disables thinking at both transport layers**: the provider-owned Claude Haiku translation path keeps `thinking: { type: "disabled" }` and also passes SDK settings `alwaysThinkingEnabled: false`, preventing literal help text such as `Ultrathink` from reactivating hidden Claude reasoning on interface/help bundle syncs.
- **Translation-only query profile is now locked in by regression coverage**: the Haiku translation service test asserts the explicit SDK `alwaysThinkingEnabled: false` flag together with the existing translate-only prompt and disabled thinking profile.
- **Claude module SSOT now documents the hard-disable requirement**: the module contract explicitly states that translation-only Haiku queries must not allow prompt-triggered thinking heuristics back in.

### 1.1.990 (previous)
- **Haiku localization/help sync now stays on an explicit translate-only path**: the provider-owned Claude Haiku runtime wraps every request in a dedicated translation prompt and repeats the marker-preservation rule for whole-bundle `localization_bundle` batches, so helper/help/interface materialization no longer degrades into raw English responses from an under-specified prompt.
- **Haiku native translation traces are now isolated in the intended runtime bucket**: translation turns keep `persistSession: true`, but the query `cwd` now points at the dedicated `translation-runtime-haiku` project directory while auth/bootstrap still comes from provider-home, restoring predictable native Claude JSONL forensics.
- **Duplicate reasoning translations no longer self-queue**: Core now reuses one in-flight Haiku translation per `engineId + targetLanguage + sourceHash`, removing redundant live/replay duplicate requests that previously stretched long reasoning overlays behind a single-worker queue.

### 1.1.989 (previous)
- **Haiku Settings save no longer fails on a false bootstrap mismatch**: extension-side strict sync now compares the same canonical five-category localization snapshot that Core returns from `/api/v1/localization/bootstrap`, instead of comparing it against a nine-key mirrored shape and rejecting an otherwise valid response.
- **Core-only localization snapshot matching is now explicit and tested**: the Haiku bootstrap path uses a dedicated runtime-settings helper plus regression coverage for the exact `anthropic-claude-haiku-4-5` save scenario that previously raised `Core localization bootstrap does not match the current settings snapshot`.
- **Fast-start fixes from `1.1.988` remain intact**: `Settings` and `Project Manager` still render immediately without blocking on localization bootstrap, while the corrected strict sync path now allows Haiku selection to save cleanly.

### 1.1.985 (previous)
- **Incremental localization sync on Save**: provider-only, response-mode, and continuity saves skip the `Synchronizing localization` overlay entirely; engine or category saves rebuild only the runtime bundles actually affected by the change instead of forcing a full five-bundle rematerialization.
- **Forward-only thinking visibility**: visible `Thinking / Reasoning` bubbles carry an immutable `visibilityAtEmission` decision stamped at emission time, so turning `Thinking in dialog` / `Reasoning in dialog` back on inside a long-running session no longer reveals thinking that was hidden when it was emitted, and hidden thinking never enters the translation queue.
- **Messages for the User explicitly owns visible Thinking / Reasoning**: the localization contract, module SSOT, and Settings helper copy name visible provider Thinking / Reasoning as part of `Messages for the User`, so language + engine selection follow one explicit ownership decision.

### 1.1.984 (previous)
- **Reasoning translation no longer re-chunks live thinking by default**: shared runtime translation now keeps each provider-emitted reasoning block intact unless a caller explicitly opts back into chunking.
- **Lower latency for Codex, Gemini, and Claude thinking overlays**: the Core-owned reasoning overlay path now sends one translation request per visible thinking message instead of `2-5` sequential subrequests for the same message.
- **Reasoning chunking remains opt-in only**: generic/document translation keeps the existing engine-aware chunk planner, while reasoning can still explicitly request `chunkingMode = auto` for future experimental callers.

### 1.1.983 (previous)
- **Codex thinking translation bootstrap path repaired**: Core now reads the persisted localization bootstrap snapshot from the canonical `~/.codeai-hub/localization/cache/browser-runtime-bootstrap.json` path instead of a double-prefixed non-existent path under `~/.codeai-hub/.codeai-hub/...`.
- **Live reasoning overlays resume dispatch**: once the persisted bootstrap matches the active localization settings, Codex `thinking` fragments can again enter the translation dispatch path and produce async overlay patches instead of being skipped forever as `localization_sync_pending`.
- **Regression coverage for production-like settings/bootstrap layout**: Core now tests the exact `~/.codeai-hub/settings/` + `~/.codeai-hub/localization/cache/` layout that previously disabled all Codex thinking translation in release runtime.

### 1.1.978 (previous)
- **Codex artifact language no longer falls back to English after PM restart**: Project Manager now reuses the persisted browser localization bootstrap snapshot when live settings cache is not ready, so `Artifacts for the User` stays aligned with the saved runtime language.
- **Codex translation runtime survives legacy auth layout**: isolated translation-only Codex homes now bootstrap from provider home first and transparently fall back to legacy `~/.codex` auth/cache when needed.
- **Thinking translation chunks stay independent**: Codex reasoning delta messages now emit deterministic per-chunk ids instead of reusing one provider item id, preventing later translation overlays from overwriting earlier thinking fragments in live/replay/history paths.

### 1.1.976 (previous)
- **Codex Spark thinking translation repaired**: Codex rollout thinking now stays on the source-first path and is upgraded by the Core-owned translation overlay instead of attempting a second provider-local translation inside the active Codex turn.
- **Final assistant restore under workflow schema mode**: rollout `final_answer` plain text now has a safe fallback path when structured parsing yields no `assistantText`, so Codex workflow turns no longer finish without a visible final reply.
- **Dead rollout adapter removed**: the obsolete provider-local Codex thought-translation adapter has been removed, keeping the runtime aligned with the single-owner overlay architecture and preventing `knip` regressions.

### 1.1.973 (previous)
- **Source-first thinking overlays**: visible reasoning/thinking messages now appear immediately in their native provider language, then asynchronously switch to the user's language through stable `messageId`-based translation overlays instead of waiting on provider-local translation before render.
- **Persisted localized history projection**: translated thinking is now cached per session in a Core-owned sidecar and reapplied on history load, so reopening a session restores already-localized reasoning without rewriting the canonical transcript.
- **Claude runtime packaging guard**: release packaging now validates that the Claude installed bundle includes `@codeai-hub/translation`, closing the runtime gap that could break Claude's remaining provider-local pre-tool translation path.

### 1.1.972 (previous)
- **Trunk-step provider override**: idle `Virtual Simulation` and `Diagram Modules` confirmation cards now show an inline provider selector. The previous-step provider stays preselected for the one-click path, but you can switch to any connected provider before pressing `Start step`.
- **Chosen-provider bootstrap sync**: when a new step starts on a different provider, Project Manager now seeds the dialog/bootstrap snapshot from the explicit step-start provider intent, so the lower model/status panel opens on the correct provider context instead of inheriting stale state from the previous trunk step.
- **Provider-correct usage limits after step start**: once the new step session reaches `binding.status === ready`, `Session ID + Usage Limits` refreshes against the selected provider/runtime identity and shows the correct provider-family limits (`Claude`, `Codex`, or `Gemini`).

### 1.1.971 (previous)
- **Simplified dialog restore adoption**: Project Manager no longer blocks restored runtime-session adoption on PM-only `sessionKind`, so the auto-opened workflow step can actually switch from placeholder to real runtime session on first workspace open.
- **First-open limits path restored**: once the real runtime session is adopted, the existing ready-time `Session ID + Usage Limits` refresh path runs on the first auto-selected step instead of waiting for a manual step switch.
- **No extra restore heuristics**: the fix removes one invalid matcher condition instead of adding more branching, keeping the dialog restore path aligned to real continuity identity (`workspace`, `stage`, `run`, `provider`, `providerSessionId`).

### 1.1.970 (previous)
- **Auto-select runtime-restore fix**: Project Manager no longer fires usage-limits refresh from a dialog bootstrap placeholder before the real runtime session exists, so limits can render on the auto-opened workflow step after workspace launch.
- **Pending-to-runtime adoption in dialog mode**: when Core materializes the runtime session for a restored dialog continuity entry, PM now replaces the placeholder snapshot with that real runtime session and carries the loaded dialog history forward.
- **Ready-only manual refresh**: `Session ID + Usage Limits` now waits for `binding.status === ready` before sending manual refresh, preventing skipped requests against non-existent runtime sessions during restore.
### 1.1.969 (previous)
- **Auto-select diagnostics routed into file logs**: standalone Project Manager now forwards usage-limits investigation events into Core-owned file logging, so the restore/bootstrap trace is captured in `~/.codeai-hub/logs/core/core.log`.
- **Refresh decision visibility in Core**: Core now records whether a manual usage-limits refresh found a runtime session, found a bound provider session id, and was actually dispatched to the provider adapter.
- **Diagnostic-only release**: this build is for isolating the auto-select usage-limits race after workspace open; it does not claim a behavioural fix yet.
### 1.1.968 (previous)
- **Dialog-session usage limits restored**: Project Manager dialog-mode sessions now trigger the same live `Session ID + Usage Limits` refresh path as runtime sessions, so limits render again on active workflow stage screens.
- **Live quota readers remain authoritative**: Codex, Claude, and Gemini limits continue to come from their provider-specific live quota/HTML readers, not from SDK usage logs or stale browser state.
- **Provider-global behavior retained**: sessions that use the same provider still converge to one provider-global usage scope (`claude:global`, `codex:global`, `gemini:global`) across workflow steps.

### 1.1.967 (previous)
- **Provider-global usage limits**: sessions that use the same provider now converge to a shared provider-global usage scope (`claude:global`, `codex:global`, `gemini:global`) instead of diverging by provider session id.
- **No stale usage-limits cache**: `Session ID + Usage Limits` no longer hydrates from persistent browser cache and now renders only from live snapshot state after refresh.
- **Legacy scope migration on restore**: restored workflow sessions with old session-specific usage-limit scope keys are normalized into the provider-global contract as soon as fresh limits arrive.

### 1.1.966 (previous)
- **Session-scoped usage limits refresh**: `Session ID + Usage Limits` now refreshes against the real active session context (`sessionId + providerId + providerSessionId`) instead of a provider-wide synthetic bucket.
- **Cold-start and stage-switch coverage**: usage limits refresh now reruns when Project Manager restores the active workflow session on workspace open and when the user switches to another workflow step/session.
- **Immediate rerender path**: Core broadcasts manual refresh results back into the concrete runtime `sessionId`, so the active snapshot updates immediately through the normal `session:stream -> snapshots -> rerender` flow.

### 1.1.922 (previous)
- **Sidecar v2 persists layout params**: `module-map.flow.json` schema bumped to `version: 2` with a new `layoutParams` section holding per-ProductPart (`columns`, `targetAspectRatio`) and per-Cluster (`moduleColumns`) CSS Grid overrides. Right-click selections now survive diagram reload, PM restart, and cross-window sidecar sync.
- **Backwards compatible with v1**: existing `module-map.flow.json` files from `1.1.921` still load without errors; missing `layoutParams` fall back to defaults, and on first context-menu edit the sidecar is upgraded to v2 automatically.
- **Enum-guarded parser**: invalid `columns` / `targetAspectRatio` / `moduleColumns` values are dropped per entry instead of failing the whole sidecar, so hand-edited files degrade gracefully to defaults.

### 1.1.921 (previous)
- **React Flow removed**: `@xyflow/react` dependency deleted; ProductPart cards render in single-column CSS Grid with native scroll.
- **CSS Grid at all levels**: ProductParts, Clusters, and Modules all use browser-native CSS Grid — zero JS layout code.
- **Right-click context menu** for ProductPart (columns, aspect ratio) and Cluster (module columns) layout overrides — in-memory only until Sidecar v2 in 1.1.922.
- **Cmd/Ctrl+scroll zoom** with smooth sensitivity; Cmd/Ctrl+0 resets to 100%; clickable zoom badge.
- **Edges between modules removed** from the diagram canvas.

Previous releases (summary): `1.1.800–1.1.917` — CSS Grid layout engine replacing the iterative settle-loop (~1350 lines deleted), standalone file-link query decode hotfixes, left-sidebar active-stage sync, temporary `Description`-first workspace startup, workflow-state startup SSOT alignment, Diagram Modules canonical English naming under localized prose, Codex raw-rollout dialog semantics, Codex empty-terminal answer recovery, the short-lived `Foundation Envelope` rollout later retired in `1.1.906`, the heuristic-only Diagram Modules boundary wave in `1.1.907–1.1.915`, and earlier localization/provider/release stabilization waves.

## Features
- **Unified provider orchestration**: launch Claude, Codex, or Gemini sessions from an identical picker; the dialog surfaces connection state, enforces one-provider selection, and reminds you to install/authenticate matching CLIs.
- **Description-first workflow**: the first guided workflow step is `Description`, producing `questionnaire.md` and `Final_Description.md` as the canonical entry into `Virtual Simulation`.
- **Persistent standalone UI**: the macOS launcher (CEF) stores window position and size in real time, so Project Manager reopens exactly where you left it—even across monitor changes.
- **Offline-first packaging**: manifests point to the local `~/.codeai-hub/releases/` cache, build scripts publish fresh tarballs for core, launcher, and provider modules without relying on GitHub downloads, and the shipped VSIX excludes repository-only Husky hook helpers.
- **Quality guardrails**: Ultracite architecture rules, jscpd duplication scans, knip dead-code detection, and Biome formatting are orchestrated through Husky pre-commit/pre-push hooks.

## Current Installation Path
CodeAI Hub is already usable, but the current recommended installation path is still source-based.
If you want to try the product today, clone the repository, build the release artifacts locally, and install the generated VSIX into Visual Studio Code.

### Prerequisites
- Git
- `nvm`
- Node.js 20 + `npm`
- Visual Studio Code
- `cmake` (required for the standalone CEF launcher / Project Manager build)
- the provider CLIs or SDK access you plan to use (`Claude`, `Codex`, `Gemini`) installed and authenticated separately

### Build from Source
```bash
git clone https://github.com/OleynikAleksandr/CodeAI-Hub.git
cd CodeAI-Hub
nvm use || nvm install 20
npm install
npm run setup:hooks
./scripts/build-all.sh
./scripts/build-release.sh --use-current-version
```

### Build Output
- VSIX package in the repository root: `codeai-hub-<version>.vsix`
- fresh runtime tarballs in:
  - `doc/tmp/releases/`
  - `~/.codeai-hub/releases/`

### Install into VS Code
Open Visual Studio Code and run `Extensions: Install from VSIX...`, then select the generated `codeai-hub-<version>.vsix`.

### Notes
- This is the current early-access path, not a polished one-click installer.
- The first full build can take a while because it prepares provider bundles, UI bundles, core runtime, and the standalone launcher.
- Provider CLIs / SDKs are not bundled inside this repository and must be available separately.

Before starting, read `doc/SolidWorks-WorkFlow/Docs_Index.md` and follow the SSOT contracts in `doc/SolidWorks-WorkFlow/Contracts/` (especially `Contracts/Workflow_CLI.md`) to configure provider CLIs and SDKs.

## Development Workflow
1. Install dependencies
   ```bash
   npm install
   npm run setup:hooks    # installs Husky git hooks
   ```
2. Implement changes in `src/` and `packages/**` (micro-classes + facades; keep files under 500 lines).
3. Run quality checks before committing:
   ```bash
   npm run quality        # architecture gate + Ultracite lint
   npm run check:knip     # detect unused files/exports
   npm run compile        # ensure TypeScript builds cleanly
   ```

## Public CI
- GitHub Actions now runs a minimal public CI baseline on every push to `main` and on every pull request.
- The workflow enforces the same root quality gates used as the local baseline: `npm run check:architecture`, `npm run lint`, `npm run check:knip`, and `npm run compile`.
- The root `compile` gate now builds `@codeai-hub/translation`, `@codeai-hub/localization`, and `@codeai-hub/core-supervisor` before browser/root type-check, so clean GitHub runners do not depend on pre-existing workspace `dist/` folders.
- Local Husky hooks remain the fastest feedback path; CI is the public verification surface, not a replacement for the local release ritual.

## Building a Release
```bash
./scripts/build-all.sh
./scripts/build-release.sh --use-current-version
```

## Repository Layout
```
media/                       Bundled webview assets (CSS + JS) shipped with the extension.
media/react-chat.js          React bundle generated by the webview build script.
src/core/webview-module/     HTML scaffold that injects the webview assets.
src/extension-module/        Extension host micro-classes.
src/extension.ts             Entry point registering the webview provider.
scripts/                     Quality and release automation.
doc/                         Architecture and knowledge base.
```

## License
This repository is currently distributed as `UNLICENSED`. Source is visible for audit and development collaboration, but redistribution requires explicit permission from the repository owner.
