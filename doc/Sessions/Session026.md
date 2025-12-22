# Session 26 — Codex model focus fix + release v1.1.330

**Date:** 2025-12-22 11:01 (CET)
**Branch:** main
**Version:** 1.1.330

---

# 1. Work Done in This Session

## Work summary
- Убрал белую обводку у предыдущих Codex моделей: после выбора радио снимает фокус, остаются только состояния выбрано/не выбрано; пересобрал webview.
- Выполнил гейты качества (architecture, ultracite, ts-prune, jscpd, check:links, build/typecheck webview).
- Собрал полный релиз: `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`. Артефакты v1.1.330 в `~/.codeai-hub/releases`, VSIX: `codeai-hub-1.1.330.vsix`.

## Git commits
- `2a7ea87 fix: remove codex model focus outline`
- `a5438a0 chore: release v1.1.330`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Architecture/Architecture.md`
2. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
3. `doc/TODO/todo-plan.md`
4. `doc/Sessions/Session026.md` (THIS REPORT)

## Plans for next session
- Проверить визуально Codex Settings после установки VSIX 1.1.330 и подтвердить отсутствие белой обводки у невыбранных моделей.
- При необходимости обновить CHANGELOG/архитектурные документы под релиз 1.1.330.
