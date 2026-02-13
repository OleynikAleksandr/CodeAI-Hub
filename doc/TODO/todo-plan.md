# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- Каждая микро-задача затрагивает не более **3 файлов**.
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- После каждой микро-задачи обязательны гейты: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетные сборки.
- После зелёных гейтов — Git Commit и немедленный апдейт статусов/хешей в этом файле.

## Required documents to review before work
1. `doc/Sessions/Session041.md`
2. `doc/SolidWorks-Flow/Stacks/CoreOrchestrator.md`
3. `packages/core/src/unified-session/storage.ts`
4. `packages/core/src/remote-bridge/handlers/session-request-handler.ts`

---

## Phase 156 — Unified Agent Dialog JSONL (UI history survives Core restarts) (owner: Oleksandr, updated: 2026-02-13)

**Goal:** Для каждого логического диалога агента хранить **один накопительный JSONL** для UI, который переживает rollover/resume и рестарты Core. Решение должно работать одинаково для всех провайдеров.

### Stream: Design (Docs First)
1. [DONE] Docs: описать новый контракт “Agent Dialog JSONL” (dialogSessionId, хранение, rehydrate, backfill) и связь с continuity/rollover (scope: `doc/SolidWorks-Flow/Stacks/CoreOrchestrator.md`; expected commit message: `docs(core): agent dialog JSONL storage contract`)
2. [DONE] Git Commit: `docs(core): agent dialog JSONL storage contract` (hash: `65463ea6`)

### Stream: Persist Dialog Session Id in Description Step
1. [DONE] Core: расширить `DescriptionSessionRef` новым полем `dialogSessionId` (optional), научить store читать/писать его (scope: `packages/core/src/workflow/description/description-step-types.ts`, `packages/core/src/workflow/description/description-step-store.ts`; expected commit message: `feat(core): persist dialogSessionId in description step session ref`)
2. [DONE] Git Commit: `feat(core): persist dialogSessionId in description step session ref` (hash: `8adacf55`)

### Stream: Unified Session Writer Uses Logical Dialog Id
1. [TODO] Core: добавить возможность писать unified-session в “логический файл истории” (historySessionId override) вместо `providerSessionId` (scope: `packages/core/src/unified-session/storage.ts`; expected commit message: `feat(core): support logical unified-session history id`)
2. [TODO] Git Commit: `feat(core): support logical unified-session history id` (hash: TBD)

### Stream: Wire Description Session Ref to Unified Dialog File + Backfill
1. [TODO] Core: при создании description reviewer/collector сессии выбирать/фиксировать `dialogSessionId` (первый providerSessionId либо уже сохраненный), писать/читать history в `~/.codeai-hub/sessions/<workspaceKey>/<providerId>/<dialogSessionId>.jsonl`, и выполнить backfill: собрать сообщения из всех сегментных `<providerSessionId>.jsonl` (по continuity chains) в один накопительный файл (дедуп по `messageId`) (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/session-continuity/session-continuity-facade.ts`, `packages/core/src/unified-session/storage.ts`; expected commit message: `fix(core): stable dialog jsonl for description sessions with backfill`)
2. [TODO] Git Commit: `fix(core): stable dialog jsonl for description sessions with backfill` (hash: TBD)

### Stream: Verification
1. [TODO] Gates: `./scripts/check-architecture.sh` + `npx ultracite check` + `npx ts-prune` + `npx jscpd ...` + `npm run check:links` + таргетные сборки (scope: repo; expected commit message: `chore: quality gates for dialog jsonl`)
2. [TODO] Git Commit: `chore: quality gates for dialog jsonl` (hash: TBD)

### Stream: Release
1. [TODO] Build release: `./scripts/build-all.sh` затем `./scripts/build-release.sh --use-current-version` (scope: scripts; expected commit message: `chore(release): build-all for next patch`)
2. [TODO] Git Commit: `chore(release): build-all for next patch` (hash: TBD)
