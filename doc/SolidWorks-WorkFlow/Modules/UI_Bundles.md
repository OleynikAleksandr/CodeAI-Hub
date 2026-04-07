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

## Local File Link Behavior
- Shared session markdown supports an opt-in local-file interception path instead of hard-wiring editor behavior into every markdown surface.
- Project Manager uses that opt-in path only for agent dialog bubbles:
  - absolute local file links remain normal markdown links by default;
  - PM dialog supplies a file-link callback, decodes percent-encoded absolute filesystem paths before dispatch, and routes supported targets to the editor-aware open path;
  - artifact/help markdown stay on normal anchor behavior until a separate scope changes their contract.
- When a VS Code webview bridge exists, the UI bundle delegates PM dialog file opens to the extension host message channel; the extension host owns `showTextDocument`.
- Without a VS Code webview bridge, the UI bundle prefers the launcher bridge handoff for supported PM dialog file links.
- In standalone mode, the resulting Visual Studio Code external-open confirmation prompt may still appear; the UI contract only guarantees that the handoff target is a real path, not that the host suppresses the safeguard prompt.
- Raw `vscode://file/...` URI navigation remains only as a last-resort fallback when neither the webview bridge nor the launcher bridge exists.

## Related Docs
- `doc/SolidWorks-WorkFlow/Modules/Localization.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
