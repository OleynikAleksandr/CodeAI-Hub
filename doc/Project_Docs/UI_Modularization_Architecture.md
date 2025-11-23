# UI Modularization Architecture Plan

**Версия плана:** 1.0.0  
**Дата создания:** 2025-11-23  
**Статус:** Draft — Awaiting approval  
**Цель:** Вынести все UI бандлы в отдельные модули для инкрементальных обновлений

---

## 1. Executive Summary

### Проблема
Текущая архитектура встраивает UI бандлы в VSIX (~50 MB), что приводит к:
- Необходимости полной переустановки при багфиксе в UI
- Невозможности обновлять UI независимо от расширения
- Большой размер VSIX для публикации в Marketplace
- Отсутствию гибкости для добавления новых интерфейсов

### Решение
Вынести **ВСЕ UI бандлы** (включая VS Code webview) в отдельные модули с собственными манифестами, версионированием и механизмом доставки через tarball архивы.

### Результат
- ✅ VSIX размером ~500 KB - 1 MB (только манифесты)
- ✅ Инкрементальные обновления UI (скачивание только измененных модулей)
- ✅ Независимое версионирование каждого UI
- ✅ Простое добавление новых интерфейсов (admin-panel, monitoring, etc.)
- ✅ Bandwidth экономия для пользователей (обновление UI ~2 MB вместо ~50 MB VSIX)

---

## 2. Архитектурные принципы

### 2.1 Модульность
Каждый UI — это отдельный модуль со своим:
- Версией (независимой от VSIX)
- Tarball архивом
- Манифестом
- Installer'ом

### 2.2 Централизованное хранилище
```
~/.codeai-hub/ui/
├── vscode-webview/      # UI для VS Code webview
├── web-client/          # Standalone CEF launcher
├── admin-panel/         # БУДУЩЕЕ: админ-панель
└── monitoring/          # БУДУЩЕЕ: мониторинг
```

### 2.3 Согласованность
UI модули следуют той же архитектуре, что и:
- Core runtime (`@codeai-hub/core`)
- Provider modules (`claude-module`, `codex-module`, `gemini-module`)
- Launcher (`CodeAIHubLauncher`)

### 2.4 Обратная совместимость
Переход должен быть плавным:
- Сохранить текущую функциональность
- Добавить новую инфраструктуру параллельно
- Переключиться после тестирования

---

## 3. Новая структура UI модулей

### 3.1 Физическая структура после установки

```
~/.codeai-hub/
├── ui/                                 # НОВОЕ: корневая директория для UI (текущая dev-схема)
│   ├── manifest.json                   # Локальный реестр установленных UI
│   ├── vscode-webview/                 # UI для VS Code
│   │   ├── 1.1.300/
│   │   │   ├── index.html
│   │   │   ├── dist/
│   │   │   │   ├── app.js
│   │   │   │   └── app.css
│   │   │   ├── assets/
│   │   │   │   ├── icons/
│   │   │   │   └── fonts/
│   │   │   ├── manifest.json           # Метаданные UI
│   │   │   └── install.json            # Маркер установки
│   │   ├── downloads/
│   │   │   └── codeai-hub-ui-vscode-webview-1.1.300.tar.bz2
│   │   └── current -> 1.1.300          # Symlink
│   ├── web-client/                     # Standalone launcher UI
│   │   ├── 1.1.300/
│   │   │   ├── index.html
│   │   │   ├── dist/...
│   │   │   ├── manifest.json
│   │   │   └── install.json
│   │   ├── downloads/
│   │   └── current -> 1.1.300
│   └── admin-panel/                    # БУДУЩЕЕ: Admin UI
│       ├── 1.0.0/
│       ├── downloads/
│       └── current -> 1.0.0
├── core/                               # Существующая структура
├── providers/                          # Существующая структура
├── cef-launcher/                       # Существующая структура
└── releases/                           # Кеш всех артефактов
    ├── codeai-hub-ui-vscode-webview-1.1.300.tar.bz2    # НОВОЕ
    ├── codeai-hub-ui-web-client-1.1.300.tar.bz2        # НОВОЕ
    ├── codeai-hub-ui-admin-panel-1.0.0.tar.bz2         # НОВОЕ
    ├── codeai-hub-core-darwin-arm64-1.1.300.tar.bz2    # Существующее
    └── CodeAIHubLauncher-macos-arm64-1.1.300.tar.bz2   # Существующее
```

### 3.3 Target layout under `~/.codeai-hub/packages`

In the target architecture the UI bundles share a unified layout with the launcher and other runtime components under a single `packages` tree. The goal is to eliminate any embedded UI from the VSIX and ensure that all clients (VS Code extension and CEF launcher) load their HTML/JS/CSS from `~/.codeai-hub/packages/**`:

```
~/.codeai-hub/
  packages/
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
    launcher/
      darwin-arm64/
        1.1.300/
          CodeAIHubLauncher.app
          config/
            config.json
          install.json
```

The `~/.codeai-hub/ui/**` layout described above is a transitional view used by the first iterations of the installer; as migration proceeds, build scripts will keep both locations consistent or fully switch to the `packages/ui/**` layout while preserving the same manifest/installer contracts.

### 3.2 Содержимое UI tarball

**Пример: `codeai-hub-ui-vscode-webview-1.1.300.tar.bz2`**

```
vscode-webview/
├── index.html                # Точка входа
├── dist/                     # Скомпилированные бандлы
│   ├── app.js                # React + бизнес-логика
│   └── app.css               # Стили
├── assets/                   # Статические ресурсы
│   ├── icons/
│   │   ├── provider-claude.svg
│   │   ├── provider-codex.svg
│   │   └── provider-gemini.svg
│   └── fonts/
│       └── inter-var.woff2
└── manifest.json             # Метаданные UI модуля
```

**Формат `manifest.json` внутри UI модуля:**

```json
{
  "bundleId": "vscode-webview",
  "version": "1.1.300",
  "builtAt": "2025-11-23T09:47:00Z",
  "platform": "universal",
  "entrypoint": "index.html",
  "description": "VS Code webview interface for CodeAI Hub"
}
```

---

## 4. Манифесты и версионирование

### 4.1 Главный UI манифест в VSIX

**Файл: `assets/ui/manifest.json`** (НОВЫЙ файл в VSIX)

```json
{
  "schema": 1,
  "baseUrl": "file:///Users/oleksandroliinyk/.codeai-hub/releases/",
  "bundles": {
    "vscode-webview": {
      "version": "1.1.300",
      "archive": "codeai-hub-ui-vscode-webview-1.1.300.tar.bz2",
      "sha1": "abc123def456...",
      "sizeBytes": 2457600,
      "platform": "universal",
      "description": "VS Code webview interface",
      "required": true
    },
    "web-client": {
      "version": "1.1.300",
      "archive": "codeai-hub-ui-web-client-1.1.300.tar.bz2",
      "sha1": "def456ghi789...",
      "sizeBytes": 2560000,
      "platform": "universal",
      "description": "Standalone launcher UI",
      "required": true
    },
    "admin-panel": {
      "version": "1.0.0",
      "archive": "codeai-hub-ui-admin-panel-1.0.0.tar.bz2",
      "sha1": "ghi789jkl012...",
      "sizeBytes": 1843200,
      "platform": "universal",
      "description": "Admin control panel",
      "required": false
    }
  }
}
```

**Future public distribution (GitHub Releases — post-development):**
```json
{
  "baseUrl": "https://github.com/YourOrg/CodeAI-Hub/releases/download/v1.1.300/"
}
```
На этапе активной разработки и внутренних релизов UI мы НЕ используем GitHub Releases: все манифесты в VSIX продолжают ссылаться на локальный cache `file:///Users/oleksandroliinyk/.codeai-hub/releases/` (семантически `file://$HOME/.codeai-hub/releases/`), а tarball'ы подкладываются туда сборочными скриптами.

### 4.2 Локальный реестр установленных UI

**Файл: `~/.codeai-hub/ui/manifest.json`** (создается installer'ом)

```json
{
  "schema": 1,
  "installedBundles": {
    "vscode-webview": {
      "version": "1.1.300",
      "installedAt": "2025-11-23T09:50:00Z",
      "installPath": "/Users/user/.codeai-hub/ui/vscode-webview/1.1.300",
      "currentLink": "/Users/user/.codeai-hub/ui/vscode-webview/current"
    },
    "web-client": {
      "version": "1.1.300",
      "installedAt": "2025-11-23T09:51:00Z",
      "installPath": "/Users/user/.codeai-hub/ui/web-client/1.1.300",
      "currentLink": "/Users/user/.codeai-hub/ui/web-client/current"
    }
  }
}
```

---

## 5. Затрагиваемые файлы и модули

### 5.1 НОВЫЕ файлы (создать)

#### Манифесты
- `assets/ui/manifest.json` — главный UI манифест в VSIX

#### UI Installer
- `src/extension-module/ui/ui-bundle-installer.ts` — класс для установки UI модулей
- `src/extension-module/ui/ui-manifest-reader.ts` — чтение `assets/ui/manifest.json`
- `src/extension-module/ui/ui-update-checker.ts` — проверка обновлений UI
- `src/extension-module/ui/ui-registry.ts` — работа с локальным реестром UI
- `src/extension-module/ui/ui-types.ts` — типы для UI модулей
- `src/extension-module/ui/index.ts` — публичный API модуля

#### Build Scripts
- `scripts/build-ui-bundle.sh` — сборка UI tarball
- `scripts/build-ui-vscode-webview.sh` — специфичная сборка для webview
- `scripts/build-ui-web-client.sh` — специфичная сборка для standalone
- `scripts/build-ui-admin-panel.sh` — (опционально) для будущего admin UI
- `scripts/update-ui-manifest.js` — обновление SHA-1 в `assets/ui/manifest.json`

#### Документация
- `doc/Project_Docs/Stacks/UI_Modules.md` — документация по UI модулям
- `doc/Project_Docs/UI_Modularization_Architecture.md` — этот документ

### 5.2 МОДИФИЦИРУЕМЫЕ файлы

#### Extension Host
- `src/extension.ts` — добавить вызов `UIBundleInstaller` при активации
- `src/extension-module/home-view/home-view-provider.ts` — изменить путь к webview UI
- `src/extension-module/cef/launcher.ts` — обновить config.json для CEF launcher

#### CEF Launcher
- `src/extension-module/cef/ensure-launcher-config.ts` — указывать путь в `~/.codeai-hub/ui/web-client/current/`

#### Build System
- `scripts/build-all.sh` — добавить сборку UI модулей
- `scripts/build-release.sh` — включить UI tarballs в релиз
- `package.json` — добавить npm scripts для UI сборки

#### Архитектурная документация
- `doc/Architecture/Architecture.md` — обновить раздел про UI
- `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md` — добавить UI модули

#### Тесты
- `src/__tests__/ui-bundle-installer.test.ts` — (новый) тесты installer'а
- `src/__tests__/ui-update-checker.test.ts` — (новый) тесты update checker

### 5.3 УДАЛЯЕМЫЕ файлы

Нет — все существующие файлы сохраняются для обратной совместимости до завершения миграции.

---

## 6. Детальная архитектура компонентов

### 6.1 UIBundleInstaller Module

**Файл: `src/extension-module/ui/ui-bundle-installer.ts`**

**Обязанности:**
- Чтение манифеста `assets/ui/manifest.json`
- Проверка наличия установленного UI
- Поиск tarball в локальных кешах (сначала `~/.codeai-hub/ui/{bundleId}/downloads/`, затем общий `~/.codeai-hub/releases/`) на основе `baseUrl` без сетевых запросов в текущей схеме разработки
- Валидация SHA-1
- Распаковка в `~/.codeai-hub/ui/{bundleId}/{version}/`
- Создание symlink `current`
- Обновление локального реестра `~/.codeai-hub/ui/manifest.json`
- Работа как идемпотентного one-shot installer: при повторных вызовах для уже установленной версии просто возвращать `UIBundleInfo` без повторной распаковки (используется при установке новой версии и явных сценариях `Repair`, а не как тяжёлый шаг в каждом `activate()`)

**Публичный API:**
```typescript
export class UIBundleInstaller {
  constructor(private context: ExtensionContext);
  
  // Установить/обновить UI bundle
  async ensureUIBundle(
    bundleId: UIBundleId,
    options?: { forceReinstall?: boolean }
  ): Promise<UIBundleInfo>;
  
  // Получить путь к текущей версии UI
  async resolveCurrentUIPath(bundleId: UIBundleId): Promise<string>;
  
  // Проверить, установлен ли UI
  async isInstalled(bundleId: UIBundleId, version: string): Promise<boolean>;
  
  // Удалить старые версии UI (оставить последние N)
  async pruneOldVersions(bundleId: UIBundleId, keepCount: number): Promise<void>;
}

export type UIBundleId = 'vscode-webview' | 'web-client' | 'admin-panel';

export interface UIBundleInfo {
  bundleId: UIBundleId;
  version: string;
  installPath: string;
  currentLink: string;
}
```

**Зависимости:**
- `UIManifestReader` — чтение манифестов
- `runtime-files.ts` — переиспользовать логику download/extract
- `launcher-install-helpers.ts` — переиспользовать SHA-1 валидацию

### 6.2 UIUpdateChecker Module

**Файл: `src/extension-module/ui/ui-update-checker.ts`**

**Обязанности:**
- Сравнение версий в манифесте vs установленных
- Определение необходимости обновления
- Оркестрация процесса обновления, опираясь на те же локальные кеши (`downloads/` и `~/.codeai-hub/releases/`) и общую политику поиска артефактов, что описана в `doc/Project_Docs/knowledge/Local_Artifacts_Workflow.md`

**Публичный API:**
```typescript
export class UIUpdateChecker {
  constructor(
    private context: ExtensionContext,
    private installer: UIBundleInstaller
  );
  
  // Проверить доступность обновлений
  async checkForUpdates(): Promise<UIUpdateInfo[]>;
  
  // Применить обновления
  async applyUpdates(
    updates: UIUpdateInfo[],
    progressCallback?: (progress: UpdateProgress) => void
  ): Promise<void>;
}

export interface UIUpdateInfo {
  bundleId: UIBundleId;
  currentVersion: string | null;
  availableVersion: string;
  downloadSize: number;
  required: boolean;
}

export interface UpdateProgress {
  bundleId: UIBundleId;
  phase: 'downloading' | 'extracting' | 'validating' | 'linking';
  bytesDownloaded?: number;
  totalBytes?: number;
}
```

### 6.3 UIRegistry Module

**Файл: `src/extension-module/ui/ui-registry.ts`**

**Обязанности:**
- Чтение/запись локального реестра `~/.codeai-hub/ui/manifest.json`
- Поддержка атомарности операций

**Публичный API:**
```typescript
export class UIRegistry {
  // Прочитать локальный реестр
  async read(): Promise<UIRegistryData>;
  
  // Зарегистрировать установленный UI
  async registerInstallation(info: UIBundleInfo): Promise<void>;
  
  // Получить информацию об установленном UI
  async getInstalled(bundleId: UIBundleId): Promise<UIBundleInfo | null>;
  
  // Удалить запись (при деинсталляции)
  async unregister(bundleId: UIBundleId): Promise<void>;
}

export interface UIRegistryData {
  schema: number;
  installedBundles: Record<UIBundleId, UIBundleInfo>;
}
```

### 6.4 UIManifestReader Module

**Файл: `src/extension-module/ui/ui-manifest-reader.ts`**

**Обязанности:**
- Чтение `assets/ui/manifest.json` из VSIX
- Валидация schema
- Парсинг записей

**Публичный API:**
```typescript
export const readUIManifest = async (
  context: ExtensionContext
): Promise<UIManifest> => {
  const manifestPath = context.asAbsolutePath(
    path.join('assets', 'ui', 'manifest.json')
  );
  const raw = await fs.readFile(manifestPath, 'utf8');
  const parsed = JSON.parse(raw) as UIManifest;
  
  if (parsed.schema !== 1) {
    throw new Error('Unsupported UI manifest schema');
  }
  
  return parsed;
};

export interface UIManifest {
  schema: number;
  baseUrl: string;
  bundles: Record<UIBundleId, UIManifestEntry>;
}

export interface UIManifestEntry {
  version: string;
  archive: string;
  sha1: string;
  sizeBytes: number;
  platform: 'universal' | 'darwin' | 'win32' | 'linux';
  description: string;
  required: boolean;
}
```

---

## 7. Интеграция с Extension Host

### 7.1 Активация расширения

**Файл: `src/extension.ts`** (модификация)

```typescript
export async function activate(context: ExtensionContext) {
  // ... существующая логика инициализации ...

  // НОВОЕ: Получение пути до уже установленного UI
  const uiInstaller = new UIBundleInstaller(context);

  // В текущей схеме разработки UI устанавливается один раз
  // из локального архива (скрипты build-all.sh / build-ui-bundle.sh).
  // Здесь мы только читаем путь; тяжёлой установки и сетевых операций нет.
  const webviewUIPath = await uiInstaller.resolveCurrentUIPath("vscode-webview");

  if (!webviewUIPath) {
    // Fallback: UI не установлен — сообщаем об ошибке и просим запустить локальную сборку
    window.showErrorMessage(
      "CodeAI Hub UI is not installed. Run the local build pipeline before activating the extension."
    );
    return;
  }

  // Инициализация HomeViewProvider с новым путём
  const homeViewProvider = new HomeViewProvider(context, webviewUIPath);

  // ... остальная логика регистрации HomeViewProvider и команд ...
}
```

### 7.2 HomeViewProvider

**Файл: `src/extension-module/home-view/home-view-provider.ts`** (модификация)

```typescript
export class HomeViewProvider implements WebviewViewProvider {
  constructor(
    private readonly context: ExtensionContext,
    private readonly uiRootPath: string  // НОВОЕ: путь к UI
  ) {}
  
  public resolveWebviewView(webviewView: WebviewView): void {
    // ... существующая логика ...
    
    // ИЗМЕНЕНО: Загружать HTML/JS из uiRootPath
    const indexPath = path.join(this.uiRootPath, "index.html");
    webviewView.webview.html = this.getWebviewContent(webviewView, indexPath);
  }
  
  private getWebviewContent(
    webviewView: WebviewView,
    indexPath: string
  ): string {
    // Читать index.html
    const html = fs.readFileSync(indexPath, "utf8");

    // Базовый URI для статики внутри UI-пакета
    const baseUri = webviewView.webview.asWebviewUri(
      vscode.Uri.file(this.uiRootPath)
    );

    // Упрощённый пример переписывания путей; реальная реализация
    // должна аккуратно обрабатывать все варианты ссылок и CSP.
    return html
      .replace(/href="\.\/dist\//g, `href="${baseUri}/dist/`)
      .replace(/src="\.\/dist\//g, `src="${baseUri}/dist/`);
  }
}
```

### 7.3 CEF Launcher Config

**Файл: `src/extension-module/cef/launcher.ts`** (модификация)

```typescript
const ensureLauncherConfig = async (
  launcher: LauncherInstallInfo,
  context: ExtensionContext
): Promise<string> => {
  const uiInstaller = new UIBundleInstaller(context);
  
  // НОВОЕ: Получить путь к standalone UI
  const webClientUIPath = await uiInstaller.resolveCurrentUIPath('web-client');
  const indexFilePath = path.join(webClientUIPath, 'index.html');
  
  const configDir = path.join(launcher.installDir, 'config');
  await ensureDirectory(configDir);
  
  const configPath = path.join(configDir, 'config.json');
  const existingConfig = await readExistingConfig(configPath);
  
  const config = {
    ...existingConfig,
    uiRoot: webClientUIPath,  // ИЗМЕНЕНО
    entry: 'index.html',
    url: Uri.file(indexFilePath).toString(),
    generatedAt: new Date().toISOString(),
  };
  
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  return configPath;
};
```

---

## 8. Build System

### 8.1 UI Bundle Build Script

**Файл: `scripts/build-ui-bundle.sh`** (НОВЫЙ)

```bash
#!/usr/bin/env bash
set -euo pipefail

BUNDLE_ID="$1"      # vscode-webview | web-client | admin-panel
VERSION="$2"        # 1.1.300

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"
STAGING_DIR="${PROJECT_ROOT}/doc/tmp/ui-staging/${BUNDLE_ID}"
RELEASES_DIR="${HOME}/.codeai-hub/releases"

echo "═══════════════════════════════════════════"
echo "Building UI Bundle: ${BUNDLE_ID}@${VERSION}"
echo "═══════════════════════════════════════════"

# 1. Собрать React/TypeScript бандл
echo "→ Compiling TypeScript..."
npm run build:ui:${BUNDLE_ID}

# 2. Подготовить структуру для архива
echo "→ Staging files..."
rm -rf "${STAGING_DIR}"
mkdir -p "${STAGING_DIR}"

cp "${PROJECT_ROOT}/media/${BUNDLE_ID}/index.html" "${STAGING_DIR}/"
cp -r "${PROJECT_ROOT}/media/${BUNDLE_ID}/dist" "${STAGING_DIR}/"

if [ -d "${PROJECT_ROOT}/media/${BUNDLE_ID}/assets" ]; then
  cp -r "${PROJECT_ROOT}/media/${BUNDLE_ID}/assets" "${STAGING_DIR}/"
fi

# 3. Создать manifest внутри UI модуля
echo "→ Creating bundle manifest..."
cat > "${STAGING_DIR}/manifest.json" <<EOF
{
  "bundleId": "${BUNDLE_ID}",
  "version": "${VERSION}",
  "builtAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "platform": "universal",
  "entrypoint": "index.html",
  "description": "CodeAI Hub ${BUNDLE_ID} UI"
}
EOF

# 4. Создать tarball
echo "→ Creating tarball..."
mkdir -p "${RELEASES_DIR}"

ARCHIVE_NAME="codeai-hub-ui-${BUNDLE_ID}-${VERSION}.tar.bz2"
tar -cjf "${RELEASES_DIR}/${ARCHIVE_NAME}" \
  -C "${PROJECT_ROOT}/doc/tmp/ui-staging" \
  "${BUNDLE_ID}"

# 5. Вычислить SHA-1
SHA1=$(shasum "${RELEASES_DIR}/${ARCHIVE_NAME}" | awk '{print $1}')

# 6. Получить размер файла
SIZE=$(stat -f%z "${RELEASES_DIR}/${ARCHIVE_NAME}" 2>/dev/null || stat -c%s "${RELEASES_DIR}/${ARCHIVE_NAME}")

echo "✅ UI bundle built successfully!"
echo "   Archive: ${ARCHIVE_NAME}"
echo "   SHA-1: ${SHA1}"
echo "   Size: ${SIZE} bytes"

# 7. Обновить assets/ui/manifest.json
echo "→ Updating UI manifest..."
node "${SCRIPT_DIR}/update-ui-manifest.js" \
  "${BUNDLE_ID}" \
  "${VERSION}" \
  "${ARCHIVE_NAME}" \
  "${SHA1}" \
  "${SIZE}"

echo "✅ Done!"
```

### 8.2 Update UI Manifest Script

**Файл: `scripts/update-ui-manifest.js`** (НОВЫЙ)

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const [bundleId, version, archive, sha1, sizeBytes] = process.argv.slice(2);

const manifestPath = path.join(__dirname, '..', 'assets', 'ui', 'manifest.json');

let manifest = { schema: 1, baseUrl: '', bundles: {} };

if (fs.existsSync(manifestPath)) {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

// Обновить запись для bundle
manifest.bundles[bundleId] = {
  version,
  archive,
  sha1,
  sizeBytes: parseInt(sizeBytes, 10),
  platform: 'universal',
  description: manifest.bundles[bundleId]?.description || `${bundleId} UI`,
  required: bundleId === 'vscode-webview' || bundleId === 'web-client',
};

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

console.log(`✅ Updated assets/ui/manifest.json for ${bundleId}@${version}`);
```

### 8.3 Build All Script

**Файл: `scripts/build-all.sh`** (модификация)

```bash
#!/usr/bin/env bash

# ... существующая логика версионирования ...

# НОВОЕ: Build UI bundles
echo "═══════════════════════════════════════════"
echo "Building UI Bundles"
echo "═══════════════════════════════════════════"

./scripts/build-ui-bundle.sh vscode-webview "${NEW_VERSION}"
./scripts/build-ui-bundle.sh web-client "${NEW_VERSION}"

# Опционально: будущие UI
# ./scripts/build-ui-bundle.sh admin-panel "1.0.0"

# ... продолжение сборки core, providers, launcher ...
```

### 8.4 Package.json Scripts

**Файл: `package.json`** (модификация)

```json
{
  "scripts": {
    "build:ui:vscode-webview": "node scripts/build-webview.js",
    "build:ui:web-client": "node scripts/build-web-client.js",
    "build:ui:admin-panel": "node scripts/build-admin-panel.js",
    "build:ui:all": "npm run build:ui:vscode-webview && npm run build:ui:web-client"
  }
}
```

---

## 9. Фазы реализации

### Фаза 1: Инфраструктура и манифесты
- Создать `assets/ui/manifest.json`
- Создать типы (`ui-types.ts`)
- Создать `UIManifestReader`
- Создать `UIRegistry`
- Добавить тесты для манифестов

### Фаза 2: UI Installer
- Создать `UIBundleInstaller`
- Переиспользовать логику из `runtime-files.ts` и `launcher-install-helpers.ts`
- Добавить тесты для installer'а

### Фаза 3: Update Checker
- Создать `UIUpdateChecker`
- Интегрировать с loading overlay
- Добавить тесты

### Фаза 4: Build System
- Создать `build-ui-bundle.sh`
- Создать `update-ui-manifest.js`
- Обновить `build-all.sh`
- Добавить npm scripts

### Фаза 5: Extension Integration
- Модифицировать `extension.ts`
- Модифицировать `HomeViewProvider`
- Модифицировать launcher config генератор
- Тесты интеграции

### Фаза 6: Первоначальная миграция
- Собрать UI tarballs для vscode-webview и web-client
- Протестировать установку с нуля
- Протестировать обновление

### Фаза 7: Документация и очистка
- Обновить `Architecture.md`
- Обновить `SystemArchitecture.md`
- Создать `UI_Modules.md`
- Удалить старый код (если применимо)

### Фаза 8: Production Release
*(отложено до этапа публичных релизов; не выполняется в текущем dev-цикле)*
- Спланировать переключение `baseUrl` на GitHub Releases/внешнее хранилище
- Подготовить процесс публикации UI tarballs в публичный релиз
- Провести E2E тестирование с удалёнными URL (после принятия решения о публичной дистрибуции)

---

## 10. Микро-задачи для todo-plan.md

### Stream 1: Инфраструктура манифестов
1. [TODO] Создать `assets/ui/manifest.json` с schema validation
2. [TODO] Создать `src/extension-module/ui/ui-types.ts` (типы)
3. [TODO] Создать `src/extension-module/ui/ui-manifest-reader.ts`
4. [TODO] Создать тесты для `UIManifestReader`
5. [TODO] Создать `src/extension-module/ui/ui-registry.ts`
6. [TODO] Создать тесты для `UIRegistry`

### Stream 2: UI Bundle Installer
1. [TODO] Создать `src/extension-module/ui/ui-bundle-installer.ts` (базовая структура)
2. [TODO] Реализовать `ensureUIBundle()` с download/extract
3. [TODO] Реализовать `resolveCurrentUIPath()`
4. [TODO] Реализовать `isInstalled()` и `pruneOldVersions()`
5. [TODO] Создать тесты для `UIBundleInstaller`
6. [TODO] Создать `index.ts` с публичным API

### Stream 3: Update Checker
1. [TODO] Создать `src/extension-module/ui/ui-update-checker.ts`
2. [TODO] Реализовать `checkForUpdates()`
3. [TODO] Реализовать `applyUpdates()` с прогресс-трекингом
4. [TODO] Создать тесты для `UIUpdateChecker`

### Stream 4: Build Scripts
1. [TODO] Создать `scripts/build-ui-bundle.sh`
2. [TODO] Создать `scripts/update-ui-manifest.js`
3. [TODO] Создать `scripts/build-ui-vscode-webview.sh` (обертка)
4. [TODO] Создать `scripts/build-ui-web-client.sh` (обертка)
5. [TODO] Обновить `package.json` (npm scripts)
6. [TODO] Обновить `scripts/build-all.sh`

### Stream 5: Extension Integration
1. [TODO] Модифицировать `src/extension.ts` (добавить UI installer)
2. [TODO] Модифицировать `HomeViewProvider` (использовать динамический UI path)
3. [TODO] Модифицировать `src/extension-module/cef/launcher.ts` (config.json)
4. [TODO] Добавить loading overlay для UI updates
5. [TODO] Создать integration тесты

### Stream 6: Первоначальная сборка и миграция
1. [TODO] Собрать UI tarball для vscode-webview
2. [TODO] Собрать UI tarball для web-client
3. [TODO] Протестировать fresh install
4. [TODO] Протестировать incremental update
5. [TODO] Зафиксировать результаты в Session report

### Stream 7: Документация
1. [TODO] Обновить `doc/Architecture/Architecture.md`
2. [TODO] Обновить `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
3. [TODO] Создать `doc/Project_Docs/Stacks/UI_Modules.md`
4. [TODO] Обновить README (если необходимо)

### Stream 8: Production Preparation
1. [TODO] Подготовить стратегию переключения `baseUrl` в манифестах на GitHub Releases (future public release)
2. [TODO] Протестировать сборку с GitHub URLs после включения удалённого хранилища
3. [TODO] Подготовить release notes
4. [TODO] Выполнить финальную сборку через `build-all.sh`

---

## 11. Оценка рисков и митигация

### Риск 1: Обратная совместимость
**Описание:** Старые версии VSIX могут сломаться после изменений.

**Митигация:**
- Удалить встроенный UI из VSIX и всегда читать UI из установленного модуля в `~/.codeai-hub/**`
- Обеспечить, что новая схема установки UI совместима с уже существующими локальными артефактами (core/providers/launcher)
- Тщательно тестировать upgrade path (установка новой версии поверх старой с уже установленным UI)

### Риск 2: Размер первой загрузки
**Описание:** Первая установка новой версии потребует распаковки/копирования ~5 MB UI из локального архива.

**Митигация:**
- Показывать четкий прогресс-индикатор
- Кешировать артефакты локально
- Параллельная распаковка нескольких UI (при необходимости)

### Риск 3: Сетевые ошибки
**Описание:** На этапе публичных релизов возможны ошибки при обращении к удалённым URL (GitHub Releases/CDN).

**Митигация:**
- В текущей офлайн-схеме опираться только на локальные кеши (`downloads/` и `~/.codeai-hub/releases/`), чтобы исключить сетевые ошибки
- Для будущих публичных релизов предусмотреть fallback на предыдущую установленную версию UI, retry logic с exponential backoff и чёткие сообщения об ошибках

### Риск 4: Disk space
**Описание:** Накопление старых версий UI может занимать место.

**Митигация:**
- Auto-pruning старых версий (оставлять только последние 2)
- Команда для ручной очистки кеша
- Документация по управлению disk space

---

## 12. Метрики успеха

### Технические метрики
- ✅ VSIX размер < 1 MB
- ✅ UI update время < 10 сек (на среднем интернете)
- ✅ 100% покрытие тестами для installer'ов
- ✅ 0 регрессий в существующей функциональности

### Пользовательские метрики
- ✅ Прозрачное обновление UI без переустановки VSIX
- ✅ Четкий прогресс-индикатор при загрузке UI
- ✅ Работа offline (если UI уже установлен)

### Бизнес метрики
- ✅ Сокращение bandwidth на 90% для UI обновлений
- ✅ Возможность hotfix UI в течение часа (без релиза VSIX)
- ✅ Простое добавление новых UI интерфейсов

---

## 13. Следующие шаги

1. **Ревью этого документа** — утвердить архитектуру
2. **Создать todo-plan.md** — структурировать по фазам и стримам
3. **Начать с Фазы 1** — инфраструктура манифестов
4. **Итеративная разработка** — по одному стриму за раз
5. **Тестирование на каждом этапе** — не двигаться дальше без зеленых тестов

---

## 14. Приложения

### Приложение A: Пример config.json для launcher

```json
{
  "uiRoot": "/Users/user/.codeai-hub/ui/web-client/current",
  "entry": "index.html",
  "url": "file:///Users/user/.codeai-hub/ui/web-client/current/index.html",
  "generatedAt": "2025-11-23T10:00:00Z",
  "workspacePath": "/Users/user/Projects/my-project"
}
```

### Приложение B: Пример локального UI registry

```json
{
  "schema": 1,
  "installedBundles": {
    "vscode-webview": {
      "version": "1.1.300",
      "installedAt": "2025-11-23T09:50:00Z",
      "installPath": "/Users/user/.codeai-hub/ui/vscode-webview/1.1.300",
      "currentLink": "/Users/user/.codeai-hub/ui/vscode-webview/current"
    },
    "web-client": {
      "version": "1.1.300",
      "installedAt": "2025-11-23T09:51:00Z",
      "installPath": "/Users/user/.codeai-hub/ui/web-client/1.1.300",
      "currentLink": "/Users/user/.codeai-hub/ui/web-client/current"
    },
    "admin-panel": {
      "version": "1.0.0",
      "installedAt": "2025-11-23T10:00:00Z",
      "installPath": "/Users/user/.codeai-hub/ui/admin-panel/1.0.0",
      "currentLink": "/Users/user/.codeai-hub/ui/admin-panel/current"
    }
  }
}
```

### Приложение C: Граф зависимостей модулей

```
UIBundleInstaller
├── UIManifestReader
├── UIRegistry
├── runtime-files (download/extract)
└── launcher-install-helpers (SHA-1 validation)

UIUpdateChecker
├── UIBundleInstaller
└── UIManifestReader

extension.ts
├── UIBundleInstaller
├── UIUpdateChecker
└── HomeViewProvider
    └── (использует путь из UIBundleInstaller)
```

---

**Конец документа**
