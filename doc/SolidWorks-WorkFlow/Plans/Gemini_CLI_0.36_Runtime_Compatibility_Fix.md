# Gemini CLI 0.36 Runtime Compatibility Fix

## Problem
- Release `1.1.876` can find a globally installed `@google/gemini-cli@0.36.x`, but the Gemini provider still becomes unavailable.
- The current runtime bridge assumes the legacy CLI layout:
  - `@google/gemini-cli/dist/src/config/*`
  - `@google/gemini-cli-core/dist/src/core/coreToolScheduler.js`
- Modern global installs ship a bundle-only CLI package and move the scheduler to `@google/gemini-cli-core/dist/src/scheduler/scheduler.js`.

## Accepted solution
- Keep package root resolution unchanged.
- Extend the Gemini runtime bridge with a compatibility layer:
  - try the legacy module paths first;
  - if the CLI package is bundle-only, create `loadCliConfig()` locally on top of the exported `Config` class from `@google/gemini-cli-core`;
  - read Gemini settings safely from `~/.gemini/settings.json` and `<workspace>/.gemini/settings.json` instead of importing bundle chunks with runtime side effects;
  - adapt the new scheduler API back to the legacy `CoreToolScheduler` contract expected by the existing session layer.
- Add a regression test for the bundle-only CLI layout.
- Update Gemini SSOT and release-facing docs before the next patch build.

## Scope
- `packages/Gemini_Module/src/runtime/cli-bridge-module-loader.ts`
- `packages/Gemini_Module/src/runtime/cli-bridge.test.ts`
- `doc/SolidWorks-WorkFlow/Modules/Gemini.md`
- release docs and packaging records

## Non-goals
- No provider UI redesign.
- No Gemini auth UX redesign.
- No dependency-pin change for the globally installed Gemini CLI.
