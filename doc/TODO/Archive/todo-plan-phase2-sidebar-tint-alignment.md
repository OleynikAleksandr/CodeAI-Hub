# План разработки

## Context Pack

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Sidebar_AndStageCard_TintAlignment_Architecture.md`
- **Read context:**
  - `doc/SolidWorks-WorkFlow/Plans/Sidebar_AndStageCard_TintAlignment_Architecture.md`
  - SystemArchitecture.md §3 Invariant 36
  - Project_Manager.md Workflow Tree provider tint subsection
  - DesignSystem/CorporateDesign.html
  - `src/client/project-manager/components/layout/use-step-provider-resolver.ts`
  - `src/client/project-manager/components/layout/use-step-provider-resolver.test.ts`
  - `src/client/project-manager/components/shared/stage-confirmation-card.tsx`
  - `src/client/project-manager/services/workflow-provider-resolver.ts` (reference for inheritance chain)
  - `packages/ui/project-manager/styles.css` (sidebar tree section)

## Phase 1 — Tint alignment

### Stream A — Scope opening
1. [DONE] Planning + todo-plan written.
2. [TODO] Git Commit: `docs: open sidebar + stage card tint alignment scope`

### Stream B — Resolver upstream inheritance + tests
1. [TODO] `use-step-provider-resolver.ts`: добавить upstream-inheritance в `resolveStageProviderId` (VS → Description, DM → VS chain → Description). `use-step-provider-resolver.test.ts`: добавить тесты VS-inherits-from-Description, DM-inherits-from-VS, DM-inherits-from-Description-when-VS-empty. Scope: 2 файла.
2. [TODO] Git Commit: `feat(pm-sidebar): inherit upstream provider for idle trunk stages`

### Stream C — Neutral selected for idle items
1. [TODO] `packages/ui/project-manager/styles.css`: добавить `.pm-tree__item:not([data-provider]).pm-tree__item--selected` правило с нейтральными tokens. Scope: 1 файл.
2. [TODO] Git Commit: `feat(pm-sidebar): neutral selection state for idle items`

### Stream D — Stage card provider-tinted buttons
1. [TODO] `stage-confirmation-card.tsx`: заменить hardcoded green selection styles на provider-specific tokens (Claude warm peach / Codex cyan / Gemini cool lavender). Inherited badge too. Scope: 1 файл.
2. [TODO] Git Commit: `feat(pm-stage-card): tint provider radio pills per provider`

### Stream E — SSOT docs sync
1. [TODO] SystemArchitecture invariant 36 + Project_Manager.md (upstream inheritance + neutral selected). Scope: 2 файла.
2. [TODO] Git Commit: `docs(ssot): document upstream provider inheritance and neutral selected state`

## Phase 2 — Release 1.2.109
1. [TODO] README + CHANGELOG bump → Git Commit: `docs: prepare release 1.2.109`
2. [TODO] `./scripts/build-all.sh` → Git Commit: `chore: build release 1.2.109`
3. [TODO] `./scripts/build-release.sh --use-current-version` + tarballs to doc/tmp/releases/.
4. [TODO] Архивировать → Git Commit: `docs: archive sidebar tint alignment scope`
5. [TODO] Session032 report.
