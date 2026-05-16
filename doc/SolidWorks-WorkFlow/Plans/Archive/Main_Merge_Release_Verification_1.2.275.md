# Main Merge Release Verification 1.2.275

**Status:** Archived after user acceptance
**Created:** 2026-05-16
**Closed:** 2026-05-16
**Owner:** Oleksandr / Codex

## Trigger

The user merged a worktree created from the main repository back into `main`. That worktree contained the large Core managed-orchestration rewrite. The user requested a fresh release with a new version number so the merged baseline can be installed and workflow-tested.

## Goal

Build and package CodeAI Hub `1.2.275` from the current `main` branch without introducing product-code changes.

## Scope

- Prepare README and CHANGELOG for the future `1.2.275` release before version bump.
- Run the standard unified runtime artifact build through `./scripts/build-all.sh`.
- Commit generated version and manifest updates.
- Run `./scripts/build-release.sh --use-current-version` from a clean tree.
- Hand off the generated VSIX and fresh runtime tarballs for user retest.

## Acceptance Criteria

- `./scripts/build-all.sh` completes and produces provider, Core, UI, and launcher tarballs for `1.2.275`.
- `./scripts/build-release.sh --use-current-version` completes and prints the expected release evidence, including SDK exclusion verification, dev dependency pruning, and VSIX package creation.
- Root `package.json` reports `1.2.275`.
- `codeai-hub-1.2.275.vsix` exists in the repository root.
- Fresh `1.2.275` tarballs exist under `doc/tmp/releases/` and `~/.codeai-hub/releases/`.
- The active scope remains open until user workflow retest is complete and explicitly accepted.

## Out Of Scope

- Product-code fixes unless the release pipeline exposes a blocker.
- Closing or archiving the active scope before user acceptance.
- Manual package version edits outside the release scripts.

## Closeout

- Release `1.2.275` was built and packaged successfully.
- User tested the release and accepted the merged Core managed orchestrator work.
- Active worktree cleanup was requested after acceptance: keep `main` and the primary repository, remove the auxiliary managed-orchestrator worktree and branch.
