# CEF macOS Bootstrap Hardening Architecture

**Status:** Accepted
**Date:** 2026-04-22
**Owner:** Codex
**Scope:** `packages/cef-launcher/src/platform/mac/*`, launcher shutdown/bootstrap contract, release `1.2.46`

---

## 1. Problem

После закрытия standalone Project Manager на macOS `CodeAIHubLauncher` периодически падает с нативным crash report:

- crash report: `/Users/oleksandroliinyk/Library/Logs/DiagnosticReports/CodeAIHubLauncher-2026-04-22-091633.ips`
- exception: `NSInvalidArgumentException`
- reason: `-[NSApplication %s]: unrecognized selector sent to instance ...`
- stack: `AppKit -> Chromium Embedded Framework -> CodeAIHubLauncher main`

Текущий `packages/cef-launcher/src/platform/mac/app_main_mac.mm` поднимает обычный `NSApplication`, вручную создаёт минимальное меню и запускает `CefRunMessageLoop()`. Это проще, чем рекомендуемый bootstrap из официального CEF sample `tests/cefsimple/cefsimple_mac.mm`, где macOS browser process использует:

- custom `NSApplication <CefAppProtocol>`;
- `sendEvent:` с `CefScopedSendingEvent`;
- override `terminate:` без прямого `exit()`;
- delegate-driven `tryToTerminateApplication`;
- reopen/support hooks на delegate.

Для Chromium/CEF shutdown-path это не cosmetic detail, а часть supported lifecycle contract.

---

## 2. Product Goal

Сделать macOS launcher bootstrap ближе к официальному CEF sample настолько, насколько это нужно для корректного shutdown/reopen lifecycle, не меняя продуктовую логику Project Manager и не ломая текущий launcher bridge.

Успех scope:

- `CodeAIHubLauncher` больше не падает на штатном quit/close path;
- shutdown идёт через `LauncherHandler::CloseAllBrowsers(false)` -> `CefQuitMessageLoop()` -> `CefShutdown()`;
- dock reopen и обычный quit продолжают работать;
- текущая ручная инициализация окна/CEF browser остаётся совместимой с нашим launcher app.

---

## 3. Non-Goals

- Не меняем UI bundle, Core, PM websocket/runtime логику.
- Не переписываем launcher на nib/storyboard path.
- Не трогаем win/linux bootstrap.
- Не исправляем в этом scope usage-limits bugs от `1.2.45`; они только формализуются в `doc/BugRegistry.md`.

---

## 4. Root Cause Hypothesis

Высоковероятная причина падения: mac launcher работает на "голом" `NSApplication`, тогда как CEF/macOS runtime ожидает application object, реализующий `CefAppProtocol` и specific quit/send-event behavior.

Следствия текущего минимального bootstrap:

1. `sendEvent:` идёт через обычный `NSApplication`, без `CefScopedSendingEvent`.
2. `terminate:` использует стандартный Cocoa path, который рассчитан на `exit()`-style termination, а не на Chromium orderly shutdown через выход из message loop.
3. Нет delegate-level seam, который перенаправляет quit/reopen в `LauncherHandler`.

Crash signature `unrecognized selector` на `NSApplication` хорошо совпадает с этим разрывом: Chromium/CEF/macOS path вызывает selector, который в официальном sample обслуживается custom application class, а у обычного `NSApplication` отсутствует.

---

## 5. Target Design

### 5.1 New mac bootstrap seam

Вводим отдельный mac-only bootstrap helper, который берёт на себя CEF-compatible application lifecycle:

- `CodeAIHubApplication : NSApplication <CefAppProtocol>`
- `CodeAIHubAppDelegate : NSObject <NSApplicationDelegate>`

### 5.2 Responsibilities

`CodeAIHubApplication`

- хранит `handlingSendEvent_`;
- реализует `isHandlingSendEvent` / `setHandlingSendEvent`;
- оборачивает `sendEvent:` в `CefScopedSendingEvent`;
- override `terminate:` и переводит quit path в delegate `tryToTerminateApplication:` вместо прямого exit.

`CodeAIHubAppDelegate`

- создаёт application menu на UI thread;
- вызывает `LauncherHandler::CloseAllBrowsers(false)` на quit path;
- вызывает `LauncherHandler::ShowMainWindow()` на dock reopen;
- возвращает `YES` в `applicationSupportsSecureRestorableState`;
- держит bootstrap-specific hooks отдельно от `LauncherApp`.

### 5.3 app_main_mac.mm after refactor

`app_main_mac.mm` должен стать тонким entrypoint:

1. `CefScopedLibraryLoader.LoadInMain()`
2. `@autoreleasepool`
3. `[CodeAIHubApplication sharedApplication]`
4. `CefExecuteProcess(...)`
5. `CefInitialize(...)`
6. instantiate + attach `CodeAIHubAppDelegate`
7. `CefRunMessageLoop()`
8. `CefShutdown()`

### 5.4 Existing launcher contracts preserved

- `LauncherApp::OnContextInitialized()` остаётся владельцем browser/window creation.
- `LauncherHandler::CloseAllBrowsers` и `LauncherHandler::ShowMainWindow` переиспользуются как canonical shutdown/reopen hooks.
- Manual app menu остаётся допустимым; full nib migration не требуется.

---

## 6. File Plan

### New files

- `packages/cef-launcher/src/platform/mac/codeai_hub_application_mac.h`
- `packages/cef-launcher/src/platform/mac/codeai_hub_application_mac.mm`

### Changed files

- `packages/cef-launcher/src/platform/mac/app_main_mac.mm`
- `packages/cef-launcher/CMakeLists.txt`
- `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/BugRegistry.md`

---

## 7. Verification Plan

Target verification for the implementation stream:

- `./scripts/build-cef-launcher.sh --force`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

Manual acceptance target for the produced release:

- открыть standalone Project Manager;
- закрыть окно / выполнить quit через menu;
- убедиться, что `CodeAIHubLauncher` не падает и не появляется macOS crash dialog;
- повторно открыть приложение и проверить, что dock/app reopen path работает.

---

## 8. Documentation Impact

После реализации нужно синхронизировать:

- `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/BugRegistry.md`

Planning-doc после закрытия scope должен уйти в `doc/SolidWorks-WorkFlow/Plans/Archive/`.
