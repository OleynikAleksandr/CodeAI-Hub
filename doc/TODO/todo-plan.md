# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionTaskTimer_UI.md`
  - `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_VirtualSimulation_ColdStartRecovery.md`
  - `doc/BugRegistry.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стрим), в каждом Stream — подзадачи.
- **Ограничение:** каждая подзадача должна затрагивать **≤ 3 файлов**.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `npm test`, `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:tsprune`, `npx ultracite fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **НИКОГДА** не обходить гейты (`--no-verify`).

---

## Phase 261 — Virtual Simulation cold start recovery (stuck lock + total timer) (owner: Oleksandr, updated: 2026-02-26)

**Проблема:** после перезапуска Project Manager/Core в workflow-узле `virtual_simulation` ввод может “залипать” в состоянии ожидания (как будто агент работает), хотя в истории уже есть вопросы и ожидается ответ пользователя. Дополнительно `total` в input footer может сбрасываться в `00h 00m 00s` при наличии persisted timers.

**Цель:** восстановление после cold start должно быть корректным: если turn завершён и ожидается пользователь — input разблокирован; `total` не теряется и соответствует persisted totals (SSOT в Core).

---

### Stream 0: Contract sign-off (Design Phase gate)
1. [TODO] Подтвердить контракт `ProjectManager_VirtualSimulation_ColdStartRecovery.md` (scope: `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_VirtualSimulation_ColdStartRecovery.md`; expected commit: `docs(vs): approve cold start recovery contract`).
2. [TODO] Git Commit: `docs(vs): approve cold start recovery contract` (hash: TBD)

### Stream 1: Repro snapshot + regression test (stuck lock)
1. [TODO] Добавить regression test: после рестарта/cold start “stale running” не должен удерживать `turnState/connectionState` в `running`, если нет живого inflight-turn; ожидание пользователя должно приводить к `idle` (scope: `packages/core/src/workspace-runtime/*` test + минимальная фиксация; expected commit: `test(core): cover stale-running recovery on cold start`).
2. [TODO] Git Commit: `test(core): cover stale-running recovery on cold start` (hash: TBD)

### Stream 2: Core fix — stale running recovery
1. [TODO] Реализовать нормализацию на гидрации/старте: “устаревший running” переводится в `idle` (или `recovery_required`, но с разблокированным вводом), без необходимости ручного Stop (scope: `packages/core/src/workspace-runtime/*`; expected commit: `fix(core): recover stale running sessions on cold start`).
2. [TODO] Git Commit: `fix(core): recover stale running sessions on cold start` (hash: TBD)

### Stream 3: Regression test + fix (task timers / total)
1. [TODO] Добавить regression test: при наличии persisted totals `.codeai-hub/state/task-timers.json` snapshot обязан содержать корректный `status.taskTimer.totalSeconds` после рестарта (scope: `packages/core/src/*` timers + test; expected commit: `test(core): restore taskTimer totals on cold start`).
2. [TODO] Git Commit: `test(core): restore taskTimer totals on cold start` (hash: TBD)
3. [TODO] Починить восстановление `taskTimer.totalSeconds` из persisted state и прокидывание в `workspace:snapshot` (scope: `packages/core/src/*`; expected commit: `fix(core): restore task timer totals from persisted workspace state`).
4. [TODO] Git Commit: `fix(core): restore task timer totals from persisted workspace state` (hash: TBD)

### Stream 4: PM/UI smoke + docs sync
1. [TODO] Выполнить PM UI smoke по критериям приемки (reopen после вопросов → input unlocked; total non-zero). При необходимости обновить SSOT-доки (`SessionTaskTimer_UI.md`, `SessionInputLock_SSOT_StateMachine.md`) без изменения смысла контракта (scope: `doc/SolidWorks-WorkFlow/Contracts/SessionTaskTimer_UI.md`, `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`; expected commit: `docs(vs): sync cold start recovery behavior notes`).
2. [TODO] Git Commit: `docs(vs): sync cold start recovery behavior notes` (hash: TBD)

### Stream 5: Optional release build (после фикса)
1. [BLOCKED] На чистом дереве выполнить `./scripts/build-all.sh` и зафиксировать обновлённые версии/манифесты (scope: release manifests + package versions; expected commit: `chore(release): build-all vX.Y.Z`).
2. [BLOCKED] Git Commit: `chore(release): build-all vX.Y.Z` (hash: TBD)
3. [BLOCKED] Выполнить `./scripts/build-release.sh --use-current-version`, проверить строки `Verifying SDK exclusions`, `Removing dev dependencies...`, `✅ Package created`, зафиксировать артефакты и обновить `doc/Sessions/Session041.md` итогами релизной сборки (scope: `doc/Sessions/Session041.md`; expected commit: `docs(session): record phase261 release build results`).
4. [BLOCKED] Git Commit: `docs(session): record phase261 release build results` (hash: TBD)
