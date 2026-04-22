# CEF macOS CanClose Short-Circuit Architecture

**Status:** Accepted
**Date:** 2026-04-22
**Owner:** Codex
**Scope:** `packages/cef-launcher/src/launcher_app.cc`, `packages/cef-launcher/src/launcher_handler.h`, `packages/cef-launcher/src/platform/mac/launcher_handler_mac.mm`, release `1.2.52`
**Related history:** 1.2.46/1.2.48/1.2.49 bootstrap cycle, 1.2.50 NSSetUncaughtExceptionHandler attempt (failed), 1.2.51 reportException: swizzle (failed)

---

## 1. Problem

Три последовательные попытки перехватить `NSApplication unrecognized selector` crash на красной NSWindow close кнопке не сработали:

- **1.2.50** `NSSetUncaughtExceptionHandler()` до `CefExecuteProcess` — AppKit переустановил свой handler на `finishLaunching` + `+[NSApplication _crashOnException:]` обходит стандартную uncaught chain на macOS 26.
- **1.2.51** Objective-C method swizzle на `-[NSApplication reportException:]` через `+load` category — user retest подтвердил что crash dialog всё равно появляется. Либо AppKit вызывает `_crashOnException:` напрямую, минуя `reportException:`; либо exception пропагируется через другой Apple-private path на macOS 26.

Все три attempt'а атаковали exception pipeline на разных уровнях. Проблема в том, что **сам** Chromium 141 teardown callback на macOS 26 несовместим с AppKit — его нужно **не запускать вообще**, а не ловить его падение.

User-confirmed fact: crash детерминирован только на красной close кнопке. Cmd+Q / Dock Quit / app-menu Quit работают чисто — потому что они идут через `-[NSApplication stop:]`, который обходит buggy Chromium teardown callback.

## 2. Decision

**Короткозамкнуть window-close flow**: при клике на красную кнопку не вызывать `browser->GetHost()->TryCloseBrowser()` (который запускает buggy Chromium async teardown), а напрямую перенаправить flow в `-[NSApplication terminate:]` — тот же путь, что у Cmd+Q. AppKit затем идёт через `-stop:`, message loop выходит чисто, `main()` возвращается, `CefShutdown()` выполняется нормально.

Это настоящий fix, а не mitigation: exception **физически не кидается**, потому что проблемный Chromium callback не запускается.

### 2.1 Implementation

В `packages/cef-launcher/src/launcher_handler.h` добавить cross-platform declaration в existing `codeai::launcher` namespace:

```cpp
namespace codeai::launcher {
void RequestNativeApplicationTermination();
}  // namespace codeai::launcher
```

В `packages/cef-launcher/src/platform/mac/launcher_handler_mac.mm` добавить mac implementation:

```objc
namespace codeai::launcher {
void RequestNativeApplicationTermination() {
  [NSApp terminate:nil];
}
}  // namespace codeai::launcher
```

В `packages/cef-launcher/src/launcher_app.cc` поправить `LauncherWindowDelegate::CanClose`:

```cpp
bool CanClose(CefRefPtr<CefWindow> window) override {
#if defined(__APPLE__)
  codeai::launcher::RequestNativeApplicationTermination();
  return false;
#else
  CefRefPtr<CefBrowser> browser = browser_view_->GetBrowser();
  if (browser)
    return browser->GetHost()->TryCloseBrowser();
  return true;
#endif
}
```

`return false` гарантирует что стандартный `CefWindow`/`NSWindow` close path не завершится — `[NSApp terminate:]` берёт управление и запускает orderly application termination.

### 2.2 Swizzle retention

`-[NSApplication reportException:]` swizzle из 1.2.51 **оставляем** как belts-and-suspenders safety net. Если где-то ещё в CEF views framework остался path, который может бросить тот же exception (например future CEF update), swizzle его подхватит. Код cheap, overhead нулевой, matching pattern очень узкий.

## 3. Non-Goals

- Не upgrade-им CEF/Chromium в этом scope (остаётся deferred proper fix).
- Не меняем Cmd+Q / Dock Quit behavior (они уже работают).
- Не трогаем NSApplication class, `sendEvent:`, NSApplicationDelegate, Info.plist.
- Не меняем `LauncherHandler::DoClose` / `OnBeforeClose` / `CloseAllBrowsers` — teardown через `-[NSApp terminate:]` использует стандартный AppKit → CEF path вместо buggy Chromium callback.
- Не трогаем Win/Linux behavior (под `#if defined(__APPLE__)` branch).

## 4. File Plan

Меняемые:
- `packages/cef-launcher/src/launcher_handler.h` — добавить declaration `codeai::launcher::RequestNativeApplicationTermination()`.
- `packages/cef-launcher/src/platform/mac/launcher_handler_mac.mm` — implementation через `[NSApp terminate:nil]`.
- `packages/cef-launcher/src/launcher_app.cc` — `LauncherWindowDelegate::CanClose` с `#if __APPLE__` branch.
- `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md` — обновить "Shutdown-crash mitigation" subsection.
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` §3 Invariant 32 — дополнить 1.2.52 short-circuit.
- `doc/BugRegistry.md` `BUG-2026-04-22-01` — обновить current resolution.
- `README.md`, `CHANGELOG.md` — версия 1.2.52.

Новых файлов нет.

## 5. Verification Plan

Automated (Husky hooks): architecture / lint / knip / format / dup / links.

Targeted build: `./scripts/build-all.sh --version 1.2.52`, `./scripts/build-release.sh --use-current-version`.

Manual acceptance matrix (user retest):
- **Main criterion:** клик по красной NSWindow close кнопке **больше не** показывает crash dialog. Launcher закрывается clean, так же как по Cmd+Q.
- **Без регрессий:** Cmd+V paste, SuperWhisper, Cmd+C/X/A, меню Edit, Cmd+Q, Dock Quit, dock reopen — всё работает как в 1.2.49-1.2.51.
- **Если всё ещё есть crash dialog:** signals что баг глубже (CEF views framework ещё где-то зовёт TryCloseBrowser на window close events). Тогда нужен CEF upgrade — отдельный cycle.

## 6. Risk

- `-[NSApp terminate:]` запускает app-wide termination. Если в future появится multi-window scenario, close одного окна будет закрывать весь app. Сейчас Project Manager single-window, это acceptable.
- `TryCloseBrowser()` обычно нужен для `beforeunload` dialog (web app confirms unsaved changes). В PM нет `beforeunload` — terminate: его проигнорировал бы и сейчас. Если когда-то понадобится — handle будем тогда.
- Swizzle остаётся как safety net, поэтому если короткозамыкание пропустит какой-то edge case — swizzle всё равно не даст crash dialog появиться (хотя 1.2.51 retest показал что swizzle alone не хватает, combo должно быть надёжнее).

## 7. SSOT Impact

- `SystemArchitecture.md` §3 Invariant 32 — 1.2.52 short-circuit через `CanClose` + `[NSApp terminate:]` документирован как primary fix; swizzle 1.2.51 остаётся как secondary safety net. Proper root-cause fix (CEF upgrade) всё ещё deferred.
- `Launcher_CEF.md` — "Shutdown-crash mitigation" subsection дополнить 1.2.52 short-circuit.
- `BugRegistry.md` `BUG-2026-04-22-01` — current resolution block обновить: short-circuit CanClose как primary fix + swizzle belt-and-suspenders. Status FIXED (pending user confirmation).

Planning-doc после закрытия cycle уходит в `doc/SolidWorks-WorkFlow/Plans/Archive/`.
