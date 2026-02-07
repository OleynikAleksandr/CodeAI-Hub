# Session 110 — Phase 104 planning: workspace-scoped session/event isolation

**Date:** 2026-02-07 14:34 (CET)
**Branch:** main
**Version:** 1.1.522

---

# 1. Work Done in This Session

## Work summary
- Заархивирован завершённый план предыдущей фазы в `doc/TODO/Archive/todo-plan-phase103-workspace-isolation-prep-2026-02-07.md`.
- Создан новый `doc/TODO/todo-plan.md` с `Phase 104 — Project Manager Workspace-Scoped Session/Event Isolation`.
- В новый план добавлены критические инварианты изоляции:
  - scope-key = абсолютный `workspacePath`;
  - `workspaceSlug` используется как metadata/workflow id, но не как ключ изоляции;
  - defence-in-depth: UI не имеет права рендерить/фокусить/отправлять в out-of-scope session.
- В план включены обязательные пункты race-ordering/reconnect:
  - `workspace:scope:set` должен отправляться до `workspace-activate`/resume/create;
  - повторная отправка scope после reconnect;
  - явный anti-race контракт, чтобы не терять `session:created`/resume при переключении scope.
- Добавлен отдельный stream non-regression для сохранения текущего рабочего сценария reopen/resume после перезапуска.
- Добавлен релизный stream в конце `Phase 104` (`build-all` + `build-release`).

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `fe7398e9 docs(plan): archive phase103 todo and open phase104 workspace-scoped isolation`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/TODO/todo-plan.md`
3. `doc/TODO/Archive/todo-plan-phase103-workspace-isolation-prep-2026-02-07.md`
4. `doc/Sessions/Session109.md`
5. `doc/Sessions/Session110.md` (THIS REPORT)

## Runtime/code artifacts to read for fast context restore (Phase 104)
1. `src/client/project-manager/components/sessions/project-manager-session-view.tsx`
2. `src/client/project-manager/components/sessions/session-stream.ts`
3. `src/client/project-manager/components/sessions/session-visibility.ts`
4. `src/client/project-manager/components/sessions/session-message-sender.ts`
5. `src/client/ui/src/session/session-view.tsx`
6. `src/client/project-manager/components/layout/main-layout.tsx`
7. `src/client/project-manager/components/layout/workspace-tree.tsx`
8. `src/client/project-manager/api.ts`
9. `src/client/project-manager/core-stream-message-types.ts`
10. `packages/core/src/remote-bridge/types.ts`
11. `packages/core/src/remote-bridge/handlers/websocket-manager.ts`
12. `packages/core/src/remote-bridge/index.ts`
13. `packages/core/src/remote-bridge/handlers/workspace-activate-service.ts`
14. `src/client/project-manager/components/sessions/reviewer-session-visibility.ts`
15. `src/client/project-manager/services/idea-collector-submit-service.ts`

## Plans for next session
- Выполнить `Phase 104` строго по stream-порядку из `doc/TODO/todo-plan.md`.
- Начать с docs/design контракта (`workspacePath`-scoped изоляция, ordering, race-avoidance), затем перейти к PM/Core реализации и тестам.
- Отдельно проверить non-regression reopen/resume path после перезапуска (workspace tree -> resume -> reviewer visibility).
- После закрытия stream’ов выполнить release stream и зафиксировать артефакты в новом session report.
