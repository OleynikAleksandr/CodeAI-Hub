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
  - shared `useWorkspaceWorkflowState` переведён на adaptive fast/slow polling по свежести snapshot;
  - добавлен явный `requestWorkspaceWorkflowStateRefresh(...)` для submit-driven invalidation;
  - `DescriptionQuestionnairePanel` больше не форсит возврат к `questionnaire.md` после submit и вместо этого принудительно refresh'ит shared workflow-state;
  - static regression test обновлён под новый submit path.
- Таргетные проверки после фикса прошли:
  - `npm exec tsx --test src/client/project-manager/services/idea-collector-submit-service.open-fast.test.ts`
  - `npm run typecheck:webview`

## Git commits
- `7cc87097 docs(todo): track pm hydration regression repair`
- `68167149 fix(pm): refresh workflow state after description submit`

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
- Закрыть `Phase 301 / Stream 8`: не позволять PM возвращаться в pre-submit `Description Help` после `session:created`; использовать общий description session resolver и monotonic session presence внутри активного workspace.
- После этого повторить smoke на двух проблемных workspace из `Session072.md` и проверить tree hydration, session node, completed badge и отсутствие стробирования/отката к анкете.
- Только после зелёного smoke возвращаться к новому test release cycle.
