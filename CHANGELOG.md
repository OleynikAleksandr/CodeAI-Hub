# Changelog

All notable changes to this project will be documented in this file.

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

[1.0.9]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.9
[1.0.8]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.8
[1.0.7]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.7
[1.0.6]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.6
[1.0.5]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.5
[1.0.4]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.4
[1.0.2]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.2
[1.0.0]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.0
