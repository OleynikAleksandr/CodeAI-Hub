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
- `CodeAIHubApplication` обязан оборачивать `sendEvent:` в `CefScopedSendingEvent`. Override `-[NSApplication terminate:]` **запрещён**: quit path обязан идти стандартным AppKit маршрутом `terminate:` → `-applicationShouldTerminate:`, иначе non-force browser close может зависнуть и следующий Quit молча проглатывается (regression 1.2.46, fixed 1.2.48).
- `CodeAIHubAppDelegate -applicationShouldTerminate:` force-close-ит browsers через `LauncherHandler::CloseAllBrowsers(true)` и возвращает `NSTerminateCancel`, когда active browsers есть. `LauncherHandler::OnBeforeClose` драйвит `CefQuitMessageLoop()` после того как последний browser закрылся; `main()` возвращается из `CefRunMessageLoop()` → `CefShutdown()`. Если browsers уже нет, delegate сразу возвращает `NSTerminateNow`.
- `CodeAIHubAppDelegate` владеет `applicationShouldHandleReopen:` для dock reopen (`LauncherHandler::ShowMainWindow()`) и `applicationSupportsSecureRestorableState:` = YES.
- `packages/cef-launcher/src/platform/mac/app_main_mac.mm` остаётся тонким entrypoint: `sharedApplication` -> `CefExecuteProcess` -> `CefInitialize` -> attach delegate -> `CefRunMessageLoop` -> `CefShutdown`.
- Application menu разрешён, но только с `Quit %@`. Cut/Copy/Paste/SelectAll menu items **запрещены**: с `target:nil` они заставляют AppKit hijack-ить Cmd+X/C/V/A через `NSMenu performKeyEquivalent:`, а CEF web view не отвечает на `cut:`/`copy:`/`paste:`/`selectAll:` selectors — key event "съедается" меню и не доходит до Chromium как NSKeyDown (regression 1.2.46, fixed 1.2.48). Chromium внутри CEF обрабатывает clipboard shortcuts на уровне render process.

## PM File Link Boundary
- Launcher bridge remains narrow, but it now includes one additional PM-specific command: dialog file-link handoff into Visual Studio Code.
- Standalone PM must not navigate Chromium directly to `vscode://file/...` because CEF treats that as an in-window URL load and surfaces `ERR_UNKNOWN_URL_SCHEME`.
- Instead, the PM dialog uses `codeai://open-in-vscode?...`; `OnBeforeBrowse` cancels Chromium navigation and the launcher host opens the generated `vscode://file/...` URI through the operating system.
- The launcher-side URI builder must preserve real filesystem separators (`/`) and Windows drive separators (`:`) inside `vscode://file/...`; already encoded spaces like `%20` stay encoded, but separators must not become `%2F` or `%3A`.
- The standalone launcher path is successful when Visual Studio Code receives the real target path and opens it after confirmation; the external-open prompt itself may still appear as a host-level safeguard.

## Связанные документы
- UI bundles: `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
- System: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
