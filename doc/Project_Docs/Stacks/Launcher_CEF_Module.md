# Launcher CEF Module

## Overview
CodeAI Hub uses a dedicated Chromium Embedded Framework (CEF) launcher to run the standalone web client outside VS Code. The launcher ships as a platform-specific binary (`CodeAIHubLauncher`) and is coupled with the official CEF minimal runtime published by Spotify CDN. The extension downloads, installs, and upgrades the launcher automatically based on `assets/launcher/manifest.json`.

- **Current launcher version:** `CodeAIHubLauncher` 1.1.300 (macOS arm64)
- **CEF distribution:** minimal build `141.0.10+g1d65b0d+chromium-141.0.7390.123`
- **Bundle output:** `~/.codeai-hub/cef-launcher/<platform>/<version>/`

## Runtime Delivery
1. On activation the extension calls `ensureCefRuntime` and `ensureLauncherInstalled`.
2. The manifest entry (`baseUrl` → `file:///Users/oleksandroliinyk/.codeai-hub/releases/`) is resolved to a tarball (`CodeAIHubLauncher-macos-arm64-1.1.300.tar.bz2`).
3. The archive is downloaded or reused from the local cache, verified via SHA-1 and unpacked into `~/.codeai-hub/cef-launcher/darwin-arm64/1.1.300/`.
4. Installation metadata is written to `install.json`, and downloads are mirrored under `downloads/` for reuse.
5. The extension generates `config/config.json` (for Web Client) and `config/project-manager.json` (for Project Manager) next to the binary, preserving any existing keys and updating `uiRoot`, `entry`, `url`, `generatedAt`.
6. Launch relies on `CodeAIHubLauncher.app/Contents/MacOS/CodeAIHubLauncher` with arguments `--config=<path>` `--url=file://...` `--use-alloy-style`.

## Configuration & Autosave
- On macOS the launcher calls `setFrameAutosaveName(@"CodeAIHubMainWindow")`. Window geometry is handled by AppKit and stored in `~/Library/Preferences/com.codeaihub.launcher.plist`.
- Legacy coordinates (`CodeAIHubStandaloneWindowState`) are migrated once and then ignored.
- The launcher reads `config/config.json` (or `config/project-manager.json`) for:
  - `uiRoot` — absolute path to `media/web-client/dist`
  - `entry` — `index.html`
  - `url` — resolved `file://` URL (fallback until dedicated scheme is shipped)
  - Optional user-provided keys (proxy, diagnostics) remain untouched.

## File Layout
```
~/.codeai-hub/
  cef-launcher/
    manifest.json
    darwin-arm64/
      1.1.300/
        CodeAIHubLauncher.app
        config/
          config.json
        install.json
      downloads/
        CodeAIHubLauncher-macos-arm64-1.1.300.tar.bz2
  releases/
    CodeAIHubLauncher-macos-arm64-1.1.300.tar.bz2
```

### Planned consolidated packages layout

As the UI modularization plan evolves, the launcher and UI bundles move towards a unified package layout under `~/.codeai-hub/packages/**`. The goal is that the VSIX no longer ships any embedded UI; instead, both VS Code webview and the standalone client read their assets from the same local package tree as the core and providers:

```
~/.codeai-hub/
  packages/
    launcher/
      darwin-arm64/
        1.1.300/
          CodeAIHubLauncher.app
          config/
            config.json
            project-manager.json
          install.json
    ui/
      vscode-webview/
        1.1.300/
          index.html
          dist/
          assets/
          manifest.json
          install.json
      web-client/
        1.1.300/
          index.html
          dist/
          assets/
          manifest.json
          install.json
```

The existing `~/.codeai-hub/cef-launcher/**` layout remains valid while the migration is in progress. Build scripts and installers are responsible for keeping `packages/launcher/**` and `packages/ui/**` in sync with the tarballs under `~/.codeai-hub/releases/` and for updating `config.json` so that the launcher always points at the packaged UI rather than any embedded assets inside the VSIX.

## Build & Release Pipeline
- `scripts/build-cef-launcher.sh --launcher-version <semver>` assembles the launcher, stages it under `~/.codeai-hub/cef-launcher/<platform>/<version>/`, produces a tarball in `doc/tmp/releases/`, and updates the manifest + local caches.
- The script downloads the official CEF minimal archive, configures the project via CMake, and copies required frameworks/resources (macOS bundles include helper apps).
- After running the script the manifest must be committed, and the tarball relocated to the release storage referenced by `baseUrl`.
- Unified release script `scripts/build-all.sh` поднимает версии core/launcher/провайдеров/VSIX и гарантирует, что `CodeAIHubLauncher-macos-arm64-<version>.tar.bz2` и `codeai-hub-core-darwin-arm64-<version>.tar.bz2` синхронизированы с текущим релизом.

## Integration Checklist
- Ensure the launcher version in `assets/launcher/manifest.json` matches the packaged tarball.
- Verify `config/config.json` retains user settings after regenerations (size, custom keys).
- Confirm `defaults read com.codeaihub.launcher NSWindow\ Frame\ CodeAIHubMainWindow` updates when resizing the standalone window.
- Provide shortcuts via `shortcut-manager`: `.app` on macOS, `.lnk` on Windows, `.desktop` on Linux (future work).
- Keep CEF ICU & framework files alongside the bundle; the launcher validates their presence before spawn.

## Local Web Client specifics
- The launcher serves the static React bundle from `media/web-client/dist/`.
- JS environment reuses `initializeStandaloneEnvironment` to emulate VS Code API. Messages flow through the stub bridge until Remote UI Bridge is enabled.
- When started without a pre-running core, the launcher first attempts to invoke the Supervisor CLI (`codeai-core start --host … --port …`); if the CLI is not available in `PATH`, it falls back to launching the core runtime directly via `<runtime>/node/bin/node app/dist/index.js`, using the same environment variables as the extension/CLI.
- DevTools can be toggled via CLI flag (add `--devtools` when launching manually).

## Multi-Instance Architecture
To support running multiple independent applications (e.g., Web Client and Project Manager) simultaneously, each application instance must use a unique User Data Directory. This prevents locking conflicts within the underlying Chromium process.

- **Web Client**: Uses `~/.codeai-hub/data/web-client`
- **Project Manager**: Uses `~/.codeai-hub/data/project-manager`

This is achieved by passing the `--user-data-dir=<path>` argument to the launcher binary.

## Window State Persistence (Thin Bundle + Binary Copy)
The C++ Launcher uses `NSUserDefaults` (on macOS) to store window position and size, keyed by the application's Bundle Identifier. To ensure that the Web Client and Project Manager remember their window states independently, we employ a **Thin Bundle + Binary Copy** strategy:

1.  **Wrapper .app**: We create a lightweight `.app` structure for each client.
2.  **Unique Bundle ID**: Each wrapper has its own `Info.plist` with a unique `CFBundleIdentifier`.
3.  **Symlinked Resources**: Heavy resources (`Frameworks`, `Resources`) are symlinked from the main `CodeAIHubLauncher.app`.
4.  **Copied Binary**: The main executable (`CodeAIHubLauncher`) is **COPIED** (not symlinked) into the wrapper's `MacOS/` directory.
5.  **Wrapper Script**: A script (`MacOS/launch`) executes the **copied** binary with arguments.

**Why Copy?**
Executing the original binary (via symlink or absolute path) causes the process to adopt the identity (and Bundle ID) of the original bundle. Executing a copy located *within* the new bundle ensures the process adopts the new Bundle ID, enabling separate `NSUserDefaults` storage.

## Future Work
- **Multi-Tab Support**: The current architecture spawns a separate process for each "app". Future versions of the launcher may support opening multiple tabs or windows within a single process instance if they share the same `userDataDir`.
- **Remote Bridge**: Migrate from `file://` to custom `codeaihub://` scheme and enable remote bridge mode.
- **Distribution**: Automate signing and distribution once public release infrastructure is ready.
