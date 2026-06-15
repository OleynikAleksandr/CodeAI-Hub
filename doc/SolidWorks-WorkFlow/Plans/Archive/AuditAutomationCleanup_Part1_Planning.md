# Audit Automation Cleanup Part 1 Planning

**Status:** Closed after user acceptance of release `1.2.523` on 2026-06-15.
**Scope type:** maintenance / audit remediation.

## Goal

Implement the first, low-risk part of the audit cleanup:

- add automatic checks for findings that were not covered by the current hook/CI set;
- manually fix simple audit findings that do not need a larger refactor;
- avoid provider-internal upgrades or broad clone refactors in this part.

## In Scope

1. Add a strict runtime dependency audit for production dependencies.
2. Surface duplicate/link/security checks in CI, not only local hooks.
3. Add a workspace-wide duplication guard with a threshold that catches regression without forcing a large refactor now.
4. Patch low-risk Core runtime dependency advisories.
5. Remove stale tracked `doc/TODO/Archive.zip` residue if no current SSOT requires it.
6. Remove obvious review noise: unnecessary `new Function` dynamic import and live `console.log` calls.
7. Trim redundant Knip entry hints.

## Out of Scope

- Gemini CLI/Core major compatibility upgrade. It touches provider internals and needs a dedicated provider smoke-test scope.
- Broad jscpd clone refactoring. Existing package-level duplication needs classification before edits.
- Release build. This part ends with tooling verification and user acceptance.

## Scope Expansion During Execution

After the initial audit remediation, the user explicitly expanded this cycle to include:

- Gemini CLI/Core alignment at `0.46.0`;
- Kimi model update to `kimi-k2-0711-preview` / user-facing Kimi 2.7;
- GLM-Claude-Code model update to GLM-5.2 labels/defaults and invocation smoke tests;
- provider prompt workspace-name clarity for managed agents;
- release `1.2.523` stale user-gate cursor fix, where Core ignores completed upstream preliminary review gates while a downstream managed review gate is open.

## Verification

- `npm run plan:validate`
- `npm run check:security`
- `npm run check:dup`
- `npm run check:links`
- `npm run check:knip`
- `npm run lint`
- `npm run build --workspace=@codeai-hub/core`

## Closeout Result

- Release `1.2.523` was built and accepted by the user.
- New automatic coverage now includes runtime dependency security checks and CI-visible duplicate/link/security gates.
- Simple audit findings were fixed manually without broad clone refactoring.
- The active plan was archived as `doc/TODO/Archive/todo-plan-closeout-audit-automation-cleanup-part1-2026-06-15.md`.
