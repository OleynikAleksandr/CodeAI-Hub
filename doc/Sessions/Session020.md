# Session 20 — Release v1.1.326 (Provider Auto Update & Global Gemini)

**Date:** 2025-12-21 08:25 (CET)
**Branch:** main
**Version:** 1.1.326

---

# 1. Work Done in This Session

## Work summary
- Собран релиз v1.1.326 по чеклисту (build-all.sh + build-release.sh --use-current-version).
- Исправлена инициализация ProviderAutoUpdateService (без extensionPath) для успешного typecheck/build-release.
- Артефакты релиза скопированы в `doc/tmp/releases/`.
- Верификация: финальные гейты пройдены в build-release (architecture, typecheck, compile, link, jscpd) + локальный tsc без ошибок.

## Git commits
- `cff59d5` chore: bump version to 1.1.326
- `2fe111d` fix: initialize provider auto-update service without args

## Release Artifacts (v1.1.326)
- **VSIX**: `codeai-hub-1.1.326.vsix` (416K)
- **Provider Modules**:
  - `claude-module-1.1.326.tar.bz2` (18K)
  - `codex-module-1.1.326.tar.bz2` (18K)
  - `gemini-module-1.1.326.tar.bz2` (14K)
- **Core**: `codeai-hub-core-darwin-arm64-1.1.326.tar.bz2` (35M)
- **CEF Launcher**: `CodeAIHubLauncher-macos-arm64-1.1.326.tar.bz2` (230M)
- **UI Bundles**:
  - `vscode-webview-1.1.326.tar.bz2` (134K)
  - `web-client-1.1.326.tar.bz2` (141K)
  - `project-manager-1.1.326.tar.bz2` (49K)

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Architecture/Architecture.md`
2. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
3. `doc/TODO/todo-plan.md`
4. `doc/Sessions/Session020.md` (THIS REPORT)

## Plans for next session
- Провести ручную проверку в VS Code: автообновление провайдеров, прогресс в Settings UI, глобальный Gemini CLI/Core.
- Зафиксировать результаты e2e проверки (startup + settings) и при необходимости обновить документацию.
