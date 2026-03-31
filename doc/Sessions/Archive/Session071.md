# Session 071 — Documentation structure cleanup and agent-instructions consolidation

**Date:** 2026-03-13 19:40 (CET)
**Branch:** main
**Version:** 1.1.724

---

# 1. Work Done in This Session

## Work summary
- Введена новая папка `doc/SolidWorks-WorkFlow/Plans/` как единственное место для planning-архитектур до `doc/TODO/todo-plan.md`.
- Из `doc/SolidWorks-WorkFlow/Contracts/` вынесены не-SSOT planning-доки; завершённые planning-доки перенесены в `doc/SolidWorks-WorkFlow/Plans/Archive/`, а на старых путях оставлены короткие compat-redirect notes.
- `SessionInputLock_SSOT_StateMachine.md` разделён на текущий реализованный incremental-contract и отдельный target-state planning-док `Plans/SessionInputLock_TargetState_Architecture.md`.
- Синхронизированы `doc/SolidWorks-WorkFlow/README.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md` и bootstrap `doc/TODO/todo-plan.md` под новый lifecycle документации.
- Канонические агентные инструкции переведены на один источник истины: в Git теперь отслеживается `AGENTS.md`, а локальные `GEMINI.md` и `.claude/CLAUDE.md` сведены к короткому redirect `Читай документ: AGENTS.md`.

## Git commits
- `0db0f937 docs(workflow): separate planning docs and track AGENTS`

## Verification
- `git commit` hooks:
  - `npm test`
  - `./scripts/check-architecture.sh`
  - `npm run lint`
  - `npm run check:tsprune`
- `git push` hooks:
  - `npm run check:dup`
  - `npm run check:links`
- Push в `origin/main` выполнен успешно.

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `AGENTS.md`
2. `doc/SolidWorks-WorkFlow/README.md`
3. `doc/SolidWorks-WorkFlow/Docs_Index.md`
4. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
5. `doc/TODO/todo-plan.md`
6. `doc/Sessions/Archive/Session071.md` (THIS REPORT)

> Далее: если начинается новый scope, сначала создать planning-док в `doc/SolidWorks-WorkFlow/Plans/`, утвердить его, и только потом разворачивать phase/stream execution plan.

## Plans for next session
- Определить следующий рабочий scope и завести planning-док именно в `doc/SolidWorks-WorkFlow/Plans/`.
- Держать `AGENTS.md` единственным Git-tracked источником агентных правил; локальные редиректы `GEMINI.md` и `.claude/CLAUDE.md` не расширять.
- При следующем док-цикле при необходимости дочистить оставшиеся compat-redirect notes, если на них больше не останется активных ссылок.
