# Session 123 — Idea / Idea Collector Legacy Cleanup Planning Baseline

**Date:** 2026-03-22 13:27 (CET)
**Branch:** main
**Version:** 1.1.761

---

# 1. Work Done in This Session

## Work summary
- Проведён глубокий audit legacy слоя `Idea` / `Idea Collector` относительно текущей SSOT-архитектуры, где канонический первый шаг уже называется `Description`.
- Подтверждено, что `Idea Collector` сейчас не является отдельным каноническим workflow step. В текущем коде смешаны:
  - current `Description` / `Virtual Simulation` pipeline под legacy naming;
  - active compat bridges (`idea-contract`, `stage: "idea"`, schema remap `idea -> description`);
  - реально мёртвый old flow (`Idea -> Spec -> Plan -> Execute`) и orphaned `packages/agents/idea-collector` слой.
- Заархивирован завершённый execution plan предыдущего scope:
  - `doc/TODO/Archive/todo-plan-up-to-phase25-2026-03-22.md`
- Создан новый active planning-doc под cleanup/refactor:
  - `doc/SolidWorks-WorkFlow/Plans/IdeaCollector_LegacyCleanup_Architecture.md`
- Полностью заменён active `doc/TODO/todo-plan.md` новым execution plan:
  - `Phase 26 — Idea / Idea Collector Legacy Cleanup`
  - со stream-ами на rename active current-flow, removal compat bridges, removal disabled legacy home-view flow, package/provider cleanup, docs cleanup и финальную release build.

## Key findings for next session

### A. Current architecture under legacy names
- Эти файлы живые и обслуживают новый workflow, но сохранили старые имена:
  - `src/client/project-manager/services/idea-collector-submit-service.ts`
  - `src/client/project-manager/components/description/idea-collector-provider-picker.tsx`
  - `src/client/ui/src/services/idea-questionnaire-template.ts`
  - `src/client/ui/src/services/idea-questionnaire-messages.ts`
  - `src/client/ui/src/components/idea-questionnaire/idea-questionnaire-view.tsx`
  - `packages/Claude_Module/src/messaging/idea-collector-structured-output.ts`
- Их не нужно удалять сразу. Их нужно переименовывать/переводить на current naming.

### B. Active compat bridges
- Эти элементы всё ещё участвуют в current runtime/PM bridge, но уже не являются канонической продуктовой семантикой:
  - `packages/core/src/remote-bridge/handlers/idea-contract-service.ts`
  - `packages/core/src/remote-bridge/handlers/http-api-router.ts` (`/api/v1/orchestrator/idea-contract`)
  - `src/client/project-manager/services/description-questionnaire-service.ts` (`stage: "idea"` для pre-submit workspace-session)
  - `src/client/project-manager/components/sessions/session-schema-stage.ts` (`idea -> description`)
  - `src/client/ui/src/services/idea-questionnaire-paths.ts` (legacy path fallback)
- Эти bridges нельзя удалять до migration callers.

### C. Dead legacy / candidate for deletion
- Старый full-development-flow path в webview/home-view уже не является текущей product surface:
  - `src/client/ui/src/app-host.tsx` (`FullAppHost` path disabled via `SETTINGS_ONLY_MODE`)
  - `src/client/ui/src/app-host/session-region.tsx`
  - `src/client/ui/src/app-host/idea-questionnaire-panel.tsx`
  - `src/client/ui/src/app-host/idea-kickoff-prompt.ts`
  - `src/client/ui/src/app-host/use-idea-collector.ts`
  - `src/client/ui/src/app-host/session-region-idea-paths.ts`
  - `src/client/ui/src/components/flow-wizard/index.tsx`
  - `src/client/ui/src/components/action-bar/index.tsx`
  - `src/extension-module/home-view-message-router/command-handler.ts`
- Отдельный package `packages/agents/idea-collector` выглядит orphaned: живых импортов вне самого пакета не найдено. Но удалять его можно только после migration/stabilization compat callers.

## Verification / evidence gathered
- Проверены SSOT-доки:
  - `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Contracts/DescriptionNode_ReviewSession.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Description_LegacyCleanup_Architecture.md`
- Проверены runtime/PM/UI entrypoints:
  - `packages/core/src/remote-bridge/handlers/idea-contract-service.ts`
  - `packages/core/src/remote-bridge/handlers/http-api-router.ts`
  - `packages/core/src/remote-bridge/handlers/session-request-handler.ts`
  - `packages/core/src/remote-bridge/handlers/workspace-session-service.ts`
  - `src/client/project-manager/services/description-questionnaire-service.ts`
  - `src/client/project-manager/services/idea-collector-submit-service.ts`
  - `src/client/project-manager/components/sessions/session-schema-stage.ts`
  - `src/client/ui/src/app-host.tsx`
  - `src/client/ui/src/app-host/session-region.tsx`
  - `src/client/ui/src/services/idea-collector-service.ts`
  - `packages/Claude_Module/src/messaging/idea-collector-structured-output.ts`

## Working tree status at session end
- Есть незакоммиченные изменения только в planning/docs:
  - `doc/TODO/todo-plan.md`
  - `doc/SolidWorks-WorkFlow/Plans/IdeaCollector_LegacyCleanup_Architecture.md`
  - `doc/TODO/Archive/todo-plan-up-to-phase25-2026-03-22.md`
- Новых Git commits в этой сессии ещё не создано.
- `HEAD` на момент отчёта: `aafe2226 docs(session): record 1.1.761 release build`

## Release baseline
- Текущий validated baseline перед новым cleanup scope:
  - `codeai-hub-1.1.761.vsix`
- Это релиз, в котором `Description Help` уже переведён на локальный PM rendering path и подтверждён пользователем как рабочий.

## Git commits
- Новых коммитов в этой сессии ещё нет.
- Последние релевантные baseline commits перед стартом нового scope:
  - `aafe2226 docs(session): record 1.1.761 release build`
  - `f3c9f238 chore(release): prepare 1.1.761 assets`
  - `756e15b5 docs(release): prepare 1.1.761 notes`
  - `0db40b78 docs(plan): record local description help fix`
  - `6fc1538b fix(pm): render description help locally`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `AGENTS.md`
2. `doc/SolidWorks-WorkFlow/README.md`
3. `doc/SolidWorks-WorkFlow/Docs_Index.md`
4. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
5. `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
6. `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
7. `doc/SolidWorks-WorkFlow/Plans/IdeaCollector_LegacyCleanup_Architecture.md`
8. `doc/TODO/todo-plan.md`
9. `doc/Sessions/Session122.md`
10. `doc/Sessions/Session123.md` (THIS REPORT)

## Git context recovery before coding
- Так как в этой сессии новых commit-ов ещё не было, восстановление кода нужно делать от последнего release baseline.
- Обязательно просмотреть через `git show --stat <hash>` и `git show <hash>` следующие commit-ы:
  - `aafe2226 docs(session): record 1.1.761 release build`
  - `f3c9f238 chore(release): prepare 1.1.761 assets`
  - `756e15b5 docs(release): prepare 1.1.761 notes`
  - `0db40b78 docs(plan): record local description help fix`
  - `6fc1538b fix(pm): render description help locally`
- Цель просмотра: восстановить точный baseline перед стартом `Phase 26`, а не только прочитать названия commit-ов.

## Exact current local state to verify first
1. Убедиться, что рабочее дерево содержит только planning-doc changes:
   - `doc/TODO/todo-plan.md`
   - `doc/SolidWorks-WorkFlow/Plans/IdeaCollector_LegacyCleanup_Architecture.md`
   - `doc/TODO/Archive/todo-plan-up-to-phase25-2026-03-22.md`
2. Зафиксировать planning baseline коммитом:
   - `docs(plan): start idea collector legacy cleanup scope`
3. После этого начинать `Phase 26` строго по stream-ам нового `todo-plan.md`.

## Recommended first implementation stream
- Начать с `Stream: Rename active PM Description pipeline`
- Первая микрозадача:
  - `src/client/project-manager/services/idea-collector-submit-service.ts`
  - `src/client/project-manager/components/description/idea-collector-provider-picker.tsx`
  - `src/client/project-manager/components/description/description-questionnaire-panel.tsx`
- Цель:
  - убрать legacy `idea-collector` naming из живого current `Description` submit path без изменения поведения.

## After that
- Следующим stream идти в compat bridges:
  - убрать зависимость current PM flow от `/idea-contract`
  - убрать `stage: "idea"` из pre-submit bootstrap semantics
  - снять `idea -> description` remap

## Important constraints for next session
- Не удалять `packages/agents/idea-collector` и старый home-view flow до тех пор, пока живые compat callers не будут переведены.
- Не смешивать в одном коммите:
  - rename current-flow files,
  - runtime alias removal,
  - dead legacy deletion,
  - docs sweep.
- После завершения cleanup streams обязателен новый локальный release build и новый session report.
