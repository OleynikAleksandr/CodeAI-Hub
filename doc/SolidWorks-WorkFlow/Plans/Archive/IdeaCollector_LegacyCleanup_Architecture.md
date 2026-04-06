# Idea / Idea Collector Legacy Cleanup — Architecture Contract

**Status:** Active cleanup planning doc
**Updated:** 2026-03-22
**Owner:** Oleksandr

---

## Scope

Этот документ фиксирует архитектурную границу cleanup/refactor scope вокруг legacy слоя `Idea` / `Idea Collector`.

Цель:
- убрать legacy naming `Idea` / `Idea Collector` из живого current workflow, где канонический шаг уже называется `Description`;
- отделить живой compat-layer от реально мёртвого legacy-кода;
- удалить неиспользуемые package/UI/runtime хвосты старой архитектуры;
- завершить scope новым локальным релизом и baseline для regression.

---

## Problem statement

В SSOT текущий workflow уже давно выглядит так:

`Description -> Virtual Simulation -> Diagram Modules -> Diagram Facades`

Это зафиксировано в:
- `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
- `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`

Но в кодовой базе всё ещё смешаны три разных слоя:

1. **Current architecture under legacy names**
- часть живого `Description` pipeline всё ещё называется `idea-*` / `idea-collector-*`, хотя реально обслуживает текущий шаг `Description` и `Virtual Simulation`;

2. **Compat bridges**
- часть runtime/PM/UI всё ещё поддерживает `idea` как внутренний alias или bootstrap stage, хотя user-facing workflow уже не использует его как канонический шаг;

3. **Dead legacy**
- старый full-development-flow (`Idea -> Spec -> Plan -> Execute`) и orphaned `packages/agents/idea-collector` слой больше не являются канонической частью продукта.

Пока это смешение остаётся в репозитории:
- любая правка prompt/help/contract слоя требует лишней когнитивной нагрузки;
- naming путает active product semantics и compatibility;
- user-facing и internal refactor decisions труднее верифицировать по коду.

---

## Classification baseline

### A. Current architecture under legacy names

Это код, который **живёт в новой архитектуре**, но сохранил старые имена:
- PM submit/orchestration для `Description`;
- questionnaire UI/parser/helpers;
- часть shared structured-output utilities;
- provider-side structured-output parser с legacy названием.

Для этой группы правило одно:
- **не удалять сразу**;
- сначала **переименовать** в термины новой архитектуры.

### B. Active compat bridges

Это код, который ещё нужен как переходный мост:
- `/api/v1/orchestrator/idea-contract` alias;
- `stage: "idea"` в pre-submit bootstrap session;
- `idea -> description` schema remap;
- legacy path fallbacks для questionnaire/description outputs.

Для этой группы правило:
- сохранять только до миграции живых callers;
- после переключения callers удалять или сужать до redirect-only.

### C. Dead legacy

Это код, который уже не является частью current product surface:
- disabled full app host flow (`Idea`, `Spec`, `Plan`, `Execute`);
- extension command wiring для старого flow wizard;
- orphaned `packages/agents/idea-collector` package, если у него не останется живых callers;
- устаревшие prompt/schema/assets старого `Idea Collector`.

Для этой группы правило:
- удалить из живого кода после проверки отсутствия runtime callers.

---

## Target decisions

### 1. Current workflow language

В живом продукте:
- шаг называется `Description`;
- agent называется `Description Agent`;
- pre-submit surface называется `Description Questionnaire`;
- `Idea` допустим только как исторический термин или compat note.

### 2. Current-flow files must match current semantics

Если файл обслуживает current `Description` / `Virtual Simulation` pipeline, но называется `idea-*` / `idea-collector-*`, он должен быть:
- либо переименован;
- либо заменён новым файлом с current naming;
- либо сведён к generic workflow naming.

### 3. Compat must stop pretending to be product semantics

Compat-слой не должен:
- просачиваться в PM/UI labels;
- называться каноническим текущим шагом;
- оставаться в новых prompt/help contracts как будто это active architecture.

### 4. Disabled old flow is not protected by product contract

Старый flow wizard и `Idea -> Spec -> Plan -> Execute` path не являются current SSOT.
Если код реально отключён и не участвует в активном продукте, его cleanup разрешён.

### 5. Orphaned legacy package should be removed

Если `packages/agents/idea-collector` не используется живыми runtime callers после migration, package удаляется вместе со stale dependency и stale assets.

---

## Refactor sequence

### Phase order

1. Переименовать current-flow PM/UI/helpers без изменения поведения.
2. Переключить bootstrap/runtime aliases c `idea` на explicit `description`.
3. Удалить disabled old home-view flow surfaces.
4. Удалить orphaned package / provider naming bridges.
5. Обновить SSOT/docs и собрать новый релиз.

### Why this order

- сначала сохраняем живое поведение и делаем naming честным;
- затем снимаем compat aliases;
- только потом удаляем мёртвые legacy-ветки;
- релиз собираем уже после того, как naming, runtime и docs синхронизированы.

---

## Verification criteria

Cleanup считается успешным, когда одновременно верно следующее:

1. PM `Description` pre-submit/post-submit работает без `idea` naming в active current-flow коде.
2. Current workflow contract не требует `/idea-contract` и `stage: "idea"` как живую семантику.
3. Disabled full-development-flow surfaces не влияют на current product runtime.
4. `packages/agents/idea-collector` либо удалён, либо явно признан compat-only с доказанным живым caller.
5. Active SSOT/docs описывают только `Description` как первый current workflow step.
6. Собран новый локальный релиз и regression baseline обновлён.

---

## Current status snapshot (2026-03-22)

### Уже очищено в active PM/workflow surface

- PM bootstrap и start flow больше не используют `stage: "idea"` или `/idea-contract` как живую семантику первого шага.
- User-facing `Description` surface больше не показывает `Idea Collector` в provider picker, callback naming или toolbar/start flow.
- Неиспользуемые PM wrappers `idea-collector-submit-service.ts` и `idea-collector-provider-picker.tsx` удалены.
- Release packaging больше не пытается собирать или линковать удалённый `@codeai-hub/idea-collector`.

### Что ещё остаётся legacy, но уже не является product semantics

- internal helper aliases в shared UI/services, которые всё ещё носят `idea-*` имена, но обслуживают compat/migration path;
- provider structured-output parsers, где `Idea Collector` терминология пока ещё живёт внутри internal parse functions;
- disabled app-host / old flow remnants, сохранённые вне active PM surface;
- redirect-only runtime endpoint `/idea-contract` и archived/docs references.

### Как трактовать остатки

- Если legacy имя больше не имеет callers в active PM/workflow surface, его нужно удалять, а не сохранять "на будущее".
- Если legacy имя ещё обслуживает текущий runtime как internal helper, оно не должно просачиваться в user-facing copy, SSOT шагов или release notes.

---

## Non-goals

В этот scope не входит:
- redesign самого шага `Description`;
- новая логика reviewer;
- смена downstream chain `Virtual Simulation -> Diagram Modules -> Diagram Facades`;
- функциональные улучшения артефактов вне cleanup legacy слоя, если они не блокируют этот refactor.

---

## Related documents

- `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
- `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Docs_Index.md`
- `doc/Sessions/Archive/Session122.md`
