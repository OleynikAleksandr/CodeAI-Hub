# Session 074 — PM Hydration Regression Repair

**Date:** 2026-03-12 14:53 (CET)
**Branch:** main
**Version:** 1.1.718

---

# 1. Work Done in This Session

## Work summary
- После пользовательского smoke на `v1.1.718` подтверждён PM-side regression: workflow в фоне создаёт `Final_Description.md`, но PM остаётся на `Description Help`/анкете и не гидратит workflow tree своевременно.
- Зафиксирован новый repair track в `todo-plan` и обновлён SSOT `ProjectManager_WorkflowState_Reconciliation.md`: shared `workflow-state` обязан оставаться hot вокруг submit и не может полагаться только на slow poll.
- Реализован первый кодовый фикс repair track:
- Реализованы два кодовых фикса repair track:
  - shared `useWorkspaceWorkflowState` переведён на adaptive fast/slow polling по свежести snapshot;
  - добавлен явный `requestWorkspaceWorkflowStateRefresh(...)` для submit-driven invalidation;
  - `DescriptionQuestionnairePanel` больше не форсит возврат к `questionnaire.md` после submit и вместо этого принудительно refresh'ит shared workflow-state;
  - `MainArea` больше не деградирует обратно в pre-submit `Description Help` внутри активного workspace после уже полученного `session:created`;
  - `workspace-tree-auto-select` переведён на общий `resolveDescriptionSession(...)`, чтобы Description auto-open не зависел только от legacy `branch.session`;
  - static/source regression tests обновлены под новый submit/session path.
- Таргетные проверки после фикса прошли:
  - `npm exec tsx --test src/client/project-manager/services/idea-collector-submit-service.open-fast.test.ts`
  - `npm exec tsx --test src/client/project-manager/components/layout/description-workflow-state.test.ts`
  - `npm run typecheck:webview`
  - `npm run build:webview`
- После закрытия обоих repair-stream пользователь запросил новый тестовый релиз; release-facing docs синхронизируются под `v1.1.719` до запуска `build-all/build-release`.

## Git commits
- `7cc87097 docs(todo): track pm hydration regression repair`
- `68167149 fix(pm): refresh workflow state after description submit`
- `3caab5ab docs(session): record pm hydration repair progress`
- `dcd02f6e fix(pm): preserve description session after submit`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/Docs_Index.md`
2. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
3. `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowState_Reconciliation.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session072.md`
6. `doc/Sessions/Session074.md` (THIS REPORT)

## Plans for next session
- Повторить smoke на двух проблемных workspace из `Session072.md` и проверить tree hydration, session node, completed badge и отсутствие стробирования/отката к анкете.
- После сборки нового тестового релиза установить его и повторить smoke на тех же workspace.
- Только после зелёного smoke возвращаться к новому test release cycle.
