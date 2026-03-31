# Session 058 — Plan: Project Manager workflow navigation sync (Toolbar ↔ Tree ↔ Panels)

**Date:** 2026-03-05 16:35 (CET)
**Branch:** main
**Version:** 1.1.708

---

# 1. Work Done in This Session

## Work summary
- Проанализирован UI-баг рассинхронизации выбора шага между верхним Toolbar и левым деревом workflow.
- Подтверждён root cause на уровне кода: `activeTool` (Toolbar/highlight + header) и “открытая dialog-сессия/артефакт” обновляются разными путями и не имеют единого SSOT.
- Заархивирован предыдущий `doc/TODO/todo-plan.md` (Phase 282–283) и создан новый TODO план под Phase 284 (PM navigation sync).
- Подготовлен план Phase 284 с микро‑задачами и Stream релизной сборки.

## Root cause (observed)
- `MainArea` держит локальный `activeTool`, который:
  - сбрасывается на `Description` при смене workspace;
  - обновляется при клике по Toolbar;
  - **не обновляется** при кликах по artifact/session/stage в левом дереве.
- Левое дерево напрямую диспатчит `pm:artifact:selected` и `pm:dialog:open`, но не синхронизирует `activeTool`.
- Header правой панели (`Artifacts`) кастомизируется только для `Description`, поэтому при рассинхроне появляется неверное имя шага и пропадают кнопки `Artifacts/Help`.

## Git commits
(ВАЖНО: список для восстановления контекста в следующей сессии через `git show`)
- `a86944b4 docs(plan): archive phase283 and plan pm navigation sync`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/Docs_Index.md`
2. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
3. `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
4. `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
5. `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
6. `doc/TODO/todo-plan.md`
7. `doc/Sessions/Archive/Session058.md` (THIS REPORT)

## High-signal code files for the fix
- `src/client/project-manager/components/layout/main-area.tsx`
- `src/client/project-manager/components/layout/main-area-utils.ts`
- `src/client/project-manager/components/layout/use-workflow-tool-select.ts`
- `src/client/project-manager/components/layout/use-stage-panel-sync.ts`
- `src/client/project-manager/components/layout/workspace-tree.tsx`
- `src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts`
- `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.ts`
- `src/client/project-manager/components/layout/workspace-tree-auto-select.ts`

## Plans for next session
- Начать с `Phase 284 / Stream 0`:
  - зафиксировать SSOT/контракт навигации (stage selection) и согласовать его;
  - затем перейти к Stream 1 и начать кодовые изменения микро-задачами (≤3 файла на задачу, отдельный commit после каждой).
