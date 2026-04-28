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

### Shutdown-crash primary fix (1.2.52 — CanClose short-circuit)
- После того как обе exception-pipeline mitigations (1.2.50 `NSSetUncaughtExceptionHandler`, 1.2.51 `-[NSApplication reportException:]` swizzle) в user retest подтвердились как недостаточные, principled подход был пересмотрен: **не ловить** проблемный exception, а **не запускать** buggy Chromium callback вообще.
- `LauncherWindowDelegate::CanClose` в `packages/cef-launcher/src/launcher_app.cc` на macOS (`#if defined(__APPLE__)`) короткозамкнут: вместо `browser->GetHost()->TryCloseBrowser()` (который запускает buggy Chromium async teardown) вызывается cross-platform helper `codeai::launcher::RequestNativeApplicationTermination()` + `return false`. Helper declared в `packages/cef-launcher/src/launcher_handler.h`, implemented в `packages/cef-launcher/src/platform/mac/launcher_handler_mac.mm` через `[NSApp terminate:nil]`.
- Красная close кнопка теперь идёт по тому же pathway что Cmd+Q / Dock Quit: `-[NSApplication terminate:]` → `-[NSApplication stop:]` → clean message loop exit → `main()` returns → `CefShutdown()`. Buggy Chromium teardown callback, который шлёт несуществующий на macOS 26 selector, **не запускается**.
- Exception физически не кидается, `+[NSApplication _crashOnException:]` не вызывается — crash dialog не появляется. Не mitigation, а настоящий fix.
- Windows/Linux branch оставлен без изменений (`#else` → existing `TryCloseBrowser()` flow).
- 1.2.51 `reportException:` swizzle в `app_main_mac.mm` **retained** как belts-and-suspenders safety net на случай если в CEF views framework остался ещё один path, триггерящий тот же exception signature. Overhead нулевой, matching pattern очень узкий. Убирается вместе с eventual CEF upgrade.
- Proper root-cause fix — CEF/Chromium upgrade до версии с macOS 26 semantics — остаётся deferred (отдельный scope; urgency снижена поскольку короткозамыкание устраняет observable crash).

### Auxiliary popup lifecycle boundary (1.2.56 — detached diagram popup)
- `1.2.52` main-window short-circuit остаётся правильным только для главного standalone Project Manager window. Detachable auxiliary windows не должны наследовать whole-app shutdown semantics.
- `LauncherWindowDelegate` теперь получает browser-role flag при создании окна: main PM window создаётся с `is_popup_window = false`, popup browser windows из `OnPopupBrowserViewCreated(...)` — с `is_popup_window = true`.
- На macOS popup windows больше не маршрутизируются в `RequestNativeApplicationTermination()`: `CanClose(...)` разрешает локальное закрытие popup окна, не завершая всё приложение.
- Popup browsers также не читают и не пишут main-window autosave state: `PlatformShowWindow(...)` и `PlatformPersistWindowState(...)` в `launcher_handler_mac.mm` выполняют restore/tracking/persist только для non-popup browser.
- Это intentionally narrow split: launcher не растёт в generic multi-window manager, а просто перестаёт считать detached PM popup owner-window приложения.

### Native popup boundary (1.2.55 — translation engine selector)
- `1.2.52` fixes only the red-window-close teardown branch; it does **not** prove that every Chromium/AppKit popup path is safe on macOS 26.x.
- User retest on `1.2.54` showed a second trigger family: interacting with `Settings -> Localization -> UI Translation Engine` caused the same `NSApplication unrecognized selector` crash from the main thread (`BUG-2026-04-22-08`), but this time through Chromium's native HTML `<select>` popup path rather than browser teardown.
- Therefore the shared Settings UI must not use native `<select>` for translation-engine controls when it can run inside standalone CEF. `src/client/ui/src/components/settings/localization-translation-engine-selector.tsx` now owns a DOM-only button/listbox selector for both `UI Translation Engine` and `Reasoning Translation Engine`.
- This is intentionally a UI-layer trigger removal, not a launcher-bridge expansion: the launcher stays narrow and unchanged, while the product surface avoids entering the unsafe AppKit popup branch in the first place.

### Shutdown-crash mitigation (1.2.51 — reportException: swizzle) [superseded as primary, retained as safety net]
- **Crash trigger (подтверждено user retest 1.2.49):** детерминирован только при клике по красной NSWindow close кнопке (`LauncherWindowDelegate::CanClose` → `browser->GetHost()->TryCloseBrowser()` → Chromium async browser-teardown). НЕ воспроизводится при Cmd+Q / Dock Quit (`-[NSApplication stop:]` path обходит buggy Chromium teardown).
- **Root cause:** Chromium 141 (`141.0.10+chromium-141.0.7390.123` shipped inside CEF) отправляет AppKit-private selector, который больше не существует на macOS 26.3.1. Чистая Chromium ↔ macOS 26 incompat, proper root-cause fix требует CEF/Chromium upgrade (deferred).
- **Почему 1.2.50 NSSetUncaughtExceptionHandler не сработал (user retest):** AppKit на `-[NSApplication finishLaunching]` переустанавливает свой handler поверх нашего (ставили до `CefExecuteProcess`, до `finishLaunching`); плюс `+[NSApplication _crashOnException:]` — private Apple path который обходит стандартную uncaught-handler chain на macOS 26 regardless. Standard ObjC uncaught chain не тот уровень.
- **Mitigation 1.2.51 (active):** Objective-C method swizzle на `-[NSApplication reportException:]`. В `app_main_mac.mm` category `NSApplication (CodeAIHubReportExceptionSuppression)` + `+load`-method делает `method_exchangeImplementations(reportException:, codeai_reportException:)`. Objective-C runtime вызывает `+load` во время dyld image load — до `main()` и до любой AppKit/CEF инициализации. После exchange вызов AppKit'ом `-reportException:` dispatch'ится в наш `codeai_reportException:`, который отлавливает `NSInvalidArgumentException` с reason содержащим `unrecognized selector sent to instance` и `NSApplication`, логирует в stderr `CodeAIHubLauncher: suppressed NSApplication unrecognized selector via reportException: swizzle: ...` и возвращается без вызова `+[NSApplication _crashOnException:]`. Non-matching exceptions forward'ятся в original IMP через `[self codeai_reportException:exception]` (после swap этот selector указывает на original IMP — standard ObjC swizzle trampoline).
- **Mitigation НЕ меняет:** NSApplication class (plain, без `CefAppProtocol`), `-[NSApplication terminate:]` / `sendEvent:`, `NSApplicationDelegate`, `Info.plist`, main-window close flow, `LauncherHandler::DoClose`. Paste/Cmd+V/SuperWhisper/Cmd+C-X-A/Cmd+Q/Dock Quit/red close button/dock reopen поведение 1.2.49 полностью сохраняется.
- **Flow при срабатывании:** exception перехвачен до `_crashOnException:`; Chromium teardown продолжается (`OnBeforeClose` → `CefQuitMessageLoop()` → `main()` returns → `CefShutdown()`); процесс exits cleanly без crash dialog. Признак работы — stderr/Console log запись при red button close.
- **Пределы swizzle:** matching pattern специфичен для текущего Chromium 141 ↔ macOS 26 issue. Если Apple patch сменит internal path (exception уйдёт мимо `reportException:`) — swizzle перестанет покрывать, нужен будет CEF upgrade или другой attack vector.

## PM File Link Boundary
- Launcher bridge remains narrow, but it now includes one additional PM-specific command: dialog file-link handoff into Visual Studio Code.
- Standalone PM must not navigate Chromium directly to `vscode://file/...` because CEF treats that as an in-window URL load and surfaces `ERR_UNKNOWN_URL_SCHEME`.
- Instead, the PM dialog uses `codeai://open-in-vscode?...`; `OnBeforeBrowse` cancels Chromium navigation and the launcher host opens the generated `vscode://file/...` URI through the operating system.
- The launcher-side URI builder must preserve real filesystem separators (`/`) and Windows drive separators (`:`) inside `vscode://file/...`; already encoded spaces like `%20` stay encoded, but separators must not become `%2F` or `%3A`.
- The standalone launcher path is successful when Visual Studio Code receives the real target path and opens it after confirmation; the external-open prompt itself may still appear as a host-level safeguard.

## PM Supervisor Bridge Boundary
- Launcher bridge now exposes PM supervisor intents for both `ensureCoreRunning` and explicit `restartCore`.
- PM Settings `Restart Core` must not fallback to plain `ensure-started` when running inside standalone CEF host: the injected browser bridge routes restart requests to `codeai://core-restart`, `LauncherHandler::OnBeforeBrowse` cancels Chromium navigation, and the launcher host executes `RestartCoreProcess()` on the background thread.
- Browser-side standalone calls to `ensureCoreRunning` / `restartCore` are best-effort recovery intents. Failed bridge calls are logged by `src/client/ui/src/core-bridge/core-bridge-logger.ts` as sanitized diagnostics; they do not make Launcher a UI-state owner and do not expose raw provider payloads.
- `RestartCoreProcess()` is layered on top of the same shutdown/start primitives as the normal launcher lifecycle:
  - detect the active Core endpoint from current launcher environment;
  - if Core is reachable, request graceful `/shutdown`, fall back to force-kill when needed, and wait for port release;
  - then call `EnsureCoreProcessRunning()` to attach or start a fresh instance.
- This bridge is intentionally narrow: it exists only to preserve PM recovery UX inside standalone host and must not grow into a generic runtime console surface.

## Связанные документы
- UI bundles: `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
- System: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
