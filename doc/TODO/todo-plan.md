# Development TODO Plan

## Execution Rules
- Required reading before each new fix:
  - `doc/SolidWorks-WorkFlow/Plans/Application_Foundation_Envelope_Architecture.md`
  - `doc/Sessions/Session044.md`
- Scope of this plan: post-release continuity and persistence hotfix for the `Application Foundation Envelope` stage after release `1.1.890`.
- Each micro-task must stay within `<= 3 files`.
- Every implementation line must be followed by a separate `Git Commit:` line.
- Update docs and this plan in real time after every micro-task.
- Release stream is mandatory because the user validates packaged VSIX builds, not only local source changes.

## Phase 1 — Application Foundation Envelope Continuity And Persistence Hotfix (owner: Codex, updated: 2026-04-05)

### Stream: Planning And Scope
1. [DONE] Extend the `Application Foundation Envelope` planning doc with the post-release continuity/persistence acceptance contract and replace the placeholder active TODO with this execution plan; scope: `doc/SolidWorks-WorkFlow/Plans/Application_Foundation_Envelope_Architecture.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(plan): define application foundation envelope continuity hotfix scope`
2. [DONE] Git Commit: `docs(plan): define application foundation envelope continuity hotfix scope` (hash: `b15e17b87`)

### Stream: Canonical Continuity Stage Identity
1. [DONE] Extend the continuity stage contract and chain-path normalization so `application_foundation_envelope` no longer falls back to `unknown` during chain persistence; scope: `packages/core/src/session-continuity/continuity-types.ts`, `packages/core/src/session-continuity/continuity-store.ts`; expected commit message: `fix(core-continuity): store application foundation envelope stage`
2. [DONE] Git Commit: `fix(core-continuity): store application foundation envelope stage` (hash: `d68b0e201`)
3. [DONE] Teach the continuity tracker and handoff report writer to preserve the canonical `application_foundation_envelope` stage path; scope: `packages/core/src/session-continuity/continuity-tracker.ts`, `packages/core/src/session-continuity/handoff-report-writer.ts`; expected commit message: `fix(core-continuity): keep application foundation envelope continuity paths`
4. [DONE] Git Commit: `fix(core-continuity): keep application foundation envelope continuity paths` (hash: `fae30dff4`)
5. [DONE] Preserve `application_foundation_envelope` in handoff prompts and workflow last-active readback so cold-start state cannot drop the stage; scope: `packages/core/src/session-continuity/handoff-prompt-builder.ts`, `packages/core/src/workflow/state/workflow-last-active-store.ts`; expected commit message: `fix(core-workflow): preserve application foundation envelope stage identity`
6. [DONE] Git Commit: `fix(core-workflow): preserve application foundation envelope stage identity` (hash: `fb7dfee11`)

### Stream: Verification
1. [DONE] Add regression coverage for continuity chain persistence and handoff report paths for `application_foundation_envelope`; scope: `packages/core/src/session-continuity/continuity-store.test.ts`, `packages/core/src/session-continuity/handoff-report-writer.test.ts`; expected commit message: `test(core-continuity): guard application foundation envelope continuity paths`
2. [DONE] Git Commit: `test(core-continuity): guard application foundation envelope continuity paths` (hash: `583e5e6cb`)
3. [DONE] Add regression coverage for workflow last-active readback so `application_foundation_envelope` survives cold-start parsing; scope: `packages/core/src/workflow/state/workflow-last-active-store.test.ts`; expected commit message: `test(core-workflow): guard application foundation envelope last-active persistence`
4. [DONE] Git Commit: `test(core-workflow): guard application foundation envelope last-active persistence` (hash: TBD)
5. [TODO] Run targeted verification for the continuity/persistence hotfix and record the concrete results in this plan; scope: targeted `tsx`/`node:test` commands and `npm run build --workspace @codeai-hub/core`; results: TBD; expected commit message: `test(core-stage): verify application foundation envelope persistence`
6. [TODO] Git Commit: `test(core-stage): verify application foundation envelope persistence` (hash: TBD)

### Stream: Release Build
1. [TODO] Update release-facing docs for the continuity/persistence hotfix patch from the clean pre-build tree; scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(release): prepare application foundation envelope continuity notes`
2. [TODO] Git Commit: `docs(release): prepare application foundation envelope continuity notes` (hash: TBD)
3. [TODO] Run `./scripts/build-all.sh` on a clean tree and prepare the next patch release artifacts for the continuity/persistence hotfix; scope: versioned manifests, package versions, `package-lock.json`, release caches; results: TBD; expected commit message: `build(release): assemble application foundation envelope continuity release`
4. [TODO] Git Commit: `build(release): assemble application foundation envelope continuity release` (hash: TBD)
5. [TODO] Run `./scripts/build-release.sh --use-current-version`, archive the completed hotfix plan, seed a new empty active `todo-plan.md`, and record the release session report; scope: `doc/TODO/Archive/*`, `doc/TODO/todo-plan.md`, `doc/Sessions/Session045.md`; results: TBD; expected commit message: `docs(session): record application foundation envelope continuity release`
6. [TODO] Git Commit: `docs(session): record application foundation envelope continuity release` (hash: TBD)
