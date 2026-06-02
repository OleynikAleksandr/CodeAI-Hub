# CodeAI Hub

CodeAI Hub is a Visual Studio Code extension + standalone Project Manager (CEF) that unifies multiple AI providers behind a single, type-safe orchestration layer.

**Current Release — v1.2.444** (Product Part Agent Language And Session Repair)

This release repairs the Product Part agent orchestration defects found after
1.2.443. Product Part prompts now use the global localization settings, so
Russian `ru/ru` workspaces no longer fall back to `en/en` for agent responses or
user-facing draft artifacts. Product Part start prompts are stored as visible
user turns instead of system messages, and accepted Product Part handoffs now
include the continuity index in the managed ledger commit so the workspace does
not stay dirty after Core accepts a brief.

**Previous Release — v1.2.443** (Provider Warmup Snapshot Repair)

This release fixes a Project Manager provider picker regression from 1.2.442.
Core now sends a fresh provider snapshot after startup warmup finishes, so
provider rows such as Claude move from `starting` / unavailable to active
without requiring a Project Manager reload. This keeps the visible provider
state aligned with the Core `/api/v1/status` provider state.

**Previous Release — v1.2.442** (Product Part Agent Handoff Repair)

This release repairs the Product Part agent handoff after the Quality Gates
bootstrap from 1.2.441. Core now accepts completed Product Part Development
Brief agent outputs, validates filled brief blocks, commits accepted drafts, and
moves each Product Part stage todo plan to user review. Accepted briefs are
marked as agent-touched, Product Part sessions no longer push workflow state
back to older Documentation Tree steps, and the Core start prompt for each
Product Part agent is stored as an auditable visible session message.

**Previous Release — v1.2.441** (Quality Gates Product Part Handoff)

This release moves Product Part Development Brief bootstrap to the accepted
Quality Gates Baseline terminal handoff. Diagram Modules completion no longer
creates Product Part brief drafts or stage todo plans, so the Diagram Modules
dirty gate stays focused on diagram artifacts only. After Quality Gates is
accepted, Core materializes Product Part brief plans/drafts, starts Product Part
agent sessions, and commits those bootstrap files through the managed Quality
Gates handoff.

**Previous Release — v1.2.440** (Compact Product Part Bootstrap Fix)

This release fixes the Development Tree regression from 1.2.439. Core no
longer projects or materializes the legacy `Lead Product Part Orchestration` /
Contract Graph operation rows, and Product Part bootstrap now creates top-level
Product Part folders for every planned Product Part before starting Product Part
Development Brief work. The left tree stays focused on Product Part -> Cluster
-> Module, while Product Part workflow details remain right-panel artifacts and
sessions.

**Previous Release — v1.2.439** (Product Part Brief Agent Bootstrap)

This release starts the Development Tree orchestration flow for Product Parts.
Core now creates Product Part stage todo plans, materializes the first
`ProductPartDevelopmentBrief.draft.md` artifact, and starts Product Part agent
sessions from inline prompts without opening Cluster or Module agents yet. This
keeps the first real development event focused on a lightweight brief for each
Product Part before deeper cluster/module work begins.

**Previous Release — v1.2.438** (Compact Development Tree Scaffolding)

This release finishes the compact Development Tree model for clusters and fresh
workspace scaffolding. Core no longer emits `Workers` / `Integration` operation
rows under cluster nodes, so the left tree stays Product Part -> Cluster ->
Module. Fresh Development Tree materialization also creates only real
product/cluster/module folders in `.codeai-hub/.../development_tree/...` and
`doc/TODO/stages/development-tree/...`; worker progress and integration state
belong to right-panel workflow artifacts.

**Previous Release — v1.2.437** (Compact Module Development Tree)

This release updates the Development Tree module projection. Core no longer
emits module phase rows (`Module / Facade Specification`, `Implementation`,
`Workers`, `Integration`) under each module node, so the left tree stays focused
on the product structure: Product Part -> Cluster -> Module. Module work
details are now documented as right-panel surfaces for the selected module.

**Previous Release — v1.2.436** (Clear/Undo Menu Polish)

This release polishes the Development Tree context menu and confirm dialog from
1.2.435. The menu item is now compact and centered, the dialog uses compact
buttons, and the action is labelled `Clear/Undo` since it is an undo via Git
rollback. The menu and dialog now read as part of the tree's visual language.

**Previous Release — v1.2.430** (Project Manager Startup + Claude Thinking Defaults)

This release shortens the first Project Manager startup path by opening the
Core remote bridge before heavy provider warmup finishes. Providers now report a
startup warmup state and only expose adapters after successful initialization,
so the manager can load workspace and settings surfaces earlier without letting
provider actions run against unready modules. Project Manager also stops
requesting provider npm version checks on the initial socket connection. Claude
Thinking mode is now enabled by default for new or missing settings while
preserving explicit existing opt-outs.

**Previous Release — v1.2.429** (Managed Artifact Authority)

This release separates user-readable managed Markdown from machine-readable
runtime state. Application Skeleton materialization state now comes from
`application-skeleton-map.json`, while `application-skeleton.md` is validated as
review prose only. Quality Gates terminal integration likewise trusts
`quality-gates.json`, package scripts, hooks, and filesystem evidence; Markdown
availability tables no longer block completion as runtime state.

**Previous Release — v1.2.428** (Quality Gates Contract Lifecycle)

This release tightens Quality Gates Baseline integration without making the
artifact prose over-rigid. Core now rejects only contract lifecycle conflicts
that affect future code execution: if a gate already has runner evidence, it
must leave planned/not-integrated state and become an executable required gate.
Quality Gates repair prompts also stay product-agnostic, while visible Core
messages are concise and the full technical repair prompt is sent only to the
agent continuation.

**Previous Release — v1.2.427** (Quality Gates Dirty Gate + Stop Override)

This release fixes the Quality Gates terminal dirty-Git blocker found in
1.2.426. Core now treats generated workspace-local build artifacts such as
`.artifacts/go/terminal` as Quality Gates repair diagnostics before terminal
handoff, instead of asking the user to resolve Git manually. Stop also
force-releases Core-owned managed input gates so a stuck managed blocker can
return the dialog to user control.

**Previous Release — v1.2.426** (Quality Gates Script ID Normalization)

This release fixes the Quality Gates integration validator false negative found
in 1.2.425. Core now treats already canonical `qg:*` gate ids as exact npm
script names instead of rewriting them into `qg:qg:*`, so valid package scripts
and direct Husky hook calls are accepted during Quality Gates Baseline
integration repair validation.

**Previous Release — v1.2.425** (Quality Gates Phase Authority + Stage Plan Labels)

This release fixes the Quality Gates integration repair lifecycle. Core now
keeps Quality Gates validation in the stage-plan-owned integration phase while
an integration or integration-repair microtask is active, so an agent cannot
roll the step back to draft/user-review by rewriting artifact lifecycle flags.
Managed stage plans also use one visible phase convention: numbered workflow
phases start at Phase 1, while Core-only checkpoints and repair cycles use
unnumbered section headings.

**Previous Release — v1.2.424** (Quality Gates Terminal Cleanup + Managed Logs)

This release fixes the Quality Gates terminal cleanup path. Core now treats
managed workflow runtime ledgers as Core-owned committable state and routes
generated root build artifacts back through provider-visible repair before the
step can complete, instead of opening a manual dirty-Git blocker for the user.
Managed workflow lifecycle logs also stay grouped under the real workspace
folder name, while temporary/test workspace paths are suppressed unless an
explicit diagnostic log root is configured.

**Previous Release — v1.2.423** (Application Skeleton Auto-Complete Handoff)

This release fixes the Application Skeleton acceptance lifecycle. When the user
confirms the reviewed contract, Core now locks the managed input gate before
materialization starts, routes recoverable materialization/validation failures
back to the provider-visible agent turn, and auto-completes successful
materialization directly into Quality Gates without opening a second user review
gate. Managed workflow lifecycle JSONL logs are also grouped by the real
workspace folder name under `~/.codeai-hub/logs/managed-workflow/`.

**Previous Release — v1.2.422** (Application Skeleton Repair Dispatch)

This release fixes the Application Skeleton review-confirmation failure path.
When Core-owned scaffold materialization or environment validation fails after
the user confirms the draft, Core now records a failed materialization state,
commits the rejected attempt into the managed stage plan, keeps the user handoff
closed, and sends a concise repair prompt back to the provider-visible agent
turn instead of dumping diagnostics to the user as a terminal System message.
The Core materializer also preserves an honest failed lifecycle snapshot so the
workspace no longer claims `materialized: true` before validation succeeds.

**Previous Release — v1.2.421** (Application Skeleton Materialization + Managed Stage Logs)

This release fixes Core-owned Application Skeleton materialization for polyglot
project foundations. The materializer now creates every contract-declared
configuration file, writes syntax-valid Python/Go/TypeScript first-wave
entrypoints, and only adds npm package/tsconfig metadata to Product Parts that
declare npm/TypeScript participation. Managed lifecycle diagnostics also now
cover all managed technical stages with separate user-level JSONL logs for
Diagram Modules, Application Skeleton, and Quality Gates Baseline under
`~/.codeai-hub/logs/managed-workflow/<workspace-slug>/`.

**Previous Release — v1.2.420** (Managed Input Gate Priority Fix)

This release fixes the stale snapshot overwrite found by the 1.2.419
diagnostics. Project Manager now treats managed workflow input locks as higher
priority than idle/no-rollover workspace snapshots, so Diagram Modules stays
blocked while Core and the agent continue managed Product Part subturns and
opens only at the managed review/complete handoff. Diagram Modules lifecycle
diagnostics also moved out of the workspace runtime capsule and now write under
`~/.codeai-hub/logs/managed-workflow/<workspace-slug>/diagram-modules-lifecycle.jsonl`,
so developer traces cannot be mistaken for dirty workflow artifacts.

**Previous Release — v1.2.419** (Managed Lifecycle Diagnostics)

This release adds explicit diagnostics for the remaining managed input unlock
investigation. Diagram Modules sessions now write a workspace-local lifecycle
trace at `.codeai-hub/<workspace-slug>/runtime/logs/diagram-modules-lifecycle.jsonl`
with persisted Core/user/agent messages and Core managed input gate
transitions. Project Manager also reports managed input gate decisions to the
Core log, including continuation-tag locks, review/complete releases, workspace
snapshot input-state applications, and stale idle snapshots that try to reopen
the input.

**Previous Release — v1.2.418** (Managed Continuation Lifecycle Lock)

This release fixes the remaining managed input unlock observed after 1.2.417.
Core-authored managed continuation prompts still appear as visible `User` turns,
but now carry the `managed-workflow-continuation` lifecycle tag. Project
Manager dialog history uses that Core-owned marker to keep the input locked
while the agent continues managed Core-orchestrator work, and releases only on
the managed review/complete handoff.

**Previous Release — v1.2.417** (Managed Gate + Compact Continuations)

This release fixes two remaining managed Diagram Modules regressions from the
1.2.416 retest. Project Manager dialog projections now preserve a Core-owned
`managed_input_gate` lock when later stale idle workspace snapshots arrive, so
the input cannot reopen while Core and the agent are still exchanging managed
technical-stage turns. Diagram Modules Product Part continuations are also
compact delta `User` turns inside the same provider session: Core names the
accepted boundary, next target artifact, Product Part id, and local constraints
without resending embedded templates or field references on every subturn.

**Previous Release — v1.2.416** (Managed Continuations As User Turns)

This release fixes the root lifecycle mismatch behind the remaining managed
workflow input unlock. Core-authored prompts that actually start the next agent
turn are now recorded and dispatched as visible `User` turns, the same way the
initial workflow prompt is. Core/system messages remain reserved for user-facing
handoff and review notices that are not sent to the agent. Diagram Modules and
Quality Gates managed continuations therefore re-enter the normal user-turn
input lifecycle instead of appearing as idle System-only updates.

**Previous Release — v1.2.415** (Core-Owned Managed Input Gate)

This release moves the managed workflow input lock to a Core-owned realtime
gate that is independent of provider turn idleness and Project Manager local
triggers. Core now emits `managed_input_gate` stream events for the runtime
session and its dialog/root aliases whenever managed Core-agent work starts or
ends. Project Manager only projects that Core state, including provider-session
matched dialog views, so the input stays blocked while Core and the agent are
still exchanging managed technical-stage messages and opens only at the
Core-authored user boundary.

**Previous Release — v1.2.414** (Managed Conversation Gate Lock)

This release closes the managed technical-stage unlock window between a
provider terminal event and Core's next managed handoff. When a managed
technical turn reaches Core arbitration, Core now asserts the
`managed_core_gated` lock and emits `turn_state=running` before publishing the
terminal event to clients. The session stays blocked while Core validates,
commits, and dispatches the next internal managed turn; input opens only when
Core creates a user review gate, blocked boundary, or complete user handoff.

**Previous Release — v1.2.413** (Managed Stage-Level Lock Reassertion)

This release keeps managed technical-stage input locked through the full
Core-orchestrator/provider exchange. Core now reasserts `managed_core_gated`
after every managed continuation decision, so stale terminal or idle provider
signals cannot unlock input between Core accepting one artifact and dispatching
the next managed subturn. Diagram Modules dispatch-next boundaries also stay
Core-gated until an explicit user review, blocked, or complete boundary opens.

**Previous Release — v1.2.412** (Managed Core Arbitration Lock Fix)

This release fixes the remaining managed technical-stage input unlock observed
during Diagram Modules. Core now locks the input as soon as a provider turn
enters managed arbitration, before validation, managed commits, or continuation
dispatch can expose an idle snapshot. Managed internal continuations are also
dispatched without waiting for the next provider turn inside the previous
arbitration, so Diagram Modules, Application Skeleton, and Quality Gates keep
one Core-owned lock lifecycle until review or blocked settlement.

**Previous Release — v1.2.411** (Managed Lock Continuation Fix)

This release fixes the 1.2.410 managed core-gated input lock, which still
released between agent turns. The lock was keyed only to the managed turn
result, but continuation turns report "settled" without an internal prompt and
wrongly freed the input. Core now keeps the input locked while the agent keeps
continuing the managed work, releasing it only at the user-review gate.

**Previous Release — v1.2.410** (Managed Core-Gated Input Lock)

This release keeps the chat input locked for the whole managed core-gated phase
(e.g. Diagram Modules), where the agent works only with the Core orchestrator
across sub-steps. Core now holds a session lock while a managed turn keeps
"continuing" and releases it when the stage reaches the user-review gate, so the
input no longer frees up between agent turns. The lock is derived in Core from
the managed run status — a single source of truth — and the UI only reflects it.

**Previous Release — v1.2.409** (Input Unlock Timing Fix)

This release corrects the input-lock behavior from 1.2.408. The chat input is
free whenever the system or agent is waiting for the user — including when a
review gate (the confirm prompt) is shown, where 1.2.408 wrongly blocked it. To
stop the input from freeing up too early, it now unlocks a short moment after
the agent's turn settles (so the last streamed lines finish rendering first)
rather than the instant the turn goes idle; a review gate still unlocks
immediately.

**Previous Release — v1.2.408** (Retest Scroll & Input-Lock Fixes)

This release fixes issues found while retesting 1.2.407. The questionnaire now
scrolls to the submit footer reliably even when auto-height fields expand after
load, so it no longer lands mid-list. The session dialog re-pins to the bottom
when a reasoning bubble grows after its English text is replaced by a taller
Russian translation, so the latest message stays fully visible. The chat input
now stays locked while a managed-workflow review gate is pending, so it no
longer unlocks prematurely before the orchestrator gate is shown.

**Previous Release — v1.2.407** (Questionnaire Auto-Scroll)

This release makes the project description questionnaire scroll automatically.
On open it resumes at the first unfilled required section; once every required
section is filled (section 11 is the last required one, while Notes stays
optional) it scrolls down to the "Submit questionnaire" button. Typing in
intermediate sections no longer forces manual scrolling to reach submit.

**Previous Release — v1.2.406** (Claude Reasoning Summary Language)

This release asks Claude visible thinking/reasoning summaries to follow the
runtime reasoning/chat language selected for the current workflow step. Russian
sessions now instruct Claude to avoid English default summary headings and
short progress labels.

Claude provider-local thinking translation also skips a second translation pass
when the target language is Russian and the emitted thinking already contains
Cyrillic text. English thinking in Russian-target sessions still flows through
the translation facade.

**Previous Release — v1.2.405** (LM Studio Memory Lifecycle)

This release adds TTL and Core-owned cleanup for CodeAI-owned LM Studio model
loads so local translation and workflow-agent experiments do not leave idle
`codeaihub-*` model instances pinned in memory across Core restart/shutdown.

Core now suppresses or trims non-live assistant tails already covered by
immediately preceding `tag: "live"` chunks. Claude live text buffering also
avoids splitting markdown links at URL/domain periods, so Sources lists remain
stable while streaming.

**Previous Release — v1.2.403** (Local Provider Native Chat)

This release stabilizes Local Models as a workflow-step provider for LM Studio
reasoning models. Workflow-agent turns now use LM Studio native `/api/v1/chat`,
parse only final assistant message output after reasoning blocks, and report
reasoning-only or socket/fetch failures with explicit diagnostics.

Core also unloads idle CodeAI-owned local model workers from other model keys
before creating a new heavy LM Studio load. This prevents translation and
workflow-agent trials from leaving multiple large idle MLX workers in memory,
while preserving generating workers and manually loaded LM Studio models.

**Previous Release — v1.2.402** (LM Studio Runtime Profiles)

This release fixes Local Models runtime loading for LM Studio. Core now chooses
LM Studio context windows by purpose: short reasoning translation stays fast,
UI localization gets an adaptive bounded context, and workflow-agent turns keep
their separate provider profile.

Core also reuses loaded LM Studio models when they already have enough context
and unloads idle same-model clones before creating a new load. This prevents
`hy-mt2` and similar large MLX models from accumulating extra idle copies while
Project Manager materializes UI localization or translates reasoning.

**Previous Release — v1.2.401** (Step Confirmation Navigation)

This release makes explicit workflow artifact confirmation advance the visible
Project Manager card to the next Core-active trunk step. After `Подтверждаю`,
Core emits `workflow:stage:activate` only after the accepted artifact and commit
boundary are complete, and Project Manager displays that Core-owned command.

The user can still return to the completed step manually and continue the
dialog there. Project Manager remains a projection: it does not infer acceptance
from text, buttons, or local UI state.

**Previous Release — v1.2.400** (Session Wait Copy Classification)

This release fixes the Project Manager input wait copy while preserving Core as
the source of truth for session lifecycle. Ordinary Core-owned post-turn waits,
including `context_check_pending` and managed workflow validation/continuation,
remain input-locked but now show `Agent is working... Please wait.`.

**Previous Release — v1.2.399** (Local Preliminary Artifact Materialization)

This release fixes Local Models workflow-step completion for preliminary
documentation stages. When an LM Studio model returns the target artifact as a
fenced markdown block in chat, Core now materializes that block into the
canonical workflow file before opening user review.

Description and Virtual Simulation review gates now fail closed when the
required artifact file is missing. This prevents `подтверждаю` from completing a
step that did not physically create `Final_Description.md` or
`virtual-simulation.md`.

**Previous Release — v1.2.398** (Local Provider Context Loading)

This release stabilizes Local Models as a workflow-step provider. Core now loads
workflow-agent turns through a CodeAI-owned LM Studio identifier with a
provider-only context window, so large Description prompts no longer route to a
short-context shared model instance and fail with LM Studio HTTP 400.

The translation engine path is intentionally unchanged. UI/reasoning
translation keeps the existing short-context, batched LM Studio behavior for
fast responses while workflow steps get the larger context they need.

**Previous Release — v1.2.397** (Local Model Catalog Loading)

This release restores immediate Local Models visibility in Project Manager after
startup and settings reloads. Core now sends the localization engine catalog
with the first settings payload, so downloaded LM Studio models appear in the
Local Models Settings tab, workflow step cards, dialog model picker, and
Localization Engine selectors before full UI localization materialization
finishes.

Project Manager also merges the fast catalog into the active localization
runtime without clearing translated bundles. This keeps Russian UI text stable
while still exposing new `lmstudio:*` engines as soon as Core discovers them.

**Earlier Release — v1.2.396** (Localization Runtime Guard)

This release keeps Project Manager localization stable after workflow
clear/rollback and settings reloads. Core can emit an immediate settings event
before the next localization runtime payload is resolved; Project Manager now
preserves the active translated runtime until a non-empty replacement arrives.

The runtime guard is applied to both the Project Manager shell and the shared
Settings surface, so Russian helper text and reasoning translations no longer
drop back to English during intermediate reload events while LM Studio resolves
or refreshes localization payloads.

**Previous Release — v1.2.395** (Local Models Bundle Batching)

This release fixes local-model UI localization materialization for LM Studio.
Runtime localization bundles are now split into bounded structured batches
before they are sent to local models, instead of sending a whole UI category in
one large request. This keeps local MLX models responsive and prevents Project
Manager from staying on the English bootstrap fallback while a large local
translation request is pending or fails.

The real LM Studio smoke test uses `lmstudio:gemma-4-26b-a4b-it` to materialize a
multi-entry Russian `user_guidance` bundle as two bounded requests with no
fallbacks, while preserving protected terms such as `API`, `JSON`,
`CodeAI Hub`, and `{providerId}`.

**Previous Release — v1.2.394** (Local Models Runtime Reliability)

This release makes LM Studio local model execution reliable from Project Manager.
Core now starts the LM Studio local server before local model translation and
provider calls, handles the server status output format used by LM Studio
0.4.14, and rejects unchanged English localization output instead of saving a
bad translated bundle as ready.

The local translation smoke test now exercises the real
`lmstudio:gemma-4-26b-a4b-it` engine through Core and verifies Russian output
with protected terms such as `API`, `JSON`, `CodeAI Hub`, and `{providerId}`
preserved.

**Previous Release — v1.2.393** (Local Models Provider Visibility)

This release promotes LM Studio local models to a full Project Manager provider
surface and fixes GUI-launched runtime discovery. Downloaded LM Studio models are
now visible in provider selection cards and in UI Translation Engine selectors.

Core now searches the LM Studio CLI in the app runtime environment, including the
standard `~/.lmstudio/bin/lms` install path, and exposes downloaded models as
both provider model options and dynamic `lmstudio:<modelKey>` translation
engines. Local model download, deletion, and context tuning remain in LM Studio
for this release.

**Previous Release — v1.2.392** (LM Studio Local Models)

This release adds LM Studio local models as selectable translation engines for
both live Reasoning translation and interface localization materialization. Core
discovers downloaded LM Studio LLMs, registers them as `lmstudio:<modelKey>`,
loads the selected model on demand, and calls the local OpenAI-compatible API.

The Settings localization selectors now preserve local model selections for UI
and Reasoning translation. Local model download, deletion, and context tuning
remain in LM Studio for this release.

**Previous Release — v1.2.391** (Managed Input Lock Rebuild)

This release rebuilds the managed input lock hotfix under a fresh package
number for installation and retest. Runtime behavior is the same hotfix line as
v1.2.390: Core-owned managed workflow continuations keep the session input
locked until an explicit user handoff.
**Previous Release — v1.2.390** (Managed Input Lock Hotfix)

This hotfix keeps the session input locked while Core owns a managed workflow
continuation and is internally handing work to the agent. Project Manager now
locks on Core `managed-workflow-continuation` system messages and releases only
when Core emits an explicit user handoff such as review or completion.

Diagram Modules also keeps the input locked through the product-part generation
sequence until aggregate/review readiness, instead of unlocking during the race
between one provider turn completing and the next Core-managed turn starting.

**Previous Release — v1.2.389** (Residual Boundary Cleanup Hotfix)

This hotfix stops provider runtime session transcripts from blocking the next
workflow boundary. Files under
`.codeai-hub/<workspace>/runtime/sessions/unified/<provider>/`, including
translation JSONL logs, are treated as mutable provider runtime state instead of
rollback-owned workflow artifacts.

After Core accepts a preliminary workflow step, it now auto-commits
workflow-neutral residual document changes in a separate
`codeai-step: <Stage> residual documents` commit and shows the committed paths
to the user. Code/config/unknown dirty paths still block the next workflow step
because they may affect the generated design output.

**Previous Release — v1.2.388** (Global Settings Split Hotfix)

This hotfix preserves an existing GLM-Claude-Code global config at
`~/.codeai-hub/providers/glm-claude-code/config.json` during install/runtime
bootstrap, so extension upgrades do not rewrite a user's API-key file.

General user preferences are now split from workspace settings. Core-owned
`general.coreControls`, `general.localization`, `general.responsePolicy`, and
`general.textToSpeech` persist in the global app settings file, while workspace
settings keep provider/model/runtime values. Localization runtime assets,
bootstrap payloads, and the user glossary also resolve under the global app
localization root instead of each workspace capsule.

**Previous Release — v1.2.387** (GLM Workspace Capsule Slug Hotfix)

This hotfix aligns Core startup config with the same workspace slug contract used
by Project Registry and Workspace Runtime Capsule. When `CLAUDE_PROJECT_SLUG`
is not provided, Core now derives the fallback slug from the workspace basename
instead of sanitizing the full absolute path.

GLM-Claude-Code therefore writes its provider home into the existing workspace
capsule, for example
`.codeai-hub/codeai-hub-codex-5-4/runtime/providers/glm-claude-code/home`,
instead of creating a second `.codeai-hub/users-...` capsule for the same
workspace.

**Previous Release — v1.2.386** (GLM Config Bootstrap Hotfix)

This hotfix creates the global GLM-Claude-Code config template automatically at
`~/.codeai-hub/providers/glm-claude-code/config.json` during install/runtime
bootstrap when it is missing. The template contains only the `apiKey` field and
existing files are preserved, so user secrets are not overwritten.

The provider picker recovery card now tells the user exactly where to paste the
separate Z.AI/GLM API key: open
`~/.codeai-hub/providers/glm-claude-code/config.json`, set JSON field
`"apiKey"`, then use Settings -> General -> Restart Core. The card also makes
clear that Claude login is not reused for GLM.

**Previous Release — v1.2.385** (GLM Loader And Kimi Reasoning Hotfix)

This hotfix makes Core prefer the standalone GLM-Claude-Code provider runtime
installed under `~/.codeai-hub/providers/glm-claude-code/<version>` instead of
loading GLM classes through the original Claude provider package. GLM keeps its
own provider home/settings path while still using the Claude Agent
SDK-compatible runtime; it still requires a separate Z.AI/GLM API key.

Kimi visible `Thinking`/reasoning bubbles and Core System translation now read
the active workflow session settings path before falling back to global
defaults. Reasoning content therefore uses the same target language and engine
as the workflow prompt instead of silently skipping translation through the
default settings path.

**Previous Release — v1.2.384** (Application Skeleton Managed Repair Hotfix)

This hotfix repairs the Application Skeleton managed workflow startup and
repair loop observed with Kimi. Core now prepares canonical workflow stage
directories, including `.codeai-hub/<workspace>/application_skeleton/`, when a
workspace connects, so provider write tools do not fail on missing parent
directories before creating `application-skeleton.md` and
`application-skeleton-map.json`.

Application Skeleton validation repairs now keep the full provider repair
prompt internal to the agent turn while the visible System card receives a
short Core-owned Russian status message. This prevents raw English
orchestrator prompts from appearing in the user session log while preserving
the detailed repair instructions for the provider.

**Earlier Release — v1.2.383** (Workflow Blocker Repair Hotfix)

This hotfix repairs the Description-to-Virtual-Simulation handoff regression
found in v1.2.382. Core now untracks legacy workspace-local
`.codeai-hub/state/` runtime metadata before the accepted-step clean-Git gate,
including files that were already tracked, so timer state cannot block the
next workflow step.

If workflow session creation is rejected before `session:created`, Project
Manager now receives the real Core `session:error` instead of waiting until
`Session creation timed out.`. Remaining workflow validation blockers are also
covered by the System/Reasoning translation overlay.

**Previous Release — v1.2.382** (Virtual Simulation Handoff Repair Hotfix)

This hotfix prevents Gemini Virtual Simulation runs from reaching user review
unless the canonical
`.codeai-hub/<workspace>/virtual_simulation/virtual-simulation.md` artifact
exists, so Diagram Modules cannot be started from a missing source artifact.

The Project Manager input wait copy now separates ordinary blocked/running
provider work from real context-window resume locks: normal work shows
`Agent is working... Please wait.`, while `Agent is resuming your session...
Please wait.` is reserved for continuity/resume states.

**Previous Release — v1.2.381** (GLM Settings Repair Hotfix)

This hotfix repairs the remaining GLM-Claude-Code retest blocker found in
v1.2.380. The GLM provider settings card now exposes a masked API key input and
editable config/base/model fields, and Project Manager persists those values to
the workspace settings source read by Core on Restart Core.

**Earlier Release — v1.2.380** (Provider Retest Recovery Hotfix)

This hotfix closes the provider retest regressions found after v1.2.379.
GLM-Claude-Code is packaged as its own provider runtime artifact and gets its
own workspace provider home while still running through the Claude-compatible
client.

Gemini startup now creates a Core-owned shell session before provider bootstrap,
reports startup timeout/readiness failures through provider recovery, and closes
late provider sessions so another provider can start afterward. System workflow
messages now use the same translation policy as Reasoning messages, including
the latest Core status/error cards.

Description acceptance now ignores local `.codeai-hub/state/` runtime metadata
before the clean-Git handoff, so a successful Kimi Description run no longer
blocks Virtual Simulation provider startup.

**Earlier Release — v1.2.379** (Provider Workspace Home Readiness Hotfix)

This hotfix repairs the provider readiness regressions found after the
workspace-owned provider-home refactor. Gemini now bootstraps its workspace
`.gemini` home from an existing `~/.gemini` login before auth refresh, so an
empty workspace provider home no longer appears available and then fails on
first startup.

Kimi now receives the active workspace path from Core instead of inheriting the
Core process working directory, preventing `/.codeai-hub` runtime home
resolution. GLM-Claude-Code now resolves non-empty workspace Settings values as
a safe fallback after env/config sources, and the Description provider picker
only enables providers that Core reports as truly active.

**Previous Release — v1.2.378** (Managed Review Gate Hotfix)

This hotfix closes the managed user-review regressions found after v1.2.377.
Managed provider turns now stay locked until Core finishes its post-turn
arbitration, Core-owned review confirmations are idempotent, and stale
confirmation buttons remain visible only as history instead of starting another
provider turn.

Project Manager now renders Application Skeleton and Quality Gates user-review
states as in-progress review stages instead of stale invalid markers. Quality
Gates draft review also removes prohibited pre-acceptance integration edits
such as `package.json`, hooks, and gate scripts before the review commit, so the
workspace stays clean until the user explicitly accepts integration.

**Previous Release — v1.2.377** (Quality Gates Clear Restart Hotfix)

This hotfix closes the Clear restart regression found after v1.2.376. Quality
Gates now commits the final Core handoff message together with the accepted
managed step state, so completing the step no longer leaves the tracked unified
session dirty.

Workflow Clear commits are now Core-owned even inside workspaces with failing
Git hooks, and boundary registry pruning no longer rewrites
`workflow/boundaries.json` when no entries were actually removed. Project
Manager also reports dirty-Git start blockers as cleanup/review conditions with
the blocking file list instead of showing the upstream artifact as `not found`.

**Previous Release — v1.2.376** (Provider Session Cleanup And Clear Retest Hotfix)

This hotfix hardens the Clear/Undo Git boundary after the v1.2.375 retest.
Workflow `state.json` writes are now atomic, Description Clear no longer rewrites
questionnaire projection files just by loading them, and Clear prunes
provider-native workflow sessions for the stages it removes.

Localization/translation provider sessions are now treated as one-shot runtime
implementation detail: successful Codex App Server and Claude Haiku translation
calls delete their native session files automatically, while finalized workspace
localization artifacts remain intact.

**Previous Release — v1.2.375** (Workflow Watcher Clear Deletion Hotfix)

This hotfix prevents workflow filesystem deletion events produced by Git Clear
rollback from being treated as new workflow artifact writes. Clearing
Application Skeleton, Diagram Modules, or other downstream stages should no
longer rewrite `.codeai-hub/<workspaceSlug>/workflow/state.json` back to a
deleted downstream `lastActive` artifact after the Clear commit has already
restored the correct boundary.

Project Manager visual state remains driven by the restart-equivalent Clear
rehydration path from v1.2.374, while the workspace Git tree now stays clean
after Clear settles.

**Previous Release — v1.2.374** (Clear Rehydrate And Provider Home Runtime Hotfix)

This hotfix makes Project Manager rehydrate session/status state immediately
after workflow `Clear`, using the same status/session-history reload path that
currently fixes the UI after a manual Core restart. Clearing Description,
Virtual Simulation, or downstream stages should no longer leave stale read-only
cards or hide restored sessions until Restart Core is clicked.

The release also broadens the rollback-ignored runtime contract to complete
provider homes under `.codeai-hub/<workspaceSlug>/runtime/providers/**/home/**`.
Legacy provider config files that were accidentally tracked are untracked while
their current workspace contents are preserved across Clear rollback.

**Previous Release — v1.2.373** (Rollback-Ignored Mutable Runtime Hotfix)

This hotfix extends the rollback-ignored workspace runtime contract beyond
settings. Project Manager localization bundles/cache and provider-native
session logs now remain workspace-owned live runtime state without being added
to workflow Clear/Undo Git history.

Core updates existing workspace capsule `.gitignore` files, untracks legacy
committed settings/localization/provider-native session entries, and keeps
accepted-step and Clear commits clean while preserving the live workspace
runtime files. Workflow rollback truth stays in Core logical sessions,
`Session.modelBinding`, applied turn config, and accepted workflow artifacts.

**Previous Release — v1.2.372** (Rollback-Ignored Workspace Settings Hotfix)

This hotfix keeps Project Manager/workflow settings as workspace-owned live
state while removing `runtime/settings/settings.json` from workflow Clear/Undo
Git rollback history. Settings changes now persist through clearing workflow
stages instead of being reset to an older boundary snapshot.

Core updates existing workspace runtime capsule `.gitignore` files, untracks
legacy committed settings entries, preserves current workspace settings across
`git reset --hard` + `git clean -fd`, and keeps session-start model/settings
selection out of workflow commits. Reproducibility remains captured by
`Session.modelBinding`, applied turn config, and provider/session artifacts.

**Previous Release — v1.2.371** (Clear Confirmation UI Rebuild)

This release rebuilds the Clear confirmation UI hotfix as a fresh package. It
contains the same Project Manager behavior change from v1.2.370: the Clear
confirmation popover closes immediately after the destructive action is
accepted, while the Git rollback request continues and refreshes workflow state
when Core reports completion.

No additional runtime logic changed after v1.2.370; this package is provided as
the next installable release for retesting Clear Undo.

**Previous Release — v1.2.370** (Clear Confirmation UI Hotfix)

This hotfix closes the Project Manager Clear confirmation popover immediately
after the user accepts the destructive Clear action. The Git rollback request
continues in the background, and successful completion still dispatches the
workflow-step-cleared event that refreshes Project Manager artifact state.

Clear Undo behavior is unchanged: Core still restores the selected workflow
stage and downstream state through the workspace-owned Git rollback path. This
release fixes only the stale confirmation UI that could remain visible after a
successful Virtual Simulation Clear.

**Previous Release — v1.2.369** (Project Manager Localization Scope Hotfix)

This hotfix makes the Project Manager shell apply settings and localization
from the active workspace runtime scope. Project Manager no longer performs an
unscoped settings load during websocket startup, so the UI/help localization
state follows the selected workspace settings file instead of a fallback
capsule.

Settings, help localization, browser bootstrap cache, metadata, and user
glossary actions now resolve through the active workspace scope:
`.codeai-hub/<workspaceSlug>/runtime/settings/settings.json` and
`.codeai-hub/<workspaceSlug>/runtime/localization/`. This prevents Project
Manager from creating or reading fallback runtime folders derived from the full
absolute path, such as `.codeai-hub/users-.../runtime/localization`.

**Previous Release — v1.2.368** (Workspace Localization Slug Hotfix)

This hotfix fixes a workspace slug mismatch in Project Manager Settings
localization sync. Saved settings already used the active workspace capsule,
but Core localization materialization could still use the fallback/config slug
and write bundles to a sibling runtime folder such as
`.codeai-hub/users-.../runtime/localization`.

Settings save, reset, and load now create the localization runtime facade from
the same `workspaceRoot` and `workspaceSlug` scope that Project Manager sends
for the active workspace settings file. Localization bundles, metadata,
browser bootstrap cache, and glossary state therefore resolve under the same
workspace runtime folder as
`.codeai-hub/<workspaceSlug>/runtime/settings/settings.json`.

**Previous Release — v1.2.367** (Workspace Localization Runtime Hotfix)

This hotfix makes Project Manager localization runtime state workspace-owned.
Core and extension compatibility surfaces now materialize localization bundles,
metadata, browser bootstrap cache, and user glossary files under
`.codeai-hub/<workspaceSlug>/runtime/localization/` instead of
`~/.codeai-hub/localization`.

Project Manager bootstrap reads the active workspace settings snapshot before
resolving localization payloads, and Codex provider config sync now writes to
the active workspace provider home under
`.codeai-hub/<workspaceSlug>/runtime/providers/codex/home/`. The obsolete
global localization cache is no longer runtime truth.

**Previous Release — v1.2.366** (Settings Save Durability Hotfix)

This hotfix makes Project Manager Settings durable even when localization
runtime synchronization fails. Core now persists the active workspace settings
file first, then runs localization sync/preflight and reports any translation
runtime problem separately instead of cancelling the saved settings event.

Project Manager settings panels now ignore stale settings events from other
workspaces, Codex-side fallbacks no longer read the legacy global settings file,
and Core ignores an inherited `CLAUDE_SETTINGS_PATH` when it points at
`~/.codeai-hub/settings/settings.json`. The workspace runtime file remains the
only mutable settings authority for workflow workspaces.

**Previous Release — v1.2.365** (Workspace Settings SSOT Hotfix)

This hotfix removes `~/.codeai-hub/settings/settings.json` as runtime settings
truth for workflow workspaces. Core no longer primes or seeds that global file:
missing workspace settings are materialized inside
`.codeai-hub/<workspaceSlug>/runtime/settings/settings.json` from the most
recently configured workspace when available, then from the in-code defaults.

Project Manager settings events now carry workspace scope, workflow settings
transport ignores unscoped or wrong-workspace replies, and start cards read the
active workspace settings snapshot before selecting provider/model defaults.
Provider bootstrap, localization bootstrap, session binding, applied turn
config, and Core config defaults now resolve settings through workspace runtime
capsules instead of deriving fallbacks from the old global settings directory.

**Previous Release — v1.2.364** (Workspace Settings Authority Hotfix)

This hotfix makes Project Manager workflow starts and Core provider turns use
the same workspace runtime settings file:
`.codeai-hub/<workspaceSlug>/runtime/settings/settings.json`. Start cards now
load the active workspace settings snapshot before persisting provider/model
defaults, so selecting a model for Virtual Simulation, Diagram Modules,
Application Skeleton, or Quality Gates no longer rewrites workspace settings
from a stale global snapshot.

Core session model binding now resolves defaults from the workspace runtime
settings file and carries that path into provider turn configuration. Provider
sessions therefore use the workspace-scoped model/reasoning and translation
policy instead of falling back to `~/.codeai-hub/settings/settings.json`.

**Previous Release — v1.2.363** (Application Skeleton Unlock Hotfix)

This hotfix restores the Diagram Modules -> Application Skeleton handoff in the
workspace-owned Git rollback architecture. Diagram Modules acceptance now
commits workspace-owned runtime session/provider state before unlocking the
next stage, and the accepted-step commit removes previously tracked volatile
Codex SQLite/cache/shell-snapshot residue from the workspace timeline.

The upstream `.codeai-hub/<workspaceSlug>/diagram_modules/product-parts.index.md`
artifact remains the Application Skeleton source of truth. This release fixes
the dirty-Git blocker that Project Manager previously surfaced as a misleading
`product-parts.index.md not found` start-card message.

**Previous Release — v1.2.362** (Full Workflow Start Hotfix)

This hotfix restores the full workflow start chain after start-card model
changes in the workspace-owned Git rollback architecture. Core now commits
explicit workspace runtime settings changes as
`codeai-settings: <Stage> start selection` before creating the next
`codeai-boundary: <Stage>` anchor, so model/reasoning changes cannot dirty the
pre-step boundary for Virtual Simulation, Diagram Modules, Application
Skeleton, or Quality Gates.

The release also handles the real trimmed `git status --porcelain` form for
tracked settings changes, and was verified with a disposable walkthrough across
`Description -> Virtual Simulation -> Diagram Modules -> Application Skeleton ->
Quality Gates` with dirty settings before each post-Description start.

**Previous Release — v1.2.361** (Virtual Simulation Startup Hotfix)

This hotfix restores the `Description -> Virtual Simulation` handoff in the
workspace-owned Git rollback architecture. Preliminary workflow acceptance now
writes the Core completion message before the `codeai-step: <Stage> accepted`
commit, so the committed unified session history includes the final acceptance
handoff and the next stage can create a clean Git boundary.

The workspace runtime capsule also ignores volatile provider WAL/tmp files, and
Project Manager start-card model/reasoning changes now save through the active
workspace settings scope before session creation. Selecting a model on the
Virtual Simulation start card updates
`.codeai-hub/<workspaceSlug>/runtime/settings/settings.json` instead of falling
back to global settings.

**Previous Release — v1.2.360** (Workspace-Owned Git Rollback)

This replacement build removes the hybrid Clear/Undo rollback path and moves
workflow rollback truth into the workspace Git tree. Each workspace now owns a
runtime capsule under `.codeai-hub/<workspaceSlug>/runtime/` for workflow
settings, unified sessions, and provider homes, so Clear can use ordinary Git
reset/clean semantics instead of copying session slices back from user-space
folders.

Workflow boundaries are resolved from Git history, accepted steps commit the
tracked runtime capsule directly, and Project Manager settings load/save through
the active workspace scope. Core also cleans its ignored `dist` directory before
builds so retired Clear/Undo compiled files cannot leak into the packaged
runtime.

**Previous Release — v1.2.359** (Diagram Modules Startup Boundary Hotfix)

This hotfix restores Diagram Modules session startup after the boundary-first
Clear architecture changes. Project Manager websocket `session:create` no
longer installs the managed Diagram Modules scaffold during preflight, so Core
can create the clean `codeai-boundary: Diagram Modules` rollback anchor before
any `.husky`, `doc/TODO`, `package.json`, or `scripts` bootstrap files are
written.

The managed workflow start path still installs and checkpoints the scaffold
before provider dispatch, but now does it behind the Core-owned boundary. This
keeps `Start Step` from timing out on a dirty Git tree and preserves Clear
semantics for removing Diagram Modules scaffold/runtime state.

**Previous Release — v1.2.358** (Boundary Startup Race Hotfix)

This hotfix closes the remaining new-workspace Description startup race. Project
Manager can issue workspace activation and workspace session creation at nearly
the same time, so Core now serializes workflow boundary creation per workspace
and makes Git repository initialization queue-safe.

Boundary startup also removes macOS `.DS_Store` metadata before dirty-tree
checks, stages explicit workflow boundary paths correctly, and self-heals the
pre-submit Description residue left by the failed `1.2.357` startup path.

**Previous Release — v1.2.357** (Description Activation Boundary Hotfix)

This hotfix restores new-workspace Description startup after the strict
boundary changes. Core now creates the `Description` rollback boundary before
any `.codeai-hub/<workspaceSlug>` directory bootstrap, so a brand-new workspace
does not become Git-dirty before the first questionnaire/session path is
available.

The release adds a functional activation regression test that opens a fresh
workspace root, verifies `codeai-boundary: Description` is created, and confirms
the startup response can still point Project Manager at
`description/questionnaire.md`.

**Previous Release — v1.2.356** (Strict Workflow Boundary Restore)

This replacement build tightens the Git-backed Clear contract for managed
workflow stages. `codeai-boundary: <Stage>` commits are now clean pre-step
anchors: Core blocks stage start if the workspace is already dirty, and boundary
commits no longer absorb scaffold or provider output through implicit
`git add -A`.

Runtime restore now prunes provider-native session files created after the
captured boundary inside recorded provider session directories, while preserving
older session history. Diagram Modules review acceptance also creates a
`codeai-step: Diagram Modules accepted` commit before Application Skeleton can
open.

**Previous Release — v1.2.355** (Clean Git Workflow History)

This replacement build makes Core-owned Git history the workflow development
timeline and rollback source. Accepted Description and Virtual Simulation steps
now create `codeai-step: <Stage> accepted` commits before the next trunk step can
open, and Core blocks the next-step return path if `git status --porcelain`
still reports unclassified residue.

Runtime session history required for agent recovery and Clear is mirrored into
committed `.codeai-hub/<workspaceSlug>/runtime-slices/` snapshots. Workflow
Clear restores both the selected Git boundary and those session slices back into
user-space stores, while local timer state such as `.codeai-hub/state/` stays
ignored.

**Previous Release — v1.2.354** (Git Boundary Workflow Clear)

This replacement build rebuilds workflow `Clear` around Core-owned Git boundary
commits. Core now creates `codeai-boundary: <Stage>` commits before workflow
steps start, beginning with `Description` at workspace activation and continuing
before Project Manager or managed technical-stage starts.

Clearing a workflow stage now restores the selected boundary through the new
workflow boundary facade, prunes that stage and downstream boundary records, and
resets runtime projections from the restored filesystem instead of replaying
undo ledgers, checkpoints, fallback path deletion, or last-active patches.

Development Tree node Clear remains fail-closed until it gets a separate
node-boundary design.

**Previous Release — v1.2.353** (Quality Gates Terminal Residue)

This replacement build fixes the Quality Gates terminal Git boundary. When the
Quality Gates integration flow formats already accepted upstream Application
Skeleton managed artifacts or leaves Core runtime metadata dirty, Core now
classifies that residue as managed terminal output and commits it before the
step completes instead of blocking on a dirty workspace.

In the tested Quality Gates path this prevents stale dirty files such as
`application-skeleton-map.json`, `workflow/managed/application_skeleton.json`,
continuity metadata, `workflow/state.json`, `workflow/undo-ledger.json`, and
formatter residue from stopping the workflow after the integration repair.

**Previous Release — v1.2.352** (Clear Last Active Reset)

This replacement build fixes the final stale workflow state left after clearing
`Diagram Modules` in an app-created workspace. When Core removes the managed
development scaffold and rolls the workspace back to the post-`Virtual
Simulation` state, `workflow/state.json` now points `lastActive` to the latest
existing upstream artifact instead of the cleared `diagram_modules` artifact.

In the tested rollback path this means `lastActive.stage` returns to
`virtual_simulation` and the artifact path points to
`virtual_simulation/virtual-simulation.md`, keeping Project Manager aligned with
the real workspace contents after Clear/Undo.

**Previous Release — v1.2.351** (Managed Clear Scaffold Rollback)

This replacement build fixes `Clear` for app-created workspaces when returning
from `Diagram Modules` back to the post-`Virtual Simulation` state. Core now
restores the managed input checkpoint and removes the scaffold it created for
managed development work, including `.git`, `.husky`, `doc`, `scripts`,
root package files, TypeScript config files, `node_modules`, and downstream
Product Part scaffold when those files belong to the managed workflow.

Application Skeleton draft validation is also less brittle: Core keeps hard
validation on the machine-readable JSON contract, paths, stack/foundation
fields, and lifecycle state, while Markdown prose wording no longer blocks user
review when it does not affect the future generated code.

**Previous Release — v1.2.350** (Managed Clear State Isolation)

This replacement build fixes managed `Clear` for `Diagram Modules` and
`Application Skeleton`. Git rollback now finds the first real output commit for
the managed stage instead of the earlier scaffold/checkpoint commit, so Clear can
return the workspace to the correct pre-stage boundary.

Diagram Modules subturn progress is now stored separately from the shared
workflow last-active state, and Application Skeleton managed snapshots are
refreshed after Core-owned materialization so Project Manager receives Core-owned
truth after restart and after Clear.

**Previous Release — v1.2.349** (Application Skeleton Materializer Alignment)

This replacement build fixes the Core-owned Application Skeleton materializer
after user acceptance. Core now creates the root `tsconfig.json` whenever the
accepted Application Skeleton contract declares it in `projectFoundation.configFiles`,
adds that file to `materializedPaths`, and keeps validator expectations aligned
with the files Core actually writes.

**Previous Release — v1.2.347** (Workflow Clear Undo Completion)

This replacement build fixes the remaining `Clear`/Undo gaps across workflow
stages. For Git-managed stages starting at `Diagram Modules`, Core now treats
`already_at_boundary` as a cleanup path instead of a completed rollback, and
Git rollback cleanup removes stale workflow state and undo ledger files before
creating a rollback commit.

For earlier checkpoint-backed stages such as `Virtual Simulation`, Core now
restores the checkpoint and still performs downstream cleanup for generated
workspace, documentation, product-part, continuity, managed workflow, and
session state. Clearing an early step should therefore return downstream steps
to a real pre-step workspace state instead of only resetting the sidebar
markers.

**Previous Release — v1.2.346** (Managed Clear Git Rollback Enforcement)

This replacement build fixes `Clear` for Git-managed workflow stages. For
`Diagram Modules`, `Application Skeleton`, and `Quality Gates`, Core no longer
falls back to path deletion when a workspace has Git but the stage rollback
boundary is missing. Instead it returns an explicit conflict and preserves the
tracked workspace state, preventing dirty deleted artifacts from making later
steps restart with misleading missing-input messages.

**Previous Release — v1.2.345** (Cluster Workflow Node Ordering)

This replacement build places cluster-owned workflow nodes before module nodes
inside each Development Tree cluster. Core now projects the cluster `Workers`
and `Integration` operations in the snapshot, and Project Manager renders them
first with the existing tree styling and connector lines preserved.

**Earlier Release — v1.2.344** (Clear Marker Reset)

This replacement build fixes the left-sidebar workflow markers after `Clear`.
Core now resets the managed workspace ledger for the cleared workflow stage and
all downstream managed stages, including `completedStages`, downstream
`unlockedStages`, downstream accepted commits, and the active managed stage
pointer. Project Manager continues to render only the Core-owned workflow
snapshot, so cleared/downstream stages return to the grey/todo state instead of
staying green after their files and sessions have already been removed.

**Earlier Release — v1.2.343** (Quality Gates Size Policy + Clear Availability)

This replacement build makes the mandatory Quality Gates 500-line source/class
policy explicit and structured. Core now accepts a required gate whose command
entry declares `policy.type: "source_size_limit"`, `policy.maxLines: 500`, and
`policy.appliesTo: ["source_files", "classes"]`; repair prompts now show this
exact contract instead of forcing the agent to guess aliases or filenames.

The bundled Quality Gates prompt now includes the same structured policy
template during draft/integration. This build also restores `Clear` availability
for managed workflow stages when the workspace has no Git repository or no
stage boundary: Core falls back to the existing clear/undo cleanup path instead
of returning a blocking 409 before cleanup can run.

**Previous Release — v1.2.342** (Quality Gates Planned Required Repair)

This replacement build fixes Quality Gates contract drafting after research
acceptance. Core now rejects draft contracts that move gates from
`plannedRequiredAfterIntegration` into advisory/non-blocking semantics instead
of keeping them active, not-yet-integrated, and integration-required.

**Previous Release — v1.2.341** (Quality Gates Research-First Prompt)

This replacement build fixes the initial Quality Gates agent contract. Core now
targets `quality-gates-research.md` / `quality-gates-research.json` first, and
the bundled provider prompt includes the exact Markdown and JSON templates the
agent must produce before contract drafting.

Quality Gates repair prompts are now scoped to the active phase: research-phase
repairs list only the research artifacts, while contract repairs list the
baseline contract artifacts. This keeps agents from recreating
`quality-gates.md` too early or missing the canonical
`# Quality Gates Research` heading during the first pass.

**Previous Release — v1.2.340** (Description Clear Restart Projection)

This replacement build fixes the Project Manager projection after clearing and
rerunning the `Description` step. When `description-step.json` no longer carries
`primarySession` after restore, Project Manager now falls back to Core-owned
`continuity` before deciding that the Description session is missing.

As a result, the Description session remains navigable in the left sidebar, and
the `Virtual Simulation` start card inherits the rerun Description provider
instead of falling back to the first connected provider. The scenario that
previously showed `Claude / Opus` after a Codex/Spark Description rerun now
resolves provider/session data from the latest Description continuity chain.

**Previous Release — v1.2.339** (Quality Gates Baseline Validation)

This replacement build aligns Core-owned Quality Gates validation with the
Project Manager artifact parser. Core now rejects `quality-gates.md` contracts
unless the first Markdown heading is exactly `# Quality Gates Baseline`.

The managed repair prompt now gives the same exact heading instruction, so an
agent draft such as `# Quality Gates Contract` stays in repair instead of
being opened for user review with a Project Manager parser error.

This build also includes the post-v1.2.338 managed workflow fixes: Quality
Gates research prioritizes AI-agent-oriented tooling such as Ultracite, the
500-line source/class policy is required as an executable gate, and
`Diagram Modules` Clear can resolve and clean materialized `development_tree`
state through Git rollback.

**Previous Release — v1.2.338** (Git-Backed Managed Workflow Clear)

This replacement build changes workflow step `Clear` for managed technical
stages. Starting with `Diagram Modules`, Core rolls tracked workspace state
back through Git instead of deleting stage paths by hand.

For `Diagram Modules`, `Application Skeleton`, and `Quality Gates`, Core now
resolves the pre-stage Git boundary, restores tracked files to that boundary,
removes untracked residue only inside the managed downstream scope, and records
a rollback commit. If Git or the boundary is missing, Clear fails explicitly
instead of corrupting the workspace/read-model relationship.

**Previous Release — v1.2.337** (Quality Gates Research Heading Validation)

This replacement build fixes the Core-owned Quality Gates research gate. Core
now validates the same canonical Markdown title that Project Manager parses:
`quality-gates-research.md` must contain `# Quality Gates Research`.

If the agent creates a localized or otherwise wrong title, Core keeps the step
in repair instead of opening user review. The repair prompt now tells the agent
to start the research report with the exact heading before localized prose.

**Previous Release — v1.2.336** (Workflow Undo Metadata Dirty Gate)

This replacement build fixes Diagram Modules acceptance after workflow
checkpoint/undo support. Core now treats
`.codeai-hub/<workspace>/workflow/checkpoints/**` and
`.codeai-hub/<workspace>/workflow/undo-ledger.json` as Core-owned runtime
metadata in both managed terminal acceptance and technical-stage dirty
read-model checks.

These internal undo files no longer block Diagram Modules review completion or
ask the user to choose how to handle them in Git.

**Previous Release — v1.2.335** (Workflow Clear Immediate Questionnaire Editor)

This replacement build finishes the Project Manager side of workflow step
`Clear` for the Description restart path. When Core returns a Description
snapshot that contains only the preserved `questionnaire.md` and no final
artifact or provider session, Project Manager now treats it as a hard session
downgrade and immediately opens the editable questionnaire.

This removes the stale right-panel state where `questionnaire.md` was rendered
as markdown text until the user manually switched away from Artifacts and back.

**Previous Release — v1.2.334** (Workflow Clear Read Model Resync)

This replacement build fixes the Project Manager projection after workflow step
`Clear`. Core now sanitizes Description read-model references against the
actual filesystem, so missing `Final_Description.md` and deleted session traces
are not projected back into the left sidebar or artifact panel.

If Clear preserves only the filled `questionnaire.md` and removes
`description-step.json`, Core rebuilds the Description snapshot directly from
that questionnaire file. Project Manager also invalidates artifact availability
probes immediately after Clear, so deleted downstream files such as Virtual
Simulation outputs stop appearing without waiting for background polling.

This replacement build completes Codex provider-native cleanup for workflow
step `Clear`. Core now scans Codex provider-home JSONL metadata instead of
matching only file names: workflow-agent native sessions are removed by
`session_meta.payload.id`, and disposable Codex translation-native sessions are
removed when their metadata shows the temporary `codeai-codex-translation-*`
runtime or the translation-only base instruction.

This closes the remaining provider-home residue under
`~/.codeai-hub/providers/codex/home/sessions/**` after clearing a workflow
stage.

This replacement build finishes the workflow step `Clear` rollback path for
provider sessions. Clear now collects session traces before checkpoint restore
and removes them after restore even when the checkpoint path succeeds.

Core now deletes matching unified session history under both
`~/.codeai-hub/sessions/<workspaceSlug>` and the actual workspace-path session
root `~/.codeai-hub/sessions/<sanitizeWorkspaceSlug(workspaceRoot)>`. It also
removes provider-native session files linked by continuity `providerSessionId`,
including Codex rollout JSONL files and Claude provider-home project JSONL
files.

New workflow checkpoints also capture both user-space session roots, so future
stage rollback has the complete pre-step session state without relying on
fallback cleanup heuristics.

This replacement build makes workflow step `Clear` use a real Core-owned
checkpoint restore. Before the first start effect of a workflow stage, Core now
captures the full workflow rollback scope: `.codeai-hub/<workspace>`,
`doc/TODO/stages`, `product-parts`, and the matching user-space sessions under
`~/.codeai-hub/sessions/<workspace>`.

Clearing a workflow stage restores that checkpoint as exact state, then resets
Core runtime projections and in-memory sessions. This returns `Description` to
the filled editable questionnaire state instead of leaving Project Manager with
a missing artifact/read-model mismatch. The previous mutation journal remains
as audit/fallback coverage, but checkpoint restore is now the primary stage
rollback mechanism.

This replacement build moves workflow undo from per-writer path bookkeeping to
a centralized Core mutation journal runtime. Core now wraps durable workflow
mutations with before/after snapshots of the stage workspace scope and
`~/.codeai-hub/sessions/<workspace>`, derives file/directory diffs, and appends
restart-safe undo entries automatically.

The journal is wired into the main workflow mutation boundaries: workspace
session creation, workspace file writes, artifact upserts, and session message
turns. Clear replays the ledger backward, including user-space session files,
while directory undo is non-recursive so preserved checkpoint files such as the
Description questionnaire are not deleted by a parent-directory cleanup.

This replacement build makes workflow step `Clear` behave as a real restart
undo instead of only removing generated paths. The Description questionnaire is
now recorded as a preserved undo checkpoint, so clearing `Description` returns
the Project Manager right panel to the editable `questionnaire.md` state and
lets the user fix answers before submitting the step again.

Core also records `workspace-file-write` operations in the persistent undo
ledger with previous file content. During Clear, newly-created workflow files
are removed, overwritten files are restored, and downstream continuity/session
records are pruned from Core-owned state.

This replacement build changes workflow step `Clear` from a path-pattern reset
into a Core-owned persistent undo flow. Core now records generated workflow
artifacts and Development Tree materialization actions in
`.codeai-hub/<workspace>/workflow/undo-ledger.json`; when a user clears a step
or Development Tree node, Core walks the persisted ledger backward so the reset
still works after a Core restart.

Clear also prunes `continuity/index.json`, active runtime sessions and matching
user-space unified session files. Legacy workspaces without an undo ledger are
handled more carefully: Description keeps its input `questionnaire.md`, while
generated Description outputs and downstream workflow state are removed.

This replacement build fixes the Quality Gates and Project Manager regressions
found during v1.2.326 testing. Quality Gates now has a hard research-first
boundary: the first provider pass may create only
`quality-gates-research.md` and `quality-gates-research.json`. If the agent
tries to create the contract artifacts before the research report is reviewed,
Core rejects the turn and asks for a research-only repair.

After the user accepts the research report, Core sends a separate continuation
prompt for `quality-gates.md` and `quality-gates.json`. Only the contract draft
then enters the normal user review and integration path.

Project Manager again shows separate `Research`, `Contract`, and `Help` artifact
buttons for Quality Gates, and the sidebar `Clear` menu opens from the
right-click path while keeping the in-app destructive confirmation flow.

This replacement build fixes a Project Manager native crash seen when opening
the sidebar `Clear` action with right-click. The sidebar clear menu now uses an
in-app confirmation flow instead of the native `window.confirm` dialog and
suppresses the browser context-menu event earlier, before CEF can open its own
native menu.

This replacement release adds a Core-owned clear action for Project Manager
workflow steps. Right-clicking a step or Development Tree node in the left
sidebar now opens a small context menu with `Clear`; the destructive action
always requires confirmation before anything is removed.

The Project Manager only sends the user intent. Core performs the reset and
removes the selected step plus downstream workflow data from workspace
artifacts, stage todo folders, Development Tree materialization, continuity
records, active session records, and matching user-space unified session
history files under `~/.codeai-hub/sessions`.

This keeps the workflow restart path aligned with Core-owned state: after a
clear, the step becomes available for a fresh start without Project Manager
owning or duplicating workflow truth.

This release adds the first contract-orchestration layer to the Development
Tree. Diagram Modules now records the lead Product Part and Product Part
leadership order, and Core carries that metadata into the Development Tree
snapshot, materialized folders, node start gates, first agent prompt packs, and
Project Manager sidebar projection.

Only the lead Product Part orchestration node is startable before the
application-wide Contract Graph is frozen. Non-lead Product Parts, clusters,
modules, and downstream operation nodes remain visible in the tree, but show a
locked state until the lead orchestration path is ready.

The lead Product Part now exposes `Lead Product Part Orchestration` with
`Contract Graph`, `Cross-Part Contracts`, `Shared Interfaces`, and
`Execution Waves` child nodes. Workflow agents also receive a Core-owned
research artifact contract (`AgentResearch.draft.json`) so any external search
or technology/tool recommendation is captured as a reviewable structured
artifact before it affects downstream prompts or rules.

The previous VSIX package-size hotfix remains included.

This release completes the Diagram Modules Development Tree materialization
flow. Core now creates the accepted tree both under
`.codeai-hub/<workspace>/development_tree/materialized/...` and under
`doc/TODO/stages/development-tree/...`, so later TODO plans and agent artifacts
have the same Product Part / Cluster / Module folder structure available before
Application Skeleton starts.

Clusters and modules both receive `workers/` and `integration/` artifact
folders. Cluster root folders remain the place for cluster description and
facade-contract drafts, while the nested operation folders hold worker task
evidence and integration handoff artifacts.

Project Manager still remains a projection-only surface: it consumes Core-owned
Development Tree snapshots and auto-reveals the first Product Part / Cluster in
the left sidebar so Module / Facade Specification, Implementation, Workers, and
Integration nodes are visible immediately.

The previous Development Tree materialization behavior remains included.

The previous session context and Kimi usage telemetry behavior remains included.

This hotfix keeps Kimi selected across managed workflow steps. When Description
or an upstream managed stage is started with Kimi, the next start card now
inherits `kimiCode` instead of falling back to Claude as the first connected
provider.

The previous Kimi progress summary behavior remains included. The managed Kimi
profile asks Kimi to avoid full detailed reasoning output as a work log and to
compress analysis into short visible ordinary assistant summaries when possible.

The previous managed profile behavior remains included. Kimi starts through a
CodeAI-owned managed agent profile instead of
the provider default agent prompt. The runtime materializes
`~/.codeai-hub/providers/kimi/home/codeai-managed-agent/` and passes
`--agent-file`, an empty `--mcp-config-file`, and an empty `--skills-dir` before
starting Kimi Wire.

The managed Kimi profile omits AGENTS/project instruction injection and provider
skills from the system prompt, keeps CodeAI Core as the workflow prompt
authority, and narrows the available tools to file read/search/write/edit
operations. It also asks Kimi to send visible ordinary assistant progress
updates during long managed turns so hidden reasoning does not leave the user
staring at a silent session.

The previous Kimi reasoning display behavior remains included. Kimi `think`
content respects the Kimi `Reasoning in dialog` setting, renders as an expanded
thinking bubble instead of the retired collapsed panel, and streams bounded
reasoning chunks before long turns finish when Kimi Wire provides intermediate
thinking content.

The previous Kimi review input unlock behavior remains included. Kimi `TurnEnd`
normalizes to a Core-compatible `turn_completed` event with
`postTurnTokenUsageUnavailable=true`, allowing Core continuity arbitration to
resolve the post-turn check as no-rollover and return the runtime session to
`idle` after user-review cards.

Installed Kimi Code / Kimi 2.6 sessions also apply the Core-provided workspace
before Wire startup. When Core calls `createSession(workspacePath)`, the Kimi
adapter rebuilds its runtime configuration before the first Wire process
starts, so both `--work-dir` and the process `cwd` point at the actual project
workspace instead of the early Core launcher working directory.

Kimi Wire `ContentPart` text and thinking chunks are normalized into
Core-compatible `assistant` and `thinking` messages, buffered per turn, and
flushed before `turn_completed`, so the dialog history receives the provider
answer and the input panel can leave resume/bootstrap state.

The Kimi module also resolves the user-local `kimi` CLI from `KIMI_CLI_PATH`,
`~/.local/bin`, Homebrew paths, or the inherited `PATH`, and uses string
JSON-RPC request ids required by Kimi Wire. Kimi sessions also pass the selected
workspace through `--work-dir` and use protocol-compatible approval literals for
managed workflow artifact turns.

The Kimi provider module remains available across CodeAI Hub. Kimi
uses Wire mode through the standalone `packages/Kimi_Module` facade, keeps
CodeAI-managed runtime state under `~/.codeai-hub/providers/kimi/home` via
`KIMI_SHARE_DIR`, and references the already authorized Kimi config through
`~/.kimi/config.toml`.

Kimi is now available in Project Manager settings, Description provider
selection, workflow start/fix cards, provider color mapping, and Session UI
status/model display. The first release exposes `kimi-for-coding` as the default
model and treats live model switching as display-only until a provider-native
Wire switch contract is verified.

Release packaging now builds `kimi-module-<version>.tar.bz2`, includes Kimi in
the Core runtime dependency bundle, validates installed Kimi artifacts during
release, and keeps Kimi provider workspace files out of the VSIX.

Project Manager trunk step markers now come from Core-owned workflow state:
gray before a step starts, yellow after Core opens the step session or sends the
first provider prompt, and green only after the stage reaches its terminal
completion boundary. Managed technical stages also pass a terminal clean-Git
checkpoint before publishing green completion; classified residue is committed by
Core, while unclassified dirty files block the next stage until resolved.
Description and Virtual Simulation also promote from yellow to green when their
final artifacts make the next step available, and Diagram Modules flow sidecars
are committed automatically at terminal completion.
Managed commits now stage dot-directory sidecars without Git exclude pathspecs,
so `module-map.flow.json` is saved by Core instead of blocking the user.
Terminal completion now also treats non-semantic Core metadata as managed
residue, ensures `.codeai-hub/state/` is ignored as local runtime state, and
keeps task timer telemetry out of Git history.

Repository lifecycle tooling under `scripts/plan-orchestrator/**` remains in
place because it powers `npm run plan:*` and the Husky plan hooks for this code
base. It is separate from the retired generated user-workspace orchestrator.

## Current Installation Path

CodeAI Hub is already usable, but the current recommended installation path is still source-based.
If you want to try the product today, clone the repository, build the release artifacts locally, and install the generated VSIX into Visual Studio Code.

### Prerequisites
- Git
- `nvm`
- Node.js per the project `.nvmrc` (currently `22.17.0`) + `npm`
- Visual Studio Code
- `cmake` (required for the standalone CEF launcher / Project Manager build)
- the provider CLIs or SDK access you plan to use (`Claude`, `Codex`, `Gemini`, `Kimi`) installed and authenticated separately

### Build from Source
```bash
git clone https://github.com/OleynikAleksandr/CodeAI-Hub.git
cd CodeAI-Hub
nvm install   # reads .nvmrc and installs the pinned Node version
nvm use
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

Before starting, read `doc/SolidWorks-WorkFlow/Docs_Index.md` and follow the SSOT contracts in `doc/SolidWorks-WorkFlow/Contracts/` (especially `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`) to configure provider CLIs and SDKs.

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
src/extension.ts             VS Code extension entry point.
src/extension-module/        Extension host micro-classes (settings, bootstrap glue).
src/core/webview-module/     HTML scaffold that injects the webview assets.
src/client/project-manager/  Project Manager CEF UI surface (sidebar, sessions, settings).
src/client/ui/               Shared session UI bundle (used by both webview and PM shells).
src/types/                   Shared TypeScript types (provider, session, model registries).
packages/                    Workspace packages — provider modules and runtime services.
packages/Claude_Module/      Claude provider runtime (Agent SDK integration, session lifecycle).
packages/Codex_AppServer_Module/   Codex provider runtime (App Server JSON-RPC, app-server process).
packages/Gemini_Module/      Gemini provider runtime (CLI core integration).
packages/core/               Core orchestrator (turn lifecycle, continuity, remote bridge).
packages/core-supervisor/    Runtime supervisor (Core process management).
packages/cef-launcher/       Standalone CEF Launcher (native macOS/Windows/Linux client for PM).
packages/ui/                 Project Manager UI styles + bundled assets.
packages/translation/        Shared runtime translation engine.
packages/localization/       Bundled English source dictionaries + glossary + lookup primitives.
packages/unified-session/    Shared session contract used across packages.
scripts/                     Quality, build, and release automation (build-all.sh, build-release.sh, etc.).
doc/                         Architecture SSOT, planning docs, sessions log, knowledge base.
doc/SolidWorks-WorkFlow/     Canonical SSOT tree (System / Clusters / Modules / Contracts / DesignSystem / Plans).
doc/tmp/releases/            Locally staged release tarballs after build-all.sh.
```

## License
This repository is currently distributed as `UNLICENSED`. Source is visible for audit and development collaboration, but redistribution requires explicit permission from the repository owner.
