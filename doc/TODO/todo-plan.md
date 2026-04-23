# План разработки (Development TODO Plan)

**Execution Scope Status:** ACTIVE

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Extension_Shell_CompatNotice_Text_Update.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/Extension_Shell_CompatNotice_Text_Update.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (§16 localization invariant, §17 text-ownership, §33 settings ownership)
  - `doc/SolidWorks-WorkFlow/Modules/Localization.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- Каждая подзадача — ≤ 3 файла.
- После каждой подзадачи — отдельный пункт `Git Commit: ...`.
- Husky hooks прогоняют `check-architecture.sh`, `lint`, `check:knip`, `format:fix` (pre-commit) и `check:dup`, `check:links` (pre-push) автоматически.
- Таргетные сборки перед закрытием stream: `npm run build:webview`, `npm run typecheck:webview`.

## Phase 1 — Extension Shell Compat Notice Text Update (owner: Claude, updated: 2026-04-23)

### Stream 1: Replace deprecated compat notice with installer/updater role copy
1. [DONE] Add three approved keys (`extension_shell.role.title`, `extension_shell.role.body`, `extension_shell.role.hint`) to `assets/localization/source/en/ui_helper_text.json` — scope: 1 file
2. [DONE] Update `src/client/ui/src/app-host/settings-only-host.tsx`: replace compat keys with `extension_shell.role.*`, update `aria-label`, collapse third paragraph — scope: 1 file
3. [DONE] Rebuild webview (`npm run build:webview`) + typecheck (`npm run typecheck:webview`) — scope: generated bundle + type surface
4. [DONE] Git Commit: `feat(webview): replace extension compat notice with installer/updater role copy` (hash: TBD)
