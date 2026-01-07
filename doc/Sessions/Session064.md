# Session 064 — Action Bar Flow entry + Release 1.1.391

**Date:** 2026-01-07 16:24 (CET)
**Branch:** main
**Version:** 1.1.391

---

# 1. Work Done in This Session

## Work summary
- Исправлен UX входа в Flow: 5 кнопок **в Action Bar** (вместо `New Session / Last Session / Clear Session / Old Sessions`): `Simple Chat`, `Idea`, `Spec`, `Plan`, `Execute`.
- После выбора stage открывается provider picker:
  - `Simple Chat` → все провайдеры (Codex / Claude / Gemini).
  - Flow (`Idea/Spec/Plan/Execute`) → только Codex и Claude (Structured Output).
- Обновлены роутинг и команды старта в extension и standalone `web-client`.
- Обновлены релизные и архитектурные документы под 1.1.391.
- Собран релиз **1.1.391**: `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version`.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `74af863 refactor(ui): replace action bar with flow entry buttons`
- `16addd2 refactor(ui): extract provider picker open handler`
- `d08db9d feat(ui): include stage in provider picker open message`
- `e155a7a feat(extension): start sessions from flow action bar`
- `16c6838 feat(web-client): start sessions from flow action bar`
- `38ede99 chore(webview): rebuild bundle for flow action bar`
- `16832fd chore(release): bump versions to 1.1.391`
- `a218e83 docs(release): add 1.1.391 notes`
- `818ce65 docs(architecture): align docs with flow action bar`
- `f4efa23 docs(todo): archive phase1 plan and start action bar plan`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Architecture/Architecture.md`
2. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
3. `doc/Project_Docs/UIFlow_EntrySelection_Architecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session064.md` (THIS REPORT)

## Plans for next session
- Утвердить дизайн-док для **Spec stage** (контракт, артефакты, UI экран, точки интеграции) перед реализацией.
- Начать интеграцию `@codeai-hub/spec-creator` в Core/API и UI по утверждённому дизайну.

---

# Release artifacts
- VSIX: `codeai-hub-1.1.391.vsix`
- Launcher: `CodeAIHubLauncher-macos-arm64-1.1.391.tar.bz2`
- Core: `codeai-hub-core-darwin-arm64-1.1.391.tar.bz2`
- Providers: `claude-module-1.1.391.tar.bz2`, `codex-module-1.1.391.tar.bz2`, `gemini-module-1.1.391.tar.bz2`
- UI: `vscode-webview-1.1.391.tar.bz2`, `web-client-1.1.391.tar.bz2`, `project-manager-1.1.391.tar.bz2`
