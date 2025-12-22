# Session 6 — Codex focus-within border fix + v1.1.334 release

**Date:** 2025-12-22 19:53 (CET)
**Branch:** main
**Version:** 1.1.334

---

# 1. Work Done in This Session

## Work summary
- Исправил белую обводку у невыбранных карточек Codex Default model: добавлены селекторы `focus-within` с жёстким контролем `border-color` для выбранных/невыбранных карточек.
- Обновлены README/CHANGELOG и архитектурные документы под релиз 1.1.334.
- Выполнены `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`, собран `codeai-hub-1.1.334.vsix` и tarball'ы в `~/.codeai-hub/releases/` и `doc/tmp/releases/`.

## Git commits
- `be5d822 fix: codex model focus-within border`
- `258c2b4 feat: v1.1.334 - codex default model focus fix`
- `28c9e35 chore: update v1.1.334 release sizes`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Architecture/Architecture.md`
2. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
3. `doc/TODO/todo-plan.md`
4. `doc/Sessions/Session006.md` (THIS REPORT)

## Plans for next session
- Установить `codeai-hub-1.1.334.vsix` и проверить Settings → Codex → Default model (нет белой обводки у невыбранных карточек).
- При необходимости зафиксировать результаты ручной проверки и обновить документацию.
