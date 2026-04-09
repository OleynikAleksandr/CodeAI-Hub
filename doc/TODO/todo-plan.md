# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/DiagramModules_Sidecar_v2_LayoutParams_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/DiagramModules_Sidecar_v2_LayoutParams_Architecture.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` §6.2 Diagram Visual Shell Boundary, §6.4 Diagram Workflow Stabilization Boundary
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md` §3 Diagram Modules UX контракт
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md` (required reading перед каждым фиксом)
  - `doc/Sessions/Session024.md` — baseline React Flow removal + CSS Grid, release `1.1.921`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

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
- **Таргетные сборки** выполняем вручную только когда нужно проверить затронутый пакет/клиент, и обязательно перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`.
- **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт `todo-plan.md` (дата, статус, хеш).
- Stream завершается после того, как все его задачи закрыты таргетными сборками затронутых пакетов/клиентов и коммитами.
- **Real-time Документация**: любое изменение архитектуры/логики требует синхронного обновления и `todo-plan.md` и документации (`doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` и др.) **ДО** коммита.
- Phase завершается на чистом дереве: запускаем `./scripts/build-all.sh` (он повышает версии и вызывает `./scripts/build-release.sh --use-current-version`), переносим tarball'ы в `doc/tmp/releases/`, фиксируем результаты в `doc/Sessions/`.
- **doc/TODO/todo-plan.md** необходимо постоянно в риалтайме обновлять, после каждой подзадачи обязательный коммит, после каждого коммита его номер и наименование заносить, статус задачи тут же менять.

---

## Phase 1 — Sidecar v2 Persisted Layout Params (owner: Codex, updated: 2026-04-09)

### Stream: Sidecar v2 Schema and Parser

1. [DONE] Расширить `FlowSidecarDocument` до `version: 1 | 2` и добавить опциональное поле `layoutParams` (productParts + clusters). Импортировать типы из `diagram-editor-layout-params.ts`. Scope: `src/client/project-manager/components/diagram-editor/flow-sidecar-types.ts` (≤1 файл).
2. [DONE] Git Commit: `feat(diagram): extend FlowSidecarDocument type with layoutParams (v2)` (hash: `3055fb78b`)
3. [DONE] Обновить `parseFlowSidecar`: принимать `version: 1 | 2`, валидировать enum-значения `columns`/`targetAspectRatio`/`moduleColumns`, неизвестные значения отбрасывать. Scope: `src/client/project-manager/components/diagram-editor/flow-sidecar-types.ts` (≤1 файл).
4. [DONE] Git Commit: `feat(diagram): parse sidecar v2 layoutParams with enum guards` (hash: `b08563758`)
5. [DONE] Обновить `buildFlowSidecarDocument`: принимать layoutParams из nodes, сериализовать `version: 2`, отсортировать ключи для стабильного diff. Scope: `src/client/project-manager/components/diagram-editor/flow-sidecar-types.ts` (≤1 файл).
6. [DONE] Git Commit: `feat(diagram): serialize sidecar v2 layoutParams with sorted keys` (hash: `ee261d71c`)
7. [DONE] Добавить round-trip и backwards-compat тесты: v1 parse без layoutParams, v2 round-trip, неизвестные enum fallback, corrupt JSON. Scope: `src/client/project-manager/components/diagram-editor/flow-sidecar-types.test.ts` (≤1 файл).
8. [DONE] Git Commit: `test(diagram): cover sidecar v1/v2 parse, serialize, backwards compat` (hash: `3a86514ea`)

### Stream: Load Path — apply layoutParams on nodes

1. [DONE] Добавить функцию `applyFlowSidecarLayoutParams(nodes, document)` — merge productPart и cluster params в `DiagramFlowNode.data.layoutParams` без мутаций; сразу проинтегрировать её в read-path внутри `diagram-modules-progressive-model.ts` рядом с существующим `applyFlowSidecarPositions` (правильный call-site, а не `use-diagram-persistence.ts`, который отвечает только за write-path). Scope: `src/client/project-manager/components/diagram-editor/flow-sidecar-types.ts`, `src/client/project-manager/components/diagram-editor/diagram-modules-progressive-model.ts` (2 файла).
2. [DONE] Git Commit: `feat(diagram): apply sidecar v2 layoutParams on diagram load` (hash: `676a3b6f5`)
3. [DONE] Добавить unit-тесты `applyFlowSidecarLayoutParams`: ProductPart only, Cluster only, both, no match, stable identity. Scope: `src/client/project-manager/components/diagram-editor/flow-sidecar-types.test.ts` (≤1 файл).
4. [DONE] Git Commit: `test(diagram): cover applyFlowSidecarLayoutParams merge cases` (hash: `5ead42d5b`)

### Stream: Persist Path — context-menu → sidecar

1. [DONE] В `diagram-editor-shell.tsx` три context-menu handler'а (`handleProductPartColumnsChange`, `handleProductPartAspectRatioChange`, `handleClusterModuleColumnsChange`) вызывают `onNodesChange?.(updated)` после `setNodes(updated)`. Scope: `src/client/project-manager/components/diagram-editor/diagram-editor-shell.tsx` (≤1 файл).
2. [DONE] Git Commit: `feat(diagram): persist context-menu layout params via onNodesChange` (hash: `d8b582561`)
3. [DONE] Shell regression test (source-based): три handler'а содержат `onNodesChange?.(next)`; `useEffect` по-прежнему делает `setNodes(initialNodes ?? projection.nodes)`. Scope: `src/client/project-manager/components/diagram-editor/diagram-editor-shell.test.ts` (≤1 файл).
4. [DONE] Git Commit: `test(diagram): shell preserves layout params across projection rebuild` (hash: `e510c19bf`)
5. [SKIPPED] `pendingLayoutParamEditsRef` merge — не понадобился: load path через `applyFlowSidecarLayoutParams` возвращает nodes с override'ами поверх projection defaults, поэтому flicker невозможен архитектурно. Condition из planning-doc §5.3 alt удовлетворена, fallback не включаем.
6. [SKIPPED] Git Commit: `fix(diagram): merge pending layout param edits across projection rebuild` — не создаётся, задача 5 skipped.

### Stream: SSOT Documentation Sync (BEFORE release build)

1. [DONE] Обновить `SystemArchitecture.md` §6.2 и §6.4: убрать упоминания React Flow / `Option(Alt)+drag` / bottom-right minimap / auto-layout chrome; заменить на CSS Grid + persisted layoutParams в sidecar v2. Scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (≤1 файл).
2. [DONE] Git Commit: `docs(ssot): sync SystemArchitecture §6.2/§6.4 with CSS Grid + sidecar v2` (hash: `6f314a561`)
3. [DONE] Обновить `Clusters/Project_Manager.md` §3: bullet про Option(Alt)+drag / dynamic resizing / minimap → актуальный CSS Grid + right-click layout params + Cmd+scroll zoom + sidecar v2 persist. Scope: `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md` (≤1 файл).
4. [DONE] Git Commit: `docs(ssot): sync Project_Manager §3 with CSS Grid diagram contract` (hash: `2ddcc3c47`)
5. [DONE] Обновить `README.md` раздел `What's New` для `1.1.922` и `CHANGELOG.md` с описанием Sidecar v2 + persisted layout params + backwards compat с v1. Scope: `README.md`, `CHANGELOG.md` (≤2 файла).
6. [DONE] Git Commit: `docs: update README and CHANGELOG for 1.1.922 release` (hash: `496916803`)

### Stream: Release Build 1.1.922

1. [DONE] Убедиться, что `git status` чистый, `npm install` выполнен, все стримы выше закрыты. Запустить `./scripts/build-all.sh` (он поднимет версию и вызовет `build-release.sh --use-current-version`). На практике build-all.sh не создаёт коммит с bump — манифесты оставались staged и коммитились вручную.
2. [DONE] Git Commit: `build(release): bump version to 1.1.922` (hash: `63ded1ead`)
3. [DONE] Запустить `./scripts/build-release.sh --use-current-version` и проверить вывод: `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`. Результат: `codeai-hub-1.1.922.vsix` (2.0M, 1789 файлов); tarball'ы в `~/.codeai-hub/releases/` и `doc/tmp/releases/`.
4. [SKIPPED] Git Commit: `build(release): package 1.1.922 with sidecar v2 layout params persist` — не создаётся, VSIX не трекается репозиторием и не меняет файлы в рабочем дереве.
5. [TODO — user action] Smoke verify: установить VSIX, открыть workspace с v1 sidecar → отсутствие ошибок + defaults; правый клик → `columns: 3` → `Cmd+R` → `columns: 3` сохранилось; проверить файл `module-map.flow.json` на `version: 2` и заполненный `layoutParams.productParts`. Передано пользователю для финальной проверки.
6. [DONE] Git Commit: нет — smoke verify завершается обновлением todo-plan статуса и session report.

---

## Phase 2 — doc/SolidWorks-WorkFlow Documentation Cleanup (owner: Codex, updated: 2026-04-09)

Контекст: аудит документации после релиза `1.1.922` выявил React Flow upon active SSOT, компат-редиректы в неправильной директории и незакрытые draft документы в `System/`. Этот scope чистит накопленный drift одним заходом без архитектурных изменений (docs-only, code не трогаем).

### Stream: Fix React Flow references in active Contracts

1. [DONE] `Contracts/FacadeClassDiagram_DesignAndMaintenance.md` — заменить React Flow-reference (line ~49-50) на nested CSS Grid, убрать minimap bullet. Scope: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`, `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md` (2 файла).
2. [DONE] Git Commit: `docs(ssot): drop React Flow/minimap references in FacadeClassDiagram and Workflow_CLI` (hash: `1871d1657`)

### Stream: Archive historical diagram docs from System/

1. [DONE] `git mv System/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md` → `Plans/Archive/` (исторический trace §11.1–§11.12, SSOT уже в `SystemArchitecture.md §6.2/§6.4`). Scope: 1 файл через rename.
2. [DONE] Git Commit: `docs(archive): move Diagram_Modules_ReviewStep_And_Autolayout historical trace to Plans/Archive` (hash: `bc8484181`)
3. [DONE] `git mv System/Diagram_UserFacing_Layout_And_Format_Architecture.md` → `Plans/Archive/` (status «Discussion baseline», drafts запрещены в `System/` по `Plans/README.md §3`). Scope: 1 файл.
4. [DONE] Git Commit: `docs(archive): move Diagram_UserFacing_Layout_And_Format discussion baseline to Plans/Archive` (hash: `f56720b94`)
5. [DONE] `git mv System/Diagram_Modules_StepByStep_Workflow_And_UX_Refactor.md` → `Plans/Archive/` (содержит React Flow references и UX refactor planning — выводы уже в SSOT). Scope: 1 файл.
6. [DONE] Git Commit: `docs(archive): move Diagram_Modules_StepByStep UX refactor plan to Plans/Archive` (hash: `c97d3e0d6`)

### Stream: Archive Contracts React Flow planning doc

1. [DONE] `git mv Contracts/Diagram_Modules_ProductPart_Hierarchy_DSL_Architecture.md` → `Plans/Archive/` (весь документ построен на React Flow projection pipeline, удалённой в 1.1.921). Scope: 1 файл.
2. [DONE] Git Commit: `docs(archive): move Diagram_Modules_ProductPart_Hierarchy_DSL React Flow plan to Plans/Archive` (hash: `03e121081`)

### Stream: Delete dead compat-redirect stubs from Contracts/ (batch 1)

Пояснение: все пять compat-redirect документов — это короткие pointer-stub'ы. Два из них (`Description_LegacyCleanup_Architecture.md`, `ProjectManager_VirtualSimulation_ColdStartRecovery.md`) указывают на уже существующие файлы в `Plans/Archive/`. Три оставшихся (`ProviderSessionHome_IsolationAndRecovery.md`, `ProviderSessionHome_SnapshotEngine_Design.md`, `StandaloneReviewer_Module.md`) указывают на удалённые или несуществующие originals (`Plans/StandaloneReviewer_Module.md` в Plans/ отсутствует). Все пять — dead pointers, move в Archive бессмысленен. Правильное действие — `git rm` из Contracts/; исторические планы, где они существуют, уже в Plans/Archive/.

1. [DONE] `git rm` трёх compat-stub'ов: `Description_LegacyCleanup_Architecture.md`, `ProjectManager_VirtualSimulation_ColdStartRecovery.md`, `ProviderSessionHome_IsolationAndRecovery.md`. Scope: 3 файла.
2. [DONE] Git Commit: `docs(cleanup): remove dead compat-redirect stubs from Contracts/ (batch 1)` (hash: `75450880d`)

### Stream: Delete dead compat-redirect stubs from Contracts/ (batch 2)

1. [DONE] `git rm` двух оставшихся compat-stub'ов: `ProviderSessionHome_SnapshotEngine_Design.md`, `StandaloneReviewer_Module.md`. Scope: 2 файла.
2. [DONE] Git Commit: `docs(cleanup): remove dead compat-redirect stubs from Contracts/ (batch 2)` (hash: `2efd8aae0`)

### Stream: Archive Greenfield polygon + resolve remaining System/ drafts

1. [DONE] `git mv System/Greenfield_Architecture_Polygon.md` → `Plans/Archive/` (status «Draft»). Scope: 1 файл.
2. [DONE] Git Commit: `docs(archive): move Greenfield_Architecture_Polygon draft to Plans/Archive` (hash: `f8d48eed7`)

### Stream: Fix Modules/Claude.md paths + Codex/Gemini symmetry

1. [DONE] В `Modules/Claude.md` поправить пути `src/provider-usage-limits/…` → `packages/core/src/provider-usage-limits/…` (facades реально в Core). Добавить короткий раздел usage-limits в `Modules/Codex.md` и `Modules/Gemini.md` для симметрии (или убрать из Claude). Scope: `doc/SolidWorks-WorkFlow/Modules/Claude.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/SolidWorks-WorkFlow/Modules/Gemini.md` (3 файла).
2. [DONE] Git Commit: `docs(modules): align Claude/Codex/Gemini usage-limits paths and structure` (hash: `2923bd1de`)

### Stream: Update Docs_Index.md

1. [DONE] Обновить `doc/SolidWorks-WorkFlow/Docs_Index.md`: убрать ссылки на перенесённые compat-redirects (bullet в секции «Contracts (compat / legacy filenames)»), добавить архивированные diagram docs и Greenfield polygon в секцию `Plans/Archive/`. Scope: 1 файл.
2. [DONE] Git Commit: `docs: sync Docs_Index with Phase 2 documentation cleanup moves` (hash: `2e7be06ca`)

---

## Phase 3 — Projection Naming Cleanup + Archive Compression (owner: Codex, updated: 2026-04-09)

Контекст: dead-code/dead-links аудит после Phase 2 показал, что (1) adapter layer `diagram-editor/adapters/` всё ещё именован вокруг React Flow, хотя сам React Flow удалён в `1.1.921`; (2) `doc/.../Plans/Archive/` и `doc/TODO/Archive/` содержат 96 файлов с ~62 stale inline-refs, замусоривающими grep-based аудиты. Оба под-скоупа — чисто docs/refactor, release build не требуется.

Planning source: `doc/SolidWorks-WorkFlow/Plans/DiagramModules_Projection_Naming_And_Archive_Compression_Architecture.md`

### Stream 3A: Projection naming cleanup (atomic rename)

1. [TODO] Atomic rename: `git mv` 7 файлов в `adapters/` (`domain-model-to-react-flow.ts*`, `module-stage-react-flow.ts`), переименовать 8 типов (`Diagram*Flow*` → `Diagram*Projection*`), переименовать функцию `domainModelToReactFlow()` → `domainModelToProjection()`, обновить все 10 импортёров (import path + type names + function name) в одном атомарном commit. Scope: ~16 файлов (justified deviation from ≤3 правила для rename — см. planning-doc §5.1). Verification: `grep -r "react-flow\|DiagramFlowNode\|domainModelToReactFlow" src/ packages/` → 0 matches; `typecheck:webview` + `check:knip` + `lint` зелёные; 17 flow-sidecar tests зелёные.
2. [TODO] Git Commit: `refactor(diagram): rename react-flow adapter naming to projection` (hash: TBD)

### Stream 3B.1: Compress Plans/Archive directory

1. [TODO] `cd doc/SolidWorks-WorkFlow/Plans && zip -r -q Archive.zip Archive/ && git rm -r Archive/ && git add Archive.zip`. Создать `doc/SolidWorks-WorkFlow/Plans/Archive.README.md` с pointer'ом на zip + инструкцией распаковки. Scope: ~78 файлов через bulk rm + 2 новых файла (единая архивация).
2. [TODO] Git Commit: `docs(archive): compress Plans/Archive directory into Archive.zip` (hash: TBD)

### Stream 3B.2: Compress TODO/Archive directory

1. [TODO] `cd doc/TODO && zip -r -q Archive.zip Archive/ && git rm -r Archive/ && git add Archive.zip`. Создать `doc/TODO/Archive.README.md` с pointer'ом на zip. Scope: ~22 файла через bulk rm + 2 новых.
2. [TODO] Git Commit: `docs(archive): compress TODO/Archive directory into Archive.zip` (hash: TBD)

### Stream 3B.3: Update Docs_Index.md after archive compression

1. [TODO] Обновить `doc/SolidWorks-WorkFlow/Docs_Index.md`: заменить отдельные bullets на `Plans/Archive/*.md` (~20 строк) одним pointer-bullet на `Plans/Archive.zip` + короткой нотой «unzip для доступа к исходным документам». Scope: 1 файл.
2. [TODO] Git Commit: `docs: point Docs_Index at Plans/Archive.zip after compression` (hash: TBD)

---

## Phase Closeout Requirements (обязательно после завершения Phase 1+2+3)
- Перенести завершённый `todo-plan.md` в `doc/TODO/Archive.zip` потомка `todo-plan-phase1-2-3-sidecar-v2-docs-cleanup-and-projection-rename.md` при старте следующего scope (после zip архивации работа с TODO Archive идёт через unzip/re-zip цикл, либо — проще — при старте нового scope сохранять его в `doc/TODO/todo-plan.md` с пометкой closure).
- Провести ревизию `doc/SolidWorks-WorkFlow/Plans/DiagramModules_Sidecar_v2_LayoutParams_Architecture.md` и `doc/SolidWorks-WorkFlow/Plans/DiagramModules_Projection_Naming_And_Archive_Compression_Architecture.md`: оба — completed planning-doc'и, итоги в Session025 report. Архивация в `Plans/Archive.zip` или удаление при старте следующего scope.
- Создать новый `doc/TODO/todo-plan.md` только при начале следующего scope.
