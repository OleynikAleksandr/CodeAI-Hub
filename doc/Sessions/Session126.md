# Session 126 — План релиза после provider picker

**Date:** 2026-01-16 19:31 (CET)
**Branch:** main
**Version:** 1.1.429

---

# 1. Work Done in This Session

## Work summary
- Подготовлен план следующей сессии: сборка нового релиза после добавления provider picker.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- (нет коммитов)

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Architecture/Architecture.md`
2. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
3. `doc/TODO/todo-plan.md`
4. `doc/Sessions/Session126.md` (THIS REPORT)

## Plans for next session
- Обновить README/CHANGELOG под новый релиз (предположительно 1.1.430) и при необходимости архитектурные документы.
- Запустить quality gates: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`.
- Выполнить `./scripts/build-all.sh` и затем `./scripts/build-release.sh --use-current-version`.
- Обновить `doc/TODO/todo-plan.md` статусами + зафиксировать релизный коммит.
- Создать новый отчет сессии после релиза.
