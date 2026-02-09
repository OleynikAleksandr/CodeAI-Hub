# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое колличество - Stream (стрим), в каждом Стриме - некоторое кол-во подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Если по факту разработки оказывается, что конкретная подзазача Stream затрагивает больше 3 файлов - такая задача должна быть разбита на более мелкие и список задач в Стриме переписывается.
- **Gates**: после выполнения каждой подзадачи прогоняется Гейт Качества -
  - `./scripts/check-architecture.sh`
  - `npx ultracite check`
  - `npx ts-prune`
  - `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`
  - `npm run check:links`
  - затем таргетная сборка (минимально необходимая для затронутого пакета/клиента).
- **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт этого файла (дата, статус, хеш).
- Phase завершается на чистом дереве.

---

## Phase 2 — Action Bar Flow entry (owner: Oleksandr, updated: 2026-01-07)

### Stream: UI — Action Bar entry buttons

1. [DONE] Заменить 4 кнопки Action Bar на 5 Flow кнопок: `Simple Chat`, `Idea`, `Spec`, `Plan`, `Execute` (scope: `src/client/ui/src/components/action-bar/index.tsx`, `media/main-view.css`; commit: `refactor(ui): replace action bar with flow entry buttons`) (date: 2026-01-07)
2. [DONE] Git Commit: `refactor(ui): replace action bar with flow entry buttons` (hash: 74af863) (date: 2026-01-07)

3. [DONE] Пробросить stage в событие открытия выбора провайдера и обработчик в UI (scope: `src/client/ui/src/app-host/webview-message-types.ts`, `src/client/ui/src/app-host/webview-message-dispatcher.ts`, `src/client/ui/src/app-host/use-provider-picker-open-handler.ts`; commit: `feat(ui): include stage in provider picker open message` + `refactor(ui): extract provider picker open handler`) (date: 2026-01-07)
4. [DONE] Git Commit: `feat(ui): include stage in provider picker open message` (hash: d08db9d) (date: 2026-01-07)
5. [DONE] Git Commit: `refactor(ui): extract provider picker open handler` (hash: 16addd2) (date: 2026-01-07)

### Stream: Host routing — Extension + Standalone web-client

6. [DONE] Добавить команды старта по stage и открыть provider picker с фильтрацией провайдеров (scope: `src/extension-module/home-view-message-router/message-types.ts`, `src/extension-module/home-view-message-router/command-handler.ts`; commit: `feat(extension): start sessions from flow action bar`) (date: 2026-01-07)
7. [DONE] Git Commit: `feat(extension): start sessions from flow action bar` (hash: e155a7a) (date: 2026-01-07)

8. [DONE] Поддержать команды stage в Standalone `web-client` окружении (scope: `src/client/web-client/environment.ts`, `src/client/web-client/standalone-flow-start.ts`; commit: `feat(web-client): start sessions from flow action bar`) (date: 2026-01-07)
9. [DONE] Git Commit: `feat(web-client): start sessions from flow action bar` (hash: 16c6838) (date: 2026-01-07)

### Stream: Bundles + Docs

10. [DONE] Пересобрать webview bundle под новый Action Bar (scope: `media/react-chat.js`; commit: `chore(webview): rebuild bundle for flow action bar`) (date: 2026-01-07)
11. [DONE] Git Commit: `chore(webview): rebuild bundle for flow action bar` (hash: 38ede99) (date: 2026-01-07)

12. [DONE] Обновить релизные документы (README/CHANGELOG) под 1.1.391 (scope: `README.md`, `CHANGELOG.md`; commit: `docs(release): add 1.1.391 notes`) (date: 2026-01-07)
13. [DONE] Git Commit: `docs(release): add 1.1.391 notes` (hash: a218e83) (date: 2026-01-07)

14. [DONE] Обновить архитектурные документы + дизайн-док под Action Bar (scope: `doc/Architecture/Architecture.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`, `doc/SolidWorks-Flow/System/UIFlow_EntrySelection_Architecture.md`; commit: `docs(architecture): align docs with flow action bar`) (date: 2026-01-07)
15. [DONE] Git Commit: `docs(architecture): align docs with flow action bar` (hash: 818ce65) (date: 2026-01-07)

### Stream: Release 1.1.391

16. [DONE] Поднять версии и собрать tarball'ы через `./scripts/build-all.sh` (scope: build scripts + workspaces; commit: `chore(release): bump versions to 1.1.391`) (date: 2026-01-07)
17. [DONE] Git Commit: `chore(release): bump versions to 1.1.391` (hash: 16832fd) (date: 2026-01-07)

18. [DONE] Собрать VSIX: `./scripts/build-release.sh --use-current-version` (scope: release script; expected: `codeai-hub-1.1.391.vsix`) (date: 2026-01-07)
19. [DONE] Git Commit: `docs(sessions): add Session064 release report` (hash: 806180c) (date: 2026-01-07)


---

## Phase 3 — Provider picker Back fix (owner: Oleksandr, updated: 2026-01-07)

### Stream: UI — Back behavior for Action Bar starts

1. [DONE] Заблокировать возврат к stage picker при старте из Action Bar (scope: `src/client/ui/src/app-host/provider-picker-state.ts`, `src/client/ui/src/app-host/use-provider-picker-open-handler.ts`, `src/client/ui/src/app-host.tsx`; commit: `fix(ui): lock stage selection for action bar starts`) (date: 2026-01-07)
2. [DONE] Git Commit: `fix(ui): lock stage selection for action bar starts` (hash: 0a39cc1) (date: 2026-01-07)

3. [DONE] Сделать Back = Cancel для стартов из Action Bar (не показывать Flow wizard) (scope: `src/client/ui/src/app-host/session-region.tsx`, `src/client/ui/src/app-host.tsx`; commit: `fix(ui): back closes picker for action bar flow`) (date: 2026-01-07)
4. [DONE] Git Commit: `fix(ui): back closes picker for action bar flow` (hash: b82571a) (date: 2026-01-07)

5. [DONE] Прокинуть `stageSelectionLocked` в `SessionRegion` (scope: `src/client/ui/src/app-host.tsx`; commit: `fix(ui): wire stage selection lock to session region`) (date: 2026-01-07)
6. [DONE] Git Commit: `fix(ui): wire stage selection lock to session region` (hash: 5e41be4) (date: 2026-01-07)

7. [DONE] Пересобрать webview bundle после UX фикса (scope: `media/react-chat.js`; commit: `chore(webview): rebuild bundle`) (date: 2026-01-07)
8. [DONE] Git Commit: `chore(webview): rebuild bundle` (hash: ba20446) (date: 2026-01-07)

### Stream: Release 1.1.392

9. [DONE] Поднять версии и собрать tarball'ы через `./scripts/build-all.sh` (scope: manifests + workspaces; commit: `chore(release): bump versions to 1.1.392`) (date: 2026-01-07)
10. [DONE] Git Commit: `chore(release): bump versions to 1.1.392` (hash: 6b0cbbd) (date: 2026-01-07)

11. [DONE] Обновить релизные и архитектурные документы под 1.1.392 (scope: `README.md`, `CHANGELOG.md`, `doc/Architecture/Architecture.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; commit: `docs(release): add 1.1.392 back navigation fix`) (date: 2026-01-07)
12. [DONE] Git Commit: `docs(release): add 1.1.392 back navigation fix` (hash: f2d7c3f) (date: 2026-01-07)

13. [DONE] Собрать VSIX: `./scripts/build-release.sh --use-current-version` (scope: release script; expected: `codeai-hub-1.1.392.vsix`) (date: 2026-01-07)
14. [DONE] Git Commit: `docs(sessions): add Session065 release report` (hash: 7eef43a) (date: 2026-01-07)

---

## Phase 4 — Workflow Architecture (Description stage) alignment (owner: Oleksandr, updated: 2026-01-08)

### Stream: Idea Collector — Description stage contract refresh

1. [DONE] Обновить prompt/template для Idea Collector под новые правила Description (без диаграмм, модульность/фасады, стрелки текстом) (scope: `packages/agents/idea-collector/assets/idea-collector-prompt.md`, `packages/agents/idea-collector/assets/idea-template.md`; commit: `docs(idea): align idea collector prompt and template with workflow architecture`) (date: 2026-01-08)
2. [DONE] Git Commit: `docs(idea): align idea collector prompt and template with workflow architecture` (hash: e3456ae)

3. [DONE] Обновить анкету Description с упором на модульную декомпозицию (scope: `packages/agents/idea-collector/assets/questionnaire-template.md`; commit: `docs(idea): refresh description questionnaire for modular decomposition`) (date: 2026-01-08)
4. [DONE] Git Commit: `docs(idea): refresh description questionnaire for modular decomposition` (hash: e3456ae)

5. [DONE] Обновить schema формулировки и пересобрать bundled templates для Core (scope: `packages/agents/idea-collector/assets/idea-collector-schema.json`, `packages/core/src/templates/bundled-templates.ts`; commit: `chore(core): sync bundled idea templates with updated assets`) (date: 2026-01-08)
6. [DONE] Git Commit: `chore(core): sync bundled idea templates with updated assets` (hash: e3456ae)

### Stream: Docs + Release

7. [DONE] Обновить архитектурные документы под новый релиз (scope: `doc/Architecture/Architecture.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; commit: `docs(architecture): update workflow docs for next release`) (date: 2026-01-08)
8. [DONE] Git Commit: `docs(architecture): update workflow docs for next release` (hash: b6e087f)

9. [DONE] Обновить релизные документы (scope: `README.md`, `CHANGELOG.md`; commit: `docs(release): add 1.1.393 notes`) (date: 2026-01-08)
10. [DONE] Git Commit: `docs(release): add 1.1.393 notes` (hash: d247496)

11. [DONE] Поднять версии и собрать tarball'ы через `./scripts/build-all.sh` (scope: manifests + workspaces; commit: `chore(release): bump versions to 1.1.393`) (date: 2026-01-08)
12. [DONE] Git Commit: `chore(release): bump versions to 1.1.393` (hash: 421f364)

13. [DONE] Собрать VSIX: `./scripts/build-release.sh --use-current-version` (scope: release script; expected: `codeai-hub-1.1.393.vsix`) (date: 2026-01-08)
14. [DONE] Git Commit: `docs(sessions): add Session067 release report` (hash: 3ac5ee0) (date: 2026-01-08)
