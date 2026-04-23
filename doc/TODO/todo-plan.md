# План разработки (Development TODO Plan)

**Execution Scope Status:** ACTIVE

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Extension_Shell_Localization_Delivery_Fix.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/Extension_Shell_Localization_Delivery_Fix.md`
  - `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`
  - `doc/SolidWorks-WorkFlow/Modules/Localization.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (§16 localization invariant, §22 localization blocking UI invariant)
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- Каждая подзадача — ≤ 3 файла.
- После каждой подзадачи — отдельный пункт `Git Commit: ...`.
- Husky hooks прогоняют `check-architecture.sh`, `lint`, `check:knip`, `format:fix` (pre-commit) и `check:dup`, `check:links` (pre-push) автоматически.
- Таргетные сборки: `npm run build:webview`, `npm run typecheck:webview`. Общий typecheck на всю extension при изменении home-view-provider (`tsc -p tsconfig.json`).

## Phase 1 — Extension Shell Localization Delivery Fix (owner: Claude, updated: 2026-04-23)

### Stream 1: Retag title as UI Labels
1. [DONE] Move `extension_shell.role.title` from `assets/localization/source/en/ui_helper_text.json` to `assets/localization/source/en/ui_labels.json`; update `src/client/ui/src/app-host/settings-only-host.tsx` so title uses category `ui_interface`, body/hint stay on `user_guidance` — scope: 3 files
2. [DONE] Git Commit: `feat(localization): retag extension_shell.role.title as UI Labels` (hash: 70f03fe0b)

### Stream 2: Inject bootstrap into VS Code extension webview
3. [DONE] Wire `LocalizationRuntimeService.loadRuntimeBootstrapSnapshot` into `src/extension-module/home-view-provider.ts`; load cached settings + bootstrap snapshot before `WebviewHtmlGenerator.generate`, pass as `localizationBootstrap`, preserve existing error-warning path — scope: 1 file
4. [DONE] Rebuild webview (`npm run build:webview`) + `npm run typecheck:webview` + `npx tsc -p tsconfig.json --noEmit` for extension-side types — scope: generated bundle + types
5. [DONE] Git Commit: `fix(extension): inject cached localization bootstrap into VS Code webview at HTML generation` (hash: TBD)
