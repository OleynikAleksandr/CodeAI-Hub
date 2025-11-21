---
description: Определяет как создавать Task
---

# Development Task

## Execution Rules
- Each subtask touches ≤3 files. Перед коммитом прогоняем `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем выполняем таргетную сборку (`npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`). После зелёных гейтов — коммит и апдейт плана (дата, статус, хеш).
- Если по факту разработки оказывается, что конкретная зазача Стрима затрагивает больше 3 файлов - такая задача разбивается и список задач в Стриме переписывается.
- Stream завершается после того, как все его задачи закрыты таргетными сборками затронутых пакетов/клиентов. Для серийных задач допускается диагностический прогон `npm run build --workspace <package>` по цепочке (например, Claude → Codex → core), чтобы локализовать ошибки без запуска `build-all`.
- Phase завершается на чистом дереве: запускаем `./scripts/build-all.sh` (он повышает версии и вызывает `./scripts/build-release.sh --use-current-version`), переносим tarball’ы в `doc/tmp/releases/`, фиксируем результаты в `doc/Sessions/`.
- Любое изменение архитектуры/логики требует синхронного обновления документации и ссылки на коммит.
- doc/TODO/todo-plan.md необходимо постоянно в риалтайме обновлять, после каждого коммита его номер и наименование заносить, статус задачи тут же менять.

## Phase <N> — <описание> (owner: <имя>, updated: YYYY-MM-DD)
### Stream: <Короткое название>
1. [STATUS] <задача 1 — указать файлы и ожидаемый commit id>
2. [STATUS] <задача 2>
```

Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`. Каждая пункт обязан иметь «scope» (файлы или пакеты) и целевой commit message. Микрозадачи обновляются сразу после коммита.


Держи документ коротким; добавляй сюда только правила, которые реально блокируют работу.