# AGENTS.md Session And Orchestration Excerpt

Этот файл является переносимым excerpt из project-level `AGENTS.md`.
Он фиксирует только ту часть agent instructions, без которой Plan Orchestrator не будет работать как session lifecycle, даже если все scripts и hooks уже скопированы.

Полный `AGENTS.md` конкретного репозитория может содержать дополнительные правила кодстайла, архитектуры, релизов и общения.
При переносе системы в другой репозиторий адаптируйте этот excerpt под локальные пути, но сохраните lifecycle-инварианты.

## 1. Управление Сессиями

### Начало Сессии

1. **Единственный recovery owner:** сначала прочитай `doc/TODO/todo-plan.md` по фактической файловой системе. Этот файл может быть ignored/untracked; все равно именно он является активным состоянием работы.
2. **Если `Execution Scope Status: ACTIVE`:** не ищи legacy recovery reports, не восстанавливайся по спискам коммитов. Следуй только `Recovery Pack` и `Context Pack For This Cycle` из `doc/TODO/todo-plan.md`.
3. **Если `Execution Scope Status: BLOCKED`:** выполни `npm run plan:status`, прочитай blocker/debt reason и не продолжай реализацию до ремонта через `npm run plan:repair` или явного решения пользователя.
4. **Если `Execution Scope Status: NONE` или active plan отсутствует:** прочитай system-level architecture document, согласуй с пользователем новый scope, затем используй docs index для выбора релевантных документов.
5. Legacy recovery reports не являются recovery mechanism и не должны заставлять новую сессию искать отчеты.

## 2. Во Время Выполнения

1. Active `doc/TODO/todo-plan.md` - machine-managed execution state.
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

## 3. Конец Scope

1. **User Acceptance Gate:** закрытие active scope, архивирование `todo-plan.md` и planning-документа разрешены только после явного acceptance пользователя.
2. Closeout фиксируется в archived plan / planning-doc disposition, а не в новом обязательном recovery report.
3. Если active plan становится ignored local state, перед closeout должен быть создан tracked archive/snapshot в `doc/TODO/Archive/` или другом явно указанном tracked path.
4. Новый `doc/TODO/todo-plan.md` запрещено создавать или заменять, пока текущий plan имеет `Execution Scope Status: ACTIVE`, любой `IN_PROGRESS` пункт или открытый commit/debt lifecycle.
5. Сначала closeout должен быть завершен оркестратором: финальный closeout commit/complete переводит scope в terminal `NONE` state (`currentTaskId: null`, `expectedCommitMessage: null`) и только потом можно начинать новый planning intake.
6. Нельзя помечать невыполненные задачи как `DONE` ради закрытия scope. Если пользователь закрывает scope с невыполненной работой, эти пункты должны получить поддержанный terminal disposition через отдельный closeout flow, а не ручную замену active plan.
7. В конце работы не оставляй `.git/codeai-plan-debt`; если он существует, сначала выполни `npm run plan:repair`.

## 4. Execution Planning Rules

1. `doc/TODO/todo-plan.md` содержит стратегию выполнения и текущий execution state.
2. Только `doc/TODO/todo-plan.md` содержит список документов, которые нужно читать для восстановления контекста текущего execution cycle.
3. `todo-plan.md` может содержать несколько фаз и stream'ов.
4. Каждая микро-задача должна затрагивать не более трех файлов.
5. После каждой commit-задачи должен быть отдельный следующий пункт `Git Commit: ...`.
6. Статусы задач: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
7. Каждый пункт обязан иметь scope и expected commit message или явно `not required`.
8. Для пунктов `Git Commit` фиксируется hash.
9. Final streams обязательны: tooling/release verification, user acceptance, scope closeout.

## 5. Context Pack Rule

`Context Pack For This Cycle` должен содержать только scope-specific recovery documents.

Не включайте `AGENTS.md` в `Read this context before implementation`, если runtime/agent platform уже подает `AGENTS.md` при старте сессии.
Иначе plan будет дублировать bootstrap instructions и раздувать recovery context.

## 6. Минимальный Стартовый Протокол Агента

В начале каждой сессии агент должен выполнить:

```bash
npm run plan:status
```

Затем:

- при `ACTIVE` - читать active plan Context Pack и продолжать current task;
- при `BLOCKED` - запускать repair/эскалацию;
- при `NONE` - начинать новый planning intake только после согласования scope.

