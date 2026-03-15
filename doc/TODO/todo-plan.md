# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Дополнительно перед стартом этого scope открыть: `AGENTS.md`, `doc/SolidWorks-WorkFlow/README.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`, `doc/SolidWorks-WorkFlow/Plans/FlowNodeContinuity_OneShotBoundary_Architecture.md`, `doc/Sessions/Session077.md`, `doc/Sessions/Session078.md`.
- Execution-plan основан на planning-доке `doc/SolidWorks-WorkFlow/Plans/FlowNodeContinuity_OneShotBoundary_Architecture.md`.
- TODO Plan состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стримов), в каждом стриме - микро-задачи.
- Каждая микро-задача затрагивает не более 3 файлов или пакетов.
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`.
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- Husky gates не обходить (`--no-verify` запрещен).
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита.
- Таргетные сборки выполнять перед закрытием затронутого Stream/Phase.

---

## Phase 1 — Defer flow-node rollover to the one-shot boundary (owner: Oleksandr, updated: 2026-03-15)

### Stream: Core post-turn arbitration for document nodes
1. [DONE] Перестроить flow-node continuity arbitration в Core: threshold breach на `token_usage` должен только кешироваться во время активного one-shot turn, а `rolloverFlowNodeSession()` должен запускаться только после `turn_completed` или после trailing `token_usage` уже в pending post-turn state (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit: `fix(core): defer continuity rollover until turn completion`).
2. [DONE] Git Commit: `fix(core): defer continuity rollover until turn completion` (hash: `13a8092b`)
3. [DONE] Добавить regression tests на оба порядка provider events: `Gemini` (`token_usage -> turn_completed`) и `Claude/Codex` (`turn_completed -> token_usage`), чтобы rollover не мог стартовать внутри незавершённого one-shot turn и при этом поздний usage всё ещё завершал pending arbitration (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`; expected commit: `test(core): guard flow-node rollover turn boundary`).
4. [DONE] Git Commit: `test(core): guard flow-node rollover turn boundary` (hash: `e171e6a0`)
5. [DONE] Синхронизировать continuity SSOT и session report по новому инварианту: flow-node rollover начинается только после завершения текущего one-shot turn; зафиксировать таргетную верификацию и результаты smoke после фикса (scope: `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`, `doc/Sessions/Session078.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(core): record flow-node continuity turn boundary`).
6. [DONE] Git Commit: `docs(core): record flow-node continuity turn boundary` (hash: `f6ac1d8f`)

---

## Phase 2 — Local release build after continuity boundary fix (owner: Oleksandr, updated: 2026-03-15)

### Stream: Release assembly for flow-node continuity fix
1. [DONE] После закрытия Core fix/tests/docs актуализировать release-facing docs под следующий локальный релиз с continuity boundary fix: синхронизировать `README.md`, `CHANGELOG.md` и execution-plan перед сборкой, зафиксировав новый product delta (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): prep flow-node continuity boundary release`).
2. [DONE] Git Commit: `docs(release): prep flow-node continuity boundary release` (hash: `9065c280`)
3. [DONE] На чистом дереве выполнить `./scripts/build-all.sh`, зафиксировать новый unified/workspace version, обновлённые manifests и release tarball-артефакты по release checklist (scope: `package.json`, workspace `package.json`, `assets/**/manifest.json`, `doc/tmp/releases/`; expected commit: `chore(release): build flow-node continuity boundary release`).
4. [DONE] Git Commit: `chore(release): build flow-node continuity boundary release` (hash: `5b25b8cb`)
5. [DONE] Выполнить `./scripts/build-release.sh --use-current-version`, проверить новый VSIX и синхронизировать session report + execution-plan по финальному релизному состоянию, включая результаты релизной проверки (scope: `codeai-hub-<version>.vsix`, `doc/Sessions/Session078.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(session): record flow-node continuity boundary release`).
6. [DONE] Git Commit: `docs(session): record flow-node continuity boundary release` (hash: `78e0dbd4`)

---

## Phase 3 — Post-release SSOT sync and GitHub publication (owner: Oleksandr, updated: 2026-03-15)

### Stream: System/Core continuity invariants
1. [DONE] Синхронизировать системный и кластерный SSOT под релиз `1.1.730`: закрепить, что threshold-driven continuity использует `token_usage` только как post-turn arbitration input, а Core обязан быть устойчивым к обоим provider event orders и очищать turn-scoped usage cache после завершения решения (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(architecture): sync post-turn continuity invariants`).
2. [DONE] Git Commit: `docs(architecture): sync post-turn continuity invariants` (hash: `3f29b7ae`)
3. [DONE] Синхронизировать provider/routing SSOT и release-facing summary: зафиксировать Gemini-specific event order, инвариант сохранения активного dialog до post-turn boundary и обновить release summary для ручного smoke результата `1.1.730` (scope: `doc/SolidWorks-WorkFlow/Modules/Gemini.md`, `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`, `README.md`; expected commit: `docs(architecture): sync continuity routing surfaces`).
4. [DONE] Git Commit: `docs(architecture): sync continuity routing surfaces` (hash: `9d18529d`)
5. [DONE] Досинхронизировать release trail: отразить подтверждённую live validation `1.1.730` в `CHANGELOG.md`, исправить неполный commit trail в `Session078.md` и обновить execution-plan под новый статус документации (scope: `CHANGELOG.md`, `doc/Sessions/Session078.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): record continuity validation sync`).
6. [DONE] Git Commit: `docs(release): record continuity validation sync` (hash: `99059472`)

### Stream: Session report and GitHub push
1. [DONE] Создать новый session report по post-release validation/push, зафиксировать финальный статус `v1.1.730` и подготовить ветку к публикации на GitHub (scope: `doc/Sessions/Session079.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(session): record release 1.1.730 validation sync`).
2. [DONE] Git Commit: `docs(session): record release 1.1.730 validation sync` (hash: `6dada58c`)

### Stream: GitHub push quality-gate unblock
1. [DONE] Устранить pre-push blocker по `jscpd`: дедуплицировать общий UI control-style слой для Codex/Gemini model cards без изменения runtime-поведения, чтобы `git push` снова проходил обязательный duplication gate (scope: `src/client/ui/src/components/settings/shared-model-card-styles.ts`, `src/client/ui/src/components/settings/codex-default-model/codex-model-card-styles.ts`, `src/client/ui/src/components/settings/gemini-default-model/gemini-model-card-styles.ts`; expected commit: `refactor(ui): dedupe model control styles`).
2. [DONE] Git Commit: `refactor(ui): dedupe model control styles` (hash: `8fe5d88a`)
3. [DONE] Обновить session trail после unblock-а: зафиксировать в `Session079.md` причину проваленного pre-push, результирующий refactor и готовность ветки к повторной публикации на GitHub (scope: `doc/Sessions/Session079.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(session): record push gate unblock`).
4. [IN_PROGRESS] Git Commit: `docs(session): record push gate unblock` (hash: TBD)
