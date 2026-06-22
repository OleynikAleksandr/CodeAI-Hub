# Plan Closeout: kimi-acp-highspeed-settings-2026-06-21

**Created:** 2026-06-21T09:47:20.496Z
**Acceptance:** User accepted v1.2.565 Kimi ACP stream/thinking release retest on 2026-06-21: provider works, reasoning visible, chunks render correctly.
**Execution Scope Status:** ACTIVE
**Branch:** main
**Current Task:** phase1.stream9.task1
**Expected Commit:** docs: close kimi acp highspeed scope
**Last Recorded Commit:** self
**Planning Source Disposition:** moved
**Planning Source Path:** doc/SolidWorks-WorkFlow/Plans/Archive/Kimi_ACP_HighSpeed_Settings_Planning_RU.md

## Active Plan Copy

````markdown
# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "kimi-acp-highspeed-settings-2026-06-21",
  "branch": "main",
  "baseHead": "cc61b6ef5",
  "lastRecordedCommit": "self",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Archive/Kimi_ACP_HighSpeed_Settings_Planning_RU.md",
  "currentTaskId": "phase1.stream9.task1",
  "expectedCommitMessage": "docs: close kimi acp highspeed scope",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/Kimi_ACP_HighSpeed_Settings_Planning_RU.md`
- **Read this context before implementation:**
  - `AGENTS.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Modules/Kimi.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
  - `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Active `doc/TODO/todo-plan.md` tracked и обновляется в том же meaningful commit, где меняются код или документация.
- Каждая подзадача затрагивает не более 3 файлов или пакетов и имеет отдельную строку `Git Commit: ...`.
- После каждого task используется `npm run plan:validate` и `npm run plan:commit -- "<Expected Commit>"`.
- Release build / VSIX packaging не выполняется без отдельного явного подтверждения пользователя.

## Phase 1 — Kimi ACP + High Speed Repair (owner: Codex, updated: 2026-06-21)
### Stream: Planning Intake
1. [DONE] `phase1.stream1.task1` Создать planning source и active execution plan для Kimi ACP + High Speed settings scope (scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Kimi_ACP_HighSpeed_Settings_Planning_RU.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan kimi acp highspeed update`).
2. [DONE] `phase1.stream1.commit1` Git Commit: `docs: plan kimi acp highspeed update` (hash: self)

### Stream: Model Surfaces
3. [DONE] `phase1.stream2.task1` Добавить Kimi High Speed в runtime/UI registries и убрать Kimi reasoning on/off из Settings card (scope: `packages/Kimi_Module/src/types/kimi-model-capabilities.ts, src/types/kimi-model-registry.ts, src/client/ui/src/components/settings/kimi-default-model-card.tsx`; expected commit: `fix: add kimi highspeed model surfaces`).
4. [DONE] `phase1.stream2.commit1` Git Commit: `fix: add kimi highspeed model surfaces` (hash: self)
5. [DONE] `phase1.stream2.task2` Сделать Kimi launch-card model-only и перестать писать `thinkingEnabled` из start defaults (scope: `src/client/project-manager/components/shared/stage-start-model-selection.ts, src/client/project-manager/services/workflow-step-start-settings-defaults.ts, src/client/ui/src/components/settings/kimi-settings-state.ts`; expected commit: `fix: remove kimi reasoning from launch cards`).
6. [DONE] `phase1.stream2.commit2` Git Commit: `fix: remove kimi reasoning from launch cards` (hash: self)
7. [DONE] `phase1.stream2.task3` Скрыть пустой reasoning selector для Kimi в workflow step provider cards (scope: `src/client/project-manager/components/shared/stage-confirmation-card.tsx, src/client/project-manager/components/layout/development-tree-node-start-card.tsx, doc/TODO/todo-plan.md`; expected commit: `fix: hide kimi reasoning selector in start cards`).
8. [DONE] `phase1.stream2.commit3` Git Commit: `fix: hide kimi reasoning selector in start cards` (hash: self)
9. [DONE] `phase1.stream2.task4` Обновить тесты model surfaces, launch-card defaults и session status model picker под High Speed (scope: `src/client/project-manager/services/workflow-step-start-settings-defaults.test.ts, src/client/project-manager/services/kimi-model-registry-alignment.test.ts, src/client/ui/src/session/status-panel-model-picker.test.tsx`; expected commit: `test: cover kimi highspeed model selectors`).
10. [DONE] `phase1.stream2.commit4` Git Commit: `test: cover kimi highspeed model selectors` (hash: self)

### Stream: Core Settings Bridge
11. [DONE] `phase1.stream3.task1` Нормализовать Kimi settings/default model в Core и adapter construction без reasoning off (scope: `packages/core/src/config/provider-turn-config-resolver.ts, packages/core/src/provider-registry/provider-descriptor-factory.ts, doc/TODO/todo-plan.md`; expected commit: `fix: normalize kimi model settings bridge`).
12. [DONE] `phase1.stream3.commit1` Git Commit: `fix: normalize kimi model settings bridge` (hash: self)

### Stream: ACP Runtime
13. [DONE] `phase1.stream4.task1` Перевести Kimi CLI startup на `kimi acp` и новый binary candidate path (scope: `packages/Kimi_Module/src/provider/kimi-managed-agent-profile.ts, packages/Kimi_Module/src/wire/kimi-wire-process.ts, packages/Kimi_Module/src/provider/kimi-managed-agent-profile.test.ts`; expected commit: `fix: start kimi through acp cli`).
14. [DONE] `phase1.stream4.commit1` Git Commit: `fix: start kimi through acp cli` (hash: self)
15. [DONE] `phase1.stream4.task2` Подключить ACP lifecycle/router к `initialize`, `session/new`, `session/prompt`, `session/cancel`, `session/resume` (scope: `packages/Kimi_Module/src/session/kimi-session-lifecycle.ts, packages/Kimi_Module/src/wire/kimi-wire-router.ts, packages/Kimi_Module/src/provider/kimi-provider-adapter.ts`; expected commit: `fix: drive kimi acp sessions`).
16. [DONE] `phase1.stream4.commit2` Git Commit: `fix: drive kimi acp sessions` (hash: self)
17. [DONE] `phase1.stream4.task3` Нормализовать ACP `session/update` stream events и покрыть тестами (scope: `packages/Kimi_Module/src/messaging/kimi-event-normalizer.ts, packages/Kimi_Module/src/messaging/kimi-event-normalizer.test.ts, packages/Kimi_Module/src/provider/kimi-provider-adapter.test.ts`; expected commit: `fix: normalize kimi acp stream updates`).
18. [DONE] `phase1.stream4.commit3` Git Commit: `fix: normalize kimi acp stream updates` (hash: self)

### Stream: Documentation Sync
19. [DONE] `phase1.stream5.task1` Синхронизировать Kimi ACP/highspeed behavior в SSOT docs (scope: `doc/SolidWorks-WorkFlow/Modules/Kimi.md, doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md, doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md`; expected commit: `docs: update kimi acp ssot`).
20. [DONE] `phase1.stream5.commit1` Git Commit: `docs: update kimi acp ssot` (hash: self)

### Stream: Tooling Verification
21. [DONE] `phase1.stream6.task1` Обновить Kimi package smoke-test под ACP args после verification failure (scope: `packages/Kimi_Module/package.json, doc/TODO/todo-plan.md`; expected commit: `test: update kimi package smoke test`).
22. [DONE] `phase1.stream6.commit1` Git Commit: `test: update kimi package smoke test` (hash: self)
23. [DONE] `phase1.stream6.task2` Запустить targeted Kimi/UI/Core проверки и записать результат (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify kimi acp highspeed scope`).
    - Evidence 2026-06-21: `npm run build --workspace @codeai-hub/kimi-module` PASS.
    - Evidence 2026-06-21: `npm test --workspace @codeai-hub/kimi-module` PASS after ACP smoke-test update.
    - Evidence 2026-06-21: `npx tsx --test packages/Kimi_Module/src/provider/kimi-managed-agent-profile.test.ts packages/Kimi_Module/src/messaging/kimi-event-normalizer.test.ts packages/Kimi_Module/src/provider/kimi-provider-adapter.test.ts` PASS (12/12).
    - Evidence 2026-06-21: `npx tsx --test src/client/project-manager/services/workflow-step-start-settings-defaults.test.ts src/client/project-manager/services/kimi-model-registry-alignment.test.ts src/client/ui/src/session/status-panel-model-picker.test.tsx packages/core/src/config/provider-settings-snapshot.test.ts packages/core/src/provider-registry/provider-descriptor-factory.test.ts` PASS (17/17).
24. [DONE] `phase1.stream6.commit2` Git Commit: `test: verify kimi acp highspeed scope` (hash: self)

### Stream: Release Build
25. [DONE] `phase1.stream7.task1` Подготовить README/CHANGELOG под будущий релиз v1.2.563 (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.563 kimi acp`).
26. [DONE] `phase1.stream7.commit1` Git Commit: `docs: prepare release 1.2.563 kimi acp` (hash: self)
27. [DONE] `phase1.stream7.task2` Собрать release artifacts v1.2.563 через approved release scripts и записать evidence (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, media/react-chat.js, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `build: release 1.2.563 kimi acp`).
    - Evidence 2026-06-21: `./scripts/build-all.sh` PASS; provider/core/launcher/UI tarballs for v1.2.563 copied to `doc/tmp/releases/`.
    - Evidence 2026-06-21: `./scripts/build-release.sh --use-current-version --allow-dirty` PASS with `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, and `Package created`.
    - Evidence 2026-06-21: VSIX package created at `codeai-hub-1.2.563.vsix` (5.5M).
28. [DONE] `phase1.stream7.commit2` Git Commit: `build: release 1.2.563 kimi acp` (hash: self)

### Stream: User Workflow Acceptance Testing
29. [DONE] `phase1.stream8.task1` Record failed v1.2.563 user retest and reopen Kimi ACP runtime repair (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record kimi acp retest failure`).
    - Evidence 2026-06-21: installed v1.2.563 Kimi session creation failed in Core logs with `Failed to create kimiCode session: Authentication required`.
    - Evidence 2026-06-21: live `kimi acp` `initialize` passed, but `session/new` failed without `KIMI_MODEL_*` env even after `kimi migrate`; `kimi acp --login` failed with membership verification error.
    - Evidence 2026-06-21: live `kimi acp` with `KIMI_MODEL_NAME=kimi-k2.7-code-highspeed` and migrated API-key credentials created a session and answered `OK` to `session/prompt`.
30. [DONE] `phase1.stream8.commit1` Git Commit: `docs: record kimi acp retest failure` (hash: self)

### Stream: Kimi ACP Env Model Repair
31. [DONE] `phase1.stream10.task1` Запускать Kimi ACP с `KIMI_MODEL_*` env для выбранных CodeAI Kimi models и не слать несовместимый `session/set_config_option` raw model id (scope: `packages/Kimi_Module/src/provider/kimi-managed-agent-profile.ts, packages/Kimi_Module/src/provider/kimi-provider-adapter.ts, packages/Kimi_Module/src/provider/kimi-managed-agent-profile.test.ts`; expected commit: `fix: start kimi acp with env selected model`).
32. [DONE] `phase1.stream10.commit1` Git Commit: `fix: start kimi acp with env selected model` (hash: self)
33. [DONE] `phase1.stream10.task2` Синхронизировать Kimi module docs и записать live ACP verification evidence (scope: `doc/SolidWorks-WorkFlow/Modules/Kimi.md, doc/TODO/todo-plan.md`; expected commit: `docs: document kimi acp env model path`).
    - Evidence 2026-06-21: `doc/SolidWorks-WorkFlow/Modules/Kimi.md` updated to state that CodeAI Kimi model ids are injected through `KIMI_MODEL_*` before ACP startup and are not sent as raw `session/set_config_option` values.
    - Evidence 2026-06-21: local live probe confirmed `kimi acp` with `KIMI_MODEL_NAME=kimi-k2.7-code-highspeed` created a session and answered `OK` to `session/prompt`.
34. [DONE] `phase1.stream10.commit2` Git Commit: `docs: document kimi acp env model path` (hash: self)
35. [DONE] `phase1.stream10.task3` Запустить targeted Kimi checks и live ACP env-model probe после исправления (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify kimi acp env model startup`).
    - Evidence 2026-06-21: `npm run build --workspace @codeai-hub/kimi-module` PASS.
    - Evidence 2026-06-21: `npm test --workspace @codeai-hub/kimi-module` PASS.
    - Evidence 2026-06-21: live `KimiProviderAdapter` probe using `defaultModel = "kimi-k2.7-code-highspeed"` created `kimi:session_7745db36-457b-414f-8a25-2c1db215c725` and `sendMessage("Say only: OK")` returned `OK`.
36. [DONE] `phase1.stream10.commit3` Git Commit: `test: verify kimi acp env model startup` (hash: self)

### Stream: Repair Release Build
37. [DONE] `phase1.stream12.task1` Подготовить README/CHANGELOG под будущий релиз v1.2.564 с Kimi ACP env-model fix (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.564 kimi acp env`).
    - Evidence 2026-06-21: `README.md` Current Release updated to `v1.2.564` and retest focus now targets Kimi ACP env-model session creation.
    - Evidence 2026-06-21: `CHANGELOG.md` added `1.2.564` entry with Kimi `KIMI_MODEL_*` fix and live adapter probe verification.
38. [DONE] `phase1.stream12.commit1` Git Commit: `docs: prepare release 1.2.564 kimi acp env` (hash: self)
39. [DONE] `phase1.stream12.task2` Собрать release artifacts v1.2.564 через approved release scripts и записать evidence (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, media/react-chat.js, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `build: release 1.2.564 kimi acp env`).
    - Evidence 2026-06-21: `./scripts/build-all.sh` PASS; provider/core/launcher/UI tarballs for v1.2.564 copied to `doc/tmp/releases/`.
    - Evidence 2026-06-21: `./scripts/build-release.sh --use-current-version --allow-dirty` PASS with `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, and `Package created`.
    - Evidence 2026-06-21: VSIX package created at `codeai-hub-1.2.564.vsix` (5.5M).
40. [DONE] `phase1.stream12.commit2` Git Commit: `build: release 1.2.564 kimi acp env` (hash: self)

### Stream: User Workflow Acceptance Retest
41. [BLOCKED] `phase1.stream11.task1` User retest: install v1.2.564 VSIX, Kimi provider starts through ACP env-model path, Settings/step card/status picker show High Speed, no reasoning on/off remains (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record kimi acp env model acceptance`).
    - Evidence 2026-06-21: user retest confirmed Kimi provider now starts, but ACP response chunks render as separate dialog cards and reasoning is absent.
42. [TODO] `phase1.stream11.commit1` Git Commit: `docs: record kimi acp env model acceptance` (hash: TBD)

### Stream: Kimi ACP Stream Retest Failure
43. [DONE] `phase1.stream13.task1` Record failed v1.2.564 stream/reasoning retest and add repair scope (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record kimi acp stream retest failure`).
    - Evidence 2026-06-21: live `KimiProviderAdapter` probe for `kimi-k2.7-code-highspeed` returned many single-token `agent_message_chunk` assistant events with no stable Core `messageId`, so UI rendered separate cards.
    - Evidence 2026-06-21: live ACP probe returned no `agent_thought_chunk` until `session/set_config_option` set `configId: "thinking"` to `value: "on"`; migrated Kimi config has `default_thinking = false`, and env-model sessions started with `thinkingLevel: "off"`.
44. [DONE] `phase1.stream13.commit1` Git Commit: `docs: record kimi acp stream retest failure` (hash: self)

### Stream: Kimi ACP Stream/Thinking Repair
45. [DONE] `phase1.stream14.task1` Enable ACP thinking per session and buffer/tag ACP text streams so UI renders one growing card instead of one card per token (scope: `packages/Kimi_Module/src/session/kimi-session-lifecycle.ts, packages/Kimi_Module/src/messaging/kimi-event-normalizer.ts, packages/Kimi_Module/src/messaging/kimi-event-normalizer.test.ts`; expected commit: `fix: stabilize kimi acp streamed messages`).
46. [DONE] `phase1.stream14.commit1` Git Commit: `fix: stabilize kimi acp streamed messages` (hash: self)
47. [DONE] `phase1.stream14.task2` Update Kimi package smoke test for buffered ACP assistant chunks (scope: `packages/Kimi_Module/package.json, doc/TODO/todo-plan.md`; expected commit: `test: update kimi acp stream smoke`).
48. [DONE] `phase1.stream14.commit2` Git Commit: `test: update kimi acp stream smoke` (hash: self)
49. [DONE] `phase1.stream14.task3` Flush buffered ACP assistant/thinking text before adapter-level turn completion when Kimi ACP completes without a `TurnEnd` stream event (scope: `packages/Kimi_Module/src/provider/kimi-provider-adapter.ts, packages/Kimi_Module/src/messaging/kimi-event-normalizer.ts, doc/TODO/todo-plan.md`; expected commit: `fix: flush kimi acp buffered response`).
    - Evidence 2026-06-21: live `KimiProviderAdapter` probe for `kimi-k2.7-code-highspeed` emitted 2 `thinking` events and 1 `assistant` event with `tag: "live"` after flushing buffered ACP text before adapter-level `turn_completed`.
50. [DONE] `phase1.stream14.commit3` Git Commit: `fix: flush kimi acp buffered response` (hash: self)
51. [DONE] `phase1.stream14.task4` Run targeted Kimi checks and live ACP thinking/chunk probe after stream repair (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify kimi acp stream repair`).
    - Evidence 2026-06-21: `npm run build --workspace @codeai-hub/kimi-module` PASS.
    - Evidence 2026-06-21: `npx tsx --test packages/Kimi_Module/src/messaging/kimi-event-normalizer.test.ts packages/Kimi_Module/src/provider/kimi-managed-agent-profile.test.ts packages/Kimi_Module/src/provider/kimi-provider-adapter.test.ts` PASS (15/15).
    - Evidence 2026-06-21: `npm test --workspace @codeai-hub/kimi-module` PASS.
    - Evidence 2026-06-21: live `KimiProviderAdapter` probe using `defaultModel = "kimi-k2.7-code-highspeed"` created `kimi:session_c5fc25ab-7bfd-481e-a35f-a868040773f2`, emitted 2 `thinking` events, 1 `assistant` event with `tag: "live"`, and 1 adapter-level `turn_completed`.
52. [DONE] `phase1.stream14.commit4` Git Commit: `test: verify kimi acp stream repair` (hash: self)

### Stream: Stream/Thinking Repair Release Build
53. [DONE] `phase1.stream15.task1` Подготовить README/CHANGELOG под будущий релиз v1.2.565 с Kimi ACP stream/thinking fix (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.565 kimi acp stream`).
54. [DONE] `phase1.stream15.commit1` Git Commit: `docs: prepare release 1.2.565 kimi acp stream` (hash: self)
55. [DONE] `phase1.stream15.task2` Собрать release artifacts v1.2.565 через approved release scripts и записать evidence (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, media/react-chat.js, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `build: release 1.2.565 kimi acp stream`).
    - Evidence 2026-06-21: `./scripts/build-all.sh` PASS; provider/core/launcher/UI tarballs for v1.2.565 copied to `doc/tmp/releases/`.
    - Evidence 2026-06-21: `./scripts/build-release.sh --use-current-version --allow-dirty` PASS with `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, and `Package created`.
    - Evidence 2026-06-21: VSIX package created at `codeai-hub-1.2.565.vsix` (5.5M).
56. [DONE] `phase1.stream15.commit2` Git Commit: `build: release 1.2.565 kimi acp stream` (hash: self)

### Stream: Documentation Actualization
57. [DONE] `phase1.stream16.task1` Актуализировать Kimi SSOT и Docs Index после принятого v1.2.565 retest (scope: `doc/SolidWorks-WorkFlow/Modules/Kimi.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: actualize kimi acp stream ssot`).
    - Evidence 2026-06-21: `Modules/Kimi.md` now documents ACP per-session `thinking = on`, buffered `agent_message_chunk` / `agent_thought_chunk` normalization, and adapter-level flush before `turn_completed`.
    - Evidence 2026-06-21: `Docs_Index.md` Kimi entries now describe native ACP/env-model/model-only behavior instead of legacy Wire `--thinking` control.
58. [DONE] `phase1.stream16.commit1` Git Commit: `docs: actualize kimi acp stream ssot` (hash: self)

### Stream: Scope Closeout
59. [IN_PROGRESS] `phase1.stream9.task1` Close accepted scope and archive the plan after User Acceptance Gate (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close kimi acp highspeed scope`).
60. [TODO] `phase1.stream9.commit1` Git Commit: `docs: close kimi acp highspeed scope` (hash: TBD)
61. [TODO] `phase1.stream9.task2` Reserved post-closeout terminal anchor after `plan:closeout` and `plan:commit` finish; complete with `npm run plan:complete` only after the closeout commit.
````
