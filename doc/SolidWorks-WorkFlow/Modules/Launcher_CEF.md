# CEF Launcher — Module (SSOT)

## Назначение
Локальный CEF-клиент, который открывает Project Manager UI bundle.

## Где живёт код
- Launcher package: `packages/cef-launcher/`
- Build scripts: `scripts/build-cef-launcher.sh`

## Артефакты
- Устанавливается в `~/.codeai-hub/cef-launcher/<version>/`.

## macOS Bootstrap Lifecycle Boundary
- macOS browser-process bootstrap больше не опирается на "голый" `NSApplication`.
- `packages/cef-launcher/src/platform/mac/codeai_hub_application_mac.{h,mm}` владеют custom `CodeAIHubApplication : NSApplication <CefAppProtocol>` и `CodeAIHubAppDelegate`.
- `CodeAIHubApplication` обязан оборачивать `sendEvent:` в `CefScopedSendingEvent` и override-ить `terminate:` так, чтобы quit path не уходил в прямой Cocoa `exit()`-style termination.
- `CodeAIHubAppDelegate` обязан переводить quit path в `LauncherHandler::CloseAllBrowsers(false)` и reuse-ить `LauncherHandler::ShowMainWindow()` для dock reopen.
- `packages/cef-launcher/src/platform/mac/app_main_mac.mm` остаётся тонким entrypoint: `sharedApplication` -> `CefExecuteProcess` -> `CefInitialize` -> attach delegate -> `CefRunMessageLoop` -> `CefShutdown`.
- Ручное меню приложения остаётся допустимым; nib/storyboard migration не требуется, пока lifecycle contract выше соблюдён.

## PM File Link Boundary
- Launcher bridge remains narrow, but it now includes one additional PM-specific command: dialog file-link handoff into Visual Studio Code.
- Standalone PM must not navigate Chromium directly to `vscode://file/...` because CEF treats that as an in-window URL load and surfaces `ERR_UNKNOWN_URL_SCHEME`.
- Instead, the PM dialog uses `codeai://open-in-vscode?...`; `OnBeforeBrowse` cancels Chromium navigation and the launcher host opens the generated `vscode://file/...` URI through the operating system.
- The launcher-side URI builder must preserve real filesystem separators (`/`) and Windows drive separators (`:`) inside `vscode://file/...`; already encoded spaces like `%20` stay encoded, but separators must not become `%2F` or `%3A`.
- The standalone launcher path is successful when Visual Studio Code receives the real target path and opens it after confirmation; the external-open prompt itself may still appear as a host-level safeguard.

## Связанные документы
- UI bundles: `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
- System: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
