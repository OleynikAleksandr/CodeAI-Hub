# Diagram Workflow Prompt Consistency And Autolayout — Architecture Draft

**Статус:** Discussion baseline
**Дата:** 2026-03-22
**Охват:** фактические runtime prompt payloads для `Diagram Modules` / `Diagram Facades`, follow-up упрощения user-facing DSL и first-open readability / autolayout

**Связанные документы:**
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
- `doc/SolidWorks-WorkFlow/Plans/WorkflowGlossary_TestingFeedback_Architecture.md`
- `doc/SolidWorks-WorkFlow/Plans/Diagram_UserFacing_Layout_And_Format_Architecture.md`
- `doc/Sessions/Archive/Session127.md`
- `doc/TODO/todo-plan.md`

---

## 1. Контекст

После релиза `1.1.764` live regression перешёл на новую стадию.

Подтверждённые факты:
- `Product Part` и явная сущность `Module` уже стали понятнее пользователю и больше не являются главным blocker-ом этого regression pass;
- пользователь прислал фактические prompt payloads, которые runtime отдаёт агентам `Diagram Modules` и `Diagram Facades`;
- проблема для пользователя не в длине prompt сама по себе;
- проблема возникает, только если внутри этого prompt pack есть противоречия, дубли смысла с риском drift или системные подсказки, которые позже могут начать спорить друг с другом;
- пользователь не хочет усложнять runtime условной сборкой prompt pack в зависимости от наличия артефакта: один полный пакет правил должен приходить агенту всегда.

Параллельно продолжается user-facing оценка diagram stages:
- насколько DSL реально помогает, а не добавляет лишние поля;
- насколько first-open диаграмма читаема без ручной раскладки;
- не появился ли новый overengineering после исправлений `1.1.764`.

---

## 2. Подтверждённые finding-ы этого нового scope

### 2.1. Длина prompt не является defect сама по себе

Даже большой prompt pack допустим, если:
- он внутренне непротиворечив;
- один и тот же смысл не разъехался по нескольким слоям;
- агент не получает конфликтующие указания между narrative prompt, field reference, merge rules и runtime footer.

Следовательно, следующий scope не про "сделать prompt короче", а про "убрать semantic drift".

### 2.2. Аудит нужно вести не только по source assets, но и по реальному runtime payload

Проблема уже была подтверждена ранее на дублирующихся appendix-блоках: по отдельности source-файлы могли выглядеть корректно, но финальный склеенный payload для агента оказывался дефектным.

Следовательно, source assets и финальный runtime payload должны рассматриваться как два разных уровня проверки:
- уровень авторинга prompt assets;
- уровень реальной сборки prompt pack, который агент фактически получает.

### 2.3. Runtime templates должны быть user-readable и не должны дублировать сами себя

Пользователь прямо указал ещё один важный defect:
- содержимое runtime-synced template папок `~/.codeai-hub/templates/diagram_modules/` и `~/.codeai-hub/templates/diagram_facades/` пользователь тоже читает как help/reference surface;
- explanatory text в этих template-файлах должен быть на русском языке;
- DSL terms при этом должны оставаться английскими;
- повторение одинаковых narrative-блоков внутри этих template packs недопустимо, потому что значительная часть этого текста потом попадает в общий prompt payload агента.

Следовательно, для diagram templates нужен отдельный follow-up:
- локализовать explanatory wording для пользователя;
- не трогать канонические английские DSL terms и field names;
- убрать бессмысленные повторы между template / field reference / merge rules там, где они раздувают общий prompt pack без добавления нового смысла.

Текущее состояние после реализации:
- source template packs для `diagram_modules` и `diagram_facades` уже локализованы и дедуплицированы;
- `bundled-templates.ts` пересобран из этих источников;
- `TemplateSyncService` и его regression test подтверждают, что runtime copies materialize-ятся в `~/.codeai-hub/templates/...` как user-readable русскоязычные templates с сохранёнными английскими DSL terms.

### 2.4. Always-full prompt pack — осознанное ограничение

Для текущего продукта принимается такой принцип:
- `Diagram Modules` и `Diagram Facades` получают полный prompt pack всегда;
- не вводится conditional assembly по признаку "артефакт уже существует / ещё не существует";
- consistency достигается не ветвлением runtime, а строгой дедупликацией смыслов и единым authoritative wording.

### 2.5. User-facing DSL нужно продолжать упрощать по критерию пользы продукту

Пользователь прямо сформулировал принцип:
- если термин, поле, роль или алгоритм не улучшают продукт, это кандидат на removal, а не на бесконечное расширение словаря.

Из этого следует:
- дальнейшие diagram DSL изменения должны оцениваться по реальной пользовательской пользе;
- нельзя оправдывать лишнее поле только тем, что оно "может пригодиться когда-нибудь";
- follow-up по DSL должен идти после подтверждённых regression finding-ов, а не ради теоретической полноты модели.

### 2.6. Autolayout остаётся отдельным, но связанным направлением

Даже при хорошем semantic artifact пользовательский опыт может ломаться, если:
- first-open layout плохо читается;
- ownership hierarchy визуально распадается;
- standalone / cluster / product-part зоны смешиваются;
- diagram не помогает понять систему без ручной правки.

Следовательно, после prompt-consistency audit нужен отдельный follow-up по autolayout и visual readability.

### 2.7. Уже подтверждены два конкретных spacing-defect-а автолайаута

По live regression screenshot-ам `Diagram Modules` на `1.1.764` подтверждены уже не абстрактные, а конкретные visual defects:

1. Внутри cluster lane модули, расположенные вертикально, слегка налезают друг на друга.
Это означает, что текущий vertical placement budget недооценивает фактическую высоту card или gap между соседними module cards.

2. В `Product Part` без cluster-ов standalone modules раскладываются с чрезмерно большим горизонтальным расстоянием.
Пользовательский expectation: spacing между standalone modules должен быть визуально сопоставим со spacing между cluster columns, а не существенно больше.

Следовательно, autolayout follow-up больше не начинается "с нуля":
- вертикальный cluster stacking defect уже принят;
- horizontal standalone spacing defect уже принят;
- эти два defect-а должны стать явными implementation targets следующей layout phase.

Текущее состояние после реализации:
- vertical overlap и excessive standalone horizontal spacing уже исправлены в runtime autolayout для `Diagram Modules`;
- дальнейшая проверка должна идти уже не на уровне "есть ли defect", а на уровне regression readability после релизной сборки.

---

## 3. Цель следующего scope

Открыть новый execution cycle, в котором:
- фактические runtime prompt payloads для `Diagram Modules` / `Diagram Facades` проверяются на внутреннюю непротиворечивость;
- user-facing diagram DSL продолжает упрощаться только там, где это реально улучшает продукт;
- accepted defects first-open autolayout фиксируются как отдельный implementation scope, не смешиваясь с prompt audit;
- следующий релиз собирается только после того, как появятся конкретные принятые fixes, а не ради косметического "сокращения prompt".

---

## 4. Что входит в scope

### 4.1. Prompt consistency audit

Нужно проверить:
- нет ли противоречий между `module-inventory-prompt.md`, `module-inventory-field-reference.md`, `module-inventory-merge-rules.md` и runtime footer;
- нет ли такой же проблемы в `Diagram Facades`;
- не повторяется ли один и тот же смысл в нескольких местах с разным wording;
- не остались ли старые legacy hints, которые уже не совпадают с актуальным DSL или workflow.

Отдельная часть этого же audit-а:
- проверить runtime template packs в `~/.codeai-hub/templates/diagram_modules/` и `~/.codeai-hub/templates/diagram_facades/` как user-facing surface;
- убедиться, что explanatory text там русскоязычный;
- убедиться, что английские DSL terms не локализуются;
- убрать повторяющиеся narrative sections, если они потом дублируются в общем prompt payload.

### 4.2. DSL follow-up только по подтверждённым finding-ам

Нужно проверять:
- какие user-facing поля действительно помогают пользователю понять систему;
- какие элементы DSL можно ещё упростить без потери полезной структуры;
- не вернулись ли косвенно удалённые сущности вроде display-only role semantics.

### 4.3. Autolayout / readability follow-up

Нужно зафиксировать:
- какие first-open layout defects реально мешают читать `Diagram Modules` / `Diagram Facades`;
- какие из них относятся к runtime layout engine, а не к semantic artifact;
- какой минимальный implementation slice улучшит читаемость без полного redesign graph runtime.

Уже подтверждённые обязательные targets:
- убрать vertical overlap соседних module cards внутри cluster lane;
- выровнять horizontal gap между standalone modules внутри `Product Part` с gap между cluster columns, если нет более сильной semantic причины держать другой spacing.

---

## 5. Что не входит в scope

- Сокращение prompt только ради краткости.
- Условная runtime-сборка prompt pack по признаку наличия или отсутствия артефакта.
- Новый glossary redesign без подтверждённого regression evidence.
- Полный redesign diagram runtime за один проход.
- Новый релиз без принятых prompt/DSL/layout fixes.

---

## 6. Предлагаемые execution streams

### Stream A — Planning baseline

- Заархивировать завершённый `Phase 28`.
- Открыть новый `todo-plan.md`.
- Зафиксировать новый planning scope и zero-context handoff report.

### Stream B — Diagram prompt payload contradiction audit

- Сначала проверить `Diagram Modules` runtime payload против source assets.
- Затем проверить `Diagram Facades` runtime payload против source assets.
- Разделить findings на:
  - реальные contradictions;
  - безопасные повторы;
  - wording drift с риском будущего рассинхрона.

### Stream C — Diagram DSL follow-up

- На основе принятых findings упростить только те DSL surface-элементы, которые реально мешают пользователю.
- Не возвращать removed `Role`.
- Не терять явную сущность `Module`.

### Stream D — Runtime template localization and dedupe

- Пересобрать runtime-synced templates для `diagram_modules` так, чтобы explanatory text был на русском, DSL terms остались английскими, а повторяющиеся narrative blocks не раздували prompt payload.
- Сделать то же самое для `diagram_facades`.
- Проверить не только repo assets, но и итоговые runtime copies в `~/.codeai-hub/templates/...`.

### Stream E — Autolayout readability follow-up

- Подтвердить конкретные user-facing layout defects через live regression evidence.
- Определить минимальный кодовый slice для улучшения first-open readability.
- Отдельно починить vertical cluster stacking и standalone horizontal spacing как уже подтверждённые defects.

### Stream F — Release build

- Выполняется только после принятия конкретных prompt / DSL / layout fixes.

---

## 7. Файлы-кандидаты для следующего scope

Prompt assets:
- `packages/agents/diagram-modules-agent/assets/module-inventory-prompt.md`
- `packages/agents/diagram-modules-agent/assets/module-inventory-template.md`
- `packages/agents/diagram-modules-agent/assets/module-inventory-field-reference.md`
- `packages/agents/diagram-modules-agent/assets/module-inventory-merge-rules.md`
- `packages/agents/diagram-facades-agent/assets/facade-map-prompt.md`
- `packages/agents/diagram-facades-agent/assets/facade-map-template.md`
- `packages/agents/diagram-facades-agent/assets/facade-map-field-reference.md`
- `packages/agents/diagram-facades-agent/assets/facade-map-merge-rules.md`

Runtime prompt assembly:
- `packages/core/src/remote-bridge/handlers/diagram-contract-prompt-assets.ts`
- `packages/core/src/remote-bridge/handlers/idea-contract-service.ts`
- `packages/core/src/templates/bundled-templates.ts`
- `src/client/project-manager/services/prompt-pack-builder.ts`

DSL / renderer:
- `packages/core/src/workflow/diagram-dsl/*`
- `src/client/project-manager/components/diagram-editor/*`

Layout follow-up:
- `src/client/project-manager/components/diagram-editor/adapters/*`
- `src/client/project-manager/components/diagram-editor/diagram-editor-facade.tsx`
- `doc/SolidWorks-WorkFlow/Plans/Diagram_UserFacing_Layout_And_Format_Architecture.md`

---

## 8. Ожидаемый результат

Следующий regression pass должен дать:
- один always-full prompt pack без внутренних противоречий;
- русскоязычные user-facing diagram templates без потери английских DSL terms;
- меньше дублированных правил с разным wording;
- только те DSL surface-поля, которые реально помогают пользователю;
- более читаемую first-open diagram без vertical overlap внутри cluster-ов и без избыточного horizontal spacing у standalone modules;
- чистый zero-context handoff для следующей волны исправлений.
