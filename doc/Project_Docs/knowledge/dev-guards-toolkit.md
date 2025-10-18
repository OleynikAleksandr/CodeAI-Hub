# Dev Guards Toolkit Roadmap

## Goals
- Build reusable "dev-guards" scripts/CLI that enforce architectural and quality gates across CodeAI projects.
- Standardize checks (architecture, duplication, lint, documentation, typing) as automated steps instead of manual discipline.
- Reduce manual review overhead by surfacing critical violations before commits/releases.

## Current Stack (CodeAI Hub 0.0.14)
- `check-architecture.sh` — ensures facade/micro-class limits (≤300 lines).
- `jscpd` — duplication threshold 3% (advisory for now).
- ESLint/Prettier — ordering, formatting, basic TS diagnostics.
- TypeScript strict mode — full extension layer; webview compiled via dedicated tsconfig.
- `markdown-link-check` — validates documentation links.
- `scripts/build-release.sh` — aggregates checks and produces `.vsix`.
- Git hooks — pre-commit/pre-push run duplication, lint, ts-prune.

## Toolkit Requirements (MVP)
1. **Package structure**
   - Repo or npm package (`@codeai/dev-guards`).
   - `scripts/` (bash/node), `config/` (eslint/prettier templates), `docs/`.
   - CLI entry `dev-guard` (Node/tsx) to run checks by name.
2. **Project integration**
   - `npm install -D @codeai/dev-guards`
   - `npx dev-guard setup` adds standard scripts (`guard:architecture`, `guard:lint`, etc.).
   - `npx dev-guard setup-hooks` wires git hooks to shared scripts.
3. **Baseline checks**
   - Architecture, duplication, lint/format, `tsc --noEmit`, markdown links.
   - Optional release pipeline `dev-guard release` (aggregates build + package).

## Roadmap Extensions
- `no-explicit-any` scanner (integrated with ESLint or tsquery).
- Optional `noUncheckedIndexedAccess` configuration.
- Test runners (vitest/jest/playwright) unified under `dev-guard test`.
- Security checks (npm audit, snyk, trufflehog).
- `RULES.md` explaining mandatory guard policies for CodeAI projects.
- CI templates (GitHub Actions snippets).

## Integration Process
1. Create `codeai-dev-guards` repository with CLI + scripts.
2. Port existing CodeAI-Hub scripts to the package, expose `npx dev-guard architecture` wrappers.
3. Update CodeAI-Hub to consume the package; ensure compatibility.
4. Document setup steps (`docs/dev-guards.md`) with mapping "guard → description → command".
5. Add module entry to Architecture/TODO plans for the toolkit initiative.

## Iterative Plan
- **Iteration 1**: package existing checks, publish, integrate into Hub.
- **Iteration 2**: add `any` auditing and reporting.
- **Iteration 3**: extend to infrastructure checks (CI, release tagging).
- **Iteration 4**: support multi-project (monorepo, webview + backend templates).

## Additional Ideas
- Markdown reports after guard runs for release notes.
- CI dashboard (badge for duplication/any count).
- "Pre-session" hook reminding developers to review architecture/TODO docs.
- VS Code helper extension to surface guard violations inline.

