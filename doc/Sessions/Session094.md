# Session 094 — Claude provider-home hint fix + release v1.1.643

**Date:** 2026-02-21 09:55 (CET)
**Branch:** main
**Version:** 1.1.643

---

# 1. Work Done in This Session

## Work summary
- Диагностирована проблема Claude в чистом `~/.codeai-hub/`: provider-home bootstrap логируется, но preflight auth probe падает; fallback уходит в ручной login.
- Зарегистрирован `BUG-2026-02-20-01` в `doc/BugRegistry.md` (симптом, root cause, workaround, planned fix).
- Исправлен user-facing синтаксис recovery-команды на `claude /login` в ошибках/подсказках Core и Claude module.
- Обновлены release docs (`README.md`, `CHANGELOG.md`) под `v1.1.643`.
- Выполнен релизный цикл: `npm install` → `./scripts/build-all.sh` → `./scripts/build-release.sh --use-current-version`.
- Собран VSIX: `codeai-hub-1.1.643.vsix`; tarball-артефакты обновлены в `~/.codeai-hub/releases/` и `doc/tmp/releases/`.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `ade0e76f fix(claude): use /login in provider-home recovery hints`
- `bdb2f51b feat(release): v1.1.643 - claude recovery hint update`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session094.md` (THIS REPORT)

## Plans for next session
- Закрыть технический root-cause `BUG-2026-02-20-01`: сделать детерминированный auth bridge для Claude provider-home без регресса stale token/401.
- После фикса провести повторную проверку установки/старта в чистом `~/.codeai-hub/`.
- Подготовить следующий релизный цикл с верификацией Claude availability без ручного вмешательства.
