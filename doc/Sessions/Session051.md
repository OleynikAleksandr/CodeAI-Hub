# Session 051 — Foundation Envelope continuity restore release

**Date:** 2026-04-06 08:45 (CEST)
**Branch:** main
**Version:** 1.1.896

---

# 1. Work Done in This Session

## Work summary
- Fixed cold-start continuity restore for the `Foundation Envelope` step so the existing history-backed dialog is reused after restart instead of creating an empty duplicate dialog root.
- Removed the stale local stage normalizer from the continuity root resolver and switched the handler to the canonical continuity stage normalization SSOT.
- Added duplicate-dialog resolution rules so PM continuity restore prefers the dialog that has a real JSONL history file when multiple entries share the same `stage + providerId + providerSessionId`.
- Added regression coverage for both restore paths: continuity root reuse and dialog-list deduplication for `foundation_envelope`.
- Updated `doc/SolidWorks-WorkFlow/System/Workflow_NewStep_Rollout_Guardrails.md` with explicit rollout guardrails that ban local stage-normalizer copies and require history-backed duplicate resolution.
- Updated `README.md` and `CHANGELOG.md` for `1.1.896`.
- Verified the fix with `npm run build --workspace=@codeai-hub/core`, `npx tsx --test packages/core/src/remote-bridge/handlers/foundation-envelope-continuity-restore.test.ts`, and `npx ultracite check packages/core/src/remote-bridge/handlers/session-request-handler-continuity-root.ts packages/core/src/remote-bridge/handlers/dialog-list-service.ts packages/core/src/remote-bridge/handlers/foundation-envelope-continuity-restore.test.ts`.
- Ran `./scripts/build-all.sh`, published refreshed provider/core/UI/launcher artefacts for `1.1.896`, and produced `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.1.896.vsix`.
- Ran `./scripts/build-release.sh --use-current-version` successfully and verified the expected release checkpoints: SDK exclusions, production dependency pruning before packaging, VSIX package creation, runtime package-surface verification, and development dependency restoration.

## Git commits
(IMPORTANT: This list is required so the next session can restore context via `git show`)
- `91d1aef0b fix: restore foundation envelope cold-start dialog history`
- `7f3861da9 build(release): publish foundation envelope continuity restore release`
- `TBD - this commit docs(session): record 1.1.896 continuity restore release`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `README.md`
2. `CHANGELOG.md`
3. `doc/SolidWorks-WorkFlow/Docs_Index.md`
4. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
5. `doc/SolidWorks-WorkFlow/System/Workflow_NewStep_Rollout_Guardrails.md`
6. `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
7. `doc/TODO/todo-plan.md`
8. `doc/Sessions/Session051.md` (THIS REPORT)

## Plans for next session
- Validate `1.1.896` in the real PM restart scenario that originally produced the empty `Foundation Envelope` dialog.
- If continuity restore is stable, resume from a newly approved scope only after reviewing the current workflow docs and rollout guardrails.
- Keep new workflow-step additions on the canonical continuity stage SSOT path only; do not introduce local stage normalization copies.
