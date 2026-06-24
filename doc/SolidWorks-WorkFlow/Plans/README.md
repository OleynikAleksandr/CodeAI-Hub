# SolidWorks-WorkFlow — Plans

Эта папка хранит **временные архитектурные документы для планирования**.

Их роль:
- зафиксировать новую архитектурную границу перед `doc/TODO/todo-plan.md`;
- согласовать проблему, решение, границы и структуру;
- не смешивать planning-доки с реализованными SSOT-документами.

## Current Root Shelf

Root `Plans/` is intentionally kept small.

- `DevelopmentTree_ProductPartLaneCloseout_ImplementationPlan.md` — active strategic line for unfinished Development Tree documentation/code lane lifecycle work after the v1.2.513 retest rejected automatic Product Part lane deletion.
- `Intent_Normalizer_Module_Planning_RU.md` — backlog planning source for a future software-product intent normalizer: a cheap/local text-in JSON-out pre-turn layer that turns vague user requests into a strict 10-field intent packet for a stronger executor-agent, with Prompt 2 benchmark notes, `google/gemini-2.5-flash-lite` as current hosted baseline, and future whitelisted system/tool profile routing.
- `Archive/DevelopmentTree_UserGateReviewCursor_Architecture.md` — archived completed bounded refactor source closed by release `1.2.512`; stable Product Part user-gate cursor, attention marker, and immediate attention-clear behavior lives in SSOT docs, while future cluster/module/code user gates remain in the downstream refactor line.
- `Archive/DevelopmentTree_ProductPartWorktreeLanes_ImplementationPlan.md` — archived completed implementation plan closed by release `1.2.509`; stable Product Part lane behavior lives in SSOT docs, while future cluster/module/code lanes remain in the downstream refactor line.
- `Archive/QualityGates_RestoreIsolation_Architecture.md` — archived completed Quality Gates restore-isolation planning source; stable behavior lives in SSOT docs.
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
