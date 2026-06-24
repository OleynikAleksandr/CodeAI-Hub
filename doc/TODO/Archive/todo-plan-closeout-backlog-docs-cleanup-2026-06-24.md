# Backlog Docs Cleanup Closeout

**Plan ID:** `backlog-docs-cleanup-2026-06-24`  
**Closed:** 2026-06-24  
**Acceptance:** user asked to take over after the previous plan completed, move model-test/planning documents into `doc/SolidWorks-WorkFlow/Plans/Backlog/`, and check whether the existing Backlog documents are still актуальны.

## Result

- Durable model/planning documents were moved or promoted into `doc/SolidWorks-WorkFlow/Plans/Backlog/`.
- Raw benchmark scripts, logs and scratch outputs stayed in `doc/tmp/prototypes/`; Backlog documents keep links to those raw artifacts.
- `doc/SolidWorks-WorkFlow/Plans/Backlog/README.md` now acts as the freshness map for Backlog documents.
- `doc/SolidWorks-WorkFlow/Docs_Index.md` now points at the Backlog copies of the promoted documents.
- `doc/TODO/todo-plan.md` is in terminal `NONE` state with no plan debt.

## Commits

- `941132246` `docs: move model planning docs to backlog`
- `a1d12c04e` `docs: promote model benchmark summaries to backlog`
- `7200de423` `docs: audit backlog planning documents`
- `45bed116c` `docs: verify backlog document cleanup`

## Backlog Freshness Summary

- `Intent_Normalizer_Module_Planning_RU.md`: active backlog candidate; use as planning source for pre-turn normalizer work.
- `Provider_Instruction_Profile_Calibration_GLM_Kimi_RU.md`: active backlog candidate; requires controlled rerun with exact prompt/tool hashes before implementation.
- `Coding_Model_Benchmark_RU.md`: exploratory benchmark summary; useful for shortlist, not final production selection.
- `Documentation_Planning_Model_Benchmark_RU.md`: exploratory benchmark summary; useful for documentation/planning shortlist, not final production selection.
- Claude/Codex capability analysis documents: useful research catalogue, but refresh before new provider work.
- Capture Workbench architecture documents: deferred candidates; refresh against current provider set and Project Manager runtime before implementation.
- `DevelopmentTree_Sidebar_Visualization_Architecture.md`: likely implemented/accepted residue; candidate for later archive or SSOT fold-in cleanup.
- `Kimi_Audit_Followup_Planning.md` and `KIMI/`: still useful as baseline, but refresh against current Kimi CLI/runtime before acting.

## Verification

- `npm run plan:validate` passed before the final cleanup commit.
- Targeted path check found no live stale links to moved model benchmark summaries outside historical DONE lines in the archived plan.
- `git status --short` was clean after closeout commit `45bed116c`.
