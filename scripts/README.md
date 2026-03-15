# Scripts and Quality Gates

This folder contains local scripts and Lefthook automation used to enforce quality gates for CodeAI‑Hub. Scripts are versioned in Git, but excluded from the VSIX package via `.vscodeignore`.

## One‑time Setup

- Install dependencies: `npm install`
- Enable local git hooks: `npm run setup:hooks`

## What Runs Automatically

- Pre‑commit (via Lefthook):
  - `npx ultracite fix` — formats and applies safe Biome/Ultracite fixes, restaging files
  - `scripts/check-architecture.sh` — architecture limits (≤ 300 lines, facades, duplicates)
  - `npm run lint` — static analysis via Ultracite (Biome check)
  - `npm run check:tsprune` — unused export detection

- Pre‑push:
  - `npm run check:dup` — jscpd duplication check (3% threshold, fails if exceeded)
  - `npm run check:links` — documentation link validation (`doc/**`, `README.md`)

- Release build: `./scripts/build-release.sh <version>`
  1) Architecture check → 2) `tsc --noEmit` smoke → 3) `npm run compile` →
  4) Markdown link check (advisory) → 5) Duplication check (advisory) → 6) VSIX packaging.

## Manual Commands (on demand)

- Architecture: `npm run check:architecture`
- Lint (Ultracite/Biome): `npm run lint`
- Formatting: `npm run format:fix`
- Unused exports (ts‑prune): `npm run check:tsprune`
- Duplicates (jscpd): `npm run check:dup`
- Docs links: `npm run check:links`
- Release build: `./scripts/build-release.sh 0.0.X`

## Notes

- Lefthook configuration lives in `lefthook.yml`; install hooks with `npm run setup:hooks`.
- Provider CLIs/SDKs are global; provider SDKs must not reside under `node_modules/` in this repo.
- All scripts print results to the terminal so developers and the agent get immediate feedback.
