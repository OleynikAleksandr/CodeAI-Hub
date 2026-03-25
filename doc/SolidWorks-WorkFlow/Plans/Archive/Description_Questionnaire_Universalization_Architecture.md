# Description Questionnaire Universalization

## Problem

Текущая `Description` questionnaire surface и связанный help drift-ят в две стороны:
- анкета местами перестаёт быть универсальной и начинает подсказывать внутреннюю специфику CodeAI Hub;
- порядок вопросов не образует понятную лестницу от простого к сложному;
- help шага ещё не объясняет явно, что кластерно-модульная архитектура предлагается как рекомендуемый способ описания любого продукта, а не как requirement знать специальные термины заранее;
- downstream templates следующих шагов могут начать ожидать от `Description` больше специфики, чем новая универсальная анкета должна давать.

## Goal

Сделать `Description` questionnaire и help одновременно:
- универсальными для любого программного продукта;
- удобными для пользователя без архитектурного словаря;
- совместимыми с downstream цепочкой `Virtual Simulation -> Diagram Modules -> Diagram Facades`;
- синхронизированными между runtime template surface, PM help surface и bundled template delivery.

## Agreed decisions

1. Questionnaire остаётся универсальной.
   Она не должна предполагать, что пользователь строит именно workflow-driven system или знает внутренние шаги CodeAI Hub.

2. Вопросы идут как лестница.
   Сначала простые product-level вещи:
   - название;
   - тип продукта / платформа;
   - о чём продукт;
   - проблема / цель;
   - пользователи;
   - сценарии;
   - ключевые функции.
   И только потом:
   - крупные части;
   - границы;
   - ограничения;
   - out of scope;
   - примечания.

3. В начале анкеты и в help шага допускается короткое объяснение рекомендуемой кластерно-модульной архитектуры.
   Это не должно превращать анкету в product-specific questionnaire.
   Пользователю не нужно знать термины заранее; объяснение нужно как мягкая рекомендация, почему AI удобнее работать с продуктом, когда он описан через понятные части и границы.

4. Новый универсальный baseline анкеты:
   - сохраняет существующие runtime field ids, где это возможно;
   - добавляет `## 12. Примечания`;
   - не добавляет CodeAI-specific разделы вроде заранее известных workflow steps.

5. Downstream templates не должны противоречить этому baseline.
   Они могут:
   - опираться на кластерно-модульную интерпретацию;
   - переводить пользовательский язык в `shell / standalone part / cluster / module / facade`.
   Но они не должны:
   - ожидать, что questionnaire уже содержит product-specific workflow facts;
   - требовать от пользователя внутренних терминов;
   - описывать `Description` так, будто анкета уже задаёт готовую архитектуру.

## Affected surfaces

- `packages/agents/description-agent/assets/questionnaire-template.md`
- `packages/agents/idea-collector/assets/questionnaire-template.md`
- `src/client/project-manager/components/description/description-step-help.tsx`
- `packages/agents/description-agent/assets/description-collector-prompt.md`
- `packages/core/src/templates/source/virtual-simulation-prompt.md`
- `packages/agents/diagram-modules-agent/assets/module-inventory-prompt.md`
- `packages/agents/diagram-facades-agent/assets/facade-map-prompt.md`
- `src/client/project-manager/components/diagram-modules/diagram-modules-help.tsx`
- `src/client/project-manager/components/diagram-facades/diagram-facades-help.tsx`
- `packages/core/src/templates/bundled-templates.ts`
- `packages/core/src/templates/template-sync-service.test.ts`

## Validation

- bundled templates regenerate cleanly;
- template sync tests reflect the new questionnaire/help contract;
- PM help surfaces do not contradict the new questionnaire;
- downstream prompt surfaces still form a coherent chain from universal `Description` input to cluster/module/facade outputs;
- after sync, release build succeeds and produces a new VSIX for real workflow regression.
