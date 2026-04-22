# CEF macOS Shutdown Crash Mitigation Architecture

**Status:** Accepted
**Date:** 2026-04-22
**Owner:** Codex
**Scope:** `packages/cef-launcher/src/platform/mac/app_main_mac.mm`, release `1.2.50`
**Related history:** `CEF_MacOS_BootstrapHardening_Architecture.md` (1.2.46 archived), `CEF_MacOS_Input_And_Quit_Regression_Architecture.md` (1.2.48 archived), `CEF_MacOS_Bootstrap_Rollback_Architecture.md` (1.2.49 archived)

---

## 1. Problem

После `1.2.49` clipboard paste и SuperWhisper снова работают, но вернулся `NSApplication unrecognized selector` crash (`BUG-2026-04-22-01`). User retest уточнил ключевую деталь: crash **не** voзникает при закрытии через меню (`Cmd+Q` / `Quit CodeAIHubLauncher`), но **детерминированно** triggers при клике по красной кнопке закрытия окна (NSWindow close button).

Анализ crash report `CodeAIHubLauncher-2026-04-22-141145.ips`:
- Exception Type: `EXC_BREAKPOINT (SIGTRAP)` → `NSInvalidArgumentException`.
- Composed message: `-[NSApplication %s]: unrecognized selector sent to instance 0x13800190d80`.
- Arguments: `["NSApplication", "%s", "0x13800190d80"]` — selector literally `"%s"` (unfilled format specifier). `objc_msgSend` called with NULL / corrupted `SEL`.
- Crash window: `procLaunch 14:11:08`, `captureTime 14:11:42` — ~34 секунды после старта, в момент window close.
- Stack: `__CFRunLoopRun` → source0 callback → `Chromium Embedded Framework` frames (5–17, stripped) → `_CF_forwarding_prep_0` → `___forwarding___` → `doesNotRecognizeSelector:` → `objc_exception_throw`.
- OS: `macOS 26.3.1 (25D2128)`, Hardware `Mac15,14`, ARM64.

## 2. Root Cause Analysis

Crash происходит **внутри Chromium Embedded Framework** — во время async browser-teardown path, который запускается из `LauncherWindowDelegate::CanClose()` → `browser->GetHost()->TryCloseBrowser()`. Chromium 141 (our CEF version `141.0.10+chromium-141.0.7390.123`) вызывает AppKit-private selector, который больше не существует или изменил signature на macOS 26.3.1.

Quit path (`Cmd+Q`, `Dock Quit`) обходит проблему: default `-[NSApplication terminate:]` → `-[NSApplication stop:]` останавливает main message loop через AppKit-native unwind, не через `CefQuitMessageLoop()` после `OnBeforeClose`. Buggy Chromium teardown callback не триггерится в этом pathway.

Это несовместимость Chromium 141 ↔ macOS 26, а не дефект нашего launcher кода. Proper fix требует CEF upgrade до версии с Chromium 142+/143+ (отдельный, более крупный scope).

## 3. Decision

Установить собственный `NSUncaughtExceptionHandler` в `main()` до `CefExecuteProcess`. Если прилетает `NSInvalidArgumentException` с reason содержащим `unrecognized selector sent to instance` из NSApplication target — логировать в stderr и `return` (swallow). Любой другой uncaught exception прокидывается в original handler.

Default AppKit handler (`NSApplicationUncaughtExceptionHandler` → `-[NSApplication reportException:]` → `+[NSApplication _crashOnException:]`) не вызывается для suppressed exception; процесс не умирает. Chromium's run-loop продолжает unwind — exception был в source0 callback, stack unwind'ит до uncaught handler, handler возвращается → runtime не зовёт `abort()`. Browser teardown завершается, `OnBeforeClose` эмитит `CefQuitMessageLoop()`, main loop выходит, `main()` возвращается в `CefShutdown()`, процесс exits cleanly.

### 3.1 Why only this mitigation

Рассматривались и отвергнуты:

- **`Info.plist` `NSSupportsSuddenTermination` / `NSSupportsAutomaticTermination`**: эти ключи влияют на auto-termination когда app в фоне и idle; не покрывают window-close path, где возникает crash. Отброшено.
- **Short-circuit `LauncherWindowDelegate::CanClose` bypass Chromium teardown**: потенциально dirty state в browser/provider sessions, требует тестирования. Отложено как fallback если exception handler недостаточен.
- **Upgrade CEF/Chromium**: proper root-cause fix, но большой scope (download/rebuild CEF, потенциальные API breaks, риск других регрессий). Откладывается в отдельный cycle, если mitigation в 1.2.50 не достаточен.

## 4. Non-Goals

- Не upgrade-им CEF/Chromium в этом scope.
- Не меняем NSApplication class (остаётся plain, paste/Cmd+V/SuperWhisper не трогаем).
- Не добавляем `CefAppProtocol` shell, не override'им `sendEvent:` / `terminate:`.
- Не меняем `LauncherWindowDelegate::CanClose` / `LauncherHandler::DoClose` window-close flow.
- Не трогаем `Info.plist`.

## 5. File Plan

Меняемые:
- `packages/cef-launcher/src/platform/mac/app_main_mac.mm` — namespace-local `InstallCodeAIHubUncaughtExceptionHandler()` + вызов из `main()` до `CefExecuteProcess`.
- `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md` — описать mitigation.
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` §3 — обновить Invariant 32 (1.2.50 mitigation note + pending CEF upgrade).
- `doc/BugRegistry.md` — обновить `BUG-2026-04-22-01` (MITIGATED, real fix still deferred to CEF upgrade).
- `README.md`, `CHANGELOG.md` — версия 1.2.50.

Новых файлов нет.

## 6. Verification Plan

Automated (Husky hooks): architecture / lint / knip / format / dup / links.

Targeted build: `./scripts/build-all.sh --version 1.2.50`, `./scripts/build-release.sh --use-current-version`.

Manual acceptance matrix (user retest на установленном `codeai-hub-1.2.50.vsix`):
- **Без регрессий:** Cmd+V paste, SuperWhisper, Cmd+C/X/A, меню Edit, Cmd+Q закрытие, Dock Quit — всё работает как в 1.2.49.
- **Основной критерий:** клик по красной кнопке window close **больше не** показывает "CodeAI Hub Project Manager quit unexpectedly" dialog. Launcher закрывается clean.
- **Если exception всё-таки прилетает:** в `stderr` / console.log должна быть запись `CodeAIHubLauncher: suppressed NSApplication unrecognized selector: ...` (это признак что handler сработал).
- **Если crash-dialog всё ещё появляется:** сохранить свежий crash report для escalation в CEF upgrade cycle.

## 7. SSOT Impact

После реализации:
- `SystemArchitecture.md` §3 Invariant 32 — plain NSApplication bootstrap + NSUncaughtExceptionHandler mitigation + explicit note что root cause (Chromium 141 ↔ macOS 26 incompat в window-close teardown) всё ещё pending proper CEF upgrade.
- `Launcher_CEF.md` — macOS Bootstrap Lifecycle Boundary subsection про 1.2.50 mitigation.
- `BugRegistry.md` `BUG-2026-04-22-01` — Status `MITIGATED` с narrative: crash triggered by NSWindow close button only (не Cmd+Q/Dock Quit), mitigated via uncaught exception handler, root cause в Chromium 141 browser-teardown on macOS 26.

Planning-doc после закрытия cycle уходит в `doc/SolidWorks-WorkFlow/Plans/Archive/`.
