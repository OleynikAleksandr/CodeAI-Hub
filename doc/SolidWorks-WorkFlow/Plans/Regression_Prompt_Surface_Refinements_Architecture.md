# Regression Prompt Surface Refinements — Architecture Draft

## Статус
Draft for approval.

## Контекст
После релизного regression pass `1.1.757` стало видно, что universal questionnaire и обновлённый help для `Description` сработали хорошо, но в prompt surface всё ещё остаются несколько системных слабых мест. Эти слабые места не ломают workflow сразу, но создают drift в интерпретации артефактов и могут накапливать лишнюю неоднозначность на следующих шагах.

## Что именно обнаружено

### 1. Инструкция «полностью переписывать артефакт» сформулирована слишком грубо
Смысл этого правила был правильным: агент должен каждый раз пересобирать артефакт как цельный согласованный документ, а не латать его кусками и оставлять старые противоречивые хвосты.

Но текущая формулировка подталкивает агента к мысли, что он должен физически делать полную замену файла при каждой итерации. Это не всегда нужно и на более поздних шагах повышает риск потерять валидные пользовательские правки.

### 2. `Description` всё ещё слишком рано толкает к одному «главному archetype»
Для смешанных продуктов вроде CodeAI Hub правильная интерпретация начинается не с одного простого archetype, а с composite / multi-surface картины: есть несколько верхнеуровневых оболочек и отдельное локальное ядро.

Текущий prompt уже допускает сложную картину, но всё ещё не проговаривает явно, что допустим гибридный archetype без преждевременного выбора одного единственного типа продукта.

### 3. Сценарный контракт остаётся слишком жёстко ограниченным
Сейчас в нескольких поверхностях продукта всё ещё зашит старый лимит `2–4 сценария`: в help, prompt, валидаторе, HTTP-роутере и SSOT-документации.

Этот лимит подталкивает агента не к адекватному покрытию системы, а к искусственному сжатию картины продукта. Для простых продуктов это может быть терпимо, но для более сложных систем приводит к склейке независимых проявлений в один сценарий или к потере важных частей системы.

При этом сам принцип явного сценарного блока остаётся правильным: и `Final_Description.md`, и `virtual-simulation.md` должны содержать пользовательски понятные сценарии как основу для следующих шагов. Ошибка именно в жёстком верхнем лимите, а не в самом требовании сценарности.

### 4. Нужно жёстче ограничить «релевантный контекст текущего запроса»
На пустом workspace агент не найдёт много лишнего, но по мере движения по workflow появляется служебный контекст: continuity-файлы, stage metadata, runtime summaries, вспомогательные файлы.

Prompt surface должна чётче объяснять, что:
- semantic source of truth для архитектурных решений — это канонические артефакты текущего stage chain;
- служебные stage/runtime файлы допустимы только как источник continuity или user-approved context preservation;
- они не должны конкурировать с артефактами как источник архитектурной интерпретации.

## Цель следующего scope
Сделать prompt/help contract следующего поколения более точным:
- агент обязан мыслить whole-document, но физически может обновлять файл patch-based, сохраняя валидные пользовательские правки;
- `Description` должен прямо уметь фиксировать composite archetype для гибридных продуктов;
- `Final_Description.md` должен явно содержать сценарный блок, а не только narrative, но без искусственного верхнего лимита по количеству сценариев;
- все stage prompts должны ограничивать контекст объёмом, который действительно релевантен текущему запросу и текущему semantic artifact chain.

## Предлагаемое решение

### A. Переформулировать правило редактирования артефакта
Новая формула:
- агент каждый раз обязан пересобрать артефакт как цельный согласованный документ;
- но физически он должен обновлять файл так, чтобы сохранять валидные пользовательские правки и не делать полную замену без необходимости;
- полный rewrite остаётся допустимым только когда это действительно нужно для консистентности.

### B. Добавить явную поддержку composite archetype в `Description`
`Description` prompt должен прямо разрешать и поощрять такую интерпретацию:
- продукт может иметь несколько shells / surfaces;
- один из них может быть primary daily-use shell, а другой companion/distribution shell;
- наличие нескольких самостоятельных верхнеуровневых частей не является ошибкой и не должно схлопываться в один archetype label.

### C. Сделать сценарный блок обязательной частью `Final_Description.md`
Prompt должен жёстко требовать явные пользовательские сценарии как отдельный блок, а не оставлять это как желательный narrative effect. Количество сценариев должно определяться сложностью продукта и полнотой покрытия, а не фиксированным лимитом.

### D. Снять жёсткий лимит `2–4` со всех сценарных поверхностей
Нужно синхронно убрать старое ограничение из:
- user-facing help;
- stage prompt;
- валидатора и HTTP-проверок;
- SSOT-документации;
- вспомогательных kickoff/template surfaces.

Новая формула должна быть такой:
- сценариев должно быть столько, сколько нужно для покрытия продукта без белых пятен;
- связанные проявления можно объединять ради ясности;
- отсутствие искусственного верхнего лимита не отменяет требования к компактности и качеству покрытия.

### E. Уточнить политику релевантного контекста
Для каждого stage prompt нужно закрепить правило:
- сначала canonical stage artifacts;
- затем текущий user-request context;
- затем только те служебные continuity/runtime файлы, которые реально нужны для сохранения подтверждённого пользователем контекста;
- всё остальное не должно влиять на архитектурную интерпретацию.

## Что не входит в этот scope
- Рефакторинг diagram auto-layout.
- Новый UI workflow.
- Переписывание канонических DSL для `Diagram Modules` / `Diagram Facades`.
- Полный redesign questionnaire — это уже сделано и вошло в `1.1.757`.

## Предлагаемый минимальный execution scope
1. `Description` prompt/help: composite archetype + explicit scenario contract без жёсткого лимита + smarter artifact rewrite semantics.
2. Cross-stage cleanup: снять hard cap `2–4` с `Description` / `Virtual Simulation` / runtime validation / SSOT surfaces.
3. Cross-stage prompt cleanup: релевантный context window и служебные файлы не конкурируют с semantic artifacts.
4. Release build после этих prompt-level правок и повторный regression pass.

## Файлы, которые с высокой вероятностью войдут в scope
- `packages/agents/description-agent/assets/description-collector-prompt.md`
- `packages/agents/description-agent/assets/questionnaire-template.md`
- `src/client/project-manager/components/description/description-step-help.tsx`
- `src/client/project-manager/components/virtual-simulation/virtual-simulation-help.tsx`
- `packages/core/src/templates/source/virtual-simulation-prompt.md`
- `packages/core/src/workflow/validation/virtual-simulation-validator.ts`
- `packages/core/src/remote-bridge/handlers/http-api-router.ts`
- `src/client/ui/src/app-host/idea-kickoff-prompt.ts`
- `packages/agents/diagram-modules-agent/assets/module-inventory-prompt.md`
- `packages/agents/diagram-facades-agent/assets/facade-map-prompt.md`
- `packages/core/src/templates/bundled-templates.ts`
- `doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md`
- `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`

## Ожидаемый результат
Следующий regression pass должен показать:
- меньше лишних допущений на `Description`;
- более явные сценарии в `Final_Description.md` без искусственного лимита;
- отсутствие drift между help/prompt/runtime validation/SSOT по количеству сценариев;
- меньше drift между stage artifacts и служебным runtime context;
- более аккуратное отношение агентов к пользовательским правкам на итерациях.
