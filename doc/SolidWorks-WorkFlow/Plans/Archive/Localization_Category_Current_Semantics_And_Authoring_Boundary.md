# Localization Categories — Accepted Decisions

**Status:** Approved for execution (2026-04-03)
**Created:** 2026-04-02
**Updated:** 2026-04-03
**Owner:** Oleksandr + Codex
**Target outcome:** после сборки следующего релиза весь user-facing текст, помеченный как локализуемый и выбранный пользователем для русского языка, должен отображаться/генерироваться на русском, а `Internal Agent Instructions` должны оставаться English-only.

---

## 1. Purpose

Этот документ оставляет только принятые решения по `Localization Settings`.

Он отвечает на два вопроса:

- какие пользовательские категории языка должны быть видны в Settings;
- что означает каждая настройка внутри блока локализации.

Подробные обсуждения и промежуточные трактовки сюда не входят.

---

## 2. Product Boundary

В пользовательскую локализацию входит только то, что пользователь реально видит и читает.

Не входят в пользовательскую локализацию:

- внутренние system prompts;
- внутренние agent prompts;
- contract templates между Core и агентами;
- служебные orchestration-инструкции;
- любые внутренние bridge/runtime тексты, которые не показываются пользователю.

Обязательное архитектурное правило:

- любой текст, который создаёт или показывает приложение, должен иметь явную текстовую принадлежность уже в момент authoring;
- система не должна пытаться угадывать категорию текста автоматически;
- принадлежность текста должна задаваться явно в коде, шаблоне, словаре, prompt-pack или contract layer.

---

## 3. Product-Facing Category Model

В `Localization Settings` должен быть понятный пользователю набор из 4 категорий:

1. `UI Labels`
2. `UI Helper Text`
3. `Messages for the User`
4. `Artifacts for the User`

Правило переходного периода:

- внутренняя runtime-таксономия может временно оставаться старой;
- но пользовательский Settings UI должен описывать язык именно через эти 4 слоя;
- `UI Labels` = пользовательский слой для коротких интерфейсных терминов; переходно он может опираться на текущие `ui_interface` + `workflow_terms`;
- `UI Helper Text` = пользовательский слой для поясняющего интерфейсного текста;
- `Messages for the User` = объединённый пользовательский слой для текущих `user_guidance` + `system_feedback`;
- `Artifacts for the User` = продуктовая замена старой категории `Interactive Templates`.
- английский является языком по умолчанию и не должен требовать отдельного выбора в UI.

---

## 4. Category Definitions

### 4.1. `UI Labels`

- Что входит: кнопки, табы, меню, labels, navigation, названия секций, названия настроек, короткие названия шагов и короткие статусы интерфейса.
- Примеры: `Close`, `Save Changes`, `Restart to Defaults`, `Claude`, `Codex`, `Gemini`, `General`, `Description`, `Virtual Simulation`, `Diagram Modules`, `READY`.
- Практический смысл: это все короткие интерфейсные термины, которые подписывают элемент UI или кратко называют шаг/состояние.
- Короткое описание в UI: `Buttons, tabs, menus, labels, step names, and short interface terms.`
- Отдельно, что не входит: helper-text и объяснения, warnings/errors/status messages как отдельные пользовательские сообщения, документы для пользователя, любые тексты для агента.

### 4.2. `UI Helper Text`

- Что входит: helper-text под настройками, пояснения к полям, короткие объяснения значений и опций в интерфейсе.
- Примеры: объяснение, что означает категория локализации; пояснение к модели или настройке; описание под пунктом в Settings.
- Практический смысл: это не сообщения runtime и не документы пользователя, а поясняющий текст, который помогает понять сам интерфейс.
- Короткое описание в UI: `Explanations and helper text for interface fields, options, and settings.`
- Отдельно, что не входит: warnings/errors/status messages как отдельные пользовательские сообщения, документы для пользователя, любые тексты для агента.

### 4.3. `Messages for the User`

- Что это: весь текст, который продукт пишет пользователю как объяснение, подсказку, статус или ошибку.
- Что входит: help, onboarding, hints, explanatory copy, warnings, errors, empty states, status messages.
- Короткое описание в UI: `Help, hints, warnings, errors, and status messages.`
- Отдельно, что не входит: только сообщения, инструкции и любые материалы, которые адресованы не пользователю, а агенту.

### 4.4. `Artifacts for the User`

- Что это: язык пользовательских форм и итоговых пользовательских результатов workflow.
- Что входит: questionnaire/form copy, template-driven формы, `Final_Description.md`, `virtual-simulation.md`, диаграммные подписи и другие user-facing workflow outputs.
- Короткое описание в UI: `Forms and final user-facing workflow outputs.`
- Отдельно, что не входит: templates, инструкции, артефакты и любые документы, которые предназначены не для пользователя, а для агента; такие материалы должны оставаться на английском языке.
- Дополнительное правило: эта настройка задаёт не только язык отображения, но и целевой язык генерации; агент должен сразу писать финальный user-facing artifact на выбранном языке, не переводя без необходимости file paths, file names и internal identifiers.

---

## 5. Settings Controls Meaning

Ниже зафиксирован смысл каждой настройки внутри `Localization Settings`.

### 5.1. Category language selector

- Значение: язык только для выбранной категории.
- Правило: каждая категория настраивается независимо.
- Английский является значением по умолчанию.
- Если выбранный язык удаляют или очищают, категория автоматически возвращается к английскому.
- В UI по умолчанию и после удаления выбранного языка в ячейке должно отображаться: `Default Language (English)`.
- Английский не должен требовать отдельного явного выбора в UI.

### 5.2. `Translation engine`

- Значение: движок для materialized localization bundles продукта.
- Важно: это относится к локализации product copy, но не является основным механизмом для генерации `Artifacts for the User`.

### 5.3. `Glossary protection`

- Значение: защита терминов, которые нельзя портить переводом.
- Что защищается: product names, provider names, технические термины, env vars, важная продуктовая vocabulary.
- Как читать: `Keep protected terms and product vocabulary stable during localization.`

---

## 6. Implementation Rules

### 6.1. Current Refactor Target

Следующая реализация должна привести Settings к этой пользовательской модели:

- `UI Labels`
- `UI Helper Text`
- `Messages for the User`
- `Artifacts for the User`

### 6.2. Mandatory Text Classification Rule

Любой новый текст, который создаёт приложение, обязан сразу получать явную принадлежность.

Для user-facing текста допустимы только 4 пользовательские категории:

- `UI Labels`
- `UI Helper Text`
- `Messages for the User`
- `Artifacts for the User`

Для не-user-facing текста должна использоваться отдельная внутренняя принадлежность:

- `Internal Agent Instructions`

Что относится к `Internal Agent Instructions`:

- system prompts;
- agent prompts;
- orchestration instructions;
- runtime contracts между Core и агентом;
- служебные template blocks, которые агент читает, но пользователь не читает.

Правило для `Internal Agent Instructions`:

- они не входят в пользовательские language settings;
- они не materialize-ятся через пользовательские localization categories;
- они должны оставаться на английском языке, если отдельный технический reason не требует другого.

### 6.3. Mandatory Migration Phase For Existing Text

Будущий execution plan обязан содержать отдельную фазу для уже существующего текста.

Эта фаза не может быть скрыта внутри других задач и должна идти как отдельный stream/phase с явным scope.

Что обязательно входит в эту фазу:

- весь текст, который приложение уже показывает пользователю;
- весь текст, который приложение уже генерирует для пользователя;
- весь текст, который уже зашит в поставку и попадает в VSIX / runtime bundle;
- bundled dictionaries;
- hardcoded UI strings;
- helper-text в Settings и других поверхностях;
- warnings, errors, empty states, status messages;
- questionnaire/form copy;
- user-facing workflow outputs и связанные prompt/template entry points;
- internal agent instructions, prompts, contracts и template blocks.

Что должно быть результатом этой фазы:

- каждый существующий текст получает явный category marker;
- каждый user-facing текст получает одну из 4 пользовательских категорий;
- каждый не-user-facing текст получает marker `Internal Agent Instructions`;
- для каждого текста становится явно видно, должен ли он локализоваться для пользователя или должен оставаться English-only;
- после завершения фазы в кодовой базе не должно оставаться "безымянного" текста без явной принадлежности.

### 6.4. Runtime Mapping During Transition

До полного рефакторинга допускается временное внутреннее расхождение:

- `UI Labels` может materialize-иться через текущие `ui_interface` и `workflow_terms`;
- `UI Helper Text` может переходно materialize-иться через текущие `ui_interface` и часть `user_guidance`, пока split не доведён до конца;
- `Messages for the User` может materialize-иться через текущие `user_guidance` и `system_feedback`;
- `Artifacts for the User` временно может проходить через существующие точки старой категории `interactive_templates` и отдельный workflow prompt pipeline.
- legacy `defaultLanguage` и `workflowTermsPolicy` могут временно оставаться во внутренней модели, но не должны оставаться частью пользовательской модели Settings.

### 6.5. Prompt-Pack Rule For `Artifacts for the User`

Язык `Artifacts for the User` должен быть протащен в workflow session start / submit pipeline и в prompt pack.

Обязательный смысл инструкции агенту:

- финальный user-facing artifact нужно писать сразу на выбранном языке;
- file paths, file names и внутренние identifiers переводить не нужно, если workflow явно не требует обратного.
