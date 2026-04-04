# GitHub Actions CI Workspace Build Order Fix

**Status:** Approved for execution (2026-04-04)
**Created:** 2026-04-04
**Owner:** Oleksandr + Codex
**Scope:** Fix the public `Repository CI` failure where clean GitHub runners cannot resolve workspace package types from `@codeai-hub/localization` during compile-time checks.

---

## 1. Problem

`Repository CI #14` failed on `main` for commit `9ee0bc45`.

Public run evidence:

- workflow: `Repository CI`
- job: `quality-gates`
- annotation: `src/client/project-manager/core-stream-message-types.ts#L1`
- error: `Cannot find module '@codeai-hub/localization' or its corresponding type declarations.`

This is not a GitHub bootstrap failure. It is a clean-runner compile-order defect.

---

## 2. Root Cause

The root `compile` script currently does this:

1. build `@codeai-hub/core-supervisor`
2. build webview
3. type-check webview
4. run root `tsc -p .`

But browser and extension sources import workspace packages such as:

- `@codeai-hub/localization`
- transitively `@codeai-hub/translation`

In a clean GitHub runner:

- `npm ci` creates workspace links in `node_modules/@codeai-hub/*`;
- those package manifests point `main` / `types` to `dist/*`;
- `dist/*` is not committed and does not exist yet;
- local machines hide this defect because previous builds have already materialized `packages/localization/dist` and `packages/translation/dist`.

So CI fails only on clean machines.

---

## 3. Decision

Make the root `compile` script explicitly build the workspace packages whose emitted `dist` types are required by compile-time consumers before browser/root type-check starts.

Required order:

1. `@codeai-hub/translation`
2. `@codeai-hub/localization`
3. `@codeai-hub/core-supervisor`
4. `build:webview`
5. `typecheck:webview`
6. `tsc -p .`

Also sync the README public-CI section so it reflects the actual enforced gates (`check:knip`, not the stale `check:tsprune` wording).

Non-goals:

- do not add committed `dist/` artefacts;
- do not weaken CI by skipping browser or root compile steps;
- do not change release packaging flow.

---

## 4. Target Change

### 4.1. Root compile contract

Update the root `compile` script in `package.json` so clean-runner compilation always builds the required workspace packages first.

### 4.2. CI documentation parity

Update README `Public CI` text to match the real workflow gates and the new clean-runner build-order contract.

### 4.3. Verification

Reproduce the clean-runner scenario locally by removing generated `dist` outputs for the dependent workspace packages, then run:

1. `npm run compile`
2. `npm run check:architecture`
3. `npm run lint`
4. `npm run check:knip`

After the fix is pushed, `Repository CI` should succeed on the next `main` run.
