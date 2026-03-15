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
2. [IN_PROGRESS] Git Commit: `docs(release): prep flow-node continuity boundary release` (hash: TBD)
3. [TODO] На чистом дереве выполнить `./scripts/build-all.sh`, зафиксировать новый unified/workspace version, обновлённые manifests и release tarball-артефакты по release checklist (scope: `package.json`, workspace `package.json`, `assets/**/manifest.json`, `doc/tmp/releases/`; expected commit: `chore(release): build flow-node continuity boundary release`).
4. [TODO] Git Commit: `chore(release): build flow-node continuity boundary release` (hash: TBD)
5. [TODO] Выполнить `./scripts/build-release.sh --use-current-version`, проверить новый VSIX и синхронизировать session report + execution-plan по финальному релизному состоянию, включая результаты релизной проверки (scope: `codeai-hub-<version>.vsix`, `doc/Sessions/Session078.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(session): record flow-node continuity boundary release`).
6. [TODO] Git Commit: `docs(session): record flow-node continuity boundary release` (hash: TBD)
