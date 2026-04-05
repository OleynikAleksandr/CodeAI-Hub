# CodeAI Hub

CodeAI Hub is a Visual Studio Code extension + standalone Project Manager (CEF) that unifies multiple AI providers behind a single, type-safe orchestration layer.

- SolidWorks-WorkFlow docs index: `doc/SolidWorks-WorkFlow/Docs_Index.md`
- System SSOT: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- Session input lock SSOT: `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
- Bug registry: `doc/BugRegistry.md`

## Current Release — v1.1.891
- **`Application Foundation Envelope` continuity chains now persist under the canonical stage folder**: AFE runtime sessions no longer fall back to `.codeai-hub/<workspace>/continuity/unknown/...`, so the left Project Manager tree can discover and reopen the correct session branch for the stage.
- **Handoff artifacts now keep the same AFE stage identity end-to-end**: continuity tracker matching, handoff prompt rendering, and handoff report path generation now all preserve `application_foundation_envelope` instead of degrading to `unknown`.
- **Cold-start workflow persistence now keeps AFE as the last active stage**: `workflow/state.json` readback no longer drops `application_foundation_envelope`, which keeps restart hydration aligned with the actual artifact/session path after the hotfix.
- **New core regression tests lock the persistence contract before packaging**: dedicated tests now verify continuity chain path materialization, handoff report path selection, and workflow last-active readback for AFE, plus `@codeai-hub/core` builds cleanly on the patched stage map.
- **The earlier tree/session parity and localization fixes remain intact underneath this patch**: the AFE branch-node UX, localized help/session copy, upstream gating, bundled prompt assets, and canonical artifact persistence continue unchanged.

Previous releases (summary): `1.1.800–1.1.890` — `Application Foundation Envelope` stage shell rollout, AFE localization hotfix, AFE workflow-tree/session parity fix, Codex provider config/runtime sync fixes, visible-thinking restoration, four-category localization release, localization packaging hotfixes, host-hydrated browser localization runtime, searchable localization controls, shared Project Manager localization consumption, persistent localization foundation, thinking display sync, public CI bootstrap, staged core restart UX, Claude auth façade closure, Gemini final-answer deduplication, post-tool terminal-leg fix, adaptive post-tool watchdog, history-visible recoverable failure, architecture gate 500 lines, session-scoped Stop, provider rebind after Stop, provider-neutral applied turn config, PM label sync hardening, provider failure recovery, Gemini SDK 0.35.0 compatibility, detachable diagram window, layout/collision work, glossary-file editing, localization closeout, persistent localization bootstrap, Claude long-thinking translation chunking, Claude same-message thinking continuity, dialog auto-scroll continuity, CI workspace build-order parity, and earlier workflow/parser stabilization.

## Features
- **Unified provider orchestration**: launch Claude, Codex, or Gemini sessions from an identical picker; the dialog surfaces connection state, enforces one-provider selection, and reminds you to install/authenticate matching CLIs.
- **Description-first workflow**: the first guided workflow step is `Description`, producing `questionnaire.md` and `Final_Description.md` as the canonical entry into `Virtual Simulation`.
- **Persistent standalone UI**: the macOS launcher (CEF) stores window position and size in real time, so Project Manager reopens exactly where you left it—even across monitor changes.
- **Offline-first packaging**: manifests point to the local `~/.codeai-hub/releases/` cache, build scripts publish fresh tarballs for core, launcher, and provider modules without relying on GitHub downloads, and the shipped VSIX excludes repository-only Husky hook helpers.
- **Quality guardrails**: Ultracite architecture rules, jscpd duplication scans, knip dead-code detection, and Biome formatting are orchestrated through Husky pre-commit/pre-push hooks.

## Getting Started
```bash
git clone https://github.com/OleynikAleksandr/CodeAI-Hub.git
cd CodeAI-Hub
nvm use
npm install
```

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
