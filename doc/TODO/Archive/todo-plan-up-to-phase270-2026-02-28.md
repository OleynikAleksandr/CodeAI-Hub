# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Contracts/DescriptionNode_ReviewSession.md` (будет обновлён в этой фазе)
  - `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
  - `doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md`
  - `doc/Sessions/Archive/Session048.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стрим), в каждом Stream — подзадачи.
- **Ограничение:** каждая подзадача должна затрагивать **≤ 3 файлов**.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `npm test`, `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:tsprune`, `npx ultracite fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **НИКОГДА** не обходить гейты (`--no-verify`).
- Перед релизной сборкой обновлять `README.md`, `CHANGELOG.md` и релевантные документы в `doc/`.

---

## Phase 266 — Description step simplification: single-agent final artifact (owner: Oleksandr, updated: 2026-02-28)

**Проблема:** текущий узел `description` работает как связка из двух внутренних ролей (`collector` → авто-`reviewer`), где `description.md` выступает промежуточным артефактом. Это перегружает поток, дублирует структуру шаблонов и ограничивает адаптацию под тип проекта.

**Цель:** перейти к модели «один агент Description с бесконечной сессией и финальным артефактом `Final_Description.md`». Проработка standalone Reviewer переносится в отдельный архитектурный модуль после стабилизации текущих шагов PM.

### Stream 0: Design Phase gate (архитектурное согласование)
1. [DONE] Подготовить контракт-документ по новой модели узла Description (single-agent, артефакты, resume-модель, backward compatibility, граница с будущим reviewer-модулем) (scope: `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`; expected commit: `docs(description): draft single-agent description contract`).
2. [DONE] Git Commit: `docs(description): draft single-agent description contract` (hash: `69f9bcda`)
3. [DONE] После утверждения пользователем синхронизировать SSOT шагов Workflow (заменить внутренний двухшаговый сценарий Description на единый) (scope: `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`, `doc/SolidWorks-WorkFlow/Contracts/DescriptionNode_ReviewSession.md`; expected commit: `docs(workflow): approve single-agent description flow`).
4. [DONE] Git Commit: `docs(workflow): approve single-agent description flow` (hash: `ebc9dd65`)

### Stream 1: План миграции и риски
1. [DONE] Зафиксировать пофайловый migration plan (что меняем сразу, что оставляем временно совместимым: legacy `description.md`, legacy auto-reviewer, старые history chains) (scope: `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`; expected commit: `docs(description): add migration plan and compatibility rules`).
2. [DONE] Git Commit: `docs(description): add migration plan and compatibility rules` (hash: `744fc1f9`)

---

## Phase 267 — Core runtime refactor for single Description agent (owner: Oleksandr, updated: 2026-02-28)

**Проблема:** Core автоматически стартует reviewer после записи `description.md`, а collector-сессия создана как `no_resume`.

**Цель:** Description-сессия должна быть resume-friendly и завершаться прямой записью `Final_Description.md` без обязательного авто-reviewer.

### Stream 0: Disable auto-reviewer and enable description resume
1. [DONE] Убрать автостарт reviewer из workflow runtime и перевести описание в единый управляемый диалог (scope: `packages/core/src/workflow/runtime/workflow-runtime.ts`, `packages/core/src/workflow/runtime/workflow-runtime.test.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit: `refactor(core): disable description auto-reviewer and allow resume`).
2. [DONE] Git Commit: `refactor(core): disable description auto-reviewer and allow resume` (hash: `44593ccf`)

### Stream 1: Core workflow artifact plumbing (Final_Description.md)
1. [DONE] Перевести Core allowlist/paths/validation для workflow-артефакта Description на `Final_Description.md` (и оставить чтение legacy `description.md` только для совместимости) (scope: `packages/core/src/workflow/paths/workflow-paths-types.ts`, `packages/core/src/workflow/paths/workflow-artifact-paths.ts`, `packages/core/src/remote-bridge/handlers/http-api-router.ts`; expected commit: `refactor(core): treat Final_Description.md as description artifact`).
2. [DONE] Git Commit: `refactor(core): treat Final_Description.md as description artifact` (hash: `65417cc8`)

### Stream 2: Description snapshot/state simplification
1. [DONE] Упростить contract snapshot для Description (single primary session; legacy reviewer-поля оставить только для совместимости без развития функционала) (scope: `packages/core/src/workflow/description/description-step-types.ts`, `packages/core/src/workflow/description/description-step-store.ts`, `packages/core/src/workflow/description/description-step-store.test.ts`; expected commit: `refactor(core): simplify description snapshot model for single-agent flow`).
2. [DONE] Git Commit: `refactor(core): simplify description snapshot model for single-agent flow` (hash: `b622dbee`)

### Stream 3: Backward compatibility guardrails
1. [DONE] Добавить совместимость с существующими workspace (legacy `description.md` и старые refs не должны ломать gating и continuity) (scope: `packages/core/src/workflow/runtime/workflow-runtime.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`; expected commit: `fix(core): keep legacy description compatibility during migration`).
2. [DONE] Git Commit: `fix(core): keep legacy description compatibility during migration` (hash: `21c4253a`)

---

## Phase 268 — PM/UI flow update for unified Description step (owner: Oleksandr, updated: 2026-02-28)

**Проблема:** PM copy и поведение панели Description заточены под старую схему «draft → auto reviewer → final».

**Цель:** UI должен отражать новый поток: «Questionnaire → единая Description-сессия → Final_Description.md».

### Stream 0: Description artifact wiring (Final_Description.md, no runs/)
1. [DONE] Переключить выход Description на стабильный артефакт `.codeai-hub/<workspaceSlug>/description/Final_Description.md` (без `runs/`), а не `description.md` (scope: `src/client/project-manager/services/prompt-pack-builder.ts`, `src/client/project-manager/services/idea-collector-submit-service.ts`, `src/client/project-manager/components/layout/use-main-area-workflow-state.ts`; expected commit: `refactor(pm): write final description artifact directly`).
2. [DONE] Git Commit: `refactor(pm): write final description artifact directly` (hash: `e31597d9`)

### Stream 1: Description panel copy and UX
1. [DONE] Обновить тексты, подсказки и ожидания в панели анкеты под single-agent flow (scope: `src/client/project-manager/components/description/description-questionnaire-panel.tsx`, `src/client/ui/src/session/empty-state.tsx`, `src/client/project-manager/components/layout/main-area.tsx`; expected commit: `feat(pm): align description UX copy with single-agent flow`).
2. [DONE] Git Commit: `feat(pm): align description UX copy with single-agent flow` (hash: `4549ecc0`)

### Stream 2: Start/reopen logic for Description session
1. [DONE] Пересобрать логику старта/возобновления Description в PM без завязки на внутреннюю reviewer-фазу (scope: `src/client/project-manager/services/idea-collector-submit-service.ts`, `src/client/project-manager/components/sessions/project-manager-session-view.tsx`, `src/client/project-manager/services/workflow-provider-resolver.ts`; expected commit: `refactor(pm): unify description start and reopen flow`).
2. [DONE] Git Commit: `refactor(pm): unify description start and reopen flow` (hash: `9c34f8eb`)

---

## Phase 269 — Prompt/template redesign: adaptive Description output (owner: Oleksandr, updated: 2026-02-28)

**Проблема:** текущие шаблоны задают фиксированные 10 пунктов и почти не отличаются между draft/final.

**Цель:** Description-агент должен сам выбирать структуру итогового документа по типу продукта, сохраняя минимальные обязательные инварианты для перехода к Virtual Simulation.

### Stream 0: New Description agent role definition
1. [DONE] Переписать системный промпт Description-агента: бесконечная сессия, вопросы в чате, запись `Final_Description.md`, адаптивная структура вместо жёсткого чеклиста из 10 пунктов (scope: `packages/agents/description-agent/assets/description-collector-prompt.md`, `packages/agents/description-agent/assets/description-template.md`, `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`; expected commit: `feat(agents): define adaptive single description agent prompt`).
2. [DONE] Git Commit: `feat(agents): define adaptive single description agent prompt` (hash: `a61f06c6`)

### Stream 1: Downstream prompt path fixes (no description.md)
1. [DONE] Обновить промпты следующих шагов так, чтобы они читали `Final_Description.md` (а не `description.md`) как upstream-источник истины (scope: `packages/core/src/templates/source/virtual-simulation-prompt.md`, `packages/core/src/templates/source/modules-diagram-prompt.md`, `packages/core/src/templates/source/facades-graph-prompt.md`; expected commit: `fix(templates): downstream prompts use Final_Description.md`).
2. [DONE] Git Commit: `fix(templates): downstream prompts use Final_Description.md` (hash: `1779b17c`)

### Stream 2: Bundled templates sync
1. [DONE] Обновить генерацию bundled templates под новую карту description/reviewer assets и проверить доставку в `~/.codeai-hub/templates` (scope: `scripts/generate-bundled-templates.js`, `packages/core/src/templates/bundled-templates.ts`, `scripts/build-release.sh`; expected commit: `build(templates): sync bundled templates with new description flow`).
2. [DONE] Git Commit: `build(templates): sync bundled templates with new description flow` (hash: `5fc966f5`)

---

## Phase 270 — Docs sync + release readiness (owner: Oleksandr, updated: 2026-02-28)

### Stream 0: SSOT sync and session report
1. [DONE] Синхронизировать System/Contracts/Workflow docs по новому single-agent Description flow и зафиксировать границу отложенного reviewer-модуля, подготовить session-report (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`, `doc/Sessions/Archive/Session049.md`; expected commit: `docs(workflow): sync single-agent description architecture`).
2. [DONE] Git Commit: `docs(workflow): sync single-agent description architecture` (hash: `29e69c31`)

### Stream 1: Optional release build
1. [DONE] На чистом дереве выполнить `./scripts/build-all.sh` и зафиксировать версию (scope: release manifests + versions; expected commit: `chore(release): build-all vX.Y.Z`).
2. [DONE] Git Commit: `chore(release): build-all vX.Y.Z` (hash: `15c8b11c`)
3. [DONE] Выполнить `./scripts/build-release.sh --use-current-version`, проверить output-чеклист, зафиксировать итоги в session report (scope: `doc/Sessions/Archive/Session050.md`; expected commit: `docs(session): record release results for single-description flow`).
4. [DONE] Git Commit: `docs(session): record release results for single-description flow` (hash: `42c8dd6c`)

---

## Backlog Module R1 (DEFERRED) — Standalone Reviewer as separate architecture module (owner: Oleksandr, updated: 2026-02-28)

**Причина defer:** модуль переносится до стабилизации текущих шагов PM (`description` / `virtual_simulation` / `diagram_*`).

### Stream 0: Future architecture kickoff (после стабилизации PM)
1. [BLOCKED] Подготовить отдельный архитектурный контракт standalone Reviewer (manual trigger, cross-stage context, artifact policy, UX boundaries) (scope: `doc/SolidWorks-WorkFlow/Contracts/StandaloneReviewer_Module.md`; expected commit: `docs(reviewer): draft standalone reviewer module architecture`).
2. [BLOCKED] Git Commit: `docs(reviewer): draft standalone reviewer module architecture` (hash: TBD)
