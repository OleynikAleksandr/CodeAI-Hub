# CEF Launcher — Module (SSOT)

## Назначение
Локальный CEF-клиент, который открывает Project Manager UI bundle.

## Где живёт код
- Launcher package: `packages/cef-launcher/`
- Build scripts: `scripts/build-cef-launcher.sh`

## Артефакты
- Устанавливается в `~/.codeai-hub/cef-launcher/<version>/`.

## PM File Link Boundary
- Launcher bridge remains narrow, but it now includes one additional PM-specific command: dialog file-link handoff into Visual Studio Code.
- Standalone PM must not navigate Chromium directly to `vscode://file/...` because CEF treats that as an in-window URL load and surfaces `ERR_UNKNOWN_URL_SCHEME`.
- Instead, the PM dialog uses `codeai://open-in-vscode?...`; `OnBeforeBrowse` cancels Chromium navigation and the launcher host opens the generated `vscode://file/...` URI through the operating system.

## Связанные документы
- UI bundles: `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
