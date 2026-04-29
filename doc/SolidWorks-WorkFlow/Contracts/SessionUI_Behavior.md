# Session UI (Project Manager) — Behavior Contract (Happy Path)

**Scope:** каноническое поведение UI-сессий в Project Manager при нормальной работе Core/Provider.

**Applies to:**
- PM bundle: `src/client/project-manager/`
- Shared Session UI: `src/client/ui/src/`

---

## 1) Термины (SSOT)

- **dialogId** — логический диалог (история в UI), бесконечный.
- **sessionId** — runtime-сегмент Core (live статус/lock/usage), может меняться при continuity.
- **providerSessionId** — нативный id провайдера.

См. также:
- `WorkspaceRuntime.md`
- `Dialogs_And_Continuity_Routing.md`

---

## 2) Источники правды

### 2.1 Input lock — snapshot-first

Итоговая блокировка ввода вычисляется только по snapshot-данным (`workspace:snapshot`).

Стрим-события (`session:stream`) могут ускорять UI, но не должны ломать snapshot-инварианты.

Критично:
- `continuityLockReason` — UX-hint, а не условие блокировки.
- Если snapshot сообщает `turnState="idle"` и `continuityLockActive=false`, UI обязан разблокировать ввод.

### 2.2 История vs live статус

- История/диалог отображаются по `dialogId`.
- Status/usage/input-state следуют активному `sessionId`.

### 2.3 Usage telemetry — lifecycle-owned, UI display-only

- `SessionIdBar` и остальные session status surfaces только отображают последний известный `usageLimits` / `tokenUsage` snapshot для активного `sessionId`.
- UI mount/remount и переход `binding.status` в `ready` не имеют права сами инициировать automatic provider refresh.
- PM держит provider-scoped usage cache (`providerScopeKey = {providerId}:global`) и seed-ит из него новые runtime/dialog snapshots даже если source `sessionId` ещё не успел materialize-иться в локальном snapshot store.
- На `binding_ready` / `session_opened` / `provider_session_rebound` / reconnect UI сначала получает replay last-known snapshot; bootstrap refresh допустим только как one-shot fallback, если cache отсутствует.
- `dialog_opened` — отдельная pre-turn boundary: Core обязан сначала replay-ить last-known usage snapshot, затем запускать cheap provider refresh даже если cache уже есть, чтобы пользователь видел свежие лимиты до отправки следующего сообщения.
- Каноническая граница свежего usage update — `turn_completed`: provider/core доставляют terminal usage snapshot в turn-completion flow или примыкающем `session:stream`, а UI только применяет его.
- Пока pre-turn refresh не вернул payload, `SessionIdBar` показывает явный pending state (`Session ...`, `Weekly ...`) без фейкового `0%`; как только provider присылает `resetsAt`, 5-часовое и недельное окна обязаны показывать его в скобках.

### 2.4 Message materialization uniqueness

- Optimistic user bubble — временный placeholder. После первого canonical echo из `dialog:history` UI обязан заменить placeholder на canonical message, а не показывать второй user bubble.
- Эквивалентные terminal assistant payload-ы одного logical turn могут материализоваться в истории только один раз, даже если provider/runtime прислал несколько terminal signals.

### 2.5 Runtime hydration diagnostics

- `dialog:history` hydration failures, status snapshot fetch failures, and Core supervisor bridge request failures do not change Session UI source-of-truth. They are recoverable evidence for diagnostics, not alternate UI state.
- Browser-side Core Bridge must log these failures through sanitized diagnostics without raw provider payloads or user message content. Live stream replay, status snapshots, and later history hydration remain the recovery paths.
- Session UI must not use silent `catch` blocks for runtime hydration/recovery evidence. If a failure is intentionally non-blocking, it still needs a safe diagnostic event.
- PM Core stream validation belongs at the PM/Core transport boundary before Session UI handlers. View components consume already validated runtime/session events and must not re-own wire schema validation.

---

## 3) Типы сессий

### 3.1 Resume workflow-сессии (основной режим)

Примеры: `Description`, `Virtual Simulation`, `Diagram Modules`.

Правило:
- после завершённого turn, когда агент ждёт пользователя, ввод обязан быть доступен.

### 3.2 One-shot/no-resume сессии (ограниченный режим)

Применяются только там, где шаг/операция явно объявлены как no-resume.

Правило:
- после финала ввод read-only;
- ручной force-unlock не должен нарушать контракт шага.

---

## 4) Законы блокировки/разблокировки

### 4.1 Глобальный инвариант

В нормальном режиме (без локального override) ввод доступен, когда одновременно:
- сессия не terminal/read-only;
- `continuityLockActive === false`;
- `turnState === "idle"`;
- нет queued сообщения.

UI copy должна соответствовать состоянию:
- `running` → “Agent is working…”
- continuity lock → “Agent is resuming…”

### 4.2 Workflow open со стартовым core-submit

Если workflow-сессия создаётся со стартовым system submit, ввод должен быть заблокирован сразу при открытии.

Не допускается unlock-gap до первого snapshot.

### 4.3 Resume-сессии

Разблокировка ввода привязана к завершению turn (status snapshot), а не к самому факту появления текстового ответа.

### 4.4 Reopened dialog после cold-start

Когда PM открывает dialog из continuity после cold-start Core, Core обязан гарантировать runtime session в `workspace:snapshot` до того, как session-stream reconciliation loop попытается переключить initial `connectionState: "running"` в `"idle"`. Эту гарантию обеспечивает `RemoteBridgeDialogCommandRouter.handleDialogList` → `materializeContinuityEntries`: для каждой continuity entry с `latestSessionId + providerId + providerSessionId` создаётся stub runtime session с `turnState: "idle"`, `continuityLockActive: false`, `bindingStatus: "ready"` без запуска provider adapter turn. PM не держит никаких специальных fallback-правил для "нет runtime session в snapshot" — контракт таков, что это состояние после первого `dialog:list` невозможно. Дополнительно reopened dialog обязан получать usage telemetry по схеме `provider-cache seed -> dialog_opened cheap refresh -> live provider updates`: пользователь видит last-known limits сразу, а свежий snapshot приходит до следующего turn, не требуя eager `resumeSession`. См. `SessionInputLock_SSOT_StateMachine.md` §3.3.

---

## 5) Continuity / rollover (happy path)

- Во время rollover/resume bootstrap ввод блокирован и UI показывает `resuming...`.
- После завершения bootstrap:
  - активный `sessionId` переключён,
  - история остаётся в рамках того же `dialogId`,
  - ввод разблокирован.

---

## 6) Manual controls (аварийные)

### 6.1 Force unlock

Force unlock — локальный UI override:
- не меняет SSOT в Core;
- нужен как аварийный escape hatch;
- не гарантирует доставку сообщения без восстановления live-сессии.

### 6.2 Play/Stop

- ▶ отправляет сообщение как Enter.
- ■ отправляет session-scoped stop command для активной logical session.
- `Stop` обязан:
  - остановить текущий turn, если он ещё выполняется;
  - либо снять stuck-state текущей logical session, если turn фактически завершился, но UI/Core остались в `working`;
  - не останавливать Core runtime;
  - не затрагивать другие dialog sessions/workspaces.
- `Stop` не должен вызывать supervisor stop или `POST /api/v1/shutdown`.
- После `Stop` logical session остаётся доступной для следующего сообщения пользователя.
- Если текущий provider binding после `Stop` признан непригодным, следующий send может создать fresh provider session и перебиндить её к той же logical session.

Scope: в первую очередь для resume-сессий.

### 6.3 Global runtime controls

Остановка или перезапуск Core runtime остаются отдельными runtime-control действиями и не входят в Session input contract.

---

## 7) Description pre-submit UI (без сессии)

Отдельный UI-контракт для стадии `Description` до submit:
- runtime-сессии ещё нет;
- слева показывается Description Help;
- справа редактируется `questionnaire.md`;
- после `Submit questionnaire` переход к обычному Session UI.

Канон:
- `DescriptionStep_SingleAgent.md`
- `ProjectManager_DescriptionEntry_CopyRefactor.md`

---

## 8) Регрессионный чеклист (happy path)

1. **Workflow open → immediate lock**
   - Открыть workflow-сессию со стартовым submit.
   - Ввод блокируется сразу.

2. **Description turn complete → unlock**
   - Дождаться ответа Description Agent.
   - После завершения turn ввод становится доступным.

3. **Virtual Simulation turn complete → unlock**
   - Дождаться завершения turn.
   - Ввод доступен для следующего сообщения.

4. **Rollover happy path → unlock after bootstrap**
   - В rollover ввод временно блокирован.
   - После bootstrap ввод разблокирован.

5. **Status panels follow active segment**
   - После rollover SessionIdBar показывает текущий `providerSessionId` и actual usage limits, а StatusPanel рендерит четырёх-chip ряд с model identity (`Модель:` + provider-tinted кнопки имени модели и reasoning) и token usage активной session.

6. **Cold start idle snapshot without reason**
   - `turnState="idle"`, `continuityLockActive=false`, без `continuityLockReason`.
   - Ввод остаётся доступным.

7. **Stop mid-turn does not stop Core**
   - Во время активного turn нажать `Stop`.
   - Core runtime продолжает жить, а ввод возвращается в recoverable state без global shutdown.

8. **Stop unlocks stuck session**
   - При stuck-сессии без terminal event нажать `Stop`.
   - Ввод снова доступен для следующего send без рестарта Core.

9. **Session remount replays usage without mount refresh**
   - Перемонтировать Session UI при `binding.status="ready"`.
   - UI показывает cached `usageLimits` / `tokenUsage` без нового automatic provider refresh.

10. **Stop + fast resend does not leave duplicate user bubble**
   - Остановить turn, сразу отправить follow-up сообщение.
   - После прихода canonical tail history в диалоге остаётся один user bubble для этого сообщения.

11. **Equivalent terminal signals emit one final assistant bubble**
   - Получить terminal пару с одинаковым assistant payload.
   - В истории materialize-ится один final assistant answer.

---

## 9) Связанные документы

- `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
- `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
