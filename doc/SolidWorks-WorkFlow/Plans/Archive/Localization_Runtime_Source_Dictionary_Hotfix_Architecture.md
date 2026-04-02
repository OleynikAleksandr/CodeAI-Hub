# Localization Runtime Source Dictionary Hotfix Architecture

**Status:** Approved for execution (2026-04-02)
**Created:** 2026-04-02
**Owner:** Oleksandr + Codex
**Scope:** Fix the `1.1.867`/`1.1.868` localization packaging regression chain across both extension activation and installed core runtime bootstrap.

---

## 1. Problem

Installed release `1.1.867` fails during extension activation, and the first hotfix release `1.1.868` still fails during runtime bootstrap.

Observed extension-host errors:

- `Error: Cannot find module '../../../assets/localization/source/en/interactive_templates.json'`
- `Error: Core did not become healthy via /api/v1/health. Check logs and try again.`

The failure happens while loading:

- `node_modules/@codeai-hub/localization/dist/source-dictionary-registry.js`
- `~/.codeai-hub/core/darwin-arm64/<version>/app/dist/index.js`

The package now exists in the VSIX, but the localization runtime chain breaks in two different installed topologies:

1. the extension VSIX package path;
2. the staged standalone core runtime bundle under `~/.codeai-hub/core/...`.

---

## 2. Root Cause

The regression has two layers.

### Layer A — VSIX extension topology

`@codeai-hub/localization` imports source dictionaries through compile-time JSON imports:

- `../../../assets/localization/source/en/*.json`

That relative path works from the workspace build output:

- `packages/localization/dist -> ../../../assets/... -> <repo>/assets/...`

But fails after VSIX installation:

- `extension/node_modules/@codeai-hub/localization/dist -> ../../../assets/... -> extension/node_modules/assets/...`

The installed package therefore dies before the extension can finish activation.

### Layer B — staged core runtime topology

The installed core runtime still stages only a subset of workspace `file:` dependencies into `app/tarballs/` before `npm install --omit=dev`.

Current staged tarballs include:

- `@codeai-hub/claude-module`
- `@codeai-hub/codex-module`
- `@codeai-hub/gemini-module`
- `@codeai-hub/initiatives`
- `@codeai-hub/unified-session`

But they originally did **not** include:

- the `@codeai-hub/localization` runtime chain required by the settings bridge;
- the staged `@codeai-hub/translation` tarball needed to satisfy localization's transitive `file:` dependency during staged install;
- the bundled source dictionaries under `app/assets/localization/source/en`.

As a result, the installed core bundle first crashed on `Cannot find module '@codeai-hub/localization'`, and after that fix still failed before `/api/v1/health` because the staged runtime had no bundled source dictionaries to hydrate the localization registry.

---

## 3. Target State

Release packaging must satisfy all of the following:

- `@codeai-hub/localization` resolves bundled source dictionaries in both topologies:
  - workspace build tree;
  - installed VSIX extension tree;
- the staged core runtime includes the localization runtime dependency chain in `app/node_modules`;
- the staged core runtime includes bundled source dictionaries in `app/assets/localization/source/en`;
- the package no longer depends on a single brittle compile-time relative JSON import path;
- `build-release.sh` smoke-tests:
  - the packaged localization source registry from an extracted VSIX tree;
  - the staged installed core runtime path that loads the localization-backed settings bridge.

---

## 4. Implementation Streams

### Stream A — Runtime source dictionary resolution

Files:

- `packages/localization/src/source-dictionary-registry.ts`

Actions:

- replace compile-time JSON imports with runtime loading from a small list of supported candidate roots;
- keep bundled dictionary semantics unchanged while making the package topology-agnostic.

### Stream B — Packaged runtime validation

Files:

- `scripts/build-core.sh`
- `scripts/build-release.sh`

Actions:

- include `@codeai-hub/localization` in the staged core runtime install/rewrite flow;
- satisfy localization's transitive `@codeai-hub/translation` dependency via staged tarball override during `npm install`;
- copy bundled source dictionaries into `app/assets/localization/source/en`;
- add a VSIX smoke test that extracts the archive and requires the packaged localization source registry from the installed extension layout;
- fail the release if either:
  - the packaged registry cannot load its bundled source dictionaries;
  - the installed staged core runtime cannot load the localization-powered settings handler.

### Stream C — Release docs and rebuild

Files:

- `README.md`
- `CHANGELOG.md`
- `doc/TODO/todo-plan.md`
- `doc/Sessions/Session024.md`

Actions:

- record the new startup regression and hotfix release;
- rebuild `build-all.sh` + `build-release.sh --use-current-version`;
- validate packaged contents and installed activation.

---

## 5. Verification

Required:

- `npm run build --workspace @codeai-hub/localization`
- `npm run compile`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

Additional release-specific assertions:

- packaged VSIX smoke test can `require("./extension/node_modules/@codeai-hub/localization/dist/source-dictionary-registry.js")` from an extracted archive;
- installed core runtime smoke test can `require("./app/dist/remote-bridge/handlers/settings-request-handler.js")` from the staged core bundle;
- no activation-time `Cannot find module '../../../assets/localization/source/en/interactive_templates.json'` or `Core did not become healthy via /api/v1/health` from missing `@codeai-hub/localization` after install.
