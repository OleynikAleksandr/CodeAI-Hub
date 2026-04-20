# Dialog Panel Localized Last Bubble Autoscroll — Release 1.2.28

**Status:** Proposed
**Date:** 2026-04-20
**Owner:** Codex

## 1. Goal

Publish a new product release that ships the already-implemented Session dialog autoscroll fix for late `localizedContent` growth of the last visible bubble.

Target release:
- `1.2.28`

## 2. Scope

- update release-facing docs (`README.md`, `CHANGELOG.md`) for `1.2.28`;
- run the standard release pipeline:
  - `./scripts/build-all.sh`
  - `./scripts/build-release.sh --use-current-version`
- verify the resulting VSIX and packaged tarballs;
- close the temporary release scope and return `doc/TODO/todo-plan.md` to placeholder state.

## 3. Included Fix Set

- Session dialog bottom-lock autoscroll now re-runs when the last visible bubble grows because a late translation overlay updates `localizedContent` without changing native `content`.
- Regression coverage proves the scroll anchor changes when only localized display text of the last bubble changes.

## 4. Release Notes Direction

`1.2.28` should communicate one user-visible fix:
- translated last thinking/assistant bubble now stays pinned to the newest bottom edge after late localization growth.

## 5. Verification

- `npm exec -- tsx --test src/client/ui/src/session/dialog-panel-scroll-anchor.test.ts`
- `npm run build:webview`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`
