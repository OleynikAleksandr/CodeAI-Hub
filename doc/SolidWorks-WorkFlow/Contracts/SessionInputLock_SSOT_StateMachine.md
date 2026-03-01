# Session Input Lock — SSOT + State Machine (Contract)

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

## 4) Новый контракт: SSOT только в Core snapshot

### 4.1 SSOT поле

Core обязан публиковать **явное** состояние ввода в `workspace:snapshot`.

Рекомендуемая форма (добавить в `WorkspaceRuntime` snapshot на уровне session):

- `inputLock.active: boolean`
- `inputLock.reason: InputLockReason`
- `inputLock.updatedAt: string (ISO)`

`InputLockReason` (минимальный набор для наших сценариев):
- `idle_ready` — ввод доступен, агент ждёт пользователя.
- `turn_running` — идёт активный turn.
- `binding_pending` — Core ещё не готов принимать/посылать (resume/binding).
- `rollover_report_in_progress` — создаётся continuity report.
- `resume_bootstrap` — новая workflow‑сессия создана, отправлен bootstrap prompt, ждём завершения.
- `context_check_pending` — решается вопрос “нужен ли rollover”.
- `terminal_no_resume` — read‑only (one‑shot завершён).
- `recovery_required` — Core обнаружил, что ранее был crash mid‑turn и требуется явное действие пользователя (но ввод должен быть доступен).

**Критично:** даже когда ввод *разблокирован*, причина должна быть явной (`idle_ready`), чтобы UI не гадал по отсутствующим полям.

### 4.2 Правило UI

UI/PM **не вычисляет** locked‑состояние из “кучи условий”.

Единственный критерий (без ручного override):
- `disabled = inputLock.active || isQueued || terminalNoResume`

Placeholder/copy — только по `inputLock.reason`.

### 4.3 Ручной “замочек” (force unlock)

Ручная разблокировка — **локальный UI override**, который:
- не изменяет SSOT в Core;
- не должен ломать очередь доставки сообщений.

Контракт:
- при `forceUnlocked=true` UI может разрешить ввод/submit даже если `inputLock.active=true`;
- но отправка в Core должна быть либо queued (если Core не принимает), либо отправлена сразу (если Core уже idle).

---

## 5) State Machine (как SSOT меняется)

### 5.1 Состояния

- **UNLOCKED / idle_ready**
- **LOCKED / turn_running**
- **LOCKED / binding_pending**
- **LOCKED / rollover_report_in_progress**
- **LOCKED / resume_bootstrap**
- **LOCKED / context_check_pending**
- **LOCKED / terminal_no_resume**
- **UNLOCKED / recovery_required** (ввод доступен, но UI показывает подсказку)

### 5.2 Переходы (high level)

- `user_submit` → `turn_running`
- `turn_completed` → `context_check_pending` (если требуется) → либо `rollover_report_in_progress`, либо `idle_ready`
- `rollover_new_session_created` → `resume_bootstrap`
- `bootstrap_turn_completed` → `idle_ready`
- `one_shot_final` → `terminal_no_resume`
- `core_restart_detected`:
  - если в persisted SSOT был `turn_running` и heartbeat/stamp устарел → `recovery_required` (и ввод **разблокирован**)
  - если был `resume_bootstrap` и таймаут истёк → `idle_ready` или `recovery_required` (но не вечный lock)

**Инвариант:** любое “locked” состояние обязано иметь путь выхода: либо “unlock”, либо “unlock + error/recovery”.

---

## 6) Персистентность (обязательное)

Чтобы cold start не ломал UX, SSOT должен переживать рестарт.

Минимальное требование:
- Core сохраняет последний `inputLock` (active+reason+updatedAt) в дисковый state (per workspace + session).
- На старте Core ре‑гидратит этот state и продолжает state machine.

Если персистентность сейчас делать слишком дорого, допустим промежуточный этап:
- Core на старте обязан “нормализовать” snapshot так, чтобы для idle resume-сессий reason был явным (минимум: `no_rollover_needed` для `resume_in_place`).
  Тогда UI не будет держать lock из-за отсутствия reason, но при этом UI всё равно остаётся snapshot-first и не зависит от reason как от условия unlock.

---

## 7) Чеклист сценариев (минимальная матрица тестов)

1) **Нормальная работа**
- submit → lock (`turn_running`), после ответа → unlock (`idle_ready`).

2) **Rollover happy path**
- threshold/context → `rollover_report_in_progress` → `resume_bootstrap` → `idle_ready`.

3) **Crash mid‑turn + manual unlock**
- после рестарта Core/PM: не должно быть вечного lock.
- `recovery_required` допускается, но ввод должен быть доступен (manual force-unlock остаётся только как аварийный fallback).

4) **Cold start (комп/ядро)**
- открыть workspace с уже завершённой resume workflow-сессией (например, Description или Virtual Simulation) → `idle_ready` сразу, без “залипания”.

5) **One‑shot**
- после финала → `terminal_no_resume`, ввод read‑only, без замочка.

---

## 8) Связанные документы

- `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md` (happy path)
- `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md` (snapshot SSOT)
- `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md` (dialogId/sessionId/providerSessionId)
