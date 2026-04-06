# 🚀 CodeAI Hub: Мастер-процесс и Архитектура

**СИСТЕМНАЯ ИНСТРУКЦИЯ**: 
Это ГЛАВНАЯ директива для всех сессий разработки. Ты ОБЯЗАН строго следовать этому жизненному циклу.

## 1. Управление сессиями (Session Lifecycle)

### Начало сессии
1. **Чтение отчета**: Найди последний файл `doc/Sessions/SessionXXX.md`.
2. **Базовый SSOT**: Прочитай `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, чтобы восстановить глобальные инварианты и карту системы.
3. **Режим чтения коммитов зависит от статуса scope**:
   - Если в отчете `Execution Scope Status: ACTIVE`, раздел `Git commits` — это обязательный путь восстановления контекста. Ты ОБЯЗАН просмотреть каждый коммит из списка, используя `git show --stat <hash>` и `git show <hash>`.
   - Если в отчете `Execution Scope Status: COMPLETED`, раздел `Git commits` носит reference-only характер. Не нужно читать все коммиты по умолчанию; сначала обсуди с пользователем новый scope.
4. **Маршрут продолжения**:
   - Если в отчете `Execution Scope Status: ACTIVE`, следуй указанному там `Recovery Owner`. Если он указывает на активный `doc/TODO/todo-plan.md`, то именно он является единственным владельцем списка документов для восстановления контекста текущего execution cycle.
   - Если в отчете `Execution Scope Status: COMPLETED`, то после чтения базового SSOT и обсуждения нового задания с пользователем используй указанный в отчете `Scope Discovery Index`, чтобы выбрать релевантные документы для нового planning scope.

### Конец сессии
1. **Отчет**: Создай или обнови отчет `doc/Sessions/SessionXXX.md` в одном из двух типов.

#### Тип A — Completion Report
Используется, когда весь активный `todo-plan.md` выполнен, заархивирован и активного execution scope больше нет.

```markdown
# Session <N> — <Краткое название темы сессии>

**Date:** YYYY-MM-DD HH:MM (Timezone)
**Branch:** <branch_name>
**Version:** <current_version>
**Execution Scope Status:** COMPLETED

---

# 1. Work Done in This Session

## Work summary
- <Краткое описание выполненной задачи 1>
- <Краткое описание выполненной задачи 2>
- <Результаты сборки/тестов>

## Git commits
(REFERENCE ONLY: этот список сохраняется для исторической трассировки и расследования регрессий; следующая сессия не обязана читать все коммиты по умолчанию.)
- `<hash> <commit_message>`
- `<hash> <commit_message>`

---

# 2. Instructions for Next Session

**Base SSOT:** `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
**Scope Discovery Index:** `doc/SolidWorks-WorkFlow/Docs_Index.md`

## Plans for next session
- Активный execution scope отсутствует.
- Следующий агент обязан сначала прочитать `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` как базовый SSOT.
- Затем агент обязан согласовать с пользователем новый scope.
- После этого агент обязан открыть `doc/SolidWorks-WorkFlow/Docs_Index.md`, выбрать релевантные документы для нового scope и только потом формировать новый planning-doc.
- До появления нового planning-doc и нового `doc/TODO/todo-plan.md` навигационной опорой служит `doc/SolidWorks-WorkFlow/Docs_Index.md`.
```

#### Тип B — Continuation Report
Используется, когда активный `todo-plan.md` выполнен только частично и работу нужно продолжать в следующей сессии.

```markdown
# Session <N> — <Краткое название темы сессии>

**Date:** YYYY-MM-DD HH:MM (Timezone)
**Branch:** <branch_name>
**Version:** <current_version>
**Execution Scope Status:** ACTIVE

---

# 1. Work Done in This Session

## Work summary
- <Краткое описание выполненной задачи 1>
- <Краткое описание выполненной задачи 2>
- <Результаты сборки/тестов>

## Git commits
(ВАЖНО: при `Execution Scope Status: ACTIVE` следующая сессия обязана просмотреть каждый коммит через `git show --stat <hash>` и `git show <hash>`.)
- `<hash> <commit_message>`
- `<hash> <commit_message>`

---

# 2. Instructions for Next Session

**Recovery Owner:** `doc/TODO/todo-plan.md`

## Plans for next session
- Продолжать активный execution scope по `doc/TODO/todo-plan.md`.
- Список документов для восстановления контекста находится только в активном `doc/TODO/todo-plan.md`.
```

## 2. Архитектурные принципы (Подход "Кластерно-Модульный")
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

**Перед тем как создать или обновить `todo-plan.md`, необходимо:**
1. **Создать или обновить planning-документ** в `doc/SolidWorks-WorkFlow/Plans/` (например, `doc/SolidWorks-WorkFlow/Plans/NewFeature_Architecture.md`).
2. В этом документе утвердить: проблему, решение, структуру классов, контракты.
3. Только **после утверждения** этого документа пользователем, мы берем его за основу и нарезаем на Фазы и Стримы в `todo-plan.md`.

## 4. Этап Планирования (Execution Planning)
- **Источник правды**: `doc/TODO/todo-plan.md` содержит Стратегию.
- **Единственный context pack активного цикла**: только `doc/TODO/todo-plan.md` содержит список документов, которые нужно прочитать для восстановления контекста и выполнения задач текущего execution cycle.
- **Операционный вид**: Используй свой 'todo' для отслеживания *текущего* активного пункта из `todo-plan.md`.
`todo-plan.md` - может содержать несколько фаз и в каждой фазе несколько Stream с перечнем микро задач - не более 3-х файлов исправлений или вновь созданных.
Полностью Реализованный `todo-plan.md` переименовывается с префиксом последней реализованной Фазы (например - todo-plan-phase3.md) и кладется в папку -
doc/TODO/Archive/
На его месте создается новый `todo-plan.md` под новые задачи.
- **Обязательный closeout Plans после завершения todo-plan:** как только `doc/TODO/todo-plan.md` полностью закрыт и переносится в `doc/TODO/Archive/`, необходимо в той же сессии провести ревизию `doc/SolidWorks-WorkFlow/Plans/` по этому execution cycle.
  Для каждого planning-документа, на который опирался завершенный `todo-plan`, обязательно принять одно из решений:
  1. перенести его стабильные итоговые выводы в канонические SSOT-документы (`System/`, `Clusters/`, `Modules/`, `Contracts/`);
  2. перенести сам planning-документ в `doc/SolidWorks-WorkFlow/Plans/Archive/`, если он завершен и нужен как история;
  3. удалить документ, если он был временным рабочим refactoring/intake-доком и не несет самостоятельной исторической ценности.
  После этого нужно:
  - обновить `doc/SolidWorks-WorkFlow/Docs_Index.md`;
  - поправить ссылки в `doc/Sessions/` и `doc/TODO/Archive/`, если они указывали на старый active path;
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
    - `<doc 1>`
    - `<doc 2>`
    - `<doc 3>`
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
  - Phase завершается на чистом дереве: 
запускаем `./scripts/build-all.sh` (он повышает версии и вызывает `./scripts/build-release.sh --use-current-version`), переносим tarball’ы в `doc/tmp/releases/`, фиксируем результаты в `doc/Sessions/`.
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

## 7. Release Build Checklist
0. Перед сборкой релиза актуализируй документы: в первую очередь `README.md` и `CHANGELOG.md`, а также связанные архитектурные материалы из `doc/`. Релиз собирается только для версии, указанной в этих документах.
1. Перед началом убедись, что `npm install` выполнен — отсутствие зависимостей ломает `build:webview`/`build:web-client`.
2. Закрой все микро‑задачи/стримы: для затронутых пакетов должны пройти таргетные `npm run build --workspace …` (или `npm run build:webview`, `npm run typecheck:webview`) + гейты качества (обычно автоматически через `.husky/pre-commit` и `.husky/pre-push`). Только после этого чистим рабочее дерево.
3. Проверь, что `git status` пустой (никаких staged/unstaged). Версии пакетов/манифестов руками не меняем — это сделает скрипт.
4. Выполни `./scripts/build-all.sh` из корня. Скрипт поднимет версии, пересоберёт Claude/Codex/Gemini, core, CEF launcher, UI и соберёт tarball’ы в `~/.codeai-hub/releases` и `doc/tmp/releases/`. Если что-то упало — исправь проблему и перезапусти **только** `build-all.sh`.
5. Снова убедись, что `git status` пустой (все изменения от `build-all.sh` закоммичены, если это отдельная итерация).
6. Выполни `./scripts/build-release.sh --use-current-version`. Скрипт ожидает чистое дерево, использует текущую версию из `package.json`, прогоняет финальные гейты (архитектура, type-check, compile, SDK exclusions, advisory `check:links` / `check:dup`, prune dev deps) и собирает VSIX. При падении повторно запускаем **только** `build-release.sh` после исправления причин.
7. После успеха проверь вывод `scripts/build-release.sh`: должны появиться строки `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`. Забери `codeai-hub-<version>.vsix` из корня и при необходимости скопируй свежие tarball’ы из `~/.codeai-hub/releases` в `doc/tmp/releases/`.
8. Зафиксируй изменения (включая версии и манифесты), обнови `doc/TODO/todo-plan.md`, создай новый `doc/Sessions/SessionXXX.md`.
9. Только после этого передавай VSIX или делись релизом.


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
