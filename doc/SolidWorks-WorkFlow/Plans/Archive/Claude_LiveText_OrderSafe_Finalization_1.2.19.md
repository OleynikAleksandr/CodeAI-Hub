# Claude Live Text Order-Safe Finalization — Planning Doc

## 1. Problem

После релиза `1.2.17` в Claude turn зафиксирован новый user-visible дефект: после уже завершённого финального ответа может появиться отдельная лишняя assistant bubble с обрезанным суффиксом слова, например `ell.`.

Подтверждённый сценарий:
- unified session JSONL сохраняет нормальный финальный ответ Claude и сразу после него отдельное ordinary assistant message `ell.`;
- native Claude project session не содержит этого хвоста;
- SDK trace тоже не содержит этого хвоста;
- значит дефект возникает не в провайдере и не в SDK, а в нашем post-SDK message routing / finalization path.

Это нарушает product contract:
- финальный `end_turn` ответ должен материализоваться ровно один раз;
- live preview и final assistant assembly не должны порождать второй видимый хвост того же text block;
- unified session не должна содержать orphan suffix fragments после завершённого ответа.

## 2. Confirmed Evidence

### 2.1. Unified session is corrupted after the final answer

- Unified session JSONL:
  `/Users/oleksandroliinyk/.codeai-hub/sessions/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub-claude/claudeCodeCli/claude-15c2c78b-f135-44fe-870a-a6f537108383-description.jsonl`
  - line `58`: корректная финальная фраза `Это влияет на разделение ответственности между двумя shell.`
  - line `59`: отдельное лишнее assistant message `ell.`

### 2.2. Native Claude and SDK output are clean

- SDK trace:
  `/Users/oleksandroliinyk/.codeai-hub/logs/claude/sdk-claude-882b9a4c-5093-483c-9074-ea401dc5b9f4.jsonl`
  - финальный `assistant` приходит без дополнительного хвоста.
- Native Claude session:
  `/Users/oleksandroliinyk/.codeai-hub/providers/claude/home/.claude/projects/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub-claude/882b9a4c-5093-483c-9074-ea401dc5b9f4.jsonl`
  - финальный message тоже чистый, без `ell.`

### 2.3. Real event order differs from the currently guarded test order

В наблюдаемой сессии SDK event order был таким:
- `assistant(full text)`
- `content_block_stop`
- `message_delta(end_turn)`
- `message_stop`

Текущий regression coverage защищает только сценарий, где `content_block_stop` приходит до assembled assistant text, поэтому observed production order остаётся незащищённым.

## 3. Root Cause

### 3.1. Claude finalization is currently order-sensitive

`packages/Claude_Module/src/messaging/claude-stream-event-router.ts` и `packages/Claude_Module/src/messaging/claude-text-live-buffer.ts` делят ответственность между двумя путями:
- live materialization path для `text_delta`;
- regular assembled assistant path для финального текстового flush.

Сейчас эти пути не имеют общего single-owner contract на завершение одного и того же Claude text block.

### 3.2. Final dedupe relies on length, not on canonical content ownership

`claude-text-live-buffer.ts` при final consume опирается на `materializedLength`, а не на полный canonical snapshot `nativeAccumulated`.

Этого достаточно, пока события приходят в ожидаемом порядке. Но если assembled assistant text arrives раньше terminal boundary, stale suffix может пережить live reconcile и позже выйти вторым путём как отдельное ordinary assistant message.

Именно так появляется orphan suffix `ell.` как хвост последнего слова `shell.`.

### 3.3. Router still allows a second ordinary assistant flush

Даже после частичной live materialization router остаётся способен выпустить pending assistant text через regular path, если не знает, что этот text block уже был канонически завершён.

В результате:
- provider truth остаётся корректным;
- SDK truth остаётся корректным;
- unified session повреждается локально в нашем routing/finalization слое.

## 4. Solution

### 4.1. Introduce single-owner finalization for each text block

Для каждого Claude text block нужен явный order-safe contract:
- либо block окончательно завершается live reconcile path;
- либо block окончательно завершается regular assistant flush path;
- но никогда не обоими путями сразу.

### 4.2. Reconcile against canonical accumulated text, not only emitted length

Финальная сверка должна сравнивать уже материализованный live state с полным canonical `nativeAccumulated` для конкретного text block.

Требование:
- если assembled/native text уже полностью покрывает показанный live preview, дополнительный suffix emit запрещён;
- если реально существует ещё не показанный финальный хвост, он должен быть выпущен ровно один раз.

### 4.3. Delay or suppress regular flush when the block was already finalized

`claude-stream-event-router.ts` должен знать, что конкретный message/text block уже прошёл canonical finalization, и блокировать любой повторный ordinary assistant flush для того же блока.

Практически допустимы два эквивалентных варианта:
- отложить окончательное reconcile до terminal boundary (`content_block_stop` / `message_stop`);
- либо ввести явный per-block finalization state и проверять его перед regular flush.

Выбор реализации должен остаться минимальным по diff и не ломать existing Claude live text UX.

## 5. Target Files / Structure

### Primary implementation
- `packages/Claude_Module/src/messaging/claude-text-live-buffer.ts`
- `packages/Claude_Module/src/messaging/claude-stream-event-router.ts`

### Regression tests
- `packages/Claude_Module/src/messaging/claude-stream-event-router.live-text.test.ts`

Если тестовый сценарий не помещается без нарушения 500-line guard, допускается вынести observed-order regression в отдельный test file.

## 6. Required Guards

Нужны regression tests минимум на четыре случая:
- observed production order `assistant -> content_block_stop -> message_delta(end_turn) -> message_stop` не создаёт orphan suffix;
- финальное слово с ASCII suffix, например `shell.`, не может деградировать в отдельное `ell.`;
- старый guarded order по-прежнему проходит без regressions;
- нормальный Claude `end_turn` final answer materializes как обычный assistant text ровно один раз.

## 7. Contracts To Sync If Implemented

- `doc/SolidWorks-WorkFlow/Modules/Claude.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`

Новый SSOT нужен только для реализованного single-owner finalization contract; сам этот planning-doc SSOT не является.

## 8. Scope Boundaries

### In scope
- order-safe Claude text finalization внутри post-SDK routing path;
- suppression of duplicate/final suffix fragments in unified session output;
- regression coverage для реально наблюдавшегося event order.

### Out of scope
- изменения native Claude session format;
- изменения SDK event order;
- глобальный redesign assistant/live/thinking rendering;
- cross-provider unification Claude/Codex/Gemini live text protocols.

## 9. Execution Readiness

Перед созданием нового `doc/TODO/todo-plan.md` следующий execution cycle должен:
- подтвердить, что scope идёт как follow-up на релиз `1.2.17`;
- синхронизировать Bug Registry entry для этого дефекта отдельной записью либо явным follow-up к существующему Claude live-text bug;
- после user approval нарезать фикс на микро-задачи с обязательными commit checkpoints.
