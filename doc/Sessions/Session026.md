# Session 026 — React Flow Residual References Cleanup in Active SSOT

**Date:** 2026-04-09 16:20 (CEST)
**Branch:** main
**Version:** 1.1.923
**Execution Scope Status:** ACTIVE

---

# 1. Work Done in This Session

Docs-only session: пользователь обнаружил противоречия между текущим CSS Grid baseline (React Flow удалён в 1.1.921, projection adapters переименованы в 1.1.923) и содержимым `System/SystemArchitecture.md`, `System/WorkflowSteps_Overview.md`, а также заметил, что `System/Diagram_Modules_ProductPart_Decomposition_And_Progressive_Rendering_Architecture.md` — это уже материализованный planning-doc, который должен быть удалён. Scope был оформлен как отдельный `doc/TODO/todo-plan.md` (Phase 1 — React Flow Residual References Cleanup) без отдельного planning-doc в `Plans/`, поскольку правки не затрагивают исходный код и не требуют release build. Пользователь изначально запросил релизную сборку, затем передумал: релиз не собирался, scope остаётся открытым — "мы ещё пройдёмся по документам потом".

## Phase 0 — Phase closeout предыдущего cycle (Session025)

### Stream 0 — Archival of Session025 execution cycle

- Закрыт активный execution cycle `Sidecar v2 + Docs Cleanup + Projection Rename + Release 1.1.923` предыдущей сессии.
- `doc/TODO/todo-plan.md` (все три Phase DONE) перемещён в `TODO/Archive.zip` как `todo-plan-phase1-2-3-sidecar-v2-docs-cleanup-projection-rename.md`. Создан новый пустой `doc/TODO/todo-plan.md` для текущего React Flow residual cleanup scope.
- **Pre-existing archive debt из Session025 исправлен:** при распаковке `TODO/Archive.zip` обнаружено, что он содержит nested stale копию `Archive/Archive.zip` (692 K, pre-compression snapshot) — leaked из Stream 3B Session025 во время re-zip процедуры. Cleaned + re-packed. Итог: `TODO/Archive.zip` сжался с 756 K до **64 K** без потери content'а (20 historical todo-plan snapshots + 1 новый).
- `TODO/Archive.README.md` обновлён: счётчик описан как "grows on closeout" вместо frozen "22 `.md`" (который был изначально неверен — он считал nested zip + .DS_Store как md-файлы).
- Оба completed planning-doc'а из Session025 перенесены в `Plans/Archive.zip`: `DiagramModules_Sidecar_v2_LayoutParams_Architecture.md` + `DiagramModules_Projection_Naming_And_Archive_Compression_Architecture.md`. `Plans/Archive.README.md` обновлён аналогично (grows-on-closeout формулировка, исправлен stale "77" счётчик).
- `Docs_Index.md` — убраны bullets на оба completed planning-doc'а + переформулирован Plans/Archive.zip pointer как "rolling historical collection" вместо frozen 77-document count.

## Phase 1 — React Flow Residual References Cleanup (docs-only)

### Stream 1 — Rewrite SystemArchitecture.md §6.5 under CSS Grid

§6.5 "Diagram Modules Ownership Hierarchy Boundary" всё ещё описывал ownership hierarchy в терминах удалённого React Flow API. Конкретные правки:

- **Nested container model bullet** (был: `parentId`, `extent: "parent"`, `containerConstraints`, collision avoidance) — переписан под nested CSS Grid контейнеры, где `Product Part` = top-level grid, `Cluster` = nested grid, `Module` = child card. Контейнеры явно не владеют pixel-level constraints — layout driven CSS Grid движком браузера, а не JS measure/place pass.
- **Progressive rendering bullet** (был: "`React Flow` обязан progressively регенерировать graph") — переписан на neutral "visual shell обязана progressively регенерировать CSS Grid composition".
- **`measure -> place` first-open layout bullet** (был: "runtime сначала измеряет header/content budget …, затем размещает child nodes накопительно") — полностью переписан под declarative-контракт: runtime отдаёт visual shell semantic tree + optional layout params, CSS Grid engine размещает child cards нативно, runtime не владеет header budgets.
- **`module-map.flow.json` bullet** (был: "хранит только geometry/positions; не переносит ownership semantics") — прямо противоречил §6.2 Sidecar v2. Переписан под sidecar v2 (placeholder positions + viewport + optional `layoutParams` с CSS Grid overrides).
- **Pointer "Связанный planning-док"** — удалён, поскольку сам planning-doc удалён в Stream 3.
- Раздел header обновлён: `updated 2026-04-09 post React Flow removal and Sidecar v2`.
- Исторические маркеры React Flow (§6.2 line 239 "React Flow удалён в релизе 1.1.921", §6.4 line 321 "Нет collision avoidance/containerConstraints/resizeContainersToFit — всё это реализует браузер", новый §6.5 bullet "контейнеры не владеют parentId/containerConstraints") **намеренно сохранены** как post-1.1.921 boundary markers.

### Stream 2 — Rewrite WorkflowSteps_Overview.md § Шаг 3 — Diagram Modules

- Line 165 "`React Flow` может показать skeleton" → "visual shell может показать skeleton".
- Line 178 "`React Flow` последовательно заменяет placeholders" → "visual shell последовательно заменяет placeholders".
- Line 170 "`module-map.flow.json` хранит только layout/view state" → переписан под sidecar v2 с описанием optional `layoutParams` section.
- Lines 180-184 `measure -> place` first-open layout rules → полностью переписан под declarative CSS Grid контракт с упоминанием right-click context menu как permanent-override surface.
- `grep` после commit'а: zero matches на `React Flow|containerConstraints|measure -> place` в файле.

### Stream 3 — Delete obsolete Diagram_Modules_ProductPart_Decomposition planning doc

- Удалён `doc/SolidWorks-WorkFlow/System/Diagram_Modules_ProductPart_Decomposition_And_Progressive_Rendering_Architecture.md` (14 K, "Accepted planning baseline" 2026-03-23).
- **Обоснование удаления (не перемещения в `Plans/Archive.zip`):**
  1. Все accepted decisions уже материализованы в `SystemArchitecture.md §6.3-§6.5` и `WorkflowSteps_Overview.md § Шаг 3`.
  2. §5 документа озаглавлен "Принятая React Flow-модель" — вся секция содержит outdated API описание.
  3. §3.3 ссылается на compatibility aggregate `module-inventory.md`, который current runtime не производит (§6.3 явно: "no single aggregate file is generated").
  4. Related-docs header указывает на `Plans/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md` (moved в `Plans/Archive.zip` в Session025 Phase 2) и `doc/Sessions/Archive/Session132.md`, `Session133.md` (Sessions/Archive/ directory не существует).
  5. Lives в `System/` вопреки `Plans/README.md §3` (planning-docs должны жить в `Plans/`).
  6. Никакой self-contained historical value вне того, что уже в SSOT — `git log --all --follow` сохраняет доступ для forensic needs.
- `Docs_Index.md` не содержал ссылок на файл; pointer из `SystemArchitecture.md §6.5` уже убран в Stream 1.

## Pre-existing archive debt summary

Единственный pre-existing defect, обнаруженный в этой сессии — nested `Archive/Archive.zip` внутри `TODO/Archive.zip`. Он уцелел после Session025 Stream 3B re-zip процедуры, потому что процедура в `Archive.README.md` писала `unzip -q Archive.zip && mv … && rm Archive.zip && zip -r -q Archive.zip Archive/` — и старая версия Archive.zip внутри временной Archive/ директории (до rm) попадала в новый zip, если предыдущий cycle забыл почистить. Cleaned в Stream 0 этой сессии. `Plans/Archive.zip` проверен аналогично — без nested zip, pre-existing структура корректна.

## Git commits

(ВАЖНО: при `Execution Scope Status: ACTIVE` следующая сессия обязана просмотреть каждый коммит через `git show --stat <hash>` и `git show <hash>`.)

- `e4bd32ab8 docs(archive): close Session025 todo-plan and purge nested Archive.zip debt`
- `4abc6a3a1 docs(archive): move Session025 completed planning docs into Plans/Archive.zip`
- `6b558b1b8 docs: point Docs_Index at compacted Plans/Archive.zip after Session025 closeout`
- `4aa0c02f8 docs(ssot): rewrite SystemArchitecture §6.5 under CSS Grid post React Flow removal`
- `c48f089fd docs(ssot): rewrite WorkflowSteps_Overview Diagram Modules step under CSS Grid`
- `cc34ec1e5 docs(cleanup): delete materialized Diagram Modules ProductPart Decomposition planning doc`
- `528927a5e docs(todo): close Phase 1 React Flow residual references cleanup with final hash`
- `32b46ba6f docs(session): capture Session025 completion report post-release 1.1.923` (pre-existing untracked Session025.md — hygiene commit)

**Всего 8 коммитов Session026, все gates зелёные на каждом.**

## Release / artifacts

- **Release build не запускался** — по явному решению пользователя в процессе сессии ("нового релиза собирать не нужно"). Scope чисто docs-only, VSIX surface не затронут. Текущий shipped release остаётся `codeai-hub-1.1.923.vsix` из Session025.

---

# 2. Instructions for Next Session

**Recovery Owner:** `doc/TODO/todo-plan.md`

## Plans for next session

- Текущий `doc/TODO/todo-plan.md` описывает закрытую Phase 1 "React Flow Residual References Cleanup" (все stream'ы DONE, см. hash'и выше). Активного незавершённого scope внутри Phase 1 нет.
- Пользователь явно заявил в конце сессии: "мы ещё пройдёмся по документам потом". Execution cycle остаётся **ACTIVE**, потому что в рамках того же docs cleanup scope ожидается продолжение прохода по документам (другие разделы SSOT / Clusters / Modules / Contracts).
- Следующая сессия обязана:
  1. Прочитать `doc/Sessions/Session026.md` + все 8 коммитов этой сессии через `git show --stat <hash>` / `git show <hash>`.
  2. Прочитать `doc/TODO/todo-plan.md` (активный Phase 1 все DONE, но файл остаётся живым якорем текущего docs cleanup cycle).
  3. Прочитать базовый SSOT `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (переписан §6.5) и `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md` (переписан § Шаг 3).
  4. Согласовать с пользователем, какие именно следующие документы нужно пройти, и открыть новую Phase внутри текущего `todo-plan.md` (Phase 2 — next docs pass scope).
  5. Если пользователь позже решит закрыть docs cleanup cycle полностью, тогда можно будет переименовать `todo-plan.md` в `todo-plan-phase1-react-flow-residual-cleanup-...md`, положить в `TODO/Archive.zip` и открыть новый scope по `Docs_Index.md`.

## Known-clean state

- `grep` по active tree после сессии: ноль живых React Flow / `containerConstraints` / `measure -> place` совпадений, кроме намеренно сохранённых исторических маркеров в `SystemArchitecture.md` (1.1.921 removal announcement + negative "контейнеры не владеют parentId" bullet).
- `TODO/Archive.zip` чистый (64 K, 20 historical snapshots, no nested zip debt).
- `Plans/Archive.zip` обновлён двумя completed Session025 planning docs.
- Working tree чистый за исключением этого Session026.md.
