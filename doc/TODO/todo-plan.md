# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules)
- TODO Plan состоит из Phase (Фаз). В каждой Phase — Stream (стримы) с микро‑задачами.
- Каждая микро‑задача затрагивает **≤ 3 файлов** (или пакетов).
- Каждая микро‑задача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- После каждой микро‑задачи прогоняем гейты: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетные сборки затронутого пакета/клиента.
- После зелёных гейтов: Git Commit + немедленный апдейт статусов/хешей в этом файле.

Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.

Архитектурный источник правды (обязательно перечитать перед реализацией):
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`

---

## Phase 200 — SSOT: единый источник правды для панели диалога (owner: Oleksandr+Codex, updated: 2026-02-15)

**Цель:** панель диалога в PM/UI (в real-time и после любых рестартов PM/Core) показывает ленту **только** из канонического JSONL:
`~/.codeai-hub/sessions/<workspaceKey>/<providerId>/<dialogId>.jsonl`

**Проблемы, которые закрываем этой фазой:**
- пропажа user‑сообщений в real-time при живой работе PM;
- пустой UI после рестарта PM+Core до клика по сессии в дереве (нет auto‑select/auto‑load);
- расхождение “что показываем” между live‑режимом и cold start (должен быть 1 поток данных).

### Stream: Live‑доставка сообщений из JSONL (cursor/tail) — без альтернативных источников
1. [DONE] Fix: привести real-time обновление ленты к 1 механизму: сигнал `dialog:message` → запрос `dialog:history(cursor=lastCursor)` → append по cursor; убрать/запретить любые прямые добавления контента из runtime payload (scope: `src/client/project-manager/*` ≤3 файлов; expected commit message: `fix(pm): realtime dialog tail strictly from jsonl`)
2. [DONE] Git Commit: `fix(pm): realtime dialog tail strictly from jsonl` (hash: a8944e61)
3. [DONE] Fix: стабилизировать id сообщений истории диалога (timestamp+role+messageId), чтобы дедуп по message.id не затирал user‑сообщения между сегментами (scope: `src/client/project-manager/components/sessions/project-manager-dialog-session-view-helpers.ts` ≤3 файлов; expected commit message: `fix(pm): stabilize dialog message ids across segments`)
4. [DONE] Git Commit: `fix(pm): stabilize dialog message ids across segments` (hash: d94dc244)

### Stream: Cold start auto‑select/auto‑load
1. [TODO] Fix: после рестарта PM+Core автоматически восстанавливать last selected dialog (или reviewer dialog по умолчанию) и сразу грузить full history из JSONL без ручного клика (scope: `src/client/project-manager/*` ≤3 файлов; expected commit message: `fix(pm): restore last dialog selection on cold start`)
2. [TODO] Git Commit: `fix(pm): restore last dialog selection on cold start` (hash: TBD)

---

## Phase 201 — Segment meta: boundary + #1|#2 пишутся по факту старта НОВОЙ физической сессии (owner: Oleksandr+Codex, updated: 2026-02-15)

**Цель:** маркер “Новая сессия” и summary `#1 (..%) | #2 (..%) | ...` — это **метаданные сегментов** канонического JSONL.
Они должны:
- писаться **один раз** и **строго в начало** каждого нового сегмента;
- триггериться **первичным фактом**: Core создал новую физическую сессию (rollover/context‑limit), а не косвенными симптомами (thinking/parsing сообщений);
- восстанавливаться после любых рестартов из JSONL.

### Stream: Core trigger — писать boundary/meta в момент создания новой физической сессии
1. [TODO] Fix: привязать запись boundary/meta к событию/месту, где Core создаёт новую физическую сессию (rollover) и знает dialogId/agentId; убрать зависимости от парсеров/симптомов (scope: `packages/core/*` ≤3 файлов; expected commit message: `fix(core): write segment boundary on session creation`)
2. [TODO] Git Commit: `fix(core): write segment boundary on session creation` (hash: TBD)
3. [TODO] Fix: железная идемпотентность boundary/meta (защита от двойной записи при ретраях/повторах) + диагностика (лог/метрика) при попытке повторной записи (scope: `packages/core/*` ≤3 файлов; expected commit message: `fix(core): hard idempotency for segment meta`)
4. [TODO] Git Commit: `fix(core): hard idempotency for segment meta` (hash: TBD)

### Stream: UI render — только explicit boundary/meta из JSONL
1. [TODO] Fix: финально убедиться, что UI никогда не вставляет divider имплицитно (thinking‑хак) и не имеет второго источника divider’ов; любые разделители/summary строятся только из событий JSONL (scope: `src/client/ui/src/session/*` ≤3 файлов; expected commit message: `fix(ui): remove all implicit session dividers`)
2. [TODO] Git Commit: `fix(ui): remove all implicit session dividers` (hash: TBD)

---

## Phase 202 — Input lock/unlock: нельзя отправить запрос “в никуда” (owner: Oleksandr+Codex, updated: 2026-02-15)

**Цель:** input lock контракт — единый и строгий.
- UI разблокирует ввод **только** после `turn_completed` (последнего ответа агента в туре).
- Core запрещает send, пока сегмент не готов (rollover/resume/continuity handshake).

### Stream: Core — строгий контракт готовности к send
1. [TODO] Fix: Core явно репортит состояние “можно/нельзя отправлять” и не допускает отправку до завершения bootstrap/rollover, чтобы UI не мог отправить “в никуда” (scope: `packages/core/*` ≤3 файлов; expected commit message: `fix(core): strict continuity lock contract for sends`)
2. [TODO] Git Commit: `fix(core): strict continuity lock contract for sends` (hash: TBD)

### Stream: UI — разблокировка ввода только по turn completion
1. [TODO] Fix: UI игнорирует промежуточные события и снимает блокировку ввода только по финальному `turn_completed`/idle состоянию (scope: `src/client/ui/src/session/*` ≤3 файлов; expected commit message: `fix(ui): unlock input only after turn completion`)
2. [TODO] Git Commit: `fix(ui): unlock input only after turn completion` (hash: TBD)

---

## Phase 203 — Naming/Continuity hygiene: корректные имена agent streams (owner: Oleksandr+Codex, updated: 2026-02-15)

**Цель:** стабильные имена потоков и папок continuity.
- Агент, который пишет description, должен именоваться `description`, а не `agent`.
- У каждого агента (например reviewer) — одна бесконечная сессия и одна continuity‑папка.

### Stream: Fix naming — description != agent
1. [TODO] Fix: нормализовать именование per-agent JSONL/continuity директории: `*-description.jsonl` вместо `*-agent.jsonl` для description‑агента + миграция/alias чтения старого имени (scope: `packages/core/*` ≤3 файлов; expected commit message: `fix(core): correct description agent stream name`)
2. [TODO] Git Commit: `fix(core): correct description agent stream name` (hash: TBD)

---

## Phase 204 — Release Build (New Patch Release) (owner: Codex, updated: 2026-02-15)

### Stream: Release Build (New Patch Release)
1. [TODO] Gates: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd ...`, `npm run check:links` + таргетные сборки `npm run build --workspace core`, `npm run build --workspace project-manager`, `npm run build:webview`, `npm run typecheck:webview` (scope: repo; expected commit message: `chore: quality gates before release`)
2. [TODO] Git Commit: `chore: quality gates before release` (hash: TBD)
3. [TODO] Build: `./scripts/build-all.sh` (version bump -> TBD) (scope: repo; expected commit message: `chore(release): build-all for next patch`)
4. [TODO] Git Commit: `chore(release): build-all for next patch` (hash: TBD)
5. [TODO] Build: `./scripts/build-release.sh --use-current-version` (VSIX) (scope: repo build)
6. [TODO] Docs: обновить этот план статусами/датами/путями артефактов релиза (scope: `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): record patch release build (TBD)`)
7. [TODO] Git Commit: `docs(todo): record patch release build (TBD)` (hash: TBD)
