# Session 111 — Prompt Surface Alignment And Product Part DSL Planning

**Date:** 2026-03-21 10:07 (CET)
**Branch:** main
**Version:** 1.1.754
**HEAD at session start:** `979b3104 docs(session): record 1.1.754 release build`

---

# 1. Work Done in This Session

## Work summary

- Восстановлен контекст после `Session110` и подтверждено, что следующий scope делится на два потока:
  - согласованное переписывание prompt/help/template surface для ранних шагов;
  - изменение DSL и runtime `Diagram Modules` под ownership-aware hierarchy.
- Подготовлены и согласованы черновики prompt/help для трёх шагов:
  - `Description`
  - `Virtual Simulation`
  - `Diagram Modules`
- В черновиках зафиксированы новые baseline rules:
  - пользователь пишет простым языком, агент сам переводит это в архитектурные сущности;
  - glossary должен быть единообразным;
  - документ шага одновременно читаем пользователю и служит базой для следующего артефакта;
  - агент не управляет переходом между шагами, а только качеством текущего артефакта и моментом остановки своих уточнений.
- Для `Virtual Simulation` отдельно зафиксирован принцип scenario coverage:
  - сценарии из анкеты и `Final_Description.md` — только старт;
  - итоговый артефакт должен покрывать систему, а не только пересказывать несколько user flows.
- Для `Diagram Modules` отдельно зафиксировано:
  - `module-inventory.md` остаётся semantic source of truth;
  - `module-map.flow.json` — только layout sidecar и обычно появляется после ручного drag node на canvas;
  - runtime templates из `.codeai-hub/templates/diagram_modules/` должны быть явной частью contract surface.
- Создан новый planning-doc:
  - `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_ProductPart_Hierarchy_DSL_Architecture.md`
  - документ фиксирует новый DSL baseline `Product Part -> Cluster -> Module`, migration strategy `dual-read, single-write` и impact на parser / serializer / React Flow projection.
- Обновлён `doc/TODO/todo-plan.md`:
  - `Phase 20` расширена до исполнимых streams по имплементации новых prompt/help/template surfaces;
  - добавлена `Phase 21` под миграцию DSL и runtime `Diagram Modules` к `Product Part` ownership layer.

## Git commits

- В этой planning/discussion сессии новых коммитов нет.
- Все изменения пока остаются локальными документами и execution-plan updates, ожидающими следующей implementation-сессии.

---

# 2. Instructions for Next Session

## Required documents to review before work

1. `AGENTS.md`
2. `doc/Sessions/Session110.md`
3. `doc/Sessions/Session111.md` (THIS REPORT)
4. `doc/SolidWorks-WorkFlow/Plans/Greenfield_Architecture_Polygon.md`
5. `doc/SolidWorks-WorkFlow/Plans/Diagram_UserFacing_Layout_And_Format_Architecture.md`
6. `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_ProductPart_Hierarchy_DSL_Architecture.md`
7. `doc/TODO/todo-plan.md`
8. Drafts in `doc/`:
   - `doc/description-agent-prompt-draft-v4.md`
   - `doc/description-step-help-draft-v2.md`
   - `doc/virtual-simulation-agent-prompt-draft-v1.md`
   - `doc/virtual-simulation-step-help-draft-v1.md`
   - `doc/diagram-modules-agent-prompt-draft-v1.md`
   - `doc/diagram-modules-step-help-draft-v1.md`

## Plans for next session

- Имплементировать `Phase 20`: перенести согласованные prompt/help/template rewrites из черновиков в runtime assets и user-facing help surface.
- Затем начать `Phase 21`: добавить в `Diagram Modules` ownership-aware DSL `Product Part -> Cluster -> Module` с временной dual-read migration path.
- После кодовых изменений проверить parser/model/projection/tests и отдельно убедиться, что `module-map.flow.json` остаётся только layout sidecar.
