# CodeAI Hub

CodeAI Hub is a Visual Studio Code extension that unifies multiple AI providers behind a single, type-safe experience. The project enforces strict quality and architecture rules through Ultracite, keeping the codebase ready for multi-agent orchestration.

## Features
- **Static command shell**: the extension view opens with two rows of quick action buttons that mirror the Claude Code Fusion UX.
- **Type-safe extension host**: webview messages are routed through micro-classes with zero usage of `any`.
- **Quality gates out of the box**: architecture checks, duplication scanning, Ultracite linting, and TypeScript compilation run on every commit.
- **Scripted releases**: a single `scripts/build-release.sh` command bumps the version, builds the shell, validates the codebase, and packages a VSIX.

## Getting Started
```bash
git clone https://github.com/OleynikAleksandr/CodeAI-Hub.git
cd CodeAI-Hub
npm install
```

## Development Workflow
1. **Create or modify code** under `src/`. Keep files below 300 lines and prefer micro-classes plus facades.
2. **Run quality checks** before committing:
   ```bash
   npm run quality        # architecture check + Ultracite lint
   npm run check:tsprune  # optional: detect unused exports
   npm run compile        # ensure TypeScript output builds
   ```
3. **Commit**; pre-commit hooks re-run the same gates automatically.

## Building a Release
Always use the provided script to create a VSIX:
```bash
./scripts/build-release.sh <version>
```
The script performs:
- cache cleanup and version bump in `package.json`;
- optional webview UI build (if a bundled React app exists);
- architecture, duplication, lint, and type checks;
- VSIX packaging via `vsce`.

Artifacts such as `.claude`, `.vscode`, `doc/**`, and other local assets are excluded through `.vscodeignore`.

## Repository Layout
```
media/                       Static assets for the button shell.
src/core/webview-module/     HTML generator for the shell.
src/extension-module/        Extension host micro-classes.
src/extension.ts             Entry point registering the webview provider.
scripts/                     Quality and release automation.
doc/                         Architecture and knowledge base (ignored in VSIX).
```

## License
License information will be added in a future update. Until then, treat the repository as proprietary and request permission before redistribution.
