# Session 001 — Pivot: File-first workflow + Watcher

**Date:** 2026-01-18 10:57 CET
**Branch:** main
**Version:** 1.1.439

---

# 1. Work Done in This Session

## Work summary
- Diagnosed recurring structured-output failure mode: агенты возвращали вопросы как `artifacts[]` со слотами `question*`, что ломало Core allowlist (`Unsupported artifact slot: question1`).
- Added guards in provider modules to treat `question*` artifacts as questions (not upserts) for both Codex and Claude.
- Decision: отказаться от structured-output для стадий Description/Virtual Simulation/Diagrams и перейти на file-first (агент пишет артефакт файлом через CLI tools); управление состоянием и гейтинг — через Workflow Watcher.
- Archived старый `doc/TODO/todo-plan.md` и создал новый план + архитектурный документ под CLI+Watcher подход.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `9d45c712 fix(codex): treat question artifacts as questions`
- `79ad788c fix(claude): treat question artifacts as questions`
- `b51e145c docs: update todo plan for question artifact guard`
- `31a27c38 docs: plan switch workflow to file-first + watcher`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Project_Docs/Workflow_CLI_Steps_And_Watcher_Architecture.md`
2. `doc/Architecture/Architecture.md`
3. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session144.md` (THIS REPORT)

## Plans for next session
- Утвердить архитектурный документ CLI+Watcher (зафиксировать decision и границы ответственности Core/UI).
- Начать Phase 57: каркас Workflow Watcher (events + state) в Core и API для UI.
- Перевести Description/Virtual Simulation/Diagrams на file-first (Prompt Pack в 1 turn + запись артефакта в runs).
