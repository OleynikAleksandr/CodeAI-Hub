# Clear Context Menu / Confirm Dialog Restyle — Design System Alignment

- **Status:** active planning source for the current execution cycle.
- **Planning source:** user request 2026-06-01 (Project Manager UI, screenshot-driven).
- **Scope kind:** pure visual / CSS + className refactor (no behavior change, no workflow-truth change).
- **Planning owner:** Claude.

## 1. Problem (user request)

Right-clicking a Development/Documentation Tree step opens a small context menu with a `Clear` item; clicking it opens a confirmation card ("Clear … and all downstream workflow data? This cannot be undone." + a git-rollback warning + Cancel / Clear buttons). Both the menu and the card look out of place — they do not follow the app's design. The task: look at the existing well-styled menus/dialogs and make these match the overall concept.

## 2. Current state (measured from code)

Single component: `src/client/project-manager/components/layout/use-workspace-tree-clear-menu.tsx`. Everything is **inline styles with hard-coded colors** (no `--pm-*` tokens, no CSS classes):

- Container (`element`, lines 227-245): `background: #1f2937; border: 1px solid rgba(255,255,255,0.16); border-radius: 6; box-shadow: 0 12px 28px rgba(0,0,0,0.28)`; `position: fixed; left/top` from cursor.
- Menu item `Clear` (lines 203-221): `background: transparent; border: 0; color: #f8fafc; padding: 6px 18px`.
- Confirm body (lines 154-162): title `color: #f8fafc; font-size: 13`; warning `color: #fca5a5; font-size: 12`.
- Cancel button (lines 164-181): `background: transparent; border: 1px solid rgba(255,255,255,0.22); border-radius: 4; color: #f8fafc`.
- Clear button (lines 182-200): `background: #b91c1c; border: 1px solid rgba(255,255,255,0.18); border-radius: 4; color: #fff`.

Why it looks off: ad-hoc grey `#1f2937`, small `border-radius: 4-6`, a flat saturated red `#b91c1c`, and a tiny unpadded menu item — none of it uses the PM tokens or the established card/menu/button shapes.

## 3. Design references (the concept to match)

Tokens (`packages/ui/project-manager/styles.css` `:root`): `--pm-bg-panel: #101823`, card surface `#0f151d`, `--pm-border-color: #26303b`, `--pm-border-strong: #354152`, `--pm-text-primary: #e7eaee`, `--pm-text-muted: #a8b0ba`, `--pm-accent: #42c9a2`, `--pm-accent-strong: #5fe3ba`, `--pm-shadow-soft`.

Established patterns to mirror:
- `.pm-workspace-menu` / `.pm-workspace-menu__action` — menu surface + action items (panel bg, `--pm-border-color`, `border-radius: 14`, soft shadow; action: `height 38`, `border-radius 10`, accent tint on hover, `:disabled` opacity).
- `.pm-modal` / `.pm-modal__title` / `.pm-modal__button` / `.pm-modal__button--secondary` / `.pm-modal__error` — confirm card + buttons (card `#0f151d`, `border-radius: 14`, soft shadow; primary accent button; secondary subtle button; error block uses `color: #f3b6b6; background: rgba(232,99,99,0.12); border: 1px solid rgba(232,99,99,0.5)`).

## 4. Target behavior

Replace the inline styles with CSS classes that use the PM tokens and mirror the patterns above. No behavior change (same right-click → menu → confirm → Cancel/Clear flow, same handlers).

- **Menu container** → a `.pm-tree-menu` surface: `background: var(--pm-bg-panel)` (or card `#0f151d`), `border: 1px solid var(--pm-border-color)`, `border-radius: 12px`, `box-shadow: var(--pm-shadow-soft)`, small padding. Keep `position: fixed` + `left/top` inline (cursor-driven).
- **Menu item `Clear`** → `.pm-tree-menu__item` like `.pm-workspace-menu__action` (comfortable padding, `border-radius`, accent tint on hover).
- **Confirm card** → a `.pm-tree-menu__dialog` mirroring `.pm-modal` (card surface, radius, shadow, padding, gap).
- **Title text** → `--pm-text-primary`; **warning text** → the `.pm-modal__error` red palette (`#f3b6b6`), not the ad-hoc `#fca5a5`.
- **Cancel** → reuse `.pm-modal__button` + `.pm-modal__button--secondary`.
- **Clear (danger)** → a new `.pm-modal__button--danger` in the same tinted style as `.pm-modal__error` (`color: #f3b6b6; background: rgba(232,99,99,0.16); border: 1px solid rgba(232,99,99,0.5)`, darker hover) — signals a destructive action while staying inside the PM visual language (no flat saturated `#b91c1c`).

## 5. Files in scope

- `packages/ui/project-manager/styles.css` — add `.pm-tree-menu*` classes and the `.pm-modal__button--danger` variant.
- `src/client/project-manager/components/layout/use-workspace-tree-clear-menu.tsx` — swap inline styles for the new classNames (keep only the cursor `left/top` inline).

No Core/contract changes; behavior and handlers are unchanged.

## 6. Implementation slicing (micro-tasks <= 3 files)

- **Stream — Restyle Clear Menu & Confirm Dialog**: CSS classes + className swap together (one visual change, 2 files).

## 7. Verification, prototype, release and acceptance

- **Tooling Verification**: `npm run build:project-manager` + `npm run typecheck:webview`.
- **Prototype Visual Check**: a throwaway HTML prototype under `doc/tmp/prototypes/` showing the restyled menu + dialog, for the user to confirm the design before the release build.
- **Release Build Confirmation Gate**: ask the user explicitly before `build-all.sh`.
- **Release Build**: README/CHANGELOG for 1.2.435, `build-all.sh`, `build-release.sh --use-current-version`, collect VSIX.
- **User Visual Acceptance Testing**: hand over the VSIX; confirmed visually by the user.
- **Scope Closeout**: archive `todo-plan.md` + this planning doc, update `Docs_Index.md` — only after explicit user acceptance.

## 8. Risks / open points

- The PM design system (`DesignSystem/CorporateDesign.html`) does not yet define a semantic danger token; this scope introduces a danger button variant aligned with the existing `.pm-modal__error` palette. If a canonical danger token is added later, the variant should adopt it.
- Keep the menu cursor positioning (`left/top`) inline since it is dynamic.
