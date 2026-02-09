# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream с микрозадачами.
- Каждая микрозадача затрагивает ≤ 3 файлов.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Gates после каждой микрозадачи: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.
- Коммит делаем только после зелёных гейтов; сразу обновляем статусы и hash.

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/System/ProjectManager/AddWorkspace_Architecture.md`
3. `doc/Sessions/Session051.md`
4. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 79 — Project Manager: Add Workspace UX fixes (owner: Oleksandr, updated: 2026-01-23)

### Stream: macOS folder picker + clean workspace start
1. [DONE] Feat(cef-launcher): macOS Finder folder picker для Add Workspace (вернуть абсолютный путь в UI) — scope: `packages/cef-launcher/src/launcher_handler.cc`, `packages/cef-launcher/src/platform/mac/launcher_handler_mac.mm`, `packages/cef-launcher/src/launcher_handler.h`; expected commit message: `feat(cef-launcher): mac folder picker for add workspace`
2. [DONE] Git Commit: `feat(cef-launcher): mac folder picker for add workspace` (hash: 7d27ffd6)

3. [DONE] Fix(project-manager): использовать macOS folder picker в `Add workspace` (fallback: ручной ввод пути оставить) — scope: `src/client/project-manager/api.ts`; expected commit message: `fix(project-manager): use mac folder picker in add workspace`
4. [DONE] Git Commit: `fix(project-manager): use mac folder picker in add workspace` (hash: 6f25a3c0)

5. [DONE] Fix(project-manager): при смене workspace сбрасывать выбранный артефакт/просмотрщик (не показывать артефакт из другого workspace) — scope: `src/client/project-manager/components/layout/main-area.tsx`; expected commit message: `fix(project-manager): reset artifact on workspace switch`
6. [DONE] Git Commit: `fix(project-manager): reset artifact on workspace switch` (hash: 69fb3723)

7. [DONE] Feat(project-manager): если выбранный workspace новый/чистый (нет артефактов в `.codeai-hub/<workspaceSlug>/`) — авто-открывать анкету описания и начинать процесс с нуля — scope: `src/client/project-manager/components/layout/main-area.tsx`, `src/client/project-manager/components/layout/main-area-utils.ts`, `src/client/project-manager/services/workflow-state-helpers.ts`; expected commit message: `feat(project-manager): open questionnaire on empty workspace`
8. [DONE] Git Commit: `feat(project-manager): open questionnaire on empty workspace` (hash: 6f4d5af4)

9. [DONE] Fix(project-manager): сброс состояния анкеты при смене workspace — scope: `src/client/project-manager/components/description/description-questionnaire-panel.tsx`; expected commit message: `fix(project-manager): reset questionnaire state on workspace change`
10. [DONE] Git Commit: `fix(project-manager): reset questionnaire state on workspace change` (hash: d1686f90)

11. [DONE] Docs: обновить архитектуру под macOS picker + clean workspace start — scope: `doc/SolidWorks-Flow/System/SystemArchitecture.md`, `doc/SolidWorks-Flow/System/ProjectManager/AddWorkspace_Architecture.md`; expected commit message: `docs: document add-workspace ux fixes`
12. [DONE] Git Commit: `docs: document add-workspace ux fixes` (hash: 0afed1f2)

13. [DONE] Fix(scripts): корректно читать версию лаунчера из manifest — scope: `scripts/build-cef-launcher.sh`; expected commit message: `fix(scripts): resolve launcher version from manifest`
14. [DONE] Git Commit: `fix(scripts): resolve launcher version from manifest` (hash: 66ccbbab)

15. [DONE] Verification: прогнать гейты + таргетные сборки `npm run build:project-manager` и `./scripts/build-cef-launcher.sh` (macOS) — scope: scripts; expected commit message: `chore: verify add-workspace ux fixes`
16. [DONE] Git Commit: `chore: verify add-workspace ux fixes` (hash: 583b3cf8)

---

## Phase 80 — Project Manager: auto-select added workspace (owner: Oleksandr, updated: 2026-01-23)

### Stream: add workspace auto-select
1. [DONE] Fix(project-manager): после Add Workspace автоматически выбирать добавленный workspace — scope: `src/client/project-manager/components/layout/main-layout.tsx`; expected commit message: `fix(project-manager): auto-select added workspace`
2. [DONE] Git Commit: `fix(project-manager): auto-select added workspace` (hash: f5ed100d)

3. [DONE] Docs: обновить архитектуру под auto-select при Add Workspace — scope: `doc/SolidWorks-Flow/System/SystemArchitecture.md`, `doc/SolidWorks-Flow/System/ProjectManager/AddWorkspace_Architecture.md`; expected commit message: `docs: document auto-select on add workspace`
4. [DONE] Git Commit: `docs: document auto-select on add workspace` (hash: d2b8d76b)

5. [DONE] Verification: прогнать гейты + таргетную сборку `npm run build:project-manager` — scope: scripts; expected commit message: `chore: verify auto-select add workspace`
6. [DONE] Git Commit: `chore: verify auto-select add workspace` (hash: d804b32e)

---

## Phase 81 — Project Manager: sync tree selection on workspace switch (owner: Oleksandr, updated: 2026-01-23)

### Stream: auto-select session + artifact on workspace change
1. [DONE] Fix(project-manager): при смене workspace автоматически выбирать последнюю сессию и артефакт из дерева — scope: `src/client/project-manager/components/layout/workspace-tree.tsx`, `src/client/project-manager/components/layout/workspace-tree-auto-select.ts`, `src/client/project-manager/components/layout/workspace-tree-model.ts`; expected commit message: `fix(project-manager): sync tree selection on workspace switch`
2. [DONE] Git Commit: `fix(project-manager): sync tree selection on workspace switch` (hash: 08ef9b4c)

3. [DONE] Docs: описать auto-select сессии/артефакта при смене workspace — scope: `doc/SolidWorks-Flow/System/SystemArchitecture.md`, `doc/SolidWorks-Flow/System/ProjectManager/AddWorkspace_Architecture.md`; expected commit message: `docs: document workspace switch auto-select`
4. [DONE] Git Commit: `docs: document workspace switch auto-select` (hash: 2a85c2f9)

5. [DONE] Verification: прогнать гейты + таргетную сборку `npm run build:project-manager` — scope: scripts; expected commit message: `chore: verify workspace switch auto-select`
6. [DONE] Git Commit: `chore: verify workspace switch auto-select` (hash: f2d3634a)

---

## Phase 82 — Project Manager: questionnaire stays editable until submit (owner: Oleksandr, updated: 2026-02-01)

### Stream: questionnaire editor state
1. [DONE] Fix(project-manager): не показывать `questionnaire.md` как read-only артефакт до отправки анкеты — scope: `src/client/project-manager/components/layout/main-area.tsx`, `src/client/project-manager/components/layout/workspace-tree-auto-select.ts`, `src/client/project-manager/components/layout/use-main-area-workflow-state.ts`; expected commit message: `fix(project-manager): keep questionnaire editable until submit`
2. [DONE] Git Commit: `fix(project-manager): keep questionnaire editable until submit` (hash: 3f32e71f)
