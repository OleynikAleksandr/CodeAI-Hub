# Архитектура сайдбара и сессий Project Manager

**Status:** Accepted (2026-04-10, rev 3). Sidebar core (tree-node building, status indicators, connector lines, collapse/expand, sequential gating, auto-sync из Diagram Modules) реализован в production: `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.ts`, `workspace-tree.tsx`, `workspace-tree-model.ts`.
**Implementation tab (§10.2):** отложен на неопределённый срок — не блокирует ни продвижение документа, ни implementation `todo-plan.md`. Решение будет принято ближе к реализации Execution session.
**Custom tooltip (§10.3):** отложен; в production используется native `title` attribute (допустимо per §10.3 notes).
**Created:** 2026-04-09
**Updated:** 2026-04-10
**Owner:** Oleksandr + Claude
**Scope:** Единый сайдбар-навигация, модель инициализации сессий и правила взаимодействия панелей для всего Project Manager — и Documentation Tree (trunk stages: Description, Virtual Simulation, Diagram Modules), и Development Tree (branches: Product Parts, Clusters, Modules). Rev 3 включает рефакторинг trunk stages в тот же документ, потому что оба дерева теперь используют единый паттерн «node = step» и единую модель lazy-инициализации сессий.

**Связанные документы:**

- `Plans/DevelopmentTree_BranchWorkflow_Architecture.md` — branch workflow, который визуализирует это дерево.
- `System/WorkflowSteps_Overview.md` — trunk + branches shape.
- Прототип: `doc/tmp/prototypes/development-tree-sidebar.html` (gitignored рабочий макет; см. §12 о расхождениях rev 1/2 vs rev 3).

---

## 1. Проблема

Текущий UI Project Manager имеет несколько структурных проблем, которые этот документ решает:

**Дублирование навигации.** Верхний tab bar (Description / Virtual Simulation / Diagram Modules) дублирует сайдбар. Удаление tab bar освобождает вертикальное пространство и убирает избыточный навигационный слой.

**Асимметричная инициализация сессий.** Trunk stages создают сессии через тесно связанный flow: заполнить анкету → выбрать провайдера → создать сессию → отправить instruction pack — всё в одной синхронной последовательности по нажатию Submit. Этот паттерн не масштабируется на Development Tree, где десятки узлов нуждаются в сессиях. Нужна единая lazy-модель инициализации.

**Выбор провайдера привязан к созданию сессии.** Провайдер выбирается при submit анкеты и фиксируется для workspace. Это был MVP-shortcut. Провайдер и модель должны выбираться per-session и меняться между turn-ами.

**Нет визуализации Development Tree.** В сайдбаре нет представления Product Parts, Clusters и Modules. Они должны auto-populate из данных Diagram Modules.

**Sub-row alias паттерн в trunk.** Каждый trunk stage раскрывается в два дочерних ряда («artifact» + «session»), которые оба делают одно и то же — это два alias для одного navigation action. Этот паттерн ломается для branches, где у Module пять артефактов и три сессии. Alias-паттерн заменяется единым правилом «node = step».

---

## 2. Цель

Сайдбар Project Manager отображает навигацию по проекту как единое связное дерево, где:

- **Каждый выбираемый ряд следует одному правилу.** Клик по ряду заполняет обе панели: левая показывает agent session(s) этого ряда, правая — artifact(s). Без sub-rows. Без per-stage special cases.
- **Табы появляются только когда count > 1.** Module с пятью артефактами рендерит панель с пятью табами. Trunk stage с одним артефактом рендерит без tab bar — просто контент.
- **Панели Artifacts и Sessions независимы.** Пользователь может просматривать один artifact tab, продолжая диалог в другом session tab.
- **Сессии инициализируются лениво.** Core создаёт shell-сессии для всех узлов. Instruction pack отправляется только при первом сообщении пользователя — prepend-ится прозрачно под капотом.
- **Description — особый первый шаг.** Сохраняет questionnaire flow и является единственным местом, где пользователь явно выбирает провайдера. Все последующие сессии наследуют этот выбор как workspace default, с возможностью per-session override.
- **Верхний tab bar удалён.** Сайдбар — единственная навигационная поверхность.
- **Development Tree auto-populate из Diagram Modules** в реальном времени.
- **Глубина дерева для branches — 3 уровня.** Product Part, Cluster, Module. Артефакты живут как табы, не как tree leaves.

---

## 3. Non-Goals

Этот scope не:

- реализует branch workflow (ownership: `DevelopmentTree_BranchWorkflow_Architecture.md`);
- определяет детальный internal layout Implementation tab code view (deferred, см. §10.2);
- определяет refactoring flow для мутаций и удалений уже начатых узлов Development Tree (deferred в отдельный архитектурный документ, см. §11.1);
- определяет production TypeScript классы или CSS class names — этот документ определяет визуальный и поведенческий контракт; implementation plan — последующий `todo-plan.md`.

---

## 4. Единые паттерны (применяются ко всем узлам — trunk и branches)

### 4.1. Единый паттерн «node = step»

Каждый выбираемый ряд в сайдбаре — это **step**. Выбор step заполняет обе панели PM:

- **Левая панель (Sessions zone)** — agent session(s) этого step. Tab bar появляется только когда сессий две или больше.
- **Правая панель (Artifacts zone)** — artifact(s) этого step. Tab bar появляется только когда артефактов два или больше.
- **Две зоны независимы.** Клик по табу в одной зоне не заставляет другую зону меняться. Пользователь может читать любой artifact tab, продолжая разговор с любым session tab того же узла.
- **Tab selection state — per-node, ephemeral.** При переключении на другой узел tab selection сбрасывается на первый доступный (незаблокированный) tab в каждой зоне. Не восстанавливается при restart.

Это правило применяется одинаково к trunk stages, Product Parts, Clusters и Modules. Без sub-rows нигде.

**Canonical node identity.** Каждый узел имеет canonical ID, построенный из пути в DM-данных:

- Trunk stages: существующие `stageId` (`description`, `virtual_simulation`, `diagram_modules`).
- `pp:<part-id>`
- `cl:<part-id>/<cluster-id>`
- `m:<part-id>/<cluster-id>/<module-id>` (clustered)
- `m:<part-id>/standalone/<module-id>` (standalone)

Этот ID используется для session routing, restore, continuity binding и sidebar selection state.

### 4.2. Удаление верхнего tab bar

Три кнопки верхнего tab bar (Description / Virtual Simulation / Diagram Modules) удаляются. Дерево сайдбара становится единственной навигационной поверхностью. Это убирает:

- дублирование навигации между tab bar и сайдбаром;
- неявную концепцию «active stage», привязанную к кнопкам tab bar;
- ~40 px вертикального пространства, занятого bar-ом.

Навигация, которую раньше обеспечивал tab bar, полностью переходит в клики по рядам сайдбара.

**Startup / restore contract.** Active node при cold start восстанавливается из persisted workflow state по canonical node ID. Если узел больше не существует или stale — restore идёт к ближайшему валидному ancestor. Если и это невозможно — fallback на `description`.

### 4.3. Lazy-инициализация сессий (instruction pack prepend)

Инициализация сессии разделена на две фазы:

**Фаза 1 — создание shell (автоматически, без API-затрат):**
Core создаёт shell-объекты сессий для всех узлов, когда они становятся доступны:
- Для trunk stages: после инициализации workspace.
- Для узлов Development Tree: когда auto-sync из Diagram Modules их материализует (см. §6.8).

Shell-сессия содержит: тип узла, тип агента, ссылки на контекстные документы, статус `not_started`. Binding к провайдеру происходит лениво.

**Фаза 2 — первое сообщение (user-triggered):**
Когда пользователь отправляет первое сообщение в любой сессии (trunk или branch):
1. PM UI выполняет binding сессии к провайдеру, выбранному в нижней панели сессии (workspace default или user override).
2. PM UI prepend-ит полный instruction pack (contract prompt + artifact paths + language directive + upstream artifact references) к сообщению пользователя.
3. Объединённый payload (instruction pack + user message) отправляется провайдеру как единый запрос.

Пользователь видит в чате только своё сообщение. Instruction pack невидим — это инфраструктура, не разговор.

**Исключение — шаг Description:** см. §5.1 для special first-step flow, где анкета заменяет свободный текст первого сообщения.

### 4.4. Выбор провайдера и модели

**Начальный выбор:** Пользователь выбирает провайдера при submit анкеты Description. Это становится **workspace default** провайдером. Модель по умолчанию для этого провайдера берётся из settings пользователя.

**Наследование:** Все последующие сессии (VS, DM и все узлы Development Tree) наследуют workspace default провайдер + модель.

**Per-session override:** Нижняя панель каждой сессии отображает текущий провайдер + модель. Пользователь может поменять любой из них до отправки первого сообщения или между turn-ами. Override применяется только к этой сессии — не меняет workspace default.

**Timing binding:** Реальный вызов `createSession()` у провайдера происходит в Фазе 2 (первое сообщение), используя провайдер + модель, которые показаны в нижней панели на этот момент.

**Source of truth:** Workspace default provider живёт в workspace-scoped persisted workflow metadata. Default model для этого провайдера берётся из user settings (или workspace metadata, если задана). Per-session override провайдера и модели живёт в session-level metadata. Все три значения (workspace provider, workspace model, per-session overrides) восстанавливаются при restart.

### 4.5. Sequential gating

Поле ввода сессии **заблокировано**, пока предыдущий шаг в workflow не создал draft артефакт. Заблокированное поле отображает сообщение с пояснением зависимости:

> Сессия станет доступна после создания артефакта в [название предыдущего шага].

Gating chain для trunk stages:
- **Description** — всегда доступен (первый шаг).
- **Virtual Simulation** — заблокирован, пока нет draft артефакта Description.
- **Diagram Modules** — заблокирован, пока нет draft артефакта Virtual Simulation.

Gating chain для branch node sessions (внутри одного module):
- **Design session** — доступна сразу после появления узла module в Development Tree.
- **Planning session** — видна сразу как disabled tab, но разблокируется только после materialization draft `Module Specification` и draft `Module Facade Contract`.
- **Execution session** — видна сразу как disabled tab, но разблокируется только после materialization draft `Implementation Foundation` и draft `TODO Plan`.

Для Product Parts и Clusters есть только одна сессия (Design), поэтому intra-node gating не применяется.

**Архитектурный контракт gating:** unlock следующей сессии основан только на наличии обязательных артефактов предыдущей фазы хотя бы в draft-state. `done/total` counters и любые completion-метрики в gating не участвуют.

**Разблокировка не равна старту.** Когда tab стал доступным, система только разрешает пользователю открыть следующую сессию. Автостарт запрещён: запуск/продолжение Planning или Execution происходит только по явному действию пользователя.

### 4.6. Паттерн Help

Help доступен в трёх режимах:

**Режим 1 — полнопанельный Help (только Description, до submit анкеты):**
Левая панель показывает подробную Help-страницу с инструкциями по заполнению и пояснениями. Правая панель показывает форму анкеты. Сессии ещё нет.

**Режим 2 — empty-state Help (все узлы, до начала работы):**
Когда у узла ещё нет артефакта:
- Левая панель: чат сессии (пустой, поле ввода готово или заблокировано gating).
- Правая панель: type-specific Help-контент, объясняющий что это за узел, какие артефакты будут созданы, какие агенты помогут и как начать работу.

**Режим 3 — кнопка Help (все узлы, после создания артефакта):**
После создания артефакта он заменяет Help в правой панели. Help остаётся доступным через кнопку в top bar панели Artifacts.

Отдельной «landing page для Development Tree» нет. Help распределён по узлам.

---

## 5. Trunk Stages (Documentation Tree)

### 5.1. Description — особый первый шаг

Description — единственный шаг, который использует анкету вместо свободного текста. Его flow:

1. Пользователь выбирает Description в сайдбаре.
2. **Левая панель:** полная Help-страница (Режим 1) — инструкции по заполнению анкеты.
3. **Правая панель:** форма анкеты.
4. Пользователь заполняет анкету, нажимает Submit.
5. **Диалог выбора провайдера** — пользователь выбирает провайдера (становится workspace default).
6. Core создаёт и bind-ит сессию. PM UI отправляет instruction pack + данные анкеты как первое сообщение.
7. **Левая панель:** появляется чат сессии (агент работает над артефактом).
8. **Правая панель:** Help (Режим 2), пока не создан draft артефакт, затем артефакт.

После submit Description ведёт себя как любой другой шаг — сессия слева, артефакт справа, кнопка Help в top bar.

### 5.2. Virtual Simulation

- **Sessions:** 1 (VS agent). Без tab bar.
- **Artifacts:** 1 (`virtual-simulation.md`). Без tab bar.
- **Gating:** ввод заблокирован, пока нет draft артефакта Description.
- **Первое сообщение:** пользователь пишет свободно; instruction pack prepend-ится под капотом.

### 5.3. Diagram Modules

- **Sessions:** 1 (DM agent). Без tab bar.
- **Artifacts:** 1 (rendered graph view). Без tab bar. Файлы markdown DSL (`product-parts.index.md`, `product-parts/*.md`) не отображаются как отдельные табы — пользователь видит граф.
- **Gating:** ввод заблокирован, пока нет draft артефакта Virtual Simulation.
- **Первое сообщение:** пользователь пишет свободно; instruction pack prepend-ится под капотом.

### 5.4. Секции сайдбара

Сайдбар разделён на две визуальные секции:

```
Workspace picker
── Documentation Tree ──
  ○ Description
  ○ Virtual Simulation
  ○ Diagram Modules
── Development Tree ──
  ▼ <Product Part 1>
    ▼ <Cluster 1>
      ○ <Module 1>
      ...
    ○ <Standalone Module>
  ▼ <Product Part 2>
    ...
```

«Documentation Tree» и «Development Tree» — не-selectable метки (без click handler, без hover state, без marker slot, без counter). Они существуют только как визуальная группировка. Метка и разделитель Development Tree появляются только после того, как в данных Diagram Modules есть хотя бы один Product Part.

### 5.5. Без дублирования workspace root

Имя workspace отображается в workspace picker наверху сайдбара. Дерево не рендерит дублирующий ряд workspace. Trunk stages и branch nodes сидят непосредственно под workspace picker, разделённые только секционными метками.

---

## 6. Development Tree (Branches)

### 6.1. Глубина дерева ограничена 3 branch-уровнями

Каждый branch node — это одно из:

- **Product Part** (`PP`) — collapsible, глубина 1 под разделителем Development Tree.
- **Cluster** (`CL`) — collapsible, глубина 2 под своим Product Part.
- **Module** (`M`) — leaf, глубина 3 внутри cluster или глубина 2 как standalone под своим Product Part.

Modules всегда **leaves**. Ни один branch row не идёт глубже leaf module.

### 6.2. Артефакты не являются leaves дерева

`Part Specification`, `Cluster Specification`, `Cluster Facade`, и пять module artifacts не являются tree rows. Они живут как табы в правой панели Artifacts для выбранного узла. Это ограничивает дерево глубиной 3.

### 6.3. Type badges и типографика различают PP / CL / M

Каждый branch row имеет uppercase type badge между status marker и меткой:

- `PP` — accent-green фон (`var(--pm-accent-strong)`), тёмный текст.
- `CL` — синий фон (`#4f7ec9`), светлый текст.
- `M` — нейтральный тёмный фон, muted текст с тонкой рамкой.

Per-type типографика усиливает различие:

- **PP rows** — 13 px, bold (700), primary text color, чуть увеличенный padding.
- **Cluster rows** — 12.5 px, semibold (600), primary text color, средний padding.
- **Module rows** — 12 px, regular (400), muted text color, компактный padding.

### 6.4. Открытый Product Part обёрнут в accent frame

Когда Product Part раскрыт, его ряд и все дочерние элементы обёрнуты в единый rounded-rect frame:

- `border: 1px solid var(--pm-accent-border)`
- `background: rgba(66, 201, 162, 0.04)` (очень лёгкий accent tint)
- `border-radius: 12px`

Только один PP frame существует одновременно (strict accordion, §6.7).

### 6.5. Открытый Cluster рисует connector line group к своим modules

Когда cluster раскрыт внутри открытого Product Part:

- Метка и chevron cluster переключаются на accent-green цвет.
- Вертикальная connector line (`border-left: 1px solid rgba(95, 227, 186, 0.32)`) идёт по левому краю списка модулей под chevron cluster.
- Каждый module row рисует короткий горизонтальный stub (14 px `::before` pseudo-element) от вертикальной линии к status dot модуля.
- Метки модулей внутри открытого cluster получают `var(--pm-text-primary)` цвет.

### 6.6. Standalone modules визуально отделены от clustered modules

Standalone modules рендерятся как direct children PP wrapper, под всеми clusters. Они:

- не обёрнуты в cluster-connector list;
- рендерятся с тем же `M` badge, но чуть muted label color (`#b4c0cf`);
- расположены внутри PP frame, но вне любой cluster connector group — этого достаточно для визуального контекста.

### 6.7. Strict accordion — единственный режим

Раскрытие Product Part закрывает любой ранее открытый Product Part. Раскрытие cluster внутри PP закрывает любой ранее открытый cluster.

**Нет** soft-accordion toggle. Strict accordion — архитектурное требование, потому что Project Manager не может одновременно рендерить несколько module sessions в Sessions panel или несколько наборов module artifacts в Artifacts panel.

### 6.8. Auto-sync Development Tree из Diagram Modules

Секция Development Tree auto-populate из данных Diagram Modules в реальном времени.

- **Source of truth:** `.codeai-hub/<workspaceSlug>/diagram_modules/product-parts.index.md` плюс `product-parts/<part-id>.md` файлы.
- **Триггер:** любая запись в эти файлы. DM работает как progressive pipeline: сначала index с planned parts, потом materialized part-файлы по одному.
- **Progressive population:** PP появляется в Development Tree сразу из `product-parts.index.md` (skeleton, внутренняя структура пуста, counter скрыт — `N` ещё неизвестен). Counter `0/N` появляется после materialization `product-parts/<part-id>.md`, когда внутренняя структура (clusters, modules) становится известна. Clusters и modules внутри PP заполняются по мере materialization соответствующего `product-parts/<part-id>.md`. Это консистентно с существующим progressive DM pipeline, где visual shell строит skeleton по index без part-файлов.
- **Shell-сессии создаются по мере population:** для PP — при появлении в index; для clusters/modules — при materialization part-файла (см. §4.3 Фаза 1).
- **Без ручной инициализации.** Никакой кнопки «Development Tree». Branch tree растёт тихо по мере роста Diagram Modules.
- **Добавления — тихие.** Добавление нового module никогда не промптит пользователя.
- **Порядок следует данным Diagram Modules.** Product Parts идут в порядке `product-parts.index.md`. Clusters и modules — в порядке каждого `product-parts/<part-id>.md`.
- **Удаления и мутации уже начатых элементов** вне scope (см. §11.1).

**Контракт архитектурной безопасности:** auto-sync безопасен по умолчанию, потому что агент Diagram Modules всегда вводит новый функционал через новые modules или новые clusters. Мутации существующих элементов зарезервированы для редких исключений. Это соответствует project-wide принципу «closed modules». Поскольку additions доминируют на практике, auto-sync покрывает подавляющее большинство изменений без промпта пользователя.

### 6.9. Без `kind` marker в дереве

Module `kind` (`service`, `store`, `adapter`) — это метаданные агента, не user-facing информация. Сайдбар не рендерит его.

### 6.10. Формат counter — `done/total`

Каждый collapsible row показывает right-aligned, tabular-numeric counter `done/total`:

- **Module** — завершённые артефакты из пяти.
- **Cluster** — Cluster Spec (1) + Cluster Facade (1) + все модули (5 каждый).
- **Product Part** — Part Specification (1) + все cluster totals + все standalone module totals.

Поскольку дерево auto-sync из DM, у каждого узла всегда есть известный structural total — counter начинается с `0/N`.

### 6.11. Overflow метки показывает tooltip при hover

Имена modules, clusters и PP часто превышают доступную ширину метки. Каждый row должен показывать полное имя при hover.

- **Прототип** использует native `title` attribute (работает, но sluggish задержка ~500–1500 ms).
- **Production** должен иметь custom tooltip component (см. §10.3) с задержкой ~150–200 ms, overflow detection и PM-themed стилизацией.

### 6.12. Декомпозиция Module: три сессии, пять артефактов

Module проектируется и реализуется через три отдельные agent sessions, производящие пять артефактов:

- **Design session** (один агент) — два артефакта:
  - Module Specification
  - Module Facade Contract
- **Planning session** (один агент) — два артефакта:
  - Implementation Foundation
  - TODO Plan
- **Execution session** (один агент) — один «артефакт»:
  - Implementation (реальный код — см. §6.14)

Это даёт каждому module ровно **5 artifact tabs** и **3 session tabs**.

Product Parts и Clusters:

- **Product Part** — 1 session (Design), 1 artifact (Part Specification). Без tab bars.
- **Cluster** — 1 session (Design), 2 artifacts (Cluster Spec + Cluster Facade). Два таба в Artifacts panel, без табов в Sessions.

### 6.13. TODO Plan — living artifact

TODO Plan co-owned двумя сессиями внутри одного module:

- **Planning session** создаёт начальную структуру (фазы, стримы, подзадачи, ожидаемые commit messages).
- **Execution session** **обязана** обновлять тот же файл в ходе реализации: менять статусы, заполнять git commit hashes, реструктурировать streams, когда подзадача вырастает за 3 файла.

Таб TODO Plan в Artifacts panel всегда отражает live execution state — отдельный «Implementation dashboard» не нужен.

### 6.14. Implementation tab — это code view, не документ

Implementation tab — это окно в реальные source files модуля, как они существуют в репозитории. Детальный layout — scope файлов, гранулярность preview, VS Code интеграция, git diff surface — deferred в §10.2.

Контракт: Implementation tab показывает состояние кода, не design documents. PM не конкурирует с VS Code как code editor; он обеспечивает visibility в то, что Execution agent произвёл.

### 6.15. Tab grouping через phase separators

Обе tab bars используют визуальные разделители для группировки табов по фазам для modules:

```
Artifacts:  [Spec] [Facade] │ [Foundation] [TODO] │ [Implementation]
Sessions:   [Design]        │ [Planning]          │ [Execution]
```

Разделитель `│` — тонкий вертикальный divider с дополнительным spacing по обе стороны. Три группы соответствуют трём фазам (Design / Planning / Execution), визуально сигнализируя «вы пересекаете границу фазы» при перемещении между табами.

Clusters и Product Parts не рендерят separators (одна фаза, два или менее артефактов).

### 6.16. Highlighting для branch nodes

Когда пользователь выбирает любой branch node, сайдбар подсвечивает его стандартным selection style. Поскольку верхний tab bar удалён (§4.2), вопрос tab-bar highlighting не возникает — сайдбар является единственным индикатором активного узла.

---

## 7. Визуальные спецификации

Все цвета, размеры и spacing ниже — контракт, который production implementation обязан соблюдать.

### 7.1. Сайдбар chrome

- `--pm-sidebar-min-width: 220 px`, `--pm-sidebar-max-width: 420 px`.
- Background `var(--pm-panel)`, right border `1 px solid var(--pm-border-color)`.
- Workspace picker сохраняет текущий вид и padding.

### 7.2. Base tree row

- Baseline font-size 13 px; per-type overrides в §6.3.
- `padding: 6px 12px; margin: 0 8px; gap: 10px; border-radius: 10px`.
- Marker slot 24 px square (chevron или status dot, взаимоисключающие).

### 7.3. Section labels и divider

- `── Documentation Tree ──` и `── Development Tree ──` рендерятся как plain text rows с `text-transform: uppercase; font-size: 10px; letter-spacing: 0.15em; color: var(--pm-text-muted); padding: 10px 16px 4px;`.
- Non-selectable (без click handler, без hover state, без marker slot, без counter).
- Разделитель Development Tree не рендерится, пока в данных Diagram Modules нет хотя бы одного PP.

### 7.4. Product Part frame

- Wrapper: `<li class="pm-tree__pp-wrapper">` вокруг PP row и его children.
- Open state добавляет `--open` modifier:
  - `border: 1px solid var(--pm-accent-border);`
  - `background: rgba(66, 201, 162, 0.04);`
  - `border-radius: 12px;`
  - `padding: 2px 0 8px; margin: 4px 8px;`
- Children list: `<ul class="pm-tree__pp-children">` с `margin: 2px 10px 0 12px`.

### 7.5. Cluster connector group

- Wrapper: `<li class="pm-tree__cluster-wrapper">` внутри `pp-children`.
- Open state: cluster label + chevron color → `var(--pm-accent-strong)`.
- Children list: `<ul class="pm-tree__cluster-children">`:
  - `margin: 0 0 2px 33px;` (выравнивает border-left с центром chevron cluster);
  - `border-left: 1px solid rgba(95, 227, 186, 0.32);`
- Module rows внутри: `padding-left: 18px;` + `::before` horizontal stub:
  - `position: absolute; top: 50%; left: 0; width: 14px; height: 1px; background: rgba(95, 227, 186, 0.32);`
- Module labels внутри connector list: `var(--pm-text-primary)`.

### 7.6. Standalone module rows

- `<li class="pm-tree__item pm-tree__item--type-m">` как direct child `pm-tree__pp-children`.
- Label color `#b4c0cf`.
- Без cluster connector.

### 7.7. Type badges

- Base: `padding: 1px 6px; font-size: 9px; font-weight: 700; letter-spacing: 0.1em; line-height: 14px; border-radius: 4px; text-transform: uppercase;`
- `--pp`: `color: #08221c; background: var(--pm-accent-strong);`
- `--cl`: `color: #eaf2ff; background: #4f7ec9;`
- `--m`: `color: var(--pm-text-muted); background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);`

### 7.8. Counter

- `margin-left: 6px; font-size: 11px; font-variant-numeric: tabular-nums; color: var(--pm-text-muted);`
- Selected row counter: `var(--pm-accent-strong)`.

### 7.9. Tab phase separators

- Применяются только к Module nodes (5 artifact tabs, 3 session tabs).
- Separator: 1 px wide, 60% высоты tab bar, `background: var(--pm-border-color)`, `margin: 0 8px`.
- Artifacts panel: между `Facade` и `Foundation`, между `TODO` и `Implementation`.
- Sessions panel: между `Design` и `Planning`, между `Planning` и `Execution`.

### 7.10. Заблокированное поле ввода (gated input)

- Background поля ввода: `var(--pm-panel)` с пониженной opacity.
- Lock message отцентрирован в области ввода, `font-size: 12px; color: var(--pm-text-muted);`.
- Кнопка send не видна, пока поле заблокировано.

---

## 8. Правила взаимодействия

### 8.1. Семантика selection

- Клик по trunk stage row выбирает этот stage и заполняет обе панели.
- Клик по Product Part row выбирает PP и раскрывает его (strict accordion). Клик по chevron toggle-ит раскрытие без смены selection.
- Клик по Cluster row выбирает cluster и раскрывает его. Та же chevron-семантика.
- Клик по Module row выбирает module. Modules — leaves.
- Панели синхронизируются независимо: клик по artifact tab не заставляет session tab меняться, и наоборот.

### 8.2. Strict accordion (единственный режим)

- Раскрытие Product Part закрывает любой другой открытый Product Part и сбрасывает «open cluster» pointer.
- Раскрытие Cluster внутри PP закрывает любой другой открытый cluster внутри того же PP.
- Без soft-accordion toggle. Архитектурное требование (§6.7).

### 8.3. Active-path highlighting

- Открытый Product Part: рендерится внутри accent frame (§6.4).
- Открытый Cluster: label и chevron переключаются на accent-green, connector lines появляются (§6.5).
- Modules внутри открытого cluster: primary-text-color labels.
- Выбранный row: `pm-tree__item--selected` правила применяются; frame дополняет selection.

### 8.4. Description pre-session state

До submit анкеты:
- Клик по Description row показывает Help (левая панель) + анкету (правая панель).
- Сессии нет. Сайдбар показывает Description как selected, но без session indicator.

После submit:
- Сессия появляется в левой панели. Правая панель переключается на Help (Режим 2) до создания draft артефакта, затем на артефакт.

---

## 9. Модель табов Main Area

Этот раздел описывает, что Sessions panel (левая) и Artifacts panel (правая) рендерят для каждого типа выбираемого узла. Tab bars присутствуют только когда count > 1 (§4.1).

### 9.1. Description

- **Sessions:** 1 (Description agent). Без tab bar.
- **Artifacts:** 1 (`Final_Description.md`). Без tab bar.
- **Pre-session state:** Help (слева) + анкета (справа). См. §8.4.

### 9.2. Virtual Simulation

- **Sessions:** 1 (VS agent). Без tab bar.
- **Artifacts:** 1 (`virtual-simulation.md`). Без tab bar.
- **Gating:** ввод заблокирован, пока нет draft артефакта Description.

### 9.3. Diagram Modules

- **Sessions:** 1 (DM agent). Без tab bar.
- **Artifacts:** 1 (rendered graph view). Без tab bar.
- **Gating:** ввод заблокирован, пока нет draft артефакта Virtual Simulation.

### 9.4. Product Part

- **Sessions:** 1 (Design agent). Без tab bar.
- **Artifacts:** 1 (Part Specification). Без tab bar.
- **Gating:** доступен сразу после появления PP node.
- **Panel title:** `<Workspace> / <Product Part name>`.

### 9.5. Cluster

- **Sessions:** 1 (Cluster Design agent). Без tab bar.
- **Artifacts:** 2 таба — `Cluster Spec`, `Cluster Facade`. Без phase separator (одна фаза).
- **Gating:** доступен сразу после появления Cluster node.
- **Panel title:** `<Product Part> / <Cluster name>`.

### 9.6. Module (clustered или standalone)

- **Sessions:** 3 таба — `Design │ Planning │ Execution`. Phase separators между каждым.
- **Artifacts:** 5 табов — `Module Spec`, `Module Facade` │ `Implementation Foundation`, `TODO Plan` │ `Implementation`. Phase separators после `Facade` и после `TODO Plan`.
- **Gating:** Design доступен сразу. Planning tab виден сразу, но заблокирован до появления draft `Module Spec` + draft `Module Facade`. Execution tab виден сразу, но заблокирован до появления draft `Implementation Foundation` + draft `TODO Plan`. Разблокировка не запускает следующую сессию автоматически.
- **Panel title (clustered):** `<Product Part> / <Cluster> / <Module>`. Standalone: `<Product Part> / <Module>`.
- **Tab status dots:** done (accent-green), in progress (amber), todo (muted grey).

### 9.7. Агрегация tab status

- Module `done/total` = количество artifact tabs в состоянии «done» (из 5).
- Cluster counter = Cluster Spec + Cluster Facade + все module totals.
- Product Part counter = Part Specification + все cluster totals + все standalone module totals.

`done/total` и tab status dots — только индикаторы прогресса. Они не используются для unlock gating между Design / Planning / Execution.

---

## 10. Открытые вопросы

### 10.1. [RESOLVED] Инициализация agent sessions

Решено в rev 3 как §4.3 (lazy-инициализация сессий) + §4.4 (выбор провайдера) + §4.5 (sequential gating) + §5.1 (Description special flow).

### 10.2. [DEFERRED] Implementation tab detailed view

§6.14 фиксирует, что Implementation tab — это code view. Точный layout **отложен на неопределённый срок** — этот вопрос станет актуальным только при подходе к реализации Execution session, и к тому моменту контекст (реальный опыт работы с Design и Planning sessions) может подсказать решение естественным образом.

Подвопросы для будущего решения (зафиксированы здесь для traceability):

- **Scope показываемых файлов** — только файлы в директории модуля (из Foundation file-structure), или все файлы, затронутые во время Execution session (git-based), или оба варианта с переключением?
- **Уровень детализации** — только file tree, file tree + read-only code preview, или file tree + live git diff?
- **VS Code интеграция** — embedded viewer, кнопка «Open in VS Code», или оба?
- **Non-file артефакты** — тесты, configs, `package.json`, build output — часть Implementation tab или отдельный будущий tab?
- **Runtime result** — «build green/red, tests pass/fail» summary внутри Implementation tab или отдельно?

**Этот пункт не блокирует ни продвижение документа, ни написание implementation `todo-plan.md`.**

### 10.3. Custom tooltip component (implementation-only)

Native `title` attribute имеет OS-controlled задержку (~500–1500 ms), которая ощущается медленно. Production должен иметь custom tooltip с задержкой ~150–200 ms, overflow detection (`scrollWidth > clientWidth`) и PM-themed стилизацией. Deferred в implementation `todo-plan.md`.

---

## 11. Отложено в отдельные документы

### 11.1. Refactoring flow для мутаций и удалений Diagram Modules

Auto-sync (§6.8) тихо применяется только к **additions**. Мутации (переименование, структурные изменения) и удаления уже начатых узлов — это refactoring-операции, которые не должны происходить тихо. Deferred в отдельный архитектурный документ в `Plans/`.

Non-normative teaser: refactoring flow пройдёт через DM agent — пользователь просит DM реструктурировать, DM корректирует граф, Core пересчитывает Development Tree. Новые узлы появляются как «not started». Мутированные узлы с работой генерируют warnings. Удалённые узлы с работой требуют explicit confirmation.

Refactoring flow упрощён заранее контрактом архитектурной безопасности в §6.8: поскольку DM agent всегда вводит новый функционал через новые modules/clusters, refactoring flow покрывает только residual edge cases.

---

## 12. Прототип

Интерактивный макет ранней (rev 1) версии дизайна живёт по адресу:

`doc/tmp/prototypes/development-tree-sidebar.html`

Прототип gitignored (`doc/tmp/` исключён из source control) — это рабочий артефакт для design discussion.

**Rev 1/2 vs rev 3:** Текущий прототип отражает rev 1. Помимо расхождений rev 2 (перечислены ниже), rev 3 вводит дополнительные divergences:

- всё ещё показывает верхний tab bar с тремя кнопками (удалён в §4.2);
- всё ещё показывает 2-sub-row trunk паттерн (заменён unified node = step в §4.1);
- не показывает gated input field state (§4.5);
- не показывает Description pre-session state с Help слева + анкета справа (§5.1);
- не рендерит phase separators в tab bars (§6.15);
- не рендерит Sessions panel tab bar для modules (§9.6 требует 3 таба);
- не отображает метку `── Documentation Tree ──` над trunk stages (§5.4);
- предполагает ручную инициализацию Development Tree через кнопку (заменена auto-sync в §6.8);
- использует native `title` tooltip (допустимо для демо, не для production по §6.11).

Прототип должен быть регенерирован по спецификациям rev 3 до написания implementation `todo-plan.md`.

---

## 13. Связанные документы

- `Plans/DevelopmentTree_BranchWorkflow_Architecture.md` — branch workflow, который визуализирует это дерево.
- `System/WorkflowSteps_Overview.md` — trunk + branches shape и Development Tree preamble.
- `System/SystemArchitecture.md` — Diagram Modules boundary, ownership hierarchy, sidecar v2.
- `Contracts/FacadeClassDiagram_DesignAndMaintenance.md` — facade contract rules для Cluster Facade и Module Facade tabs.

---

## 14. Verification Target

Этот документ достаточно подготовлен для продвижения от Draft к Accepted, когда на следующие вопросы можно однозначно ответить без открытия прототипа:

1. Какие навигационные поверхности существуют и какая удалена? (§4.2)
2. Как инициализируются сессии для любого узла? (§4.3)
3. Когда и где пользователь выбирает провайдера? (§4.4, §5.1)
4. Что блокирует использование сессии? (§4.5)
5. Что видит пользователь до submit анкеты Description? (§5.1, §4.6 Режим 1)
6. Какие три типа branch rows и как пользователь их различает? (§6.1, §6.3)
7. Где живут Part Specification, Cluster Spec, Cluster Facade и пять module artifacts? (§6.2, §9)
8. Как сайдбар показывает, какой Product Part редактируется? (§6.4)
9. Как сайдбар показывает, какие modules принадлежат какому cluster? (§6.5)
10. Как сайдбар обрабатывает длинные имена? (§6.11)
11. Какова максимальная глубина дерева и почему? (§6.1, §6.2)
12. Как standalone modules отличаются от clustered? (§6.6)
13. Как строится Development Tree? (§6.8)
14. Что происходит, когда DM меняется после начала работы? (§6.8, §11.1)
15. Какое empty state панелей для нового узла? (§4.6 Режим 2)
16. Как фазы module визуально разделены без разделения дерева? (§6.15)
17. Сколько sessions и artifacts у каждого типа узла? (§6.12, §9)
18. Какие открытые вопросы блокируют implementation `todo-plan.md`? (§10)

**Правило продвижения:** документ имеет статус **Accepted**. §10.2 (Implementation tab detailed view) отложен на неопределённый срок и не блокирует ни документ, ни implementation. §10.3 (custom tooltip) — implementation task. Регенерация прототипа — отдельный scope.
