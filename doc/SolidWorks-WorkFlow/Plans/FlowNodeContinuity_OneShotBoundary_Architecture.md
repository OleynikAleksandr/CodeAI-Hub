# Flow Node Continuity One-Shot Boundary Architecture

**Status:** Proposed
**Date:** 2026-03-15
**Owner:** Oleksandr

---

## 1. Problem

Для document/workflow nodes (`description` и будущих long-lived documentation steps) flow-node continuity rollover может стартовать до завершения текущего user one-shot turn.

Симптом, воспроизведённый пользователем на `Gemini`:

- threshold remaining% был искусственно поднят до `80%`;
- агент в текущем turn-е успел прочитать большой набор документов и сформировать понимание того, что нужно внести в `Final_Description.md`;
- при этом continuity rollover стартовал до завершения turn-а, агент переключился на continuity report, а новая session получила только bootstrap prompt.

Это нарушает ожидаемый продуктовый инвариант:

- threshold должен только взводить необходимость rollover;
- текущий one-shot turn обязан завершиться полностью;
- только после `turn_completed` Core может просить continuity report и создавать новую session.

Проблема не ограничена шагом `description`: тот же дефект применим ко всем document nodes, где один user-visible dialog может состоять из цепочки provider sessions.

---

## 2. Confirmed Evidence

Воспроизведение и анализ подтверждены:

- unified dialog/session log:
  - `/Users/oleksandroliinyk/.codeai-hub/sessions/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub-gemini/geminiCli/gemini-b40688e0-dd5d-4fe3-91e4-5bc2258e91cd-description.jsonl`
- continuity reports:
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub gemini/.codeai-hub/codeai-hub-gemini/flow/nodes/description/continuity/reports/2026-03-15T12-52-27-905Z-Agent-geminiCli.md`
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub gemini/.codeai-hub/codeai-hub-gemini/flow/nodes/description/continuity/reports/2026-03-15T13-01-19-051Z-Agent-geminiCli.md`

По логу видно, что агент ещё находился в середине user task (чтение Contracts, synthesis pending changes для `Final_Description.md`), но continuity path уже переключился на report/bootstrap.

---

## 3. Root Cause

Root cause находится в Core arbitration, а не в самом continuity report.

### 3.1 Неправильная граница запуска rollover

`handleFlowNodeContinuityProviderEvent()` в:

- `packages/core/src/remote-bridge/handlers/session-request-handler.ts`

сейчас может стартовать `startFlowNodeRolloverFromUsage()` сразу на первом event, из которого извлекается `token_usage`.

Это неверно, потому что `token_usage` не гарантирует завершение текущего user turn.

### 3.2 Почему баг проявился именно на Gemini

Provider event order различается:

- `Gemini` эмитит `token_usage` до `turn_completed`;
- `Claude` и `Codex` в текущей реализации обычно эмитят `turn_completed` раньше, а `token_usage` прилетает позже.

Итог:

- один и тот же Core race существовал для всех;
- но фактически проявился только на `Gemini`, потому что там threshold-trigger смог сработать до конца turn-а.

### 3.3 Дополнительное наблюдение

`flowNodeTokenUsageSnapshots` уже кеширует latest usage snapshot, но этот кеш сейчас почти не участвует в deferred post-turn arbitration.

---

## 4. Target Behavior

Нужен единый provider-agnostic инвариант:

1. `token_usage` во время user turn может только сообщить: rollover потребуется после завершения turn-а.
2. Пока текущий one-shot turn не завершён, Core не имеет права:
   - создавать continuity report prompt;
   - создавать новую provider/runtime session;
   - блокировать progression текущего user task continuity bootstrap-ом.
3. Реальный rollover разрешён только после `turn_completed` текущего user turn.

---

## 5. Proposed Solution

### 5.1 Во время turn

На любом `token_usage` event:

- извлечь snapshot;
- сохранить его в `flowNodeTokenUsageSnapshots`;
- не запускать rollover немедленно, если turn ещё не дошёл до `turn_completed`.

### 5.2 На `turn_completed`

Когда приходит `turn_completed`:

- начать post-turn arbitration как и сейчас (`context_check_pending`);
- брать usage:
  - сначала из самого `turn_completed`, если payload содержит usage;
  - иначе из последнего cached snapshot в `flowNodeTokenUsageSnapshots`.

Далее:

- если usage ниже threshold -> `rollover_required` и запуск continuity rollover;
- если usage выше threshold -> `no_rollover` и normal unlock;
- если usage ещё нет -> оставить session в pending-arbitration и дождаться trailing `token_usage`.

### 5.3 Trailing token usage

Если provider шлёт `turn_completed` раньше `token_usage` (как `Claude`/`Codex` сейчас), то поздний `token_usage` должен завершать уже начатую post-turn arbitration.

То есть:

- после `turn_completed` возможен pending-state;
- trailing `token_usage` в этом pending-state завершает решение (`rollover_required` или `no_rollover`).

### 5.4 Reset between turns

Cached token-usage snapshot должен очищаться:

- в начале нового outbound user turn;
- после финального post-turn arbitration.

Это нужно, чтобы usage предыдущего turn-а не влиял на следующий.

---

## 6. Scope

Минимальный scope первой версии:

- `packages/core/src/remote-bridge/handlers/session-request-handler.ts`
- `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`
- `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`

Дополнительно:

- `doc/Sessions/Session078.md`
- `doc/TODO/todo-plan.md`

---

## 7. Non-Goals

- Не переписывать continuity report format.
- Не добавлять новые continuity artifacts или long-term memory snapshot для document nodes.
- Не менять provider-specific event order.
- Не расширять flow-node continuity scope за пределы document-node bugfix без отдельного planning cycle.

---

## 8. Verification

Обязательные guards:

1. `Gemini` order:
   - `token_usage -> turn_completed`
   - rollover не стартует до `turn_completed`
   - после `turn_completed` rollover стартует корректно.
2. `Claude/Codex` order:
   - `turn_completed -> token_usage`
   - session остаётся в pending-arbitration
   - trailing `token_usage` завершает решение.
3. Cached usage предыдущего turn-а не протекает в новый turn.
4. Реальный smoke:
   - document node на `Gemini` с искусственно высоким threshold;
   - агент заканчивает user task в текущем one-shot;
   - continuity report создаётся только после фактического завершения turn-а.

---

## 9. Decision

Рекомендуемое решение:

- перенести trigger continuity rollover на post-turn boundary;
- использовать `token_usage` только как input для решения после завершения текущего turn-а;
- сохранить delayed-совместимость с provider-ами, у которых usage приходит после `turn_completed`.

Это устраняет premature rollover без усложнения document workflow дополнительными continuity artifacts.
