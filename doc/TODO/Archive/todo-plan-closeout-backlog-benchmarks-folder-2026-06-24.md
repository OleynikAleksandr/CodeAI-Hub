# Backlog Benchmarks Folder Closeout

**Plan ID:** `backlog-benchmarks-folder-2026-06-24`  
**Closed:** 2026-06-24  
**Acceptance:** user asked to split benchmark materials out of the main `doc/SolidWorks-WorkFlow/Plans/Backlog/` folder so backlog planning docs and benchmark summaries are not mixed together.

## Result

- Durable benchmark summaries now live under `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/`.
- `doc/SolidWorks-WorkFlow/Plans/Backlog/README.md` points to the new `Benchmarks/` paths.
- `doc/SolidWorks-WorkFlow/Docs_Index.md` points to the new benchmark paths.
- `Provider_Instruction_Profile_Calibration_GLM_Kimi_RU.md` now references the moved coding benchmark summary.
- Raw benchmark scripts and logs remain in `doc/tmp/prototypes/`.

## Moved Documents

- `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Coding_Model_Benchmark_RU.md`
- `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Documentation_Planning_Model_Benchmark_RU.md`

## Commits

- `18b832ce6` `docs: group backlog benchmark summaries`
- `93bcf50aa` `docs: update backlog benchmark references`
- Final closeout commit: `docs: close backlog benchmarks folder cleanup`

## Verification

- `npm run plan:validate` passed.
- Targeted path search found no live stale links to `Plans/Backlog/Coding_Model_Benchmark_RU.md` or `Plans/Backlog/Documentation_Planning_Model_Benchmark_RU.md`.
