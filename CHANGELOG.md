# Changelog

All notable changes to this project will be documented in this file.

## [1.0.40] - 2025-10-24
### Changed
- Download the CEF runtime and launcher during extension activation, ensuring the web client button launches without additional waits.
- Removed bundled binaries from the VSIX so it only carries the extension code and UI assets; large launchers stay in GitHub Releases.
- Updated launcher delivery documentation and manifests to reference the new `CodeAIHubLauncher-macos-arm64-1.0.40.tar.bz2` artifact.

### Build
- Release packaged as `codeai-hub-1.0.40.vsix` via `./scripts/build-release.sh 1.0.40` (pair with `CodeAIHubLauncher-macos-arm64-1.0.40.tar.bz2`).

## [1.0.39] - 2025-10-24
### Fixed
- Resolved the macOS launcher crash caused by missing ICU/resource paths and re-enabled multi-process mode by removing the `--single-process` flag.
- Pointed the launcher manifest at the GitHub release archive and added SHA-1 verification for downloaded tarballs.

### Build
- Release packaged as `codeai-hub-1.0.39.vsix` via `./scripts/build-release.sh 1.0.39` (paired with `CodeAIHubLauncher-macos-arm64.tar.bz2`).

# [1.0.35] - 2025-10-22
### Added
- Shared the webview React UI with a standalone static web client bundle and exposed the `UI Outside` launcher command.
- Automatically create OS-specific web client shortcuts (Windows `.lnk`, macOS `.app` launcher, Linux `.desktop`) during activation.
- Added runtime diagnostics and default VS Code theming tokens so the standalone web client matches the in-editor appearance.

### Build
- Release packaged as `codeai-hub-1.0.35.vsix` via `./scripts/build-release.sh 1.0.35`.

# [1.0.24] - 2025-10-21
### Changed
- Matched the Session Status panel font size with the TODO block (11 px) so all session chrome text feels consistent.

### Build
- Release packaged as `codeai-hub-1.0.24.vsix` via `./scripts/build-release.sh 1.0.24`.

# [1.0.23] - 2025-10-21
### Changed
- Reduced the Session TODO header and item font sizes by 1px to further compress panel height while keeping counters legible.

### Build
- Release packaged as `codeai-hub-1.0.23.vsix` via `./scripts/build-release.sh 1.0.23`.

# [1.0.22] - 2025-10-21
### Changed
- Added an inline toggle to show only active tasks in the Session TODO list and collapse completed items.
- Tightened the Session TODO header spacing so the panel height matches the refreshed chrome.

### Build
- Release packaged as `codeai-hub-1.0.22.vsix` via `./scripts/build-release.sh 1.0.22`.

# [1.0.21] - 2025-10-21
### Changed
- Aligned the new Info Panel with the status block layout, keeping the shared 56px rail while leaving a placeholder row for future metadata.
- Finalised the provider picker overlay polish so the session grid stays hidden whenever the chooser is open.

### Build
- Release packaged as `codeai-hub-1.0.21.vsix` via `./scripts/build-release.sh 1.0.21`.

# [1.0.20] - 2025-10-21
### Added
- Introduced the Info Panel scaffold between the session tabs and dialog to host forthcoming runtime insights.

### Build
- Release packaged as `codeai-hub-1.0.20.vsix` via `./scripts/build-release.sh 1.0.20`.

# [1.0.19] - 2025-10-21
### Changed
- Retinted inactive session tabs to `#1D2F48`, improving contrast against the refreshed shell.

### Build
- Release packaged as `codeai-hub-1.0.19.vsix` via `./scripts/build-release.sh 1.0.19`.

# [1.0.18] - 2025-10-21
### Changed
- Restyled the provider picker to use the darker `#242A2F` backdrop and hide the live session chrome while the dialog is active, preventing layout flicker.

### Build
- Release packaged as `codeai-hub-1.0.18.vsix` via `./scripts/build-release.sh 1.0.18`.

# [1.0.17] - 2025-10-20
### Changed
- Ported the top action row to the `ActionBar` React component so it shares state with the provider picker and no longer depends on static HTML.
- Restored the “Create your first session” helper when no sessions are open and aligned the empty container with the refreshed chrome.
- Centralised button colour tokens in `media/main-view.css` (`--color-steelblue-*`, `--color-cornflowerblue`, `--color-deepskyblue`) to keep hover/active states consistent across the action bar and provider picker.

### Build
- Release packaged as `codeai-hub-1.0.17.vsix` via `./scripts/build-release.sh 1.0.17`.

# [1.0.16] - 2025-10-20
### Changed
- Introduced interim styling updates for the action bar buttons ahead of the React port.

### Build
- Release packaged as `codeai-hub-1.0.16.vsix` via `./scripts/build-release.sh 1.0.16`.

# [1.0.15] - 2025-10-20
### Changed
- Polished the session chrome: unified the shell background (`rgba(31, 31, 31, 1)`), flattened Action Bar gaps, introduced dual-tone rails (`#56595C → #18191B`) and synced the webview HTML scaffold with the new palette.
- Reworked the provider picker footer so the selection status sits on the left while `Cancel` and `Start session` stay grouped on the right; locked the session panel grid to a single column regardless of viewport width.

### Build
- Release packaged as `codeai-hub-1.0.15.vsix` via `./scripts/build-release.sh 1.0.15`.

# [1.0.14] - 2025-10-20
### Changed
- Eliminated gutters around the Action Bar and session region, aligning the chrome flush with the container edges.
- Tweaked Action Bar button styling so the highlighted state matches the rest of the palette when inactive.

### Build
- Release packaged as `codeai-hub-1.0.14.vsix` via `./scripts/build-release.sh 1.0.14`.

## [1.0.13] - 2025-10-19
### Fixed
- Restored the darker inactive session tab palette (`rgba(21, 21, 21, 1)` fill with `rgba(0, 0, 0, 1)` border) while keeping the refreshed active tab colours.

### Build
- Release packaged as `codeai-hub-1.0.13.vsix` via `./scripts/build-release.sh 1.0.13`.

## [1.0.12] - 2025-10-19
### Changed
- Unified the session palette: tabs plus dialog, TODO, input, and status panels now share a `rgba(40, 41, 42, 1)` background with `rgba(67, 68, 70, 1)` borders.

### Build
- Release packaged as `codeai-hub-1.0.12.vsix` via `./scripts/build-release.sh 1.0.12`.

## [1.0.11] - 2025-10-19
### Changed
- Removed the dedicated background fill from the empty session container so the base `session-region` color shows through.

### Build
- Release packaged as `codeai-hub-1.0.11.vsix` via `./scripts/build-release.sh 1.0.11`.

## [1.0.10] - 2025-10-19
### Changed
- Matched the empty state card background with the primary session region color to eliminate the darker inset block.

### Build
- Release packaged as `codeai-hub-1.0.10.vsix` via `./scripts/build-release.sh 1.0.10`.

## [1.0.9] - 2025-10-19
### Added
- Migrated the Input Panel to a CSS-based component with orange focus state, auto-resize, and Shift+drop overlay borrowed from Claude Code Fusion.
- Introduced a reusable `modules/drag-drop-module` cluster (facade, handler, processor, message bridge) for webview drag-and-drop.
- Added `file-operations/file-operations-facade.ts` and the core `file-path-module` (cache, clipboard, platform handler) to service `grabFilePathFromDrop`.

### Changed
- Extended the home view message router to route new commands and rely on `FileOperationsFacade` instead of deprecated message providers.
- Restyled `session-view` input container classes to remove inline styles and align focus colors with the new design tokens.

### Build
- Release packaged as `codeai-hub-1.0.9.vsix` via `./scripts/build-release.sh 1.0.9`.

## [1.0.8] - 2025-10-19
### Changed
- Rebuilt the home action bar into a dedicated section with a unified `37,37,40` background and consistent padding.
- Refactored the session layout so `DialogPanel` consumes remaining vertical space while TODO, Input, and Status panels keep 8px spacing and fixed stacking.
- Simplified session tab labels to provider abbreviations with compact multi-line rendering.

### Build
- Release packaged as `codeai-hub-1.0.8.vsix` via `./scripts/build-release.sh 1.0.8`.

## [1.0.7] - 2025-10-19
### Changed
- Updated session tabs to 32px height with new active/inactive colours, hover states, and compact provider labels.
- Applied consistent panel styling across dialog, TODO, input, and status sections, aligning the close button hover behaviour.

### Build
- Release packaged as `codeai-hub-1.0.7.vsix`.

## [1.0.6] - 2025-10-18
### Added
- Session host hooks for provider picker state, session storage, settings visibility, and webview message handling.
- Modular settings experience built from `SettingsHeader`, `SettingsFooter`, and `useSettingsState`, plus reusable thinking controls.

### Changed
- Home view message router split into focused handler modules with explicit serialization helpers.
- Architecture check script now reports counts for files over 300 lines and in the 250–300 line warning zone.

### Build
- Release packaged as `codeai-hub-1.0.6.vsix` via `./scripts/build-release.sh 1.0.6`.

## [1.0.5] - 2025-10-18
### Added
- Complete migration of the settings modal, including thinking mode controls and message routing.

### Build
- Release packaged as `codeai-hub-1.0.5.vsix`.

## [1.0.4] - 2025-10-18
### Added
- Session interface shell from Claude Code Fusion with tabs, dialog renderer, status, TODO, and input components.

### Build
- Release packaged as `codeai-hub-1.0.4.vsix`.

## [1.0.2] - 2025-10-18
### Added
- Initial static webview shell with two rows of quick action buttons.
- Extension host scaffolding (`HomeViewProvider`, message router, HTML generator).
- Project README and changelog documentation.

### Changed
- Packaging flow now excludes local documentation and tooling through `.vscodeignore`.

### Build
- Release packaged exclusively via `./scripts/build-release.sh 1.0.2`.

## [1.0.0] - 2025-10-18
### Added
- Repository bootstrap with Ultracite configuration, quality scripts, and project documentation.

[1.0.40]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.40
[1.0.39]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.39
[1.0.24]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.24
[1.0.23]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.23
[1.0.22]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.22
[1.0.21]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.21
[1.0.20]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.20
[1.0.19]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.19
[1.0.18]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.18
[1.0.9]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.9
[1.0.10]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.10
[1.0.11]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.11
[1.0.12]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.12
[1.0.13]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.13
[1.0.8]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.8
[1.0.7]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.7
[1.0.6]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.6
[1.0.5]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.5
[1.0.4]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.4
[1.0.2]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.2
[1.0.0]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.0
