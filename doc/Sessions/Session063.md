# Session 063 — Flow-first UI старт сессии + Release 1.1.390

**Date:** 2026-01-07 15:50 (CET)
**Branch:** main
**Version:** 1.1.390

---

# 1. Work Done in This Session

## Work summary
- UI переведён в плоскость FLOW на старте сессии: теперь сначала выбирается режим **Simple Chat / Idea / Spec / Plan / Execute**, затем — провайдер.
- Провайдеры ограничены по режиму:
  - **Simple Chat**: Codex / Claude / Gemini.
  - **Flow (Idea/Spec/Plan/Execute)**: только Codex и Claude (Structured Output).
- Поведение Idea stage сохранено: после выбора **Idea** и провайдера запускается существующий Idea Collector flow (анкета и т.д.).
- Обновлены документы релиза (README/CHANGELOG/SystemArchitecture/Architecture) и создан дизайн-док по UI модели.
- Собран релиз **1.1.390**: `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version`.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `df8e3f8 docs(ui): document flow-first start picker`
- `ed3fba1 refactor(ui): extend flow wizard start steps`
- `a16225f refactor(ui): stage-first provider selection`
- `0c567da refactor(ui): add back navigation to provider picker`
- `e62ac7a fix(ui): gate idea kickoff by stage`
- `c7a6282 chore(webview): rebuild bundle`
- `2694230 docs(todo): archive agent packages todo plan`
- `6fbc9bf docs(todo): update flow-first ui todo plan`
- `e44928a chore(release): bump versions to 1.1.390`
- `bf6afad docs(release): add 1.1.390 flow-first ui notes`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Architecture/Architecture.md`
2. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
3. `doc/Project_Docs/UIFlow_EntrySelection_Architecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session063.md` (THIS REPORT)

## Plans for next session
- Определить и согласовать дизайн-док для Spec stage (как минимум: контракт, артефакты, UI экран и точки интеграции) перед реализацией.
- Начать Phase 2: интеграция `@codeai-hub/spec-creator` в Core/API и UI (после утверждения дизайна).

---

# Release artifacts
- VSIX: `codeai-hub-1.1.390.vsix`
- Launcher: `CodeAIHubLauncher-macos-arm64-1.1.390.tar.bz2`
- Core: `codeai-hub-core-darwin-arm64-1.1.390.tar.bz2`
- Providers: `claude-module-1.1.390.tar.bz2`, `codex-module-1.1.390.tar.bz2`, `gemini-module-1.1.390.tar.bz2`
- UI: `vscode-webview-1.1.390.tar.bz2`, `web-client-1.1.390.tar.bz2`, `project-manager-1.1.390.tar.bz2`
