# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** (docs-only cleanup scope; план оформлен прямо здесь без отдельного planning-doc в `Plans/`, см. раздел «Scope rationale» ниже)
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` §6.2 Diagram Visual Shell Boundary, §6.5 Diagram Modules Ownership Hierarchy Boundary
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md` § Шаг 3 — Diagram Modules
  - `doc/SolidWorks-WorkFlow/System/Diagram_Modules_ProductPart_Decomposition_And_Progressive_Rendering_Architecture.md` (будет удалён в Stream 3)
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md` §3 Diagram Modules UX контракт
  - `doc/Sessions/Session025.md` — baseline Sidecar v2 / Phase 2 docs cleanup / projection rename / release `1.1.923`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Scope rationale

Session025 удалил React Flow из кодовой базы (1.1.921) и переименовал projection adapters (1.1.923), но часть active SSOT документации всё ещё описывает React Flow API (`parentId`, `containerConstraints`, `measure -> place`, `React Flow может показать skeleton`). Также противоречит §6.2: устаревшие bullet'ы говорят `module-map.flow.json хранит только geometry/positions`, тогда как sidecar v2 хранит дополнительно `layoutParams`.

Дополнительно `System/` содержит planning-doc `Diagram_Modules_ProductPart_Decomposition_And_Progressive_Rendering_Architecture.md`, который полностью материализован в SystemArchitecture.md §6.3-§6.5 и сохраняет устаревшие React Flow описания (весь §5 — «Принятая React Flow-модель»). По `Plans/README.md §3` такой doc должен быть либо в `Plans/`, либо удалён; поскольку итоги уже в SSOT, правильно удалить.

Scope чисто docs-only (не затрагивает исходный код и runtime), поэтому не требует отдельного planning-doc в `Plans/` и не требует release build — VSIX не меняется.

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
- **Таргетные сборки** выполняем вручную только когда нужно проверить затронутый пакет/клиент. Для docs-only scope таргетные сборки не запускаем.
- **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт `todo-plan.md` (дата, статус, хеш).
- **Real-time Документация**: любое изменение архитектуры/логики требует синхронного обновления и `todo-plan.md` и документации **ДО** коммита.
- **Release build:** этот scope чисто docs-only (VSIX surface не меняется), поэтому release build не запускается. Phase закрывается на чистом дереве без `build-all.sh`.
- **doc/TODO/todo-plan.md** необходимо постоянно в риалтайме обновлять, после каждой подзадачи обязательный коммит, после каждого коммита его номер и наименование заносить, статус задачи тут же менять.

---

## Phase 1 — React Flow Residual References Cleanup (owner: Claude, updated: 2026-04-09)

### Stream 0 — Phase closeout Session025 (archival of previous cycle)

1. [DONE] Завершить Session025 closeout (TODO side): переместить `doc/TODO/todo-plan.md` (все три Phase DONE) в `TODO/Archive.zip` как `todo-plan-phase1-2-3-sidecar-v2-docs-cleanup-projection-rename.md`; удалить nested stale `Archive/Archive.zip` внутри `TODO/Archive.zip` (pre-existing cleanup debt из Session025, сжал 756KB → 64KB); переархивировать `TODO/Archive.zip` чистым; обновить `TODO/Archive.README.md` счётчик и описание. Затем создать новый пустой `doc/TODO/todo-plan.md` для текущего scope (этот файл). Scope: `doc/TODO/todo-plan.md`, `doc/TODO/Archive.zip`, `doc/TODO/Archive.README.md` (3 файла).
2. [DONE] Git Commit: `docs(archive): close Session025 todo-plan and purge nested Archive.zip debt` (hash: `e4bd32ab8`)
3. [DONE] Архивировать оба completed planning-doc'а из Session025 в `Plans/Archive.zip`: `DiagramModules_Sidecar_v2_LayoutParams_Architecture.md` и `DiagramModules_Projection_Naming_And_Archive_Compression_Architecture.md`. Обновить `Plans/Archive.README.md` счётчик. Pragmatic 4-file exception: 2 deletions + Archive.zip repack + README counter — это один атомарный archive move; split зипа через half-state коммит создаёт больше церемонии, чем сам move (тот же pattern, что Session025 Stream 3A rename justified 16-file exception). Scope: `doc/SolidWorks-WorkFlow/Plans/DiagramModules_Sidecar_v2_LayoutParams_Architecture.md` (delete), `doc/SolidWorks-WorkFlow/Plans/DiagramModules_Projection_Naming_And_Archive_Compression_Architecture.md` (delete), `doc/SolidWorks-WorkFlow/Plans/Archive.zip`, `doc/SolidWorks-WorkFlow/Plans/Archive.README.md` (4 файла, justified exception).
4. [DONE] Git Commit: `docs(archive): move Session025 completed planning docs into Plans/Archive.zip` (hash: `4abc6a3a1`)
5. [IN_PROGRESS] Обновить `Docs_Index.md` — убрать bullet'ы на оба completed planning-doc'а и обновить описание `Plans/Archive.zip` (уже не «77 документов», а «историческая коллекция, пополняется при каждом closeout»). Scope: `doc/SolidWorks-WorkFlow/Docs_Index.md` (1 файл).
6. [TODO] Git Commit: `docs: point Docs_Index at compacted Plans/Archive.zip after Session025 closeout` (hash: TBD)

### Stream 1 — Rewrite SystemArchitecture.md §6.5 under CSS Grid

1. [TODO] Переписать §6.5 bullet про React Flow projection nested container model (lines 343-347): убрать `parentId`, `extent: "parent"`, `containerConstraints` — переформулировать под nested CSS Grid containers (Product Part = top-level grid, Cluster = nested grid, Module = child card). Убрать `React Flow` из line 359 (progressive rendering bullet). Заменить `measure -> place` bullet на CSS Grid-driven layout через declarative `columns` / `targetAspectRatio` / `moduleColumns` params. Поправить описание `module-map.flow.json` (lines 369-372) под sidecar v2 (хранит positions + layoutParams). Убрать pointer `Связанный planning-док` (line 384) на doc, который удаляется в Stream 3. Scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (1 файл).
2. [TODO] Git Commit: `docs(ssot): rewrite SystemArchitecture §6.5 under CSS Grid post React Flow removal` (hash: TBD)

### Stream 2 — Rewrite WorkflowSteps_Overview.md Шаг 3 under CSS Grid

1. [TODO] Обновить § Шаг 3 — Diagram Modules: заменить `React Flow может показать skeleton` (line 165), `React Flow последовательно заменяет placeholders` (line 178) на нейтральное `visual shell / diagram editor`. Обновить описание `module-map.flow.json` (line 170) под sidecar v2 (положения + CSS Grid layout params). Убрать `measure -> place` bullet (lines 180-184) — заменить на declarative CSS Grid контракт. Scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md` (1 файл).
2. [TODO] Git Commit: `docs(ssot): rewrite WorkflowSteps_Overview Diagram Modules step under CSS Grid` (hash: TBD)

### Stream 3 — Delete obsolete Diagram_Modules_ProductPart_Decomposition planning doc

1. [TODO] Удалить `doc/SolidWorks-WorkFlow/System/Diagram_Modules_ProductPart_Decomposition_And_Progressive_Rendering_Architecture.md`. Итоги документа уже в `SystemArchitecture.md §6.3-§6.5` и `WorkflowSteps_Overview.md § Шаг 3`; документ содержит outdated §5 "Принятая React Flow-модель" и битые pointers на архивные `Sessions/Archive/Session132.md` и `Plans/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`. По `Plans/README.md §3` planning-доки не должны жить в `System/`. Проверить `Docs_Index.md` — не содержит ссылок (уже проверено — не содержит). Финальная ревизия `git grep`: внутри active tree не должно остаться pointers на этот файл. Scope: `doc/SolidWorks-WorkFlow/System/Diagram_Modules_ProductPart_Decomposition_And_Progressive_Rendering_Architecture.md` (1 файл, удаление).
2. [TODO] Git Commit: `docs(cleanup): delete materialized Diagram Modules ProductPart Decomposition planning doc` (hash: TBD)

