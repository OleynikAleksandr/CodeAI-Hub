# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- TODO Plan состоит из Phase (Фаз). В каждой Phase некоторое количество Stream с микрозадачами.
- Каждая микрозадача затрагивает ≤ 3 файлов.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Gates после каждой микрозадачи: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.
- Коммит делаем только после зелёных гейтов; сразу обновляем статусы и hash.

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/Project_Docs/WorkflowStateFastRestore_Architecture.md`
3. `doc/Project_Docs/Workflow_CLI_Steps_And_Watcher_Architecture.md`
4. `doc/SolidWorks-Flow/knowledge/UnifiedSession_History_WorkspaceScoping.md`
5. `doc/Project_Docs/ProjectManager/CoreDriven_AutoResume_LastActive_Architecture.md` (THIS DESIGN)
6. `packages/core/src/unified-session/storage.ts` (workspaceKey rules)
7. `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`
8. `packages/core/src/remote-bridge/handlers/session-request-handler.ts`
9. `packages/core/src/workflow/description/description-step-store.ts`
10. `packages/ui/project-manager/dist/app.js` (current: UI-driven auto-resume)
11. `doc/Sessions/Session071.md` (THIS REPORT)

---

## Phase 88 — Core-driven auto-resume (Last Active) + workspace-safe validation (owner: Oleksandr, updated: 2026-02-02)

### Stream: design + approval
1. [DONE] Docs(architecture): согласовать Core-driven auto-resume (lastActive в workflow state, workspace identity rules, validation) — scope: `doc/Project_Docs/ProjectManager/CoreDriven_AutoResume_LastActive_Architecture.md`; expected commit message: `docs: approve core-driven auto-resume lastActive architecture`
2. [DONE] Git Commit: `docs: approve core-driven auto-resume lastActive architecture` (hash: 74017a2f)

### Stream: workflow state lastActive
3. [DONE] Feat(core): добавить `lastActive` snapshot в workflow state (persist + read API) для выбранного workspace — scope: ≤3 файлов в `packages/core/src/workflow/state/**` и/или `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`; expected commit message: `feat(core): persist workflow lastActive snapshot`
4. [DONE] Git Commit: `feat(core): persist workflow lastActive snapshot` (hash: 17196214)

### Stream: workspace activation API
5. [TODO] Feat(core): добавить/расширить API, чтобы Project Manager сообщал выбранный workspace (workspace activated) и Core мог инициировать resume lastActive — scope: ≤3 файлов в `packages/core/src/remote-bridge/**`; expected commit message: `feat(core): add workspace activate endpoint for auto-resume`
6. [TODO] Git Commit: `feat(core): add workspace activate endpoint for auto-resume` (hash: TBD)

### Stream: core-driven resume + validation
7. [TODO] Fix(core): на workspace activation Core делает pre-check принадлежности `providerSessionId` выбранному workspace (unified session history bucket + fallback scan), затем выполняет resume и бродкастит `session:created` — scope: ≤3 файлов в `packages/core/src/remote-bridge/handlers/**`; expected commit message: `fix(core): core-driven lastActive resume with workspace validation`
8. [TODO] Git Commit: `fix(core): core-driven lastActive resume with workspace validation` (hash: TBD)

### Stream: UI wiring (minimal)
9. [TODO] Feat(ui): при выборе workspace вызывать workspace activation endpoint (вместо прямого auto-resume из workflow state) — scope: ≤3 файлов в `packages/ui/project-manager/**` (исходники/бандл согласно текущей сборке); expected commit message: `feat(project-manager): trigger core-driven auto-resume on workspace select`
10. [TODO] Git Commit: `feat(project-manager): trigger core-driven auto-resume on workspace select` (hash: TBD)

### Stream: verification (owner-run)
11. [TODO] Verification(owner): после рестарта Core Project Manager открывает lastActive session+artifact; cross-workspace resume невозможен; очистка workspace-local `.codeai-hub/**` корректно отключает resume — scope: manual; expected commit message: `chore: verify core-driven auto-resume lastActive`
12. [TODO] Git Commit: `chore: verify core-driven auto-resume lastActive` (hash: TBD)

### Stream: session report
13. [TODO] Docs(session): создать отчёт `doc/Sessions/Session072.md` (implementation + verification Phase 88) — scope: `doc/Sessions/Session072.md`; expected commit message: `docs(session): Session072 core-driven auto-resume lastActive`
14. [TODO] Git Commit: `docs(session): Session072 core-driven auto-resume lastActive` (hash: TBD)
