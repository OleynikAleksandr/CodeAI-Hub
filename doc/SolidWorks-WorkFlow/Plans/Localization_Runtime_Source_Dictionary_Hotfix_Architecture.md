# Localization Runtime Source Dictionary Hotfix Architecture

**Status:** Approved for execution (2026-04-02)
**Created:** 2026-04-02
**Owner:** Oleksandr + Codex
**Scope:** Fix the `1.1.867` startup regression where the packaged `@codeai-hub/localization` module resolves bundled source dictionaries correctly in the workspace tree but fails after VSIX installation.

---

## 1. Problem

Installed release `1.1.867` still fails during extension activation.

Observed extension-host error:

- `Error: Cannot find module '../../../assets/localization/source/en/interactive_templates.json'`

The failure happens while loading:

- `node_modules/@codeai-hub/localization/dist/source-dictionary-registry.js`

The package now exists in the VSIX, but its bundled source-dictionary imports assume the workspace package topology instead of the installed extension topology.

---

## 2. Root Cause

`@codeai-hub/localization` imports source dictionaries through compile-time JSON imports:

- `../../../assets/localization/source/en/*.json`

That relative path works from the workspace build output:

- `packages/localization/dist -> ../../../assets/... -> <repo>/assets/...`

But fails after VSIX installation:

- `extension/node_modules/@codeai-hub/localization/dist -> ../../../assets/... -> extension/node_modules/assets/...`

The installed package therefore dies before the extension can finish activation.

---

## 3. Target State

Release packaging must satisfy all of the following:

- `@codeai-hub/localization` resolves bundled source dictionaries in both topologies:
  - workspace build tree;
  - installed VSIX extension tree;
- the package no longer depends on a single brittle compile-time relative JSON import path;
- `build-release.sh` smoke-tests the packaged localization source registry from an extracted VSIX tree so this regression is caught before shipping.

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

- `scripts/build-release.sh`

Actions:

- add a VSIX smoke test that extracts the archive and requires the packaged localization source registry from the installed extension layout;
- fail the release if the packaged registry cannot load its bundled source dictionaries.

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
- no activation-time `Cannot find module '../../../assets/localization/source/en/interactive_templates.json'` in fresh extension-host logs after install.
