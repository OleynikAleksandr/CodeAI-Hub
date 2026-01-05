# Session 56 — Hotfix questionnaire auto-attach + Release 1.1.386

**Date:** 2026-01-05 17:57 CET
**Branch:** main
**Version:** 1.1.386

---

# 1. Work Done in This Session

## Work summary
- Исправлен auto-attach: шаблонные пути с `<...>` игнорируются, чтобы `questionnaire.md` прикреплялся при single-turn submit.
- Обновлены архитектурные документы и release notes под 1.1.386.
- Собран релиз 1.1.386 (build-all + build-release) и сформирован VSIX.

## Git commits
- `f7a1def fix(core): ignore placeholder paths in auto-attach`
- `36a9c89 docs(orchestrator): clarify auto-attach placeholder guard`
- `f647261 docs(orchestrator): refresh system docs 1.1.386`
- `949bd07 docs(release): update 1.1.386 notes`
- `4e1a7a6 chore(release): prepare 1.1.386`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Architecture/Architecture.md`
2. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
3. `doc/TODO/todo-plan.md`
4. `doc/Sessions/Session056.md` (THIS REPORT)

## Plans for next session
- Ручная проверка: submit анкеты → auto-attach questionnaire + pre-read документы без запроса /read.
- При необходимости — обновить релизные артефакты/документацию после e2e.

