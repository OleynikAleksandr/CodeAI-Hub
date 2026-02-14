# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- Каждая микро-задача затрагивает не более **3 файлов**.
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- После каждой микро-задачи обязательны гейты: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетные сборки.
- После зелёных гейтов — Git Commit и немедленный апдейт статусов/хешей в этом файле.

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`
3. `doc/SolidWorks-Flow/SessionContinuity/SessionContinuity.md`
4. `doc/TODO/Archive/todo-plan-phase159-dialog-ui-2026-02-14.md`
5. `doc/Sessions/Session045.md`

---

## Phase 160 — PM cold start: сессии должны открываться после рестарта Core (owner: Codex, updated: 2026-02-14)

**Problem:** После перезапуска Core (cold start) в Project Manager пропадали/не открывались сессии агента (например, `Reviewer Codex`). Hot-run без рестарта обычно был нормальным.

**Root cause:** гонки handshake на старте.
- `workspace:select` отправлялся по WS слишком рано (WS еще не открыт) и дропался.
- Далее ожидание `workspace:select:ack` приводило к пропуску `workspace-activate`.

**Goal:** после рестарта Core и открытия PM:
- workspace выбирается надежно,
- `workspace-activate` всегда срабатывает,
- дерево/сессии восстанавливаются,
- диалог восстанавливается из кумулятивного JSONL (cold start) и дальше дополняется live stream (hot tail) без дублей.

### Stream: Fix — WS Queue + Activate
1. [DONE] PM: очередь WS исходящих сообщений (не дропать `workspace:select` на cold start) (scope: `src/client/project-manager/api.ts`, `src/client/project-manager/services/outgoing-message-queue.ts`, `src/client/project-manager/services/pm-bridges.ts`; expected commit message: `fix(pm): queue ws messages until connected`)
2. [DONE] Git Commit: `fix(pm): queue ws messages until connected` (hash: 31f0d729)
3. [DONE] PM: `workspace-activate` на cold start/reconnect без ожидания WS ACK (scope: `src/client/project-manager/components/layout/workspace-scope-sync.ts`; expected commit message: `fix(pm): activate workspace without waiting for ws ack`)
4. [DONE] Git Commit: `fix(pm): activate workspace without waiting for ws ack` (hash: dfc2982f)

### Stream: PM — Session Resume Click Must Not Dead-Click
1. [DONE] PM: убрать жесткую зависимость resume от `workspace:select:ack` (best-effort select), чтобы клик по `Reviewer Codex` после рестарта Core всегда открывал/создавал сессию (scope: `src/client/project-manager/components/sessions/session-resume-intent.ts`, `src/client/project-manager/components/sessions/session-resume-intent.test.ts`; expected commit message: `fix(pm): avoid dead click on session resume (best-effort workspace select)`)
2. [DONE] Git Commit: `fix(pm): avoid dead click on session resume (best-effort workspace select)` (hash: e8358e0b)

### Stream: PM — Rehydrate After Core Restart (No Empty Dialog)
1. [DONE] PM: на ws reconnect (сигнал `core:state`) повторно гидрировать `/api/v1/status` + подгружать `session:history`, чтобы после рестарта Core при открытом PM не получали `No messages yet` и “мертвые” локальные sessionId (scope: `src/client/project-manager/components/sessions/status-hydrator.ts`; expected commit message: `fix(pm): rehydrate sessions on ws core:state (survive core restart)`)
2. [DONE] Git Commit: `fix(pm): rehydrate sessions on ws core:state (survive core restart)` (hash: 0f1db8f2)

### Stream: Docs — Report + Plan
1. [DONE] Docs: архивировать предыдущий план и завести новый план под Phase 160 + отчет сессии (scope: `doc/TODO/todo-plan.md`, `doc/TODO/Archive/todo-plan-phase159-dialog-ui-2026-02-14.md`, `doc/Sessions/Session045.md`; expected commit message: `docs(todo): start Phase160 (pm cold-start restore) + Session045`)
2. [DONE] Git Commit: `docs(todo): start Phase160 (pm cold-start restore) + Session045` (hash: a5302ade)

### Stream: Release Build (New Patch Release)
1. [DONE] Gates: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd ...`, `npm run check:links` + таргетные сборки (scope: repo; expected commit message: `chore: quality gates before release`)
2. [DONE] Git Commit: `chore: quality gates before release` (hash: N/A — без изменений в tracked files)
3. [DONE] Build: `./scripts/build-all.sh` (version bump -> 1.1.592) (scope: repo build; expected commit message: `chore(release): build-all for next patch`)
4. [DONE] Git Commit: `chore(release): build-all for next patch` (hash: ace28fde)
5. [DONE] Build: `./scripts/build-release.sh --use-current-version` (VSIX: `codeai-hub-1.1.592.vsix`, path: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.1.592.vsix`) (scope: repo build; expected commit message: `chore(release): build vsix`)
6. [DONE] Git Commit: `chore(release): build vsix` (hash: N/A — VSIX artifact only)
7. [DONE] Docs: обновить этот план статусами/датами/путями артефактов релиза (scope: `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): record release 1.1.592 build stream`)
8. [DONE] Git Commit: `docs(todo): record release 1.1.592 build stream` (hash: 1d12dbaa)

### Stream: Release Build (New Patch Release 1.1.593)
1. [DONE] Gates: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd ...`, `npm run check:links` + таргетные сборки (scope: repo; expected commit message: `chore: quality gates before release`)
2. [DONE] Git Commit: `chore: quality gates before release` (hash: N/A — без изменений в tracked files)
3. [DONE] Build: `./scripts/build-all.sh` (version bump -> 1.1.593) (scope: repo build; expected commit message: `chore(release): build-all for next patch`)
4. [DONE] Git Commit: `chore(release): build-all for next patch` (hash: 5cc0129d)
5. [DONE] Git Commit: `chore(release): refresh provider manifest checksums` (hash: cfbba3d1)
6. [DONE] Build: `./scripts/build-release.sh --use-current-version` (VSIX: `codeai-hub-1.1.593.vsix`, path: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.1.593.vsix`) (scope: repo build; expected commit message: `chore(release): build vsix`)
7. [DONE] Git Commit: `chore(release): build vsix` (hash: N/A — VSIX artifact only)
8. [TODO] Docs: обновить этот план хешем коммита после апдейта (scope: `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): record release 1.1.593 build stream`)
9. [TODO] Git Commit: `docs(todo): record release 1.1.593 build stream` (hash: TBD)
