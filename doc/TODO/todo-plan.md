# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase — Stream (стрим) с микрозадачами.
- Каждая микрозадача затрагивает **≤ 3 файлов** и **≤ 3 новых классов**.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- После каждой микрозадачи обязательны гейты: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.
- После зелёных гейтов — Git Commit и немедленный апдейт статусов/хешей в этом файле.

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/Sessions/Session113.md`
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
4. [IN_PROGRESS] Git Commit: `chore(qa): validate phase 107 snapshot-lock hardening gates` (hash: TBD)
5. [TODO] Подготовить отчёт сессии после закрытия Phase 107 (scope: `doc/Sessions/Session114.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(session): record phase 107 completion`)
6. [TODO] Git Commit: `docs(session): record phase 107 completion` (hash: TBD)

### Stream: Release Build
1. [TODO] Подготовить релизные документы перед сборкой (scope: `README.md`, `CHANGELOG.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`; expected commit: `docs(release): prepare release notes for phase 107`)
2. [TODO] Git Commit: `docs(release): prepare release notes for phase 107` (hash: TBD)
3. [TODO] Выполнить `./scripts/build-all.sh` и зафиксировать auto-generated version/manifest изменения (scope: `package.json`, `package-lock.json`, `assets/**`; expected commit: `chore(release): run build-all for phase 107`)
4. [TODO] Git Commit: `chore(release): run build-all for phase 107` (hash: TBD)
5. [TODO] Выполнить `./scripts/build-release.sh --use-current-version`, проверить VSIX и tarball-артефакты (scope: `codeai-hub-<version>.vsix`, `doc/tmp/releases/*`; expected commit: `chore(release): build and verify vsix for phase 107`)
6. [TODO] Git Commit: `chore(release): build and verify vsix for phase 107` (hash: TBD, allow-empty if no file changes)
