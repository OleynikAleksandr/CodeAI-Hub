# CEF macOS Bootstrap Rollback Architecture

**Status:** Accepted
**Date:** 2026-04-22
**Owner:** Codex
**Scope:** `packages/cef-launcher/src/platform/mac/*`, release `1.2.49`
**Related history:** `CEF_MacOS_BootstrapHardening_Architecture.md` (1.2.46 archived), `CEF_MacOS_Input_And_Quit_Regression_Architecture.md` (1.2.48 archived)

---

## 1. Problem

После релиза `1.2.48` user acceptance повторно подтвердил: Cmd+V / paste и SuperWhisper (синтетический Cmd+V через CGEvent) по-прежнему не работают в input поле standalone Project Manager. Удаление Edit menu и возврат к стандартному `applicationShouldTerminate:` не исправили реальный root cause — значит paste-breaker сидит глубже, в самом `CodeAIHubApplication : NSApplication <CefAppProtocol>` shell, введённом в `de7c5ad37`.

Разрушен базовый пользовательский функционал (диктовка и вставка из буфера). Crash-on-quit, который CEF shell `1.2.46` должен был починить, был **редким и недетерминированным**; принятый trade-off — вернуть редкий crash как known issue, но восстановить работающий clipboard/voice input.

## 2. Decision

Откатить целиком CEF macOS bootstrap refactor из релиза `1.2.46` и его follow-up `1.2.48`. Core, UI, PM, usage-limits fixes из `1.2.45` / `1.2.47` сохраняем.

**Commits в rollback scope (не применяем через git revert, делаем manual clean rollback):**
- `de7c5ad37` feat: add CEF-compatible mac application shell
- `b6b0cf3d1` fix: align mac launcher bootstrap with CEF sample
- `a97c5e9c5` fix(launcher-mac): route terminate through applicationShouldTerminate
- `a6dd758b2` fix(launcher-mac): drop edit menu to unblock clipboard shortcuts

## 3. Target State

### 3.1 Code

- `packages/cef-launcher/src/platform/mac/app_main_mac.mm` — восстановить в состоянии коммита `70ac9a6ac` (последний working baseline до `1.2.46`): standard `[NSApplication sharedApplication]` + namespace-local `CreateApplicationMenu()` + `CefExecuteProcess` → `CefInitialize` → `CreateApplicationMenu()` → `CefRunMessageLoop` → `CefShutdown`.
- `packages/cef-launcher/src/platform/mac/codeai_hub_application_mac.h` — удалить.
- `packages/cef-launcher/src/platform/mac/codeai_hub_application_mac.mm` — удалить.
- `packages/cef-launcher/CMakeLists.txt` — удалить вхождения `codeai_hub_application_mac.mm` (из `PLATFORM_SOURCES` и из `set_source_files_properties`).

### 3.2 SSOT

- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` §3: удалить целиком Invariant 32 (1.2.46) и Invariant 33 (1.2.48). Нумерация invariants после 31 сокращается естественным образом.
- `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md`: секция «macOS Bootstrap Lifecycle Boundary» удаляется или редуцируется до минимума («standalone mac launcher использует обычный `NSApplication`; CEF shutdown-crash на macOS известный deferred issue»).
- `doc/BugRegistry.md`:
  - `BUG-2026-04-22-01` (Launcher crash on quit) → переоткрыть как **OPEN / DEFERRED**; добавить rollback note.
  - `BUG-2026-04-22-04` (paste/SuperWhisper/Quit регрессия 1.2.46) → **FIXED** в `1.2.49` через rollback; сохранить как историческая запись что 1.2.48 narrow fix (Edit menu + terminate path) не попал в корень.

### 3.3 Release metadata

- `README.md` Current Release → `v1.2.49`; 1.2.48 и 1.2.46 передвигаются в previous list.
- `CHANGELOG.md`: новая секция `## [1.2.49]` — «Revert 1.2.46 CEF bootstrap refactor to restore paste/Cmd+V and SuperWhisper; macOS shutdown crash re-opened as deferred known issue».

## 4. Non-Goals

- Не ищем новый fix для macOS shutdown crash в этом cycle — это отдельный investigation scope. Crash возвращается в known issues.
- Не трогаем Core, PM, UI, Claude/Codex/Gemini modules.

## 5. File Plan

Удаляемые:
- `packages/cef-launcher/src/platform/mac/codeai_hub_application_mac.h`
- `packages/cef-launcher/src/platform/mac/codeai_hub_application_mac.mm`

Меняемые:
- `packages/cef-launcher/src/platform/mac/app_main_mac.mm` (checkout from `70ac9a6ac`)
- `packages/cef-launcher/CMakeLists.txt`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md`
- `doc/BugRegistry.md`
- `README.md`
- `CHANGELOG.md`

Новых файлов нет.

## 6. Verification Plan

Automated (Husky hooks на каждом commit'е): architecture / lint / knip / format / dup / links.

Targeted build: `./scripts/build-all.sh --version 1.2.49`, `./scripts/build-release.sh --use-current-version`.

Manual acceptance (user retest на установленном `codeai-hub-1.2.49.vsix`):
- Cmd+V в input Project Manager вставляет текст из буфера.
- SuperWhisper диктовка → транскрипт в input.
- Cmd+C / Cmd+X / Cmd+A работают.
- Dock right-click → Quit закрывает launcher.
- Cmd+Q закрывает launcher.
- Accepted trade-off: `NSApplication unrecognized selector` crash-on-quit может очень редко повторяться — это known deferred issue.

## 7. Documentation Impact

После закрытия cycle planning-doc уходит в `doc/SolidWorks-WorkFlow/Plans/Archive/`. `Docs_Index.md` получает описание rollback scope вместе с историей 1.2.46 → 1.2.48 → 1.2.49.
