# Session 139 — Composite Prompt Cleanup Release 1.1.770

**Date:** 2026-03-23 14:42 CET
**Branch:** main
**Version:** 1.1.770

---

# 1. Work Done in This Session

## Work summary
- На основе пользовательского retest релиза `1.1.769` и screenshot промежуточных сообщений агента закрыт `Phase 45`: `Diagram Modules` и `Diagram Facades` переведены на строгий composite prompt contract с exact inputs и explicit non-inputs вместо широкого discovery-space.
- Для `Diagram Modules` убраны legacy-подсказки про поиск compatibility inventory, staged examples, continuity files, helper artifacts и generic templates; PM compose prompt больше не показывает generic `Шаблон (absolute)` и явно запрещает лишний scouting вне текущего turn-а.
- Для `Diagram Facades` выровнен тот же user-facing surface: stage больше не провоцирует continuity/template scouting, не показывает generic template path и жёстко держится за текущий `module-inventory.md`, embedded appendix и явно перечисленные project files.
- Runtime contract assembly для обоих diagram stages больше не выглядит как generic single-template flow: stage-level `templatePath` убран, а staged templates / field references / merge rules продолжают подмешиваться в prompt напрямую как already-provided appendix.
- Добавлено regression coverage на composite prompt contract для `diagram_modules` и `diagram_facades`, чтобы следующие релизы ловили legacy strings, unwanted template hints и ослабление strict input restrictions до живого ретеста.
- Синхронизированы `README.md` и `CHANGELOG.md` под patch release `1.1.770`, затем выполнен release cycle: `build-all.sh` поднял unified version и собрал fresh tarball-артефакты, после чего `build-release.sh --use-current-version --allow-dirty` успешно собрал VSIX `codeai-hub-1.1.770.vsix`.

## Verification
- `npx tsx --test packages/core/src/remote-bridge/handlers/idea-contract-service.diagram-stages.test.ts`
- `npx tsx --test src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version --allow-dirty`
- `git status --short --branch`

## Notes
- Пользовательский retest `1.1.769` и screenshot с discovery chatter задокументированы в `Session138.md`; этот feedback стал прямым acceptance criterion для всех фиксов `Phase 45`.
- `build-release.sh` снова завершился успешно, но оставил прежний advisory по `109` broken markdown links в старых session-docs. Это не заблокировало упаковку и осталось отдельным documentation debt.
- Финальные артефакты релиза лежат в корне репозитория (`codeai-hub-1.1.770.vsix`) и в `doc/tmp/releases/` / `~/.codeai-hub/releases/`.

## Git commits
- `2b7b2008 docs(session): sync composite diagram prompt planning handoff`
- `d2743e55 fix(diagram-workflow): tighten diagram modules prompt surface`
- `c3c6d76c fix(diagram-workflow): simplify diagram stage contract assembly`
- `64840c35 fix(diagram-facades): tighten facade prompt surface`
- `7d6120a9 test(diagram-workflow): cover composite prompt contract cleanup`
- `e4e51620 docs(release): sync composite prompt cleanup notes`
- `ad980668 chore(release): prepare composite prompt cleanup release`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `AGENTS.md`
2. `README.md`
3. `doc/SolidWorks-WorkFlow/README.md`
4. `doc/SolidWorks-WorkFlow/Docs_Index.md`
5. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
6. `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
7. `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_StagedPrompt_And_Continuation_Repair_Architecture.md`
8. `doc/SolidWorks-WorkFlow/Plans/Diagram_Workflow_CompositePrompt_Contract_And_Runtime_Input_Restrictions_Architecture.md`
9. `doc/TODO/todo-plan.md`
10. `doc/Sessions/Archive/Session138.md`
11. `doc/Sessions/Archive/Session139.md` (THIS REPORT)

## First sanity check
- Выполнить `git status --short --branch` и убедиться, что дерево чистое после handoff commit-а.
- Подтвердить, что baseline релиза уже `1.1.770`, `codeai-hub-1.1.770.vsix` лежит в корне репозитория, а `doc/tmp/releases/` содержит свежие tarball-артефакты `1.1.770`.
- При пользовательском ретесте отдельно проверить, что `Diagram Modules` и `Diagram Facades` больше не тратят стартовый turn на поиск compatibility inventory, staged examples, continuity files или generic template files, если runtime явно не передавал их как вход.

## Plans for next session
- Выполнить пользовательский retest релиза `1.1.770` на шагах `Diagram Modules` и `Diagram Facades`.
- Если retest пройдёт успешно, закрыть текущий active `todo-plan.md`, заархивировать завершённый план и открыть новый scope.
- Если retest найдёт новые defects, оформить их новым planning-doc и новой фазой поверх baseline `1.1.770`, не ломая уже собранный release.
