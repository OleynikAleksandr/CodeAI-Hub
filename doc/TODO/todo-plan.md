# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase — Stream (стрим) с микрозадачами.
- Каждая микрозадача затрагивает **≤ 3 файлов** и **≤ 3 новых классов**.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- После каждой микрозадачи обязательны гейты: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.
- После зелёных гейтов — Git Commit и немедленный апдейт статусов/хешей в этом файле.

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/Sessions/Session118.md`
3. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 106 — Backlog Intake (owner: Oleksandr, updated: 2026-02-08)

### Stream: Scope Definition
1. [TODO] Подготовить архитектурный документ для следующего фиче-набора (scope: `doc/Project_Docs/**`; expected commit: `docs(architecture): define phase 106 scope`)
2. [TODO] Git Commit: `docs(architecture): define phase 106 scope` (hash: TBD)

---

## Phase 107 — Snapshot-First Lock Lifecycle Hardening (owner: Oleksandr, updated: 2026-02-08)

### Stream: Snapshot Contract (Core)
1. [DONE] Расширить контракт `workspace:snapshot` для переходов collector → reviewer (добавить переходные lock-поля в snapshot-типах; scope: `packages/core/src/workspace-runtime/workspace-runtime-types.ts`, `packages/core/src/workspace-runtime/workspace-wire-types.ts`, `src/client/project-manager/core-stream-message-types.ts`; expected commit: `feat(runtime): extend workspace snapshot lock transition contract`)
2. [DONE] Git Commit: `feat(runtime): extend workspace snapshot lock transition contract` (hash: d26dfbfd)
3. [DONE] Пробросить новые transition-поля из runtime в snapshot flush при handoff/rollover (scope: `packages/core/src/workspace-runtime/workspace-runtime-facade.ts`, `packages/core/src/workspace-runtime/session-runtime.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit: `fix(runtime): publish lock transition state in workspace snapshot`)
4. [DONE] Git Commit: `fix(runtime): publish lock transition state in workspace snapshot` (hash: 92260e6c)
5. [DONE] Закрыть core-регрессии тестами по моменту записи артефакта и автозапуску reviewer без unlock-gap (scope: `packages/core/src/workspace-runtime/workspace-runtime-facade.test.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`, `packages/core/src/remote-bridge/index.test.ts`; expected commit: `test(runtime): cover snapshot lock continuity across reviewer handoff`)
6. [DONE] Git Commit: `test(runtime): cover snapshot lock continuity across reviewer handoff` (hash: 8404971c)

### Stream: PM/UI Pipeline Separation
1. [DONE] Перевести клиентский lock-resolver на расширенный snapshot-контракт как единственный источник runtime-lock (scope: `src/client/project-manager/components/sessions/session-stream.ts`, `src/client/project-manager/services/workspace-snapshot-store.ts`, `src/client/ui/src/session/session-view.tsx`; expected commit: `feat(pm): derive input lock exclusively from snapshot transition contract`)
2. [DONE] Git Commit: `feat(pm): derive input lock exclusively from snapshot transition contract` (hash: ca93b0f6)
3. [DONE] Зафиксировать разделение pipeline: `session:stream` не меняет lock/connection и используется только для token usage/контента (scope: `src/client/project-manager/components/sessions/token-usage-stream.ts`, `src/client/project-manager/components/sessions/token-usage-stream.test.ts`, `src/client/project-manager/components/sessions/session-stream.test.ts`; expected commit: `test(pm): enforce strict separation of snapshot and stream pipelines`)
4. [DONE] Git Commit: `test(pm): enforce strict separation of snapshot and stream pipelines` (hash: 79e501f8)
5. [DONE] Добавить UI non-regression на сценарий: lock не снимается на `description.md` и держится до финального ответа reviewer (scope: `src/client/ui/src/session/input-panel.test.tsx`, `src/client/project-manager/components/sessions/project-manager-session-view.tsx`, `src/client/project-manager/components/sessions/reviewer-session-visibility.test.ts`; expected commit: `test(ui): prevent unlock gap during collector-to-reviewer auto handoff`)
6. [DONE] Git Commit: `test(ui): prevent unlock gap during collector-to-reviewer auto handoff` (hash: 714b6c86)

### Stream: Docs, Gates, Session Report
1. [DONE] Обновить архитектурную документацию по snapshot-first lock lifecycle и правилам переходов (scope: `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`, `doc/Project_Docs/SessionIsolation/ProjectManager_WorkspaceScopedSessionIsolation_Architecture.md`; expected commit: `docs(architecture): document snapshot-first lock lifecycle and transition semantics`)
2. [DONE] Git Commit: `docs(architecture): document snapshot-first lock lifecycle and transition semantics` (hash: 76b5bc64)
3. [DONE] Прогнать обязательные гейты + таргетные сборки (`packages/core`, `webview/project-manager`) и зафиксировать итог в TODO (scope: `doc/TODO/todo-plan.md`; expected commit: `chore(qa): validate phase 107 snapshot-lock hardening gates`; executed: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, `npm run build --workspace @codeai-hub/core`, `npm run build:webview`, `npm run typecheck:webview`)
4. [DONE] Git Commit: `chore(qa): validate phase 107 snapshot-lock hardening gates` (hash: 3b7e9852)
5. [DONE] Подготовить отчёт сессии после закрытия Phase 107 (scope: `doc/Sessions/Session115.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(session): record phase 107 completion`)
6. [DONE] Git Commit: `docs(session): record phase 107 completion` (hash: 2388decc)

### Stream: Release Build
1. [DONE] Подготовить релизные документы перед сборкой (scope: `README.md`, `CHANGELOG.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`; expected commit: `docs(release): prepare release notes for phase 107`)
2. [DONE] Git Commit: `docs(release): prepare release notes for phase 107` (hash: c1cda553)
3. [DONE] Выполнить `./scripts/build-all.sh` и зафиксировать auto-generated version/manifest изменения (scope: `package.json`, `package-lock.json`, `assets/**`; expected commit: `chore(release): run build-all for phase 107`)
4. [DONE] Git Commit: `chore(release): run build-all for phase 107` (hash: 026b83fd)
5. [DONE] Выполнить `./scripts/build-release.sh --use-current-version`, проверить VSIX и tarball-артефакты (scope: `codeai-hub-<version>.vsix`, `doc/tmp/releases/*`; expected commit: `chore(release): build and verify vsix for phase 107`; result: `codeai-hub-1.1.526.vsix` собран, `Verifying SDK exclusions` и `Package created` подтверждены)
6. [DONE] Git Commit: `chore(release): build and verify vsix for phase 107` (hash: 7b9037a2, allow-empty)

---

## Phase 108 — Snapshot-First Lock Monotonicity Hardening (owner: Oleksandr, updated: 2026-02-08)

**Problem (observed in manual testing):** input lock снимается раньше, чем должен, с фликером `unlocked → locked`:
- на границе handoff `Description → Reviewer` (после записи `description.md` до старта reviewer);
- во время reviewer (unlock происходит до того, как агент отдаёт вопросы/ответ);
- на post-answer контекстных триггерах (unlock-gap перед новым lock).

### Stream: Snapshot Lock Monotonicity (PM/UI)
1. [DONE] Добавить snapshot-only anti-flicker: `workspace:snapshot` может **усиливать** lock немедленно, но **ослаблять** (`blocked → idle`) только при наблюдении terminal continuity unlock в snapshot (`resume_ready|resume_failed|resume_timeout`) и отсутствии `continuityLockTransition.awaitingBootstrapTurn` (scope: `src/client/project-manager/components/sessions/session-stream.ts`; expected commit: `fix(pm): prevent premature unlock from non-terminal snapshot states`)
2. [DONE] Git Commit: `fix(pm): prevent premature unlock from non-terminal snapshot states` (hash: 204a2139)
3. [DONE] Удерживать lock на обеих сторонах handoff: если любой session в snapshot содержит `continuityLockTransition.awaitingBootstrapTurn=true`, то PM считает lock активным и для `sourceSessionId` и для `targetSessionId` (даже если у source `continuityLockActive=false`) (scope: `src/client/project-manager/components/sessions/session-stream.ts`; expected commit: `fix(pm): hold lock across continuity handoff transition graph`)
4. [DONE] Git Commit: `fix(pm): hold lock across continuity handoff transition graph` (hash: e03215fc)

### Stream: Non-Regression Tests (PM/UI)
1. [DONE] Добавить тесты на монотонность lock: запрет `blocked → idle → blocked` на snapshot-последовательностях при handoff/auto-start reviewer и на post-answer continuity triggers (scope: `src/client/project-manager/components/sessions/session-stream.test.ts`, `src/client/ui/src/session/input-panel.test.tsx`; expected commit: `test(ui): prevent snapshot-driven unlock flicker across continuity lifecycle`)
2. [DONE] Git Commit: `test(ui): prevent snapshot-driven unlock flicker across continuity lifecycle` (hash: b166a648)

### Stream: QA Gates
1. [DONE] Прогнать обязательные гейты + таргетные сборки (`packages/core`, `webview/project-manager`) и зафиксировать итог в TODO (scope: `doc/TODO/todo-plan.md`; expected commit: `chore(qa): validate phase 108 snapshot-lock monotonicity gates`; executed: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, `npm run build --workspace @codeai-hub/core`, `npm run build:webview`, `npm run typecheck:webview`)
2. [DONE] Git Commit: `chore(qa): validate phase 108 snapshot-lock monotonicity gates` (hash: d139eb00)

### Stream: Release Build (Test)
1. [DONE] Выполнить `./scripts/build-all.sh` и зафиксировать auto-generated version/manifest изменения (scope: `package.json`, `package-lock.json`, `assets/**`; expected commit: `chore(release): run build-all for phase 108 snapshot-lock monotonicity`; result: unified version bumped to `1.1.527`, release tarballs generated in `~/.codeai-hub/releases/`)
2. [DONE] Git Commit: `chore(release): run build-all for phase 108 snapshot-lock monotonicity` (hash: d621156d)
3. [DONE] Выполнить `./scripts/build-release.sh --use-current-version`, проверить VSIX и tarball-артефакты (scope: `codeai-hub-<version>.vsix`, `doc/tmp/releases/*`; expected commit: `chore(release): build and verify vsix for phase 108 snapshot-lock monotonicity`; result: `codeai-hub-1.1.527.vsix` собран, `Verifying SDK exclusions` и `Package created` подтверждены)
4. [DONE] Git Commit: `chore(release): build and verify vsix for phase 108 snapshot-lock monotonicity` (hash: 82802ae6, allow-empty if no file changes)

---

## Phase 109 — Input Lock Contract Completion (owner: Oleksandr, updated: 2026-02-08)

**Problem (manual regression):**
- В `description collector` и `reviewer` остаются окна преждевременного unlock.
- Текущий unlock не везде привязан к dual-gate (`final turn completed` + `no rollover needed`).
- В rollover-path unlock может происходить до безопасного bootstrap-gate новой сессии.

### Stream: Core Lock Lifecycle Contract
1. [TODO] Ввести режимы `no_resume | resume_in_place | resume_via_rollover` в runtime-lock арбитрации и зафиксировать terminal/read-only поведение для `no_resume` сессий (scope: `packages/core/src/workspace-runtime/workspace-runtime-types.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/workflow/runtime/workflow-runtime.ts`; expected commit: `feat(core): add resume-mode-aware lock lifecycle and terminal no-resume state`)
2. [TODO] Git Commit: `feat(core): add resume-mode-aware lock lifecycle and terminal no-resume state` (hash: TBD)
3. [TODO] Реализовать unlock dual-gate для `resume_in_place`: unlock только после финального `turn_completed` и явного результата Core `no rollover needed`; при threshold exceeded оставлять lock и менять только reason (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/workspace-runtime/session-runtime.ts`, `packages/core/src/workspace-runtime/workspace-runtime-facade.ts`; expected commit: `fix(core): enforce dual-gate unlock for resume-in-place sessions`)
4. [TODO] Git Commit: `fix(core): enforce dual-gate unlock for resume-in-place sessions` (hash: TBD)
5. [TODO] Для `resume_via_rollover` снять lock только после первого bootstrap assistant ответа в target session; `resume_failed|resume_timeout` не должны выполнять unlock (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/workspace-runtime/workspace-runtime-types.ts`, `packages/core/src/workspace-runtime/workspace-runtime-facade.test.ts`; expected commit: `fix(core): unlock rollover sessions only after bootstrap assistant gate`)
6. [TODO] Git Commit: `fix(core): unlock rollover sessions only after bootstrap assistant gate` (hash: TBD)

### Stream: PM/UI Enforcement
1. [TODO] Применить lock-контракт в PM Session stream: `turnState=idle` не unlock сам по себе; учитывать `resumeMode`, `finalTurnCompleted` и rollover reason без промежуточного unlock (scope: `src/client/project-manager/components/sessions/session-stream.ts`, `src/client/project-manager/core-stream-message-types.ts`, `src/client/project-manager/services/workspace-snapshot-store.ts`; expected commit: `fix(pm): enforce resume-mode lock gates from workspace snapshot`)
2. [TODO] Git Commit: `fix(pm): enforce resume-mode lock gates from workspace snapshot` (hash: TBD)
3. [TODO] Зафиксировать no-resume UX: read-only input copy и запрет resume/focus для terminal collector-сессий в tree/session UI (scope: `src/client/ui/src/session/session-view.tsx`, `src/client/project-manager/components/sessions/reviewer-session-visibility.ts`, `src/client/project-manager/components/layout/workspace-tree.tsx`; expected commit: `feat(ui): render no-resume sessions as terminal read-only`)
4. [TODO] Git Commit: `feat(ui): render no-resume sessions as terminal read-only` (hash: TBD)

### Stream: Non-Regression Tests
1. [TODO] Добавить core-тесты на новые инварианты: `no_resume` never unlock, `resume_in_place` dual-gate, `resume_via_rollover` unlock только после bootstrap answer (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`, `packages/core/src/workspace-runtime/workspace-runtime-facade.test.ts`, `packages/core/src/workspace-runtime/session-runtime.test.ts`; expected commit: `test(core): cover resume-mode lock lifecycle invariants`)
2. [TODO] Git Commit: `test(core): cover resume-mode lock lifecycle invariants` (hash: TBD)
3. [TODO] Добавить PM/UI тесты против unlock-gap в reviewer до артефакта и до bootstrap-гейта новой сессии (scope: `src/client/project-manager/components/sessions/session-stream.test.ts`, `src/client/ui/src/session/input-panel.test.tsx`, `src/client/project-manager/components/sessions/reviewer-session-visibility.test.ts`; expected commit: `test(ui): prevent premature unlock before artifact and bootstrap gates`)
4. [TODO] Git Commit: `test(ui): prevent premature unlock before artifact and bootstrap gates` (hash: TBD)

### Stream: Docs Sync
1. [TODO] Синхронно обновить архитектурные документы после реализации контрактов (scope: `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`, `doc/Project_Docs/SessionContinuity/FlowNodeContinuity_InputLock_Contract_Architecture.md`, `doc/SolidWorks-Flow/SessionContinuity/NodeSessionContinuity_Architecture.md`; expected commit: `docs(architecture): sync implemented resume-mode lock contract`)
2. [TODO] Git Commit: `docs(architecture): sync implemented resume-mode lock contract` (hash: TBD)

### Stream: QA Gates
1. [TODO] Прогнать обязательные гейты + таргетные сборки (`packages/core`, `webview/project-manager`) и зафиксировать итог в TODO (scope: `doc/TODO/todo-plan.md`; expected commit: `chore(qa): validate phase 109 resume-mode lock contract gates`; executed: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, `npm run build --workspace @codeai-hub/core`, `npm run build:webview`, `npm run typecheck:webview`)
2. [TODO] Git Commit: `chore(qa): validate phase 109 resume-mode lock contract gates` (hash: TBD)

### Stream: Release Build
1. [TODO] Подготовить релизные документы перед сборкой (scope: `README.md`, `CHANGELOG.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`; expected commit: `docs(release): prepare release notes for phase 109`)
2. [TODO] Git Commit: `docs(release): prepare release notes for phase 109` (hash: TBD)
3. [TODO] Выполнить `./scripts/build-all.sh` и зафиксировать auto-generated version/manifest изменения (scope: `package.json`, `package-lock.json`, `assets/**`; expected commit: `chore(release): run build-all for phase 109 resume-mode lock contract`)
4. [TODO] Git Commit: `chore(release): run build-all for phase 109 resume-mode lock contract` (hash: TBD)
5. [TODO] Выполнить `./scripts/build-release.sh --use-current-version`, проверить VSIX и tarball-артефакты (scope: `codeai-hub-<version>.vsix`, `doc/tmp/releases/*`; expected commit: `chore(release): build and verify vsix for phase 109 resume-mode lock contract`)
6. [TODO] Git Commit: `chore(release): build and verify vsix for phase 109 resume-mode lock contract` (hash: TBD)
