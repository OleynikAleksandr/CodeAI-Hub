# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- Каждая микро-задача затрагивает не более **3 файлов**.
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- После каждой микро-задачи обязательны гейты: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетные сборки.
- После зелёных гейтов — Git Commit и немедленный апдейт статусов/хешей в этом файле.

## Required documents to review before work
1. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`
2. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/System/SystemArchitecture.md`
3. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/TODO/todo-plan.md`

---

## Phase 168 — Core: dialogId-first continuity + history store + index.json (owner: Codex, updated: 2026-02-14)

**Goal:** Core становится единственным источником правды для маршрутизации (через `chain.json`) и хранения истории (через `<dialogId>.jsonl`) с восстановлением после рестартов.

### Stream: Core — chain.json segments + dialogId
1. [DONE] Core: обновить модель continuity chain на `segments[]` и явный `dialogId`, где "живой" `providerSessionId` берётся как `segments[last].providerSessionId` (scope: `packages/core/src/session-continuity/continuity-store.ts`, `packages/core/src/session-continuity/continuity-types.ts`; expected commit message: `feat(core): add dialogId to continuity chain`)
2. [DONE] Git Commit: `feat(core): add dialogId to continuity chain` (hash: 48a5ad47)

### Stream: Core — history.jsonl writer (core-only writer)
1. [DONE] Core: core-only writer plumbing для стабильного `~/.codeai-hub/sessions/<workspaceKey>/<providerId>/<dialogId>.jsonl` (workspaceKey helper + dialog writer class) (scope: `packages/core/src/unified-session/storage.ts`, `packages/core/src/unified-session/history-writer.ts`, `packages/core/src/workspaces/workspace-key.ts`; expected commit message: `feat(core): add dialog history writer + workspace key`)
2. [DONE] Git Commit: `feat(core): add dialog history writer + workspace key` (hash: 3f210d69)
3. [DONE] Core: закрепить unified-session `historySessionId` на continuity root и не менять root при rollover (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit message: `fix(core): keep continuity root stable across rollovers`)
4. [DONE] Git Commit: `fix(core): keep continuity root stable across rollovers` (hash: 36467297)

### Stream: Core — continuity index.json registry
1. [DONE] Core: добавить `continuity/index.json` как ускоритель `dialog:list` (SOT остаётся `chain.json`), обновлять индекс при создании/обновлении chain (scope: `packages/core/src/session-continuity/index-registry.ts`, `packages/core/src/session-continuity/continuity-store.ts`; expected commit message: `feat(core): write continuity index.json on chain save`)
2. [DONE] Git Commit: `feat(core): write continuity index.json on chain save` (hash: 9a07ae85)

### Stream: Phase Report (Phase 168)
1. [DONE] Docs: Phase 168 report (scope: `doc/SolidWorks-Flow/Architecture/Refactor_Progress_Phase168.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(flow): phase168 report (core dialogId continuity+history+index)`)
2. [DONE] Git Commit: `docs(flow): phase168 report (core dialogId continuity+history+index)` (hash: f07f51d4)

---

## Phase 169 — Core Bridge: dialog:* APIs keyed by dialogId (owner: Codex, updated: 2026-02-14)

**Goal:** PM общается с Core не через runtime `sessionId`, а через `dialogId` (open/history/send/list) и live events.

### Stream: Core — dialog:list + dialog:open
1. [DONE] Core: `dialog:list` (index-backed) по workspace scope + `workspaceSlug` (scope: `packages/core/src/remote-bridge/handlers/dialog-list-service.ts`, `packages/core/src/remote-bridge/index.ts`, `packages/core/src/remote-bridge/types.ts`; expected commit message: `feat(core): dialog list (index-backed)`)
2. [DONE] Git Commit: `feat(core): dialog list (index-backed)` (hash: 83ce4e10)
3. [DONE] Core: `dialog:open` (index-backed lookup по `dialogId`) (scope: `packages/core/src/remote-bridge/handlers/dialog-open-service.ts`, `packages/core/src/remote-bridge/index.ts`, `packages/core/src/remote-bridge/types.ts`; expected commit message: `feat(core): dialog open (index-backed)`)
4. [DONE] Git Commit: `feat(core): dialog open (index-backed)` (hash: 0bd8ddbb)

### Stream: Core — dialog:history (replay)
1. [DONE] Core: `dialog:history` читает `<dialogId>.jsonl` и отдаёт нормализованные сообщения (без дублей) (scope: `packages/core/src/remote-bridge/handlers/dialog-history-service.ts`, `packages/core/src/remote-bridge/index.ts`, `packages/core/src/remote-bridge/types.ts`; expected commit message: `feat(core): dialog history (jsonl replay)`)
2. [DONE] Git Commit: `feat(core): dialog history (jsonl replay)` (hash: d79ae6b3)

### Stream: Core — dialog:send + dialog:message (live)
1. [DONE] Core: `dialog:send` (lookup chain by `dialogId`, resume provider session if нужно, delegate to SessionRequestHandler) (scope: `packages/core/src/remote-bridge/index.ts`, `packages/core/src/remote-bridge/types.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit message: `feat(core): dialog send (resume + delegate to session handler)`)
2. [DONE] Git Commit: `feat(core): dialog send (resume + delegate to session handler)` (hash: 7f7385f1)
3. [DONE] Core: live event `dialog:message` с `dialogId` (scope: `packages/core/src/remote-bridge/types.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/handlers/websocket-session-scope.ts`; expected commit message: `feat(core): dialog message live event by dialogId`)
4. [DONE] Git Commit: `feat(core): dialog message live event by dialogId` (hash: fe238b17)

### Stream: Phase Report (Phase 169)
1. [DONE] Docs: Phase 169 report (scope: `doc/SolidWorks-Flow/Architecture/Refactor_Progress_Phase169.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(flow): phase169 report (core dialog APIs by dialogId)`)
2. [DONE] Git Commit: `docs(flow): phase169 report (core dialog APIs by dialogId)` (hash: TBD)

---

## Phase 170 — PM: dialogId tabs + persistence + replay pipeline (owner: Codex, updated: 2026-02-14)

**Goal:** PM после рестарта Core/PM всегда может открыть диалог по `dialogId`, загрузить историю через replay и затем перейти на live stream, не создавая дублей.

### Stream: PM — tab persistence + tree bindings (dialogId)
1. [TODO] PM: хранить `openDialogIds[]`, `activeDialogId`, `treeBindings` (nodeId -> dialogId) и восстанавливать на cold start (scope: `src/client/ui/src/services/dialog-tabs-store.ts`, `src/client/project-manager/components/layout/workspace-tree-model.ts`, `src/client/ui/src/session/session-tabs.tsx`; expected commit message: `feat(pm): persist tabs + tree bindings by dialogId`)
2. [TODO] Git Commit: `feat(pm): persist tabs + tree bindings by dialogId` (hash: TBD)

### Stream: PM — history replay uses same normalizer/dedupe
1. [TODO] PM: `dialog:history` -> прогон через тот же append/dedupe слой, что и live (replay не должен переписывать jsonl) (scope: `src/client/ui/src/core-bridge/dialog-history.ts`, `src/client/project-manager/components/sessions/session-message-dedupe.ts`, `src/client/project-manager/components/sessions/project-manager-session-view.tsx`; expected commit message: `feat(pm): replay dialog history via live pipeline (no dupes)`)
2. [TODO] Git Commit: `feat(pm): replay dialog history via live pipeline (no dupes)` (hash: TBD)

### Stream: Phase Report (Phase 170)
1. [TODO] Docs: Phase 170 report (scope: `doc/SolidWorks-Flow/Architecture/Refactor_Progress_Phase170.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(flow): phase170 report (pm dialogId persistence+replay)`)
2. [TODO] Git Commit: `docs(flow): phase170 report (pm dialogId persistence+replay)` (hash: TBD)

---

## Phase 171 — PM: send + live stream by dialogId (owner: Codex, updated: 2026-02-14)

**Goal:** PM отправляет сообщения и принимает live события строго по `dialogId` (без зависимости от runtime sessionId), включая кейсы "закрыть таб крестиком" и "рестарт Core".

### Stream: PM — dialog:send by activeDialogId
1. [TODO] PM: отправка пользовательского сообщения через `dialog:send` по `activeDialogId` (scope: `src/client/project-manager/api.ts`, `src/client/project-manager/components/sessions/session-message-sender.ts`; expected commit message: `feat(pm): send via dialogId`)
2. [TODO] Git Commit: `feat(pm): send via dialogId` (hash: TBD)

### Stream: PM — live dialog stream keyed by dialogId
1. [TODO] PM: подписка/обработка `dialog:message` и merge в правильный диалог по `dialogId` (scope: `src/client/project-manager/components/sessions/session-stream.ts`, `src/client/project-manager/components/sessions/session-message-dedupe.ts`, `src/client/project-manager/components/sessions/project-manager-session-view.tsx`; expected commit message: `feat(pm): live dialog stream by dialogId`)
2. [TODO] Git Commit: `feat(pm): live dialog stream by dialogId` (hash: TBD)

### Stream: Phase Report (Phase 171)
1. [TODO] Docs: Phase 171 report (scope: `doc/SolidWorks-Flow/Architecture/Refactor_Progress_Phase171.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(flow): phase171 report (pm live+send by dialogId)`)
2. [TODO] Git Commit: `docs(flow): phase171 report (pm live+send by dialogId)` (hash: TBD)

---

## Phase 172 — Release Build (New Patch Release) (owner: Codex, updated: 2026-02-14)

### Stream: Release Build
1. [TODO] Gates: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd ...`, `npm run check:links` + таргетные сборки (scope: repo; expected commit message: `chore: quality gates before release`)
2. [TODO] Git Commit: `chore: quality gates before release` (hash: TBD or N/A)
3. [TODO] Build: `./scripts/build-all.sh` (version bump) (scope: repo build; expected commit message: `chore(release): build-all for next patch`)
4. [TODO] Git Commit: `chore(release): build-all for next patch` (hash: TBD)
5. [TODO] Build: `./scripts/build-release.sh --use-current-version` (VSIX in repo root) (scope: repo build; expected commit message: `chore(release): build vsix`)
6. [TODO] Git Commit: `chore(release): build vsix` (hash: N/A — VSIX artifact only)
7. [TODO] Docs: обновить этот план статусами/датами/путями артефактов релиза (scope: `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): record patch release build`)
8. [TODO] Git Commit: `docs(todo): record patch release build` (hash: TBD)
