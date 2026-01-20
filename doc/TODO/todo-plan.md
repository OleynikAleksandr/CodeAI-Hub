# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- TODO Plan состоит из Phase (Фаз). В каждой Phase несколько Stream с микрозадачами.
- Каждая микрозадача затрагивает ≤ 3 файлов.
- Каждая микрозадача оформляется парой пунктов: (1) изменения, (2) `Git Commit: ...` отдельной строкой.
- Gates после каждой микрозадачи: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/Project_Docs/Workflow_CLI_Steps_And_Watcher_Architecture.md`
3. `doc/Project_Docs/QuestionnaireCurator/QuestionnaireCurator_Architecture.md`
4. `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`
5. `doc/SolidWorks-Flow/Architecture/WorkflowTree_StepSplit_Architecture.md`
6. `doc/SolidWorks-Flow/Architecture/DescriptionNode_ReviewSession_Architecture.md`
7. `doc/Project_Docs/SessionContinuity/SessionContinuity_Architecture.md`
8. `doc/TODO/todo-plan.md`

---

## Phase 62 — Workflow Tree: Description Step = Questionnaire → Draft → Auto-Review → Final (owner: Oleksandr, updated: 2026-01-20)

### Stream: Repo cleanup — remove unused agent packages
1. [DONE] Chore(repo): удалить неиспользуемые agent-packages и зафиксировать `npm workspaces`; scope: `packages/agents/diagram-facades-agent/*`, `packages/agents/diagram-modules-agent/*`, `packages/agents/spec-creator/*`, `packages/agents/virtual-simulation-agent/*`, `packages/agents/shared/src/index.ts`, `package.json`, `package-lock.json`; expected commit message: `chore(repo): remove unused agent packages`
2. [DONE] Git Commit: `chore(repo): remove unused agent packages` (hash: fae6a291)

### Stream: Design — Artifact-first + Resume Sessions
1. [DONE] Doc: зафиксировать решение “узел хранит только final артефакт + sessionRef на reviewer-сессию (возобновляемая)”; провайдеры resume: Claude/Codex, Gemini исключить — scope: `doc/SolidWorks-Flow/Architecture/DescriptionNode_ReviewSession_Architecture.md`; expected commit message: `docs: add session 019 and phase 62 plan`
2. [DONE] Git Commit: `docs: add session 019 and phase 62 plan` (hash: 4840a5e8)

### Stream: Design — Description lifecycle (tree UI + persisted progress)
1. [DONE] Doc: уточнить алгоритм шага `Description` (треугольник + цвета TODO/IN_PROGRESS/DONE, persisted `questionnaire.md`, resume sessions, авто-старт reviewer, `Final_Description.md` как единственный source-of-truth; статусы BLOCKED/ERROR/OUTDATED — отложить) — scope: `doc/SolidWorks-Flow/Architecture/DescriptionNode_ReviewSession_Architecture.md`, `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`, `doc/SolidWorks-Flow/Architecture/WorkflowTree_StepSplit_Architecture.md`; expected commit message: `docs(workflow-tree): refine description step lifecycle`
2. [DONE] Git Commit: `docs(workflow-tree): refine description step lifecycle` (hash: b8ccbbe2)

### Stream: Design — Runs policy (history vs current)
1. [DONE] Doc: уточнить политику `runs` (0..N как история; в UI показывать только текущий артефакт; vNext: pruning до последнего run) — scope: `doc/SolidWorks-Flow/Architecture/DescriptionNode_ReviewSession_Architecture.md`, `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`, `doc/SolidWorks-Flow/Architecture/WorkflowTree_StepSplit_Architecture.md`; expected commit message: `docs(workflow-tree): clarify runs policy` (obsolete: superseded by Phase 63)
2. [DONE] Git Commit: `docs(workflow-tree): clarify runs policy` (hash: f14a1ccf)

### Stream: Docs — Step branches for all steps
1. [DONE] Doc: зафиксировать правило “каждый Step — треугольник + ветка актуальных артефактов/сессий (persisted), ветка обновляется по мере прохождения” — scope: `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`, `doc/SolidWorks-Flow/Architecture/WorkflowTree_StepSplit_Architecture.md`, `doc/SolidWorks-Flow/Architecture/DescriptionNode_ReviewSession_Architecture.md`; expected commit message: `docs(workflow-tree): apply step branch pattern`
2. [DONE] Git Commit: `docs(workflow-tree): apply step branch pattern` (hash: 4c6eeaed)

### Stream: Design — Session Continuity (CRITICAL)
1. [DONE] Doc: описать модуль `Session Continuity` (handoff-отчёт при <=25% контекста, rollover в новую сессию, agent-specific instructions) — scope: `doc/Project_Docs/SessionContinuity/SessionContinuity_Architecture.md`; expected commit message: `docs(session-continuity): add architecture`
2. [DONE] Git Commit: `docs(session-continuity): add architecture` (hash: 40285931)
3. [DONE] Doc: отметить `Session Continuity` как критичную инфраструктуру Core — scope: `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`; expected commit message: `docs(system): mark session continuity as critical`
4. [DONE] Git Commit: `docs(system): mark session continuity as critical` (hash: b3461817)
5. [TODO] Feat(core): реализовать `Session Continuity` (monitor tokenUsage, генерация `handoff-report.md`, rollover в новую сессию, persistence цепочки); scope: `packages/core/src/...`; expected commit message: `feat(core): add session continuity handoff`
6. [TODO] Git Commit: `feat(core): add session continuity handoff` (hash: TBD)
7. [TODO] Feat(project-manager): отобразить цепочку сессий (handoff history) под Step + доступ к `handoff-report.md`; scope: `src/client/project-manager/...`; expected commit message: `feat(project-manager): show session continuity chain`
8. [TODO] Git Commit: `feat(project-manager): show session continuity chain` (hash: TBD)

### Stream: Prompting — Description Agent без уточняющих вопросов
1. [TODO] Change: обновить промпт Description Agent так, чтобы он создавал `description.md` без вопросов (one-shot), вопросы переносим в Reviewer — scope: `packages/agents/description-agent/assets/description-collector-prompt.md`; expected commit message: `docs(description): one-shot description prompt (no questions)`
2. [TODO] Git Commit: `docs(description): one-shot description prompt (no questions)` (hash: TBD)

### Stream: Agent Packages — Reviewer Agent (new)
1. [TODO] Feat(agents): создать `packages/agents/reviewer-agent` (facade + assets) для критичного review `description.md` и генерации `Final_Description.md`; scope: `packages/agents/reviewer-agent/*`, `package.json`, `package-lock.json`; expected commit message: `feat(reviewer-agent): scaffold reviewer agent package`
2. [TODO] Git Commit: `feat(reviewer-agent): scaffold reviewer agent package` (hash: TBD)

### Stream: Reviewer Sessions — хранение и resume
1. [TODO] Feat(core): персистить состояние шага `Description` (пути/refs на `questionnaire.md`, текущий draft/final артефакт, `SessionRef` активной сессии) — scope: `packages/core/src/...`; expected commit message: `feat(workflow-tree): persist description step state`
2. [TODO] Git Commit: `feat(workflow-tree): persist description step state` (hash: TBD)
3. [TODO] Feat(project-manager): отображать шаги как треугольники и показывать/обновлять ветку `Description` (questionnaire/session/draft/final) + кнопка Continue для reviewer-сессии — scope: `src/client/project-manager/...`; expected commit message: `feat(project-manager): description step branch + continue reviewer session`
4. [TODO] Git Commit: `feat(project-manager): description step branch + continue reviewer session` (hash: TBD)

### Stream: Rebuild downstream
1. [TODO] Feat(core): при “Edit” раннего узла помечать downstream узлы как OUTDATED и предлагать Rebuild — scope: `packages/core/src/...`; expected commit message: `feat(workflow-tree): mark downstream nodes outdated on edit`
2. [TODO] Git Commit: `feat(workflow-tree): mark downstream nodes outdated on edit` (hash: TBD)

---

## Phase 63 — Remove RUNS entity (use Edit Step + single current artifacts) (owner: Oleksandr, updated: 2026-01-20)

### Stream: Design — Remove runs (docs sync)
1. [DONE] Doc: зафиксировать “без runs” для Workflow Tree (Edit Step, канон путей без `runs/`, без `currentRunId`) — scope: `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`, `doc/SolidWorks-Flow/Architecture/WorkflowTree_StepSplit_Architecture.md`, `doc/SolidWorks-Flow/Architecture/DescriptionNode_ReviewSession_Architecture.md`; expected commit message: `docs(workflow-tree): remove runs (use edit)`
2. [DONE] Git Commit: `docs(workflow-tree): remove runs (use edit)` (hash: fe2f5218)
3. [DONE] Doc: убрать `runs` из file-first workflow (SystemArchitecture + Watcher Architecture) — scope: `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`, `doc/Project_Docs/Workflow_CLI_Steps_And_Watcher_Architecture.md`; expected commit message: `docs(core): remove runs from file-first workflow`
4. [DONE] Git Commit: `docs(core): remove runs from file-first workflow` (hash: 98c2caf0)
5. [DONE] Doc: убрать `runSlug` из Questionnaire Curator (использовать session checkpoints) — scope: `doc/Project_Docs/QuestionnaireCurator/QuestionnaireCurator_Architecture.md`; expected commit message: `docs(curator): remove runSlug (use session checkpoints)`
6. [DONE] Git Commit: `docs(curator): remove runSlug (use session checkpoints)` (hash: 50844126)

### Stream: Implementation — Initiatives storage without runs
1. [IN_PROGRESS] Refactor(initiatives): удалить `RunStore` и run-path helpers из exports — scope: `packages/initiatives/src/index.ts`, `packages/initiatives/src/run-store.ts`, `packages/initiatives/package.json`; expected commit message: `refactor(initiatives): remove run store`
2. [TODO] Git Commit: `refactor(initiatives): remove run store` (hash: TBD)
3. [TODO] Refactor(initiatives): убрать `currentRunId` из `initiative.json` — scope: `packages/initiatives/src/initiative-store.ts`; expected commit message: `refactor(initiatives): drop currentRunId`
4. [TODO] Git Commit: `refactor(initiatives): drop currentRunId` (hash: TBD)

### Stream: Implementation — Core: remove RunStore usage
1. [DONE] Refactor(core): убрать auto-run создание (без `RunStore`) — scope: `packages/core/src/remote-bridge/handlers/auto-run-service.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit message: `refactor(core): remove auto-run service`
2. [DONE] Git Commit: `refactor(core): remove auto-run service` (hash: 31cbdd86)
3. [DONE] Refactor(core): убрать `RunStore`-синхронизацию анкеты при записи — scope: `packages/core/src/remote-bridge/handlers/workspace-file-service.ts`; expected commit message: `refactor(core): drop run questionnaire sync`
4. [DONE] Git Commit: `refactor(core): drop run questionnaire sync` (hash: 90238eea)
5. [DONE] Refactor(core): убрать `RunStore` из создания инициатив (без initial run) — scope: `packages/core/src/remote-bridge/handlers/initiatives-http-handler.ts`; expected commit message: `refactor(core): remove initial run creation`
6. [DONE] Git Commit: `refactor(core): remove initial run creation` (hash: 8fa643ec)

### Stream: Implementation — Workflow artifact paths (no `runs/`)
1. [DONE] Refactor(core): убрать `runs/` из путей workflow-артефактов (watcher + allowlist + artifact-upsert) — scope: `packages/core/src/workflow/paths/workflow-artifact-paths.ts`, `packages/core/src/workflow/watcher/workflow-watcher.ts`, `packages/core/src/remote-bridge/handlers/http-api-router.ts`; expected commit message: `refactor(core): remove runs from workflow paths`
2. [DONE] Git Commit: `refactor(core): remove runs from workflow paths` (hash: 2221ac6a)
3. [DONE] Refactor(core): убрать `runSlug` из workflow state/gates — scope: `packages/core/src/workflow/state/workflow-state-types.ts`, `packages/core/src/workflow/state/workflow-state-store.ts`, `packages/core/src/workflow/gates/workflow-gates-facade.ts`; expected commit message: `refactor(core): drop runSlug from workflow state`
4. [DONE] Git Commit: `refactor(core): drop runSlug from workflow state` (hash: cd7f1d39)
5. [DONE] Refactor(core): убрать `runSlug` из watcher events — scope: `packages/core/src/workflow/watcher/watcher-types.ts`, `packages/core/src/workflow/watcher/workflow-watcher.ts`; expected commit message: `refactor(core): drop runSlug from workflow watcher events`
6. [DONE] Git Commit: `refactor(core): drop runSlug from workflow watcher events` (hash: 60a8479d)
7. [DONE] Refactor(core): убрать `runSlug` из workflow artifact path типов — scope: `packages/core/src/workflow/paths/workflow-paths-types.ts`, `packages/core/src/workflow/paths/workflow-artifact-paths.ts`; expected commit message: `refactor(core): drop runSlug from artifact path types`
8. [DONE] Git Commit: `refactor(core): drop runSlug from artifact path types` (hash: 1b43c97c)

### Stream: Implementation — Remote bridge / session context (remove runSlug)
1. [DONE] Refactor(ui): обновить пути idea-артефактов без `runs/` (output paths + UI copy) — scope: `src/client/ui/src/app-host/session-region-idea-paths.ts`, `src/client/ui/src/app-host/idea-kickoff-prompt.ts`, `media/react-chat.js`; expected commit message: `refactor(ui): remove runs from idea output paths`
2. [DONE] Git Commit: `refactor(ui): remove runs from idea output paths` (hash: a01abb29)
3. [DONE] Refactor(ui): обновить резолвер анкеты idea без `runSlug` (legacy runs остаются) — scope: `src/client/ui/src/services/idea-questionnaire-paths.ts`, `media/react-chat.js`; expected commit message: `refactor(ui): update idea questionnaire paths`
4. [DONE] Git Commit: `refactor(ui): update idea questionnaire paths` (hash: baabcfa1)
5. [DONE] Refactor(ui): убрать `runSlug` из session:create в core-bridge (DOM resolver + payload) — scope: `src/client/ui/src/core-bridge/session-context-resolver.ts`, `src/client/ui/src/core-bridge/core-bridge.ts`, `media/react-chat.js`; expected commit message: `refactor(ui): drop runSlug from session create`
6. [DONE] Git Commit: `refactor(ui): drop runSlug from session create` (hash: 18acd26a)
7. [DONE] Refactor(ui): убрать `runSlug` из нормализации сессий — scope: `src/client/ui/src/core-bridge/normalizers.ts`, `media/react-chat.js`; expected commit message: `refactor(ui): drop runSlug normalization`
8. [DONE] Git Commit: `refactor(ui): drop runSlug normalization` (hash: e2ce98a1)
9. [DONE] Refactor(ui+types): удалить `runSlug` из session record типов — scope: `src/types/session.ts`, `src/client/ui/src/core-bridge/types.ts`, `media/react-chat.js`; expected commit message: `refactor(ui): remove runSlug from session types`
10. [DONE] Git Commit: `refactor(ui): remove runSlug from session types` (hash: 4f757a7d)
11. [DONE] Refactor(core): убрать `runSlug` из session:create payloads — scope: `packages/core/src/remote-bridge/types.ts`, `packages/core/src/remote-bridge/index.ts`, `packages/core/src/remote-bridge/handlers/workspace-session-service.ts`; expected commit message: `refactor(core): drop runSlug from session create payload`
12. [DONE] Git Commit: `refactor(core): drop runSlug from session create payload` (hash: 91d06fcb)

### Stream: Implementation — Core: remove runs endpoints
1. [DONE] Refactor(core): удалить `/initiatives/:initiativeSlug/runs` API endpoints (runs list/create/select-current) — scope: `packages/core/src/remote-bridge/handlers/http-api-router.ts`, `packages/core/src/remote-bridge/handlers/runs-http-handler.ts`; expected commit message: `refactor(core): remove runs endpoints`
2. [DONE] Git Commit: `refactor(core): remove runs endpoints` (hash: aeaa16f5)

### Stream: Implementation — UI: remove run picker, switch to Edit Step
1. [DONE] Refactor(ui): удалить run picker (list/create/select) и runs-client в webview UI — scope: `src/client/ui/src/app-host/session-region.tsx`, `src/client/ui/src/api/orchestrator/runs-client.ts`, `src/client/ui/src/app-host/description-run-picker.tsx`; expected commit message: `refactor(ui): remove run picker (use edit step)`
2. [DONE] Git Commit: `refactor(ui): remove run picker (use edit step)` (hash: ab574fd7)
3. [DONE] Build(webview): пересобрать webview bundle после удаления run picker — scope: `media/react-chat.js`; expected commit message: `chore(webview): rebuild bundle`
4. [DONE] Git Commit: `chore(webview): rebuild bundle` (hash: 2ecbf54c)

### Stream: Implementation — Project Manager prompt pack paths
1. [DONE] Refactor(project-manager): убрать `runs/` из prompt-pack builder, использовать новые каноничные пути без runs — scope: `src/client/project-manager/services/prompt-pack-builder.ts`, `src/client/project-manager/services/idea-collector-submit-service.ts`; expected commit message: `refactor(project-manager): drop runs from prompt pack`
2. [DONE] Git Commit: `refactor(project-manager): drop runs from prompt pack` (hash: bdad937e)
3. [DONE] Docs(project-manager): актуализировать UI copy про путь артефакта `Description` (без `runs/`) — scope: `src/client/project-manager/components/description/description-questionnaire-panel.tsx`; expected commit message: `docs(project-manager): update description artifact path`
4. [DONE] Git Commit: `docs(project-manager): update description artifact path` (hash: 2a9b7235)
5. [DONE] Refactor(project-manager): убрать `runSlug` из workflow events client + API types — scope: `src/client/project-manager/services/workflow-events-client.ts`, `src/client/project-manager/api.ts`, `src/client/project-manager/services/idea-collector-submit-service.ts`; expected commit message: `refactor(project-manager): drop runSlug from workflow events`
6. [DONE] Git Commit: `refactor(project-manager): drop runSlug from workflow events` (hash: a4189fc6)
