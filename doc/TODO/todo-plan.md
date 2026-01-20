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
1. [TODO] Refactor(initiatives): убрать `runs`/`RunStore`/`runSlug` из пакета `@codeai-hub/initiatives` (заменить на single-current step storage) — scope: `packages/initiatives/src/index.ts`, `packages/initiatives/src/run-store.ts`, `packages/initiatives/package.json`; expected commit message: `refactor(initiatives): remove runs model`
2. [TODO] Git Commit: `refactor(initiatives): remove runs model` (hash: TBD)

### Stream: Implementation — Workflow artifact paths without runSlug
1. [TODO] Refactor(core): убрать `runSlug` из `resolveWorkflowArtifactPaths` и allowlist, обновить watcher-конвенции путей — scope: `packages/core/src/workflow/paths/workflow-artifact-paths.ts`, `packages/core/src/workflow/paths/workflow-paths-types.ts`, `packages/core/src/workflow/watcher/watcher-types.ts`; expected commit message: `refactor(core): remove runSlug from workflow paths`
2. [TODO] Git Commit: `refactor(core): remove runSlug from workflow paths` (hash: TBD)

### Stream: Implementation — Remote bridge / session context (remove runSlug)
1. [TODO] Refactor(core+types): убрать `runSlug` из remote-bridge session context payloads и shared session types — scope: `packages/core/src/remote-bridge/types.ts`, `src/types/session.ts`, `src/client/ui/src/core-bridge/types.ts`; expected commit message: `refactor(core): drop runSlug from session context`
2. [TODO] Git Commit: `refactor(core): drop runSlug from session context` (hash: TBD)

### Stream: Implementation — UI: remove run picker, switch to Edit Step
1. [TODO] Refactor(ui): удалить run picker для `description` и привязать UI к “single current artifact” + `Edit Step` — scope: `src/client/ui/src/app-host/session-region.tsx`, `src/client/ui/src/core-bridge/core-bridge.ts`, `src/client/ui/src/core-bridge/session-context-resolver.ts`; expected commit message: `refactor(ui): remove run picker (use edit step)`
2. [TODO] Git Commit: `refactor(ui): remove run picker (use edit step)` (hash: TBD)

### Stream: Implementation — Project Manager prompt pack paths
1. [TODO] Refactor(project-manager): убрать `runSlug` из prompt-pack builder, использовать новые каноничные пути без runs — scope: `src/client/project-manager/services/prompt-pack-builder.ts`, `src/client/project-manager/services/workflow-events-client.ts`, `src/client/project-manager/api.ts`; expected commit message: `refactor(project-manager): drop runSlug from prompt pack`
2. [TODO] Git Commit: `refactor(project-manager): drop runSlug from prompt pack` (hash: TBD)
