# Session 109 — Greenfield Polygon Planning For Prompt Grammar

**Date:** 2026-03-20 18:32 (CET)
**Branch:** main
**Version:** 1.1.754
**HEAD at session start:** `7edec9bc docs(session): record formal module cluster discussion`

---

# 1. Work Done in This Session

## Work summary

- Полностью восстановлен контекст по `Session106`, `Session107`, `Session108`, обязательным SSOT/planning-докам и связанным git-коммитам.
- Подтверждено, что текущий тупик находится не в React Flow как таковом, а в слабой upstream grammar для `Description` -> `Virtual Simulation` -> `Diagram Modules`.
- В planning-доке `Formal_Module_Cluster_Facade_Architecture.md` закреплены новые baseline-принципы:
  - `Module Group` исключён из formal grammar;
  - добавлены `Archetype Shell`, `Archetype Profile`, `Package / Deployable Unit`;
  - зафиксировано, что архитектурные правила должны проверяться обычным deterministic script, а не ИИ;
  - зафиксирована интеграция будущих validator-rules в существующие quality gates.
- В тот же planning-doc добавлены:
  - `as-is` схема текущего repo;
  - AI-oriented target-схема принятия решений агентом;
  - разделение на universal rules и archetype-specific profile rules.
- Создан новый planning-doc:
  - `doc/SolidWorks-WorkFlow/Plans/Greenfield_Architecture_Polygon.md`
- Принято рабочее решение не начинать сейчас большой рефакторинг основного repo, а использовать пустые greenfield-репозитории как полигон для проверки новой prompt grammar.
- Обновлён active execution plan `doc/TODO/todo-plan.md`:
  - добавлен `Phase 19 — Greenfield Polygon Prompt Grammar`;
  - первая фаза направлена на корректировку prompt/template grammar для трёх шагов:
    - `Description`
    - `Virtual Simulation`
    - `Diagram Modules`
- Начата реализация `Phase 19`:
  - обновлён user-facing `questionnaire-template.md` для `Description`, чтобы шаг собирал тип приложения, крупные части системы и draft-boundaries, а не только общий продуктовый narrative;
  - обновлён `description-template.md`, чтобы следующий смысловой таргет шага был явно привязан к понятной пользователю диаграмме модулей;
  - переписан `description-collector-prompt.md`, чтобы агент `Final_Description.md` уже оперировал language-level сущностями `Archetype / Shell`, `Package / Deployable Unit`, `Cluster`, `Module`, `Module Facade`, `Cluster Facade`, не уходя в код и file-tree;
  - переписан `virtual-simulation-prompt.md`, чтобы `virtual-simulation.md` уже фиксировал `archetype-aware shell constraints`, `system contours`, `candidate clusters`, `standalone modules` и простые `boundary-sensitive interactions`;
  - переписаны `module-inventory-prompt.md`, `module-inventory-template.md`, `module-inventory-field-reference.md`, `module-inventory-merge-rules.md`, чтобы `Diagram Modules` строилась из formal clusters и standalone modules, а не из loose analytical labels;
  - обновлён prompt-only contract test для `Virtual Simulation`;
  - обновлён diagram-stage contract test для `Diagram Modules`;
  - расширен `template-sync-service.test.ts`, чтобы sync-path проверял новый polygon surface для `Description`, `Virtual Simulation` и `Diagram Modules`;
  - выполнена регенерация `packages/core/src/templates/bundled-templates.ts`.
- Выполнена таргетная техническая верификация для `@codeai-hub/core`:
  - `npm run build --workspace @codeai-hub/core`
  - `node --test dist/remote-bridge/handlers/idea-contract-service.virtual-simulation.test.js`
  - `node --test dist/remote-bridge/handlers/idea-contract-service.diagram-stages.test.js`
  - `node --test dist/templates/template-sync-service.test.js`
- Подготовлены release-facing документы для локального релиза `1.1.754`:
  - обновлены `README.md` и `CHANGELOG.md`;
  - собран unified release cycle:
    - `./scripts/build-all.sh`
    - `./scripts/build-release.sh --use-current-version`
- В результате получены локальные релизные артефакты:
  - `codeai-hub-1.1.754.vsix`
  - provider/core/ui/launcher tarballs в `doc/tmp/releases/`
- Подтверждено:
  - `build-all.sh` завершился успешно;
  - `build-release.sh --use-current-version` создал VSIX для `1.1.754`;
  - дерево после релизного цикла осталось чистым.

## Main architectural outcome

Главный результат этой сессии:

- мы сместили фокус с "починить layout диаграммы" на "сделать upstream architecture grammar достаточно жёсткой, чтобы диаграмма стала полезной пользователю";
- мы отдельно зафиксировали, что новая grammar должна:
  - быть понятной ИИ;
  - быть проверяемой обычным скриптом;
  - встраиваться в canonical shell любого archetype-проекта, а не ломать его.

Практический вывод:

- ближайшая реализация идёт не в layout runtime;
- ближайшая реализация идёт в prompts/templates, которые должны начать навязывать правильный архитектурный словарь ещё до шага `Diagram Modules`.

## Files created or updated in this session

Created:

- `doc/Sessions/Session109.md`
- `doc/SolidWorks-WorkFlow/Plans/Greenfield_Architecture_Polygon.md`

Updated:

- `README.md`
- `CHANGELOG.md`
- `doc/SolidWorks-WorkFlow/Plans/Formal_Module_Cluster_Facade_Architecture.md`
- `doc/TODO/todo-plan.md`
- `packages/agents/description-agent/assets/questionnaire-template.md`
- `packages/agents/description-agent/assets/description-template.md`
- `packages/agents/description-agent/assets/description-collector-prompt.md`
- `packages/core/src/templates/source/virtual-simulation-prompt.md`
- `packages/core/src/remote-bridge/handlers/idea-contract-service.virtual-simulation.test.ts`
- `packages/agents/diagram-modules-agent/assets/module-inventory-prompt.md`
- `packages/agents/diagram-modules-agent/assets/module-inventory-template.md`
- `packages/agents/diagram-modules-agent/assets/module-inventory-field-reference.md`
- `packages/agents/diagram-modules-agent/assets/module-inventory-merge-rules.md`
- `packages/core/src/remote-bridge/handlers/idea-contract-service.diagram-stages.test.ts`
- `packages/core/src/templates/template-sync-service.test.ts`
- `packages/core/src/templates/bundled-templates.ts`

## Git commits

- `080a7351 docs(plan): formalize greenfield polygon grammar`
- `df20c495 docs(prompt): align description and simulation polygon grammar`
- `ad0dc26b docs(prompt): align diagram modules polygon grammar`
- `21f75460 docs(session): record polygon prompt rollout`
- `cdc573aa docs(release): prepare 1.1.754 notes`
- `0557f3a0 chore(release): build greenfield polygon prompt release`

Текущий активный implementation step после обновления отчёта:
- использовать локальный релиз `1.1.754` как первый runtime для прогона пустого greenfield-репозитория;
- проверить `Description` -> `Virtual Simulation` -> `Diagram Modules` уже через реальный установленный пакет, а не только через template/tests.

---

# 2. Instructions for Next Session

## Required documents to review before work

1. `AGENTS.md`
2. `doc/Sessions/Session108.md`
3. `doc/Sessions/Session109.md` (THIS REPORT)
4. `doc/SolidWorks-WorkFlow/README.md`
5. `doc/SolidWorks-WorkFlow/Docs_Index.md`
6. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
7. `doc/SolidWorks-WorkFlow/Plans/Formal_Module_Cluster_Facade_Architecture.md`
8. `doc/SolidWorks-WorkFlow/Plans/Greenfield_Architecture_Polygon.md`
9. `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_UserSurface_Architecture.md`
10. `doc/TODO/todo-plan.md`

## Immediate implementation focus

Следующий practical focus после этого отчёта:

1. Прогон пустого greenfield-репозитория через локальный релиз `1.1.754`:
   - `Description`
   - `Virtual Simulation`
   - `Diagram Modules`
2. Оценка артефактов как user-facing polygon output, а не как внутренней markdown-формальности.
3. Выявление новых instruction gaps до перехода к следующей диаграмме/спецификациям.

## Key constraint to preserve

В этом scope нельзя "спасать" полигон ручным созданием артефактов за агента.

Нужно:

- менять instructions/templates;
- смотреть, что реально генерирует агент;
- улучшать upstream grammar;
- проверять её через existing runtime/template-sync path.

## Desired end-state of the phase

После реализации этой фазы пустой greenfield-репозиторий должен получать:

- более архитектурно насыщенный `Final_Description.md`;
- `virtual-simulation.md`, который порождает formal boundaries;
- `module-inventory.md`, пригодный для user-readable диаграммы модулей.

Ближайшая проверка:

- использовать уже собранный локальный релиз `1.1.754`;
- протестировать flow на пустом репозитории;
- исправлять дальше не артефакты вручную, а prompts/templates/instructions.
