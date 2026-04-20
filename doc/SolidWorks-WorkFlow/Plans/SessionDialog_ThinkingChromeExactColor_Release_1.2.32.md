# Session Dialog Thinking Chrome Exact Color - Release 1.2.32

**Status:** Approved
**Date:** 2026-04-20
**Owner:** Codex

## 1. Goal

Publish a new product release that ships the exact design-color correction for muted thinking-card chrome.

Target release:
- `1.2.32`

## 2. Scope

- update release-facing docs (`README.md`, `CHANGELOG.md`) for `1.2.32`;
- run the standard release pipeline:
  - `./scripts/build-all.sh`
  - `./scripts/build-release.sh --use-current-version`
- verify the resulting VSIX and packaged tarballs;
- close the temporary release scope and return `doc/TODO/todo-plan.md` to placeholder state.

## 3. Included Fix Set

- thinking-card fill now uses the exact design color `#2C3230` at `45%`;
- thinking-card stroke now uses the exact design color `#47474A` at `45%`;
- provider-accent muted header behavior remains unchanged from `1.2.31`.

## 4. Release Notes Direction

`1.2.32` should communicate one corrective UI fix:
- muted thinking cards now use the exact design fill/stroke colors instead of approximate near-gray values, so the visible `Thinking` bubble chrome matches the approved spec more precisely.

## 5. Verification

- `npm run build:webview`
- `npm run build:project-manager`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`
