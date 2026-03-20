# Codex GPT-5.4 Resume Recovery Architecture

**Date:** 2026-03-20
**Status:** Execution baseline
**Scope:** Срочный bugfix для recovery/reopen цикла, который блокирует продолжение workflow после restart Core / Project Manager

---

## 1. Проблема

После restart `Project Manager` / `VS Code` / `Core` reopened workflow-dialog для `diagram_modules` может застрять в бесконечном состоянии `Agent is working… Please wait.`. Если пользователь нажимает `Stop` и пытается отправить ответ, UI переводит сообщение в queue и держит его до восстановления socket/core connection, но сама dialog session не возвращается в нормальное `idle/recoverable` состояние.

Критичный reproduction, подтвержденный в этой сессии:

1. В mirrored workspace существует continuity для `diagram_modules`, но `module-inventory.md` еще не создан.
2. Агент завершил turn вопросами к пользователю.
3. Пользователь закрывает `Project Manager`, закрывает `VS Code`, останавливает `Core`, затем снова поднимает runtime.
4. При reopen того же workspace `Project Manager` показывает perpetual `Agent is working… Please wait.` и не может нормально продолжить тот же dialog.

Рабочий reproduction workspace:

- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4`

---

## 2. Подтвержденные факты

### 2.1. Исходный Codex turn не завис

Провайдерный turn `diagram_modules` завершился нормально вопросами к пользователю; это видно в:

- `/Users/oleksandroliinyk/.codeai-hub/sessions/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub-codex-5-4/codexCli/codex-6e8d8c0b-d022-4226-9d5b-aa2c31982bcb-diagram-modules.jsonl`
- `/Users/oleksandroliinyk/.codeai-hub/logs/codex/sdk-codex-019d0a4a-b2ea-7101-bab2-215d1ca98ceb.jsonl`

То есть это не bug вида "модель не закончила turn".

### 2.2. Continuity индекс остался привязан к старому provider session

В continuity для `diagram_modules` остался старый `providerSessionId = 019d0a4a-b2ea-7101-bab2-215d1ca98ceb`:

- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4/continuity/index.json`

### 2.3. `workflow/state.json` не отражает реальный текущий шаг

`workflow/state.json` в этом workspace застрял на `description`, то есть runtime для reopen сильнее опирается на dialog continuity, чем на stage artifact state:

- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4/workflow/state.json`

### 2.4. Core повторяет recovery attempt сотни/тысячи раз

В `core.log` после рестарта идут повторяющиеся строки:

- `Codex resume skipped for thread 019d0a4a-b2ea-7101-bab2-215d1ca98ceb because defaultModel=gpt-5.4; starting a new thread instead`

Лог:

- `/Users/oleksandroliinyk/.codeai-hub/logs/core/core.log`

### 2.5. Queue в PM объясняется неготовым websocket

`Message queued. Sending as soon as it is ready…` появляется потому, что PM в момент reopen пишет сообщение в queue, когда socket к Core еще не открыт. Это симптом cold-start / reconnect, а не корень infinite recovery loop.

---

## 3. Root Cause

Корневая проблема составная:

1. `Project Manager` при reopen dialog использует continuity entry как источник истины и, если не видит runtime session для этого dialog, повторно вызывает `createSession(...)` со старым `providerSessionId`.
2. `Codex_Module` для `gpt-5.4` содержит unconditional special-case: вместо обычного `resumeSession()` он всегда создает fresh thread.
3. Continuity/dialog recovery path после этого не нормализует state так, чтобы PM признал свежесозданный runtime session успешным восстановлением исходного dialog.
4. В результате PM снова и снова пытается восстановить старый `providerSessionId`, а Core снова и снова уходит в "start a new thread instead".

Trigger-condition:

- отсутствие финального downstream artifact (`module-inventory.md`) усиливает зависимость stage от continuity/dialog recovery;
- но это не корневая причина, а только сценарий, в котором баг воспроизводится особенно стабильно.

---

## 4. Почему появился special-case для `gpt-5.4`

Этот special-case был добавлен как workaround под старую проблему выбора модели:

- старый Codex thread мог оставаться "sticky" на модели `gpt-5.3-codex`;
- при выбранной пользователем модели `gpt-5.4` простой resume не гарантировал, что старый thread действительно переключится на новую модель;
- поэтому в `Codex_Module` ввели bypass: при `defaultModel = gpt-5.4` не резюмировать старый thread, а стартовать fresh thread.

Проблема workaround:

- он слишком широкий;
- он применяется не только в реальном migration-case `old thread model != selected model`, а вообще при любом resume на `gpt-5.4`;
- continuity/recovery слой при этом остался рассчитан на обычный `resume`, а не на "silent fresh-thread substitution".

---

## 5. Required Decisions

### 5.1. Resume semantics

`gpt-5.4` должен снова стать resumable by default. Forced fresh-thread path допустим только если runtime действительно доказал migration-case и может безопасно нормализовать continuity на новый provider session.

### 5.2. Continuity normalization

Если runtime все же выбирает fresh-thread fallback вместо обычного resume, он обязан atomically:

- обновить runtime binding,
- обновить continuity tracker / index,
- обновить dialog/runtime reconciliation contract,
- снять perpetual bootstrap/working state.

### 5.3. PM reopen behavior

PM не должен бесконечно повторять `createSession(old providerSessionId)` на каждом reopen/list refresh, если старый provider session уже признан unrecoverable или был заменен новым runtime session.

### 5.4. No-artifact sessions

Workflow stage без финального artifact все равно обязан восстанавливаться в одно из корректных состояний:

- `idle`,
- `recoverable blocked`,
- `explicit continuity failure`,

но не в perpetual `working`.

---

## 6. Implementation Streams

### Stream A — Codex provider resume semantics

Цель:

- убрать или резко сузить unconditional `gpt-5.4 => fresh thread` behavior;
- вернуть корректный `resumeSession()` для обычных recovery сценариев.

Предварительное решение:

- сначала починить resume path максимально консервативно;
- migration-only fallback оставить только если он реально необходим и покрыт тестом.

### Stream B — Core continuity and runtime recovery

Цель:

- привести `session-request-handler` и continuity/dialog reconciliation к корректной работе, если runtime session был восстановлен или заменен;
- гарантировать `idle/recoverable` outcome после restart/reopen;
- исключить endless recovery loop по старому `providerSessionId`.

### Stream C — Project Manager dialog reopen contract

Цель:

- не вызывать бесконечный `api.createSession(...)` по одному и тому же stale continuity entry;
- уметь принять актуальный runtime session как продолжение dialog даже если provider session был переоформлен;
- не удерживать UI в ложном `working`, если провайдерный turn уже завершен.

### Stream D — Regression coverage and SSOT

Цель:

- покрыть exact reproduction automated tests;
- обновить `BugRegistry`, SSOT docs и session report после фикса.

---

## 7. Boundaries / Out of Scope

- Не трогаем diagram semantics/layout scope этого этапа, кроме recovery around `diagram_modules`.
- Не смешиваем этот bugfix с auth/quota UX improvements.
- Не переделываем весь continuity subsystem; правим только те контуры, которые прямо участвуют в recovery loop.
- Не меняем release/process docs шире, чем нужно для фикса и его верификации.

---

## 8. Verification Target

Обязательный validation scenario после фикса:

1. Запустить `diagram_modules` и довести агента до вопроса пользователю, не создавая `module-inventory.md`.
2. Закрыть `Project Manager`.
3. Остановить `Core`.
4. Снова поднять runtime.
5. Открыть тот же workspace и тот же dialog.
6. Убедиться, что:
   - нет бесконечного `Agent is working… Please wait.`;
   - нет бесконечного `Codex resume skipped ... starting a new thread instead` loop;
   - пользователь может отправить ответ в существующий dialog;
   - state возвращается в `idle` или понятный recoverable state.

Дополнительно:

- regression test на reopen/recovery loop;
- targeted builds/tests для `@codeai-hub/codex-module`, `@codeai-hub/core` и PM session UI.
