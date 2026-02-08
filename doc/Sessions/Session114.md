# Session 114 — Планирование Phase 107 (Snapshot-First Lock Lifecycle)

**Date:** 2026-02-08 08:42 (CET)
**Branch:** main
**Version:** 1.1.525

---

# 1. Work Done in This Session

## Work summary
- Проведен анализ регрессии блокировки поля ввода в PM UI после рефакторинга snapshot-first.
- Зафиксирована причинно-следственная цепочка: после перехода на snapshot-only lock (без stream-overlay) появилось окно преждевременного unlock между collector и auto-start reviewer.
- Согласовано целевое долгосрочное направление: строгое разделение pipeline (`workspace:snapshot` как единственный источник runtime lock-state, `session:stream` только для контента/token usage) при обязательном расширении snapshot-контракта переходными lock-данными.
- Обновлен `doc/TODO/todo-plan.md`: добавлена `Phase 107 — Snapshot-First Lock Lifecycle Hardening`, разбитая на Stream/микрозадачи с обязательными `Git Commit` пунктами.
- В `Phase 107` добавлен отдельный `Stream: Release Build` (подготовка релизных доков, `build-all`, `build-release`, верификация артефактов).
- Код не менялся, гейты/сборки в этой сессии не запускались (изменения только в плане и документации сессии).

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `NO-COMMIT` В этой сессии коммиты не выполнялись; рабочее дерево содержит изменения в `doc/TODO/todo-plan.md` и `doc/Sessions/Session114.md`.

### Context commits to inspect before implementation (обязательный контекст регрессии)
- `9541d337 feat(pm): consume continuity lock stream events`
- `7c0ebcf1 fix(pm): avoid transient unlock during continuity decision`
- `777e4be9 test(ui): prevent transient unlock between turn end and continuity lock`
- `5b7dbc76 fix(pm): clear rollover pending state after continuity unlock`
- `1764a9cb fix(ui): resolve effective lock after rollover unlock`
- `1a9cccc7 feat(pm): derive input lock from workspace snapshot instead of stream events`
- `ebe1c331 fix(pm): stop mutating connection lock state from stream events; snapshot authoritative`
- `0611f91d test(pm): assert snapshot-driven lock and remove legacy turn_state expectations`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/TODO/todo-plan.md`
3. `doc/Sessions/Session113.md`
4. `doc/Sessions/Session114.md` (THIS REPORT)
5. `doc/TODO/Archive/todo-plan-phase105-workspace-runtime-mvp-2026-02-08.md`

## Required code/context artifacts to restore full technical context
1. `src/client/project-manager/components/sessions/session-stream.ts`
2. `src/client/project-manager/components/sessions/token-usage-stream.ts`
3. `src/client/project-manager/services/workspace-snapshot-store.ts`
4. `src/client/project-manager/components/sessions/project-manager-session-view.tsx`
5. `src/client/ui/src/session/session-view.tsx`
6. `src/client/ui/src/session/input-panel.tsx`
7. `src/client/project-manager/core-stream-message-types.ts`
8. `packages/core/src/workspace-runtime/workspace-runtime-types.ts`
9. `packages/core/src/workspace-runtime/workspace-wire-types.ts`
10. `packages/core/src/workspace-runtime/session-runtime.ts`
11. `packages/core/src/workspace-runtime/workspace-runtime-facade.ts`
12. `packages/core/src/remote-bridge/handlers/session-request-handler.ts`
13. `packages/core/src/workflow/runtime/workflow-runtime.ts`
14. `src/client/project-manager/components/sessions/token-usage-stream.test.ts`
15. `src/client/project-manager/components/sessions/session-stream.test.ts`
16. `src/client/ui/src/session/input-panel.test.tsx`
17. `packages/core/src/workspace-runtime/workspace-runtime-facade.test.ts`
18. `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`
19. `packages/core/src/remote-bridge/index.test.ts`

## Plans for next session
- Зафиксировать/закоммитить обновленный `doc/TODO/todo-plan.md` и этот отчет, чтобы начать реализацию Phase 107 с чистым контекстом.
- Начать реализацию `Phase 107` со `Stream: Snapshot Contract (Core)` по микро-задачам из `todo-plan.md` с соблюдением ограничения ≤3 файлов на подзадачу.
- Внести расширение snapshot-контракта переходными lock-полями, затем пробросить их в runtime flush и закрыть core-регрессии тестами.
- После core-части выполнить `Stream: PM/UI Pipeline Separation` (строгое разделение snapshot/stream responsibilities).
- Обновить архитектурную документацию в реальном времени по мере изменений (до каждого коммита).
- После закрытия всех Stream запустить релизный поток `Stream: Release Build` (`build-all` → фиксация версионных изменений → `build-release` → верификация VSIX/tarball).
