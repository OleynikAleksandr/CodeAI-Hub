# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- Каждая микро-задача затрагивает не более **3 файлов**.
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- После каждой микро-задачи обязательны гейты: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетные сборки.
- После зелёных гейтов — Git Commit и немедленный апдейт статусов/хешей в этом файле.

## Required documents to review before work
1. `doc/Sessions/Archive/Session041.md`
2. `doc/SolidWorks-Flow/Stacks/CoreOrchestrator.md`
3. `doc/TODO/Archive/todo-plan-phase156-release-1.1.585-2026-02-13.md`
4. `doc/SolidWorks-Flow/SessionContinuity/SessionContinuity.md`
5. `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`

---

## Phase 157 — Post-Release Verification (owner: Oleksandr, updated: 2026-02-13)

**Goal:** После релиза 1.1.585 подтвердить, что unified Agent Dialog JSONL переживает рестарты Core и отображается в UI как единый диалог.

### Stream: Manual Tests
1. [TODO] QA: создать 2-3 rollover/resume сегмента для Reviewer Codex, перезапустить Core, убедиться что UI показывает полный диалог и что `description-step.json.session.dialogSessionId` заполнен (scope: runtime files; expected commit message: `docs(qa): verify unified dialog jsonl on core restart`)
2. [TODO] Git Commit: `docs(qa): verify unified dialog jsonl on core restart` (hash: TBD)

---

## Phase 158 — Agent Dialog Separation + UI Dedupe (owner: Oleksandr, updated: 2026-02-13)

**Goal:** Исправить регрессию: разные агенты (Description collector vs Reviewer) не должны писать историю в один JSONL; UI не должен дублировать сообщения при reconnect/restore.

### Stream: Core — 1 Agent = 1 Dialog JSONL
1. [DONE] Core: разделить `dialogSessionId` по agent identity для stage `description` (collector vs reviewer), чтобы они писали в разные unified-session файлы; обновить persisted step-state схему (scope: `packages/core/src/workflow/description/*`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit message: `fix(core): separate dialogSessionId per description agent`)
2. [DONE] Git Commit: `fix(core): separate dialogSessionId per description agent` (hash: b07fdd02)
3. [DONE] Core: миграция/backfill: при наличии старого mixed JSONL (collector+reviewer в одном файле) выполнить best-effort миграцию: промоут/rename legacy `.../<baseSessionId>.jsonl` в `.../<baseSessionId>__<agentKind>.jsonl` при первом запуске соответствующего агента (scope: `packages/core/src/unified-session/storage.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit message: `fix(core): backfill mixed dialog history into per-agent files`)
4. [DONE] Git Commit: `fix(core): backfill mixed dialog history into per-agent files` (hash: f8ea4467)

### Stream: Core — Filter Noise Records
1. [DONE] Core: отфильтровать мусорные записи unified-session (`thinking` с пустым/`<!-- -->` контентом) до записи в JSONL (scope: `packages/core/src/unified-session/storage.ts`; expected commit message: `fix(core): skip empty thinking records in unified-session`)
2. [DONE] Git Commit: `fix(core): skip empty thinking records in unified-session` (hash: 2e3fd4f4)

### Stream: Project Manager UI — Message Dedupe
1. [DONE] PM/UI: при подгрузке history и live-stream обновлениях делать dedupe по `messageId` (и не дублировать уже показанные сообщения после reconnect/restore) (scope: ≤3 файла в `src/client/project-manager/**` или `src/client/ui/**`; expected commit message: `fix(pm): dedupe session messages when merging history and live stream`)
2. [DONE] Git Commit: `fix(pm): dedupe session messages when merging history and live stream` (hash: afc05237)

### Stream: Docs Sync
1. [DONE] Docs: синхронизировать SolidWorks-Flow каноны: `dialogSessionId` теперь “1 agent = 1 file”; описать separation для collector/reviewer и правила миграции (scope: `doc/SolidWorks-Flow/SessionContinuity/SessionContinuity.md`, `doc/SolidWorks-Flow/Architecture/DescriptionNode_ReviewSession_Architecture.md`, `doc/SolidWorks-Flow/Stacks/CoreOrchestrator.md`; expected commit message: `docs(flow): document per-agent dialogSessionId separation`)
2. [DONE] Git Commit: `docs(flow): document per-agent dialogSessionId separation` (hash: 5705d587)

### Stream: Release Build (New Patch Release)
1. [DONE] Gates: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd ...`, `npm run check:links` + таргетные сборки затронутых пакетов (scope: repo; expected commit message: `chore: quality gates before release`)
2. [DONE] Git Commit: `chore: quality gates before release` (hash: N/A — без изменений в tracked files)
3. [DONE] Build: `./scripts/build-all.sh` (version bump -> 1.1.587) (scope: repo build; expected commit message: `chore(release): build-all for next patch`)
4. [DONE] Git Commit: `chore(release): build-all for next patch` (hash: 41c0bab1)
5. [DONE] Build: `./scripts/build-release.sh --use-current-version` (VSIX: `codeai-hub-1.1.587.vsix`) (scope: repo build; expected commit message: `chore(release): build vsix`)
6. [DONE] Git Commit: `chore(release): build vsix` (hash: N/A — VSIX artifact only)
