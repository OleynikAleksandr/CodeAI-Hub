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
1. `doc/SolidWorks-Flow/System/ProjectManager_SessionPlacement_And_RunsPath_Architecture.md`
2. `doc/Architecture/Architecture.md`
3. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`

---

## Phase 46 — Project Manager: UI-сессия слева + анкета как артефакт справа (owner: Oleksandr, updated: 2026-01-17)

### Stream: Design approval
1. [DONE] Docs: утвердить решения (двойное открытие OK, миграции runs нет) — scope: `doc/SolidWorks-Flow/System/ProjectManager_SessionPlacement_And_RunsPath_Architecture.md`; expected commit message: `docs: approve pm session placement + runs path design`
2. [DONE] Git Commit: `docs: approve pm session placement + runs path design` (hash: 38a6aeb2)

### Stream: Questionnaire placement
1. [DONE] Refactor: показывать анкету Description в правой панели (Artifacts) — scope: `src/client/project-manager/components/layout/main-area.tsx`; expected commit message: `refactor(project-manager): move description questionnaire to artifacts panel`
2. [DONE] Git Commit: `refactor(project-manager): move description questionnaire to artifacts panel` (hash: 6d47a40b)

### Stream: Session panel (Project Manager)
1. [DONE] Fix: возвращать `sessionId` после submit и открывать/держать сессию в левой панели Sessions — scope: `src/client/project-manager/services/idea-collector-submit-service.ts`, `src/client/project-manager/components/description/description-questionnaire-panel.tsx`, `src/client/project-manager/components/layout/main-area.tsx`; expected commit message: `fix(project-manager): show idea session in sessions panel`
2. [DONE] Git Commit: `fix(project-manager): show idea session in sessions panel` (hash: 6d47a40b)
3. [DONE] UI: добавить базовые стили session panel — scope: `packages/ui/project-manager/styles.css`; expected commit message: `style(project-manager): session panel styles`
4. [DONE] Git Commit: `style(project-manager): session panel styles` (hash: 95a76d2a)

---

## Phase 47 — Storage: новый путь runs без `initiatives/` (owner: Oleksandr, updated: 2026-01-17)

### Stream: Runs base path
1. [DONE] Fix(initiatives): заменить root на `.codeai-hub/<workspaceSlug>/description/**` — scope: `packages/initiatives/src/index.ts`; expected commit message: `fix(initiatives): update base directories without initiatives`
2. [DONE] Git Commit: `fix(initiatives): update base directories without initiatives` (hash: 0ef55cd0)

3. [DONE] Fix(core): обновить валидацию/канонические пути для анкеты и артефактов — scope: `packages/core/src/remote-bridge/handlers/workspace-file-service.ts`, `packages/core/src/remote-bridge/handlers/idea-questionnaire-path-detector.ts`, `packages/core/src/remote-bridge/handlers/http-api-router.ts`; expected commit message: `fix(core): update runs paths without initiatives`
4. [DONE] Git Commit: `fix(core): update runs paths without initiatives` (hash: 8903cef0)

5. [DONE] Fix(ui): обновить пути артефактов/подсказок — scope: `src/client/ui/src/services/idea-collector-contract.ts`, `src/client/ui/src/app-host/idea-kickoff-prompt.ts`, `src/client/ui/src/app-host/session-region-idea-paths.ts`; expected commit message: `fix(ui): update runs paths without initiatives`
6. [DONE] Git Commit: `fix(ui): update runs paths without initiatives` (hash: 37400568)

7. [DONE] Fix(ui): обновить regex/резолвер пути анкеты — scope: `src/client/ui/src/services/idea-questionnaire-service.ts`; expected commit message: `fix(ui): update questionnaire paths without initiatives`
8. [DONE] Git Commit: `fix(ui): update questionnaire paths without initiatives` (hash: 635239a8)

9. [DONE] Fix(idea-collector): обновить output paths под новый runs root — scope: `packages/agents/idea-collector/src/paths/artifact-paths.ts`, `packages/agents/idea-collector/assets/idea-template.md`; expected commit message: `fix(idea-collector): update runs paths without initiatives`
10. [DONE] Git Commit: `fix(idea-collector): update runs paths without initiatives` (hash: 8f3c167f)


---

## Phase 48 — Release 1.1.431 (owner: Oleksandr, updated: 2026-01-17)
### Stream: Release notes
1. [DONE] Docs: обновить релизные заметки — scope: `README.md`, `CHANGELOG.md`, `doc/Architecture/Architecture.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `docs: update 1.1.431 release notes`
2. [DONE] Git Commit: `docs: update 1.1.431 release notes` (hash: d64ddb88)

### Stream: Release build
1. [DONE] Release: bump + build-all артефакты под 1.1.431 — scope: `package.json`, `package-lock.json`, `assets/*/manifest.json`, workspace `package.json`; expected commit message: `chore(release): bump 1.1.431`
2. [DONE] Git Commit: `chore(release): bump 1.1.431` (hash: 26e3571f)

### Stream: VSIX build
1. [DONE] Release: собрать VSIX `build-release.sh --use-current-version` — scope: `scripts/build-release.sh`; expected commit message: `chore(release): package vsix 1.1.431`
2. [DONE] Git Commit: `chore(release): package vsix 1.1.431` (hash: 17749ea9)

---

## Phase 49 — Release 1.1.432 (owner: Oleksandr, updated: 2026-01-17)
### Stream: Project Manager sessions UI parity
1. [DONE] Fix/Refactor: окно Sessions 1:1 как vscode-webview (tabs + dialog + TODO + input + status) — scope: `src/client/project-manager/components/sessions/project-manager-session-view.tsx`, `src/client/project-manager/components/sessions/session-stream.ts`, `src/client/project-manager/components/sessions/status-hydrator.ts`; expected commit message: `fix(project-manager): mirror webview session view`
2. [DONE] Git Commit: `fix(project-manager): mirror webview session view` (hash: 28cba8fd)
3. [DONE] Style: перенести webview session css в project-manager — scope: `packages/ui/project-manager/styles.css`; expected commit message: `style(project-manager): mirror webview session css`
4. [DONE] Git Commit: `style(project-manager): mirror webview session css` (hash: 5f5be757)

### Stream: Release notes
1. [DONE] Docs: обновить релизные заметки — scope: `README.md`, `CHANGELOG.md`, `doc/Architecture/Architecture.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `docs: update 1.1.432 release notes`
2. [DONE] Git Commit: `docs: update 1.1.432 release notes` (hash: f17dcec1)

### Stream: Release build
1. [DONE] Release: bump + build-all артефакты под 1.1.432 — scope: `package.json`, `package-lock.json`, `assets/*/manifest.json`, workspace `package.json`; expected commit message: `chore(release): bump 1.1.432`
2. [DONE] Git Commit: `chore(release): bump 1.1.432` (hash: cb8b997f)

### Stream: VSIX build
1. [DONE] Release: собрать VSIX `build-release.sh --use-current-version` — scope: `scripts/build-release.sh`; expected commit message: `chore(release): package vsix 1.1.432`
2. [DONE] Git Commit: `chore(release): package vsix 1.1.432` (hash: 0cddf972)

---

## Phase 50 — Release 1.1.433 (owner: Oleksandr, updated: 2026-01-17)
### Stream: Provider + PM fixes (Idea Collector finalize)
1. [DONE] Fix: Claude structured output — эмитить `suggested_response`/`artifacts[]` из `result` payload — scope: `packages/Claude_Module/src/messaging/message-processor.ts`, `packages/Claude_Module/src/messaging/structured-output-utils.ts`; expected commit message: `fix(claude-module): emit suggested response from result structured output`
2. [DONE] Git Commit: `fix(claude-module): emit suggested response from result structured output` (hash: b83b1863)
3. [DONE] Fix: Project Manager — для stage `idea` сохранять Idea Collector schema на последующих сообщениях (чтобы финализация возвращала `artifacts[]`) — scope: `src/client/project-manager/components/sessions/project-manager-session-view.tsx`, `src/client/project-manager/services/idea-collector-submit-service.ts`; expected commit message: `fix(project-manager): keep idea collector schema on chat`
4. [DONE] Git Commit: `fix(project-manager): keep idea collector schema on chat` (hash: a91b2f6a)

### Stream: Release notes
1. [DONE] Docs: обновить релизные заметки — scope: `README.md`, `CHANGELOG.md`, `doc/Architecture/Architecture.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `docs: update 1.1.433 release notes`
2. [DONE] Git Commit: `docs: update 1.1.433 release notes` (hash: 1980a2cc)

### Stream: Release build
1. [DONE] Release: bump + build-all артефакты под 1.1.433 — scope: `package.json`, `package-lock.json`, `assets/*/manifest.json`, workspace `package.json`; expected commit message: `chore(release): bump 1.1.433`
2. [DONE] Git Commit: `chore(release): bump 1.1.433` (hash: f0c240c8)

### Stream: VSIX build
1. [DONE] Release: собрать VSIX `build-release.sh --use-current-version` — scope: `scripts/build-release.sh`; expected commit message: `chore(release): package vsix 1.1.433`
2. [DONE] Git Commit: `chore(release): package vsix 1.1.433` (hash: 209e6e23)

---

## Phase 51 — Release 1.1.434 (owner: Oleksandr, updated: 2026-01-17)
### Stream: vscode-webview Idea Collector follow-up
1. [DONE] Fix: vscode-webview — stage `idea` сообщения всегда отправлять с Idea Collector schema; structured output сохранять даже после перезапуска UI — scope: `src/client/ui/src/app-host/session-store.ts`, `src/client/ui/src/services/idea-collector-service.ts`, `src/client/ui/src/services/idea-collector-schema-cache.ts`, `media/react-chat.js`; expected commit message: `fix(webview): keep idea collector schema on idea sessions`
2. [DONE] Git Commit: `fix(webview): keep idea collector schema on idea sessions` (hash: 6f1264b3)

### Stream: Release notes
1. [DONE] Docs: обновить релизные заметки — scope: `README.md`, `CHANGELOG.md`, `doc/Architecture/Architecture.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `docs: update 1.1.434 release notes`
2. [DONE] Git Commit: `docs: update 1.1.434 release notes` (hash: 190f85b5)

### Stream: Release build
1. [DONE] Release: bump + build-all артефакты под 1.1.434 — scope: `package.json`, `package-lock.json`, `assets/*/manifest.json`, workspace `package.json`; expected commit message: `chore(release): bump 1.1.434`
2. [DONE] Git Commit: `chore(release): bump 1.1.434` (hash: 41f4e852)

### Stream: VSIX build
1. [DONE] Release: собрать VSIX `build-release.sh --use-current-version` — scope: `scripts/build-release.sh`; expected commit message: `chore(release): package vsix 1.1.434`
2. [DONE] Git Commit: `chore(release): package vsix 1.1.434` (hash: 3cceaa48)

---

## Phase 52 — Claude: structured_output из result → stream_event + Release 1.1.435 (owner: Oleksandr, updated: 2026-01-17)

### Stream: Design approval
1. [DONE] Docs: зафиксировать архитектуру для Claude result structured_output — scope: `doc/SolidWorks-Flow/System/Claude_Result_StructuredOutput_Pipeline_Architecture.md`; expected commit message: `docs: add claude structured output pipeline design`
2. [DONE] Git Commit: `docs: add claude structured output pipeline design` (hash: d8cd4544)

### Stream: Claude result normalization
1. [DONE] Fix: нормализовать structured_output из result → stream_event + summary — scope: `packages/Claude_Module/src/messaging/message-processor.ts`, `doc/Architecture/Architecture.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `fix(claude-module): normalize result structured output pipeline`
2. [DONE] Git Commit: `fix(claude-module): normalize result structured output pipeline` (hash: d05ba8df)

### Stream: Release notes
1. [DONE] Docs: обновить релизные заметки — scope: `README.md`, `CHANGELOG.md`; expected commit message: `docs: update 1.1.435 release notes`
2. [DONE] Git Commit: `docs: update 1.1.435 release notes` (hash: ea392cf3)

### Stream: Release build
1. [DONE] Release: bump + build-all артефакты под 1.1.435 — scope: `package.json`, `package-lock.json`, `assets/*/manifest.json`, workspace `package.json`; expected commit message: `chore(release): bump 1.1.435`
2. [DONE] Git Commit: `chore(release): bump 1.1.435` (hash: 6434dfd5)

### Stream: VSIX build
1. [DONE] Release: собрать VSIX `build-release.sh --use-current-version` — scope: `scripts/build-release.sh`; expected commit message: `chore(release): package vsix 1.1.435`
2. [DONE] Git Commit: `chore(release): package vsix 1.1.435` (hash: 9662c80e)

