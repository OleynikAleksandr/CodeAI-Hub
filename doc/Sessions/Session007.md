# Session 7 — Codex Model Selector Rewrite + v1.1.335 Release

**Date:** 2025-12-23 09:27 (CET)
**Branch:** main
**Version:** 1.1.335

---

# 1. Work Done in This Session

## Work summary
- Полностью переписан компонент `CodexDefaultModelCard` для устранения проблемы белой обводки на ранее выбранных карточках моделей.
- Удалены нативные `<input type="radio">` элементы и все focus-хаки (`focusResetStyles`, `blurActiveElement`).
- Добавлены кликабельные `<div>` карточки с кастомным CSS-индикатором `RadioCircle`.
- Стили вынесены в отдельный файл `codex-model-card-styles.ts` (130 строк) для соблюдения лимита 300 строк.
- Добавлена ARIA accessibility: `role="radio"`, `aria-checked`, `tabIndex`, keyboard navigation.
- Обновлены CHANGELOG.md и README.md.
- Собран полный релиз v1.1.335 всех модулей.

## Git commits
- `c4c38d2 fix: rewrite codex model selector without native radio inputs`
- `8a6e581 docs: update CHANGELOG and README for v1.1.335`
- `08203e0 chore: bump versions and manifests to v1.1.335`

## Artifacts
- VSIX → `codeai-hub-1.1.335.vsix` (428K)
- Launcher → `CodeAIHubLauncher-macos-arm64-1.1.335.tar.bz2` (230M)
- Core → `codeai-hub-core-darwin-arm64-1.1.335.tar.bz2` (35M)
- Providers → `claude-module-1.1.335.tar.bz2`, `codex-module-1.1.335.tar.bz2`, `gemini-module-1.1.335.tar.bz2`
- UI → `vscode-webview-1.1.335.tar.bz2`, `web-client-1.1.335.tar.bz2`, `project-manager-1.1.335.tar.bz2`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Architecture/Architecture.md`
2. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
3. `doc/TODO/todo-plan.md`
4. `doc/Sessions/Session007.md` (THIS REPORT)

## Plans for next session
- Тестирование v1.1.335 на предмет отсутствия белой обводки (ручная проверка пользователем).
- Если обнаружатся новые проблемы — продолжить работу над UI Settings.
