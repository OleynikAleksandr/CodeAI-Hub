# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Claude_SessionListMarker_Formatting_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/Claude_SessionListMarker_Formatting_Architecture.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Translation_LatinCyrillic_Spacing_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое колличество - Stream (стрим), в каждом Стриме - некоторое кол-во подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Если по факту разработки оказывается, что конкретная подзазача Stream затрагивает больше 3 файлов - такая задача должна быть разбита на более мелкие и список задач в Стриме переписывается.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
  - Ручной прогон этих команд обычно не нужен (только для диагностики).
- **Таргетные сборки** выполняем вручную только когда нужно проверить затронутый пакет/клиент, и обязательно перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`.
- **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт `todo-plan.md` (дата, статус, хеш).
- Stream завершается после того, как все его задачи закрыты таргетными сборками затронутых пакетов/клиентов и коммитами. Для серийных задач допускается диагностический прогон `npm run build --workspace <package>` по цепочке, чтобы локализовать ошибки без запуска `build-all`.
- **Real-time Документация**:
Любое изменение архитектуры/логики требует синхронного обновления и todo-plan.md и документации (`doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` и др.) **ДО** коммита - чтоб измененные документы также попали в Git Commit.
- Phase завершается на чистом дереве:
запускаем `./scripts/build-all.sh` (он повышает версии и вызывает `./scripts/build-release.sh --use-current-version`), переносим tarball’ы в `doc/tmp/releases/`, фиксируем результаты в `doc/Sessions/`.
- **doc/TODO/todo-plan.md** необходимо постоянно в риалтайме обновлять, после каждой подзадачи обязательный коммит, после каждого коммита его номер и наименование заносить, статус задачи тут же менять.

## Phase 1 — Claude Live Marker-Safe Boundaries (owner: Codex, updated: 2026-04-20)
### Stream: Thinking Marker Boundary
1. [DONE] Запретить marker-only flush в Claude thinking live buffer, добавить regression guard для кейса `2.` → `First-run experience` и безопасный fallback для thinking translation path без обязательного `runtimeTurnConfig`. scope: `packages/Claude_Module/src/messaging/claude-thinking-live-buffer.ts`, `packages/Claude_Module/src/messaging/claude-stream-event-router.ts`, `packages/Claude_Module/src/messaging/claude-stream-event-router.test.ts`; expected commit: `fix(claude): prevent thinking list-marker split`
2. [DONE] Git Commit: `fix(claude): prevent thinking list-marker split` (hash: `e387a4a41`)

### Stream: Assistant Live Text Marker Boundary
1. [DONE] Запретить marker-only flush в Claude text live buffer, добавить regression guard для кейса `1.`/`2.` без item body и безопасный fallback для text-path при отсутствии `runtimeTurnConfig`. scope: `packages/Claude_Module/src/messaging/claude-text-live-buffer.ts`, `packages/Claude_Module/src/messaging/claude-content-stream-handler.ts`, `packages/Claude_Module/src/messaging/claude-text-live-buffer.test.ts`; expected commit: `fix(claude): prevent live text list-marker split`
2. [DONE] Git Commit: `fix(claude): prevent live text list-marker split` (hash: `534f7ca7f`)

## Phase 2 — Session UI Merge And Rendering (owner: Codex, updated: 2026-04-20)
### Stream: Thinking Merge Repair
1. [DONE] Сделать thinking merge marker-aware, чтобы split boundary `2.` + `First-run experience` склеивалась обратно в один markdown list item, и покрыть это UI unit test. scope: `src/client/ui/src/session/dialog-panel-message-utils.ts`, `src/client/ui/src/session/dialog-panel-message-utils.test.ts`; expected commit: `fix(ui): repair split Claude thinking list markers`
2. [DONE] Git Commit: `fix(ui): repair split Claude thinking list markers` (hash: `f957679fc`)

### Stream: Ordered List Marker Rendering
1. [DONE] Перевести Session dialog list markers на outside positioning без потери compact spacing для nested lists. scope: `media/session-view.css`; expected commit: `fix(ui): render session ordered-list markers outside`
2. [DONE] Git Commit: `fix(ui): render session ordered-list markers outside` (hash: `30a798d4b`)

## Phase 3 — SSOT Sync And Targeted Verification (owner: Codex, updated: 2026-04-20)
### Stream: Contract Documentation
1. [DONE] Синхронизировать SSOT после реализации: зафиксировать marker-safe live flush contract для Claude и UI-side ordered-list rendering contract. scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Modules/Claude.md`, `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`; expected commit: `docs: sync Claude session list-marker contract`
2. [DONE] Git Commit: `docs: sync Claude session list-marker contract` (hash: `d7ac9127a`)

### Stream: Targeted Verification
1. [DONE] Прогнать таргетную verification цепочку: `npm run build --workspace @codeai-hub/claude-module`, `node --test packages/Claude_Module/dist/messaging/claude-text-live-buffer.test.js packages/Claude_Module/dist/messaging/claude-stream-event-router.test.js`, `npm exec -- tsx --test src/client/ui/src/session/dialog-panel-message-utils.test.ts`, `npm run build:webview` — все зелёные; результаты зафиксировать в todo-plan. scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify Claude session list-marker formatting`
2. [DONE] Git Commit: `test: verify Claude session list-marker formatting` (hash: `023f12715`)

## Phase 4 — Release Build 1.2.26 (owner: Codex, updated: 2026-04-20)
### Stream: Release Notes Preparation
1. [DONE] Подготовить release docs под будущую версию `1.2.26`: обновить `README.md`, `CHANGELOG.md` и синхронизировать active `todo-plan.md` перед release pipeline. scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.26 release notes`
2. [TODO] Git Commit: `docs: prepare 1.2.26 release notes` (hash: TBD)

### Stream: Release Build
1. [TODO] Выполнить release checklist для `1.2.26`: `build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, зафиксировать version/manifest updates и release artifacts. scope: release pipeline / generated manifests / `doc/TODO/todo-plan.md`; expected commit: `build: release 1.2.26`
2. [TODO] Git Commit: `build: release 1.2.26` (hash: TBD)

## Phase 5 — Execution Cycle Closeout (owner: Codex, updated: 2026-04-20)
### Stream: Planning Archive
1. [TODO] Перенести planning-doc в `Plans/Archive/` и обновить `Docs_Index.md` под закрытый scope. scope: `doc/SolidWorks-WorkFlow/Plans/Claude_SessionListMarker_Formatting_Architecture.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: archive Claude list-marker formatting planning doc`
2. [TODO] Git Commit: `docs: archive Claude list-marker formatting planning doc` (hash: TBD)

### Stream: TODO Plan Closeout
1. [TODO] Заархивировать завершённый active todo-plan и восстановить placeholder `doc/TODO/todo-plan.md`. scope: `doc/TODO/todo-plan.md`, `doc/TODO/Archive/todo-plan-1.2.26-claude-session-list-marker-formatting-release.md`; expected commit: `docs: close 1.2.26 todo-plan after build`
2. [TODO] Git Commit: `docs: close 1.2.26 todo-plan after build` (hash: TBD)
