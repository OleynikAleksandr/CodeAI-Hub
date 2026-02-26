# Project Manager — Virtual Simulation (Cloud) Cold Start Recovery (Contract)

## 1. Проблема

В workflow-узле **Virtual Simulation (Cloud)** (stage: `virtual_simulation`) возможен некорректный recovery после перезапуска Project Manager и/или Core:

1) **Stuck input lock**
- В диалоге уже есть финальные вопросы от агента (ожидание ответа пользователя).
- Но поле ввода остаётся заблокированным, UI показывает ожидание вида “Agent is working… please wait” (или эквивалентный copy).
- Пользователь вынужден нажимать Stop/abort как аварийный workaround.

2) **Total timer сбрасывается в 0**
- В футере input-панели `total:  00h 00m 00s`, как будто сессии не было.
- При этом persisted task timers содержат ненулевые значения.

### 1.1 Наблюдаемые факты (evidence)

Для workspace `codeai-hub-claude`:
- История Virtual Simulation содержит сообщение с вопросами (ожидание user input):
  - `~/.codeai-hub/sessions/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub-claude/claudeCodeCli/claude-<id>-virtual-simulation.jsonl`
- Continuity-chain для stage `virtual_simulation` существует и содержит `tokenUsage`:
  - `.codeai-hub/codeai-hub-claude/continuity/virtual_simulation/.../chain.json`
- Persisted totals существуют локально в workspace:
  - `.codeai-hub/state/task-timers.json`

Итого: **история говорит “ждём пользователя”**, но **status/snapshot приводит UI к “running/locked”** и **total=0**.

## 2. Цель

Гарантировать, что после cold start (перезапуск PM/Core/машины) для resume-сессий (включая `virtual_simulation`) UI восстанавливается корректно:

- **Если turn завершён и ожидается пользователь** → input **разблокирован**, placeholder соответствует `idle`.
- **Total timer не теряется** и соответствует persisted totals (SSOT в Core).

## 3. In scope

1) Recovery stuck-lock для resume-сессий после рестарта:
- защита от “устаревшего running” (stale running), когда Core/PM не имеет живого inflight-turn, но snapshot/статус остаётся `running`.

2) Восстановление task timers:
- `taskTimer.totalSeconds` в snapshot должен восстанавливаться из persisted timers;
- `total` в UI не должен быть 0 при наличии persisted totals.

3) Минимальная диагностика:
- high-signal логи/telemetry на переходах `running → idle` и на recovery “stale running”.

## 4. Out of scope

- Переписывание всей SSOT-модели `inputLock.*` (это отдельная, более крупная миграция).
- Изменения бизнес-логики Virtual Simulation (шаблоны/артефакты/контент).
- Изменения provider SDK/CLI.

## 5. Инварианты (must-not-break)

1) **Snapshot-first lock**: UI не удерживает lock при snapshot `turnState="idle"` и `continuityLockActive=false`.
2) **Dialogs vs status split**: история (`dialogId`) восстанавливается независимо от live-статуса (`sessionId`).

Канон:
- `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
- `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
- `doc/SolidWorks-WorkFlow/Contracts/SessionTaskTimer_UI.md`

## 6. UX контракт

### 6.1 Input
- Когда агент **ждёт пользователя**: ввод доступен, нет wait-overlay.
- Когда агент **работает**: ввод заблокирован и показан “working…” copy.
- После cold start UI обязан прийти в корректное состояние без требования ручного Stop.

### 6.2 Timers
- `total` всегда отображается и не сбрасывается при перезапуске.
- При recovery допускается потеря только незакоммиченного “running segment” (если Core был убит), но не всего total.

## 7. Критерии приемки

1) **Reopen после вопросов**
- Запустить Virtual Simulation (Cloud), дождаться вопросов.
- Закрыть PM (и/или остановить Core).
- Открыть PM, открыть тот же workspace и сессию.
- Ожидание: input разблокирован, можно ответить на вопросы.

2) **Total не нулевой**
- При наличии persisted totals в `.codeai-hub/state/task-timers.json`:
  - UI `total` показывает ненулевое значение (или минимум — корректно восстановленный totalSeconds).

3) **Нет регрессии happy-path**
- Обычный цикл: submit → running → idle/unlock работает как прежде.

## 8. Верификация

- Smoke в PM UI по шагам из раздела 7.
- Таргетные проверки:
  - `npm run typecheck:webview`
  - при необходимости: `npm test` (особенно для `workspace-runtime` и Session UI).
