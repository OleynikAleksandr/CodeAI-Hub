# Benchmark Reference Bundles Closeout

**Plan ID:** `benchmark-reference-bundles-folder-2026-06-24`  
**Closed:** 2026-06-24  
**Acceptance:** user asked to move the full `Instruction_Stack_Control_Experiment_Results` folder and the full `ProviderPromptsAndTools` folder into `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/`.

## Result

- `Instruction_Stack_Control_Experiment_Results/` moved from `Plans/Archive/` into `Plans/Backlog/Benchmarks/`.
- `ProviderPromptsAndTools/` moved from `doc/SolidWorks-WorkFlow/` into `Plans/Backlog/Benchmarks/`.
- `Docs_Index.md`, Backlog README, live module docs and archived TODO references now point to the new paths.
- Raw benchmark scripts/logs remain in `doc/tmp/prototypes/`.

## Current Benchmark Reference Bundles

- `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Instruction_Stack_Control_Experiment_Results/`
- `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/ProviderPromptsAndTools/`

## Commits

- `75ccf49dc` `docs: move benchmark reference bundles`
- Final closeout commit: `docs: close benchmark reference bundle grouping`

## Verification

- `npm run plan:validate` passed.
- Targeted path search found no stale live references to the old `Plans/Archive/Instruction_Stack_Control_Experiment_Results` or `doc/SolidWorks-WorkFlow/ProviderPromptsAndTools` locations.
