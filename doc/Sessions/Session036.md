# Session 036 — Phase 65: Settings-only webview + Release 1.1.465

**Date:** 2026-01-21 17:08 (CET)
**Branch:** main
**Version:** 1.1.465

---

# 1. Work Done in This Session

## Work summary
- `vscode-webview` переведен в Settings-only режим: добавлен Settings-only host, добавлен notice в Settings UI.
- Роутинг команд/сообщений, связанных с сессиями/чатами, направлен на подсказку “Use Project Manager”.
- Пересобран webview bundle и обновлен `assets/ui/manifest.json`.
- README/CHANGELOG обновлены под removal `web-client` и Settings-only webview.
- Выполнены `build-all` (1.1.465) и `build-release --use-current-version` (VSIX создан).

## Verification
- `./scripts/check-architecture.sh` (PASS with warnings)
- `npx ultracite check` (OK)
- `npx ts-prune` (OK; reports unused exports)
- `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"` (dup < 3%)
- `npm run check:links` (OK)
- `npm run build:webview` (OK; также в `build-ui-bundle.sh`/`build-release.sh`)
- `./scripts/build-all.sh` (OK; version 1.1.465)
- `./scripts/build-release.sh --use-current-version` (OK; `codeai-hub-1.1.465.vsix`)

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `b552910b fix(vscode-webview): run settings-only mode`
- `f542978e docs(todo): record settings-only mode`
- `3e528d83 fix(vscode-webview): route sessions to project-manager`
- `0dfafb9f docs(todo): record session routing`
- `7ec0e407 chore(webview): rebuild settings-only bundle`
- `73bffb5e docs(todo): record webview rebuild`
- `c4238638 docs(todo): reorder release stream`
- `f801d175 docs(release): note web-client removal`
- `9f3f3c4f docs(todo): record release docs`
- `29d75372 chore(release): build verification (no web-client)`
- `bef7edd3 docs(todo): record phase65 web-client removal`
- `9da9d11d docs(todo): record phase65 hash`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/TODO/todo-plan.md`
3. `doc/Sessions/Session036.md` (THIS REPORT)

## Plans for next session
- Подтвердить распространение артефактов (VSIX + tarballs) и перейти к следующей Phase/Stream.
- При необходимости запланировать Phase 66 (после завершения Phase 65).
