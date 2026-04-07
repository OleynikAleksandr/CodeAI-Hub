# Changelog

This project evolves quickly during active FLOW development. We keep the changelog intentionally short and treat the code + docs as the primary source of truth.

## [Unreleased]

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
