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

## 4) Target-state planning вынесен из текущего контракта

Явная snapshot-модель `inputLock.active/reason/updatedAt` пока **не реализована** на текущем `main`.

Её future-target design перенесён в planning-док:
- `doc/SolidWorks-WorkFlow/Plans/SessionInputLock_TargetState_Architecture.md`

До реализации этой модели живой код обязан опираться на:
- инкрементальные правила из разделов `3.1` и `3.2`;
- `workspace:snapshot` как текущий source-of-truth для lock/unlock;
- смежные SSOT-контракты по snapshot/runtime/UI.

---

## 5) Связанные документы

- `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md` (happy path)
- `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md` (snapshot SSOT)
- `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md` (dialogId/sessionId/providerSessionId)
- `doc/SolidWorks-WorkFlow/Plans/SessionInputLock_TargetState_Architecture.md` (future-target design)
