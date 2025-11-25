# UI Modularization Architecture

**Версия:** 1.2.0
**Дата обновления:** 2025-11-24
**Статус:** Implemented (v1.1.313)
**Реализация:** `src/extension-module/ui/`
**Stack Doc:** `doc/Project_Docs/Stacks/UI_Modules.md`

---

## 1. Executive Summary

### Проблема
Ранее UI бандлы были встроены в VSIX, что увеличивало его размер и требовало полной переустановки расширения для обновления интерфейса.

### Решение
В версии 1.1.302+ UI бандлы (`vscode-webview`, `web-client`, `project-manager`) вынесены в отдельные модули. VSIX содержит только манифест `assets/ui/manifest.json`. При старте расширение проверяет наличие UI в `~/.codeai-hub/packages/ui/` и при необходимости устанавливает их из локальных архивов (в dev-режиме) или скачивает (в будущем).

### Результат
- ✅ VSIX уменьшен с ~700KB до ~370KB.
- ✅ UI обновляется независимо от Extension Host.
- ✅ Единый механизм установки для Core, Launcher и UI.

---

## 2. Архитектура

### 2.1 Структура пакетов
UI модули устанавливаются в унифицированную директорию `packages`, как и Launcher.

```
~/.codeai-hub/
├── packages/
│   └── ui/
│       ├── vscode-webview/
│       │   ├── 1.1.313/
│       │   │   ├── index.html
│       │   │   ├── dist/
│       │   │   ├── assets/
│       │   │   └── manifest.json
│       │   └── current -> 1.1.313
│       ├── web-client/
│       │   ├── 1.1.313/
│       │   │   ├── index.html
│       │   │   ├── dist/
│       │   │   └── manifest.json
│       │   └── current -> 1.1.313
│       └── project-manager/
│           ├── 1.1.313/
│           │   ├── index.html
│           │   ├── dist/
│           │   └── manifest.json
│           └── current -> 1.1.313
└── releases/
    ├── vscode-webview-1.1.313.tar.bz2
    ├── web-client-1.1.313.tar.bz2
    └── project-manager-1.1.313.tar.bz2
```

### 2.2 Компоненты

#### UI Activation (`src/extension-module/ui/ui-activation.ts`)
Точка входа в процесс инициализации UI.
- Вызывается из `extension.ts` -> `activate()`.
- Инициализирует `UIBundleInstaller`.
- Вызывает `prepareUIBundles()`, который:
    1. Читает `assets/ui/manifest.json`.
    2. Для каждого бандла (`vscode-webview`, `web-client`, `project-manager`) вызывает `installer.ensureInstalled()`.
    3. Возвращает пути к `current` версиям.
- Логирует результат (Installed vs Embedded fallback).

#### UI Bundle Installer (`src/extension-module/ui/ui-bundle-installer.ts`)
Отвечает за распаковку и версионирование.
- Проверяет наличие версии в `packages/ui/<bundle>/<version>`.
- Если нет — ищет tarball в `~/.codeai-hub/releases/` (или по `baseUrl`).
- Распаковывает архив.
- Создает/обновляет symlink `current`.
- Обновляет `install.json`.

#### UI Path Resolver (`src/extension-module/ui/ui-path-resolver.ts`)
Определяет, какой путь использовать:
- Приоритет: установленный бандл (`packages/ui/.../current`).
- Fallback: встроенные файлы в VSIX (`media/`) — только для разработки, если установка не удалась.

### 2.3 Манифесты

**VSIX Manifest (`assets/ui/manifest.json`):**
```json
{
  "schema": 1,
  "baseUrl": "file:///Users/user/.codeai-hub/releases/",
  "bundles": {
    "vscode-webview": {
      "version": "1.1.313",
      "archive": "vscode-webview-1.1.313.tar.bz2",
      "sha1": "...",
      "sizeBytes": 123456,
      "required": true
    },
    "web-client": {
      "version": "1.1.313",
      "archive": "web-client-1.1.313.tar.bz2",
      "sha1": "...",
      "sizeBytes": 123456,
      "required": true
    },
    "project-manager": {
      "version": "1.1.313",
      "archive": "project-manager-1.1.313.tar.bz2",
      "sha1": "...",
      "sizeBytes": 123456,
      "required": false
    }
  }
}
```

**Bundle Manifest (`manifest.json` внутри архива):**
Содержит метаданные конкретной сборки (версия, дата, entrypoint).

---

## 3. Процесс сборки и доставки

### 3.1 Build Scripts
- `scripts/build-ui-bundle.sh`:
    1. Собирает UI (React/Vite).
    2. Формирует структуру папок (`dist`, `assets`, `index.html`).
    3. Создает `manifest.json`.
    4. Упаковывает в `.tar.bz2`.
    5. Кладет архив в `~/.codeai-hub/releases/`.
    6. Обновляет `assets/ui/manifest.json` в исходниках расширения.

- `scripts/build-all.sh`:
    - Вызывает `build-ui-bundle.sh` для всех бандлов перед упаковкой VSIX.

### 3.2 VSIX Packaging
- `.vscodeignore` исключает тяжелые папки `media/` (кроме необходимых заглушек), так как они теперь поставляются отдельно.
- VSIX содержит только код расширения и манифесты.

---

## 4. Интеграция

### 4.1 VS Code Webview
`HomeViewProvider` получает путь к UI через конструктор.
- Если UI установлен: грузит `index.html` из `packages/ui/vscode-webview/current`.
- Ресурсы (`js`, `css`) грузятся относительно этого корня.

### 4.2 CEF Launcher
`CodeAIHubLauncher` получает путь к UI через `config.json`.
- `extension.ts` формирует конфиг, указывая `uiRoot` на `packages/ui/web-client/current` (или `project-manager/current`).
- Launcher загружает `index.html` из этого пути.

---

## 5. Future Work
- **Remote Updates**: Переключение `baseUrl` на GitHub Releases для публичных обновлений.
- **Background Updates**: Проверка новых версий UI в фоне без перезапуска расширения (hot swap для Webview возможен при переоткрытии).
- **Admin Panel**: Добавление третьего бандла для администрирования.

