# Development TODO Plan

## Execution Rules
- Required reading before each new fix:
  - `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`
  - `doc/SolidWorks-WorkFlow/Modules/Localization.md`
  - `doc/SolidWorks-WorkFlow/Plans/Foundation_Envelope_Architecture.md`
- Scope of this plan: post-release parity hotfix for the `Foundation Envelope` stage tree/session UX after release `1.1.889`.
- Each micro-task must stay within `<= 3 files`.
- Every implementation line must be followed by a separate `Git Commit:` line.
- Update docs and this plan in real time after every micro-task.
- Release stream is mandatory because the user validates packaged VSIX builds, not only local source changes.

## Phase 1 — Foundation Envelope Tree And Session Parity Hotfix (owner: Codex, updated: 2026-04-05)

### Stream: Planning And Scope
1. [DONE] Extend the `Foundation Envelope` planning doc with the post-release tree/session parity contract and replace the placeholder active TODO with this execution plan; scope: `doc/SolidWorks-WorkFlow/Plans/Foundation_Envelope_Architecture.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(plan): define foundation envelope tree parity hotfix scope`
2. [DONE] Git Commit: `docs(plan): define foundation envelope tree parity hotfix scope` (hash: `d7be369f8`)

### Stream: Workflow Tree Parity
1. [DONE] Add a canonical artifact availability probe for `foundation-envelope.md` and wire it into the workspace tree stage context; scope: `src/client/project-manager/components/layout/use-foundation-envelope-artifact-availability.ts`, `src/client/project-manager/components/layout/workspace-tree.tsx`; expected commit message: `feat(pm-afe): probe foundation envelope artifact availability`
2. [DONE] Git Commit: `feat(pm-afe): probe foundation envelope artifact availability` (hash: `7ba121752`)
3. [DONE] Build `Foundation Envelope` tree children with the same session + artifact contract used by mature workflow stages; scope: `src/client/project-manager/components/layout/workspace-tree-stage-children.ts`, `src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts`; expected commit message: `feat(pm-afe): add foundation envelope branch nodes`
4. [DONE] Git Commit: `feat(pm-afe): add foundation envelope branch nodes` (hash: `e730bb9a5`)
5. [DONE] Align stage sync and workspace auto-select with the `Foundation Envelope` artifact/session pair; scope: `src/client/project-manager/components/layout/use-stage-panel-sync.ts`, `src/client/project-manager/components/layout/workspace-tree-auto-select.ts`, `src/client/project-manager/components/layout/workspace-tree.tsx`; expected commit message: `fix(pm-afe): sync foundation envelope stage selection`
6. [DONE] Git Commit: `fix(pm-afe): sync foundation envelope stage selection` (hash: `3c655783c`)

### Stream: Session Empty State Parity
1. [DONE] Thread the active workflow stage into the PM session surfaces so the empty state can resolve the current stage instead of assuming Description; scope: `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx`, `src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx`, `src/client/ui/src/session/session-view.tsx`; expected commit message: `feat(pm-session): pass workflow stage context into empty state`
2. [DONE] Git Commit: `feat(pm-session): pass workflow stage context into empty state` (hash: `4e8ca8e99`)
3. [DONE] Make the session empty state workflow-aware and localizable for `Foundation Envelope`; scope: `src/client/ui/src/session/empty-state.tsx`, `src/client/ui/src/session/session-view.tsx`, `assets/localization/source/en/messages_for_the_user.json`; expected commit message: `fix(pm-session): localize workflow-aware empty state`
4. [DONE] Git Commit: `fix(pm-session): localize workflow-aware empty state` (hash: `a7ae1be45`)

### Stream: Verification
1. [DONE] Add regression coverage for the new `Foundation Envelope` tree parity and workflow-aware empty state copy; scope: `src/client/project-manager/components/layout/foundation-envelope-tree-parity.test.ts`, `src/client/ui/src/session/empty-state.test.ts`; expected commit message: `test(pm-afe): guard tree and empty-state parity`
2. [DONE] Git Commit: `test(pm-afe): guard tree and empty-state parity` (hash: `fc5b626e6`)
3. [DONE] Run targeted verification for the new tree/session parity behavior and record the concrete results in this plan; scope: targeted `tsx`/`node:test` commands and `npm run build:project-manager`; results: PASS (`npx tsx --test src/client/project-manager/components/layout/foundation-envelope-tree-parity.test.ts src/client/ui/src/session/empty-state.test.ts src/client/project-manager/components/layout/workflow-navigation.test.ts src/client/project-manager/components/foundation-envelope/foundation-envelope-localization.test.ts`, `npm run build:project-manager`); expected commit message: `test(pm-afe): verify tree and empty-state parity`
4. [DONE] Git Commit: `test(pm-afe): verify tree and empty-state parity` (hash: `7e378bb89`)

### Stream: Release Build
1. [DONE] Update release-facing docs for the tree/session parity hotfix patch from the clean pre-build tree; scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(release): prepare foundation envelope tree parity notes`
2. [DONE] Git Commit: `docs(release): prepare foundation envelope tree parity notes` (hash: `a6dcb3d0e`)
3. [DONE] Run `./scripts/build-all.sh` on a clean tree and prepare the next patch release artifacts for the tree/session parity hotfix; scope: versioned manifests, package versions, `package-lock.json`, release caches; results: PASS (`./scripts/build-all.sh`), unified version `1.1.890`, tarballs present in `doc/tmp/releases/`; expected commit message: `build(release): assemble foundation envelope tree parity release`
4. [DONE] Git Commit: `build(release): assemble foundation envelope tree parity release` (hash: `08b35c089`)
5. [DONE] Run `./scripts/build-release.sh --use-current-version`, archive the completed hotfix plan, seed a new empty active `todo-plan.md`, and record the release session report; scope: `doc/TODO/Archive/*`, `doc/TODO/todo-plan.md`, `doc/Sessions/Session044.md`; results: PASS (`./scripts/build-release.sh --use-current-version`), `codeai-hub-1.1.890.vsix` created, release markers confirmed (`Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`), advisory broken links remain in `doc/Sessions/Session040.md` and `doc/Sessions/Session041.md`; expected commit message: `docs(session): record foundation envelope tree parity release`
6. [DONE] Git Commit: `docs(session): record foundation envelope tree parity release` (hash: `TBD - this commit`)
