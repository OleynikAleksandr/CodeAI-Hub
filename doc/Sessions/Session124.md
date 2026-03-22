# Session 124 — Post-Release Regression Feedback Planning Reset

**Date:** 2026-03-22 14:32 (CET)
**Branch:** main
**Version:** 1.1.762

---

# 1. Work Done in This Session

## Work summary
- Заархивирован завершённый `Phase 26` plan в `doc/TODO/Archive/todo-plan-up-to-phase26-2026-03-22.md` с финальным closing hash `8d47800b`.
- Создан новый planning-doc [PostRelease_Regression_Feedback_Architecture.md](/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-WorkFlow/Plans/PostRelease_Regression_Feedback_Architecture.md), который переводит следующий scope в режим live regression intake вместо спекулятивных фиксов.
- Активный [todo-plan.md](/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/TODO/todo-plan.md) полностью заменён на `Phase 27 — Post-Release Regression Feedback Loop`.
- Новый план сознательно оставлен в `intake mode`: реальные fix-streams будут добавляться только после первого подтверждённого system-level finding из пользовательского тестирования релиза `1.1.762`.
- Код и runtime в этой сессии не менялись; актуальный локальный baseline остаётся `codeai-hub-1.1.762.vsix`.

## Current active artifacts for next work
- Planning doc: [PostRelease_Regression_Feedback_Architecture.md](/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-WorkFlow/Plans/PostRelease_Regression_Feedback_Architecture.md)
- Active execution plan: [todo-plan.md](/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/TODO/todo-plan.md)
- Previous release/session baseline: [Session123.md](/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/Sessions/Session123.md)
- Archived completed plan: [todo-plan-up-to-phase26-2026-03-22.md](/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/TODO/Archive/todo-plan-up-to-phase26-2026-03-22.md)

## Working assumptions at this point
- Пользователь уже тестирует релиз `1.1.762` и будет приносить живой feedback по сообщениям агентов и артефактам.
- Следующая инженерная работа должна идти только от конкретных кейсов, а не от общего ощущения, что prompts/templates ещё можно «улучшить».
- Каждый новый кейс сначала классифицируется как `user-input issue`, `prompt/template/DoD issue`, `runtime/UI drift` или `non-issue`.

## Git commits
- `17e23bee docs(plan): start post-release regression feedback scope`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `AGENTS.md`
2. `README.md`
3. `doc/SolidWorks-WorkFlow/README.md`
4. `doc/SolidWorks-WorkFlow/Docs_Index.md`
5. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
6. `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
7. `doc/SolidWorks-WorkFlow/Plans/PostRelease_Regression_Feedback_Architecture.md`
8. `doc/TODO/todo-plan.md`
9. `doc/Sessions/Session123.md`
10. `doc/Sessions/Session124.md` (THIS REPORT)

## Git context recovery before coding
- Обязательно просмотреть через `git show --stat <hash>` и `git show <hash>` как минимум:
  - `8d47800b docs(session): record 1.1.762 idea legacy cleanup release`
  - `17e23bee docs(plan): start post-release regression feedback scope`
- Если нужно восстановить полный cleanup-context до текущего baseline, дополнительно просмотреть ключевые Phase 26 commits из [Session123.md](/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/Sessions/Session123.md).

## Plans for next session
- Продолжать live regression на `1.1.762` по реальным сообщениям агентов и артефактам.
- Для каждого пользовательского наблюдения сначала делать классификацию по модели из planning-doc, а не открывать fix-stream автоматически.
- После первого accepted system-level finding переписать `todo-plan.md` из intake-mode в конкретные микро-задачи с scope не больше `3` файлов на задачу.
- Если accepted findings не появятся, не придумывать speculative fixes и не открывать новый release scope искусственно.
