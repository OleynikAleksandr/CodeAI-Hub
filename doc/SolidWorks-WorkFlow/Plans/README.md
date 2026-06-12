# SolidWorks-WorkFlow — Plans

Эта папка хранит **временные архитектурные документы для планирования**.

Их роль:
- зафиксировать новую архитектурную границу перед `doc/TODO/todo-plan.md`;
- согласовать проблему, решение, границы и структуру;
- не смешивать planning-доки с реализованными SSOT-документами.

## Current Root Shelf

Root `Plans/` is intentionally kept small.

- `DevelopmentTree_DownstreamExecutionRefactor_Architecture.md` — active strategic line for unfinished Development Tree downstream execution work.
- `QualityGates_RestoreIsolation_Architecture.md` — closeout-pending source for the currently active `doc/TODO/todo-plan.md`; it is retained in root only until that scope is accepted and archived.
- `Archive/DevelopmentTree_BranchWorkflow_Architecture.md` — archived reference baseline; live Development Tree decisions are carried by SSOT docs and the downstream refactor line.
- `Archive/DevelopmentTree_ProductPartSubagentOrchestration.md` — archived absorbed implementation planning source; protective Product Part / cluster orchestration decisions have been folded into SSOT docs and the downstream refactor line.

New root planning documents should be temporary and should explicitly state whether they are the active strategic line, a bounded next-step refactor source, or a closeout-pending source.

## Правила

1. Для обычных багфиксов сначала используется `doc/BugRegistry.md`.
2. Planning-док в `Plans/` создаётся только если работа меняет архитектурную границу, вводит новый модуль/контракт/алгоритм или требует отдельного design intake перед `todo-plan.md`.
3. Корень `Plans/` является рабочей полкой для небольшого набора активных planning/directive документов текущего или отложенного scope. Каждый такой документ должен быть описан в `doc/SolidWorks-WorkFlow/Docs_Index.md` и получить явный disposition при closeout; служебный `README.md` не считается рабочим planning-документом.
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
