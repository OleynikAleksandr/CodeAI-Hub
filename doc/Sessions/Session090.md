# Session 90 — Preserve Codex home + release 1.1.405

**Date:** 2026-01-11 19:22 (CET)
**Branch:** main
**Version:** 1.1.405

---

# 1. Work Done in This Session

## Work summary
- Исправлена очистка артефактов релизных сборок: `~/.codeai-hub/providers/codex/home` больше не удаляется.
- Локально обновлён `.codeai-hub/WORKFLOW_ARCHITECTURE.md` (в gitignore) с правилом сохранения Codex home.
- Собран релиз 1.1.405: `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version`.
- Обновлены релизные документы (README/CHANGELOG/Architecture/SystemArchitecture) под 1.1.405.

## Build results
- VSIX: `codeai-hub-1.1.405.vsix`
- Tarballs: `doc/tmp/releases/*-1.1.405.tar.bz2`

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `85f6addd fix(build): preserve codex home`
- `0149f87f docs: update todo plan status`
- `5d2c1346 chore(release): bump 1.1.405`
- `f5f2142e docs: update 1.1.405 release notes`
- `db28f6c5 docs: update architecture for 1.1.405`
- `f310c1b4 docs: update todo plan status`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `README.md`
2. `CHANGELOG.md`
3. `doc/Architecture/Architecture.md`
4. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
5. `.codeai-hub/WORKFLOW_ARCHITECTURE.md`
6. `doc/TODO/todo-plan.md`
7. `doc/Sessions/Session090.md` (THIS REPORT)

## Plans for next session
- Выполнить ручной e2e тест resume в UI после релиза 1.1.405.
- Проверить, что обновление релиза больше не удаляет `~/.codeai-hub/providers/codex/home`.
- При необходимости завершить релизный цикл: обновить `doc/TODO/todo-plan.md` и зафиксировать финальные статусы.
