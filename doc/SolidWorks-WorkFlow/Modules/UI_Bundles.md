# UI Bundles (Webview + Project Manager) — Module (SSOT)

**Status:** Implemented on `main`
**Updated:** 2026-04-04
**Owner:** Oleksandr + Codex
**Validated on:** `main` (`v1.1.881`)

## Назначение
UI бандлы, доставляемые как tarball’ы и устанавливаемые в `~/.codeai-hub/packages/ui/**`.

## Где живёт код
- Build: `scripts/build-webview.js`, `scripts/build-project-manager.js`, `scripts/build-ui-bundle.sh`
- Webview UI: `src/client/ui/`
- Project Manager UI: `src/client/project-manager/`
- Webview HTML bootstrap shell: `src/core/webview-module/webview-html-generator.ts`

## Startup Hydration
- `vscode-webview` и `project-manager` не должны ждать первый async `settings:loaded`, чтобы показать локализованный первый paint.
- Settings WebView получает persisted localization bootstrap snapshot инъекцией в HTML:
  - `window.__CODEAI_LOCALIZATION_BOOTSTRAP__`
- Project Manager получает тот же persisted snapshot через core HTTP endpoint:
  - `/api/v1/localization/bootstrap`
- Оба bundle'а стартуют из последнего persisted bootstrap snapshot, если он существует, а последующий settings/runtime refresh трактуют как background revalidation.
- Inline English fallback strings допустимы только как деградированный last-resort path для first-run или отсутствующего bootstrap snapshot.

## Установка
- `~/.codeai-hub/packages/ui/<bundleId>/<version>/` + symlink `current`

## Related Docs
- `doc/SolidWorks-WorkFlow/Modules/Localization.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
