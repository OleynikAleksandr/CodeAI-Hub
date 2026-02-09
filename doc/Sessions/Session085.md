# Session 85 — Phase 97 planning: seamless continuity + input lock

**Date:** 2026-02-04 14:26 (CET)
**Branch:** main
**Version:** 1.1.506

---

# 1. Work Done in This Session

## Work summary
- По результатам тестов rollover/continuity сформулирована целевая UX-концепция: пользователь видит непрерывный чат, а физические continuation-сегменты должны быть максимально «под капотом».
- В `doc/TODO/todo-plan.md` добавлена **Phase 97** с реализационным планом (turn lifecycle → единый `turn_state` → input lock → V2 индикаторы ожидания → полировка rollover UI → silent preemptive rollover).

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `c47728df docs(todo): add Phase 97 seamless continuity plan`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/TODO/todo-plan.md`
2. `doc/SolidWorks-Flow/SessionContinuity/NodeSessionContinuity_Architecture.md`
3. `doc/SolidWorks-Flow/SessionContinuity/ContinuityReport_Contracts.md`
4. `doc/SolidWorks-Flow/SessionContinuity/CodexSessionContinuity_Settings_Architecture.md`
5. `doc/Sessions/Session083.md`
6. `doc/Sessions/Session085.md` (THIS REPORT)

## Required code hotspots to review before work (Phase 97)
1. `src/client/ui/src/session/session-view.tsx` (rollover banners + agent working banner logic)
2. `src/client/ui/src/session/dialog-panel.tsx` (Thinking объединение/рендер)
3. `src/client/project-manager/components/sessions/token-usage-stream.ts` (rollover events → connectionState/rollover state)
4. `packages/Claude_Module/src/messaging/message-processor.ts` (Claude `type="result"` как turn boundary)
5. `packages/Codex_Module/src/messaging/message-processor.ts` (Codex `turn.started/turn.completed`)
6. `packages/Gemini_Module/src/session/gemini-session-manager.ts` (Gemini streaming + abort controller)
7. `packages/core/src/remote-bridge/handlers/session-request-handler.ts` (агрегация provider events + continuity rollover)

## Plans for next session
- Реализовать Phase 97 строго по `doc/TODO/todo-plan.md`, начиная с Stream: design (арх-док) и дальнейших микрозадач с ≤3 файлами на задачу.
- В процессе реализации убрать из UI упоминания времени ожидания ("1–6 минут") и оставить единственную универсальную индикацию ожидания `Agent is working…` (с заметной анимацией).
