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

1. [TODO] Расширить `FlowSidecarDocument` до `version: 1 | 2` и добавить опциональное поле `layoutParams` (productParts + clusters). Импортировать типы из `diagram-editor-layout-params.ts`. Scope: `src/client/project-manager/components/diagram-editor/flow-sidecar-types.ts` (≤1 файл).
2. [TODO] Git Commit: `feat(diagram): extend FlowSidecarDocument type with layoutParams (v2)` (hash: TBD)
3. [TODO] Обновить `parseFlowSidecar`: принимать `version: 1 | 2`, валидировать enum-значения `columns`/`targetAspectRatio`/`moduleColumns`, неизвестные значения отбрасывать. Scope: `src/client/project-manager/components/diagram-editor/flow-sidecar-types.ts` (≤1 файл).
4. [TODO] Git Commit: `feat(diagram): parse sidecar v2 layoutParams with enum guards` (hash: TBD)
5. [TODO] Обновить `buildFlowSidecarDocument`: принимать layoutParams из nodes, сериализовать `version: 2`, отсортировать ключи для стабильного diff. Scope: `src/client/project-manager/components/diagram-editor/flow-sidecar-types.ts` (≤1 файл).
6. [TODO] Git Commit: `feat(diagram): serialize sidecar v2 layoutParams with sorted keys` (hash: TBD)
7. [TODO] Добавить round-trip и backwards-compat тесты: v1 parse без layoutParams, v2 round-trip, неизвестные enum fallback, corrupt JSON. Scope: `src/client/project-manager/components/diagram-editor/flow-sidecar-types.test.ts` (≤1 файл).
8. [TODO] Git Commit: `test(diagram): cover sidecar v1/v2 parse, serialize, backwards compat` (hash: TBD)

### Stream: Load Path — apply layoutParams on nodes

1. [TODO] Добавить функцию `applyFlowSidecarLayoutParams(nodes, document)` — merge productPart и cluster params в `DiagramFlowNode.data.layoutParams` без мутаций. Scope: `src/client/project-manager/components/diagram-editor/flow-sidecar-types.ts` (≤1 файл).
2. [TODO] Git Commit: `feat(diagram): add applyFlowSidecarLayoutParams load helper` (hash: TBD)
3. [TODO] Интегрировать `applyFlowSidecarLayoutParams` в read-path у `use-diagram-persistence.ts` рядом с существующим `applyFlowSidecarPositions`. Scope: `src/client/project-manager/components/diagram-editor/use-diagram-persistence.ts` (≤1 файл).
4. [TODO] Git Commit: `feat(diagram): apply sidecar v2 layoutParams on diagram load` (hash: TBD)
5. [TODO] Добавить unit-тесты `applyFlowSidecarLayoutParams`: ProductPart only, Cluster only, both, no match. Scope: `src/client/project-manager/components/diagram-editor/flow-sidecar-types.test.ts` (≤1 файл).
6. [TODO] Git Commit: `test(diagram): cover applyFlowSidecarLayoutParams merge cases` (hash: TBD)

### Stream: Persist Path — context-menu → sidecar

1. [TODO] В `diagram-editor-shell.tsx` три context-menu handler'а (`handleProductPartColumnsChange`, `handleProductPartAspectRatioChange`, `handleClusterModuleColumnsChange`) вызывают `onNodesChange?.(updated)` после `setNodes(updated)`. Scope: `src/client/project-manager/components/diagram-editor/diagram-editor-shell.tsx` (≤1 файл).
2. [TODO] Git Commit: `feat(diagram): persist context-menu layout params via onNodesChange` (hash: TBD)
3. [TODO] Shell regression test: симулировать edit → projection.revision bump → убедиться, что layoutParams сохраняются после `useEffect` reset (включая BroadcastChannel sidecar-sync fixture). Scope: `src/client/project-manager/components/diagram-editor/diagram-editor-shell.test.tsx` (≤1 файл, создать если отсутствует).
4. [TODO] Git Commit: `test(diagram): shell preserves layout params across projection rebuild` (hash: TBD)
5. [TODO] Если regression test показывает flicker — добавить `pendingLayoutParamEditsRef` merge (fallback из planning-doc §5.3). Scope: `src/client/project-manager/components/diagram-editor/diagram-editor-shell.tsx` (≤1 файл). Пропустить, если первый путь зелёный.
6. [TODO] Git Commit: `fix(diagram): merge pending layout param edits across projection rebuild` (hash: TBD, conditional)

### Stream: SSOT Documentation Sync (BEFORE release build)

1. [TODO] Обновить `SystemArchitecture.md` §6.2 и §6.4: убрать упоминания React Flow / `Option(Alt)+drag` / bottom-right minimap / auto-layout chrome; заменить на CSS Grid + persisted layoutParams в sidecar v2. Scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (≤1 файл).
2. [TODO] Git Commit: `docs(ssot): sync SystemArchitecture §6.2/§6.4 with CSS Grid + sidecar v2` (hash: TBD)
3. [TODO] Обновить `Clusters/Project_Manager.md` §3: bullet про Option(Alt)+drag / dynamic resizing / minimap → актуальный CSS Grid + right-click layout params + Cmd+scroll zoom + sidecar v2 persist. Scope: `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md` (≤1 файл).
4. [TODO] Git Commit: `docs(ssot): sync Project_Manager §3 with CSS Grid diagram contract` (hash: TBD)
5. [TODO] Обновить `README.md` раздел `What's New` для `1.1.922` и `CHANGELOG.md` с описанием Sidecar v2 + persisted layout params + backwards compat с v1. Scope: `README.md`, `CHANGELOG.md` (≤2 файла).
6. [TODO] Git Commit: `docs: update README and CHANGELOG for 1.1.922 release` (hash: TBD)

### Stream: Release Build 1.1.922

1. [TODO] Убедиться, что `git status` чистый, `npm install` выполнен, все стримы выше закрыты. Запустить `./scripts/build-all.sh` (он поднимет версию и вызовет `build-release.sh --use-current-version`).
2. [TODO] Git Commit: `build(release): bump version to 1.1.922` (hash: TBD — auto-created by build-all.sh)
3. [TODO] Проверить вывод `build-release.sh`: `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`. Забрать `codeai-hub-1.1.922.vsix`, перенести tarball'ы в `doc/tmp/releases/`.
4. [TODO] Git Commit: `build(release): package 1.1.922 with sidecar v2 layout params persist` (hash: TBD)
5. [TODO] Smoke verify: установить VSIX, открыть workspace с v1 sidecar → отсутствие ошибок + defaults; правый клик → `columns: 3` → `Cmd+R` → `columns: 3` сохранилось; проверить файл `module-map.flow.json` на `version: 2` и заполненный `layoutParams.productParts`.
6. [TODO] Git Commit: нет — smoke verify завершается апдейтом todo-plan статуса и session report (вне этого plan).

---

## Phase Closeout Requirements (обязательно после завершения Phase 1)
- Перенести завершённый `todo-plan.md` в `doc/TODO/Archive/todo-plan-phase1-diagram-sidecar-v2.md`.
- Провести ревизию `doc/SolidWorks-WorkFlow/Plans/DiagramModules_Sidecar_v2_LayoutParams_Architecture.md`: перенести итоговые выводы в `System/` / `Clusters/` SSOT, затем архивировать planning-doc в `doc/SolidWorks-WorkFlow/Plans/Archive/` или удалить, если нет исторической ценности.
- Обновить `doc/SolidWorks-WorkFlow/Docs_Index.md`.
- Создать новый `doc/TODO/todo-plan.md` только после завершения этой ревизии (только при начале нового scope).
