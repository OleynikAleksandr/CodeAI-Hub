# Scripts and Quality Gates

This folder contains local scripts and Husky automation used to enforce quality gates for CodeAI‑Hub. Husky is the only active hook engine. Scripts are versioned in Git, but excluded from the VSIX package via `.vscodeignore`.

## One‑time Setup

- Install dependencies: `npm install`
- Enable local git hooks: `npm run setup:hooks`

## What Runs Automatically

- Pre‑commit (via Husky):
  - `scripts/check-architecture.sh` — architecture limits across `src/` plus every `packages/**/src/` root, excluding generated outputs (`dist/`, `build/`, `node_modules/`)
  - `scripts/check-architecture-rules/max-lines-debt-allowlist.txt` — explicit temporary registry of pre-existing oversized source files; this is tracked debt, not a hidden exclusion
  - `npm run lint` — static analysis via Ultracite (`npx ultracite check`)
  - `npm run check:tsprune` — unused export detection
  - `npm run format:fix` — formats and applies safe Biome/Ultracite fixes, restaging files

- Pre‑push:
  - `npm run check:dup` — jscpd duplication check (3% threshold, fails if exceeded)
  - `npm run check:links` — documentation link validation (`doc/**`, `README.md`)

- GitHub Actions CI (public baseline on `push` to `main` + `pull_request`):
  - `npm run check:architecture`
  - `npm run lint`
  - `npm run check:tsprune`
  - `npm run compile`

- Canonical release flow:
  1) `./scripts/build-all.sh` — bumps versions, rebuilds provider/core/launcher/UI artefacts, refreshes manifests and publishes tarballs into `~/.codeai-hub/releases/` plus `doc/tmp/releases/`
  2) Commit the resulting version/manifest changes on a clean tree
  3) `./scripts/build-release.sh --use-current-version` — revalidates the committed release from a clean tree, then runs architecture check, `tsc --noEmit`, `npm run compile`, advisory `check:links` / `check:dup`, prunes dev dependencies, and packages the VSIX

## Manual Commands (on demand)

- Architecture: `npm run check:architecture`
- Lint (Ultracite/Biome): `npm run lint`
- Formatting: `npm run format:fix`
- Unused exports (ts‑prune): `npm run check:tsprune`
- Duplicates (jscpd): `npm run check:dup`
- Docs links: `npm run check:links`
- Release build (final packaging on a clean tree): `./scripts/build-release.sh --use-current-version`

## Notes

- Husky hooks live in `.husky/`; install or refresh them with `npm run setup:hooks` (or `npm install`, which runs `prepare`).
- `build-release.sh` expects a clean working tree unless `--allow-dirty` is passed explicitly for diagnostics; the normal release path should not rely on `--allow-dirty`.
- Provider CLIs/SDKs are global; provider SDKs must not reside under `node_modules/` in this repo.
- All scripts print results to the terminal so developers and the agent get immediate feedback.
