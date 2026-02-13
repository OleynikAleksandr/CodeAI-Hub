# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- Каждая микро-задача затрагивает не более **3 файлов**.
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- После каждой микро-задачи обязательны гейты: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетные сборки.
- После зелёных гейтов — Git Commit и немедленный апдейт статусов/хешей в этом файле.

## Required documents to review before work
1. `doc/Sessions/Session039.md`
2. `doc/SolidWorks-Flow/SessionContinuity/SessionContinuity.md`
3. `doc/SolidWorks-Flow/Stacks/CoreOrchestrator.md`
4. `packages/Codex_Module/src/messaging/message-processor.ts`

---

## Phase 154 — Codex Provider Turn Stall Diagnostics (owner: Oleksandr, updated: 2026-02-13)

**Problem:** В CodeAI-Hub (workspace) фиксируется сценарий: Core dispatch'ит сообщение, в Codex SDK логах появляется `user_input`, но не появляется `sdk:turn.started`. UI может зависнуть в `Agent is working…`.

**Goal:** Добавить targeted диагностическое логирование в Codex_Module, чтобы детерминированно увидеть, где зависание:
- message enqueue/dequeue (queue state),
- вход/выход `thread.runStreamed(...)`,
- ожидание первых событий.

**Acceptance:**
- Для каждого user turn в `~/.codeai-hub/logs/codex/sdk-codex-<threadId>.jsonl` видны `sdk:processor.*` записи с timestamps, позволяющие понять стадию зависания.
- При повторении бага будет понятно: очередь не потребляется или `runStreamed` завис/не вернул events, или event stream idle-timeout.

### Stream: Provider Trace Logging (Codex_Module)
1. [DONE] Codex_Module: добавить `sdk:processor.*` trace события вокруг enqueue/dequeue/processTurn/runStreamed/first-event (scope: `packages/Codex_Module/src/messaging/message-processor.ts`; expected commit message: `feat(codex): add processor trace logs for stalled turns`)
2. [DONE] Git Commit: `feat(codex): add processor trace logs for stalled turns` (hash: `e1eb153d`)

### Stream: Docs (Release Notes)
1. [DONE] Docs: обновить `CHANGELOG.md` + `README.md` под v1.1.582 (diagnostics: Codex stalled turn trace logs) (scope: `CHANGELOG.md`, `README.md`; expected commit message: `docs(release): add codex stalled turn diagnostics notes`)
2. [DONE] Git Commit: `docs(release): add codex stalled turn diagnostics notes` (hash: `017dafa9`)

### Stream: Quality Gates + Release Build
1. [DONE] Release: `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version` (scope: versions/manifests via build scripts; expected commit message: `chore(release): run build-all for v1.1.582`)
2. [DONE] Git Commit: `chore(release): run build-all for v1.1.582` (hash: `f69a320d`)
3. [DONE] Todo: archive plan + session report update (scope: `doc/TODO/Archive/*`, `doc/Sessions/Session040.md`; expected commit message: `docs(session): add session040 phase154 codex diagnostics`)
4. [DONE] Git Commit: `docs(session): add session040 phase154 codex diagnostics` (hash: `858fd3c6`)
