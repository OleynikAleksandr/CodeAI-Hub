# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Codex_FinalSummary_Reasoning_Rendering_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/Codex_FinalSummary_Reasoning_Rendering_Architecture.md`
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
- Stream завершается после того, как все его задачи закрыты таргетными сборками затронутых пакетов/клиентов и коммитами. Для серийных задач допускается диагностический прогон `npm run build --workspace <package>` по цепочке, чтобы локализовать ошибки без запуска `build-all`.
- **Real-time Документация**:
Любое изменение архитектуры/логики требует синхронного обновления и todo-plan.md и документации (`doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` и др.) **ДО** коммита - чтоб измененные документы также попали в Git Commit.
- Phase завершается на чистом дереве:
запускаем `./scripts/build-all.sh` (он повышает версии и вызывает `./scripts/build-release.sh --use-current-version`), переносим tarball’ы в `doc/tmp/releases/`, фиксируем результаты в `doc/Sessions/`.
- **doc/TODO/todo-plan.md** необходимо постоянно в риалтайме обновлять, после каждой подзадачи обязательный коммит, после каждого коммита его номер и наименование заносить, статус задачи тут же менять.

## Phase 1 — Codex Final Summary Reasoning Emission (owner: Codex, updated: 2026-04-19)
### Stream: Provider Reasoning Contract
1. [DONE] Перевести Codex reasoning с live readable chunking на final-summary emission: перестать публиковать `thinking` из `summaryTextDelta` / `textDelta`, а на `item/completed` эмитить отдельные block messages по canonical fallback order из planning-doc. scope: `packages/Codex_AppServer_Module/src/app-server/codex-app-server-event-router.ts`, `packages/Codex_AppServer_Module/src/app-server/codex-reasoning-live-buffer.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix: emit codex reasoning from completed summary blocks`
2. [DONE] Git Commit: `fix: emit codex reasoning from completed summary blocks` (hash: `eca37eaf6`)
3. [IN_PROGRESS] Добавить regression coverage для canonical final-summary emission, fallback path без `item.summary[]` и гарантии отсутствия token-level live bubbles; package-level `test` launcher нужен для discoverability/knip, а verification в этой среде фиксируется через direct compiled `node --test` run после `npm run build --workspace @codeai-hub/codex-app-server-module`. scope: `packages/Codex_AppServer_Module/src/app-server/codex-app-server-event-router.test.ts`, `packages/Codex_AppServer_Module/package.json`, `doc/TODO/todo-plan.md`; expected commit: `test: cover codex final-summary reasoning emission`
4. [TODO] Git Commit: `test: cover codex final-summary reasoning emission` (hash: TBD)

### Stream: Session UI Heading Rhythm Retest
1. [TODO] После provider-side фикса перепроверить standalone bold heading rhythm в Session UI и, если зазор после bold-only heading paragraph всё ещё инвертирован, внести минимальную CSS-коррекцию только для этого паттерна. scope: `media/session-view.css`, `doc/SolidWorks-WorkFlow/Plans/Codex_FinalSummary_Reasoning_Rendering_Architecture.md`, `doc/TODO/todo-plan.md`; expected commit: `fix(ui): tune standalone reasoning heading spacing`
2. [TODO] Git Commit: `fix(ui): tune standalone reasoning heading spacing` (hash: TBD)

## Phase 2 — SSOT Sync And Verification (owner: Codex, updated: 2026-04-19)
### Stream: Contract Documentation
1. [TODO] Синхронизировать SSOT после реализации: убрать из канона live readable chunking как user-facing reasoning contract и описать final-summary block emission как новый Codex reasoning baseline. scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`; expected commit: `docs: sync codex final-summary reasoning contract`
2. [TODO] Git Commit: `docs: sync codex final-summary reasoning contract` (hash: TBD)

### Stream: Targeted Verification
1. [TODO] Прогнать таргетную верификацию: build Codex app-server module, downstream confidence build для Core/Webview и manual smoke reasoning formatting на release-like сеансе; результаты зафиксировать в closeout docs. scope: `@codeai-hub/codex-app-server-module`, `@codeai-hub/core`, `webview`, `doc/TODO/todo-plan.md`; expected commit: `test: verify codex final-summary reasoning rendering`
2. [TODO] Git Commit: `test: verify codex final-summary reasoning rendering` (hash: TBD)
