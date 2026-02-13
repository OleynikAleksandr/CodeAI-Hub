# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- Каждая микро-задача затрагивает не более **3 файлов**.
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- После каждой микро-задачи обязательны гейты: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетные сборки.
- После зелёных гейтов — Git Commit и немедленный апдейт статусов/хешей в этом файле.

## Required documents to review before work
1. `doc/Sessions/Session034.md` (THIS REPORT)
2. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
3. `doc/SolidWorks-Flow/Stacks/Project_Manager.md`
4. `doc/SolidWorks-Flow/Stacks/Codex_SDK_Module.md`
5. `doc/SolidWorks-Flow/Stacks/CoreOrchestrator.md`
6. `packages/core/src/remote-bridge/handlers/session-request-handler.ts` (контракт session metadata, события turn)
7. `packages/core/src/unified-session/storage.ts` (unified-session history)

---

## Phase 152 — Continuity Report Ack + Retry + User-Facing Error (owner: Oleksandr, updated: 2026-02-13)

**Problem:** в Codex иногда теряется internal turn `Flow Node Continuity — Create Report`, Core ждёт файл отчёта 60s, остаётся в состоянии `working`, и UI навсегда показывает `Agent is working… Please wait.` (блокирует ввод). Аналогичный класс ошибок должен быть обработан **универсально** для всех провайдеров.

**Goal:** сделать надёжный протокол финализации continuity‑отчёта:
- Core должен подтверждать, что запрос `Create Report` **доставлен** и/или что агент на него **отреагировал**.
- Если отчёт не получен и нет реакции, Core обязан **повторить** запрос в *той же* provider session (без rollover/new session) как минимум 1 раз.
- Если и повтор не дал реакции/отчёта, Core должен:
  - снять блокировку ввода;
  - вывести в UI явную ошибку с причиной/контекстом (пока текстом в области ввода/инфо‑баннером), чтобы пользователь мог продолжить работу.

### Stream: Core Continuity Handshake (delivery/ack)
1. [DONE] Core: ввести `continuityRequestId` и явный этап `waiting_for_continuity_ack` для internal `Create Report`; фиксировать попытки/таймштампы в session state (scope: `packages/core/src/...` continuity handler, `packages/core/src/...` session state; expected commit message: `fix(core): add continuity create-report request id and ack stage`)
2. [DONE] Git Commit: `fix(core): add continuity create-report request id and ack stage` (hash: `b2e7d30a`)

3. [DONE] Core: добавить подтверждение доставки/старта internal turn (ack) и только после ack ждать файл отчёта; при отсутствии ack за timeout → retry в той же provider session (scope: ≤3 файлов в core continuity/adapter pipeline; expected commit message: `fix(core): retry continuity create-report when no ack received`)
4. [DONE] Git Commit: `fix(core): retry continuity create-report when no ack received` (hash: `7bc46864`)

### Stream: Core Retry Policy (2 attempts + failure surface)
1. [DONE] Core: после 2 неуспешных попыток (нет ack и/или нет report file) — прекращать ожидание, переводить сессию в `ready` и эмитить в client stream событие `continuity_failed` с причиной (timeout, missing report path, provider id/session id, request id) (scope: core continuity handler + remote-bridge event; expected commit message: `fix(core): surface continuity failure and unblock session after retries`)
2. [DONE] Git Commit: `fix(core): surface continuity failure and unblock session after retries` (hash: `95e67f18`)

### Stream: UI Error Message (universal)
1. [DONE] PM: прокинуть `flow_node_rollover` (phase=failed) и `continuity_failed` в snapshot.status.rollover (error string), чтобы UI мог показать причину в поле ввода (scope: `src/types/session.ts`, `src/client/project-manager/components/sessions/token-usage-stream.ts`, 1 файл теста; expected commit message: `fix(pm): capture continuity failures in rollover status`)
2. [DONE] Git Commit: `fix(pm): capture continuity failures in rollover status` (hash: `c2b6dcab`)
3. [DONE] UI: отобразить `continuity_failed` как явное сообщение/баннер в Session UI (в том же месте, где показывается `Agent is working…`), и гарантировать, что input разблокирован (scope: `src/client/ui/src/session/input-panel.tsx`, `src/client/ui/src/session/session-view.tsx`, 1 файл теста; expected commit message: `fix(ui): show continuity failure message and unlock input`)
4. [DONE] Git Commit: `fix(ui): show continuity failure message and unlock input` (hash: `3255f8a2`)

### Stream: Docs Sync + Smoke Checklist (CoreOrchestrator focus)
1. [DONE] Docs: описать протокол ack/retry, 2-attempt policy и событие `continuity_failed` (SSOT) + обновить раздел CoreOrchestrator про internal turns/handshake (scope: `doc/SolidWorks-Flow/System/SystemArchitecture.md`, `doc/SolidWorks-Flow/Stacks/CoreOrchestrator.md`, `doc/SolidWorks-Flow/Stacks/Project_Manager.md`; expected commit message: `docs(system): document continuity ack/retry and failure surfacing`)
2. [DONE] Git Commit: `docs(system): document continuity ack/retry and failure surfacing` (hash: `c578d5f6`)

3. [DONE] Docs: обновить provider-спеки (как минимум Codex, и общие примечания для Claude/Gemini) + добавить smoke-чеклист воспроизведения/проверки для Codex/Claude/Gemini (scope: `doc/SolidWorks-Flow/Stacks/Codex_SDK_Module.md`, `doc/SolidWorks-Flow/Stacks/Claude.md`, `doc/SolidWorks-Flow/Stacks/Gemini_CLI_Module.md`; expected commit message: `docs(stacks): add continuity smoke checklist across providers`)
4. [DONE] Git Commit: `docs(stacks): add continuity smoke checklist across providers` (hash: `42ef8076`)

### Stream: Quality Gates + Release Build
1. [TODO] Прогнать обязательные гейты + таргетные сборки затронутых пакетов (core + UI), обновить `README/CHANGELOG`, собрать релиз: `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version` (scope: `CHANGELOG.md`, `README.md`, docs в `doc/SolidWorks-Flow/`; expected commit message: `docs(release): sync docs for v<next>`)
2. [TODO] Git Commit: `docs(release): sync docs for v<next>` (hash: TBD)
3. [TODO] Git Commit: `chore(release): run build-all for v<next>` (hash: TBD)
4. [TODO] Создать session report по результатам (scope: `doc/Sessions/SessionXXX.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(session): add session report for continuity ack/retry`)
5. [TODO] Git Commit: `docs(session): add session report for continuity ack/retry` (hash: TBD)
