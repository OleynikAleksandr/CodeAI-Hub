# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- Каждая микро-задача затрагивает не более **3 файлов**.
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- После каждой микро-задачи обязательны гейты: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетные сборки.
- После зелёных гейтов — Git Commit и немедленный апдейт статусов/хешей в этом файле.

## Required documents to review before work
1. `doc/Sessions/Archive/Session040.md`
2. `doc/SolidWorks-Flow/Stacks/CoreOrchestrator.md`
3. `packages/Codex_Module/src/messaging/message-processor.ts`
4. `doc/TODO/Archive/todo-plan-phase154-release-1.1.582-2026-02-13.md`

---

## Phase 155 — Codex Turn Stall Root Cause + Fix (owner: Oleksandr, updated: 2026-02-13)

**Goal:** По новым `sdk:processor.*` breadcrumbs локализовать точную причину зависания Codex (между `user_input` и `sdk:turn.started`) и реализовать устойчивое исправление.

### Stream: Diagnostics (More Breadcrumbs)
1. [DONE] Codex_Module: добавить breadcrumbs вокруг `turn.completed` (begin/done) + `usage_limits.read` (begin/done/timeout) + `processor.turn.finally`, чтобы видеть зависание внутри handler-ов (scope: `packages/Codex_Module/src/messaging/message-processor.ts`; expected commit message: `feat(codex): add turn completion breadcrumbs and usage limits timeout guard`)
2. [DONE] Git Commit: `feat(codex): add turn completion breadcrumbs and usage limits timeout guard` (hash: `acfadadc`)

### Stream: Fix (Stop After Terminal Turn)
1. [DONE] Codex_Module: прекращать чтение event-stream после `turn.completed/turn.failed` и делать best-effort `events.return()` с таймаутом (чтобы не залипала очередь и `enqueue` всегда приводил к `dequeue`) (scope: `packages/Codex_Module/src/messaging/message-processor.ts`; expected commit message: `fix(codex): stop consuming events after turn completion to prevent queue stalls`)
2. [DONE] Git Commit: `fix(codex): stop consuming events after turn completion to prevent queue stalls` (hash: `5d22f571`)

### Stream: Design (Docs First)
1. [TODO] Docs: зафиксировать архитектуру и гипотезы в новом документе (scope: `doc/SolidWorks-Flow/`; expected commit message: `docs(architecture): codex stalled turn root cause and fix`)
2. [TODO] Git Commit: `docs(architecture): codex stalled turn root cause and fix` (hash: TBD)

### Stream: Implementation
1. [TODO] Codex_Module/Core: реализовать фикс согласно утвержденной архитектуре (scope: TBD; expected commit message: `fix(codex): prevent stalled turns between enqueue and turn.started`)
2. [TODO] Git Commit: `fix(codex): prevent stalled turns between enqueue and turn.started` (hash: TBD)

### Stream: Verification + Release
1. [TODO] Gates + Release: прогнать гейты и собрать новый релиз (scope: scripts; expected commit message: `chore(release): build-all for next patch`)
2. [TODO] Git Commit: `chore(release): build-all for next patch` (hash: TBD)
