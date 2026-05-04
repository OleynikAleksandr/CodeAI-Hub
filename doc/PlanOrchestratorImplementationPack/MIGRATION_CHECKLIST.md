# Migration Checklist

Этот checklist рассчитан на перенос Plan Orchestrator в другой репозиторий.
Он предполагает Node.js ESM scripts, Git, Husky hooks и Markdown-based planning lifecycle.

## 1. Подготовить Структуру Репозитория

- Создать `doc/TODO/`.
- Создать `doc/TODO/Archive/`.
- Создать `doc/SolidWorks-WorkFlow/Plans/`.
- Создать `doc/SolidWorks-WorkFlow/Plans/Archive/`.
- Создать `scripts/plan-orchestrator/`.
- Убедиться, что `doc/TODO/Archive/` и `doc/SolidWorks-WorkFlow/Plans/Archive/` не ignored.
- Решить, будет ли `doc/TODO/todo-plan.md` tracked или ignored local state.
- Если `todo-plan.md` ignored, принять правило: tracked history всегда создается через snapshots/archives.

## 2. Скопировать Скрипты

- Скопировать все файлы из [reference/scripts/plan-orchestrator/](reference/scripts/plan-orchestrator/) в `scripts/plan-orchestrator/`.
- Сохранить `.mjs` расширения.
- Не объединять файлы в один большой script.
- Не удалять тесты: они являются executable specification системы.

## 3. Скопировать Hooks

- Скопировать [reference/hooks/pre-commit](reference/hooks/pre-commit) в `.husky/pre-commit`.
- Скопировать [reference/hooks/commit-msg](reference/hooks/commit-msg) в `.husky/commit-msg`.
- Скопировать [reference/hooks/post-commit](reference/hooks/post-commit) в `.husky/post-commit`.
- Скопировать [reference/hooks/pre-push](reference/hooks/pre-push) в `.husky/pre-push`.
- Скопировать [reference/hooks/post-checkout](reference/hooks/post-checkout) в `.husky/post-checkout`.
- Если репозиторий использует `post-merge` или `post-rewrite`, можно подключить к ним тот же branch advisory script.
- Сделать hooks executable:

```bash
chmod +x .husky/pre-commit
chmod +x .husky/commit-msg
chmod +x .husky/post-commit
chmod +x .husky/pre-push
chmod +x .husky/post-checkout
```

## 4. Добавить Package Scripts

- Добавить команды из [PACKAGE_SCRIPTS.md](PACKAGE_SCRIPTS.md).
- Проверить, что quality scripts реально существуют в вашем репозитории.
- Если у вас нет `knip`, `jscpd`, `Ultracite` или markdown-link checker, заменить команды на локальные аналоги.
- Не удалять `plan:*` commands.

## 5. Создать Первый Active Plan

- Создать или утвердить planning-документ.
- Создать `doc/TODO/todo-plan.md`.
- Вставить `codeai-plan-state` block.
- Установить:
  - `executionScopeStatus: "ACTIVE"`;
  - `planId`;
  - `branch`;
  - `baseHead`;
  - `lastRecordedCommit`;
  - `planningSource`;
  - `currentTaskId`;
  - `expectedCommitMessage`;
  - `debt: null`.
- Добавить Context Pack.
- Не добавлять `AGENTS.md` в Context Pack, если этот файл и так подается агенту при старте сессии.
- Разбить работу на пары:
  - implementation/evidence task;
  - отдельный `Git Commit: ...` item.
- Для no-commit задач указать `expected commit: not required`.

## 6. Проверить Валидатор

```bash
npm run plan:status
npm run plan:validate
node --test scripts/plan-orchestrator/*.test.mjs
```

Ожидаемое состояние:

- `Execution Scope Status: ACTIVE`;
- `Current Task` указывает на первый `[IN_PROGRESS]` task;
- `Expected Commit` совпадает с task;
- `Debt: none`;
- `Validation: OK`.

## 7. Работать Через Оркестратор

Для commit task:

```bash
git add <scoped files>
npm run plan:commit -- "<expected commit message>"
```

Для no-commit task:

```bash
npm run plan:complete -- "<short result>"
```

Для диагностики:

```bash
npm run plan:status
npm run plan:validate
```

Для recoverable сбоя:

```bash
npm run plan:repair
```

## 8. Проверить Push Guard

- Оставить active plan валидным.
- Запустить `git push --dry-run` или локально вызвать:

```bash
node ./scripts/plan-orchestrator/plan-hook-pre-push.mjs
```

- Создать controlled fixture или временно проверить, что push block срабатывает при:
  - open debt;
  - invalid plan;
  - branch mismatch;
  - unreachable `lastRecordedCommit`.

## 9. Closeout

- Получить explicit user acceptance.
- Зафиксировать acceptance evidence в tracked файле.
- Провести acceptance evidence через `plan:commit`.
- Запустить:

```bash
npm run plan:closeout -- "<acceptance evidence>"
```

- Застейджить:
  - archive snapshot в `doc/TODO/Archive/`;
  - planning-doc move в `Plans/Archive/`;
  - любые docs navigation updates, если они нужны.
- Выполнить:

```bash
npm run plan:commit -- "<expected closeout commit message>"
```

После post-commit active `doc/TODO/todo-plan.md` должен стать terminal `NONE` template.

## 10. Финальная Проверка

```bash
npm run plan:status
npm run plan:validate
git status --short
test ! -e .git/codeai-plan-debt
rg -n "AGENTS\\.md" doc/TODO/todo-plan.md || echo "AGENTS.md: absent"
```

Ожидаемое состояние:

- `Execution Scope Status: NONE`;
- `Current Task: none`;
- `Expected Commit: none`;
- `Debt: none`;
- `Validation: OK`;
- рабочее дерево чистое;
- terminal template не содержит `AGENTS.md`.

