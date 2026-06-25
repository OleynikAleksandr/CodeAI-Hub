# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "localization-gemini-flash-lite-engine-2026-06-25",
  "branch": "main",
  "baseHead": "d617a7461",
  "lastRecordedCommit": "self",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Translation_Model_Benchmark_RU.md",
  "currentTaskId": "localization-gemini-engine.phase0.task2",
  "expectedCommitMessage": "feat: expose Gemini Flash Lite localization engine",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Translation_Model_Benchmark_RU.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
  - `doc/SolidWorks-WorkFlow/Modules/Localization.md`
  - `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Translation_Model_Benchmark_RU.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения

- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: изменение и отдельный `Git Commit: ...`.
- Commit выполняется через `npm run plan:commit -- "<expected commit>"`.

## Phase 0 — Gemini Flash Lite Localization Engine (owner: Codex, updated: 2026-06-25)

### Stream: Engine Catalog

1. [DONE] `localization-gemini-engine.phase0.task1` Add Core runtime translation engine and language catalog for `google/gemini-2.5-flash-lite-preview-09-2025`.
   - scope: `doc/TODO/todo-plan.md, packages/core/src/translation/core-translation-facade-factory.ts, packages/localization/src/language-catalog.ts`
   - expected commit: `feat: add Gemini Flash Lite translation runtime`
2. [DONE] `localization-gemini-engine.phase0.commit1` Git Commit: `feat: add Gemini Flash Lite translation runtime` (hash: self)
3. [IN_PROGRESS] `localization-gemini-engine.phase0.task2` Expose the Gemini Flash Lite engine in both Localization settings selectors.
   - scope: `doc/TODO/todo-plan.md, src/client/ui/src/components/settings/use-settings-state-support.ts, src/client/ui/src/components/settings/localization-engine-availability.ts`
   - expected commit: `feat: expose Gemini Flash Lite localization engine`
4. [TODO] `localization-gemini-engine.phase0.commit2` Git Commit: `feat: expose Gemini Flash Lite localization engine` (hash: TBD)
5. [TODO] `localization-gemini-engine.phase0.closeout.anchor` Reserved post-closeout handoff anchor.
