# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules)
- TODO Plan состоит из Phase (Фаз). В каждой Phase — Stream (стримы) с микро‑задачами.
- Каждая микро‑задача затрагивает **≤ 3 файлов** (или пакетов).
- Каждая микро‑задача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- После каждой микро‑задачи прогоняем гейты: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетные сборки затронутого пакета/клиента.
- После зелёных гейтов: Git Commit + немедленный апдейт статусов/хешей в этом файле.

Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.

Source of Truth (архитектура):
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`

---

## Phase 190 — Design: Единый источник правды для панели диалога (owner: Oleksandr+Codex, updated: 2026-02-15)

**Goal (канон):** панель диалога в UI/PM (и после рестартов, и в реальном времени) отображает историю **только** из канонического JSONL:
`~/.codeai-hub/sessions/<workspaceKey>/<providerId>/<dialogId>.jsonl`

**Симптомы, которые должны исчезнуть:**
- user‑сообщения не появляются в real-time, но появляются после reload PM;
- двойные/лишние divider’ы “Новая сессия” (из-за нескольких механизмов разметки);
- token summary `#1 (..%) | #2 (..%) | ...` пропадает после рестартов;
- разблокировка ввода происходит не в конце turn’а → можно отправить запрос “в никуда”.

### Stream: Архитектурный контракт “Dialog SSOT pipeline”
1. [DONE] Docs: дописать контракт в архитектуру: (a) canonical JSONL как SSOT для ленты, (b) модель cursor/offset для догонки, (c) правила дедупликации/ID, (d) правила автоселекции после cold start (PM+Core restart), (e) что считается “стартом нового provider сегмента” и когда писать boundary+meta **идемпотентно** (scope: `doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`; expected commit message: `docs(flow): add dialog ssot pipeline contract`)
2. [DONE] Git Commit: `docs(flow): add dialog ssot pipeline contract` (hash: d3f9a7ba)

### Stream: План миграции UI/PM (история vs live)
1. [DONE] Docs: в плане зафиксировать, какие текущие источники данных отключаем/ограничиваем (snapshots/virtual conversation) и какие остаются только для статуса (locks/rollover/usage), чтобы лента не зависела от runtime chain (scope: `doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`; expected commit message: `docs(flow): clarify ui data sources for dialog vs status`)
2. [DONE] Git Commit: `docs(flow): clarify ui data sources for dialog vs status` (hash: beea3528)

---

## Phase 191 — Core: История + tail из JSONL для UI/PM (owner: Codex, updated: 2026-02-15)

### Stream: Core API — full history + tail (cursor)
1. [DONE] Implement: Core отдаёт историю диалога по `dialogId` как full snapshot (с начала) + tail (с `cursor`) и возвращает `lastCursor` (scope: `packages/core/*` (≤3 файлов); expected commit message: `feat(core): dialog history + tail cursor api`)
2. [DONE] Git Commit: `feat(core): dialog history + tail cursor api` (hash: 3bed3a86)

### Stream: Core indexing — cold start (PM+Core restart)
1. [DONE] Implement: после cold start Core умеет находить JSONL по `dialogId` без наличия активной runtime‑сессии (индексация/резолв пути), чтобы PM мог восстановить ленту без ручного клика (scope: `packages/core/*` (≤3 файлов); expected commit message: `fix(core): resolve dialog jsonl on cold start`)
2. [DONE] Git Commit: `fix(core): resolve dialog jsonl on cold start` (hash: 08bcdd58)

### Stream: Core write order — append then emit
1. [TODO] Fix: гарантировать порядок “append в JSONL → emit stream append event” + идемпотентность для boundary/meta на старт нового provider сегмента (scope: `packages/core/*` (≤3 файлов); expected commit message: `fix(core): jsonl append ordering and idempotent segment meta`)
2. [TODO] Git Commit: `fix(core): jsonl append ordering and idempotent segment meta` (hash: TBD)

---

## Phase 192 — PM/UI: Панель диалога только из JSONL (owner: Oleksandr+Codex, updated: 2026-02-15)

### Stream: UI store — single source (history + append)
1. [TODO] Implement: Session/PM dialog panel получает сообщения из одного канала: `history(full)` при открытии + `append(tail)` в real-time; snapshots/chain не используются для ленты (только для status) (scope: `src/client/ui/src/*` (≤3 файлов); expected commit message: `refactor(ui): dialog panel ssot via jsonl feed`)
2. [TODO] Git Commit: `refactor(ui): dialog panel ssot via jsonl feed` (hash: TBD)

### Stream: Дедуп/ID — устранить пропажу user‑сообщений
1. [TODO] Fix: устранить дедуп/коллизии message id между сегментами, из-за которых user‑сообщения могут не отображаться в real-time (scope: `src/client/ui/src/*` (≤3 файлов); expected commit message: `fix(ui): stable dedupe for dialog appends`)
2. [TODO] Git Commit: `fix(ui): stable dedupe for dialog appends` (hash: TBD)

### Stream: Autoselect — убрать “пустую сессию” после cold start
1. [TODO] Fix: после рестарта PM+Core восстановить last selected dialog (или выбрать reviewer dialog по умолчанию) и сразу загрузить full history (scope: `src/client/project-manager/*` (≤3 файлов); expected commit message: `fix(pm): restore last dialog selection on cold start`)
2. [TODO] Git Commit: `fix(pm): restore last dialog selection on cold start` (hash: TBD)

### Stream: UI divider/summary — только explicit из JSONL
1. [TODO] Fix: divider “Новая сессия” и summary `#1|#2|...` строятся/обновляются только из JSONL boundary/meta событий, без thinking‑хаков; после рестартов гарантированно восстанавливаются (scope: `src/client/ui/src/session/*` (≤3 файлов); expected commit message: `fix(ui): render boundaries and summary from jsonl only`)
2. [TODO] Git Commit: `fix(ui): render boundaries and summary from jsonl only` (hash: TBD)

---

## Phase 193 — Fix: input lock/unlock (turn boundaries) (owner: Oleksandr+Codex, updated: 2026-02-15)

### Stream: UI — блокировка ввода по “turn completed”
1. [TODO] Fix: input разблокируется только после финального события завершения turn’а (а не по промежуточным сообщениям), чтобы нельзя было отправить запрос “в никуда” (scope: `src/client/ui/src/session/*` (≤3 файлов); expected commit message: `fix(ui): unlock input only after turn completion`)
2. [TODO] Git Commit: `fix(ui): unlock input only after turn completion` (hash: TBD)

### Stream: Core — контракт блокировки (rollover/blocked)
1. [TODO] Fix: Core репортит блокировку/готовность так, чтобы UI не мог отправить, пока сегмент не готов (rollover/resume handshake) (scope: `packages/core/*` (≤3 файлов); expected commit message: `fix(core): strict continuity lock contract for sends`)
2. [TODO] Git Commit: `fix(core): strict continuity lock contract for sends` (hash: TBD)

---

## Phase 194 — Release Build (New Patch Release) (owner: Codex, updated: 2026-02-15)

### Stream: Release Build (New Patch Release)
1. [TODO] Gates: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd ...`, `npm run check:links` + таргетные сборки `npm run build:core`, `npm run build:project-manager`, `npm run build:webview`, `npm run typecheck:webview` (scope: repo; expected commit message: `chore: quality gates before release`)
2. [TODO] Git Commit: `chore: quality gates before release` (hash: TBD)
3. [TODO] Build: `./scripts/build-all.sh` (version bump -> TBD) (scope: repo; expected commit message: `chore(release): build-all for next patch`)
4. [TODO] Git Commit: `chore(release): build-all for next patch` (hash: TBD)
5. [TODO] Build: `./scripts/build-release.sh --use-current-version` (VSIX) (scope: repo build)
6. [TODO] Docs: обновить этот план статусами/датами/путями артефактов релиза (scope: `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): record patch release build (TBD)`)
7. [TODO] Git Commit: `docs(todo): record patch release build (TBD)` (hash: TBD)
