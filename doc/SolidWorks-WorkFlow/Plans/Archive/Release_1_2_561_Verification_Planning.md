# Release 1.2.561 Verification Planning

**Status:** Accepted for execution
**Date:** 2026-06-20
**Owner:** release session

## Scope

Build a new patch release after merging `codex/local-models-tools-warmup` into `main`, so the user can install and retest the combined mainline state.

## Release Target

- Current version: `1.2.560`
- Target version: `1.2.561`
- Branch: `main`

## Required Work

1. Update `README.md` and `CHANGELOG.md` for `1.2.561`.
2. Run the normal release scripts.
3. Commit generated version/package/artifact changes through the plan workflow.
4. Leave the scope active for user acceptance testing.

## Acceptance

- `npm run plan:status` reports `Validation: OK`.
- Release scripts complete and produce `codeai-hub-1.2.561.vsix`.
- Release tarballs are copied to `doc/tmp/releases/`.
- User receives the VSIX path for retest.
