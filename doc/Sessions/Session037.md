# Session 037 — GitHub Actions CI Workspace Build Order Fix Release

**Date:** 2026-04-04 15:16 (CEST)
**Branch:** main
**Version:** 1.1.886

---

# 1. Work Done in This Session

## Work summary
- Investigated the failing public `Repository CI` run for commit `9ee0bc45` and confirmed the failure was not a GitHub bootstrap issue but a compile-time clean-runner defect.
- Verified the public run annotation on GitHub Actions: `src/client/project-manager/core-stream-message-types.ts#L1` failed with `Cannot find module '@codeai-hub/localization' or its corresponding type declarations.`
- Traced the root cause to the root `compile` script: CI was type-checking browser/root sources before building workspace packages whose manifests point `types` to uncommitted `dist/*` outputs.
- Created and approved a dedicated planning doc for the CI fix, then updated the active `todo-plan.md` with a new Phase 3 stream.
- Fixed the root `compile` contract in `package.json` so it now builds `@codeai-hub/translation`, `@codeai-hub/localization`, and `@codeai-hub/core-supervisor` before `build:webview`, `typecheck:webview`, and root `tsc -p .`.
- Synced README `Public CI` docs so the listed gates now match the real workflow (`check:knip`, not the stale `check:tsprune`) and describe the clean-runner workspace-build ordering.
- Reproduced the original CI failure mode locally by deleting generated `dist` folders for `translation`, `localization`, and `core-supervisor`, then confirmed that the new `npm run compile` succeeds from that clean state.
- Prepared release notes for patch `1.1.886`, ran `./scripts/build-all.sh`, committed the unified version/manifests surface, and built the packaged VSIX with `./scripts/build-release.sh --use-current-version`.

## Verification
- Public run inspection via GitHub Actions web page for `Repository CI #14`
  - failing annotation: `src/client/project-manager/core-stream-message-types.ts#L1`
  - failing message: `Cannot find module '@codeai-hub/localization' or its corresponding type declarations.`
- `rm -rf packages/translation/dist packages/localization/dist packages/core-supervisor/dist && npm run compile`
- `npm run check:architecture`
- `npm run lint`
- `npm run check:knip`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`
  - confirmed `Step 7: Verifying SDK exclusions`
  - confirmed `Removing dev dependencies before packaging`
  - confirmed `✅ Package created`
  - confirmed `✅ VSIX runtime package surface verified`

## Git commits
- `475dd45d docs(plan): define ci workspace build-order fix`
- `62abc8a4 fix(ci): build workspace deps before compile`
- `a14b61e2 docs(release): prepare ci workspace build-order patch notes`
- `afc964fc build(release): assemble ci workspace build-order patch release`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session037.md` (THIS REPORT)

> If public CI needs another follow-up, also open `doc/SolidWorks-WorkFlow/Plans/GitHub_Actions_CI_Workspace_Build_Order_Fix.md`.

## Plans for next session
- Push the CI fix and confirm that the next `Repository CI` run triggered from `main` is green on GitHub.
- If CI is green, close or archive Phase 3 of the active `todo-plan.md` on the next closeout pass.
