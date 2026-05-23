# CodeAI Hub

CodeAI Hub is a Visual Studio Code extension + standalone Project Manager (CEF) that unifies multiple AI providers behind a single, type-safe orchestration layer.

**Current Release — v1.2.328** (Workflow Clear persistent undo)

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
