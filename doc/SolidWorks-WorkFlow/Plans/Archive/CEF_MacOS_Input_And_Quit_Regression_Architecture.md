# CEF macOS Input + Quit Regression Architecture

**Status:** Accepted
**Date:** 2026-04-22
**Owner:** Codex
**Scope:** `packages/cef-launcher/src/platform/mac/*`, release `1.2.48`
**Parent cycle:** follow-up к 1.2.46 CEF bootstrap hardening (`doc/SolidWorks-WorkFlow/Plans/Archive/CEF_MacOS_BootstrapHardening_Architecture.md`)

---

## 1. Problem

После релиза `1.2.46` на standalone Project Manager (CEF Launcher) на macOS регрессировали три стандартных поведения AppKit:

- **Cmd+V / paste** в input поле PM не работает; buffer не вставляется.
- **SuperWhisper** не работает — синтетический Cmd+V через CGEvent не доходит до Chromium.
- **Dock right-click → Quit** не закрывает launcher при первом клике; повторные клики игнорируются. Cmd+Q из собственного app-menu ведёт себя так же.

Регрессия введена в коммитах `de7c5ad37` и `b6b0cf3d1` (Session084). До них — работало. Info.plist не менялся.

---

## 2. Root Cause

В 1.2.46 мы заменили обычный `NSApplication` на `CodeAIHubApplication : NSApplication <CefAppProtocol>` и параллельно:

1. Перехватили `-[NSApplication terminate:]` и перенаправили в delegate `tryToTerminateApplication:` → `handler->CloseAllBrowsers(false)` (non-force). Стандартный macOS quit-path через `applicationShouldTerminate:` обойдён.
2. Оставили Edit menu (Cut/Copy/Paste/SelectAll) с `target:nil` из 1.1.121, унаследованный от обычного NSApplication сценария, где CEF runtime-swizzlил `-[NSApplication sendEvent:]` и обходил `performKeyEquivalent:`.

Следствия:

- **Paste/SuperWhisper:** наш `[super sendEvent:event]` прогоняет Cmd+V через `[[NSApp mainMenu] performKeyEquivalent:]`. Menu Edit → Paste с `target:nil` идёт по responder chain (CEF view → NSWindow → NSApp → delegate); никто не отвечает на `paste:` селектор, event "съедается" и не доходит до Chromium как NSKeyDown. Раньше CEF-swizzled `sendEvent:` обходил эту точку.
- **Dock Quit / Cmd+Q:** `handler->CloseAllBrowsers(false)` non-force полагается на `LauncherWindowDelegate::CanClose` → `browser->GetHost()->TryCloseBrowser()`. Если `TryCloseBrowser()` возвращает false (любой in-flight close check), quit молча зависает; при повторном Quit `handler->IsClosing() == true` → метод возвращается без `CefQuitMessageLoop()`.

---

## 3. Target Design

Оставить shutdown-crash fix из 1.2.46 (custom `NSApplication <CefAppProtocol>` + `CefScopedSendingEvent` в `sendEvent:`), вернуть совместимость с AppKit-дефолтами.

### 3.1 Remove `terminate:` override

`CodeAIHubApplication` больше не переопределяет `-[NSApplication terminate:]`. Quit идёт стандартным путём:

```
Dock Quit / Cmd+Q / menu Quit
  → -[NSApplication terminate:]  (default AppKit)
  → -[delegate applicationShouldTerminate:]
      → LauncherHandler::CloseAllBrowsers(true)   // force
      → return NSTerminateCancel; // wait for browsers to close
  → -[LauncherHandler::OnBeforeClose] last browser → CefQuitMessageLoop()
  → main() returns → CefShutdown()
```

Это канонический CEF-flow: browser закрывается в ответ на `applicationShouldTerminate:`, а не вместо `terminate:`. `NSTerminateCancel` + последующий `CefQuitMessageLoop()` после того как все browsers закрыты — стандартный async-pattern из cefsimple.

### 3.2 Remove Edit menu

`CreateApplicationMenu` больше не добавляет Cut/Copy/Paste/SelectAll. Chromium внутри CEF обрабатывает Cmd+X/C/V/A сам на уровне render process. Меню Edit в 1.1.121–1.2.45 было косметическим артефактом — работало только потому что CEF-swizzled `sendEvent:` его обходил.

### 3.3 Application menu surface

Остаётся один пункт `Quit %@` с Cmd+Q → `@selector(terminate:)`. Standard AppKit path доведёт до delegate.

---

## 4. Non-Goals

- Не меняем UI bundle, Core, PM websocket/runtime логику.
- Не трогаем win/linux bootstrap.
- Не откатываем custom `NSApplication <CefAppProtocol>` shell из 1.2.46 (он нужен для shutdown crash fix).
- Не добавляем NSStatusItem / tray icon.

---

## 5. File Plan

Changed files:

- `packages/cef-launcher/src/platform/mac/codeai_hub_application_mac.h` — убрать декларацию `tryToTerminateApplication:` (теперь не нужна).
- `packages/cef-launcher/src/platform/mac/codeai_hub_application_mac.mm`:
  - убрать override `-[CodeAIHubApplication terminate:]`;
  - убрать Edit menu из `CreateApplicationMenu`;
  - убрать метод `tryToTerminateApplication:`;
  - заменить `applicationShouldTerminate:` на реализацию с `CloseAllBrowsers(true)` + `NSTerminateCancel` (или `NSTerminateNow` если нет активных browsers).
- `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md` — обновить shutdown contract, удалить упоминание Edit menu и `tryToTerminateApplication:`.
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` §3 — добавить invariant 1.2.48 про стандартный terminate-path и отсутствие Edit menu.
- `doc/BugRegistry.md` — запись `BUG-2026-04-22-XX` (paste/SuperWhisper/Quit).
- `README.md`, `CHANGELOG.md` — версия 1.2.48.

Новых файлов не создаём.

---

## 6. Verification Plan

Automated (pre-commit/pre-push Husky hooks):

- `./scripts/check-architecture.sh`
- `npm run lint`
- `npm run check:knip`
- `npm run format:fix`
- `npm run check:dup`
- `npm run check:links`

Targeted build:

- `./scripts/build-cef-launcher.sh --force --launcher-version 1.2.48`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

Manual acceptance matrix (обязательно перед закрытием cycle):

- Cmd+V в input поле PM вставляет текст из системного буфера.
- SuperWhisper диктовка → транскрипт попадает в input поле PM.
- Cmd+C / Cmd+X / Cmd+A внутри PM работают (функции Chromium).
- Dock right-click → Quit закрывает launcher с первого клика.
- Cmd+Q из собственного app-menu закрывает launcher.
- Закрытие окна красным крестом не крашит процесс (regression guard из 1.2.46).
- Dock reopen работает (regression guard из 1.2.46).

---

## 7. SSOT Impact

После реализации:

- `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md` — canonical shutdown contract: standard `applicationShouldTerminate:` path, no Edit menu, no `terminate:` override.
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` §3 — новый invariant 1.2.48.
- `doc/BugRegistry.md` — fixed запись для paste/SuperWhisper/Quit regression.

Планинг-док после закрытия cycle уходит в `doc/SolidWorks-WorkFlow/Plans/Archive/`.
