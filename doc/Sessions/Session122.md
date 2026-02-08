# Session 122 — Phase 112 Hotfix: Disable Watchdog Auto-Idle + Release 1.1.531

**Date:** 2026-02-08 16:59 (CET)
**Branch:** main
**Version:** 1.1.531

---

# 1. Work Done in This Session

## Work summary
- Root cause ранней разблокировки ввода: `SessionRuntime` watchdog (по умолчанию 120s) принудительно переводил `turnState` из `running` в `idle` при отсутствии heartbeat, что снимало блокировку ввода в PM/UI во время долгих/"тихих" turn (например, в Description collector).
- Исправлено: watchdog auto-idle отключен по умолчанию (turn lifecycle теперь определяется только явными provider lifecycle событиями); добавлено regression покрытие на дефолтное поведение.
- Прогнаны обязательные гейты качества и таргетные сборки.
- Собран релиз: `codeai-hub-1.1.531.vsix`.
- Tarball-артефакты `1.1.531` подтверждены в `doc/tmp/releases/`.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `277d80ca fix(core): disable session runtime watchdog auto-idle by default`
- `5a0c1890 chore(qa): validate phase 112 watchdog disable gates`
- `407c12a9 docs(release): prepare release notes for phase 112 watchdog disable hotfix`
- `864b4364 chore(release): run build-all for phase 112 watchdog disable hotfix`
- `9ab75aaf chore(release): build and verify vsix for phase 112 watchdog disable hotfix`
- `dff61ce1 chore(plan): finalize phase 112 release stream hashes`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/TODO/todo-plan.md`
3. `doc/Sessions/Session122.md` (THIS REPORT)

## Plans for next session
1. Smoke-test `1.1.531` в PM UI:
   - Description collector (no-resume): ввод не должен становиться editable ни на одном этапе (placeholder/lock не должен исчезать mid-turn).
   - Reviewer: ввод разблокируется только после завершения turn (когда агент закончил последний ответ и ожидает следующий запрос пользователя).
2. Если smoke пройдёт: вернуться к Phase 106 backlog intake.
