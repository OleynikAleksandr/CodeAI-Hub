# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стримов) с микрозадачами.
- Каждая микрозадача затрагивает **≤ 3 файла**.
- Каждая микрозадача оформляется парой пунктов: (1) изменения, (2) `Git Commit: ...` отдельной строкой.
- **Gates** после каждой микрозадачи: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка (по затронутым пакетам).
- **Commit** — только после зелёных гейтов.
- **Real-time Docs**: любые изменения протоколов/архитектуры требуют синхронного обновления документов из `doc/` **до** коммита.

## Required documents to review before work
1. `doc/Project_Docs/Workflow_CLI_Steps_And_Watcher_Architecture.md`
2. `doc/Architecture/Architecture.md`
3. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`

---

## Phase 57 — Switch Workflow steps to CLI tools (owner: Oleksandr, updated: 2026-01-18)

Цель: отказаться от structured-output для стадий Description/Virtual Simulation/Diagrams и перейти на **file-first** артефакты (агент пишет файл через CLI tools), а состояние/гейтинг строится через Watcher.

### Stream: Design approval + docs alignment
1. [DONE] Docs: согласовать архитектуру перехода (decision: no structured-output для стадий + Watcher) — scope: `doc/Project_Docs/Workflow_CLI_Steps_And_Watcher_Architecture.md`; expected commit message: `docs: approve workflow cli+watcher architecture`
2. [DONE] Git Commit: `docs: approve workflow cli+watcher architecture` (hash: b1bcd53d)
3. [DONE] Docs: синхронизировать общие архитектурные документы под новый подход — scope: `doc/Architecture/Architecture.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`; expected commit message: `docs: document workflow file-first artifacts`
4. [DONE] Git Commit: `docs: document workflow file-first artifacts` (hash: fdf9eec1)

### Stream: Core — Watcher foundation (events + state)
1. [DONE] Feat(core): добавить каркас Workflow Watcher (FS watch + event bus) — scope: `packages/core/src/workflow/watcher/workflow-watcher.ts`, `packages/core/src/workflow/watcher/workflow-watcher-facade.ts`, `packages/core/src/workflow/watcher/watcher-types.ts`; expected commit message: `feat(core): add workflow watcher foundation`
2. [DONE] Git Commit: `feat(core): add workflow watcher foundation` (hash: 19f50249)
3. [DONE] Feat(core): хранение/обновление workflow state на основании событий watcher (атомарно) — scope: `packages/core/src/workflow/state/workflow-state-store.ts`, `packages/core/src/workflow/state/workflow-state-facade.ts`, `packages/core/src/workflow/state/workflow-state-types.ts`; expected commit message: `feat(core): persist workflow state from watcher`
4. [DONE] Git Commit: `feat(core): persist workflow state from watcher` (hash: f15135f7)

### Stream: Core — Paths + allowlist для file-first артефактов
1. [DONE] Feat(core): единый резолвер путей артефактов (stage+runSlug → абсолютный путь) — scope: `packages/core/src/workflow/paths/workflow-artifact-paths.ts`, `packages/core/src/workflow/paths/workflow-paths-facade.ts`, `packages/core/src/workflow/paths/workflow-paths-types.ts`; expected commit message: `feat(core): add workflow artifact path resolver`
2. [DONE] Git Commit: `feat(core): add workflow artifact path resolver` (hash: 644c0492)
3. [DONE] Feat(core): allowlist путей для инструментов записи (write/read) только внутри `.codeai-hub/<workspaceSlug>/...` — scope: `packages/core/src/security/workspace-path-allowlist.ts`, `packages/core/src/workflow/paths/workflow-artifact-paths.ts`, `packages/core/src/remote-bridge/handlers/file-ops-handler.ts`; expected commit message: `feat(core): allow file-first workflow artifact writes`
4. [DONE] Git Commit: `feat(core): allow file-first workflow artifact writes` (hash: 593cc1a3)

### Stream: Core — API hooks (UI + automation)
1. [DONE] Feat(core): API для UI: получить state + подписка на workflow события (poll или WS) — scope: `packages/core/src/remote-bridge/handlers/http-api-router.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`, `packages/core/src/remote-bridge/handlers/workflow-events-service.ts`; expected commit message: `feat(core): expose workflow state and events`
2. [DONE] Git Commit: `feat(core): expose workflow state and events` (hash: e472248d)

### Stream: UI (Project Manager) — state-driven gating
1. [DONE] Feat(project-manager): читать workflow state из Core и визуализировать гейтинг в дереве/панелях — scope: `src/client/project-manager/api.ts`, `src/client/project-manager/components/layout/workspace-tree.tsx`, `src/client/project-manager/services/workflow-state-client.ts`; expected commit message: `feat(project-manager): gate workflow from core state`
2. [DONE] Git Commit: `feat(project-manager): gate workflow from core state` (hash: a281b353)
3. [DONE] Feat(project-manager): подписка на workflow события (обновление UI без перезапуска) — scope: `src/client/project-manager/api.ts`, `src/client/project-manager/services/workflow-events-client.ts`, `src/client/project-manager/components/layout/main-area.tsx`; expected commit message: `feat(project-manager): live workflow updates`
4. [DONE] Git Commit: `feat(project-manager): live workflow updates` (hash: a30d1450)

### Stream: Workflow Steps — CLI tools вместо structured-output (Description/Virtual Simulation/Diagrams)
1. [DONE] Refactor(core): отключить structured-output контракт для стадий description/virtual_simulation/diagram_* и перейти на file-first — scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `doc/Architecture/Architecture.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`; expected commit message: `refactor(core): switch workflow steps to file-first`
2. [DONE] Git Commit: `refactor(core): switch workflow steps to file-first` (hash: a80ae3dc)
3. [DONE] Refactor(project-manager): стартовый «Prompt Pack» за один turn (инструкция + анкета + шаблон + target path) — scope: `src/client/project-manager/services/idea-collector-submit-service.ts`, `src/client/project-manager/services/prompt-pack-builder.ts`, `src/client/project-manager/components/description/description-questionnaire-panel.tsx`; expected commit message: `refactor(project-manager): add single-turn prompt pack`
4. [DONE] Git Commit: `refactor(project-manager): add single-turn prompt pack` (hash: 92e2151b)

### Stream: Automation — watcher-driven gates
1. [DONE] Feat(core): запуск гейтов по событию `workflow.stage.completed` (конфигурируемо) — scope: `packages/core/src/workflow/gates/workflow-gates-facade.ts`, `doc/Architecture/Architecture.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`; expected commit message: `feat(core): add watcher-driven workflow gates`
2. [DONE] Git Commit: `feat(core): add watcher-driven workflow gates` (hash: 3695d33b)

### Stream: Verification (Codex + Claude)
1. [TODO] Test(manual): прогнать стадии description → virtual_simulation → diagram_modules → diagram_facades на Codex и Claude (file-first запись) — scope: `doc/Project_Docs/Workflow_CLI_Steps_And_Watcher_Architecture.md`, `doc/Sessions/SessionXXX.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: document workflow file-first verification`
2. [TODO] Git Commit: `docs: document workflow file-first verification` (hash: TBD)

---

## Phase 58 — Release (owner: Oleksandr, updated: 2026-01-18)

### Stream: Release build
1. [TODO] Release: полный цикл релиза после закрытия всех стримов (clean tree → build-all → build-release) — scope: `scripts/build-all.sh`, `scripts/build-release.sh`, `doc/Sessions/SessionXXX.md`; expected commit message: `feat: vX.Y.Z - workflow file-first + watcher`
2. [TODO] Git Commit: `feat: vX.Y.Z - workflow file-first + watcher` (hash: TBD)
