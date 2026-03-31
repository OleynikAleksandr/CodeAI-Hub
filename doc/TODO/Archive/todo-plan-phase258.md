# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
  - `doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md`
  - `doc/BugRegistry.md`
- **Ограничение:** каждая подзадача должна затрагивать **≤ 3 файлов**.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `npm test`, `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:tsprune`, `npx ultracite fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **НИКОГДА** не обходить гейты (`--no-verify`).

---

## Phase 258 — Workspace-scoped task timer storage (owner: Oleksandr, updated: 2026-02-26)

**Проблема:** `task-timers.json` хранится глобально в `~/.codeai-hub/state/`, из-за чего Total-счётчик суммирует время всех попыток (включая тестовые) и не сбрасывается при очистке workspace-артефактов.

**Решение:** Перенести хранение `task-timers.json` из глобального `~/.codeai-hub/state/` в каталог каждого workspace (`<workspace>/.codeai-hub/state/task-timers.json`). При удалении `.codeai-hub/` в workspace Total обнуляется вместе со всеми артефактами.

### Stream 0: Refactor TaskTimerStorage (workspace-scoped path)
1. [DONE] Рефакторинг `TaskTimerStorage`: убрать глобальный `~/.codeai-hub/state/` путь; конструктор принимает `workspaceRoot` и формирует путь `<workspaceRoot>/.codeai-hub/state/task-timers.json`; упростить формат — убрать вложенность `workspaces{}`, хранить flat `{ schemaVersion, totals: { nodeId: seconds } }` (scope: `packages/core/src/workspace-runtime/task-timer-storage.ts`; expected commit: `refactor(core): make task timer storage workspace-scoped`).
2. [DONE] Git Commit: `refactor(core): make task timer storage workspace-scoped` (hash: `51dfb42e`)

### Stream 1: Adapt WorkspaceRuntimeFacade (per-workspace storage lifecycle)
1. [DONE] Адаптировать `WorkspaceRuntimeFacade`: вместо одного глобального `TaskTimerStorage` создавать/кешировать инстанс per workspace в `seedTaskTimers()`; `persistTaskTimers()` сохраняет каждый workspace в свой файл; `dispose()` персистит все (scope: `packages/core/src/workspace-runtime/workspace-runtime-facade.ts`; expected commit: `refactor(core): use per-workspace task timer storage`).
2. [DONE] Git Commit: `refactor(core): use per-workspace task timer storage` (hash: `d7a5861d`)

### Stream 2: Update tests
1. [DONE] Обновить тест `preserves task timer totals across Stop/Play restarts`: создавать `TaskTimerStorage` с `workspaceRoot` вместо глобального `stateDirectory`; проверить что файл создаётся внутри workspace tmp dir (scope: `packages/core/src/workspace-runtime/workspace-runtime-facade.test.ts`; expected commit: `test(core): adapt task timer tests for workspace-scoped storage`).
2. [DONE] Git Commit: `test(core): adapt task timer tests for workspace-scoped storage` (hash: `fc260f6a`)

### Stream 3: Cleanup + migration
1. [DONE] Реализовано в Stream 0/1: `TaskTimerStorage.cleanupLegacy()` удаляет `~/.codeai-hub/state/task-timers.json` при старте; вызывается в конструкторе `WorkspaceRuntimeFacade` (scope: `packages/core/src/workspace-runtime/task-timer-storage.ts`, `packages/core/src/workspace-runtime/workspace-runtime-facade.ts`; expected commit: `chore(core): remove legacy global task-timers.json`).
2. [DONE] Git Commit: включён в `refactor(core): make task timer storage workspace-scoped` (hash: `51dfb42e`)

### Stream 4: Release build
1. [TODO] Release: выполнить `./scripts/build-all.sh` на чистом дереве (scope: `scripts/build-all.sh` (run); expected commit: `chore(release): build-all`).
2. [TODO] Git Commit: `chore(release): build-all` (hash: TBD)
3. [TODO] Release: выполнить `./scripts/build-release.sh --use-current-version`; зафиксировать результаты в `doc/Sessions/Archive/Session035.md` (scope: `scripts/build-release.sh` (run), `doc/Sessions/Archive/Session035.md`; expected commit: `chore(release): package vsix`).
4. [TODO] Git Commit: `chore(release): package vsix` (hash: TBD)
