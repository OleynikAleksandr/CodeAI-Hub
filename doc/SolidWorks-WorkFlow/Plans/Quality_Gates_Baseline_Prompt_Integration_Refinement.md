# Quality Gates Baseline Prompt Integration Refinement

**Status:** Accepted for execution planning.  
**Created:** 2026-05-07  
**Owner:** Oleksandr + Codex  
**Scope:** compact the `Quality Gates Baseline` first prompt and contract so the agent drafts a precise gate baseline, then after explicit acceptance integrates the selected gates into the materialized project filesystem.

## 1. Trigger

Live prompt testing of `Quality Gates Baseline` showed that the agent now respects the draft-only boundary before acceptance, but the step front still lets the artifact drift into a non-executable proposal.

Observed defects:

- user-selected tooling such as Ultracite was discussed in chat but not reliably written into `quality-gates.md` / `quality-gates.json`;
- `active` gates were mixed with not-yet-integrated commands;
- the draft did not include a concrete post-acceptance integration plan;
- Knip and source-size gates were added inconsistently;
- user-confirmed hard rules, especially class/file size <= 500 lines, still appeared as open decisions;
- machine consistency checks missed invalid states such as advisory gates with blocking phases.

## 2. Goal

Make the first prompt smaller and stricter:

- one compact role and boundary section;
- one draft phase;
- one post-acceptance integration phase;
- one machine contract section;
- one final consistency checklist.

The agent must produce artifacts that explain both:

1. what gate baseline is proposed;
2. exactly what files/scripts/configs/hooks will be created during integration after acceptance.

## 3. Required Behavior

### Draft Phase

Before explicit acceptance, the agent only writes:

- `.codeai-hub/<workspaceSlug>/quality_gates/quality-gates.md`;
- `.codeai-hub/<workspaceSlug>/quality_gates/quality-gates.json`.

It must not create package scripts, configs, hooks, CI files, or production code.

The draft must distinguish:

- desired gate status;
- current availability;
- integration requirement;
- planned integration paths;
- blocking phases after integration.

### Integration Phase

After explicit user acceptance in the same session, the agent must integrate accepted gates into the materialized skeleton:

- root and workspace `package.json` scripts/devDependencies where needed;
- Ultracite or direct lint/format configs selected by the accepted contract;
- Knip config;
- architecture/layout/size gate scripts;
- Git hooks for `pre-commit`, `post-commit`, and `pre-push`;
- optional dependency update config if selected.

Then it must run the lightest feasible smoke checks and update `quality-gates.json` with:

- `accepted: true`;
- `integrated: true`;
- `integrationState: "integrated"`;
- `integratedPaths`;
- verification results.

## 4. Tooling Baseline Rules

- Explicit user tooling preferences override earlier agent preferences and must be reflected in both artifacts.
- Ultracite is allowed as the primary lint/format preset when selected; its CLI surface is `ultracite check`, `ultracite fix`, and `ultracite doctor`.
- Knip is a first-class unused files/dependencies/exports gate for JavaScript/TypeScript projects, but it does not replace dependency-boundary or circular-dependency checks.
- The size policy is mandatory for this project: source files/classes must stay <= 500 lines, with near-limit reporting around 400-500 lines.
- `pre-commit` and `pre-push` size checks are blocking; `post-commit` is report-only.
- Auto-update policy must be explicit: dependency automation may propose updates, but lockfile reproducibility remains required.

## 5. JSON Contract Direction

`quality-gates.json` should keep the current schema id but tighten fields around each gate:

```json
{
  "id": "format-check",
  "proposedCommand": "npm run format:check",
  "desiredStatus": "active",
  "availability": "not_integrated",
  "integrationRequired": true,
  "baseline": ["recommended"],
  "blockingIn": ["beforeCommit"],
  "plannedIntegrationPaths": ["package.json", "ultracite.config.*"]
}
```

Required consistency rules:

- active-required gates must exist in `commands`;
- advisory gates must not have blocking phases;
- planned/deferred gates must not appear in active required arrays;
- not-integrated active gates must have planned integration paths;
- selected user tooling must appear in `toolingStrategies`, `commands`, and integration plan;
- accepted/integrated state must not be true until the corresponding phase actually happened.

## 6. Implementation Slices

1. Compact bundled prompt and contract.
2. Remove duplicate or conflicting runtime phase guidance if it repeats bundled instructions.
3. Add tests that assert the rendered first prompt contains the two-phase boundary, Ultracite/Knip/size policy hooks, and no duplicate phase narratives.
4. Sync SSOT docs after behavior lands.
5. Build release, hand VSIX to user, receive live retest feedback, and iterate if needed.

## 7. Implemented Decisions

- The bundled `quality-gates-prompt.md` and `quality-gates-contract.md` are the canonical source for the two-phase draft/integration boundary.
- Runtime prompt pack must not add another `Work phases` block for `quality_gates`; it may only supply target paths and current workflow context.
- `quality-gates.json` separates desired status from execution readiness through `desiredStatus`, `availability`, `integrationRequired`, `plannedIntegrationPaths`, `accepted`, `integrated`, `integrationState`, `integratedPaths`, and `verification`.
- Validation rejects contradictory states: advisory gates with blocking phases, planned/deferred gates in required arrays, and not-integrated required gates without planned integration paths.

## 8. Definition Of Done

- The first prompt is shorter and has no repeated phase rules across bundled prompt, contract, and runtime prompt pack.
- Draft artifacts from a live run include a concrete integration plan.
- Explicit user tooling choices are persisted into artifacts.
- Source-size and Knip gates are represented consistently.
- JSON consistency checks are stricter in prompt and tests.
- Release is built and passed to user for `Quality Gates Baseline` retest.
- Scope closes only after explicit user acceptance.
