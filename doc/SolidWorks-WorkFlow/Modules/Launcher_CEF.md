# CEF Launcher — Module (SSOT)

## Назначение
Локальный CEF-клиент, который открывает Project Manager UI bundle.

## Где живёт код
- Launcher package: `packages/cef-launcher/`
- Build scripts: `scripts/build-cef-launcher.sh`

## Артефакты
- Устанавливается в `~/.codeai-hub/cef-launcher/<version>/`.

## PM File Link Boundary
- Current launcher bridge remains intentionally narrow: folder picker, file-drop handoff, and core-start orchestration.
- Opening Project Manager dialog file links in VS Code does **not** add a new native launcher bridge in this scope.
- Standalone PM falls back to standard external `vscode://file/...` handoff for supported absolute local file links coming from agent dialog markdown.

## Связанные документы
- UI bundles: `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
