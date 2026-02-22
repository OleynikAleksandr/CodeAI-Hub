# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
  - `doc/BugRegistry.md`
  - `doc/Sessions/Session097.md`
  - `doc/Sessions/Session098.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стрим), в каждом Stream некоторое количество подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `npm test`, `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:tsprune`, `npx ultracite fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** выполняем вручную только когда нужно проверить затронутый пакет/клиент, и обязательно перед закрытием Stream/Phase:
  - `npm run build --workspace <package>`
  - `npm run build:webview`
  - `npm run typecheck:webview`
- **Commit**: только после зеленых гейтов. После каждого коммита: обновить статусы и вписать hash.
- **Real-time Документация**: любое изменение архитектуры/логики требует синхронного обновления документов из `doc/` ДО коммита.

---

## Phase 221 — BUG-2026-02-22-01: SSOT input lock (cold start + crash/restart) (owner: Codex, updated: 2026-02-22)

**Goal:** Перестать ловить “вечные” блокировки ввода. Зафиксировать и реализовать один источник правды (SSOT) для lock/unlock, устойчивый к cold start и авариям.

**SSOT/Design:**
- `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md` (новый контракт)
- `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
- `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- `doc/BugRegistry.md` (`BUG-2026-02-22-01`)

**Note:** предыдущий план Phase 220 (attempt: sessionId reconciliation) заархивирован как не закрывший проблему:
- `doc/TODO/Archive/todo-plan-phase220-bug-2026-02-22-01-cold-start-mismatch-2026-02-22.md`

---

### Stream 0: Design contract (SSOT)
1. [DONE] Зафиксировать архитектурный контракт SSOT/state machine для input lock/unlock (scope: `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`; expected commit: `docs(contracts): define session input lock SSOT state machine`).
2. [DONE] Git Commit: `docs(contracts): define session input lock SSOT state machine` (hash: `db78b570`)

### Stream 1: PM — устранить “resuming…” stuck при idle snapshot (cold start)
1. [DONE] Добавить регрессионный тест: если `workspace:snapshot` сообщает `turnState=idle` и `continuityLockActive=false`, UI обязан снять блокировку даже когда `continuityLockReason` отсутствует (scope: `src/client/project-manager/components/sessions/session-stream.ts`, `src/client/project-manager/components/sessions/session-stream-provider-fallback.test.ts`; expected commit: `test(pm): reproduce resuming stuck when lock reason missing`).
2. [IN_PROGRESS] Git Commit: `test(pm): reproduce resuming stuck when lock reason missing` (hash: TBD)
3. [TODO] Исправить `applyWorkspaceSnapshotToSnapshots`: доверять snapshot-истине и разрешать переход в `idle/unlocked` при отсутствии bootstrap/lock, без требования “разрешающего” lockReason (scope: `src/client/project-manager/components/sessions/session-stream.ts`, `src/client/project-manager/components/sessions/session-stream-provider-fallback.test.ts`; expected commit: `fix(pm): unlock input on cold-start idle snapshot`).
4. [TODO] Git Commit: `fix(pm): unlock input on cold-start idle snapshot` (hash: TBD)

### Stream 2: Core — сделать unlock reason явным (минимальный SSOT этап)
1. [TODO] Нормализовать snapshot: для `resume_in_place` idle‑сессий гарантировать явный unlock‑reason (например `no_rollover_needed`) вместо `undefined`, чтобы UI не зависел от отсутствующих полей (scope: `packages/core/src/workspace-runtime/workspace-runtime-facade.ts`, `packages/core/src/workspace-runtime/workspace-runtime-types.ts`, `packages/core/src/workspace-runtime/workspace-snapshot-builder.ts`; expected commit: `fix(core): emit explicit unlock reason for idle sessions`).
2. [TODO] Git Commit: `fix(core): emit explicit unlock reason for idle sessions` (hash: TBD)

### Stream 3: Release + manual matrix
1. [TODO] Собрать релиз и вручную прогнать матрицу сценариев из контракта (normal / rollover / crash mid-turn / cold start / one-shot) (scope: `scripts/build-all.sh`, `scripts/build-release.sh`; expected commit: `feat(release): v<version> - fix session input unlock on cold start`).
2. [TODO] Git Commit: `feat(release): v<version> - fix session input unlock on cold start` (hash: TBD)
