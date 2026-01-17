# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое колличество - Stream (стрим), в каждом Стриме - некоторое кол-во подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Если по факту разработки оказывается, что конкретная подзазача Stream затрагивает больше 3 файлов - такая задача должна быть разбита на более мелкие и список задач в Стриме переписывается.
- **Gates**: после выполнения каждой подзадачи прогоняется Гейт Качества -
`scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем выполняем таргетную сборку (`npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`).
- **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт `todo-plan.md` (дата, статус, хеш).
- **Real-time Документация**: любое изменение протоколов/архитектуры требует синхронного обновления документов из `doc/` **до** коммита.

## Required documents to review before work
1. `doc/Project_Docs/ProjectManager_SessionPlacement_And_RunsPath_Architecture.md`
2. `doc/Architecture/Architecture.md`
3. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`

---

## Phase 46 — Project Manager: UI-сессия слева + анкета как артефакт справа (owner: Oleksandr, updated: 2026-01-17)

### Stream: Design approval
1. [DONE] Docs: утвердить решения (двойное открытие OK, миграции runs нет) — scope: `doc/Project_Docs/ProjectManager_SessionPlacement_And_RunsPath_Architecture.md`; expected commit message: `docs: approve pm session placement + runs path design`
2. [TODO] Git Commit: `docs: approve pm session placement + runs path design` (hash: TBD)

### Stream: Questionnaire placement
1. [DONE] Refactor: показывать анкету Description в правой панели (Artifacts) — scope: `src/client/project-manager/components/layout/main-area.tsx`; expected commit message: `refactor(project-manager): move description questionnaire to artifacts panel`
2. [TODO] Git Commit: `refactor(project-manager): move description questionnaire to artifacts panel` (hash: TBD)

### Stream: Session panel (Project Manager)
1. [DONE] Fix: возвращать `sessionId` после submit и открывать/держать сессию в левой панели Sessions — scope: `src/client/project-manager/services/idea-collector-submit-service.ts`, `src/client/project-manager/components/description/description-questionnaire-panel.tsx`, `src/client/project-manager/components/layout/main-area.tsx`; expected commit message: `fix(project-manager): show idea session in sessions panel`
2. [TODO] Git Commit: `fix(project-manager): show idea session in sessions panel` (hash: TBD)
3. [DONE] UI: добавить базовые стили session panel — scope: `packages/ui/project-manager/styles.css`; expected commit message: `style(project-manager): session panel styles`
4. [TODO] Git Commit: `style(project-manager): session panel styles` (hash: TBD)

---

## Phase 47 — Storage: новый путь runs без `initiatives/` (owner: Oleksandr, updated: 2026-01-17)

### Stream: Runs base path
1. [DONE] Fix(initiatives): заменить root на `.codeai-hub/<workspaceSlug>/description/**` — scope: `packages/initiatives/src/index.ts`; expected commit message: `fix(initiatives): update base directories without initiatives`
2. [TODO] Git Commit: `fix(initiatives): update base directories without initiatives` (hash: TBD)

3. [DONE] Fix(core): обновить валидацию/канонические пути для анкеты и артефактов — scope: `packages/core/src/remote-bridge/handlers/workspace-file-service.ts`, `packages/core/src/remote-bridge/handlers/idea-questionnaire-path-detector.ts`, `packages/core/src/remote-bridge/handlers/http-api-router.ts`; expected commit message: `fix(core): update runs paths without initiatives`
4. [TODO] Git Commit: `fix(core): update runs paths without initiatives` (hash: TBD)

5. [DONE] Fix(ui): обновить пути артефактов/подсказок — scope: `src/client/ui/src/services/idea-collector-contract.ts`, `src/client/ui/src/app-host/idea-kickoff-prompt.ts`, `src/client/ui/src/app-host/session-region-idea-paths.ts`; expected commit message: `fix(ui): update runs paths without initiatives`
6. [TODO] Git Commit: `fix(ui): update runs paths without initiatives` (hash: TBD)

7. [DONE] Fix(ui): обновить regex/резолвер пути анкеты — scope: `src/client/ui/src/services/idea-questionnaire-service.ts`; expected commit message: `fix(ui): update questionnaire paths without initiatives`
8. [TODO] Git Commit: `fix(ui): update questionnaire paths without initiatives` (hash: TBD)

9. [DONE] Fix(idea-collector): обновить output paths под новый runs root — scope: `packages/agents/idea-collector/src/paths/artifact-paths.ts`, `packages/agents/idea-collector/assets/idea-template.md`; expected commit message: `fix(idea-collector): update runs paths without initiatives`
10. [TODO] Git Commit: `fix(idea-collector): update runs paths without initiatives` (hash: TBD)

