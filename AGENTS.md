# 🚀 CodeAI Hub: Мастер-процесс и Архитектура

**СИСТЕМНАЯ ИНСТРУКЦИЯ**: 
Это ГЛАВНАЯ директива для всех сессий разработки. Ты ОБЯЗАН строго следовать этому жизненному циклу.

## 0. Ponytail Hard Mode (обязателен)
- Для каждой задачи разработки считай, что пользователь автоматически добавил: `@ponytail сделай это максимально простым способом`.
- Если среда поддерживает skill/plugin `ponytail`, ОБЯЗАТЕЛЬНО активируй и применяй его. Если `@ponytail` недоступен, применяй эквивалентный режим вручную.
- Жёстко следуй ladder: сначала YAGNI, затем стандартная библиотека, затем native/platform feature, затем уже существующая зависимость, затем минимальный рабочий код.
- Запрещены абстракции, фабрики, интерфейсы, конфиги, слои, новые зависимости и расширяемость "на будущее" без явного требования пользователя или текущего архитектурного контракта.
- При конфликте выбирай самый маленький diff, который выполняет задачу и не нарушает safety, security, data integrity, accessibility, Plan-first lifecycle и явные правила этого файла.
- Для ревью на сложность считай, что пользователь автоматически добавил: `@ponytail-review найди, что можно удалить или упростить`.
- Выход из режима разрешён только по прямой команде пользователя: `normal mode`, `stop ponytail` или эквивалентной явной инструкции.

## 1. Управление сессиями (Plan-first Lifecycle)

### Начало сессии
1. **Единственный recovery owner**: сначала прочитай `doc/TODO/todo-plan.md` по фактической файловой системе. Этот файл может быть ignored/untracked; всё равно именно он является активным состоянием работы.
2. **Если `Execution Scope Status: ACTIVE`**: не ищи legacy recovery reports, не восстанавливайся по спискам коммитов. Следуй только `Recovery Pack` и `Context Pack For This Cycle` из `doc/TODO/todo-plan.md`.
3. **Если `Execution Scope Status: BLOCKED`**: выполни `npm run plan:status`, прочитай blocker/debt reason и не продолжай реализацию до ремонта через `npm run plan:repair` или явного решения пользователя.
4. **Если `Execution Scope Status: NONE` или active plan отсутствует**: прочитай `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` и `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`, согласуй с пользователем новый scope, затем используй `doc/SolidWorks-WorkFlow/Docs_Index.md` для выбора релевантных документов.
5. Legacy recovery reports не являются recovery mechanism и не должны заставлять новую сессию искать отчёты.

### Во время выполнения
1. Active `doc/TODO/todo-plan.md` — machine-managed execution state.
2. Не редактируй task status, commit status, hash и machine-owned `codeai-plan-state` вручную, кроме явно плановой миграции/ремонта.
3. Для штатного commit workflow используй:
   ```bash
   npm run plan:commit -- "<expected commit message>"
   ```
4. Для диагностики используй:
   ```bash
   npm run plan:status
   npm run plan:validate
   npm run plan:repair
   ```
5. `pre-commit`, `commit-msg` и `post-commit` hooks являются частью процесса. Их нельзя обходить через `--no-verify`.

### Конец scope
0. **User Acceptance Gate**: закрытие active scope, архивирование `todo-plan.md` и planning-документа разрешены только после явного acceptance пользователя.
1. Closeout фиксируется в archived plan / planning-doc disposition, а не в новом обязательном recovery report.
2. Если active plan становится ignored local state, перед closeout должен быть создан tracked archive/snapshot в `doc/TODO/Archive/` или другом явно указанном tracked path.
3. Новый `doc/TODO/todo-plan.md` запрещено создавать или заменять, пока текущий plan имеет `Execution Scope Status: ACTIVE`, любой `IN_PROGRESS` пункт или открытый commit/debt lifecycle. Сначала closeout должен быть завершён оркестратором: финальный closeout commit/complete переводит scope в terminal `NONE` state (`currentTaskId: null`, `expectedCommitMessage: null`) и только потом можно начинать новый planning intake.
4. Нельзя помечать невыполненные задачи как `DONE` ради закрытия scope. Если пользователь закрывает scope с невыполненной работой, эти пункты должны получить поддержанный terminal disposition (`BLOCKED` с причиной сейчас; `DEFERRED` / `CANCELLED` только после добавления в оркестратор) через отдельный closeout flow, а не ручную замену active plan.
5. В конце работы не оставляй `.git/codeai-plan-debt`; если он существует, сначала выполни `npm run plan:repair`.

## 2. Архитектурные принципы (Подход "Кластерно-Модульный")
- **Клиенты не являются источником правды**: Project Manager, будущий мобильный клиент, VS Code surface или любой другой UI-клиент являются только replaceable projections и transport/input surfaces. Они могут принять сырой user intent и показать Core-owned snapshot, но не имеют права владеть workflow truth: stage phase, active microtask, expected commit, prompt/template/source-artifact selection, artifact validity, gating, localization target, Core/system messages или managed commit lifecycle.
- **Core/оркестратор является authority**: любой workflow шаг обязан продолжать работать после закрытия всех клиентов до ближайшего user gate. Если поведение ломается без открытого Project Manager, это архитектурный дефект. Новые web/mobile/Wi-Fi клиенты должны подключаться к Core API и читать тот же Core-owned state, а не наследовать или дублировать логику Project Manager.
- **Prompt templates are inline, not references**: если workflow/managed шаг требует шаблон, field reference, example, schema или repair contract, первый provider prompt обязан содержать полный текст этих материалов. Ссылка на путь допустима только как output target/debug provenance, но не как источник обязательной инструкции. Агент не должен читать template files, parser code или Project Manager code, чтобы узнать формат артефакта.
- **Artifact contract truth belongs to Core/shared contract modules**: parser/validator/read-model requirements for Diagram Modules, Application Skeleton, Quality Gates and future clients must live in Core or a provider-neutral shared contract consumed by Core. Project Manager, mobile, Wi-Fi/web clients and VS Code surfaces may render Core-owned parse results/diagnostics, but must not own independent backend parser truth or build repair prompts from client-local validation rules.
- **Managed repair lifecycle is Core-owned**: every artifact correction, including a user click such as "Fix with agent", must enter Core as raw repair intent. Core chooses the failing artifact, creates/advances the managed microtask and paired Git Commit line, dispatches the provider-visible repair prompt, validates with the canonical parser, and commits or records rejected attempts. Client-side repair prompts that bypass this lifecycle are architectural defects.
- **Микро-классы**: Никаких файлов > 500 строк. Логика должна быть разбита на маленькие классы с единственной ответственностью.
- **Фасады**: Каждый модуль должен иметь Фасад (`*facade.ts`), который выступает ЕДИНСТВЕННОЙ точкой входа для внешнего взаимодействия.
- **Закрытые модули**: Если модуль работает и проверен, **НЕ ТРОГАЙ ЕГО**. Новый функционал = Новый модуль (или строго аддитивные изменения).

## 3. Этап Проектирования (Design Phase)
**Где что хранится:**
- Баги: `doc/BugRegistry.md`
- Новый scope до `todo-plan.md`: `doc/SolidWorks-WorkFlow/Plans/`
- Реализованный SSOT: только `doc/SolidWorks-WorkFlow/System/`, `Clusters/`, `Modules/`, `Contracts/`
- Завершённый `todo-plan.md`: `doc/TODO/Archive/`
- Завершённый planning-док: либо переезд в `System/` / `Clusters/` / `Modules/` / `Contracts/`, либо `doc/SolidWorks-WorkFlow/Plans/Archive/`, либо удаление, если это был временный refactoring/cleanup-док

**Перед созданием или редактированием любого tracked-документа:**
1. Сначала проверь active `doc/TODO/todo-plan.md`.
2. Если active plan отсутствует или имеет `Execution Scope Status: NONE`, создай минимальный active `todo-plan.md` для Planning/Documentation Intake; уже появившиеся tracked-документы от пользователя, другого агента или внешнего процесса сначала проходят adoption/review через этот plan.
3. Только после этого создавай/редактируй tracked-документ и фиксируй изменение через `plan:commit`. Исключение — ignored/local scratch files, которые не должны попасть в Git.
4. Если active plan уже продвинулся, любое новое tracked изменение кода или документации сначала оформляется новым Stream/Phase с микро-задачей и отдельным `Git Commit: ...`; оркестратор выполняет только задачи, явно внесенные в active plan.
5. Для feature scope planning-документ утверждается в intake-фазе и затем используется для нарезки implementation phases.

## 4. Этап Планирования (Execution Planning)
- **Источник правды**: `doc/TODO/todo-plan.md` содержит Стратегию.
- **Единственный context pack активного цикла**: только `doc/TODO/todo-plan.md` содержит список документов, которые нужно прочитать для восстановления контекста и выполнения задач текущего execution cycle.
- **Операционный вид**: Используй свой 'todo' для отслеживания *текущего* активного пункта из `todo-plan.md`.
`todo-plan.md` - может содержать несколько фаз и в каждой фазе несколько Stream с перечнем микро задач - не более 3-х файлов исправлений или вновь созданных.
Полностью реализованный `todo-plan.md` переименовывается с префиксом последней реализованной Фазы (например - todo-plan-phase3.md) и кладется в `doc/TODO/Archive/` только после User Acceptance Gate.
На его месте создается новый `todo-plan.md` под новые задачи только после того, как оркестратор перевёл предыдущий active plan в terminal `NONE` state.
- **Обязательные финальные Stream в каждом новом `doc/TODO/todo-plan.md`:** `Release Build` или `Tooling Verification` (по scope), `User Visual Acceptance Testing` или `User Workflow Acceptance Testing`, `Scope Closeout` (закрытие todo-plan и planning-doc). `Scope Closeout` выполняется только после явного acceptance пользователя.
- **Release Build Confirmation Gate:** даже если все фиксы и проверки завершены, новый релиз нельзя собирать автоматически. Перед подготовкой release notes, запуском `build-all.sh` или `build-release.sh` обязательно отдельно переспроси пользователя и получи явное подтверждение на сборку релиза.
- **Обязательный closeout Plans после User Acceptance Gate:** как только `doc/TODO/todo-plan.md` полностью закрыт, релиз принят пользователем и план переносится в `doc/TODO/Archive/`, необходимо в той же сессии провести ревизию `doc/SolidWorks-WorkFlow/Plans/` по этому execution cycle.
  Для каждого planning-документа, на который опирался завершенный `todo-plan`, обязательно принять одно из решений:
  1. перенести его стабильные итоговые выводы в канонические SSOT-документы (`System/`, `Clusters/`, `Modules/`, `Contracts/`);
  2. перенести сам planning-документ в `doc/SolidWorks-WorkFlow/Plans/Archive/`, если он завершен и нужен как история;
  3. удалить документ, если он был временным рабочим refactoring/intake-доком и не несет самостоятельной исторической ценности.
  После этого нужно:
  - обновить `doc/SolidWorks-WorkFlow/Docs_Index.md`;
  - поправить ссылки в `doc/TODO/Archive/` и связанных docs, если они указывали на старый active path;
  - создать новый `doc/TODO/todo-plan.md` только после завершения этой ревизии.
  В active `doc/SolidWorks-WorkFlow/Plans/` должны оставаться только реально незакрытые или отложенные (`deferred`) scope.
- **Ограничение**: Разбивай работу на **Микро-задачи**. Каждая задача должна затрагивать **≤ 3 файлов**.
- **КРИТИЧНЫЙ НЮАНС**: после **каждой** микро‑задачи в Stream обязан быть **отдельный** следующий пункт `Git Commit: ...`, чтобы коммит нельзя было пропустить.

- **Шаблон todo-plan.md**:
  ```markdown
  # План разработки (Development TODO Plan)

  ## Context Pack For This Cycle
  - **Planning source:** `<path to approved planning doc>`
  - **Read this context before implementation:**
    - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
    - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
    - `<doc 1>`
    - `<doc 2>`
    - `<doc 3>`
    - `doc/SolidWorks-WorkFlow/System/ManagedDocumentationCommitOwnership.md` (для managed documentation workflow до начала генерации кода)
  - Только этот список является источником документов для восстановления контекста текущего execution cycle.

  ## Правила выполнения (Execution Rules):
  - **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое колличество - Stream (стрим), в каждом Стриме - некоторое кол-во подзадач.
  - Каждая подзадача должна затрагивать не более 3 файлов.
  - Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
  - Если по факту разработки оказывается, что конкретная подзазача Stream затрагивает больше 3 файлов - такая задача должна быть разбита на более мелкие и список задач в Стриме переписывается.
  - **Gates (автоматически через Husky hooks):**
    - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
    - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
    - Ручной прогон этих команд обычно не нужен (только для диагностики).
  - **Таргетные сборки** выполняем вручную только когда нужно проверить затронутый пакет/клиент, и обязательно перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`.
  - **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт `todo-plan.md` (дата, статус, хеш).
  - Stream завершается после того, как все его задачи закрыты таргетными сборками затронутых пакетов/клиентов и коммитами. Для серийных задач допускается диагностический прогон `npm run build --workspace <package>` по цепочке (например, Claude → Codex → core), чтобы локализовать ошибки без запуска `build-all`.
  - **Real-time Документация**: 
Любое изменение архитектуры/логики требует синхронного обновления и todo-plan.md и документации (`doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` и др.) **ДО** коммита - чтоб измененные документы также попали в Git Commit.
  - Каждый новый `doc/TODO/todo-plan.md` обязан содержать финальные Stream: `Release Build` или `Tooling Verification` (по scope), `User Visual Acceptance Testing` или `User Workflow Acceptance Testing`, `Scope Closeout` (todo-plan, planning-doc).
  - **Release Build Confirmation Gate:** после завершения фиксов и проверок остановись и переспроси пользователя, собирать ли новый релиз. Не готовь README/CHANGELOG под новую версию и не запускай `./scripts/build-all.sh` / `./scripts/build-release.sh --use-current-version` без отдельного явного подтверждения пользователя.
  - Релизная Phase не завершается на сборке: на чистом дереве запускаем `./scripts/build-all.sh` (он повышает версии и вызывает `./scripts/build-release.sh --use-current-version`), переносим tarball’ы в `doc/tmp/releases/`, фиксируем результаты в active plan/archive snapshot, передаем релиз пользователю, оставляем scope `ACTIVE`, получаем явное acceptance и только потом закрываем scope.
  - **doc/TODO/todo-plan.md** необходимо постоянно в риалтайме обновлять, после каждой подзадачи обязательный коммит, после каждого коммита его номер и наименование заносить, статус задачи тут же менять.

  ## Phase <N> — <описание> (owner: <имя>, updated: YYYY-MM-DD)
  ### Stream: <Короткое название>
  1. [STATUS] <задача 1 — scope: ≤3 файлов/пакетов; ожидаемый commit message>
  2. [STATUS] Git Commit: `<commit_message>` (hash: TBD)
  3. [STATUS] <задача 2 — scope: ≤3 файлов/пакетов; ожидаемый commit message>
  4. [STATUS] Git Commit: `<commit_message>` (hash: TBD)
  ```
  Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`. Каждый пункт обязан иметь «scope» (файлы или пакеты) и целевой commit message; для пунктов `Git Commit` фиксируется хеш. Микрозадачи обновляются сразу после коммита.

## 5. Цикл выполнения (Гейт Качества)
Для каждой подзадачи Stream из `todo-plan.md`:
1.  **Реализация**: Пиши код (помни: Микро-классы, Фасады, классы не более 500 строк).
2.  **Документация (Real-time)**: Если меняется логика или архитектура — **ОБНОВИ** `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (или другие доки) **ПРЯМО СЕЙЧАС**. Коммит должен содержать и код, и обновленную документацию.
3.  **Верификация**: Гейты запускаются автоматически через Husky (`.husky/pre-commit`, `.husky/pre-push`). Ручной прогон нужен только для диагностики:
    ```bash
    ./scripts/check-architecture.sh
    npm run lint
    npm run check:knip
    npm run format:fix
    npm run check:dup
    npm run check:links
    ```
4.  **Коммит**: ТОЛЬКО после зеленых гейтов.
    - Формат сообщения: `feat: <описание>` или `fix: <описание>`
    - **Авто-обновление**: Сразу отметь пункт как `[DONE]`  в `todo-plan.md`, если фича завершена.

## 6. Критические правила
- **НИКОГДА** не обходи Husky hooks / quality gates (например `git commit --no-verify`) и `check-architecture.sh`.
- **НИКОГДА** не редактируй версии в `package.json` вручную (используй `build-all.sh`).
- **ВСЕГДА** держи doc/SolidWorks-WorkFlow/System/SystemArchitecture.md и другие связанные с подзадачей документы из папки - doc/ в синхронизации с изменениями кода (в том же коммите).
- **Automation-first**: если проблема повторяется или проверяется формально, сначала ищи решение через скрипт, validator, hook или gate; prompt-инструкции используй как второй слой, а не как единственную защиту.

## 7. Release Build Checklist
Перед выполнением этого checklist обязательно получи отдельное явное подтверждение пользователя на сборку релиза. Нельзя начинать release notes, version bump, `build-all.sh` или `build-release.sh` только потому, что фиксы завершены.

0. Перед сборкой релиза определи БУДУЩУЮ версию (текущая из `package.json` + 1) и актуализируй `README.md` ("Current Release — vX.Y.Z") и `CHANGELOG.md` ("## [X.Y.Z]") на эту будущую версию. Закоммить обновлённые документы ДО запуска `build-all.sh`. Это гарантирует, что VSIX содержит README/CHANGELOG с правильной версией. Также обнови связанные архитектурные материалы из `doc/`, если они затронуты.
1. Перед началом убедись, что `npm install` выполнен — отсутствие зависимостей ломает `build:webview`/`build:web-client`.
2. Закрой все микро‑задачи/стримы: для затронутых пакетов должны пройти таргетные `npm run build --workspace …` (или `npm run build:webview`, `npm run typecheck:webview`) + гейты качества (обычно автоматически через `.husky/pre-commit` и `.husky/pre-push`). Только после этого чистим рабочее дерево.
3. Проверь, что `git status` пустой (никаких staged/unstaged). Версии пакетов/манифестов руками не меняем — это сделает скрипт.
4. Выполни `./scripts/build-all.sh` из корня. Скрипт поднимет версии, пересоберёт Claude/Codex/Gemini, core, CEF launcher, UI и соберёт tarball’ы в `~/.codeai-hub/releases` и `doc/tmp/releases/`. Если что-то упало — исправь проблему и перезапусти **только** `build-all.sh`.
5. Снова убедись, что `git status` пустой (все изменения от `build-all.sh` закоммичены, если это отдельная итерация).
6. Выполни `./scripts/build-release.sh --use-current-version`. Скрипт ожидает чистое дерево, использует текущую версию из `package.json`, прогоняет финальные гейты (архитектура, type-check, compile, SDK exclusions, advisory `check:links` / `check:dup`, prune dev deps) и собирает VSIX. При падении повторно запускаем **только** `build-release.sh` после исправления причин.
7. После успеха проверь вывод `scripts/build-release.sh`: должны появиться строки `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`. Забери `codeai-hub-<version>.vsix` из корня и при необходимости скопируй свежие tarball’ы из `~/.codeai-hub/releases` в `doc/tmp/releases/`.
8. Зафиксируй изменения (включая версии и манифесты), обнови active `doc/TODO/todo-plan.md` и при необходимости tracked archive/snapshot, если пользовательское визуальное тестирование еще не завершено.
9. Передай VSIX пользователю для установки и retest. В `todo-plan.md` после Stream сборки релиза должен оставаться активный Stream `User Visual Acceptance Testing`.
10. Только после явного acceptance от пользователя закрывай Stream визуального тестирования, архивируй `todo-plan.md` и planning-документ, обновляй `Docs_Index.md`. Если пользователь сообщает о сбое, scope остается `ACTIVE`, а в `todo-plan.md` добавляется Stream расследования/фикса.


Держи документ коротким; добавляй сюда только правила, которые реально блокируют работу.


# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `npm exec -- ultracite fix`
- **Check for issues**: `npm exec -- ultracite check`
- **Diagnose setup**: `npm exec -- ultracite doctor`

Biome (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**
- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**
- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**
- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Biome Can't Help

Biome's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Biome can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Biome. Run `npm exec -- ultracite fix` before committing to ensure compliance.
