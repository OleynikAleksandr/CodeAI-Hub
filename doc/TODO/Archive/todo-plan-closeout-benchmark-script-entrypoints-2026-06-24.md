# Benchmark Script Entrypoints Closeout

**Plan ID:** `benchmark-script-entrypoints-2026-06-24`  
**Closed:** 2026-06-24  
**Acceptance:** user requested visible benchmark script links and exact linked prompt source naming.

## Result

Each benchmark document now has a top-level `Benchmark Script` section with the primary runner link and a typical command:

- `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Intent_Normalizer_Module_Planning_RU.md` -> `doc/tmp/prototypes/openrouter-normalizer-model-ranker.mjs`
- `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Coding_Model_Benchmark_RU.md` -> `doc/tmp/prototypes/openrouter-code-model-ranker.mjs`
- `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Documentation_Planning_Model_Benchmark_RU.md` -> `doc/tmp/prototypes/openrouter-docs-planning-model-ranker.mjs`

Coding and documentation/planning benchmark docs also link their native provider comparison runners.

The coding benchmark no longer calls the calibrated GLM/Kimi prompt `compact CodeAI prompt`. It now links the exact source: `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Instruction_Stack_Control_Experiment_Results/claude-instruction-analysis/Claude_My_System_Prompt.md`.

## Verification

- `npm run plan:validate` passed.
- Targeted search confirmed `Benchmark Script`, `Primary runner`, and runner links near the top of all three benchmark documents.
- Targeted search confirmed `compact CodeAI prompt` is gone from the coding benchmark and `Claude_My_System_Prompt.md` is linked.

## Commits

- `373a2cf12` `docs: add benchmark script entrypoints`
- `ed9e8a41d` `docs: clarify benchmark prompt source link`
- Final closeout commit: `docs: close benchmark script entrypoint cleanup`
