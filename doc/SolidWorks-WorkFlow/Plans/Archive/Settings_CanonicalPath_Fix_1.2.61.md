# Canonical Settings Path Fix (1.2.61)

**Status:** completed (implemented and released in `1.2.61`)
**Date:** 2026-04-23

## Problem

Canonical SSOT already says that the unified product settings snapshot lives at `~/.codeai-hub/settings/settings.json`.

In practice, the runtime still contains a legacy fallback seam:

1. Extension-side settings storage reads and writes `settings.json`.
2. Launcher / supervisor started Core may boot without `CLAUDE_SETTINGS_PATH`.
3. In that case `packages/core/src/config/index.ts` currently resolves `claudeSettingsPath` to:
   - `settings.json`, if it already exists;
   - otherwise legacy `claude.json`.
4. Core-owned settings persistence then writes back to `config.claudeSettingsPath`, so the full unified snapshot can be re-created under `~/.codeai-hub/settings/claude.json`.

This creates split truth:

- some read paths already hardcode `settings.json`;
- launcher/Core bootstrap can still read and write `claude.json`;
- an affected installation may end up with only `claude.json`, even though docs and other code paths expect `settings.json`.

Observed evidence on the affected machine before this scope:

- `~/.codeai-hub/settings/` contained only `claude.json`;
- `core.log` at `2026-04-23T15:57:12Z` showed repeated ENOENT reads against `/Users/oleksandroliinyk/.codeai-hub/settings/claude.json`;
- the resulting file stored the full unified snapshot (`general` + `providers.*`), not merely legacy Claude-only thinking settings.

User decision for this scope: `claude.json` was manually removed and should be treated as dead history, not as an input we keep supporting.

## Decision

We lock one canonical invariant for runtime settings:

1. Core canonical read/write target is always `~/.codeai-hub/settings/settings.json` unless an explicit env override says otherwise.
2. `claude.json` is removed from all normal runtime read/write paths.
3. If `settings.json` is absent, Core creates a fresh canonical file there on startup/load; no new `claude.json` should appear.
4. Extension-side settings storage also stops consulting `claude.json`; the only persisted settings snapshot is `settings.json`.

## Scope

### Code
1. `packages/core/src/config/index.ts`
2. `packages/core/src/remote-bridge/handlers/settings-persistence-service.ts`
3. `src/extension-module/settings/settings-storage.ts`

### Docs / Release
4. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
5. `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
6. `README.md`
7. `CHANGELOG.md`

## Non-Goals

- changing provider-home auth files such as `.claude.json`;
- redesigning settings schema;
- changing launcher/supervisor bootstrap beyond what is required to preserve the canonical settings-path invariant.

## Implementation Notes

- Keep the fix additive and narrow: remove the legacy fallback seam from live runtime-path resolution.
- Do not require launcher/supervisor to inject `CLAUDE_SETTINGS_PATH` just to hit the canonical file; no-env startup must already converge on `settings.json`.
- Preserve existing explicit env override semantics for tests and controlled runtime overrides.

## Success Criteria

1. After deleting `~/.codeai-hub/settings/claude.json`, starting Core from launcher or supervisor without an existing settings file creates `~/.codeai-hub/settings/settings.json`.
2. No regular Core or extension persistence/read path consults or writes `~/.codeai-hub/settings/claude.json`.
3. SSOT docs explicitly state that `settings.json` is the canonical runtime settings file and that `claude.json` is no longer part of the supported runtime contract.
