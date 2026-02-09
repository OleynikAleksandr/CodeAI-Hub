# Session 65 — Token usage persistence via continuity chain.json (no extra state files)

**Date:** 2026-02-01 19:05 (CET)
**Branch:** main
**Version:** 1.1.492

---

# 1. Work Done in This Session

## Work summary
- Перенесли persistence токенов из отдельного state-файла в уже существующий механизм continuity (`chain.json`).
- Теперь tokenUsage:
  - записывается в `chain.json` (в segment по `providerSessionId`) при получении provider-event,
  - восстанавливается после рестарта Core: при `session:binding` Core читает continuity и сразу отправляет `session:stream` с последним tokenUsage.
- Удалили временный механизм `~/.codeai-hub/state/token-usage-cache.json` и связанный код.
- Собрали релиз `1.1.492` скриптами; VSIX лежит в корне репозитория.

## Git commits
- `0a0ad46b fix(core): persist token usage in continuity chain`
- `c83d436f fix(core): drop token usage state file`
- `423d5482 docs(todo): record continuity token usage plan`
- `5c4004de chore(release): build next version`
- `179fe57b docs(todo): record continuity release hash`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/TODO/todo-plan.md`
3. `doc/Sessions/Session065.md` (THIS REPORT)

## Verification checklist
- После установки `codeai-hub-1.1.492.vsix`: перезапусти Core/VS Code и открой Project Manager — токены должны быть НЕ 0 (если раньше уже были посчитаны для этой providerSessionId).
- Убедиться, что `chain.json` для соответствующего rootSessionId содержит поле `tokenUsage` внутри нужного segment.
