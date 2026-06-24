# Benchmark-Related Backlog Docs Closeout

**Plan ID:** `backlog-benchmark-docs-folder-2026-06-24`  
**Closed:** 2026-06-24  
**Acceptance:** user asked to also group the intent normalizer and provider capture workbench planning documents under `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/`, because they are about model/provider benchmark, capture and comparison work.

## Result

- `Intent_Normalizer_Module_Planning_RU.md` moved into `Backlog/Benchmarks/`.
- `Provider_Native_Request_Capture_Workbench_Architecture.md` moved into `Backlog/Benchmarks/`.
- `Capture_Workbench_UI_Architecture.md` moved into `Backlog/Benchmarks/`.
- `Backlog/README.md`, `Docs_Index.md`, and capture parent/child cross-links now point to the new paths.
- Raw benchmark scripts/logs remain in `doc/tmp/prototypes/`.

## Current Benchmark Folder

- `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Capture_Workbench_UI_Architecture.md`
- `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Coding_Model_Benchmark_RU.md`
- `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Documentation_Planning_Model_Benchmark_RU.md`
- `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Intent_Normalizer_Module_Planning_RU.md`
- `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Provider_Native_Request_Capture_Workbench_Architecture.md`

## Commits

- `7a3f481e3` `docs: move benchmark-related backlog docs`
- Final closeout commit: `docs: close benchmark-related backlog grouping`

## Verification

- `npm run plan:validate` passed.
- Targeted path search found no live stale links to the old root-level Backlog paths for the moved documents.
