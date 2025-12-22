# Session 27 — Codex focus ring override + release v1.1.331

**Date:** 2025-12-22 11:16 (CET)
**Branch:** main
**Version:** 1.1.331

---

# 1. Work Done in This Session

## Work summary
- Добавил локальный CSS-override для Codex селектора моделей, чтобы убрать все focus/focus-visible/focus-within обводки внутри блока; пересобрал webview.
- Выполнил гейты качества (architecture, ultracite, ts-prune, jscpd, check:links, build/typecheck webview).
- Собрал полный релиз: `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`. Артефакты v1.1.331 в `~/.codeai-hub/releases`, VSIX: `codeai-hub-1.1.331.vsix`.

## Git commits
- `6ae7085 fix: remove codex selector focus rings`
- `e6eb1b6 chore: release v1.1.331`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Architecture/Architecture.md`
2. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
3. `doc/TODO/todo-plan.md`
4. `doc/Sessions/Session027.md` (THIS REPORT)

## Plans for next session
- Проверить в UI Settings → Codex, что белая обводка больше не появляется у невыбранных моделей.
- При необходимости обновить CHANGELOG/архитектурные документы под релиз 1.1.331.
