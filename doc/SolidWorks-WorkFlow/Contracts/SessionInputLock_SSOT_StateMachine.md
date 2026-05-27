# Session Input Lock — SSOT + State Machine (Contract)

**Status:** Current implemented contract (incremental baseline)
**Updated:** 2026-03-13

**Scope:** блокировка/разблокировка поля ввода пользователя в PM/Session UI для *resume‑сессий* и *one‑shot* сессий.

**Applies to:**
- Core runtime snapshot: `packages/core/src/workspace-runtime/*`
- PM snapshot sync: `src/client/project-manager/components/sessions/*`
- Shared Session UI: `src/client/ui/src/session/*`

**Почему этот документ появился:** мы получили серию багов “ввод залипает” в разных режимах (crash mid‑turn, cold start, rollover/resume). Причина в том, что lock‑состояние сейчас вычисляется из нескольких независимых источников и местами «догадывается» эвристиками.

---

## 1) Коротко: что хотим получить

**Цель:** один и только один источник правды (SSOT) для состояния ввода, который:
- всегда восстанавливается после перезагрузки PM/Core/компьютера;
- однозначно объясняет *почему* ввод заблокирован (reason);
- гарантирует отсутствие вечных блокировок (есть таймауты/аварийные переходы);
- не зависит от “порядка прихода событий” (stream vs snapshot) и от локальных эвристик UI.

---

## 2) Термины

- **dialogId** — логический диалог (история в UI), бесконечный.
- **sessionId** — runtime‑сегмент Core (live статус/lock/usage). Может меняться при continuity/rollover.
- **providerSessionId** — нативный id провайдера (resume thread).

См. базовые определения: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`.

---

## 3) Текущее состояние (почему ловим баги)

Сейчас “ввод заблокирован” собирается из набора флагов, которые живут в разных слоях:
- Core: `turn_state`, `continuity lock`, `binding status`.
- Workspace snapshot: `turnState`, `continuityLockActive/reason/transition`, `bindingStatus`.
- PM/UI: дополнительная логика/guards (например “не разблокировать пока не пришёл явный unlock‑reason”).

**Побочный эффект:** после cold start серверный snapshot может быть корректным (`idle` + `lock=false`), но UI остаётся locked, потому что локальный guard не разрешает переход в `idle` без специальной “разрешающей” причины.

Это и есть пример **нескольких источников правды**.

---

## 3.1 Инкрементальный этап (реализовано в release `1.1.646`)

Пока целевой `inputLock.*` SSOT не внедрён, зафиксирован промежуточный этап защиты от “вечных” блокировок:

1) **PM/UI:** если `workspace:snapshot` сообщает `turnState="idle"` и `continuityLockActive=false`, ввод обязан разблокироваться **даже когда** `continuityLockReason` отсутствует.
2) **Core:** для `resume_in_place` idle/unlocked-сессий snapshot нормализуется и всегда содержит явный unlock-reason: `continuityLockReason="no_rollover_needed"`.

Важно: это defence-in-depth. UI не должен зависеть от наличия `continuityLockReason`, а Core не должен эмитить “пустые” причины в idle-состоянии.

## 3.2 Инкрементальный этап (реализовано в release `1.1.687`)

Зафиксирована дополнительная защита cold-start recovery от stale-running состояния:

1) **Core (WorkspaceRuntimeFacade):** при `workspace select` выполняется нормализация “устаревшего running”:
   - `turnState === "running"`
   - `finalTurnCompleted === true`
   - `continuityLockActive === false`
   - `continuityLockTransition.awaitingBootstrapTurn !== true`
2) При выполнении условий выше session snapshot переводится в `turnState="idle"` до публикации snapshot в PM/UI.
3) Цель: исключить вечный lock в кейсе “живого inflight-turn уже нет, но состояние осталось running”.

---

## 3.3 Инкрементальный этап (реализовано в release `1.2.39`)

Закрыт класс багов “вечное Agents is working” для reopened workflow dialogs, чьи continuity entries существуют на диске, но runtime session-объект не был создан в Core. Раньше Core при cold-start материализовал runtime session только для `lastActive` stage; остальные reopened dialogs оставались без записи в `workspace:snapshot`, и initial `connectionState: "running"` из `createInitialSnapshot` никогда не разблокировался через existing `snapshotSignalsIdleUnlocked` reconciliation (см. §3.1). Симметричный симптом — `SessionRequestHandlerStopAction.handleStop()` возвращал `"Session not found"` и не эмитил `turn_state: "idle"`, из-за чего кнопка Stop не разблокировала UI.

Решение — Core-side runtime session materialization invariant:

1) **Core (`RemoteBridgeDialogCommandRouter.handleDialogList`)**: после чтения `ContinuityIndexEntry[]` через `DialogListService.listDialogs()` вызывается `materializeContinuityEntries` для каждой entry, у которой есть `latestSessionId` + `providerId` + `providerSessionId` и которая ещё не зарегистрирована в `SessionManager`.
2) Materializer регистрирует stub runtime session:
   - `SessionManager.registerSessionWithId` — Session объект с `providerSessionStatus: "ready"`, `stage`, `providerSessionId` из continuity.
   - `SessionProviderBindingService.registerRestoredBinding` — paper-binding в `providerSessions` Map без adapter call.
   - `WorkspaceRuntimeFacade.notifySessionCreated` — hydrate в WorkspaceStore, чтобы session попала в следующий `workspace:snapshot` push с `turnState: "idle"`, `continuityLockActive: false`, `bindingStatus: "ready"`.
3) Materializer idempotent: повторные `dialog:list` не пересоздают session и не вызывают лишних `notifySessionCreated`.
4) Provider adapter turn НЕ стартуется в момент materialize. Реальный `thread/resume` остаётся ленивым и происходит при первом user message через existing `resolveProviderSessionId` в `session-request-handler-message-dispatch.ts`.

Инвариант для обоих reader'ов состояния input lock:

> После первого `dialog:list` в workspace каждый reopened workflow dialog гарантированно имеет runtime session в `workspace:snapshot` с `turnState: "idle"`. PM `createInitialSnapshot` → `session-stream.applyWorkspaceSnapshotToSnapshots()` reconciliation снимает initial "running" через `snapshotSignalsIdleUnlocked` path без дополнительных fallback-правил на UI-стороне. `handleStop(sessionId)` находит session и binding, нормально инвалидирует binding, эмитит `turn_state: "idle"`.

Canonical code:
- `packages/core/src/session-manager/index.ts` — `registerSessionWithId`.
- `packages/core/src/remote-bridge/handlers/session-provider-binding-service.ts` — `registerRestoredBinding`.
- `packages/core/src/remote-bridge/handlers/session-continuity-materializer.ts` — `materializeContinuityEntries`.
- `packages/core/src/remote-bridge/remote-bridge-dialog-command-router.ts` — integration в `handleDialogList`.

## 3.4 Managed review turn completion gate (release `1.2.378`)

Provider terminal events alone are not an unlock source for managed workflow turns. A provider may emit `turn_completed` while Core still needs to persist assistant messages, run managed post-turn validation, clean/commit stage-owned residue, or open a Core review gate.

Current implemented rule:

1. For managed workflow sessions, provider `turn_completed` is delayed behind Core post-turn arbitration.
2. PM/shared UI may unlock input only after Core has settled the managed turn through snapshot/session state and either:
   - opened the current `managed-workflow-user-review` gate; or
   - completed/failed the managed transition with an explicit Core outcome.
3. Inline review confirmation actions lock the input/buttons while the Core review decision is in flight.
4. Older review cards are historical messages only and do not provide active buttons, so they cannot create duplicate provider turns or unlock the UI prematurely.

Canonical code:
- `packages/core/src/remote-bridge/handlers/session-provider-event-router.ts`
- `packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.ts`
- `src/client/ui/src/session/dialog-panel.tsx`
- `src/client/ui/src/session/session-view.tsx`
- `src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx`
- `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts`

---

## 4) Target-state planning вынесен из текущего контракта

Явная snapshot-модель `inputLock.active/reason/updatedAt` пока **не реализована** на текущем `main`.

Отдельный future-target planning-док для этой модели был удалён во время cleanup `Plans/`; активного design-track по второй фазе input-lock rewrite сейчас нет.

До реализации этой модели живой код обязан опираться на:
- инкрементальные правила из разделов `3.1` и `3.2`;
- `workspace:snapshot` как текущий source-of-truth для lock/unlock;
- смежные SSOT-контракты по snapshot/runtime/UI.

---

## 5) Связанные документы

- `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md` (happy path)
- `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md` (snapshot SSOT)
- `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md` (dialogId/sessionId/providerSessionId)
