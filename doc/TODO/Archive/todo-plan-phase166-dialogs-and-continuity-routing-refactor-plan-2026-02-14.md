# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- Каждая микро-задача затрагивает не более **3 файлов**.
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- После каждой микро-задачи обязательны гейты: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетные сборки.
- После зелёных гейтов — Git Commit и немедленный апдейт статусов/хешей в этом файле.

## Required documents to review before work
1. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`
2. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/System/SystemArchitecture.md`
3. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/SessionContinuity/SessionContinuity.md`
4. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/TODO/Archive/todo-plan-phase161-core-restart-sessions-release-1.1.594-2026-02-14.md`
5. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/Sessions/Session049.md` (THIS REPORT)

---

## Phase 162 — Core: dialogId + index.json + dialog:* APIs (owner: Codex, updated: 2026-02-14)

**Goal:** реализовать минимальный Core контракт из `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`:
- per-workspace `continuity/index.json` (dialog registry),
- `chain.json` keyed by `dialogId`,
- API/WS: `dialog:list/open/history/send` + live `dialog:message`.

### Stream: Core — Dialog Registry (index.json)
1. [TODO] Core: добавить `continuity/index.json` store + запись/обновление при создании диалога и rollover (scope: `packages/core/src/session-continuity/continuity-store.ts`, `packages/core/src/session-continuity/continuity-types.ts`, `packages/core/src/session-continuity/session-continuity-facade.ts`; expected commit message: `feat(core): add continuity index.json dialog registry`)
2. [TODO] Git Commit: `feat(core): add continuity index.json dialog registry` (hash: TBD)

### Stream: Core — Dialog HTTP API (list/open/history/send)
1. [TODO] Core: добавить HTTP endpoints `dialog:list/open/history/send` по `dialogId` (scope: `packages/core/src/remote-bridge/handlers/dialog-service.ts`, `packages/core/src/remote-bridge/handlers/http-api-router.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit message: `feat(core): dialogId http api (list/open/history/send)`)
2. [TODO] Git Commit: `feat(core): dialogId http api (list/open/history/send)` (hash: TBD)

### Stream: Core — Dialog WS Event (dialog:message)
1. [TODO] Core: добавить WS событие `dialog:message` с обязательным `dialogId` и каноническими полями сообщения (scope: `packages/core/src/remote-bridge/types.ts`, `packages/core/src/remote-bridge/index.ts`, `packages/core/src/remote-bridge/handlers/websocket-session-scope.ts`; expected commit message: `feat(core): emit dialog:message with dialogId`)
2. [TODO] Git Commit: `feat(core): emit dialog:message with dialogId` (hash: TBD)

### Stream: Phase Report (Phase 162)
1. [TODO] Docs: Phase 162 report (короткий контекст + что сделано + что дальше) (scope: `doc/SolidWorks-Flow/Architecture/Refactor_Progress_Phase162.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(flow): phase162 report (core dialogId contracts)`)
2. [TODO] Git Commit: `docs(flow): phase162 report (core dialogId contracts)` (hash: TBD)

---

## Phase 163 — PM: tabs persistence + open/replay by dialogId (owner: Codex, updated: 2026-02-14)

**Goal:** PM открывает диалог без runtime sessions, используя `dialogId` как единственный ключ:
- persistence tabs/treeBindings (`activeDialogId`, `openDialogIds[]`),
- история грузится из `dialog:history`,
- отправка идёт через `dialog:send`.

### Stream: PM — Tabs Persistence (dialogId)
1. [TODO] PM: добавить persistence для `openDialogIds[]/activeDialogId/treeBindings` (scope: `src/client/project-manager/services/dialog-tabs-store.ts`, `src/client/project-manager/components/sessions/project-manager-session-view.tsx`, `src/client/project-manager/components/layout/workspace-tree-model.ts`; expected commit message: `feat(pm): persist tabs + tree bindings by dialogId`)
2. [TODO] Git Commit: `feat(pm): persist tabs + tree bindings by dialogId` (hash: TBD)

### Stream: PM — History Replay (dialog:history)
1. [TODO] PM: загрузка истории по `dialogId` и прогон через тот же append/dedupe слой, что live (scope: `src/client/project-manager/api.ts`, `src/client/ui/src/core-bridge/session-history.ts`, `src/client/project-manager/components/sessions/project-manager-session-view.tsx`; expected commit message: `feat(pm): load dialog history by dialogId (replay)`)
2. [TODO] Git Commit: `feat(pm): load dialog history by dialogId (replay)` (hash: TBD)

### Stream: PM — Send (dialog:send)
1. [TODO] PM: отправка сообщений через `dialog:send` по `activeDialogId` (scope: `src/client/project-manager/api.ts`, `src/client/project-manager/components/sessions/session-message-sender.ts`; expected commit message: `feat(pm): send via dialogId`)
2. [TODO] Git Commit: `feat(pm): send via dialogId` (hash: TBD)

### Stream: Phase Report (Phase 163)
1. [TODO] Docs: Phase 163 report (scope: `doc/SolidWorks-Flow/Architecture/Refactor_Progress_Phase163.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(flow): phase163 report (pm dialogId tabs + replay)`)
2. [TODO] Git Commit: `docs(flow): phase163 report (pm dialogId tabs + replay)` (hash: TBD)

---

## Phase 164 — PM/Core: live stream routing by dialogId (owner: Codex, updated: 2026-02-14)

**Goal:** live stream события маршрутизируются строго по `dialogId`, без зависимости от runtime `sessionId` Core.

### Stream: PM — Live Dialog Stream
1. [TODO] PM: подписка/обработка `dialog:message` и merge в активный диалог по `dialogId` (scope: `src/client/project-manager/components/sessions/session-stream.ts`, `src/client/project-manager/components/sessions/session-message-dedupe.ts`, `src/client/project-manager/components/sessions/project-manager-session-view.tsx`; expected commit message: `feat(pm): live dialog stream by dialogId`)
2. [TODO] Git Commit: `feat(pm): live dialog stream by dialogId` (hash: TBD)

### Stream: Phase Report (Phase 164)
1. [TODO] Docs: Phase 164 report (scope: `doc/SolidWorks-Flow/Architecture/Refactor_Progress_Phase164.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(flow): phase164 report (live routing by dialogId)`)
2. [TODO] Git Commit: `docs(flow): phase164 report (live routing by dialogId)` (hash: TBD)

---

## Phase 165 — Migration: legacy chain/session -> dialogId (owner: Codex, updated: 2026-02-14)

**Goal:** мягкая миграция старых continuity chain и UI history к `dialogId` контракту.

### Stream: Core — Backfill/Migrate
1. [TODO] Core: backfill legacy chain to `dialogId` + index rebuild (scope: `packages/core/src/session-continuity/continuity-store.ts`, `packages/core/src/unified-session/storage.ts`, `packages/core/src/remote-bridge/handlers/workspace-activate-service.ts`; expected commit message: `feat(core): migrate legacy continuity to dialogId`)
2. [TODO] Git Commit: `feat(core): migrate legacy continuity to dialogId` (hash: TBD)

### Stream: Phase Report (Phase 165)
1. [TODO] Docs: Phase 165 report (scope: `doc/SolidWorks-Flow/Architecture/Refactor_Progress_Phase165.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(flow): phase165 report (migration to dialogId)`)
2. [TODO] Git Commit: `docs(flow): phase165 report (migration to dialogId)` (hash: TBD)

---

## Phase 166 — Release Build (New Patch Release) (owner: Codex, updated: 2026-02-14)

### Stream: Release Build
1. [TODO] Gates: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd ...`, `npm run check:links` + таргетные сборки (scope: repo; expected commit message: `chore: quality gates before release`)
2. [TODO] Git Commit: `chore: quality gates before release` (hash: TBD or N/A)
3. [TODO] Build: `./scripts/build-all.sh` (version bump) (scope: repo build; expected commit message: `chore(release): build-all for next patch`)
4. [TODO] Git Commit: `chore(release): build-all for next patch` (hash: TBD)
5. [TODO] Build: `./scripts/build-release.sh --use-current-version` (VSIX in repo root) (scope: repo build; expected commit message: `chore(release): build vsix`)
6. [TODO] Git Commit: `chore(release): build vsix` (hash: N/A — VSIX artifact only)
7. [TODO] Docs: обновить этот план статусами/датами/путями артефактов релиза (scope: `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): record patch release build`)
8. [TODO] Git Commit: `docs(todo): record patch release build` (hash: TBD)
