# Application Skeleton Project Foundation Planning

**Status:** Draft planning intake
**Owner:** Oleksandr / Codex
**Created:** 2026-05-16
**Scope:** future modification of the `Application Skeleton` managed agent and Core validation so the step materializes an installable project foundation, not only a Product Part filesystem skeleton.

## 1. Problem Statement

The current `Application Skeleton` behavior can produce a structurally useful filesystem tree while still leaving the repository without a real implementation environment. In the observed test workspace, the step produced Product Part / Cluster / Module directories and placeholder `README.md` files, but the resulting repository did not contain a usable TypeScript/Electron/VS Code Extension development foundation:

- root `package.json` existed, but dependencies and devDependencies were absent;
- workspace package manifests were empty placeholders;
- `node_modules` was absent, which is normal for Git, but the lockfile also had no meaningful external dependency graph to restore;
- no root `tsconfig.json`, bundler config, test config, lint/format config, or minimal compile targets existed;
- later Quality Gates checks could only validate empty structure and text hygiene, not a real project.

This exposed a lifecycle gap. `Application Skeleton` currently materializes "where files will live", but the next steps need "a project that can be installed, opened in an IDE, typechecked, built, and used as the stable target for module specifications and implementation work".

## 2. Responsibility Boundary

`Application Skeleton` must not own the selection or integration of quality gate products. It should not special-case Ultracite, Biome, ESLint, Playwright, Vitest, dependency scanners, secret scanners, or any future tool selected by `Quality Gates Baseline`.

Its responsibility is earlier and more fundamental:

- determine the implementation stack from the previous artifacts and user decisions;
- ask the user for any missing architectural choices before materialization;
- materialize a full installable project foundation for the accepted stack;
- create enough minimal source/config/package surface that later quality gates can run against real targets instead of empty folders;
- keep Product Part / Cluster / Module path mapping synchronized with the generated project foundation.

`Quality Gates Baseline` remains responsible for choosing and integrating modern gate tooling. `Application Skeleton` only ensures there is a coherent project envelope into which such tooling can be integrated.

## 3. Required First-Prompt Outcome

The Core-owned first prompt for `Application Skeleton` must state the desired outcome briefly and explicitly. Suggested wording:

> Produce an accepted application skeleton that materializes a complete installable project foundation for the selected stack, not only a folder map. Before materialization, resolve every open stack, package, runtime, build, test, and source-layout ambiguity with the user. After materialization, the repository must have deterministic install metadata, minimal package entrypoints/facades, typecheck/build/smoke scripts where applicable, and a filesystem tree aligned with Product Part / Cluster / Module ownership.

The first prompt must include the previous artifacts inline as authoritative text, as the current managed workflow contract already requires. Paths may be included only as provenance and output targets.

## 4. Required Inputs From Previous Artifacts

The agent should receive and reason over:

- `Final_Description.md`;
- `virtual-simulation.md`;
- `product-parts.index.md`;
- every accepted `diagram_modules/product-parts/<part-id>.md`;
- current workspace/repo constraints from Core;
- any existing user settings relevant to package manager or language preferences.

The agent must infer what it can from these inputs, but it must not treat unclear choices as settled.

## 5. User Question Gate

The agent has no permission to proceed to materialization while any meaningful ambiguity remains. It must ask the user questions until the materialization path is single and unambiguous.

Examples of blocking questions:

- UI stack: React, vanilla web components, another framework, or no browser UI for this part?
- Electron shell: Vite, Electron Forge, electron-builder, custom build scripts, or deferred packaging?
- VS Code extension: TypeScript extension scaffold only, webview scaffold, command-only scaffold, or both?
- module format: ESM, CJS, or mixed boundary?
- test baseline: Vitest, Node test runner, Playwright, or another framework?
- package manager: npm, pnpm, yarn, or another choice?
- workspace shape: one package per Product Part, shared packages, apps/packages split, or Product Part mirrored tree only?
- runtime boundaries: one Core process package, separate provider packages, shared contract package, or another split?
- minimum source entrypoints: which packages must compile immediately?

The prompt must instruct the agent to keep asking until there are no open choices that would materially alter generated files, package manifests, build scripts, or source layout.

## 6. Materialization Requirements

After acceptance, `Application Skeleton` materialization should create a reproducible project foundation. The exact files depend on the accepted stack, but the required classes of output are:

- root package manager metadata: `package.json`, lockfile, workspace declarations, Node/package-manager version policy where applicable;
- package manifests for materialized Product Parts or implementation packages;
- pinned direct dependencies and devDependencies required by the accepted stack;
- deterministic install path: a clean install command must restore the environment from tracked metadata;
- TypeScript config where TypeScript is selected;
- minimal source entrypoints/facades for packages that are part of the first implementation wave;
- build/typecheck/smoke scripts that execute against actual source/config targets;
- README or contract placeholders only where they are intentionally documentation surfaces, not substitutes for source/config;
- generated filesystem paths synchronized with `application-skeleton-map.json`;
- explicit record of accepted stack decisions and any deferred environment decisions.

`node_modules` should not be committed, but the repo must include enough tracked metadata for `npm ci` or the selected package-manager equivalent to recreate it.

## 7. What Must Not Happen

The agent must not:

- stop at a directory tree and call it a materialized application skeleton;
- create `package.json` files with no meaningful dependencies/scripts when the selected stack requires them;
- mark build/typecheck readiness as complete when there is no compiler target;
- defer core implementation-environment choices to Quality Gates if those choices are prerequisites for package layout or source generation;
- silently choose a major framework/build/test strategy when the previous artifacts do not make the choice clear;
- begin materialization while relevant user questions remain open.

## 8. Core Parser And Validator Requirements

Core must add canonical parsers/validators for the upgraded `Application Skeleton` artifact contract. The parser must fail the step when the agent output is incomplete.

Required validation dimensions:

- artifact schema validity for `application-skeleton-map.json`;
- accepted stack completeness: languages, runtimes, package manager, framework/tooling choices that affect materialization;
- unresolved-question list is empty before materialization;
- every materialized Product Part / Cluster / Module code path exists;
- package/workspace metadata exists for the selected repo shape;
- lockfile or equivalent deterministic install artifact exists when dependencies are declared;
- TypeScript config exists when TypeScript is selected;
- build/typecheck/smoke script declarations exist where the selected stack requires them;
- minimal source/facade entrypoints exist for implementation packages selected for the first wave;
- deferred decisions are explicitly non-blocking and do not prevent install/typecheck/build of the materialized foundation.

Core must not unlock `Quality Gates Baseline` just because `application-skeleton-map.json` says `materialized: true`. It must unlock only after the canonical parser confirms that the project foundation is materially complete for the selected stack.

## 9. Expected Managed Lifecycle Change

The future managed lifecycle should split `Application Skeleton` into at least these phases:

1. Draft stack and project foundation proposal.
2. User review and question resolution.
3. Accepted materialization of filesystem plus installable project foundation.
4. Core validation of materialized foundation through canonical parser.
5. Commit boundary only after validation passes.
6. Unlock `Quality Gates Baseline`.

This keeps `Application Skeleton` focused on project foundation while giving `Quality Gates Baseline` a real repository to analyze and harden.

## 10. Acceptance Criteria For This Planning Direction

The direction is accepted when we agree that:

- `Application Skeleton` is responsible for a working project foundation, not only folders;
- it does not choose quality gate products;
- it must ask the user until stack/materialization choices are unambiguous;
- Core must validate foundation completeness before unlocking Quality Gates;
- future implementation work can use this document as the basis for a concrete active `todo-plan.md`.
