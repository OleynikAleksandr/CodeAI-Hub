# Development TODO Plan

## Execution Rules
- Required reading before each new fix:
  - `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`
  - `doc/SolidWorks-WorkFlow/Modules/Localization.md`
  - `doc/SolidWorks-WorkFlow/Plans/Application_Foundation_Envelope_Architecture.md`
- Scope of this plan: post-release localization hotfix for the `Application Foundation Envelope` stage shell.
- Each micro-task must stay within `<= 3 files`.
- Every implementation line must be followed by a separate `Git Commit:` line.
- Update docs and this plan in real time after every micro-task.
- Release stream is mandatory because the user is validating packaged builds, not only local source changes.

## Phase 1 — Application Foundation Envelope Localization Hotfix (owner: Codex, updated: 2026-04-05)

### Stream: Planning And Scope
1. [TODO] Update the active `Application Foundation Envelope` planning doc with the explicit localization boundary for PM shell copy and replace the placeholder active TODO with this hotfix execution plan; scope: `doc/SolidWorks-WorkFlow/Plans/Application_Foundation_Envelope_Architecture.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(plan): define application foundation envelope localization hotfix scope`
2. [TODO] Git Commit: `docs(plan): define application foundation envelope localization hotfix scope` (hash: TBD)

### Stream: PM Help And Shell Localization
1. [TODO] Re-align the `Application Foundation Envelope` help copy with workflow SSOT and route the panel help/error surfaces through canonical `Messages for the User` source entries; scope: `src/client/project-manager/components/application-foundation-envelope/application-foundation-envelope-panel.tsx`, `assets/localization/source/en/messages_for_the_user.json`; expected commit message: `fix(pm-localization): localize application foundation envelope help copy`
2. [TODO] Git Commit: `fix(pm-localization): localize application foundation envelope help copy` (hash: TBD)
3. [TODO] Route the new stage label and blocked-title through canonical `UI Labels` source entries for toolbar/tree rendering; scope: `src/client/project-manager/components/layout/toolbar.tsx`, `src/client/project-manager/components/layout/workspace-tree.tsx`, `assets/localization/source/en/ui_labels.json`; expected commit message: `fix(pm-localization): localize application foundation envelope workflow labels`
4. [TODO] Git Commit: `fix(pm-localization): localize application foundation envelope workflow labels` (hash: TBD)
5. [TODO] Replace the hardcoded session-branch English concatenation with a localized label format that keeps provider title as a translation variable; scope: `src/client/project-manager/components/layout/workspace-tree-stage-children.ts`, `src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts`, `assets/localization/source/en/ui_labels.json`; expected commit message: `fix(pm-localization): localize application foundation envelope session labels`
6. [TODO] Git Commit: `fix(pm-localization): localize application foundation envelope session labels` (hash: TBD)

### Stream: Verification
1. [TODO] Add regression coverage for the new step localization dictionary entries and PM label wiring; scope: `src/client/project-manager/components/application-foundation-envelope/application-foundation-envelope-localization.test.ts`, `src/client/project-manager/components/layout/workflow-navigation.test.ts`; expected commit message: `test(pm-localization): guard application foundation envelope localized copy`
2. [TODO] Git Commit: `test(pm-localization): guard application foundation envelope localized copy` (hash: TBD)
3. [TODO] Run targeted verification for the localized stage shell and record the concrete results in this plan; scope: targeted `tsx`/`node:test` commands and `npm run build:project-manager`; expected commit message: `test(pm-localization): verify application foundation envelope localization`
4. [TODO] Git Commit: `test(pm-localization): verify application foundation envelope localization` (hash: TBD)

### Stream: Release Build
1. [TODO] Update release-facing docs for the localization hotfix patch from the clean pre-build tree; scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(release): prepare application foundation envelope localization hotfix notes`
2. [TODO] Git Commit: `docs(release): prepare application foundation envelope localization hotfix notes` (hash: TBD)
3. [TODO] Run `./scripts/build-all.sh` on a clean tree and prepare the next patch release artifacts for the localization hotfix; scope: versioned manifests, package versions, `package-lock.json`, release caches; expected commit message: `build(release): assemble application foundation envelope localization hotfix release`
4. [TODO] Git Commit: `build(release): assemble application foundation envelope localization hotfix release` (hash: TBD)
5. [TODO] Run `./scripts/build-release.sh --use-current-version`, archive the completed hotfix plan, seed a new empty active `todo-plan.md`, and record the release session report; scope: `doc/TODO/Archive/*`, `doc/TODO/todo-plan.md`, `doc/Sessions/Session043.md`; expected commit message: `docs(session): record application foundation envelope localization hotfix release`
6. [TODO] Git Commit: `docs(session): record application foundation envelope localization hotfix release` (hash: TBD)
