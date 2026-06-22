# Plan Closeout: local-models-file-tools-warmup-2026-06-20

**Created:** 2026-06-20T13:54:01.351Z
**Acceptance:** User accepted release 1.2.560 as good enough for this scope; remaining Local Models nuances are deferred to a new plan.
**Execution Scope Status:** ACTIVE
**Branch:** codex/local-models-tools-warmup
**Current Task:** phase15.stream1.task1
**Expected Commit:** docs: close local models file tools and warmup scope
**Last Recorded Commit:** cb5d892ca
**Planning Source Disposition:** moved
**Planning Source Path:** doc/SolidWorks-WorkFlow/Plans/Archive/Local_Models_FileTools_And_Warmup_Planning_RU.md

## Active Plan Copy

````markdown
# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "local-models-file-tools-warmup-2026-06-20",
  "branch": "codex/local-models-tools-warmup",
  "baseHead": "977d21cc8",
  "lastRecordedCommit": "cb5d892ca",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Archive/Local_Models_FileTools_And_Warmup_Planning_RU.md",
  "currentTaskId": "phase15.stream1.task1",
  "expectedCommitMessage": "docs: close local models file tools and warmup scope",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/Local_Models_FileTools_And_Warmup_Planning_RU.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Modules/LocalModels.md`
  - `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
  - `doc/SolidWorks-WorkFlow/Modules/Localization.md`
  - `doc/SolidWorks-WorkFlow/Modules/GLM_Native.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
  - `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)

- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждый implementation task затрагивает не более 3 файлов.
- Каждая implementation task сразу сопровождается отдельным пунктом `Git Commit: ...`.
- Использовать `npm run plan:commit -- "<expected commit message>"`; не обходить Husky hooks.
- Если фактический scope задачи выходит за 3 файла, сначала разбить task в этом plan.
- Release build не запускать без отдельного явного подтверждения пользователя.

## Phase 0 — Planning Intake (owner: Codex, updated: 2026-06-20)

### Stream: Worktree And Plan Bootstrap

1. [DONE] `phase0.stream1.task1` Создать отдельный worktree рядом с основным проектом, зафиксировать planning source и активный execution todo-plan для Local Models file tools + warmup scope. (scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Local_Models_FileTools_And_Warmup_Planning_RU.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan local models file tools and warmup`)
2. [DONE] `phase0.stream1.commit1` Git Commit: `docs: plan local models file tools and warmup` (hash: c78144003)

## Phase 1 — Local Models Artifact Write Tool (owner: Codex, updated: 2026-06-20)

### Stream: LM Studio Tool Events

3. [DONE] `phase1.stream1.task1` Добавить targeted parsing для LM Studio tool-call stream events или зафиксировать OpenAI-compatible fallback path для tool-enabled workflow turns. (scope: `packages/core/src/local-models/local-models-sse-reader.ts, packages/core/src/local-models/local-models-sse-reader.test.ts`; expected commit: `feat: parse lm studio local model tool calls`)
4. [DONE] `phase1.stream1.commit1` Git Commit: `feat: parse lm studio local model tool calls` (hash: 2b782e98e)

### Stream: Workflow Artifact Tool

5. [DONE] `phase1.stream2.task1` Добавить узкий `write_workflow_artifact` helper и подключить его к LocalModelsProviderAdapter с max-step loop и fallback markdown extraction path. (scope: `packages/core/src/local-models/local-models-provider-adapter.ts, packages/core/src/local-models/local-models-workflow-artifact-tool.ts, packages/core/src/local-models/local-models-provider-adapter.tools.test.ts`; expected commit: `feat: let local models write workflow artifacts`)
6. [DONE] `phase1.stream2.commit1` Git Commit: `feat: let local models write workflow artifacts` (hash: 3cb4d83cb)

### Stream: Tool Contract Docs

7. [DONE] `phase1.stream3.task1` Обновить SSOT Local Models и текущий planning evidence по выбранному LM Studio tool path. (scope: `doc/SolidWorks-WorkFlow/Modules/LocalModels.md, doc/SolidWorks-WorkFlow/Plans/Archive/Local_Models_FileTools_And_Warmup_Planning_RU.md`; expected commit: `docs: document local models artifact tool contract`)
8. [DONE] `phase1.stream3.commit1` Git Commit: `docs: document local models artifact tool contract` (hash: 8c214d6b3)

## Phase 2 — Local Models Warmup (owner: Codex, updated: 2026-06-20)

### Stream: Warmup Service

9. [DONE] `phase2.stream1.task1` Добавить Core-side Local Models warmup helper: выбрать `lmstudio:*` reasoning engine и `providers.localModels.defaultModel`, dedupe, preload через существующий runtime load manager. (scope: `packages/core/src/local-models/local-models-runtime-load-manager.ts, packages/core/src/local-models/local-models-warmup-service.ts, packages/core/src/local-models/local-models-warmup-service.test.ts`; expected commit: `feat: preload selected lm studio models`)
10. [DONE] `phase2.stream1.commit1` Git Commit: `feat: preload selected lm studio models` (hash: 3ecc40682)

### Stream: Project Manager Startup Hook

11. [DONE] `phase2.stream2.task1` Подключить warmup к workspace-scoped `settings:load` / Project Manager startup без блокировки UI и без hard failure при недоступном LM Studio. (scope: `packages/core/src/remote-bridge/handlers/settings-request-handler.ts, packages/core/src/remote-bridge/handlers/settings-local-models-warmup-scheduler.ts, packages/core/src/remote-bridge/handlers/settings-request-handler.localization-runtime.test.ts`; expected commit: `feat: warm selected local models on settings load`)
12. [DONE] `phase2.stream2.commit1` Git Commit: `feat: warm selected local models on settings load` (hash: 877bb97fc)

### Stream: Warmup Docs

13. [DONE] `phase2.stream3.task1` Обновить SSOT docs по warmup lifecycle и localization/reasoning model selection. (scope: `doc/SolidWorks-WorkFlow/Modules/LocalModels.md, doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md, doc/SolidWorks-WorkFlow/Modules/Localization.md`; expected commit: `docs: document local models warmup lifecycle`)
14. [DONE] `phase2.stream3.commit1` Git Commit: `docs: document local models warmup lifecycle` (hash: 23b4588b4)

## Phase 3 — Tooling Verification (owner: Codex, updated: 2026-06-20)

### Stream: Targeted Verification

15. [DONE] `phase3.stream1.task1` Запустить targeted local-models tests и Core build; исправить только failures из текущего scope. (scope: `packages/core/src/local-models/**, packages/core/src/remote-bridge/handlers/**, doc/TODO/todo-plan.md`; expected commit: `test: verify local models tools and warmup`)
16. [DONE] `phase3.stream1.commit1` Git Commit: `test: verify local models tools and warmup` (hash: c50b03110)

## Phase 4 — User Workflow Acceptance Testing (owner: user, updated: 2026-06-20)

### Stream: LM Studio Retest

17. [DONE] `phase4.stream1.task1` Передать пользователю worktree build/retest instructions: PM startup warmup + Local Models artifact write through LM Studio. (scope: observation/docs only; expected commit: not required)

### Stream: Release Build

18. [DONE] `phase4.stream2.task1` Подготовить release notes для будущей версии `1.2.556` перед запуском release scripts. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare local models tools warmup release`)
19. [DONE] `phase4.stream2.commit1` Git Commit: `docs: prepare local models tools warmup release` (hash: 5da907339)
20. [DONE] `phase4.stream2.task2` Запустить `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`, исключить worktree `.git` marker из VSIX, зафиксировать release metadata/artifacts evidence. (scope: `.vscodeignore, scripts/build-release.sh, assets/**/manifest.json, package.json, package-lock.json, packages/**/package.json, doc/TODO/todo-plan.md`; expected commit: `build: release local models tools warmup`)
21. [DONE] `phase4.stream2.commit2` Git Commit: `build: release local models tools warmup` (hash: ca0a68f3b)

## Phase 5 — User Release Acceptance Testing (owner: user, updated: 2026-06-20)

### Stream: Released VSIX Retest

22. [DONE] `phase5.stream1.task1` Передать пользователю VSIX и release artifacts для проверки PM startup warmup + Local Models artifact write through LM Studio. (scope: observation/docs only; expected commit: not required)

### Stream: Release Regression — Tool Turns Streaming

23. [DONE] `phase5.stream2.task1` Вернуть live reasoning/assistant streaming для Local Models workflow turns с artifact tool: сообщения должны приходить до записи файла, как до tool path. (scope: `packages/core/src/local-models/local-models-workflow-artifact-tool.ts, packages/core/src/local-models/local-models-provider-adapter.ts, packages/core/src/local-models/local-models-provider-adapter.tools.test.ts`; expected commit: `fix: stream local model tool turns`)
24. [DONE] `phase5.stream2.commit1` Git Commit: `fix: stream local model tool turns` (hash: 842bf2bc3)
25. [DONE] `phase5.stream2.task2` Обновить SSOT Local Models docs: OpenAI-compatible tool loop обязан сохранять live assistant/reasoning streaming. (scope: `doc/SolidWorks-WorkFlow/Modules/LocalModels.md, doc/TODO/todo-plan.md`; expected commit: `docs: document streamed local model tool turns`)
26. [DONE] `phase5.stream2.commit2` Git Commit: `docs: document streamed local model tool turns` (hash: 9b30a7ff2)
27. [DONE] `phase5.stream2.task3` Запустить targeted Local Models streaming/tool tests и Core build после regression fix. (scope: `packages/core/src/local-models/**, doc/TODO/todo-plan.md`; expected commit: `test: verify streamed local model tool turns`)
28. [DONE] `phase5.stream2.commit3` Git Commit: `test: verify streamed local model tool turns` (hash: b0474ac77)

## Phase 6 — Regression Release Build (owner: Codex, updated: 2026-06-20)

### Stream: Release Notes

29. [DONE] `phase6.stream1.task1` Подготовить release notes для будущей версии `1.2.557` со streamed Local Models tool-turn fix. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare streamed local models release`)
30. [DONE] `phase6.stream1.commit1` Git Commit: `docs: prepare streamed local models release` (hash: 075355f42)

### Stream: Release Package

31. [DONE] `phase6.stream2.task1` Запустить `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`, зафиксировать release metadata/artifacts evidence для `1.2.557`. (scope: `assets/**/manifest.json, package.json, package-lock.json, packages/**/package.json, doc/TODO/todo-plan.md, doc/tmp/releases/**, codeai-hub-*.vsix`; expected commit: `build: release streamed local models fix`)
32. [DONE] `phase6.stream2.commit1` Git Commit: `build: release streamed local models fix` (hash: a04a29f77)

## Phase 7 — User Release Acceptance Testing (owner: user, updated: 2026-06-20)

### Stream: Released VSIX Retest

33. [DONE] `phase7.stream1.task1` Передать пользователю VSIX `1.2.557` для проверки streamed reasoning/assistant output before Local Models artifact write. (scope: observation/docs only; expected commit: not required)

### Stream: Release Regression — Dialog Final Dedupe

34. [DONE] `phase7.stream2.task1` Скрыть в UI диалоговой панели финальный assistant bubble, если он визуально дублирует предыдущий live assistant bubble; Core/JSONL final message оставить без изменений. (scope: `src/client/ui/src/session/dialog-panel-message-utils.ts, src/client/ui/src/session/dialog-panel-message-utils.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: hide duplicated streamed final answer`)
35. [DONE] `phase7.stream2.commit1` Git Commit: `fix: hide duplicated streamed final answer` (hash: 4aa00d04f)

## Phase 8 — Dialog Final Dedupe Release Build (owner: Codex, updated: 2026-06-20)

### Stream: Release Notes

36. [DONE] `phase8.stream1.task1` Подготовить release notes для будущей версии `1.2.558` с UI-only скрытием дублированного финального assistant bubble. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare dialog final dedupe release`)
37. [DONE] `phase8.stream1.commit1` Git Commit: `docs: prepare dialog final dedupe release` (hash: fbadad4f5)

### Stream: Release Package

38. [DONE] `phase8.stream2.task1` Запустить `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`, зафиксировать release metadata/artifacts evidence для `1.2.558`. (scope: `assets/**/manifest.json, package.json, package-lock.json, packages/**/package.json, doc/TODO/todo-plan.md, doc/tmp/releases/**, codeai-hub-*.vsix`; expected commit: `build: release dialog final dedupe`)
39. [DONE] `phase8.stream2.commit1` Git Commit: `build: release dialog final dedupe` (hash: 130300478)

## Phase 9 — User Release Acceptance Testing (owner: user, updated: 2026-06-20)

### Stream: Released VSIX Retest

40. [DONE] `phase9.stream1.task1` Передать пользователю VSIX `1.2.558` для проверки, что final assistant остается в Core/JSONL, но не дублируется визуально в диалоговой панели после live output; retest выявил Qwen regression и переведён в отдельный Stream ниже. (scope: observation/docs only; expected commit: not required)

### Stream: Release Regression — Qwen Dialog Stream Dedupe

41. [DONE] `phase9.stream2.task1` Скрыть в UI standalone whitespace live-card и untagged final assistant snapshot после live-ответа того же turn, включая случаи Qwen с thinking между live-сегментами. (scope: `src/client/ui/src/session/dialog-panel-message-utils.ts, src/client/ui/src/session/dialog-panel-message-utils.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: hide streamed final snapshots after live output`)
42. [DONE] `phase9.stream2.commit1` Git Commit: `fix: hide streamed final snapshots after live output` (hash: beff89c2c)

## Phase 10 — Qwen Dialog Stream Dedupe Release Build (owner: Codex, updated: 2026-06-20)

### Stream: Release Notes

43. [DONE] `phase10.stream1.task1` Подготовить release notes для будущей версии `1.2.559` с Qwen Local Models dialog dedupe fix. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare qwen dialog stream dedupe release`)
44. [DONE] `phase10.stream1.commit1` Git Commit: `docs: prepare qwen dialog stream dedupe release` (hash: f29d45fee)

### Stream: Release Package

45. [DONE] `phase10.stream2.task1` Запустить `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`, зафиксировать release metadata/artifacts evidence для `1.2.559`. (scope: `assets/**/manifest.json, package.json, package-lock.json, packages/**/package.json, doc/TODO/todo-plan.md, doc/tmp/releases/**, codeai-hub-*.vsix`; expected commit: `build: release qwen dialog stream dedupe`)
46. [DONE] `phase10.stream2.commit1` Git Commit: `build: release qwen dialog stream dedupe` (hash: 3f97ac114)

## Phase 11 — User Release Acceptance Testing (owner: user, updated: 2026-06-20)

### Stream: Released VSIX Retest

47. [DONE] `phase11.stream1.task1` Передать пользователю VSIX `1.2.559` для проверки Qwen Local Models dialog: один thinking block, один live assistant answer, без пустой карточки и без duplicated final snapshot; retest выявил Qwen tool-loop failure после записи файла. (scope: observation/docs only; expected commit: not required)

### Stream: Release Regression — Qwen Artifact Tool Loop

48. [DONE] `phase11.stream2.task1` После успешного `write_workflow_artifact` отправлять следующий LM Studio follow-up без tools, чтобы Qwen не повторял запись артефакта до max-step failure. (scope: `packages/core/src/local-models/local-models-workflow-artifact-tool.ts, packages/core/src/local-models/local-models-provider-adapter.tools.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: stop qwen local model artifact tool loops`)
49. [DONE] `phase11.stream2.commit1` Git Commit: `fix: stop qwen local model artifact tool loops` (hash: 764b33830)

## Phase 12 — Qwen Artifact Tool Loop Release Build (owner: Codex, updated: 2026-06-20)

### Stream: Release Notes

50. [DONE] `phase12.stream1.task1` Подготовить release notes для будущей версии `1.2.560` с Qwen Local Models artifact tool-loop fix. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare qwen artifact tool loop release`)
51. [DONE] `phase12.stream1.commit1` Git Commit: `docs: prepare qwen artifact tool loop release` (hash: 3363e9ace)

### Stream: Release Package

52. [DONE] `phase12.stream2.task1` Запустить `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`, зафиксировать release metadata/artifacts evidence для `1.2.560`. (scope: `assets/**/manifest.json, package.json, package-lock.json, packages/**/package.json, doc/TODO/todo-plan.md, doc/tmp/releases/**, codeai-hub-*.vsix`; expected commit: `build: release qwen artifact tool loop`)
53. [DONE] `phase12.stream2.commit1` Git Commit: `build: release qwen artifact tool loop` (hash: 173146c4e)

## Phase 13 — User Release Acceptance Testing (owner: user, updated: 2026-06-20)

### Stream: Released VSIX Retest

54. [DONE] `phase13.stream1.task1` Передать пользователю VSIX `1.2.560` для проверки Qwen Local Models Description turn: файл записан, provider не падает по max tool steps, оркестратор принимает результат. (scope: observation/docs only; expected commit: not required) Result: User accepted release 1.2.560 as good enough for this scope; remaining nuances deferred to a new plan.

## Phase 14 — Documentation Sync (owner: Codex, updated: 2026-06-20)

### Stream: Local Models SSOT

55. [DONE] `phase14.stream1.task1` Актуализировать связанные Local Models SSOT-документы перед закрытием scope: tool write path, post-write no-tools follow-up, warmup, streaming/reasoning boundaries. (scope: `doc/SolidWorks-WorkFlow/Modules/LocalModels.md, doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/TODO/todo-plan.md`; expected commit: `docs: sync local models tool warmup closeout docs`)
56. [DONE] `phase14.stream1.commit1` Git Commit: `docs: sync local models tool warmup closeout docs` (hash: cb5d892ca)

## Phase 15 — Scope Closeout (owner: Codex, updated: 2026-06-20)

### Stream: Closeout

57. [IN_PROGRESS] `phase15.stream1.task1` После user acceptance архивировать todo-plan, закрыть planning-doc disposition и обновить Docs_Index. (scope: `doc/TODO/Archive/**, doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close local models file tools and warmup scope`)
58. [TODO] `phase15.stream1.commit1` Git Commit: `docs: close local models file tools and warmup scope` (hash: TBD)
59. [TODO] `phase15.stream1.task2` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle. (scope: `doc/TODO/todo-plan.md`; expected commit: not required)
````
