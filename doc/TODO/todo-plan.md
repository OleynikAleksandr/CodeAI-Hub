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
1. [DONE] Подтвердить контракт `ProjectManager_VirtualSimulation_ColdStartRecovery.md` (scope: `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_VirtualSimulation_ColdStartRecovery.md`; expected commit: `docs(vs): approve cold start recovery contract`).
2. [DONE] Git Commit: `docs(vs): approve cold start recovery contract` (hash: `328be048`)

### Stream 1: Repro snapshot + regression test (stuck lock)
1. [DONE] Добавить regression test: после рестарта/cold start “stale running” не должен удерживать `turnState/connectionState` в `running`, если нет живого inflight-turn; ожидание пользователя должно приводить к `idle` (scope: `packages/core/src/workspace-runtime/*` test + минимальная фиксация; expected commit: `test(core): cover stale-running recovery on cold start`).
2. [DONE] Git Commit: `test(core): cover stale-running recovery on cold start` (hash: `a33a620d`)

### Stream 2: Core fix — stale running recovery
1. [DONE] Реализовать нормализацию на гидрации/старте: “устаревший running” переводится в `idle` (или `recovery_required`, но с разблокированным вводом), без необходимости ручного Stop (scope: `packages/core/src/workspace-runtime/*`; expected commit: `fix(core): recover stale running sessions on cold start`).
2. [DONE] Git Commit: `fix(core): recover stale running sessions on cold start` (hash: `c7c4c408`)

### Stream 3: Regression test + fix (task timers / total)
1. [DONE] Добавить regression test: при наличии persisted totals `.codeai-hub/state/task-timers.json` snapshot обязан содержать корректный `status.taskTimer.totalSeconds` после рестарта (scope: `packages/core/src/*` timers + test; expected commit: `test(core): restore taskTimer totals on cold start`).
2. [DONE] Git Commit: `test(core): restore taskTimer totals on cold start` (hash: `89a0e59a`)
3. [DONE] Починить восстановление `taskTimer.totalSeconds` из persisted state и прокидывание в `workspace:snapshot` (scope: `packages/core/src/*`; expected commit: `fix(core): restore task timer totals from persisted workspace state`).
4. [DONE] Git Commit: `fix(core): restore task timer totals from persisted workspace state` (hash: `da275518`)

### Stream 4: PM/UI smoke + docs sync
1. [DONE] Выполнить PM UI smoke по критериям приемки (reopen после вопросов → input unlocked; total non-zero). При необходимости обновить SSOT-доки (`SessionTaskTimer_UI.md`, `SessionInputLock_SSOT_StateMachine.md`) без изменения смысла контракта (scope: `doc/SolidWorks-WorkFlow/Contracts/SessionTaskTimer_UI.md`, `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`; expected commit: `docs(vs): sync cold start recovery behavior notes`).
2. [DONE] Git Commit: `docs(vs): sync cold start recovery behavior notes` (hash: `1ad91d6d`)

### Stream 5: Optional release build (после фикса)
1. [DONE] На чистом дереве выполнить `./scripts/build-all.sh` и зафиксировать обновлённые версии/манифесты (scope: release manifests + package versions; expected commit: `chore(release): build-all vX.Y.Z`).
2. [DONE] Git Commit: `chore(release): build-all vX.Y.Z` (hash: `6bf1681a`)
3. [DONE] Выполнить `./scripts/build-release.sh --use-current-version`, проверить строки `Verifying SDK exclusions`, `Removing dev dependencies...`, `✅ Package created`, зафиксировать артефакты и обновить `doc/Sessions/Session041.md` итогами релизной сборки (scope: `doc/Sessions/Session041.md`; expected commit: `docs(session): record phase261 release build results`).
4. [DONE] Git Commit: `docs(session): record phase261 release build results` (hash: `ef69e3b1`)

---

## Phase 262 — PM runtime snapshot replay after reload (owner: Oleksandr, updated: 2026-02-26)

**Проблема:** если `workspace:snapshot` приходит до монтирования `Virtual Simulation` view, snapshot не попадает в PM store. При позднем открытии вкладки UI использует default `running` snapshot и показывает `Agent is working...`, а `total` остаётся `00h 00m 00s` несмотря на persisted timers.

**Цель:** snapshot должен фиксироваться в store независимо от монтирования runtime view, чтобы при открытии вкладки после reload состояние lock/timer восстанавливалось из Core snapshot.

### Stream 0: PM snapshot store sync вне runtime view
1. [DONE] Добавить глобальный приём `workspace:snapshot` в `workspace-scope-sync` с валидацией payload и записью в `workspaceSnapshotStore`; добавить regression test на layout-уровень, чтобы не терять lock/timer state при позднем монтировании вкладки (scope: `src/client/project-manager/components/layout/workspace-scope-sync.ts`, `src/client/project-manager/components/layout/workspace-scope-sync.test.ts`; expected commit: `fix(pm): persist workspace snapshot for late virtual simulation mount`).
2. [DONE] Git Commit: `fix(pm): persist workspace snapshot for late virtual simulation mount` (hash: `dbf21568`)

### Stream 1: Release build for retest
1. [DONE] На чистом дереве выполнить `./scripts/build-all.sh`, обновить релизные документы и зафиксировать версию (scope: release manifests + `README.md` + `CHANGELOG.md`; expected commit: `chore(release): build-all vX.Y.Z`).
2. [DONE] Git Commit: `chore(release): build-all vX.Y.Z` (hash: `8d28e4a7`)
3. [DONE] Выполнить `./scripts/build-release.sh --use-current-version` и зафиксировать итоги в новом session report (scope: `doc/Sessions/Session042.md`; expected commit: `docs(session): record phase262 release build results`).
4. [DONE] Git Commit: `docs(session): record phase262 release build results` (hash: `3e142971`)

---

## Phase 263 — Dialog open ensures runtime session (stuck lock + total after Core restart) (owner: Oleksandr, updated: 2026-02-26)

**Проблема:** stage tabs (включая `virtual_simulation`) открываются через dialog/continuity chain. После рестарта Core runtime sessions отсутствуют (in-memory). `dialog:list` возвращает `latestSessionId` из continuity (обычно НЕ `null`), но этот sessionId отсутствует в runtime snapshot → `workspace:snapshot` не содержит stage-session → UI остаётся в default `running` (`Agent is working...`) и `total` = `00h 00m 00s`.

**Цель:** при открытии dialog с известным `providerSessionId` PM должен инициировать resume runtime session (`session:create`), чтобы Core начал эмитить `workspace:snapshot` для stage-session и UI восстановил lock/timer состояние.

### Stream 0: Resume runtime session on dialog open
1. [DONE] В `dialog:list:result`: если `latestSessionId` отсутствует и `providerSessionId` задан — отправлять `session:create` с контекстом stage/runSlug, чтобы восстановить workspace snapshot lock/timer после cold start (scope: `src/client/project-manager/components/sessions/use-project-manager-dialog-core-events.ts`, `src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts`; expected commit: `fix(pm): resume dialog runtime session on open`).
2. [DONE] Git Commit: `fix(pm): resume dialog runtime session on open` (hash: `a092ee57`)

### Stream 1: Release build for retest
1. [DONE] На чистом дереве выполнить `./scripts/build-all.sh`, обновить релизные документы и зафиксировать версию (scope: release manifests + `README.md` + `CHANGELOG.md`; expected commit: `chore(release): build-all vX.Y.Z`).
2. [DONE] Git Commit: `chore(release): build-all vX.Y.Z` (hash: `7b058a72`)
3. [DONE] Выполнить `./scripts/build-release.sh --use-current-version` и зафиксировать итоги в новом session report (scope: `doc/Sessions/Session043.md`; expected commit: `docs(session): record phase263 release build results`).
4. [DONE] Git Commit: `docs(session): record phase263 release build results` (hash: `c768cf75`)

---

## Phase 264 — Dialog open resumes when workspace snapshot lacks runtime session (owner: Oleksandr, updated: 2026-02-26)

**Проблема:** Phase 263 была недостаточной: условие по `latestSessionId` почти никогда не срабатывает, потому что `latestSessionId` берётся из continuity index/chain и обычно заполнен даже после рестарта Core. Реальный сигнал отсутствия runtime session — отсутствие matching session в `workspace:snapshot` (по `sessionId` и/или `providerSessionId`).

**Цель:** при открытии dialog с `providerSessionId` PM должен инициировать `session:create`, если `workspace:snapshot` не содержит runtime session для этого dialog → UI получает корректный lock/timer state и разблокирует ввод.

### Stream 0: Fix gating on workspace snapshot presence
1. [DONE] В `dialog:list:result`: если есть `providerSessionId`, но `workspace:snapshot` не содержит runtime session для этого dialog — отправлять `session:create` (scope: `src/client/project-manager/components/sessions/use-project-manager-dialog-core-events.ts`, `src/client/project-manager/components/sessions/dialog-runtime-session-resolver.ts`, `src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts`; expected commit: `fix(pm): resume dialog when runtime session missing`).
2. [DONE] Git Commit: `fix(pm): resume dialog when runtime session missing` (hash: `3b347d82`)

### Stream 1: Release build for retest
1. [DONE] На чистом дереве выполнить `./scripts/build-all.sh` и зафиксировать обновлённые версии/манифесты (scope: release manifests + package versions; expected commit: `chore(release): build-all v1.1.692`).
2. [DONE] Git Commit: `chore(release): build-all v1.1.692` (hash: `dc4681e4`)
3. [DONE] Зафиксировать итоги сборки в `doc/Sessions/Session044.md` (scope: `doc/Sessions/Session044.md`; expected commit: `docs(session): record release v1.1.692`).
4. [DONE] Git Commit: `docs(session): record release v1.1.692` (hash: `70e14de0`)
