# Session 053 — Release 1.1.477 (Add Workspace UX fixes)

**Date:** 2026-01-23 17:10 (CET)
**Branch:** main
**Version:** 1.1.477

---

# 1. Work Done in This Session

## Work summary
- Реализованы UX fixes для Add Workspace (macOS Finder picker, сброс артефакта/анкеты при смене workspace, авто-открытие анкеты для пустого workspace).
- Исправлен build-cef-launcher: чтение версии лаунчера из manifest.
- Обновлены `README.md`, `CHANGELOG.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md` под версию 1.1.477.
- Собран unified релиз через `./scripts/build-all.sh` и VSIX через `./scripts/build-release.sh --use-current-version`, артефакты скопированы в `doc/tmp/releases/`.

## Release artifacts
- VSIX: `codeai-hub-1.1.477.vsix` (также `doc/tmp/releases/codeai-hub-1.1.477.vsix`)
- Tarballs: `doc/tmp/releases/claude-module-1.1.477.tar.bz2`, `doc/tmp/releases/codex-module-1.1.477.tar.bz2`, `doc/tmp/releases/gemini-module-1.1.477.tar.bz2`, `doc/tmp/releases/codeai-hub-core-darwin-arm64-1.1.477.tar.bz2`, `doc/tmp/releases/CodeAIHubLauncher-macos-arm64-1.1.477.tar.bz2`, `doc/tmp/releases/vscode-webview-1.1.477.tar.bz2`, `doc/tmp/releases/project-manager-1.1.477.tar.bz2`.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `d37e80fa chore(release): build next version`
- `01d7eddc docs(todo): update Phase 79 status`
- `583b3cf8 chore: verify add-workspace ux fixes`
- `66ccbbab fix(scripts): resolve launcher version from manifest`
- `0afed1f2 docs: document add-workspace ux fixes`
- `d1686f90 fix(project-manager): reset questionnaire state on workspace change`
- `6f4d5af4 feat(project-manager): open questionnaire on empty workspace`
- `69fb3723 fix(project-manager): reset artifact on workspace switch`
- `6f25a3c0 fix(project-manager): use mac folder picker in add workspace`
- `2c9394b6 fix(scripts): resolve launcher version from manifest`
- `7d27ffd6 feat(cef-launcher): mac folder picker for add workspace`
- `b6bd0e6d docs(session): Session052 Phase 79 plan`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/TODO/todo-plan.md`
3. `doc/Sessions/Session053.md` (THIS REPORT)

## Plans for next session
- Провести manual smoke-test VSIX `codeai-hub-1.1.477.vsix` (установка/активация, запуск Project Manager, Add Workspace, создание `.codeai-hub/<workspaceSlug>/`).
- При необходимости — пуш в `origin/main`.
