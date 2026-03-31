# Session 125 — Regression Feedback Hotfix Release 1.1.763

**Date:** 2026-03-22 15:35 (CET)
**Branch:** main
**Version:** 1.1.763

---

# 1. Work Done in This Session

## Work summary
- Принят и закрыт `Description Help` UX drift: help теперь явно отражает реальный `Submit questionnaire` flow, открытие provider picker и правило, что в текущем MVP провайдер выбирается один раз на весь workflow workspace.
- Исправлен runtime prompt duplication для `Diagram Modules` и `Diagram Facades`: appendix-блоки `Field Reference` и `Merge Rules` больше не дублируются, даже если одновременно доступны synced templates и bundled fallback assets.
- Исправлен `Source` pending-state drift для diagram stages: до появления canonical artifact `Diagram Modules` и `Diagram Facades` теперь показывают workflow-aware ожидание upstream artifact вместо generic `file not found`.
- Синхронизированы release docs для `1.1.763`, выполнены `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`, собран новый локальный regression baseline `codeai-hub-1.1.763.vsix`.
- Релизный build прошёл успешно; известный advisory не изменился: `build-release` по-прежнему сообщает о broken markdown links в [Session106.md](../../doc/Sessions/Session106.md) и теперь в [Session124.md](../../doc/Sessions/Session124.md), но релиз это не блокирует.

## Verification
- `npx tsx --test src/client/project-manager/components/description/description-step-help.test.ts packages/core/src/templates/template-sync-service.test.ts packages/core/src/remote-bridge/handlers/idea-contract-service.virtual-simulation.test.ts`
- `npx tsx --test packages/core/src/remote-bridge/handlers/idea-contract-service.diagram-stages.test.ts`
- `npx tsx --test src/client/project-manager/components/layout/stage-artifact-mode.test.ts`
- `npm run typecheck:webview`
- `npm run build --workspace packages/core`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

## Git commits
- `e4357c39 docs(plan): classify description help provider-picker drift`
- `a83448bd fix(description): align help copy with provider picker flow`
- `d845e59f chore(templates): refresh bundled description help copy`
- `c51a7a9d test(description): guard help provider picker wording`
- `a98409dc docs(plan): sync description help copy progress`
- `f176ee20 docs(plan): classify diagram prompt appendix duplication`
- `cf934bdd fix(diagram-prompts): dedupe prompt appendix sources`
- `78fa5259 docs(plan): classify diagram source pending-state drift`
- `f8332a5c fix(diagram-ui): align source pending-state copy with workflow`
- `3beba43e docs(plan): sync diagram hotfix progress`
- `705808b2 chore(release): prepare next regression feedback release`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `AGENTS.md`
2. `README.md`
3. `doc/SolidWorks-WorkFlow/README.md`
4. `doc/SolidWorks-WorkFlow/Docs_Index.md`
5. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
6. `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
7. `doc/SolidWorks-WorkFlow/Plans/PostRelease_Regression_Feedback_Architecture.md`
8. `doc/TODO/todo-plan.md`
9. `doc/Sessions/Session124.md`
10. `doc/Sessions/Session125.md` (THIS REPORT)

## Git context recovery before coding
- Обязательно просмотреть через `git show --stat <hash>` и `git show <hash>` как минимум:
  - `e4357c39 docs(plan): classify description help provider-picker drift`
  - `a83448bd fix(description): align help copy with provider picker flow`
  - `d845e59f chore(templates): refresh bundled description help copy`
  - `c51a7a9d test(description): guard help provider picker wording`
  - `f176ee20 docs(plan): classify diagram prompt appendix duplication`
  - `cf934bdd fix(diagram-prompts): dedupe prompt appendix sources`
  - `78fa5259 docs(plan): classify diagram source pending-state drift`
  - `f8332a5c fix(diagram-ui): align source pending-state copy with workflow`
  - `705808b2 chore(release): prepare next regression feedback release`
- Если нужен полный planning context этого post-release scope, дополнительно открыть [Session124.md](../../doc/Sessions/Session124.md) и сравнить его с текущим [todo-plan.md](../../doc/TODO/todo-plan.md).

## Plans for next session
- Продолжать live regression уже на релизе `1.1.763` и принимать только подтверждённые user-observed findings.
- Отдельно оценить следующий вероятный system-level кейс по `Diagram Facades`: полезность `facade-map.md`, наличие contract semantics и соответствие визуальной диаграммы реальной ценности шага.
- Если по `Diagram Facades` подтвердится accepted finding, сначала классифицировать его в `todo-plan`, а не открывать speculative redesign.
