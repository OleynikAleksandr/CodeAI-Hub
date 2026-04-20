# Session Dialog Bubble Visual Tone - Release 1.2.29

**Status:** Approved
**Date:** 2026-04-20
**Owner:** Codex

## 1. Goal

Publish a new product release that ships the already-implemented visual tuning for Session dialog thinking bubbles and the shared `1px` bubble stroke contract.

Target release:
- `1.2.29`

## 2. Scope

- update release-facing docs (`README.md`, `CHANGELOG.md`) for `1.2.29`;
- run the standard release pipeline:
  - `./scripts/build-all.sh`
  - `./scripts/build-release.sh --use-current-version`
- verify the resulting VSIX and packaged tarballs;
- close the temporary release scope and return `doc/TODO/todo-plan.md` to placeholder state.

## 3. Included Fix Set

- Session dialog message cards now use a shared `1px` stroke instead of `2px`.
- Thinking bubbles across Claude/Codex/Gemini now render as a softer secondary surface with alpha-reduced background and border.
- Thinking bubble header/body/toggle text now renders with muted alpha so visible reasoning reads as supporting context instead of competing with the final assistant answer.

## 4. Release Notes Direction

`1.2.29` should communicate two user-visible UI refinements:
- Session dialog message cards now use a lighter `1px` border.
- Thinking cards are visually quieter across all providers, with softer bubble chrome and dimmer reasoning typography.

## 5. Verification

- `npm run build:webview`
- `npm run build:project-manager`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`
