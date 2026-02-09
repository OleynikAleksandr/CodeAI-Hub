# Session 66 — Restore session dialog across Core restarts (unified-session workspace scoping)

**Date:** 2026-02-01 19:35 (CET)
**Branch:** main
**Version:** 1.1.493

---

# 1. Work Done in This Session

## Work summary
- Исправили восстановление диалога (session history) после рестарта Core/Project Manager, когда Core стартует в другом workspace и раньше искал историю не в той директории.
- `UnifiedSessionStorage` теперь:
  - пишет unified-session `.jsonl` по `session.workspacePath` (а не по текущему `config.*Slug`),
  - при чтении истории делает fallback-поиск по всем workspace roots в `~/.codeai-hub/sessions/*` и мерджит сообщения (чтобы не терять историю, записанную в “старый/не тот” workspace bucket).
- Собрали релиз `1.1.493` скриптами; VSIX лежит в корне репозитория.

## Git commits
- `26c4b83e fix(core): restore session history across workspaces`
- `d15e6ec0 docs(todo): record unified session history fix hash`
- `ac7aa183 chore(release): build next version`
- `e47bdc92 docs(todo): record 1.1.493 release hash`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/TODO/todo-plan.md`
3. `doc/Sessions/Session066.md` (THIS REPORT)

## Verification checklist
- Установить `codeai-hub-1.1.493.vsix`, перезапустить Core и Project Manager.
- Открыть/возобновить существующую сессию: диалог (history) должен подтягиваться (не пустой), даже если Core стартовал из другого workspace.
