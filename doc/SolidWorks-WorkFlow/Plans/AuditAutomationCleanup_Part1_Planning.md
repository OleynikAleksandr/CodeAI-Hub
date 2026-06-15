# Audit Automation Cleanup Part 1 Planning

**Status:** Accepted by user request on 2026-06-15.
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

## Verification

- `npm run plan:validate`
- `npm run check:security`
- `npm run check:dup`
- `npm run check:links`
- `npm run check:knip`
- `npm run lint`
- `npm run build --workspace=@codeai-hub/core`
