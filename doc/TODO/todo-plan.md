# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase — Stream (стрим) с микрозадачами.
- Каждая микрозадача затрагивает **≤ 3 файлов** и **≤ 3 новых классов**.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- После каждой микрозадачи обязательны гейты: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.
- После зелёных гейтов — Git Commit и немедленный апдейт статусов/хешей в этом файле.

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/Sessions/Session122.md`
3. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 113 — Rollover Guard Before Input Unlock (owner: Oleksandr, updated: 2026-02-08)

**Problem (manual regression):**
- После последнего ответа агента в текущем turn иногда возникает кратковременный unlock поля ввода до включения следующей блокировки при rollover.
- Требуемый инвариант: перед снятием блокировки проверять, не сработал ли Core-trigger по порогу контекстного окна; если rollover уже инициирован, unlock не выполнять.

### Stream: Core Dual-Gate + Rollover Pending
1. [DONE] Добавить явный guard в lock lifecycle: `turn_completed` не переводит input в `idle`, если Core уже выставил состояние `rollover pending/in-progress` (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/workspace-runtime/session-runtime.ts`, `packages/core/src/workspace-runtime/workspace-runtime-types.ts`; expected commit: `fix(core): skip unlock when rollover is pending after turn completion`)
2. [DONE] Git Commit: `fix(core): skip unlock when rollover is pending after turn completion` (hash: 18a096a4)
3. [DONE] Зафиксировать snapshot-контракт для PM/UI: отдельный признак `rolloverPending` в terminal turn state, чтобы исключить transient unlock-gap между сессиями (scope: `packages/core/src/workspace-runtime/workspace-runtime-types.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `src/client/project-manager/core-stream-message-types.ts`; expected commit: `feat(runtime): expose rollover-pending lock signal in workspace snapshot`)
4. [DONE] Git Commit: `feat(runtime): expose rollover-pending lock signal in workspace snapshot` (hash: 4af6cb8d)

### Stream: PM/UI Enforcement
1. [DONE] Обновить lock-resolver в PM: при `rolloverPending=true` сохранять `blocked` и не снимать `Agent is working... Please wait.` до bootstrap-gate следующей сессии (scope: `src/client/project-manager/components/sessions/session-stream.ts`, `src/client/project-manager/components/sessions/session-lock-guards.ts`; expected commit: `fix(pm): keep input locked while rollover pending between sessions`)
2. [DONE] Git Commit: `fix(pm): keep input locked while rollover pending between sessions` (hash: 9d60bd8e)

### Stream: Non-Regression Tests
1. [DONE] Добавить core/pm тесты на отсутствие `blocked -> idle -> blocked` при context-threshold rollover после `turn_completed` (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`, `src/client/project-manager/components/sessions/session-stream-rollover-pending.test.ts`; expected commit: `test(lock): prevent unlock flicker when rollover starts after terminal turn`)
2. [DONE] Git Commit: `test(lock): prevent unlock flicker when rollover starts after terminal turn` (hash: 55e8da47)

### Stream: Docs + QA Gates
1. [DONE] Синхронно обновить архитектурные документы по новому guard и прогнать обязательные гейты + таргетные сборки (`@codeai-hub/core`, `webview/project-manager`) (scope: `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`, `doc/Project_Docs/SessionContinuity/FlowNodeContinuity_InputLock_Contract_Architecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(architecture): document rollover-pending unlock guard and validate gates`; executed: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, `npm run build --workspace @codeai-hub/core`, `npm run build:webview`, `npm run typecheck:webview`)
2. [DONE] Git Commit: `docs(architecture): document rollover-pending unlock guard and validate gates` (hash: d8c89139)

### Stream: Release Build
1. [DONE] Подготовить релизные документы перед сборкой (scope: `README.md`, `CHANGELOG.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`; expected commit: `docs(release): prepare release notes for phase 113 rollover unlock guard`)
2. [DONE] Git Commit: `docs(release): prepare release notes for phase 113 rollover unlock guard` (hash: fede609e)
3. [DONE] Выполнить `./scripts/build-all.sh` и зафиксировать auto-generated version/manifest изменения (scope: `package.json`, `package-lock.json`, `assets/**`; expected commit: `chore(release): run build-all for phase 113 rollover unlock guard`)
4. [DONE] Git Commit: `chore(release): run build-all for phase 113 rollover unlock guard` (hash: 61053122)
5. [DONE] Выполнить `./scripts/build-release.sh --use-current-version`, проверить VSIX и tarball-артефакты (scope: `codeai-hub-<version>.vsix`, `doc/tmp/releases/*`; expected commit: `chore(release): build and verify vsix for phase 113 rollover unlock guard`; result: `codeai-hub-1.1.532.vsix` собран, `Verifying SDK exclusions` и `Package created` подтверждены)
6. [DONE] Git Commit: `chore(release): build and verify vsix for phase 113 rollover unlock guard` (hash: 4f70bbfe)

---

## Phase 114 — Atomic Turn-End Dual-Gate Arbitration (owner: Oleksandr, updated: 2026-02-08)

**Problem (manual regression):**
- Короткий unlock-gap всё ещё возможен между `turn_completed` в source session и началом rollover/report pipeline.
- Причина: race между async threshold-check (`handleFlowNodeContinuityProviderEvent`) и веткой `turn_completed`, где `idle` может эмититься раньше pending-lock.

### Stream: Core Atomic Dual-Gate
1. [DONE] Убрать race в `turn_completed`: выполнять continuity/threshold arbitration атомарно до `idle` (и не эмитить unlock, пока Core не примет явное решение `no_rollover_needed` либо `rollover_pending`) (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit: `fix(core): make turn-completed unlock depend on atomic rollover arbitration`)
2. [DONE] Git Commit: `fix(core): make turn-completed unlock depend on atomic rollover arbitration` (hash: 0d575809)

### Stream: Non-Regression Tests
1. [DONE] Добавить тест на async-race: `turn_completed` не может эмитить `idle` до завершения rollover arbitration, даже если lock устанавливается с задержкой (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`; expected commit: `test(core): prevent turn-completed idle before async rollover arbitration resolves`)
2. [DONE] Git Commit: `test(core): prevent turn-completed idle before async rollover arbitration resolves` (hash: 8adc1a51)

### Stream: Docs + QA Gates
1. [DONE] Синхронно обновить архитектурные документы и прогнать обязательные гейты + таргетные сборки (`@codeai-hub/core`, `webview/project-manager`) (scope: `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`, `doc/Project_Docs/SessionContinuity/FlowNodeContinuity_InputLock_Contract_Architecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(architecture): document atomic turn-end dual-gate arbitration and validate gates`)
2. [DONE] Git Commit: `docs(architecture): document atomic turn-end dual-gate arbitration and validate gates` (hash: 1484df60)

### Stream: Release Build
1. [DONE] Подготовить релизные документы перед сборкой (scope: `README.md`, `CHANGELOG.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`; expected commit: `docs(release): prepare release notes for phase 114 atomic dual-gate fix`)
2. [DONE] Git Commit: `docs(release): prepare release notes for phase 114 atomic dual-gate fix` (hash: 42fcac0b)
3. [DONE] Выполнить `./scripts/build-all.sh` и зафиксировать auto-generated version/manifest изменения (scope: `package.json`, `package-lock.json`, `assets/**`; expected commit: `chore(release): run build-all for phase 114 atomic dual-gate fix`)
4. [DONE] Git Commit: `chore(release): run build-all for phase 114 atomic dual-gate fix` (hash: cfc19b9d)
5. [DONE] Выполнить `./scripts/build-release.sh --use-current-version`, проверить VSIX и tarball-артефакты (scope: `codeai-hub-<version>.vsix`, `doc/tmp/releases/*`; expected commit: `chore(release): build and verify vsix for phase 114 atomic dual-gate fix`; result: `codeai-hub-1.1.533.vsix` собран, `Verifying SDK exclusions` и `Package created` подтверждены)
6. [TODO] Git Commit: `chore(release): build and verify vsix for phase 114 atomic dual-gate fix` (hash: TBD)
