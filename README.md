# CodeAI Hub

CodeAI Hub is a Visual Studio Code extension + standalone Project Manager (CEF) that unifies multiple AI providers behind a single, type-safe orchestration layer.

**Current Release — v1.2.295** (Diagram Modules resolved row packing refresh)

This release packages the Diagram Modules visual layout retest fixes. Automatic
CSS Grid layout now caps one horizontal Product Part row to three actual module
cards across adjacent clusters and standalone modules, makes `targetAspectRatio`
visible when Product Part columns are automatic, and refreshes detached Diagram
Modules popup windows when later Product Parts materialize in the main workflow.
Single-cluster rows now keep compact module spacing instead of stretching cards
across the full Project Manager panel, and auto-fit can scale further down for
narrow detached or docked views before horizontal scrolling is needed.
Cluster boundaries now derive their width from the resolved module grid, so long
cluster titles or purpose text wrap inside compact bounds instead of creating
large empty right-side padding.
Product Part automatic row packing now rejects resolved rows that would contain
more than three visible module cards after adjacent Cluster module columns and
standalone Modules are counted together, so standalone Modules wrap instead of
appearing as a fourth card on the right.

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
- the provider CLIs or SDK access you plan to use (`Claude`, `Codex`, `Gemini`) installed and authenticated separately

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
