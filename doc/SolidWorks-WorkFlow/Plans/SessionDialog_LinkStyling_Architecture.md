# Session Dialog Link Styling Architecture

## Status
- Proposed: 2026-04-01
- Approved for execution: 2026-04-01

## Problem
- Clickable links rendered inside session dialog markdown currently use the browser default anchor styling.
- The default blue link color has poor contrast against every existing dialog bubble background across user, Claude, Codex, Gemini, and thinking surfaces.
- Underlines also add visual noise inside compact assistant/thinking bubbles.

## Goal
- Standardize clickable link styling inside session dialog markdown across all providers and bubble variants.
- New link presentation contract:
  - color: `rgba(148, 193, 251, 1)`
  - font weight: `500` (`Medium`)
  - no underline

## Scope
- Session dialog markdown only.
- Applies to standard assistant bubbles, user bubbles, and translated thinking bubbles because they all render through the same markdown content surface.

## Non-goals
- No change to artifact viewers, settings UI, Project Manager panels, or other global anchor styling.
- No change to markdown link behavior, click routing, or security attributes.

## Target Design
- Keep the current `ReactMarkdown` anchor renderer unchanged for behavior.
- Add canonical CSS rules on the shared dialog markdown container:
  - `.session-dialog__content a`
  - matching `:visited`, `:hover`, and `:focus-visible` states
- Preserve keyboard accessibility with a visible focus outline, while keeping the requested no-underline presentation.

## Verification
- `npm run build:webview`
- Manual release verification in the packaged build after `build-all.sh` and `build-release.sh --use-current-version`

## SSOT impact
- No System/Module SSOT change is required for this purely visual refinement.
- Release notes must mention the dialog-link readability improvement.
