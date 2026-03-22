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

### 3. Контракт `Description` недостаточно жёстко требует явные сценарии
По SSOT `Final_Description.md` должен давать 2–4 ключевых сценария как явную основу для `Virtual Simulation`.

На практике агент может сделать хороший narrative-документ, но не оформить эти сценарии явно как отдельный сильный блок. Это делает документ полезным для человека, но чуть слабее как вход для следующего шага.

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
- `Final_Description.md` должен явно содержать сценарный блок, а не только narrative;
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
Prompt должен жёстко требовать 2–4 явных сценария в пользовательском виде, а не оставлять это как желательный narrative effect.

### D. Уточнить политику релевантного контекста
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
1. `Description` prompt/help: composite archetype + explicit scenario contract + smarter artifact rewrite semantics.
2. Cross-stage prompt cleanup: релевантный context window и служебные файлы не конкурируют с semantic artifacts.
3. Release build после этих prompt-level правок и повторный regression pass.

## Файлы, которые с высокой вероятностью войдут в scope
- `packages/agents/description-agent/assets/description-collector-prompt.md`
- `src/client/project-manager/components/description/description-step-help.tsx`
- `packages/core/src/templates/source/virtual-simulation-prompt.md`
- `packages/agents/diagram-modules-agent/assets/module-inventory-prompt.md`
- `packages/agents/diagram-facades-agent/assets/facade-map-prompt.md`
- `packages/core/src/templates/bundled-templates.ts`

## Ожидаемый результат
Следующий regression pass должен показать:
- меньше лишних допущений на `Description`;
- более явные сценарии в `Final_Description.md`;
- меньше drift между stage artifacts и служебным runtime context;
- более аккуратное отношение агентов к пользовательским правкам на итерациях.
