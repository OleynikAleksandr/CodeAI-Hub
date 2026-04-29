# План разработки (Development TODO Plan)

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Sidebar_BranchNeutralUntilSession_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/Sidebar_BranchNeutralUntilSession_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Sidebar_IdleStepNeutralTone_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Sidebar_ProviderTint_Architecture.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` §3 Invariant 36
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md` Workflow Tree provider tint subsection
  - `src/client/project-manager/components/layout/use-step-provider-resolver.ts`
  - `src/client/project-manager/components/layout/use-step-provider-resolver.test.ts`
- Только этот список является источником документов для восстановления контекста.

## Phase 1 — Branch nodes neutral until per-branch session

### Stream A — Scope opening

1. [DONE] Создан planning-doc + этот todo-plan.
2. [TODO] Git Commit: `docs: open sidebar branch neutral scope` (hash: TBD)

### Stream B — Resolver fix + test refactor

1. [TODO] `use-step-provider-resolver.ts`: убрать `branchDefault`; `forBranchPart/Cluster/Module` always return `null`. `use-step-provider-resolver.test.ts`: добавить positive null-assertion для branch resolvers (тест в рамках hook'а, не pure-function). Scope: 2 файла.
2. [TODO] Git Commit: `fix(pm-sidebar): branch nodes stay neutral until per-branch session attaches` (hash: TBD)

### Stream C — SSOT docs sync

1. [TODO] Обновить SystemArchitecture invariant 36 + Project_Manager.md (branch v1 = neutral; chain inheritance отзывается). Scope: 2 файла.
2. [TODO] Git Commit: `docs(ssot): document branch neutral state until per-branch session` (hash: TBD)

## Phase 2 — Release 1.2.108

### Stream D — Pre-build version sync

1. [TODO] README + CHANGELOG bump 1.2.108. Scope: 2 файла.
2. [TODO] Git Commit: `docs: prepare release 1.2.108`

### Stream E — Build new release

1. [TODO] `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version` + копировать tarballs.
2. [TODO] Git Commit: `chore: build release 1.2.108`
3. [TODO] Архивировать todo-plan + planning-doc + Docs_Index.md update + reset todo-plan shell.
4. [TODO] Git Commit: `docs: archive sidebar branch neutral scope`
5. [TODO] Создать `doc/Sessions/Session031.md`.
