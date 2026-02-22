# UI Bundles (Webview + Project Manager) — Module (SSOT)

## Назначение
UI бандлы, доставляемые как tarball’ы и устанавливаемые в `~/.codeai-hub/packages/ui/**`.

## Где живёт код
- Build: `scripts/build-webview.js`, `scripts/build-project-manager.js`, `scripts/build-ui-bundle.sh`
- Webview UI: `src/client/ui/`
- Project Manager UI: `src/client/project-manager/`

## Установка
- `~/.codeai-hub/packages/ui/<bundleId>/<version>/` + symlink `current`
