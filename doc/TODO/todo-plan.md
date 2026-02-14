# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- Каждая микро-задача затрагивает не более **3 файлов**.
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- После каждой микро-задачи обязательны гейты: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетные сборки.
- После зелёных гейтов — Git Commit и немедленный апдейт статусов/хешей в этом файле.

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/Stacks/CoreOrchestrator.md`
3. `doc/TODO/Archive/todo-plan-phase160-pm-cold-start-2026-02-14.md`
4. `doc/Sessions/Session047.md`

---

## Phase 161 — Core restart: сессии должны находиться и открываться (owner: Codex, updated: 2026-02-14)

**Problem:** после перезапуска Core (особенно когда PM был уже открыт или когда PM стартует Core сам) в Project Manager пропадал/не открывался узел сессии агента (например, `Reviewer Codex`), а диалог мог становиться пустым.

**Working theory / root cause:** Core отдаёт `workflow-state` без `description.sessionKind/session` из-за строгого сравнения `workspacePath` в snapshot vs `workspaceRoot` из запроса. Эквивалентные пути (`/path/ws` и `/path/ws/`) не совпадают строково, и Core считает сессию «устаревшей», очищая session refs. Это ломает восстановление сессий после рестарта.

**Goal:** после рестарта Core:
- `workflow-state` всегда возвращает корректные session refs для текущего workspace.
- PM может восстановить сессии/диалоги из кумулятивного JSONL и продолжать live-tail без дублей.

### Stream: Core — Normalize Workspace Path (workflow-state stability)
1. [DONE] Core: нормализовать сравнение workspace paths (trim/resolve), добавить тест на хвостовой `/`, и гарантировать каноническое сохранение `workspacePath` в snapshot (scope: `packages/core/src/workflow/description/description-step-store.ts`, `packages/core/src/workflow/description/description-step-store.test.ts`; expected commit message: `fix(core): normalize workspacePath for workflow-state snapshot`)
2. [DONE] Git Commit: `fix(core): normalize workspacePath for workflow-state snapshot` (hash: d6f0b59c)

### Stream: Docs — Sync SolidWorks-Flow (core/workspacePath contract)
1. [TODO] Docs: обновить описание контракта/поведения core для workspacePath (нормализация абсолютного пути, причины, влияние на восстановление PM) и отметить, что правило относится ко всем провайдерам и всем следующим агентам (scope: `doc/SolidWorks-Flow/Stacks/CoreOrchestrator.md`; expected commit message: `docs(core): document workspacePath normalization for session restore`)
2. [TODO] Git Commit: `docs(core): document workspacePath normalization for session restore` (hash: TBD)

### Stream: Release Build (New Patch Release)
1. [TODO] Gates: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd ...`, `npm run check:links` + таргетные сборки (scope: repo; expected commit message: `chore: quality gates before release`)
2. [TODO] Git Commit: `chore: quality gates before release` (hash: TBD or N/A)
3. [TODO] Build: `./scripts/build-all.sh` (version bump) (scope: repo build; expected commit message: `chore(release): build-all for next patch`)
4. [TODO] Git Commit: `chore(release): build-all for next patch` (hash: TBD)
5. [TODO] Build: `./scripts/build-release.sh --use-current-version` (VSIX in repo root) (scope: repo build; expected commit message: `chore(release): build vsix`)
6. [TODO] Git Commit: `chore(release): build vsix` (hash: N/A — VSIX artifact only)
7. [TODO] Docs: обновить этот план статусами/датами/путями артефактов релиза (scope: `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): record patch release build`)
8. [TODO] Git Commit: `docs(todo): record patch release build` (hash: TBD)
