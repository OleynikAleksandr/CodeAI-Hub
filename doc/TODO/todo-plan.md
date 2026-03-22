# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед работой по этому scope открыть: `AGENTS.md`, `doc/SolidWorks-WorkFlow/README.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`, `doc/SolidWorks-WorkFlow/Plans/PostRelease_Regression_Feedback_Architecture.md`, `doc/Sessions/Session123.md`, `doc/Sessions/Session124.md`
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`
- Husky gates не обходить (`--no-verify` запрещен)
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита
- Перед закрытием stream выполнять таргетные проверки затронутых пакетов/клиентов
- После закрытия release stream: выполнить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, записать результаты в `doc/Sessions/`

---

## Phase 27 — Post-Release Regression Feedback Loop (owner: Oleksandr, updated: 2026-03-22)

### Stream: Planning baseline
1. [DONE] Заархивировать завершённый `Phase 26` plan, создать planning-doc под post-release regression feedback loop и открыть новый execution plan, где дальнейшие фиксы будут появляться только из подтверждённых user-observed findings на релизе `1.1.762` (scope: `doc/TODO/Archive/todo-plan-up-to-phase26-2026-03-22.md`, `doc/SolidWorks-WorkFlow/Plans/PostRelease_Regression_Feedback_Architecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(plan): start post-release regression feedback scope`).
2. [DONE] Git Commit: `docs(plan): start post-release regression feedback scope` (hash: `17e23bee`)

### Stream: Session handoff baseline
1. [DONE] Создать session report для нового `Phase 27` scope и синхронизировать active `todo-plan` после planning reset, явно зафиксировав, что code/runtime fixes ещё не начаты, а план находится в intake-mode до первого accepted system-level finding (scope: `doc/Sessions/Session124.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(session): record post-release regression handoff`).
2. [DONE] Git Commit: `docs(session): record post-release regression handoff` (hash: `827d9ddf`)

### Stream: Regression intake and classification
1. [DONE] Классифицировать первый принятый regression finding для `Description Help`: текущая фраза про `Submit questionnaire` и продолжение диалога даёт неверную UX-модель, потому что не упоминает provider picker и искажает условие продолжения диалога; зафиксировать кейс как `runtime/UI drift` и переписать plan из intake-mode в конкретный fix-stream (scope: `doc/TODO/todo-plan.md`; expected commit: `docs(plan): classify description help provider-picker drift`).
2. [DONE] Git Commit: `docs(plan): classify description help provider-picker drift` (hash: `e4357c39`)

### Stream: Description Help provider-picker copy alignment
1. [DONE] Исправить source-of-truth copy для `Description Help`, чтобы текст явно отражал фактический UX: после `Submit questionnaire` открывается выбор AI-провайдера, в MVP провайдер выбирается один раз на весь workflow workspace, а диалог продолжается до тех пор, пока пользователь не сочтёт документ достаточно сильной основой для следующего шага (scope: `src/client/project-manager/components/description/description-step-help.tsx`, `packages/agents/description-agent/assets/description-template.md`; expected commit: `fix(description): align help copy with provider picker flow`).
2. [DONE] Git Commit: `fix(description): align help copy with provider picker flow` (hash: `a83448bd`)
3. [DONE] Синхронизировать generated bundled template после обновления source markdown, чтобы `TemplateSyncService` и runtime contract восстанавливали уже новый `Description Help`, а не старую формулировку (scope: `packages/core/src/templates/bundled-templates.ts`; expected commit: `chore(templates): refresh bundled description help copy`).
4. [DONE] Git Commit: `chore(templates): refresh bundled description help copy` (hash: `d845e59f`)
5. [DONE] Обновить защитные тесты на локальный PM help и synced template, чтобы новый текст не разъехался между help-component и bundled template и чтобы regression явно ловил возврат старой формулировки (scope: `src/client/project-manager/components/description/description-step-help.test.ts`, `packages/core/src/templates/template-sync-service.test.ts`, `packages/core/src/remote-bridge/handlers/idea-contract-service.virtual-simulation.test.ts`; expected commit: `test(description): guard help provider picker wording`).
6. [DONE] Git Commit: `test(description): guard help provider picker wording` (hash: `c51a7a9d`)

### Stream: Ongoing regression intake
1. [IN_PROGRESS] Продолжать принимать следующие user-observed findings на релизе `1.1.762`, классифицировать их по модели из planning-doc и открывать новые stage-local fix-stream только после подтверждённого system-level кейса (scope: `doc/SolidWorks-WorkFlow/Plans/PostRelease_Regression_Feedback_Architecture.md`, `doc/TODO/todo-plan.md`, `doc/Sessions/Session124.md`; expected commit: `docs(plan): classify next regression finding`).
2. [TODO] Git Commit: `docs(plan): classify next regression finding` (hash: TBD)

### Stream: Diagram prompt appendix deduplication
1. [DONE] Классифицировать новый accepted finding для `Diagram Modules` и проверить `Diagram Facades`: runtime prompt дублирует appendix-блоки `Field Reference` и `Merge Rules`, потому что при наличии synced template и fallback asset оба источника одновременно попадают в итоговый prompt; зафиксировать кейс как `runtime/contract drift` и открыть локальный hotfix-stream (scope: `doc/TODO/todo-plan.md`; expected commit: `docs(plan): classify diagram prompt appendix duplication`).
2. [TODO] Git Commit: `docs(plan): classify diagram prompt appendix duplication` (hash: TBD)
3. [TODO] Исправить workflow contract loader так, чтобы для каждого diagram appendix-блока выбирался ровно один источник `synced-or-fallback`, и закрыть regression тестами на отсутствие дублей в `Diagram Modules` и `Diagram Facades` prompt (scope: `packages/core/src/remote-bridge/handlers/diagram-contract-prompt-assets.ts`, `packages/core/src/remote-bridge/handlers/idea-contract-service.ts`, `packages/core/src/remote-bridge/handlers/idea-contract-service.diagram-stages.test.ts`; expected commit: `fix(diagram-prompts): dedupe prompt appendix sources`).
4. [TODO] Git Commit: `fix(diagram-prompts): dedupe prompt appendix sources` (hash: TBD)

### Stream: Release build after accepted fixes
1. [BLOCKED] После закрытия принятых фиксов и таргетной верификации выполнить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, зафиксировать новый regression baseline и оформить новый session report (scope: release/version docs and session files to be determined by accepted fixes; expected commit: `chore(release): prepare next regression feedback release`).
2. [BLOCKED] Git Commit: `chore(release): prepare next regression feedback release` (hash: TBD)

## Notes
- Archived completed rollout plan:
  - `doc/TODO/Archive/todo-plan-up-to-phase26-2026-03-22.md`
- Active planning doc for this scope:
  - `doc/SolidWorks-WorkFlow/Plans/PostRelease_Regression_Feedback_Architecture.md`
- Current validated release baseline:
  - `codeai-hub-1.1.762.vsix`
- The first accepted system-level finding for `Description Help` is closed; further scope expansion now depends only on the next confirmed regression case from live testing.
