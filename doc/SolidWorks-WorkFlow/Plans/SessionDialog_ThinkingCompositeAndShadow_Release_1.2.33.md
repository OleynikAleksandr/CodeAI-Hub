# Session Dialog Thinking Composite And Shadow - Release 1.2.33

**Status:** Approved
**Date:** 2026-04-20
**Owner:** Codex

## 1. Goal

Publish a new product release that ships the corrected provider-facing `Thinking` bubble contract.

Target release:
- `1.2.33`

## 2. Scope

- update release-facing docs (`README.md`, `CHANGELOG.md`) for `1.2.33`;
- run the standard release pipeline:
  - `./scripts/build-all.sh`
  - `./scripts/build-release.sh --use-current-version`
- verify the resulting VSIX and packaged tarballs;
- close the temporary release scope and return `doc/TODO/todo-plan.md` to placeholder state.

## 3. Included Fix Set

- assistant-tagged provider-facing `Thinking` bubbles (`Claude · Thinking`, `Codex · Thinking`, `Gemini · Thinking`) are now rendered as full message cards again instead of inheriting the legacy compact strip compromises;
- the user-facing provider `Thinking` bubble path restores the message-card shadow;
- the visible provider `Thinking` bubble chrome is tuned against the real Session dialog backdrop so the muted surface no longer collapses into the darker gray composite from the panel background;
- legacy compact `role="thinking"` strips stay on their separate transition-surface contract.

## 4. Release Notes Direction

`1.2.33` should communicate one corrective UI fix:
- visible provider `Thinking` bubbles now render with the intended full-card shadow and corrected muted chrome across Claude, Codex, and Gemini, while the legacy compact thinking strip remains a separate secondary surface.

## 5. Verification

- `npm exec -- tsx --test src/client/ui/src/session/dialog-panel-message-utils.test.ts`
- `npm run build:webview`
- `npm run build:project-manager`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`
