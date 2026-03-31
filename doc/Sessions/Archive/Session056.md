# Session 056 — Virtual Simulation Prompt-Only Migration (in progress)

**Date:** 2026-03-01 19:38 (CET)
**Branch:** main
**Version:** 1.1.705

---

# 1. Work Done in This Session

## Work summary
- Восстановлен контекст по `Session055/Session054`, SSOT-докам и релизным коммитам.
- Архивирован предыдущий план: `doc/TODO/Archive/todo-plan-up-to-phase281-2026-03-01.md`.
- Создан и утверждён prompt-контракт: `doc/Virtual_Simulation_Prompt.draft-v1.md`.
- Переведён runtime шага `Virtual Simulation` на модель **prompt-only**:
  - обновлён bundled prompt;
  - удалён artifact template из source/generator/contract path;
  - PM перестал требовать и отправлять template path для `virtual_simulation`.
- Закрыт `Phase 283 / Stream 2`:
  - добавлены guard-тесты prompt-only pipeline для core/PM;
  - добавлены gating-проверки ручного старта downstream этапов (`diagram_modules`, `diagram_facades`);
  - stage-aware нормализация workflow contract в PM: non-virtual этапы требуют `paths.template`, `virtual_simulation` остаётся prompt-only.
- Синхронизированы SSOT-документы под prompt-only инварианты:
  - `Contracts/VirtualSimulation_Step.md`
  - `WorkflowSteps_Overview.md`
  - `System/SystemArchitecture.md`
  - `Contracts/Workflow_CLI.md`
- Актуализирован `doc/TODO/todo-plan.md` с hash закрытых пунктов Phase 282/283.

## Validation / build
- `node --import tsx --test packages/core/src/remote-bridge/handlers/idea-contract-service.virtual-simulation.test.ts src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts src/client/project-manager/services/workflow-step-start-service.gating.test.ts` — ✅ 4/4 passed.
- `npm run build --workspace=@codeai-hub/core` — ✅ passed (повторный прогон после Stream 2).
- `npm run build:project-manager` — ✅ passed (повторный прогон после Stream 2).

## Git commits
(ВАЖНО: список для восстановления контекста в следующей сессии через `git show`)
- `6ca3e7c1 docs(virtual-simulation): approve prompt-only contract source`
- `e9d99ee3 feat(core): migrate virtual simulation prompt to approved contract`
- `b32bb7d5 refactor(core): remove virtual simulation artifact template contract`
- `b41aa814 refactor(pm): consume virtual simulation contract without artifact template`
- `5f2720e6 refactor(pm): remove template hints from virtual simulation prompt pack`
- `860e1128 docs(virtual-simulation): switch contract to prompt-only runtime`
- `7965240e docs(workflow): sync virtual simulation prompt-only invariants`
- `64f86962 docs(session): record virtual simulation prompt-only migration progress`
- `77422b17 test(core): guard virtual simulation prompt-only pipeline`
- `dc10e920 fix(workflow): align virtual simulation prompt-only status flow`

---

# 2. Current Status (by TODO Plan)

## Completed
- `Phase 282 / Stream 0` — DONE (включая оба commit-пункта).
- `Phase 282 / Stream 1` — DONE.
- `Phase 283 / Stream 0` — DONE.
- `Phase 283 / Stream 1` — DONE.
- `Phase 283 / Stream 2` — DONE.

## Remaining
- `Phase 283 / Stream 3`:
  - session validation commit;
  - release cycle (`build-all` + `build-release --use-current-version`).

---

# 3. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
5. `doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md`
6. `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
7. `doc/TODO/todo-plan.md`
8. `doc/Virtual_Simulation_Prompt.draft-v1.md`
9. `doc/Sessions/Archive/Session056.md` (THIS REPORT)

## High-signal code files (already changed in this session)
- `packages/core/src/templates/source/virtual-simulation-prompt.md`
- `packages/core/src/templates/bundled-templates.ts`
- `scripts/generate-bundled-templates.js`
- `packages/core/src/remote-bridge/handlers/idea-contract-service.ts`
- `packages/core/src/templates/template-sync-service.ts`
- `src/client/project-manager/services/idea-collector-submit-service.ts`
- `src/client/project-manager/services/prompt-pack-builder.ts`
- `src/client/project-manager/services/workflow-step-start-service.ts`
- `packages/core/src/remote-bridge/handlers/idea-contract-service.virtual-simulation.test.ts`
- `src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts`
- `src/client/project-manager/services/workflow-step-start-service.gating.test.ts`

## Plans for next session
- Закрыть `Phase 283 / Stream 3`:
  - зафиксировать validation-результаты в session doc + commit (если появятся новые проверки сверх текущих);
  - выполнить релизный цикл и зафиксировать результат.

## Open risks
- Для апгрейда существующих пользовательских окружений критична проверка удаления legacy файла: `~/.codeai-hub/templates/virtual_simulation/virtual-simulation-template.md`.
