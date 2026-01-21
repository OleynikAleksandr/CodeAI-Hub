# Session 032 — Fix: duplicate session windows on pre-binding Description resume

**Date:** 2026-01-21 13:54 (CET)
**Branch:** main
**Version:** 1.1.462

---

# 1. Work Done in This Session

## Work summary
- Воспроизведён баг: клик по `Description agent session` в дереве ДО первого ответа агента создаёт второй UI-экземпляр сессии, при этом Core переиспользует существующую (новая continuity-папка не появляется).
- Причина: Project Manager не дедуплицировал `session:created` при rebroadcast (Core повторно отправляет `session:created` для уже существующей сессии), из-за чего UI добавлял дубликат `SessionRecord` и пересоздавал snapshot.
- Fix(project-manager): дедуп `session:created` по `session.id` (update existing record + preserve snapshot) + авто-показ скрытой сессии при rebroadcast.
- Docs(todo): добавлен Stream под фиксацию и отмечен DONE + hash.

## Verification
- `./scripts/check-architecture.sh` (PASS with warnings)
- `npx ultracite check` (OK)
- `npm run build:project-manager` (OK)

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `093c7cc3 docs(todo): add pre-binding resume fix stream`
- `3d323a83 fix(project-manager): dedupe rebroadcasted session created`
- `5a5c1247 docs(todo): record pre-binding resume fix`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/TODO/todo-plan.md`
2. `doc/Sessions/Session032.md` (THIS REPORT)

## Plans for next session
- Выполнить ручную проверку: клик по `Description agent session` до первого ответа агента больше не создаёт дублей в списке/окнах сессий.
- Закрыть `Verify(manual)` пункт в Stream `Fix — Pre-binding resume click (no duplicate sessions)` в `doc/TODO/todo-plan.md` (DONE + hash) отдельным docs-коммитом.
