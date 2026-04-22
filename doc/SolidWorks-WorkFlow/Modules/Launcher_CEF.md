# CEF Launcher — Module (SSOT)

## Назначение
Локальный CEF-клиент, который открывает Project Manager UI bundle.

## Где живёт код
- Launcher package: `packages/cef-launcher/`
- Build scripts: `scripts/build-cef-launcher.sh`

## Артефакты
- Устанавливается в `~/.codeai-hub/cef-launcher/<version>/`.

## macOS Bootstrap Lifecycle Boundary
- Standalone mac launcher использует обычный `NSApplication` bootstrap: `[NSApplication sharedApplication]` + inline `CreateApplicationMenu` + `CefExecuteProcess` → `CefInitialize` → `CreateApplicationMenu` → `CefRunMessageLoop` → `CefShutdown`. Custom `NSApplication <CefAppProtocol>` shell в `packages/cef-launcher/src/platform/mac/` не используется.
- Попытка ввести custom shell (`CodeAIHubApplication <CefAppProtocol>` + `CodeAIHubAppDelegate`) в релизе 1.2.46 ломала clipboard shortcuts в PM (Cmd+V / SuperWhisper не доходили до Chromium как NSKeyDown) и была отозвана целиком в 1.2.49. Narrow fix в 1.2.48 (удаление Edit menu + стандартный `terminate:`) не попал в корень.
- Редкий `NSApplication unrecognized selector` crash остаётся deferred known issue (`BUG-2026-04-22-01`). Новая попытка shutdown-hardening обязана до merge прогнать полный acceptance matrix clipboard + quit + reopen (см. `SystemArchitecture.md` Invariant 32) и не может опираться на CefAppProtocol subclass без подтверждения что Cmd+V продолжает работать.

### Shutdown-crash mitigation (1.2.50)
- User retest 1.2.49 уточнил trigger: crash детерминирован только при закрытии через красную NSWindow close кнопку (`LauncherWindowDelegate::CanClose` → `browser->GetHost()->TryCloseBrowser()` → Chromium async browser-teardown), **не** воспроизводится при Cmd+Q / Dock Quit (которые идут через `-[NSApplication stop:]` и обходят buggy Chromium teardown path). Root cause — Chromium 141 (shipped inside `141.0.10+chromium-141.0.7390.123` CEF) отправляет AppKit-private selector который больше не существует на macOS 26.3.1; proper fix требует CEF/Chromium upgrade и остаётся deferred.
- Mitigation: `InstallCodeAIHubUncaughtExceptionHandler()` вызывается в `main()` сразу после `CefScopedLibraryLoader::LoadInMain()` и до `CefExecuteProcess`. Handler перехватывает `NSInvalidArgumentException` где `reason` содержит `unrecognized selector sent to instance` и `NSApplication`, логирует в stderr `CodeAIHubLauncher: suppressed NSApplication unrecognized selector: ...` и возвращается без propagation. Любое другое uncaught exception forward'ится в previous handler (captured via `NSGetUncaughtExceptionHandler()`).
- Mitigation **не** меняет: NSApplication class (plain, без `CefAppProtocol`), `-[NSApplication terminate:]` / `sendEvent:`, `NSApplicationDelegate`, `Info.plist`, window-close flow, `LauncherWindowDelegate::CanClose`, `LauncherHandler::DoClose`. Paste/Cmd+V/SuperWhisper/Cmd+Q/Dock Quit/red close button/dock reopen поведение 1.2.49 полностью сохраняется.
- Flow при срабатывании: exception перехвачен до AppKit default handler (`+[NSApplication _crashOnException:]`), Chromium teardown завершается (`OnBeforeClose` → `CefQuitMessageLoop()` → `main()` returns → `CefShutdown()`), процесс exits cleanly без crash dialog. Признак работы — `stderr`/Console log запись при red button close.

## PM File Link Boundary
- Launcher bridge remains narrow, but it now includes one additional PM-specific command: dialog file-link handoff into Visual Studio Code.
- Standalone PM must not navigate Chromium directly to `vscode://file/...` because CEF treats that as an in-window URL load and surfaces `ERR_UNKNOWN_URL_SCHEME`.
- Instead, the PM dialog uses `codeai://open-in-vscode?...`; `OnBeforeBrowse` cancels Chromium navigation and the launcher host opens the generated `vscode://file/...` URI through the operating system.
- The launcher-side URI builder must preserve real filesystem separators (`/`) and Windows drive separators (`:`) inside `vscode://file/...`; already encoded spaces like `%20` stay encoded, but separators must not become `%2F` or `%3A`.
- The standalone launcher path is successful when Visual Studio Code receives the real target path and opens it after confirmation; the external-open prompt itself may still appear as a host-level safeguard.

## Связанные документы
- UI bundles: `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
- System: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
