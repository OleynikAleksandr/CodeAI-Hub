# Session 128 — Diagram Prompt Consistency Planning Handoff

**Date:** 2026-03-22 18:54 CET
**Branch:** main
**Version:** 1.1.764

---

# 1. Work Done in This Session

## Work summary
- Продолжен live regression на релизе `1.1.764` без новых кодовых фиксов.
- Подтверждён новый guiding principle для diagram prompts: проблема не в длине prompt pack, а только во внутренних contradictions, unsafe duplicates и wording drift.
- Зафиксировано пользовательское требование не вводить conditional runtime assembly prompt pack по признаку наличия артефакта: `Diagram Modules` / `Diagram Facades` должны и дальше получать always-full prompt pack.
- Подтверждена польза текущей `Product Part -> Cluster -> Module` модели на примере `Local Core Runtime`: пользователь лучше понял, почему runtime — это `Product Part`, а внутренние подсистемы materialize-ятся как несколько cluster-ов, а не как один общий cluster.
- Завершённый `Phase 28` plan заархивирован, открыт новый planning scope под actual prompt payload audit, DSL follow-up и autolayout follow-up, planning baseline зафиксирован commit-ом `2f4171a6`.

## Verification
- `git status --short`
- Ручная проверка:
  - `doc/TODO/todo-plan.md`
  - `doc/TODO/Archive/todo-plan-up-to-phase28-2026-03-22.md`
  - `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_PromptConsistency_And_Autolayout_Architecture.md`
  - `doc/Sessions/Session127.md`

## Git commits
- `2f4171a6 docs(plan): start diagram prompt consistency and autolayout scope`
- Current expected dirty tree before the next commit:
  - `doc/TODO/todo-plan.md`
  - `doc/Sessions/Session128.md`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `AGENTS.md`
2. `README.md`
3. `doc/SolidWorks-WorkFlow/README.md`
4. `doc/SolidWorks-WorkFlow/Docs_Index.md`
5. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
6. `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
7. `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_PromptConsistency_And_Autolayout_Architecture.md`
8. `doc/SolidWorks-WorkFlow/Plans/Diagram_UserFacing_Layout_And_Format_Architecture.md`
9. `doc/TODO/todo-plan.md`
10. `doc/Sessions/Session127.md`
11. `doc/Sessions/Session128.md` (THIS REPORT)

## Git context recovery before coding
- Обязательно просмотреть через `git show --stat <hash>` и `git show <hash>`:
  - `5c94b01c`
  - `3c90e71e`
  - `01d16679`
  - `f7a83522`
  - `e117207a`
  - `2f4171a6`
- Смысл: восстановить baseline `1.1.764`, словарь `Product Part`, removal of user-facing `Role` и возврат явного `Module` в diagram UI.

## First sanity check
- Сразу после старта проверить `git status --short`.
- Ожидаемое состояние, если текущая сессия не была дополнительно закоммичена:
  - `doc/TODO/todo-plan.md`
  - `doc/Sessions/Session128.md`

## Current working assumptions
- Always-full prompt pack для diagram stages сохраняется.
- Prompt length сама по себе не считается defect.
- Следующий audit должен искать только:
  - реальные contradictions;
  - unsafe duplicates;
  - wording drift между main prompt, field reference, merge rules и runtime footer.
- DSL и autolayout меняются только там, где это реально улучшает продукт.

## Plans for next session
- Провести contradiction audit по фактическому runtime payload `Diagram Modules`.
- Затем провести такой же audit по `Diagram Facades`.
- После подтверждения findings решить, какие fixes относятся к prompt assets, какие к user-facing DSL, а какие к autolayout/runtime rendering.
- После этого либо зафиксировать текущий handoff отдельным `docs(session)` commit, либо продолжить работу из ожидаемого dirty-tree состояния.
