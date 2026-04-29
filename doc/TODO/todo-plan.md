# План разработки (Development TODO Plan)

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Sidebar_IdleStepNeutralTone_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/Sidebar_IdleStepNeutralTone_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Sidebar_ProviderTint_Architecture.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` §3 Invariant 36
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md` Workflow Tree provider tint subsection
  - `src/client/project-manager/components/layout/use-step-provider-resolver.ts`
  - `src/client/project-manager/components/layout/use-step-provider-resolver.test.ts`
  - `src/client/project-manager/components/layout/workspace-tree.tsx`
- Только этот список является источником документов для восстановления контекста.

## Правила выполнения

Стандартные (см. предыдущий цикл): ≤3 файла per micro-task, обязательный Git Commit pair, Husky gates автоматически.

## Phase 1 — Idle step neutral tone fix (owner: UI / Project Manager, updated: 2026-04-29)

### Stream A — Scope opening

1. [DONE] Создан planning-doc + этот todo-plan; commit message: `docs: open sidebar idle neutral tone scope`.
2. [TODO] Git Commit: `docs: open sidebar idle neutral tone scope` (hash: TBD)

### Stream B — Resolver + tree wiring + test refactor

1. [TODO] `use-step-provider-resolver.ts`: вернуть `SidebarProviderId | null` из `forStage` / `forBranchPart` / `forBranchCluster` / `forBranchModule`; убрать `DEFAULT_FALLBACK`; `fallbackProviderId` остаётся опциональным без default. `workspace-tree.tsx`: передавать `data-provider={... ?? undefined}` (React skips attribute). `use-step-provider-resolver.test.ts`: переписать тесты idle-fallback-кейсы (без явного fallback → null; с явным fallback → fallback). Scope: 3 файла; commit message: `fix(pm-sidebar): keep idle steps neutral when no provider attribution`.
2. [TODO] Git Commit: `fix(pm-sidebar): keep idle steps neutral when no provider attribution` (hash: TBD)

### Stream C — SSOT docs sync

1. [TODO] Обновить SystemArchitecture.md §3 Invariant 36 (идле stages = no data-provider, neutral inheritance) + Project_Manager.md Workflow Tree provider tint subsection. Scope: 2 файла; commit message: `docs(ssot): document idle step neutral tone in sidebar`.
2. [TODO] Git Commit: `docs(ssot): document idle step neutral tone in sidebar` (hash: TBD)

## Phase 2 — Release 1.2.107 (owner: Build, updated: 2026-04-29)

### Stream D — Pre-build version sync

1. [TODO] Обновить README.md («Current Release — v1.2.107») + CHANGELOG.md (новая секция `## [1.2.107]`). Scope: 2 файла; commit message: `docs: prepare release 1.2.107`.
2. [TODO] Git Commit: `docs: prepare release 1.2.107` (hash: TBD)

### Stream E — Build new release

1. [TODO] Запустить `./scripts/build-all.sh` → `./scripts/build-release.sh --use-current-version` → копирование tarballs в `doc/tmp/releases/`. Артефакты: `codeai-hub-1.2.107.vsix` + 7 tarballs.
2. [TODO] Git Commit: `chore: build release 1.2.107` (hash: TBD)
3. [TODO] Архивировать todo-plan и planning-doc; обновить Docs_Index.md; reset активного todo-plan в no-active-scope shell. Scope: 4 файла + дельта.
4. [TODO] Git Commit: `docs: archive sidebar idle neutral tone scope` (hash: TBD)
5. [TODO] Создать `doc/Sessions/Session030.md` (Type A Completion Report).
