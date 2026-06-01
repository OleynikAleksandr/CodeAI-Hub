# Claude Thinking Default And Project Manager Startup Audit

**Status:** Archived accepted scope
**Date:** 2026-06-01
**Closed by release:** `1.2.431`
**Planning source:** user request in Codex session on 2026-06-01

## Accepted Outcome

Release `1.2.431` was accepted by user retest.

The scope changed three runtime contracts:

1. New or missing Claude thinking settings default to enabled with the existing default effort (`medium`). Explicit saved workspace values are preserved; this scope intentionally did not migrate old sessions or rewrite user choices.
2. Project Manager may open while provider warmup is still running. Core starts the remote bridge early, marks provider actions unavailable while individual providers are still warming up, and keeps provider runtime initialization as Core-owned state.
3. Project Manager first socket open no longer runs eager provider version checks. Manual and Settings-triggered provider updates remain supported, but first-screen startup should not block on version probes when provider auto-update is disabled by default.

The follow-up `1.2.431` fix also made provider warmup state refresh explicit: whenever Core provider warmup/status reporting changes provider availability, Remote Bridge broadcasts a fresh `core:state` snapshot so Project Manager replaces early `starting` rows with final provider state.

## Verification

- `node --import tsx --test packages/core/src/remote-bridge/remote-bridge-provider-state-broadcast.test.ts`
- `npm run build --workspace @codeai-hub/core`
- `npm run typecheck:webview`
- `npm run build:webview`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

## Release Artifacts

- VSIX: `codeai-hub-1.2.431.vsix`
- Provider/core/UI/launcher tarballs: `doc/tmp/releases/*1.2.431*.tar.bz2`

## Canonical Documentation Updated

- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
- `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
- `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
- `doc/SolidWorks-WorkFlow/Docs_Index.md`
