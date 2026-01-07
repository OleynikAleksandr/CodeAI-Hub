# Session 065 — Provider picker Back fix + Release 1.1.392

**Date:** 2026-01-07 17:06 (CET)
**Branch:** main
**Version:** 1.1.392

---

# 1. Work Done in This Session

## Work summary
- Исправлен UX: при старте сессии из **Action Bar** и выборе провайдера кнопка **Back** больше не возвращает к «серому Flow wizard»; вместо этого она закрывает provider picker.
- Поведение Flow wizard внутри provider picker сохранено только как fallback для legacy-входов (когда stage не задан извне).
- Собран релиз **1.1.392**: `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version`.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `0a39cc1 fix(ui): lock stage selection for action bar starts`
- `b82571a fix(ui): back closes picker for action bar flow`
- `5e41be4 fix(ui): wire stage selection lock to session region`
- `ba20446 chore(webview): rebuild bundle`
- `6b0cbbd chore(release): bump versions to 1.1.392`
- `f2d7c3f docs(release): add 1.1.392 back navigation fix`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Architecture/Architecture.md`
2. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
3. `doc/Project_Docs/UIFlow_EntrySelection_Architecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session065.md` (THIS REPORT)

## Plans for next session
- Утвердить дизайн-док для **Spec stage** (контракт, артефакты, UI экран, точки интеграции) перед реализацией.
- Начать интеграцию `@codeai-hub/spec-creator` в Core/API и UI по утверждённому дизайну.

---

# Release artifacts
- VSIX: `codeai-hub-1.1.392.vsix`
- Launcher: `CodeAIHubLauncher-macos-arm64-1.1.392.tar.bz2`
- Core: `codeai-hub-core-darwin-arm64-1.1.392.tar.bz2`
- Providers: `claude-module-1.1.392.tar.bz2`, `codex-module-1.1.392.tar.bz2`, `gemini-module-1.1.392.tar.bz2`
- UI: `vscode-webview-1.1.392.tar.bz2`, `web-client-1.1.392.tar.bz2`, `project-manager-1.1.392.tar.bz2`
