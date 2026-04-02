# Localization Runtime Packaging Hotfix Architecture

**Status:** Approved for execution (2026-04-02)
**Created:** 2026-04-02
**Owner:** Oleksandr + Codex
**Scope:** Fix the `1.1.866` startup regression where the VSIX activates before `CodeAI Hub` can load because the packaged extension runtime does not contain `@codeai-hub/localization`.

---

## 1. Problem

Installed release `1.1.866` fails during extension activation.

Observed extension-host error:

- `Error: Cannot find module '@codeai-hub/localization'`

The failure happens while loading:

- `out/extension-module/settings/localization-runtime-service.js`

This is a release-packaging regression, not a browser/core logic failure.

---

## 2. Root Cause

The runtime dependency chain for the extension changed in `1.1.866`, but the release packaging contract was not updated accordingly.

Current broken path:

1. Root extension runtime now requires `@codeai-hub/localization`.
2. Root `package.json` does not declare `@codeai-hub/localization` as a production dependency.
3. `build-release.sh` runs `npm prune --omit=dev` before `vsce package`.
4. `.vscodeignore` still excludes all `node_modules/@codeai-hub/**` except a narrow allowlist that does not include:
   - `@codeai-hub/localization`
   - `@codeai-hub/translation`
5. The resulting VSIX activates with a missing module and dies before any CodeAI output channel is created.

---

## 3. Target State

Release packaging must satisfy all of the following:

- root extension runtime includes `@codeai-hub/localization` as a production dependency;
- transitive runtime dependency `@codeai-hub/translation` also survives packaging;
- `.vscodeignore` explicitly allows both packages into the VSIX;
- `build-all.sh` keeps `packages/localization/package.json` on the same unified release version as the rest of the shipped workspace packages;
- `build-release.sh` fails fast if the generated VSIX is missing required runtime workspace packages.

---

## 4. Implementation Streams

### Stream A — Runtime dependency ownership

Files:

- `package.json`
- `scripts/build-all.sh`

Actions:

- add `@codeai-hub/localization` as a root production dependency;
- include `packages/localization/package.json` in the unified version bump flow inside `build-all.sh`.

### Stream B — VSIX packaging allowlist

Files:

- `.vscodeignore`
- `scripts/build-release.sh`

Actions:

- allow `node_modules/@codeai-hub/localization/**`;
- allow `node_modules/@codeai-hub/translation/**`;
- add a post-package VSIX content assertion that fails if localization runtime packages are absent.

### Stream C — Release docs and rebuild

Files:

- `README.md`
- `CHANGELOG.md`
- `doc/TODO/todo-plan.md`
- `doc/Sessions/Session023.md`

Actions:

- record the hotfix release;
- rebuild `build-all.sh` + `build-release.sh --use-current-version`;
- validate packaged contents and startup path.

---

## 5. Verification

Required:

- `npm run build --workspace @codeai-hub/localization`
- `npm run build --workspace @codeai-hub/core`
- `npm run build:webview`
- `npm run typecheck:webview`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

Additional release-specific assertions:

- `unzip -l codeai-hub-<version>.vsix | rg "@codeai-hub/localization|@codeai-hub/translation"`
- no activation-time `Cannot find module '@codeai-hub/localization'` in the fresh extension-host logs after install.
