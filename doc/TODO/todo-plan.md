# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- TODO Plan состоит из Phase (Фаз). В каждой Phase несколько Stream с микрозадачами.
- Каждая микрозадача затрагивает ≤ 3 файлов.
- Каждая микрозадача оформляется парой пунктов: (1) изменения, (2) `Git Commit: ...` отдельной строкой.
- Gates после каждой микрозадачи: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`
3. `doc/SolidWorks-Flow/Architecture/WorkflowTree_StepSplit_Architecture.md`
4. `doc/TODO/todo-plan.md`

---

## Phase 62 — Workflow Tree: Description Node = Final Artifact + Reviewer Session (owner: Oleksandr, updated: 2026-01-19)

### Stream: Design — Artifact-first + Resume Sessions
1. [TODO] Doc: зафиксировать решение “узел хранит только final артефакт + sessionRef на reviewer-сессию (возобновляемая)”; провайдеры resume: Claude/Codex, Gemini исключить — scope: `doc/SolidWorks-Flow/Architecture/DescriptionNode_ReviewSession_Architecture.md`; expected commit message: `docs(workflow-tree): define description node artifact+review session`
2. [TODO] Git Commit: `docs(workflow-tree): define description node artifact+review session` (hash: TBD)

### Stream: Prompting — Description Agent без уточняющих вопросов
1. [TODO] Change: обновить промпт Description Agent так, чтобы он создавал `description.md` без вопросов (one-shot), вопросы переносим в Reviewer — scope: `packages/agents/description-agent/assets/description-collector-prompt.md`; expected commit message: `docs(description): one-shot description prompt (no questions)`
2. [TODO] Git Commit: `docs(description): one-shot description prompt (no questions)` (hash: TBD)

### Stream: Reviewer Sessions — хранение и resume
1. [TODO] Feat(core+ui): добавить сущность `sessionRef` в артефакт узла (provider + sessionId + jsonlPath) и кнопку Continue для reviewer-сессии — scope: `packages/core/src/...`, `src/client/project-manager/...`, `src/client/ui/...`; expected commit message: `feat(workflow-tree): persist reviewer sessionRef and allow resume`
2. [TODO] Git Commit: `feat(workflow-tree): persist reviewer sessionRef and allow resume` (hash: TBD)

### Stream: Rebuild downstream
1. [TODO] Feat(core): при “Edit” раннего узла помечать downstream узлы как OUTDATED и предлагать Rebuild — scope: `packages/core/src/...`; expected commit message: `feat(workflow-tree): mark downstream nodes outdated on edit`
2. [TODO] Git Commit: `feat(workflow-tree): mark downstream nodes outdated on edit` (hash: TBD)
