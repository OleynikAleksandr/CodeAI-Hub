# CEF macOS reportException: Swizzle Architecture

**Status:** Accepted
**Date:** 2026-04-22
**Owner:** Codex
**Scope:** `packages/cef-launcher/src/platform/mac/app_main_mac.mm`, release `1.2.51`
**Related history:** `CEF_MacOS_BootstrapHardening_Architecture.md` (1.2.46 archived), `CEF_MacOS_Input_And_Quit_Regression_Architecture.md` (1.2.48 archived), `CEF_MacOS_Bootstrap_Rollback_Architecture.md` (1.2.49 archived), `CEF_MacOS_Shutdown_Crash_Mitigation_Architecture.md` (1.2.50 archived — failed mitigation)

---

## 1. Problem

User retest на релизе `1.2.50` подтвердил что mitigation через `NSSetUncaughtExceptionHandler()` **не сработал** — crash на красной NSWindow close кнопке продолжается, "quit unexpectedly" dialog появляется как раньше. Путь через standard Objective-C uncaught-exception chain оказался не тем уровнем.

Crash report stack:
```
+[NSApplication _crashOnException:]         ← Apple-private, aborts directly
-[NSApplication reportException:]
NSApplicationUncaughtExceptionHandler
__handleUncaughtException
_objc_terminate()
std::__terminate(...)
```

`NSSetUncaughtExceptionHandler()` заменяет только тот handler, который вызывается из `__handleUncaughtException` через стандартную ObjC exception chain. Есть минимум две причины почему наш 1.2.50 handler не сработал:

1. **AppKit reinstall timing:** AppKit на `-[NSApplication finishLaunching]` устанавливает свой собственный `NSApplicationUncaughtExceptionHandler` через `NSSetUncaughtExceptionHandler()`. Наш handler был установлен в `main()` до `CefExecuteProcess`, то есть до `finishLaunching` — AppKit его перезаписал.
2. **Apple-private `+[NSApplication _crashOnException:]`:** независимо от того что зарегистрировано через `NSSetUncaughtExceptionHandler`, AppKit в `-[NSApplication reportException:]` всё равно вызывает `_crashOnException:` напрямую. Это обходит стандартную uncaught-handler chain на новых macOS (явно наблюдается в crash stack). Даже если наш handler остался установленным, это private path всё равно abort'ит процесс.

Следовательно `NSSetUncaughtExceptionHandler` — не тот уровень для macOS 26. Нужен уровень ниже: перехватить сам `-[NSApplication reportException:]` до того как он дойдёт до `_crashOnException:`.

## 2. Decision

Заменить 1.2.50 `NSSetUncaughtExceptionHandler`-подход на **Objective-C method swizzle** на `-[NSApplication reportException:]` через category с `+load`.

Swizzle через `method_exchangeImplementations`:
- `+load` вызывается Objective-C runtime во время dyld image load, **до** `main()` и **до** любой AppKit инициализации. Swizzle установлен до того как AppKit/Chromium что-либо делают.
- Exchange меняет IMP у оригинального `reportException:` и у нашего `codeai_reportException:`. После swap вызов AppKit'ом `-[NSApplication reportException:]` попадает в наш код; вызов `[self codeai_reportException:...]` из нашего кода попадает в оригинальный IMP (standard swizzle trampoline).
- Swizzle IMP не подвержен тому что AppKit делает с `NSSetUncaughtExceptionHandler` chain — это другой уровень.

Фильтр matching остаётся узким: `NSInvalidArgumentException` + reason содержит `unrecognized selector sent to instance` + reason содержит `NSApplication`. Matching → log в stderr, return без call original. Не-matching → forward в original IMP через `[self codeai_reportException:exception]`.

После перехвата AppKit не вызывает `+[NSApplication _crashOnException:]` (потому что наш код вернулся), Chromium teardown продолжается, `OnBeforeClose` → `CefQuitMessageLoop()` → `main()` returns → `CefShutdown()`, процесс exits cleanly.

### 2.1 Why category in `app_main_mac.mm`, not a separate file

Objective-C category в отдельном `.mm` файле может быть `dead-stripped` линкером если на неё нет explicit references (проблема классическая для ObjC categories в static libraries и иногда в executable targets). Решения — добавлять `-ObjC` / `-all_load` linker flags, или explicit reference из другого TU. Проще и надёжнее положить category прямо в `app_main_mac.mm` (тот же translation unit где `main()`) — binary гарантированно линкует этот файл, `+load` гарантированно срабатывает.

### 2.2 Remove dead 1.2.50 code

1.2.50 `NSUncaughtExceptionHandler` код удаляется полностью:
- `g_previous_uncaught_handler`
- `CodeAIHubUncaughtExceptionHandler()`
- `InstallCodeAIHubUncaughtExceptionHandler()`
- Его вызов из `main()`

Один commit = atomic swap (old handler out, swizzle in). Не оставляем dead code — confusing и может триггерить knip/lint warnings.

## 3. Non-Goals

- Не upgrade-им CEF/Chromium в этом scope (proper root-cause fix остаётся отдельным cycle).
- Не меняем NSApplication class (остаётся plain, никакого `CefAppProtocol` shell).
- Не override-им `sendEvent:` / `terminate:`, не добавляем NSApplicationDelegate.
- Не меняем `Info.plist`.
- Не меняем window-close flow (`LauncherWindowDelegate::CanClose`, `LauncherHandler::DoClose/OnBeforeClose`).
- Не добавляем новые source files или CMake entries — всё в существующий `app_main_mac.mm`.

## 4. File Plan

Меняемые:
- `packages/cef-launcher/src/platform/mac/app_main_mac.mm` — удалить 1.2.50 `NSSetUncaughtExceptionHandler` код; добавить category `NSApplication (CodeAIHubReportExceptionSuppression)` с `+load`-swizzle; удалить вызов `InstallCodeAIHubUncaughtExceptionHandler()` из `main()`.
- `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md` — обновить subsection "Shutdown-crash mitigation": 1.2.50 подход не сработал, 1.2.51 заменил на reportException swizzle.
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` §3 Invariant 32 — обновить mitigation note.
- `doc/BugRegistry.md` — `BUG-2026-04-22-01` обновить current resolution block: 1.2.50 failed, 1.2.51 swizzle attempt.
- `README.md`, `CHANGELOG.md` — версия 1.2.51.

Новых файлов нет.

## 5. Verification Plan

Automated (Husky hooks): architecture / lint / knip / format / dup / links.

Targeted build: `./scripts/build-all.sh --version 1.2.51`, `./scripts/build-release.sh --use-current-version`.

Manual acceptance matrix (user retest на установленном `codeai-hub-1.2.51.vsix`):
- **Без регрессий 1.2.49/1.2.50:** Cmd+V paste, SuperWhisper, Cmd+C/X/A, меню Edit, Cmd+Q, Dock Quit, dock reopen — всё работает как в 1.2.49.
- **Main criterion:** клик по красной NSWindow close кнопке **больше не** показывает "quit unexpectedly" dialog. Launcher закрывается clean.
- **Признак срабатывания swizzle:** в stderr / Console log присутствует запись `CodeAIHubLauncher: suppressed NSApplication unrecognized selector via reportException: swizzle: ...` когда exception реально прилетает.
- **Если crash всё ещё есть:** сохранить crash report. Это сигнал escalate в CEF upgrade или Variant 4 (короткозамыкание window-close flow) в отдельном cycle.

## 6. Risk & Trade-offs

- **Swizzle scope narrow, но не нулевой**: если в будущем Apple/Chromium начнут кидать ДРУГИЕ matching exceptions (`NSInvalidArgumentException` с reason содержащим `NSApplication` + `unrecognized selector`), они тоже будут swallowed. Это edge case — matching pattern очень специфичен для текущего Chromium 141 ↔ macOS 26 issue. Логирование в stderr позволит диагностировать если что-то неожиданное начнёт срабатывать.
- **Swizzle не помогает если crash уходит через другой path** (не `reportException:`). Анализ crash stack 1.2.49 показывает что `reportException:` — именно тот frame где exception превращается в process abort. Но если на каком-то macOS patch Apple сменит internal path — swizzle перестанет работать и нужен будет CEF upgrade.
- **Proper root-cause fix** остаётся deferred — CEF upgrade до Chromium 142+/143+.

## 7. SSOT Impact

После реализации:
- `SystemArchitecture.md` §3 Invariant 32 — 1.2.50 mitigation подход отмечен как failed, 1.2.51 использует reportException swizzle; pending CEF upgrade note сохраняется.
- `Launcher_CEF.md` "Shutdown-crash mitigation" subsection обновлён под 1.2.51 swizzle.
- `BugRegistry.md` `BUG-2026-04-22-01` получает новую timeline entry: 1.2.50 failed mitigation → 1.2.51 swizzle attempt. Status: `MITIGATED` (pending user confirmation), ROOT cause deferred.

Planning-doc после закрытия cycle уходит в `doc/SolidWorks-WorkFlow/Plans/Archive/`.
