# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase — Stream (стрим) с микрозадачами.
- Каждая микрозадача затрагивает **≤ 3 файлов** и **≤ 3 новых классов**.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- После каждой микрозадачи обязательны гейты: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.
- После зелёных гейтов — Git Commit и немедленный апдейт статусов/хешей в этом файле.

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/Project_Docs/SessionContinuity/FlowNodeContinuity_InputLock_Contract_Architecture.md`
3. `doc/Sessions/Session126.md`
4. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 115 — Strict Dual-Confirmation Unlock Gate (owner: Oleksandr, updated: 2026-02-09)

**Problem (manual regression):**
- После `turn_completed` всё ещё возникает кратковременный unlock до последующей блокировки rollover.
- Причина: текущая логика не требует обязательного второго подтверждения (явного решения Core по контекстному окну в текущем турне) перед unlock.

**Target invariant:**
- Разблокировка допустима только при одновременном выполнении двух условий:
  1. финальный `turn_completed` получен для текущего турна;
  2. Core получил и зафиксировал явное решение `context decision = no_rollover` для этого же турна.
- Если второе подтверждение не получено — unlock запрещён.

### Stream: Core Strict Dual-Confirmation State Machine
1. [DONE] Внедрить явную post-turn арбитрацию в `SessionRequestHandler`: состояние `context_check_pending` до финального решения `no_rollover|rollover_required`, запрет `idle` до второго подтверждения (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/workspace-runtime/workspace-runtime-types.ts`, `packages/core/src/workspace-runtime/session-runtime.ts`; expected commit: `fix(core): require explicit context decision before unlock after turn completion`)
2. [DONE] Git Commit: `fix(core): require explicit context decision before unlock after turn completion` (hash: 61463ecc)

### Stream: Provider Post-Turn Decision Delivery (Claude)
1. [DONE] Обеспечить детерминированную доставку post-turn context decision в Core для текущего турна (без окна между `turn_completed` и отдельным поздним usage-event) (scope: `packages/Claude_Module/src/messaging/message-processor.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit: `fix(claude-core): deliver post-turn context decision for strict unlock gate`)
2. [DONE] Git Commit: `fix(claude-core): deliver post-turn context decision for strict unlock gate` (hash: 45a315fb)

### Stream: PM/UI Lock Contract Enforcement
1. [DONE] Зафиксировать блокировку UI в состоянии `context_check_pending` и снять её только по canonical unlock-решению snapshot (`no_rollover_needed` или `resume_ready`) (scope: `src/client/project-manager/components/sessions/session-lock-guards.ts`, `src/client/project-manager/components/sessions/session-stream.ts`; expected commit: `fix(pm): keep input blocked while context decision is pending`)
2. [DONE] Git Commit: `fix(pm): keep input blocked while context decision is pending` (hash: 334d4537)

### Stream: Non-Regression Tests
1. [DONE] Добавить core regression на out-of-band последовательность `turn_completed -> delayed token usage`: отсутствие `idle/unlock` до explicit `no_rollover` (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`; expected commit: `test(core): block unlock until explicit post-turn context decision`)
2. [DONE] Git Commit: `test(core): block unlock until explicit post-turn context decision` (hash: 07a0b984)
3. [DONE] Добавить PM regression на отсутствие transient `blocked -> idle -> blocked` между завершением турна и стартом rollover (scope: `src/client/project-manager/components/sessions/session-stream-rollover-pending.test.ts`; expected commit: `test(pm): prevent unlock gap while context decision pending`)
4. [DONE] Git Commit: `test(pm): prevent unlock gap while context decision pending` (hash: bd00b66b)

### Stream: Docs + QA Gates
1. [DONE] Синхронно обновить архитектурные документы и прогнать обязательные гейты + таргетные сборки (`@codeai-hub/core`, `webview/project-manager`) (scope: `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`, `doc/Project_Docs/SessionContinuity/FlowNodeContinuity_InputLock_Contract_Architecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(architecture): document strict dual-confirmation unlock gate and validate gates`; executed: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, `npm run build --workspace @codeai-hub/core`, `npm run build:webview`, `npm run typecheck:webview`)
2. [DONE] Git Commit: `docs(architecture): document strict dual-confirmation unlock gate and validate gates` (hash: a958f198)

### Stream: Release Build
1. [DONE] Подготовить релизные документы перед сборкой (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): prepare release notes for phase 115 strict dual-confirmation unlock gate`)
2. [DONE] Git Commit: `docs(release): prepare release notes for phase 115 strict dual-confirmation unlock gate` (hash: 29bd337d)
3. [DONE] Выполнить `./scripts/build-all.sh` и зафиксировать auto-generated version/manifest изменения (scope: `package.json`, `package-lock.json`, `assets/**`; expected commit: `chore(release): run build-all for phase 115 strict dual-confirmation unlock gate`)
4. [DONE] Git Commit: `chore(release): run build-all for phase 115 strict dual-confirmation unlock gate` (hash: b7f5d885)
5. [DONE] Выполнить `./scripts/build-release.sh --use-current-version`, проверить VSIX и tarball-артефакты (scope: `codeai-hub-<version>.vsix`, `doc/tmp/releases/*`; expected commit: `chore(release): build and verify vsix for phase 115 strict dual-confirmation unlock gate`)
6. [DONE] Git Commit: `chore(release): build and verify vsix for phase 115 strict dual-confirmation unlock gate` (hash: 3bced189)

---

## Phase 116 — Rollover Flag Reset After Bootstrap Unlock (owner: Oleksandr, updated: 2026-02-09)

**Problem (post-release smoke):**
- После успешного rollover (`resume_ready`) новая target-сессия на следующем обычном turn снова получает lock `context_check_pending`.
- UI повторно показывает `Agent is resuming your session… Please wait.` даже при достаточном контекстном окне.
- Это указывает на неполный lifecycle cleanup rollover-флагов и отсутствие нормализации `resumeMode` после bootstrap unlock.

**Target invariant:**
- После первого bootstrap assistant ответа в новой сессии и публикации `resume_ready`:
  1. rollover pending-флаги source/target очищены;
  2. target-сессия больше не живёт в режиме `resume_via_rollover` для последующих обычных turn;
  3. следующий `turn_completed` в target при достаточном контексте проходит как `resume_in_place` (без повторного `resuming` lock).

### Stream: Core Rollover Lifecycle Normalization
1. [DONE] Нормализовать lifecycle после `resume_ready`: очистить rollover pending-флаги/контексты для source+target и перевести target в post-rollover режим обычных turn (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/workspace-runtime/workspace-runtime-types.ts`; expected commit: `fix(core): reset rollover flags and normalize lifecycle after bootstrap unlock`)
2. [DONE] Git Commit: `fix(core): reset rollover flags and normalize lifecycle after bootstrap unlock` (hash: 4e4e507d)

### Stream: Core Regression for Real Event Order
1. [DONE] Добавить regression на реальный порядок событий (`assistant -> turn_completed`) после rollover и проверить, что первый обычный turn в target не возвращает `context_check_pending/resuming` lock (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`; expected commit: `test(core): prevent post-resume relock after first normal turn`)
2. [DONE] Git Commit: `test(core): prevent post-resume relock after first normal turn` (hash: 8d0655b0)

### Stream: PM/UI Non-Regression
1. [DONE] Добавить PM/UI regression, подтверждающий что после `resume_ready` и первого обычного turn не появляется повторный `blocked(resuming)` placeholder (scope: `src/client/project-manager/components/sessions/session-stream-rollover-pending.test.ts`, `src/client/ui/src/session/input-panel.test.tsx`; expected commit: `test(pm-ui): ensure no resuming relock after rollover bootstrap completion`)
2. [DONE] Git Commit: `test(pm-ui): ensure no resuming relock after rollover bootstrap completion` (hash: a50b021a)

### Stream: Docs + QA Gates
1. [DONE] Обновить архитектурные документы под post-bootstrap lifecycle нормализацию и прогнать обязательные гейты + таргетные сборки (`@codeai-hub/core`, `webview/project-manager`) (scope: `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`, `doc/Project_Docs/SessionContinuity/FlowNodeContinuity_InputLock_Contract_Architecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(architecture): document post-bootstrap rollover flag reset contract`; executed: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, `npm run build --workspace @codeai-hub/core`, `npm run build:webview`, `npm run build:project-manager`, `npm run typecheck:webview`)
2. [DONE] Git Commit: `docs(architecture): document post-bootstrap rollover flag reset contract` (hash: 23cb35dc)

### Stream: Release Build
1. [DONE] Подготовить релизные документы перед сборкой (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): prepare release notes for phase 116 rollover flag reset hotfix`)
2. [DONE] Git Commit: `docs(release): prepare release notes for phase 116 rollover flag reset hotfix` (hash: 6b333cc1)
3. [DONE] Выполнить `./scripts/build-all.sh` и зафиксировать auto-generated version/manifest изменения (scope: `package.json`, `package-lock.json`, `assets/**`; expected commit: `chore(release): run build-all for phase 116 rollover flag reset hotfix`)
4. [DONE] Git Commit: `chore(release): run build-all for phase 116 rollover flag reset hotfix` (hash: e90772b5)
5. [DONE] Выполнить `./scripts/build-release.sh --use-current-version`, проверить VSIX и tarball-артефакты (scope: `codeai-hub-<version>.vsix`, `doc/tmp/releases/*`; expected commit: `chore(release): build and verify vsix for phase 116 rollover flag reset hotfix`)
6. [DONE] Git Commit: `chore(release): build and verify vsix for phase 116 rollover flag reset hotfix` (hash: 17602f6e)
