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
2. [DONE] Git Commit: `docs(session): record post-release regression handoff` (hash: TBD)

### Stream: Regression intake and classification
1. [IN_PROGRESS] Во время live regression на `1.1.762` принимать пользовательский feedback по агентам, артефактам и help/runtime surface, классифицировать каждый кейс как `user-input issue`, `prompt/template/DoD issue`, `runtime/UI drift` или `non-issue`, и только после первого accepted system-level finding переписывать план в конкретные микро-задачи (scope: `doc/SolidWorks-WorkFlow/Plans/PostRelease_Regression_Feedback_Architecture.md`, `doc/TODO/todo-plan.md`, `doc/Sessions/Session124.md`; expected commit: `docs(plan): classify first regression findings`).
2. [TODO] Git Commit: `docs(plan): classify first regression findings` (hash: TBD)

### Stream: Stage-local fixes from accepted findings
1. [BLOCKED] После первого принятого system-level finding нарезать только минимальный stage-local fix scope без спекулятивного cross-stage cleanup; каждая микро-задача должна трогать не более `3` файлов и обновлять только реально затронутый surface (`prompt`, `help`, `template`, `validator/runtime contract`, `SSOT`) (scope: TBD after first accepted finding; expected commit: TBD).
2. [BLOCKED] Git Commit: `TBD` (hash: TBD)

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
- Until the first accepted system-level finding arrives, this plan intentionally stays in intake mode rather than inventing speculative fix streams.
