# Session 076 — v1.1.626 verified + pushed to GitHub main

**Date:** 2026-02-17 16:05 (CET)
**Branch:** main
**Version:** 1.1.626

---

# 1. Work Done in This Session

## Work summary
- Получена пользовательская валидация релиза `1.1.626`: `Tokens: …` обновляется сразу после завершения turn (после последнего ответа агента), без необходимости смены workspace.
- Закрыт баг в реестре и актуализирован TODO plan (Phase 210).
- Репозиторий подготовлен к пушу в `main`.

## Technical notes (root cause + fix)
- Root cause: `session:stream` с `token_usage` мог приходить до hydration snapshot для `sessionId` (особенно в dialog-mode), а обработчик обновлял usage только при наличии snapshot по `payload.sessionId`.
- Fix: `updateSnapshotsWithTokenUsage` пишет last-known token usage в cache даже без snapshot, и делает fallback update по совпадающему `binding.providerSessionId`.

## Artefacts
- VSIX: `codeai-hub-1.1.626.vsix`
- Tarballs: `doc/tmp/releases/*-1.1.626.tar.bz2` и `~/.codeai-hub/releases/*-1.1.626.tar.bz2`

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `29c1ddea fix(pm): sync token usage after turns`
- `5edb563d feat(release): v1.1.626 - token usage sync`
- `8edec98c docs(release): record v1.1.626 build`
- `75f5b967 docs: close BUG-2026-02-17-03 after verification`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/BugRegistry.md`
3. `doc/TODO/todo-plan.md`
4. `doc/Sessions/Session076.md` (THIS REPORT)

## Plans for next session
- Следующий баг/улучшение — заводить новой Phase в `doc/TODO/todo-plan.md` по шаблону микро‑задач.
