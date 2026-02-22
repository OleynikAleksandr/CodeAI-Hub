# Description → Reviewer — Contract (SSOT)

## Назначение
Контракт шага Workflow Tree: Questionnaire → draft `description.md` → auto-start Reviewer → `Final_Description.md`.

## Артефакты
- Draft: `.codeai-hub/<workspaceSlug>/description/description.md`
- Final: `.codeai-hub/<workspaceSlug>/description/Final_Description.md`

## Инварианты
- Description agent — one-shot/no-resume: после финального ответа остаётся terminal/read-only.
- Reviewer — resume-сессия; при правках перезаписывает `Final_Description.md`.
- После появления `Final_Description.md` в ветке шага остаются: `Final_Description.md` + `Reviewer <Provider>`.

## Связанные контракты
- Dialog routing: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- Workspace runtime/lock: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
