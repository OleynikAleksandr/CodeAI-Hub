# Scripts and Quality Gates

This folder contains local scripts and Lefthook automation used to enforce quality gates for CodeAI‑Hub. Scripts are versioned in Git, but excluded from the VSIX package via `.vscodeignore`.

## One‑time Setup

- Install dependencies: `npm install`
- Enable local git hooks: `npm run setup:hooks`

## What Runs Automatically

- Pre‑commit (via Lefthook):
  - `npx ultracite fix` — formats and applies safe Biome/Ultracite fixes, restaging files
  - `scripts/check-architecture.sh` — архитектурные лимиты (≤ 300 строк, фасады, дубликаты)
  - `npm run lint` — статический анализ через Ultracite (Biome check)
  - `npm run check:tsprune` — поиск неиспользуемых экспортов

- Pre‑push:
  - `npm run check:dup` — jscpd duplication check (порог 3%, падает при превышении)
  - `npm run check:links` — проверка ссылок в документации (`doc/**`, `README.md`)

- Release build: `./scripts/build-release.sh <version>`
  1) Architecture check → 2) `tsc --noEmit` smoke → 3) `npm run compile` →
  4) Markdown link check (advisory) → 5) Duplication check (advisory) → 6) VSIX packaging.

## Manual Commands (on demand)

- Architecture: `npm run check:architecture`
- Lint (Ultracite/Biome): `npm run lint`
- Форматирование: `npm run format:fix`
- Unused exports (ts‑prune): `npm run check:tsprune`
- Duplicates (jscpd): `npm run check:dup`
- Docs links: `npm run check:links`
- Release build: `./scripts/build-release.sh 0.0.X`

## Notes

- Lefthook конфигурация живёт в `lefthook.yml`; установка хуков — `npm run setup:hooks`.
- Provider CLIs/SDKs are global; provider SDKs must not reside under `node_modules/` in this repo.
- All scripts print results to the terminal so developers and the agent get immediate feedback.
