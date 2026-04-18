# Claude Context Probe + Continuity Unlock Fix 1.2.16 — Planning Doc

## 1. Problem

В `Description`-сессии на Claude пользователь получает финальный ответ, но input остаётся в состоянии `Agent is resuming your session... Please wait.` и больше не разблокируется.

Подтверждённая трассировка:
- native Claude project JSONL и наш `sdk-claude-*.jsonl` завершают turn штатно с `stop_reason = end_turn`;
- unified session JSONL также содержит полный финальный ответ;
- сразу после этого Core логирует `Claude /context token read failed ... ERR_UNKNOWN_FILE_EXTENSION ".exe"`;
- затем PM repeatedly делает `refreshUsageLimits`, а dialog bootstrap пишет `restoreRequested: false`.

Это означает, что реального resume/rollover не было. Сломалась post-turn usage/context синхронизация, после чего Core не довёл continuity arbitration до unlock state.

## 2. Root Cause

### 2.1. Claude-specific immediate bug

`packages/Claude_Module/src/sdk/claude-context-usage-probe.ts` на Unix запускает Claude probe как:

- `runner = process.execPath`
- `args = [executablePath, ...payload.args]`

В текущей установке `executablePath` указывает на `~/.npm-global/bin/claude`, который резолвится в native `claude.exe` binary bundle, а не в JS entrypoint. Поэтому `node <claude binary>` падает с `ERR_UNKNOWN_FILE_EXTENSION ".exe"`.

### 2.2. Shared continuity risk

`turn_completed` ставит session в `context_check_pending`, а `SessionRequestHandlerTurnArbitration` снимает этот pending только после одного из двух исходов:
- найден usable usage snapshot и принято решение `no_rollover` / `rollover_required`;
- bootstrap/rollover lifecycle завершён другим путём.

Если provider уже закончил turn, но usable post-turn usage snapshot не появится вообще, текущий arbitration path может оставить session в pending-state бесконечно.

Для Codex и Gemini прямой клон Claude probe bug не подтверждён:
- у них нет такого `node <native binary>` post-turn probe path;
- Gemini обычно эмитит `token_usage` до `turn_completed`;
- Codex передаёт usage в `turn_completed` event и отдельно обновляет usage-limits.

Но shared continuity risk остаётся системным, если какой-либо provider в eligible flow-node session завершит turn без usable usage snapshot и без явного сигнала, что snapshot уже недоступен.

## 3. Solution

### 3.1. Claude probe runner fix

Для Claude context usage probe на Unix:
- запускать native executable напрямую, если `executablePath` не является JS/MJS/CJS entrypoint;
- через `process.execPath` запускать только script-style executable path.

Это возвращает рабочий `/context` probe для текущей macOS install layout.

### 3.2. Explicit provider signal for unavailable post-turn usage

Если Claude turn уже завершён, а `/context` token usage read завершился fail-path'ом, provider должен эмитить в `turn_completed` явный сигнал:
- `postTurnTokenUsageUnavailable: true`

Этот сигнал не означает threshold decision сам по себе. Он означает только одно: trailing usage snapshot для этого завершённого turn больше не придёт.

### 3.3. Core arbitration hardening

`SessionRequestHandlerTurnArbitration` должен трактовать комбинацию:
- `turn_completed`
- eligible flow-node session
- no usable usage snapshot
- `postTurnTokenUsageUnavailable: true`

как явный `no_rollover` fallback.

Это не ломает existing trailing-usage contract:
- отсутствие usage само по себе всё ещё не означает `no_rollover`;
- `no_rollover` разрешается только при explicit provider signal, что post-turn usage уже unavailable.

## 4. Files / Structure

### Claude provider
- `packages/Claude_Module/src/sdk/claude-context-usage-probe.ts`
- `packages/Claude_Module/src/messaging/claude-token-usage-sync.ts`
- `packages/Claude_Module/src/messaging/claude-usage-sync.ts`
- `packages/Claude_Module/src/messaging/claude-message-finish-handler.ts`

### Core continuity
- `packages/core/src/remote-bridge/handlers/session-request-handler-turn-arbitration.ts`

### Tests
- Claude unit guard for Unix probe runner selection
- Core regression guard for `turn_completed + postTurnTokenUsageUnavailable => no_rollover unlock`

## 5. Contracts to update

- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
- `doc/SolidWorks-WorkFlow/Modules/Claude.md`

## 6. Release target

- Release: `1.2.16`
- Scope: bugfix release
- Validation owner: user retest after new VSIX build

## 7. Out of scope

- PM/UI copy refactor for generic blocked states
- workflow `lastActive.artifactPath` drift toward `questionnaire.md`
- adaptive continuity timeout policy for providers that may delay trailing usage
