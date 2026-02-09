# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- TODO Plan состоит из Phase (Фаз). В каждой Phase несколько Stream с микрозадачами.
- Каждая микрозадача затрагивает ≤ 3 файлов.
- Каждая микрозадача оформляется парой пунктов: (1) изменения, (2) `Git Commit: ...` отдельной строкой.
- Gates после каждой микрозадачи: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/Workflow/Workflow_CLI_Steps_And_Watcher_Architecture.md`
3. `doc/SolidWorks-Flow/System/QuestionnaireCurator/QuestionnaireCurator_Architecture.md`
4. `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`
5. `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`
6. `doc/SolidWorks-Flow/Architecture/DescriptionNode_ReviewSession_Architecture.md`
7. `doc/SolidWorks-Flow/SessionContinuity/Core/SessionContinuity_Architecture.md`
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
1. [DONE] Doc: уточнить алгоритм шага `Description` (треугольник + цвета TODO/IN_PROGRESS/DONE, persisted `questionnaire.md`, resume sessions, авто-старт reviewer, `Final_Description.md` как единственный source-of-truth; статусы BLOCKED/ERROR/OUTDATED — отложить) — scope: `doc/SolidWorks-Flow/Architecture/DescriptionNode_ReviewSession_Architecture.md`, `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`, `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`; expected commit message: `docs(workflow-tree): refine description step lifecycle`
2. [DONE] Git Commit: `docs(workflow-tree): refine description step lifecycle` (hash: b8ccbbe2)

### Stream: Design — Runs policy (history vs current)
1. [DONE] Doc: уточнить политику `runs` (0..N как история; в UI показывать только текущий артефакт; vNext: pruning до последнего run) — scope: `doc/SolidWorks-Flow/Architecture/DescriptionNode_ReviewSession_Architecture.md`, `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`, `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`; expected commit message: `docs(workflow-tree): clarify runs policy` (obsolete: superseded by Phase 63)
2. [DONE] Git Commit: `docs(workflow-tree): clarify runs policy` (hash: f14a1ccf)

### Stream: Docs — Step branches for all steps
1. [DONE] Doc: зафиксировать правило “каждый Step — треугольник + ветка актуальных артефактов/сессий (persisted), ветка обновляется по мере прохождения” — scope: `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`, `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`, `doc/SolidWorks-Flow/Architecture/DescriptionNode_ReviewSession_Architecture.md`; expected commit message: `docs(workflow-tree): apply step branch pattern`
2. [DONE] Git Commit: `docs(workflow-tree): apply step branch pattern` (hash: 4c6eeaed)

### Stream: Design — Session Continuity (CRITICAL)
1. [DONE] Doc: описать модуль `Session Continuity` (handoff-отчёт при <=25% контекста, rollover в новую сессию, agent-specific instructions) — scope: `doc/SolidWorks-Flow/SessionContinuity/Core/SessionContinuity_Architecture.md`; expected commit message: `docs(session-continuity): add architecture`
2. [DONE] Git Commit: `docs(session-continuity): add architecture` (hash: 40285931)
3. [DONE] Doc: отметить `Session Continuity` как критичную инфраструктуру Core — scope: `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `docs(system): mark session continuity as critical`
4. [DONE] Git Commit: `docs(system): mark session continuity as critical` (hash: b3461817)
5. [DONE] Feat(core): добавить модели continuity chain + file-store — scope: `packages/core/src/session-continuity/continuity-types.ts`, `packages/core/src/session-continuity/continuity-store.ts`, `packages/core/src/session-continuity/index.ts`; expected commit message: `feat(core): add session continuity store`
6. [DONE] Git Commit: `feat(core): add session continuity store` (hash: c7dd5e7a)
7. [DONE] Feat(core): добавить token usage extractor + монитор — scope: `packages/core/src/session-continuity/token-usage.ts`, `packages/core/src/session-continuity/continuity-monitor.ts`, `packages/core/src/session-continuity/continuity-types.ts`; expected commit message: `feat(core): add continuity token monitor`
8. [DONE] Git Commit: `feat(core): add continuity token monitor` (hash: 960bcde4)
9. [DONE] Feat(core): добавить handoff prompt/report writer — scope: `packages/core/src/session-continuity/handoff-prompt-builder.ts`, `packages/core/src/session-continuity/handoff-report-writer.ts`, `packages/core/src/session-continuity/continuity-types.ts`; expected commit message: `feat(core): add handoff report writer`
10. [DONE] Git Commit: `feat(core): add handoff report writer` (hash: 3804cb17)
11. [DONE] Feat(core): интегрировать continuity в session handler + rollover — scope: `packages/core/src/session-continuity/session-continuity-facade.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/index.ts`; expected commit message: `feat(core): add session continuity handoff`
12. [DONE] Git Commit: `feat(core): add session continuity handoff` (hash: 10e25830)
13. [DONE] Feat(core): отдать continuity chain в workflow-state API — scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`, `packages/core/src/session-continuity/session-continuity-facade.ts`, `packages/core/src/session-continuity/continuity-store.ts`; expected commit message: `feat(core): expose continuity chain`
14. [DONE] Git Commit: `feat(core): expose continuity chain` (hash: f0b42087)
15. [DONE] Feat(project-manager): отобразить цепочку сессий (handoff history) под Step + доступ к `handoff-report.md`; scope: `src/client/project-manager/...`; expected commit message: `feat(project-manager): show session continuity chain`
16. [DONE] Git Commit: `feat(project-manager): show session continuity chain` (hash: 8b6c73f1)

### Stream: Prompting — Description Agent без уточняющих вопросов
1. [DONE] Change: обновить промпт Description Agent так, чтобы он создавал `description.md` без вопросов (one-shot), вопросы переносим в Reviewer — scope: `packages/agents/description-agent/assets/description-collector-prompt.md`; expected commit message: `docs(description): one-shot description prompt (no questions)`
2. [DONE] Git Commit: `docs(description): one-shot description prompt (no questions)` (hash: 5c4732d7)

### Stream: Agent Packages — Reviewer Agent (new)
1. [DONE] Feat(reviewer-agent): scaffold package (facade + index + package.json) — scope: `packages/agents/reviewer-agent/package.json`, `packages/agents/reviewer-agent/src/facade.ts`, `packages/agents/reviewer-agent/src/index.ts`; expected commit message: `feat(reviewer-agent): scaffold package`
2. [DONE] Git Commit: `feat(reviewer-agent): scaffold package` (hash: 4e1efb91)
3. [DONE] Feat(reviewer-agent): добавить ассеты reviewer prompt/template — scope: `packages/agents/reviewer-agent/assets/reviewer-prompt.md`, `packages/agents/reviewer-agent/assets/reviewer-template.md`; expected commit message: `feat(reviewer-agent): add prompt assets`
4. [DONE] Git Commit: `feat(reviewer-agent): add prompt assets` (hash: 5194981c)
5. [DONE] Chore(repo): зарегистрировать reviewer-agent в workspace — scope: `package.json`, `package-lock.json`; expected commit message: `chore(repo): add reviewer-agent workspace`
6. [DONE] Git Commit: `chore(repo): add reviewer-agent workspace` (hash: d2b879af)

### Stream: Reviewer Sessions — хранение и resume
1. [DONE] Feat(core): добавить модели/хранилище состояния `Description` — scope: `packages/core/src/workflow/description/description-step-types.ts`, `packages/core/src/workflow/description/description-step-store.ts`, `packages/core/src/workflow/description/index.ts`; expected commit message: `feat(workflow-tree): add description step store`
2. [DONE] Git Commit: `feat(workflow-tree): add description step store` (hash: c1e2a368)
3. [DONE] Feat(core): сохранять `SessionRef` description-сессии — scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/workflow/description/description-step-store.ts`; expected commit message: `feat(workflow-tree): persist description session ref`
4. [DONE] Git Commit: `feat(workflow-tree): persist description session ref` (hash: c28b0db7)
5. [DONE] Feat(core): отдать ветку `Description` в workflow-state API — scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`, `packages/core/src/workflow/description/description-step-store.ts`, `packages/core/src/workflow/description/description-step-types.ts`; expected commit message: `feat(workflow-tree): expose description branch`
6. [DONE] Git Commit: `feat(workflow-tree): expose description branch` (hash: 0fe3c780)
7. [DONE] Feat(project-manager): отображать шаги как треугольники и показывать/обновлять ветку `Description` (questionnaire/session/draft/final) + кнопка Continue для reviewer-сессии — scope: `src/client/project-manager/...`; expected commit message: `feat(project-manager): description step branch + continue reviewer session`
8. [DONE] Git Commit: `feat(project-manager): description step branch + continue reviewer session` (hash: 787ddb70)

### Stream: Rebuild downstream
1. [DONE] Feat(core): помечать downstream как OUTDATED при новом артефакте раннего шага — scope: `packages/core/src/workflow/state/workflow-state-types.ts`, `packages/core/src/workflow/state/workflow-state-store.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`; expected commit message: `feat(workflow-tree): mark downstream nodes outdated on edit`
2. [DONE] Git Commit: `feat(workflow-tree): mark downstream nodes outdated on edit` (hash: b6a71d4d)


### Stream: Project Manager — workflow outdated status
1. [DONE] Feat(project-manager): поддержать `outdated` в парсере workflow state — scope: `src/client/project-manager/services/workflow-state-client.ts`; expected commit message: `feat(project-manager): parse outdated workflow status`
2. [DONE] Git Commit: `feat(project-manager): parse outdated workflow status` (hash: 52b48ee4)
3. [DONE] Feat(project-manager): отобразить `outdated` в дереве + стиль — scope: `src/client/project-manager/components/layout/workspace-tree.tsx`, `packages/ui/project-manager/styles.css`; expected commit message: `feat(project-manager): display outdated workflow status`
4. [DONE] Git Commit: `feat(project-manager): display outdated workflow status` (hash: 43c99ed3)
5. [DONE] Fix(project-manager): стабилизировать типизацию description-ветки (без ложных элементов) — scope: `src/client/project-manager/components/layout/workspace-tree.tsx`; expected commit message: `fix(project-manager): tighten description branch nodes`
6. [DONE] Git Commit: `fix(project-manager): tighten description branch nodes` (hash: d9eef652)
7. [DONE] Fix(project-manager): убрать nullable элементы в description-ветке (typecheck) — scope: `src/client/project-manager/components/layout/workspace-tree.tsx`; expected commit message: `fix(project-manager): avoid nullable description nodes`
8. [DONE] Git Commit: `fix(project-manager): avoid nullable description nodes` (hash: 62cc9bca)

---

## Phase 63 — Remove RUNS entity (use Edit Step + single current artifacts) (owner: Oleksandr, updated: 2026-01-20)

### Stream: Design — Remove runs (docs sync)
1. [DONE] Doc: зафиксировать “без runs” для Workflow Tree (Edit Step, канон путей без `runs/`, без `currentRunId`) — scope: `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`, `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`, `doc/SolidWorks-Flow/Architecture/DescriptionNode_ReviewSession_Architecture.md`; expected commit message: `docs(workflow-tree): remove runs (use edit)`
2. [DONE] Git Commit: `docs(workflow-tree): remove runs (use edit)` (hash: fe2f5218)
3. [DONE] Doc: убрать `runs` из file-first workflow (SystemArchitecture + Watcher Architecture) — scope: `doc/SolidWorks-Flow/System/SystemArchitecture.md`, `doc/SolidWorks-Flow/Workflow/Workflow_CLI_Steps_And_Watcher_Architecture.md`; expected commit message: `docs(core): remove runs from file-first workflow`
4. [DONE] Git Commit: `docs(core): remove runs from file-first workflow` (hash: 98c2caf0)
5. [DONE] Doc: убрать `runSlug` из Questionnaire Curator (использовать session checkpoints) — scope: `doc/SolidWorks-Flow/System/QuestionnaireCurator/QuestionnaireCurator_Architecture.md`; expected commit message: `docs(curator): remove runSlug (use session checkpoints)`
6. [DONE] Git Commit: `docs(curator): remove runSlug (use session checkpoints)` (hash: 50844126)

### Stream: Implementation — Initiatives storage without runs
1. [DONE] Refactor(initiatives): удалить `RunStore` и run-path helpers из exports — scope: `packages/initiatives/src/index.ts`, `packages/initiatives/src/run-store.ts`, `packages/initiatives/package.json`; expected commit message: `refactor(initiatives): remove run store`
2. [DONE] Git Commit: `refactor(initiatives): remove run store` (hash: 275b08d1)
3. [DONE] Refactor(initiatives): убрать `currentRunId` из `initiative.json` — scope: `packages/initiatives/src/initiative-store.ts`; expected commit message: `refactor(initiatives): drop currentRunId`
4. [DONE] Git Commit: `refactor(initiatives): drop currentRunId` (hash: bca3c716)

### Stream: Implementation — Core: remove RunStore usage
1. [DONE] Refactor(core): убрать auto-run создание (без `RunStore`) — scope: `packages/core/src/remote-bridge/handlers/auto-run-service.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit message: `refactor(core): remove auto-run service`
2. [DONE] Git Commit: `refactor(core): remove auto-run service` (hash: 31cbdd86)
3. [DONE] Refactor(core): убрать `RunStore`-синхронизацию анкеты при записи — scope: `packages/core/src/remote-bridge/handlers/workspace-file-service.ts`; expected commit message: `refactor(core): drop run questionnaire sync`
4. [DONE] Git Commit: `refactor(core): drop run questionnaire sync` (hash: 90238eea)
5. [DONE] Refactor(core): убрать `RunStore` из создания инициатив (без initial run) — scope: `packages/core/src/remote-bridge/handlers/initiatives-http-handler.ts`; expected commit message: `refactor(core): remove initial run creation`
6. [DONE] Git Commit: `refactor(core): remove initial run creation` (hash: 8fa643ec)
7. [DONE] Refactor(core): убрать `RunStore` из session-request-handler (provider bindings / refine guard) — scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit message: `refactor(core): drop run store from session handler`
8. [DONE] Git Commit: `refactor(core): drop run store from session handler` (hash: e75e4f8e)

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
