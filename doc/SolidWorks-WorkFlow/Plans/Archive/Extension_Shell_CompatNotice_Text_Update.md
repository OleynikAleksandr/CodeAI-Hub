# Extension Shell Compat Notice — Text Update

**Status:** active (planning → implementation same session)
**Date:** 2026-04-23

## Problem

VS Code extension webview (`SettingsOnlyHost`) still shows a compat notice from the Settings → Project Manager migration (1.2.53/1.2.54 era):

- Title: "Settings moved to Project Manager"
- Body: "CodeAI Hub settings are now owned by Project Manager."
- Hint: "Open Project Manager and use the footer Open Settings button..."
- Notice: "This VS Code view remains only as a compatibility notice during the extension de-scope transition."

That migration is long-closed; the message describes a transition that no longer exists. The text must explain the extension's **current** steady-state role instead.

## Decision

Replace title + two body paragraphs with new steady-state copy: the extension is only an installer/updater, all work happens in Project Manager (desktop icon after first launch).

Drop unused runtime key `settings.only.compat_notice` (the third `<p>`), collapse body + hint into two paragraphs.

## New Text (source English)

- `extension_shell.role.title` → `This extension is for install and updates only`
- `extension_shell.role.body` → `The VS Code extension only installs CodeAI Hub and delivers updates. You don't need to come back here during regular work.`
- `extension_shell.role.hint` → `All work happens in the Project Manager app — its icon appears on your desktop after the first launch. Sessions, settings, localization, and workflow live there.`

Localization category: `user_guidance` (UI Helper Text — translated per §16/§17 of SystemArchitecture).

## Keys Retired

- `settings.only.compat_body` — fallback-only, not in source dictionary → removed
- `settings.only.compat_hint` — fallback-only, not in source dictionary → removed
- `settings.only.compat_notice` — fallback-only, not in source dictionary → removed (third paragraph deleted entirely)

Legacy `settings.only.body` / `settings.only.hint` in `ui_helper_text.json` are unused elsewhere — leave for now, sweep separately if needed.

## Files

1. `src/client/ui/src/app-host/settings-only-host.tsx` — swap keys + fallbacks, update `aria-label`, drop third `<p>`, drop now-unused `compatNotice` local.
2. `assets/localization/source/en/ui_helper_text.json` — add three approved-file keys under `user_guidance` category.
3. `media/react-chat.js` / webview bundle — regenerated via `npm run build:webview` (not hand-edited).

## Gates

Husky pre-commit: `check-architecture.sh`, `lint`, `check:knip`, `format:fix`. Targeted build: `npm run build:webview` + `npm run typecheck:webview`.

## Success Criteria

- New three strings render in dev webview (translated when non-English UI language active).
- No lingering references to `settings.only.compat_*` in source.
- Gates green, one commit.
