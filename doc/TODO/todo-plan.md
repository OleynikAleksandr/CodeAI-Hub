# План разработки

## Context Pack
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Sidebar_RevertUpstreamInheritance_Architecture.md`
- **Read context:**
  - `doc/SolidWorks-WorkFlow/Plans/Sidebar_RevertUpstreamInheritance_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Sidebar_AndStageCard_TintAlignment_Architecture.md`
  - SystemArchitecture.md §3 Invariant 36
  - `src/client/project-manager/components/layout/use-step-provider-resolver.ts`
  - `src/client/project-manager/components/layout/use-step-provider-resolver.test.ts`

## Phase 1 — Revert upstream inheritance

### Stream A — Scope opening
1. [DONE] Planning + todo-plan.
2. [TODO] Git Commit: `docs: open sidebar revert upstream inheritance scope`

### Stream B — Resolver fix + test update
1. [TODO] `use-step-provider-resolver.ts`: убрать VS-from-description и DM-from-VS/description fallback из `resolveStageProviderId`. Оставить только description own chain → primarySession. `use-step-provider-resolver.test.ts`: переделать upstream inheritance тесты (теперь они должны утверждать null-возврат для VS/DM без своих chain'ов даже когда Description имеет primarySession). Scope: 2 файла.
2. [TODO] Git Commit: `fix(pm-sidebar): revert upstream inheritance — idle stages stay neutral`

### Stream C — SSOT docs sync
1. [TODO] SystemArchitecture invariant 36 + Project_Manager.md: убрать упоминание upstream inheritance, явно зафиксировать «strict per-step own-chain attribution». Scope: 2 файла.
2. [TODO] Git Commit: `docs(ssot): clarify strict per-step provider attribution`

## Phase 2 — Release 1.2.110
1. [TODO] README + CHANGELOG → Git Commit: `docs: prepare release 1.2.110`
2. [TODO] `./scripts/build-all.sh` → Git Commit: `chore: build release 1.2.110`
3. [TODO] `./scripts/build-release.sh --use-current-version` + tarballs.
4. [TODO] Архивировать → Git Commit: `docs: archive sidebar revert upstream inheritance scope`
5. [TODO] Session033 report.
