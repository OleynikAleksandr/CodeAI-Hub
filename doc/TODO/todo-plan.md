# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Codex_Commentary_And_ThinkingBlockFormatting_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/Codex_Commentary_And_ThinkingBlockFormatting_Architecture.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_FinalSummary_Reasoning_Rendering_Architecture.md`
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

## Phase 1 — Codex Commentary Restoration (owner: Codex, updated: 2026-04-20)
### Stream: App-Server Commentary Phase
1. [DONE] Восстановить `phase: "commentary"` в Codex app-server path как non-terminal `dialog_message` c `role: "assistant"` и `tag: "commentary"`, не затрагивая terminal `final_answer`, и покрыть separation regression test. scope: `packages/Codex_AppServer_Module/src/app-server/codex-app-server-event-router.ts`, `packages/Codex_AppServer_Module/src/app-server/codex-app-server-event-router.test.ts`; verification: `npm exec -- tsx --test packages/Codex_AppServer_Module/src/app-server/codex-app-server-event-router.test.ts`, `npm run build --workspace @codeai-hub/codex-app-server-module`; expected commit: `fix(codex): restore commentary dialog messages`
2. [DONE] Git Commit: `fix(codex): restore commentary dialog messages` (hash: `f6c31bde0`)

## Phase 2 — Thinking Block Boundary Formatting (owner: Codex, updated: 2026-04-20)
### Stream: Thinking Merge Boundary
1. [DONE] Сделать merge соседних thinking fragments block-aware: сохранять пустую строку перед standalone bold heading block, не добавлять лишний разрыв между heading и body и не ломать marker-only list repair / localizedContent merge. scope: `src/client/ui/src/session/dialog-panel-message-utils.ts`, `src/client/ui/src/session/dialog-panel-message-utils.test.ts`; verification: `npm exec -- tsx --test src/client/ui/src/session/dialog-panel-message-utils.test.ts`; expected commit: `fix(ui): preserve thinking heading boundaries`
2. [DONE] Git Commit: `fix(ui): preserve thinking heading boundaries` (hash: `e4684d19b`)

### Stream: Session Heading Spacing
1. [DONE] Перепроверить и при необходимости ужесточить Session markdown spacing rule так, чтобы standalone bold heading paragraphs всегда имели gap только перед собой, но не между heading и body, без регрессии ordered/unordered list spacing. scope: `media/session-view.css`; implementation note: zero-gap правило после standalone bold heading сузили с wildcard `+ *` до явных paragraph/list blocks, чтобы сохранить контракт точечно и не трогать посторонние соседние элементы; expected commit: `fix(ui): normalize session heading spacing`
2. [DONE] Git Commit: `fix(ui): normalize session heading spacing` (hash: `a03377a8a`)

## Phase 3 — SSOT Sync And Targeted Verification (owner: Codex, updated: 2026-04-20)
### Stream: Core SSOT Sync
1. [DONE] Синхронизировать SSOT после реализации: зафиксировать возврат Codex commentary в dialog trail и новый contract для thinking heading-boundary rendering. scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`; expected commit: `docs: sync Codex commentary and thinking formatting contract`
2. [DONE] Git Commit: `docs: sync Codex commentary and thinking formatting contract` (hash: `082dfbb79`)

### Stream: Response Mode Contract
1. [DONE] Обновить Codex response-mode contract: явно зафиксировать, что `Hybrid`/passthrough path обязан сохранять non-terminal commentary в app-server линии и не сводить user-facing progress только к reasoning/final answer. scope: `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`; expected commit: `docs: note Codex hybrid commentary preservation`
2. [DONE] Git Commit: `docs: note Codex hybrid commentary preservation` (hash: `8d97cf965`)

### Stream: Targeted Verification
1. [DONE] Прогнать таргетную verification цепочку: `npm run build --workspace @codeai-hub/codex-app-server-module`, `node --test packages/Codex_AppServer_Module/dist/app-server/codex-app-server-event-router.test.js`, `npm exec -- tsx --test src/client/ui/src/session/dialog-panel-message-utils.test.ts`, `npm run build:webview` — результаты зафиксировать в todo-plan. results: all green on `main` after commits `f6c31bde0`, `e4684d19b`, `a03377a8a`, `082dfbb79`, `8d97cf965`; expected commit: `test: verify Codex commentary and thinking formatting`
2. [DONE] Git Commit: `test: verify Codex commentary and thinking formatting` (hash: `0083f12ea`)

## Phase 4 — Release Build 1.2.27 (owner: Codex, updated: 2026-04-20)
### Stream: Release Notes Preparation
1. [DONE] Подготовить release docs под будущую версию `1.2.27`: обновить `README.md`, `CHANGELOG.md` и синхронизировать active `todo-plan.md` перед release pipeline. scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.27 release notes`
2. [DONE] Git Commit: `docs: prepare 1.2.27 release notes` (hash: `946fde7bf`)

### Stream: Release Build
1. [IN_PROGRESS] Выполнить release checklist для `1.2.27`: `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, проверить `codeai-hub-1.2.27.vsix` и fresh tarballs, зафиксировать version/manifest updates и release artifacts. status note: `./scripts/build-all.sh` passed and produced `1.2.27` tarballs/manifests; `build-release.sh --use-current-version` pending after clean-tree commit. scope: release pipeline / generated manifests / `doc/TODO/todo-plan.md`; expected commit: `build: release 1.2.27`
2. [TODO] Git Commit: `build: release 1.2.27` (hash: TBD)

## Phase 5 — Execution Cycle Closeout (owner: Codex, updated: 2026-04-20)
### Stream: Planning Archive
1. [TODO] Перенести planning-doc в `Plans/Archive/` и обновить `Docs_Index.md` под закрытый Codex formatting scope. scope: `doc/SolidWorks-WorkFlow/Plans/Codex_Commentary_And_ThinkingBlockFormatting_Architecture.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: archive Codex commentary and thinking formatting planning doc`
2. [TODO] Git Commit: `docs: archive Codex commentary and thinking formatting planning doc` (hash: TBD)

### Stream: TODO Plan Closeout
1. [TODO] Заархивировать завершённый active todo-plan и восстановить placeholder `doc/TODO/todo-plan.md`. scope: `doc/TODO/todo-plan.md`, `doc/TODO/Archive/todo-plan-1.2.27-codex-commentary-and-thinking-formatting-release.md`; expected commit: `docs: close 1.2.27 todo-plan after build`
2. [TODO] Git Commit: `docs: close 1.2.27 todo-plan after build` (hash: TBD)
