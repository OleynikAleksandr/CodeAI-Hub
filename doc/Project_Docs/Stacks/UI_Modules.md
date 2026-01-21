# UI Modules Stack

**Status:** Active (v1.1.444)
**Owner:** Codex
**Context:** Модульная система UI, позволяющая обновлять интерфейс независимо от VSIX и обеспечивающая единый источник правды для FLOW через Project Manager (CEF). На период активной разработки FLOW `vscode-webview` используется только для Settings (Settings-only), а legacy `web-client` запланирован к полному удалению (Phase 65).

---

## 1. Overview

UI Modules — это набор пакетов, отвечающих за визуальную часть CodeAI Hub. Они собираются в независимые артефакты (`.tar.bz2`) и устанавливаются в `~/.codeai-hub/packages/ui/`, откуда загружаются хост-приложениями (VS Code Extension и CEF Launcher).

### Key Components
- **vscode-webview**: React-приложение для панели в VS Code (Settings-only на период разработки FLOW).
- **project-manager**: Standalone UI для управления проектами (CEF) — основной UI-клиент Core для FLOW.
- **web-client**: legacy PWA/CEF UI (будет удалён полностью в Phase 65).
- **Shared UI Library**: общие компоненты, хуки и стили (`src/client/ui/src`), обеспечивающие идентичный UX.

---

## 2. Architecture

### 2.1. Distribution Model
Вместо упаковки JS/CSS файлов внутрь VSIX, они распространяются как отдельные модули:
1. **Build**: `./scripts/build-all.sh` (release) или `npm run build:webview` / `npm run build:project-manager` (dev) собирают UI артефакты. Legacy: `npm run build:web-client` (будет удалён в Phase 65).
2. **Manifest**: `assets/ui/manifest.json` описывает доступные версии и хеши.
3. **Installation**: При старте расширения `UIBundleInstaller` проверяет наличие бандлов и распаковывает их в `~/.codeai-hub/packages/ui/<bundleId>/<version>/`.
4. **Symlinking**: Создается симлинк `current` -> `<version>`, который используется хост-приложениями.

### 2.2. Path Resolution (`UIPathResolver`)
Хост-приложения не хардкодят пути к ассетам. Они используют `resolveUIBundlePath`:
1. Проверяет наличие `~/.codeai-hub/packages/ui/<bundleId>/current`.
2. Если найдено — возвращает путь к установленному бандлу.
3. Если не найдено (dev mode) — возвращает путь к локальным исходникам (`media/`).

### 2.3. Host Integration
- **VS Code**: `HomeViewProvider` настраивает `localResourceRoots` на `packages/ui/vscode-webview/current` и загружает HTML, ссылающийся на `react-chat.js` и CSS из этого пути.
- **CEF Launcher**: Получает путь к `packages/ui/project-manager/current/index.html` через аргументы запуска или конфиг. Legacy: `web-client/current` (Phase 65 removal).

---

## 3. Bundle Structure

### vscode-webview
```
vscode-webview-<version>/
├── react-chat.js       # Основной бандл (React app)
├── main-view.css       # Глобальные стили
├── session-view.css    # Стили сессии
└── react-chat.css      # Специфичные стили чата
```

### web-client (legacy)
```
web-client-<version>/
├── index.html          # Точка входа (PWA shell)
├── app.js              # Скомпилированное приложение
└── ...assets           # Иконки, манифесты PWA
```

### project-manager
```
project-manager-<version>/
├── index.html          # Точка входа
└── styles.css          # Стили
```

---

## 4. Development Workflow

### 4.1. Building
```bash
# Сборка конкретного таргета (dev)
npm run build:webview
npm run build:project-manager
```

### 4.2. Debugging
В режиме разработки (когда расширение запущено из исходников) `UIPathResolver` автоматически переключается на `media/`, позволяя видеть изменения без пересборки архивов (при запущенном watch-режиме webpack/esbuild).

---

## 5. Technical Details

- **Framework**: React 18
- **Styling**: CSS Modules + Global CSS Variables (Theming)
- **State Management**: Zustand (SessionStore, SettingsStore)
- **Communication**:
  - **VS Code**: `postMessage` API (через `vscode-api` адаптер).
  - **Project Manager (CEF)**: WebSocket (прямое подключение к Core) или HTTP (REST API).
- **Design System**: Собственная система токенов, совместимая с VS Code Webview UI Toolkit.

---

## 6. Future Plans
- **Remote Updates**: Поддержка обновления UI бандлов с удаленного сервера (CDN/GitHub Releases).
- **Theming**: Расширенная поддержка тем для Project Manager (синхронизация с VS Code theme colors и/или системной темой).
