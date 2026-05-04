# Plan Orchestrator Implementation Pack

**Дата сборки пакета:** 2026-05-04  
**Источник:** CodeAI Hub local Plan Orchestrator implementation  
**Статус:** переносимый documentation/reference pack, не SSOT и не часть `Docs_Index.md`

Эта папка намеренно не добавлена в `doc/SolidWorks-WorkFlow/Docs_Index.md`.
Назначение пакета другое: дать автономный, подробный набор документов и файлов, по которому внешний разработчик может воспроизвести такую же систему plan-first orchestration в другом репозитории.

## Что Внутри

- [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) - подробное описание архитектуры, lifecycle, хуков, скриптов, commit/debt механики, восстановления сессий и closeout.
- [MIGRATION_CHECKLIST.md](MIGRATION_CHECKLIST.md) - пошаговый checklist переноса системы в другой репозиторий.
- [PACKAGE_SCRIPTS.md](PACKAGE_SCRIPTS.md) - нужные `package.json` scripts и команды оператора.
- [REFERENCE_MANIFEST.md](REFERENCE_MANIFEST.md) - полный список файлов, скопированных в пакет.
- [reference/hooks/](reference/hooks/) - зеркала Husky hooks.
- [reference/scripts/plan-orchestrator/](reference/scripts/plan-orchestrator/) - зеркала всех скриптов и тестов Plan Orchestrator.
- [reference/planning/](reference/planning/) - planning-документы трех реализованных этапов.
- [reference/evidence/](reference/evidence/) - dogfood/evidence-документы проверок.
- [reference/archives/](reference/archives/) - архивные snapshots завершенных `todo-plan.md`.

## Минимальная Идея Системы

Plan Orchestrator превращает `doc/TODO/todo-plan.md` в machine-managed execution state.
Агент больше не "помнит" план в голове и не закрывает задачи вручную после произвольного коммита.
Вместо этого:

1. План содержит machine-readable JSON state block.
2. Текущая задача и ожидаемое сообщение коммита фиксируются в state.
3. Для no-commit задач используется `npm run plan:complete -- "<result>"`.
4. Для commit задач используется `npm run plan:commit -- "<expected commit message>"`.
5. Husky hooks не дают сделать прямой commit/push, если active plan нарушен.
6. `post-commit` финализирует hash и продвигает план к следующему пункту.
7. Если commit прошел, но post-commit не смог завершить обновление плана, создается debt file.
8. `npm run plan:repair` чинит recoverable debt или переводит scope в `BLOCKED`.
9. `npm run plan:closeout -- "<acceptance evidence>"` архивирует завершенный scope.
10. Финальный closeout commit заменяет active `doc/TODO/todo-plan.md` на short terminal `NONE` handoff template.

## Главный Результат Последнего Фикса

До последнего follow-up active `doc/TODO/todo-plan.md` после закрытия scope мог оставаться полным старым планом с `executionScopeStatus: NONE`.
Это было двусмысленно: статус говорил "нет активного scope", но файл визуально выглядел как старый активный план.

Теперь closeout finalization делает правильное состояние:

- полный план сохранен в `doc/TODO/Archive/`;
- planning-док перенесен в `doc/SolidWorks-WorkFlow/Plans/Archive/`;
- active `doc/TODO/todo-plan.md` заменен на short terminal `NONE` template;
- `currentTaskId`, `expectedCommitMessage`, `debt` очищены;
- в terminal template нет `AGENTS.md`, потому что этот контекст и так приходит при старте сессии.

## Быстрый Путь Для Воспроизведения

1. Скопировать [reference/scripts/plan-orchestrator/](reference/scripts/plan-orchestrator/) в `scripts/plan-orchestrator/`.
2. Скопировать [reference/hooks/](reference/hooks/) в `.husky/`.
3. Добавить scripts из [PACKAGE_SCRIPTS.md](PACKAGE_SCRIPTS.md) в `package.json`.
4. Создать `doc/TODO/todo-plan.md` по шаблону из [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md).
5. Убедиться, что `doc/TODO/todo-plan.md` может быть local/ignored machine-managed state, а tracked snapshots пишутся в `doc/TODO/Archive/`.
6. Запустить:

```bash
npm run plan:status
npm run plan:validate
node --test scripts/plan-orchestrator/*.test.mjs
```

7. Работать только через:

```bash
npm run plan:complete -- "<result>"
npm run plan:commit -- "<expected commit message>"
npm run plan:closeout -- "<acceptance evidence>"
npm run plan:repair
```

