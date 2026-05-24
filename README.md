# CodeAI Hub

CodeAI Hub is a Visual Studio Code extension + standalone Project Manager (CEF) that unifies multiple AI providers behind a single, type-safe orchestration layer.

**Current Release — v1.2.347** (Workflow Clear Undo Completion)

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
