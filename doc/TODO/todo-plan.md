# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Codex_AppServer_LiveReasoning_And_SDK_Log_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/Codex_AppServer_LiveReasoning_And_SDK_Log_Architecture.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`
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
- Stream завершается после того, как все его задачи закрыты таргетными сборками затронутых пакетов/клиентов и коммитами. Для серийных задач допускается диагностический прогон `npm run build --workspace <package>` по цепочке (например, Claude → Codex → core), чтобы локализовать ошибки без запуска `build-all`.
- **Real-time Документация**:
Любое изменение архитектуры/логики требует синхронного обновления и todo-plan.md и документации (`doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` и др.) **ДО** коммита - чтоб измененные документы также попали в Git Commit.
- Phase завершается на чистом дереве:
запускаем `./scripts/build-all.sh` (он повышает версии и вызывает `./scripts/build-release.sh --use-current-version`), переносим tarball’ы в `doc/tmp/releases/`, фиксируем результаты в `doc/Sessions/`.
- **doc/TODO/todo-plan.md** необходимо постоянно в риалтайме обновлять, после каждой подзадачи обязательный коммит, после каждого коммита его номер и наименование заносить, статус задачи тут же менять.

## Phase 0 — Execution Cycle Bootstrap (owner: Codex, updated: 2026-04-19)
### Stream: Planning Activation
1. [DONE] Открыть новый execution cycle: добавить active planning-doc в `doc/SolidWorks-WorkFlow/Plans/`, зарегистрировать его в `doc/SolidWorks-WorkFlow/Docs_Index.md` и заменить placeholder active планом выполнения в `doc/TODO/todo-plan.md`. scope: `doc/SolidWorks-WorkFlow/Plans/Codex_AppServer_LiveReasoning_And_SDK_Log_Architecture.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: open codex app-server reasoning-log execution cycle`
2. [DONE] Git Commit: `docs: open codex app-server reasoning-log execution cycle` (hash: `75a1301f8`)

## Phase 1 — Codex App-Server Live Reasoning Repair (owner: Codex, updated: 2026-04-19)
### Stream: Reasoning Policy Baseline
1. [DONE] Настроить live-capable reasoning summary policy в `packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.ts` и при необходимости `packages/Codex_AppServer_Module/src/types/index.ts`; убрать stale `experimentalRawEvents`, не меняя outward provider contract. scope: `packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.ts`, `packages/Codex_AppServer_Module/src/types/index.ts`; expected commit: `fix: enable codex app-server live reasoning policy`
2. [DONE] Git Commit: `fix: enable codex app-server live reasoning policy` (hash: `86e37e27d`)
3. [DONE] Синхронизировать Codex SSOT под новый reasoning policy contract в `doc/SolidWorks-WorkFlow/Modules/Codex.md` и `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. scope: `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `docs: sync codex live reasoning policy ssot`
4. [DONE] Git Commit: `docs: sync codex live reasoning policy ssot` (hash: `b325a3d32`)

### Stream: Incremental Reasoning Router
1. [DONE] Добавить инкрементальный `thinking` emission из `item/reasoning/summaryTextDelta` и `item/reasoning/textDelta`, сохранив `item/completed` как flush/fallback path; при необходимости вынести live-buffer/helper в отдельный micro-class. scope: `packages/Codex_AppServer_Module/src/app-server/codex-app-server-event-router.ts`, `packages/Codex_AppServer_Module/src/app-server/*reasoning*.ts`, `packages/Codex_AppServer_Module/src/provider/codex-provider-adapter.ts`; expected commit: `fix: stream codex reasoning deltas incrementally`
2. [DONE] Git Commit: `fix: stream codex reasoning deltas incrementally` (hash: `b6414dca9`)
3. [DONE] Синхронизировать Codex docs под новый delta-driven reasoning contract и emission-time behavior. scope: `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`; expected commit: `docs: sync codex reasoning delta contract`
4. [DONE] Git Commit: `docs: sync codex reasoning delta contract` (hash: `91c978426`)

### Stream: SDK Log Restore
1. [DONE] Вернуть file-backed app-server session logger в `~/.codeai-hub/logs/codex` через новый logging helper и wiring в process layer без изменения публичного adapter surface. scope: `packages/Codex_AppServer_Module/src/app-server/process/codex-app-server-process.ts`, `packages/Codex_AppServer_Module/src/app-server/*logger*.ts`, `packages/Codex_AppServer_Module/src/types/index.ts`; expected commit: `feat: restore codex app-server sdk log`
2. [DONE] Git Commit: `feat: restore codex app-server sdk log` (hash: `7b573e2ae`)
3. [DONE] Синхронизировать diagnostics/logging documentation для новой app-server линии. scope: `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`; expected commit: `docs: sync codex app-server logging diagnostics`
4. [DONE] Git Commit: `docs: sync codex app-server logging diagnostics` (hash: `ead344470`)

### Stream: Codex Module Build Hygiene
1. [DONE] Убрать stale `dist` outputs из release path: перед компиляцией app-server пакета очищать `dist`, чтобы удалённые `*.test.*` artefacts не попадали в `codex-module-*.tar.bz2`. scope: `packages/Codex_AppServer_Module/package.json`, `doc/TODO/todo-plan.md`; expected commit: `fix: clean codex app-server dist before build`
2. [DONE] Git Commit: `fix: clean codex app-server dist before build` (hash: `b16ca6123`)

## Phase 2 — Verification And Release (owner: Codex, updated: 2026-04-19)
### Stream: Targeted Verification
1. [DONE] Прогнать таргетные проверки app-server линии: smoke probe reasoning delta flow, `npm run build --workspace @codeai-hub/codex-app-server-module`, при необходимости `npm run build --workspace @codeai-hub/core`, и зафиксировать результаты в closeout docs. Результат: clean rebuild пакета проходит; stale `dist` test artefacts больше не остаются; живой smoke через `CodexAppServerFacade` на `gpt-5.4` завершился успешно (`thinkingMessages=3`, `assistantMessages=1`, log file `~/.codeai-hub/logs/codex/sdk-codex-app-server-2026-04-19T15-30-53-834Z-994b06cf-862d-43e3-b7d6-bd2b7e74d11f.jsonl`, `item/reasoning/*Delta` entries: `97`). scope: `@codeai-hub/codex-app-server-module`, `@codeai-hub/core`, `doc/TODO/todo-plan.md`; expected commit: `test: verify codex app-server live reasoning path`
2. [TODO] Git Commit: `test: verify codex app-server live reasoning path` (hash: TBD)

### Stream: Release Notes And New Release Build
1. [TODO] Подготовить будущую release line `1.2.23`: обновить `README.md`, `CHANGELOG.md` и связанные архитектурные документы под новый app-server behavior до запуска release scripts. scope: `README.md`, `CHANGELOG.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`; expected commit: `docs: prepare 1.2.23 release notes`
2. [TODO] Git Commit: `docs: prepare 1.2.23 release notes` (hash: TBD)
3. [TODO] Выполнить release checklist: чистое дерево, `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, проверить release artefacts, заархивировать completed plan, закрыть planning-doc, подготовить новый session report и вернуть active `todo-plan.md` в placeholder. scope: release pipeline / generated manifests / closeout docs; expected commit: `build: release 1.2.23`
4. [TODO] Git Commit: `build: release 1.2.23` (hash: TBD)
