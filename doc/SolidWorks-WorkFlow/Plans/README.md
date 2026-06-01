# SolidWorks-WorkFlow — Plans

Эта папка хранит **временные архитектурные документы для планирования**.

Их роль:
- зафиксировать новую архитектурную границу перед `doc/TODO/todo-plan.md`;
- согласовать проблему, решение, границы и структуру;
- не смешивать planning-доки с реализованными SSOT-документами.

## Правила

1. Для обычных багфиксов сначала используется `doc/BugRegistry.md`.
2. Planning-док в `Plans/` создаётся только если работа меняет архитектурную границу, вводит новый модуль/контракт/алгоритм или требует отдельного design intake перед `todo-plan.md`.
3. Корень `Plans/` является рабочей полкой: здесь должен лежать только текущий активный planning-документ, с которым идёт ближайшее обсуждение/нарезка scope. Служебный `README.md` не считается рабочим planning-документом.
4. Пока задача важна, но ещё не взята в активную реализацию, документ живёт в `Plans/Backlog/` и **не является SSOT текущей системы**.
5. После завершения реализации planning-док обязан пройти один из путей:
   - превратиться в живой SSOT и переехать в `System/`, `Clusters/`, `Modules/` или `Contracts/`;
   - уйти в `Plans/Archive/`, если его нужно сохранить только как исторический план;
   - быть заменён короткой `compat/redirect`-нотой в `Plans/Archive/`, если сам путь нужен только для старых ссылок из session reports или archived TODO;
   - быть удалённым, если это был временный refactoring/cleanup design и все живые SSOT уже синхронизированы.
6. `Contracts/`, `Modules/`, `Clusters/`, `System/` содержат только реализованные и актуальные документы, а compat-redirect notes живут только в `Plans/Archive/`.

## Active Subfolders

- `Backlog/` — важные planning-документы, которые ещё не являются текущим активным scope и не закрыты как история.
- `Archive/` — завершённые исторические planning-документы; правила архива см. в `Plans/Archive/README.md`.
- `Managed_Step_Orchestration/` — inactive marker folder after the `1.2.274` managed workflow orchestration closeout. Completed planning sources were moved to `Plans/Archive/`; new managed workflow work must begin with a fresh planning document and an active `doc/TODO/todo-plan.md`.
