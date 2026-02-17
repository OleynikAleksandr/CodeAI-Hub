# Session 075 — Release 1.1.626: token usage refresh after turns

**Date:** 2026-02-17 15:43 (CET)
**Branch:** main
**Version:** 1.1.626

---

# 1. Work Done in This Session

## Work summary
- Исправлено обновление `Tokens: …` в Session UI: token usage теперь синхронизируется после завершения turn даже когда `session:stream` приходит до hydration snapshot (особенно для dialog-mode сессий).
- Собран релиз `1.1.626` для проверки.

## Artefacts
- VSIX: `codeai-hub-1.1.626.vsix`
- Tarballs: `doc/tmp/releases/*-1.1.626.tar.bz2` и `~/.codeai-hub/releases/*-1.1.626.tar.bz2`

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `29c1ddea fix(pm): sync token usage after turns`
- `5edb563d feat(release): v1.1.626 - token usage sync`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/BugRegistry.md` (BUG-2026-02-17-03)
2. `doc/TODO/todo-plan.md` (Phase 210)
3. `doc/Sessions/Session075.md` (THIS REPORT)

## Plans for next session
- Пользовательская валидация релиза `1.1.626` (обновление `Tokens: …` после последнего ответа агента без смены workspace).
- Если валидация зелёная: перевести BUG-2026-02-17-03 в `FIXED` + добавить “Verified” (дата/провайдеры).
