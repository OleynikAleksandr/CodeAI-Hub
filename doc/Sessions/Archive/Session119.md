# Session 119 — Release 1.1.758 For Scenario-Cap Regression Fix

**Date:** 2026-03-22 09:59 (CET)
**Branch:** main
**Version:** 1.1.758

---

# 1. Work Done in This Session

## Work summary
- Снят жёсткий лимит `2–4` сценария со всех живых surface-слоёв, которые влияли на `Description` и `Virtual Simulation`.
- Обновлены description-facing surfaces: questionnaire templates и `Description Help`, чтобы сценарный блок оставался обязательным, но без числового потолка.
- Обновлены `Virtual Simulation` prompt/help surfaces: теперь контракт требует столько сценариев, сколько нужно для покрытия продукта без белых пятен.
- Исправлен runtime-контракт: валидатор, HTTP/router, Project Manager validation copy и kickoff prompt больше не ломают артефакт из-за количества сценариев; минимальный инвариант теперь требует хотя бы один явный сценарий.
- Синхронизированы SSOT и активные контракты: `VirtualSimulation_Step`, `WorkflowSteps_Overview`, `SystemArchitecture`, `DescriptionStep_SingleAgent`, `idea-collector-prompt`, `DiagramWorkflow_UserSurface_Architecture`.
- Собран новый локальный релиз `1.1.758`, предназначенный для повторного regression pass с той же анкетой.

## Verification
- `npx tsx --test packages/core/src/templates/template-sync-service.test.ts`
- `npx tsx --test src/client/project-manager/components/description/description-step-help.test.ts`
- `npm run typecheck:webview`
- `npm run build --workspace packages/core`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

## Release artifacts
- VSIX: `codeai-hub-1.1.758.vsix`
- Tarballs: `doc/tmp/releases/`

## Advisory notes
- `build-release.sh` по-прежнему выводит advisory про broken markdown links в `doc/Sessions/Archive/Session106.md`, но релиз не блокируется.

## Git commits
- `713152ff docs(prompt): remove hard scenario cap from description surfaces`
- `6632ec6b docs(prompt): remove hard scenario cap from virtual simulation surfaces`
- `8a81a2e5 fix(workflow): remove hard virtual simulation scenario cap`
- `a88dd6f6 docs(contract): drop hard scenario cap from virtual simulation`
- `d6519aec docs(prompt): remove hard scenario cap from remaining entry docs`
- `e620f207 chore(release): build prompt refinement package`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Archive/Session118.md`
6. `doc/Sessions/Archive/Session119.md` (THIS REPORT)

> Далее: запустить regression локального релиза `1.1.758` с той же анкетой, начиная заново с `Description`, затем проверить `Virtual Simulation` на отсутствие навязанного лимита сценариев.

## Plans for next session
- Перезапустить тест на `1.1.758` с той же заполненной анкетой.
- Подтвердить, что `Description` не деградировал после удаления hard cap.
- Проверить, что агент `Virtual Simulation` больше не считает число сценариев фиксированным формальным требованием.
- После этого продолжить regression chain: `Diagram Modules` → `Diagram Facades`.
- Вернуться к оставшимся пунктам `Phase 25`: smarter artifact rewrite semantics, explicit composite archetype support, tighter stage context scoping.
