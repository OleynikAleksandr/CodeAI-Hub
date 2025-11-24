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
**Module:** `launcher-cef`
**Current Version:** 1.1.313
**Status:** Active
**Owner:** @oleksandroliinyk

---

## 1. Overview
Модуль `launcher-cef` предоставляет нативную оболочку (на базе Chromium Embedded Framework) для запуска веб-клиента CodeAI-Hub вне VS Code. Это позволяет пользователю продолжать работу с сессиями, даже если редактор закрыт.

## 2. Architecture

### 2.1 Components
- **C++ Launcher**: Тонкий клиент, инициализирующий CEF, создающий окно и загружающий URL.
- **CEF Runtime**: Минимальный набор библиотек Chromium для рендеринга.
- **UI Bundle**: Статический веб-сайт (React app), который загружается в окно. В версии 1.1.313 это `web-client` или `project-manager`.

### 2.2 Delivery Mechanism
Лаунчер не поставляется внутри VSIX. Вместо этого VSIX содержит манифест `assets/launcher/manifest.json`, описывающий доступные версии для разных платформ.
При первом запуске команды `Launch Web Client` (или `Launch Project Manager`) расширение:
1. Проверяет наличие лаунчера в `~/.codeai-hub/packages/launcher/<platform>/<version>/`.
2. Если нет — скачивает tar.bz2 из `baseUrl` (или локального кеша `~/.codeai-hub/releases/`).
3. Распаковывает и создает `install.json`.

### 2.3 Configuration
Лаунчер принимает конфигурацию через JSON-файл, путь к которому передается аргументом `--config`.
Пример `config.json`:
```json
{
  "url": "file:///Users/user/.codeai-hub/packages/ui/web-client/1.1.313/index.html",
  "width": 1200,
  "height": 800,
  "title": "CodeAI Hub Web Client",
  "userDataDir": "/Users/user/.codeai-hub/data/web-client",
  "coreSocket": "ws://127.0.0.1:8080/api/v1/stream"
}
```

### 2.4 Multi-Instance Architecture
To support running multiple independent applications (e.g., Web Client and Project Manager) simultaneously, each application instance must use a unique User Data Directory.
- **Web Client**: `~/.codeai-hub/data/web-client`
- **Project Manager**: `~/.codeai-hub/data/project-manager`

### 2.5 Window State Persistence (Thin Bundle + Binary Copy)
The C++ Launcher uses `NSUserDefaults` (on macOS) to store window position and size, keyed by the application's Bundle Identifier. To ensure that the Web Client and Project Manager remember their window states independently, we employ a Thin Bundle + Binary Copy strategy:
1.  **Base Launcher**: The generic `CodeAIHubLauncher` binary is downloaded to `~/.codeai-hub/packages/launcher/...`.
2.  **App Wrapper Creation**: When launching an app (e.g., "CodeAI Hub Web Client"), the extension creates a lightweight `.app` wrapper (on macOS) in `~/.codeai-hub/apps/`.
3.  **Binary Copy**: The `CodeAIHubLauncher` binary is **copied** into this wrapper (`Contents/MacOS/CodeAI Hub Web Client`).
4.  **Info.plist**: A custom `Info.plist` is generated for the wrapper, setting a unique `CFBundleIdentifier` (e.g., `com.codeaihub.web-client`).
5.  **Execution**: The wrapper is launched. The OS sees it as a distinct application, so `NSUserDefaults` (and `setFrameAutosaveName`) uses the unique Bundle ID.

## 3. File Structure
```
~/.codeai-hub/
├── packages/
│   └── launcher/
│       └── macos-arm64/
│           └── 1.1.313/
│               ├── CodeAIHubLauncher  (Base binary)
│               ├── libcef.dylib
│               └── ...
├── apps/
│   ├── CodeAI Hub Web Client.app/
│   │   └── Contents/
│   │       ├── MacOS/
│   │       │   └── CodeAI Hub Web Client (Copy of binary)
│   │       └── Info.plist (com.codeaihub.web-client)
│   └── CodeAI Hub Project Manager.app/
│       └── Contents/
│           ├── MacOS/
│           │   └── CodeAI Hub Project Manager (Copy of binary)
│           └── Info.plist (com.codeaihub.project-manager)
└── data/
    ├── web-client/      (CEF User Data)
    └── project-manager/ (CEF User Data)
```

## 4. Build Process
- **CI/CD**: GitHub Actions собирают C++ код для Windows, macOS (x64/arm64) и Linux.
- **Artifacts**: `CodeAIHubLauncher-<platform>-<version>.tar.bz2`.
- **Release**: Артефакты публикуются в GitHub Releases (или локально в `~/.codeai-hub/releases/` для dev).

## 5. Future Plans
- **Remote Bridge**: Полноценная поддержка удаленного подключения (сейчас stub).
- **Auto-Update**: Механизм самообновления лаунчера.
- **Native Menu**: Расширение нативного меню (сейчас только базовое).
