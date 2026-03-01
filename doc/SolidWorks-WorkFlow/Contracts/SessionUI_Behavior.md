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

---

## 3) Типы сессий

### 3.1 Resume workflow-сессии (основной режим)

Примеры: `Description`, `Virtual Simulation`, `Diagram Modules`, `Diagram Facades`.

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
- ■ останавливает Core и снимает локальную блокировку ввода для подготовки следующего шага recovery.
- Следующая отправка должна сначала восстановить Core, затем отправить сообщение.

Scope: в первую очередь для resume-сессий.

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
   - После rollover StatusPanel/SessionIdBar показывают текущий `sessionId`.

6. **Cold start idle snapshot without reason**
   - `turnState="idle"`, `continuityLockActive=false`, без `continuityLockReason`.
   - Ввод остаётся доступным.

---

## 9) Связанные документы

- `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
- `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
