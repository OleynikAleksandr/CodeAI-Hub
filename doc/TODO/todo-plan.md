# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_DescriptionEntry_CopyRefactor.md`
  - `doc/BugRegistry.md`
- **Ограничение:** каждая подзадача должна затрагивать **≤ 3 файлов**.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `npm test`, `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:tsprune`, `npx ultracite fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **НИКОГДА** не обходить гейты (`--no-verify`).

---

## Phase 260 — Project Manager Description entry-copy alignment (owner: Oleksandr, updated: 2026-02-26)

**Проблема:** EmptyState слева в Session-регионе содержит legacy-инструкцию про запуск через кнопки сверху и не объясняет реальный `Description` flow через анкету в правой панели артефактов. Дополнительно CTA `Отправить анкету` и `Закрыть` остались на русском.

**Решение:** Привести entry-copy и CTA к актуальному UX-контракту: пользователь сначала заполняет анкету справа, затем нажимает `Submit questionnaire`, выбирает провайдера и запускает первую сессию.

---

### Stream 0: Contract sign-off (Design Phase gate)
1. [DONE] Подтвердить с пользователем контракт `ProjectManager_DescriptionEntry_CopyRefactor.md` и финальные формулировки EN-copy (scope: `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_DescriptionEntry_CopyRefactor.md`; expected commit: `docs(pm): approve description entry copy contract`).
2. [DONE] Git Commit: `docs(pm): approve description entry copy contract` (hash: 4333706b)

### Stream 1: Session EmptyState copy update
1. [DONE] Обновить текст в `src/client/ui/src/session/empty-state.tsx`: явная инструкция про заполнение анкеты в правой панели `Artifacts`, затем `Submit questionnaire`, затем выбор провайдера (scope: `src/client/ui/src/session/empty-state.tsx`; expected commit: `fix(pm): align empty-state copy with description questionnaire flow`).
2. [DONE] Git Commit: `fix(pm): align empty-state copy with description questionnaire flow` (hash: 8a04604c)

### Stream 2: Questionnaire CTA english labels
1. [DONE] Заменить `Отправить анкету` → `Submit questionnaire` и `Закрыть` → `Close` в Description questionnaire UI и shared copy, сохранив текущую логику submit/cancel (scope: `src/client/project-manager/components/description/description-questionnaire-panel.tsx`, `src/client/ui/src/app-host/session-region-questionnaire-copy.ts`; expected commit: `fix(pm): switch description questionnaire CTA labels to english`).
2. [DONE] Git Commit: `fix(pm): switch description questionnaire CTA labels to english` (hash: 7f9bbc5a)

### Stream 2.1: Typecheck blocker after stage-panel refactor
1. [DONE] Согласовать типы callback `handleFixStart` в `virtual-simulation`, `diagram-modules`, `diagram-facades` панелях с контрактом `WorkflowStepStartService` (scope: `src/client/project-manager/components/virtual-simulation/virtual-simulation-panel.tsx`, `src/client/project-manager/components/diagram-modules/diagram-modules-panel.tsx`, `src/client/project-manager/components/diagram-facades/diagram-facades-panel.tsx`; expected commit: `fix(pm): align stage panel fix callback types with workflow start service`).
2. [DONE] Git Commit: `fix(pm): align stage panel fix callback types with workflow start service` (hash: add13b6e)

### Stream 3: Verification and docs sync
1. [DONE] Проверить UI smoke (EmptyState + Description questionnaire submit path) и выполнить таргетную проверку `npm run typecheck:webview`; при изменении поведенческого контракта синхронно обновить релевантные doc-файлы (scope: `doc/BugRegistry.md` и/или `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` при необходимости, плюс затронутые UI-файлы; expected commit: `docs(pm): sync description entry copy behavior notes`).
2. [DONE] Git Commit: `docs(pm): sync description entry copy behavior notes` (hash: 4bae771c)

### Stream 4: Release notes sync
1. [DONE] Обновить `README.md` и `CHANGELOG.md` под новый релиз с описанием copy/CTA правок (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: update README and CHANGELOG for description entry copy refactor release`).
2. [DONE] Git Commit: `docs: update README and CHANGELOG for description entry copy refactor release` (hash: 3a018f4e)

### Stream 5: Mandatory release build (final)
1. [DONE] На чистом дереве выполнить `./scripts/build-all.sh` и зафиксировать обновлённые версии/манифесты (scope: release manifests + package versions; expected commit: `chore(release): build-all vX.Y.Z`).
2. [DONE] Git Commit: `chore(release): build-all v1.1.687` (hash: 844a8af5)
3. [IN_PROGRESS] Выполнить `./scripts/build-release.sh --use-current-version`, проверить строки `Verifying SDK exclusions`, `Removing dev dependencies...`, `✅ Package created`, зафиксировать артефакты и обновить `doc/Sessions/Session039.md` итогами релизной сборки (scope: `doc/Sessions/Session039.md`; expected commit: `docs(session): record phase260 release build results`).
4. [TODO] Git Commit: `docs(session): record phase260 release build results` (hash: TBD)
