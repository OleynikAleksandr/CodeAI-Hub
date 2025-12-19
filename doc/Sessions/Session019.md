# Session 19 — Runtime Installation Fixes & Release v1.1.325

**Date:** 2025-12-19 11:59 - 13:05 (CET)
**Branch:** main
**Version:** 1.1.325 (final)

---

# 1. Work Done in This Session

## Work summary

### Part 1: Quality Gate Manager Architecture (v1.1.321)
- **Architecture Review**: Analyzed and approved the "Daemon Quality Agent" architecture
- **Key Decisions**:
    - **In-Place Sandbox**: Agent works with real files in `src/` to maintain full project context
    - **Isolation**: Agent instructions isolated in `.codeai/quality-agent/QUALITY_PROTOCOL.md`
    - **Agentic Loop**: CLI agents (Codex/Claude) autonomously run "Check → Fix → Verify → Commit" loop
- **Verification**: Empirical tests with `codex exec` and `claude -p` successfully fixed test files
- **Documentation**: Created consolidated architecture docs and watcher design in Russian

### Part 2: Runtime Installation Critical Fixes (v1.1.322 - v1.1.325)

**Problem Discovered**: Extension failed to load with multiple runtime installation errors

#### Issue #1: file:// URL Protocol Not Supported
- **Symptom**: "Downloaded CEF archive failed checksum validation"
- **Root Cause**: `downloadFile` function didn't support `file://` URLs for local Core/Launcher installation
- **Solution**: Added `FILE_PROTOCOL_REGEX` and file:// handling in `runtime-files.ts:266-280`
- **Impact**: Core and Launcher can now install from local `~/.codeai-hub/releases/` during development

#### Issue #2: Core Archive Nested Directory Structure
- **Symptom**: "Core did not become healthy via /api/v1/health"
- **Root Cause**: Core extracted to nested path `1.1.323/1.1.323/` instead of `1.1.323/`
- **Solution**: Implemented temp-extract-rename pattern in `core-installer.ts:115-131` (same as Launcher)
- **Impact**: Core files now correctly placed at expected paths

#### Issue #3: Core install.json Format Mismatch
- **Symptom**: Extension always reinstalled Core on startup (slow launch)
- **Root Cause**: `build-core.sh` created `install.json` with "version" field, but code expected "coreVersion"
- **Solution**: Fixed `build-core.sh:201-208` to use correct field names matching `InstallMarker` type
- **Impact**: Core installed by build-all.sh is now recognized, eliminating reinstallation delay

## Git commits
- `62b4cb8` docs: update Session019 with release v1.1.321 info
- `bc7e3e2` fix: add file:// URL support for local launcher downloads
- `a7640d1` chore: bump version to 1.1.322
- `384fd25` chore: bump version to 1.1.323
- `f731179` fix: correct Core archive extraction to handle nested directory
- `95a1897` chore: bump version to 1.1.324
- `00c078c` fix: correct install.json format in build-core.sh
- `0e953ef` chore: bump version to 1.1.325

## Release Artifacts (v1.1.325 - Final Working Release)
- **VSIX**: `codeai-hub-1.1.325.vsix` (396KB)
- **Provider Modules**:
  - `claude-module-1.1.325.tar.bz2` (18KB)
  - `codex-module-1.1.325.tar.bz2` (18KB)
  - `gemini-module-1.1.325.tar.bz2` (15KB)
- **Core**: `codeai-hub-core-darwin-arm64-1.1.325.tar.bz2` (35MB)
- **CEF Launcher**: `CodeAIHubLauncher-macos-arm64-1.1.325.tar.bz2` (230MB)
- **UI Bundles**:
  - `vscode-webview-1.1.325.tar.bz2` (134KB)
  - `web-client-1.1.325.tar.bz2` (141KB)
  - `project-manager-1.1.325.tar.bz2` (49KB)

## Technical Details

### File Changes
1. **src/extension-module/cef/runtime-files.ts** (298 lines)
   - Added `FILE_PROTOCOL_REGEX` constant
   - Implemented file:// URL detection and local file copy
   - Maintains 100% backward compatibility with https:// URLs

2. **src/extension-module/core/core-installer.ts** (145 lines)
   - Added `fs` import for temp directory operations
   - Implemented temp-extract-rename pattern for proper archive handling
   - Matches Launcher installation pattern for consistency

3. **scripts/build-core.sh** (line 201-208)
   - Changed `"version"` → `"coreVersion"` in install.json
   - Added `"package"` field with archive filename
   - Moved install.json creation after ARCHIVE_NAME definition

### Quality Gates (All Passed)
- ✅ Architecture check: 0 files > 300 lines
- ✅ Ultracite: No issues
- ✅ ts-prune: Only expected unused exports
- ✅ jscpd: 1.1% duplication (threshold: 3%)
- ✅ Link check: No broken links
- ✅ Build: All packages compile successfully

### Installation Flow (After Fixes)
```
build-all.sh execution:
1. Builds providers → ~/.codeai-hub/providers/*/1.1.325/
2. Builds Core → ~/.codeai-hub/core/darwin-arm64/1.1.325/ ✅ NEW: Installed here
3. Builds Launcher → ~/.codeai-hub/cef-launcher/darwin-arm64/ ✅ Already installed
4. Creates tarballs → ~/.codeai-hub/releases/*.tar.bz2
5. Updates manifests with file:// baseUrl

First extension launch:
1. Checks Core: verifyExistingCoreInstall() → FOUND ✅ (was: reinstall)
2. Checks Launcher: tryReuseExistingLauncher() → FOUND ✅
3. Downloads CEF from https:// (first time only)
4. Quick startup ✅ (was: slow)
```

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Architecture/Architecture.md`
2. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
3. `doc/TODO/todo-plan.md`
4. `doc/Sessions/Session019.md` (THIS REPORT)

## Plans for next session
- **Quality Gate Manager**: Continue with Watcher implementation
- **Testing**: Verify fast startup on clean installation
- **Documentation**: Consider adding runtime installation architecture diagram
