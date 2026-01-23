# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream с микрозадачами.
- Каждая микрозадача затрагивает ≤ 3 файлов.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Gates после каждой микрозадачи: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.
- Коммит делаем только после зелёных гейтов; сразу обновляем статусы и hash.

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/Project_Docs/ProjectManager/AddWorkspace_Architecture.md`
3. `doc/Sessions/Session051.md`
4. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 79 — Project Manager: Add Workspace UX fixes (owner: Oleksandr, updated: 2026-01-23)

### Stream: macOS folder picker + clean workspace start
1. [TODO] Feat(cef-launcher): macOS Finder folder picker для Add Workspace (вернуть абсолютный путь в UI) — scope: `packages/cef-launcher/src/launcher_handler.cc`, `packages/cef-launcher/src/platform/mac/launcher_handler_mac.mm`; expected commit message: `feat(cef-launcher): mac folder picker for add workspace`
2. [TODO] Git Commit: `feat(cef-launcher): mac folder picker for add workspace` (hash: TBD)

3. [TODO] Fix(project-manager): использовать macOS folder picker в `Add workspace` (fallback: ручной ввод пути оставить) — scope: `src/client/project-manager/api.ts`, `src/client/project-manager/components/layout/main-layout.tsx`; expected commit message: `fix(project-manager): use mac folder picker in add workspace`
4. [TODO] Git Commit: `fix(project-manager): use mac folder picker in add workspace` (hash: TBD)

5. [TODO] Fix(project-manager): при смене workspace сбрасывать выбранный артефакт/просмотрщик (не показывать артефакт из другого workspace) — scope: `src/client/project-manager/components/layout/main-area.tsx`, `src/client/project-manager/components/layout/main-layout.tsx`; expected commit message: `fix(project-manager): reset artifact on workspace switch`
6. [TODO] Git Commit: `fix(project-manager): reset artifact on workspace switch` (hash: TBD)

7. [TODO] Feat(project-manager): если выбранный workspace новый/чистый (нет артефактов в `.codeai-hub/<workspaceSlug>/`) — авто-открывать анкету описания и начинать процесс с нуля — scope: `src/client/project-manager/components/layout/main-area.tsx`, `src/client/project-manager/services/workflow-state-client.ts`, `src/client/project-manager/components/description/description-questionnaire-panel.tsx`; expected commit message: `feat(project-manager): open questionnaire on empty workspace`
8. [TODO] Git Commit: `feat(project-manager): open questionnaire on empty workspace` (hash: TBD)

9. [TODO] Docs: обновить архитектуру под macOS picker + clean workspace start — scope: `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`, `doc/Project_Docs/ProjectManager/AddWorkspace_Architecture.md`; expected commit message: `docs: document add-workspace ux fixes`
10. [TODO] Git Commit: `docs: document add-workspace ux fixes` (hash: TBD)

11. [TODO] Verification: прогнать гейты + таргетные сборки `npm run build:project-manager` и `./scripts/build-cef-launcher.sh` (macOS) — scope: scripts; expected commit message: `chore: verify add-workspace ux fixes`
12. [TODO] Git Commit: `chore: verify add-workspace ux fixes` (hash: TBD)
