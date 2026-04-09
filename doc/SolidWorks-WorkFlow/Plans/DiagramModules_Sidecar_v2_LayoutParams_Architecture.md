# Diagram Modules — Sidecar v2 (Persisted Layout Params) Architecture

**Status:** Approved for implementation
**Date:** 2026-04-09
**Owner:** Codex
**Target release:** 1.1.922

## 1. Problem

После удаления React Flow (Session024, release `1.1.921`) видимый `Diagram Modules` перешёл на CSS Grid layout и получил три декларативных параметра раскладки на правый клик:

- `ProductPart.columns` (`auto | 2 | 3 | 4 | 5`);
- `ProductPart.targetAspectRatio` (`landscape | wide | square`);
- `Cluster.moduleColumns` (`auto | 1 | 2 | 3`).

Сейчас эти параметры живут только в `React.useState` внутри `DiagramEditorShell` (`diagram-editor-shell.tsx:77`). Три handler'а (`handleProductPartColumnsChange`, `handleProductPartAspectRatioChange`, `handleClusterModuleColumnsChange`) вызывают только `setNodes`, без `onNodesChange`, то есть ничего не идёт в `*.flow.json`. Дополнительно `useEffect` на `[projection.revision]` каждый раз перезаписывает `nodes` обратно из `projection.nodes`, а adapter при каждой сборке projection инициализирует `layoutParams` через `defaultProductPartLayout()` / `defaultClusterLayout()`.

Итого пользовательский выбор теряется при:
- reopen диаграммы,
- refresh страницы,
- любом событии, которое дёрнет `projection.revision` (BroadcastChannel sidecar-sync, runtime refresh product-parts).

Session024 сознательно отключил persist, чтобы устранить race condition с BroadcastChannel reset'ом. Sidecar v2 обязан вернуть persist, не воскрешая этот race.

## 2. Decision

Расширяем non-semantic sidecar `*.flow.json` (сейчас — `version: 1`, хранит только placeholder positions `{x:0,y:0}`) до **`version: 2`** с опциональной секцией `layoutParams`, в которой хранятся per-ProductPart и per-Cluster декларативные параметры раскладки. Семантическим SSOT остаётся канонический Markdown DSL (`product-parts.index.md`, `product-parts/<part-id>.md`); `*.flow.json` остаётся non-semantic sidecar под contract 6.2 SystemArchitecture.

Применение параметров при загрузке делает отдельная функция `applyFlowSidecarLayoutParams`, которая мутирует `DiagramFlowNode.data.layoutParams` и `data.clusters[*].layoutParams` на основе sidecar. `applyFlowSidecarPositions` остаётся no-op pass-through (CSS Grid сам считает позиции).

Persist работает через существующий канал `onNodesChange` из `DiagramEditorShell`, но context-menu handler'ы помечают nodes контрольным флагом `layoutParamsDirty` в scope одного edit'а, чтобы `useEffect` на `projection.revision` не затирал свежий выбор до того, как sidecar успеет записаться и projection rebuild'нется с уже корректным `layoutParams`.

## 3. Scope

### In scope
- Bump `FLOW_SIDECAR_LAYOUT_METRIC_VERSION` или переход на `version: 2` в `FlowSidecarDocument`;
- Новое поле `layoutParams: { productParts: Record<productPartId, ProductPartLayoutParams>, clusters: Record<clusterId, ClusterLayoutParams> }` в sidecar;
- `buildFlowSidecarDocument`: сериализация текущих layout params узлов;
- `parseFlowSidecar`: безопасный parse новой секции с валидацией enum-значений и tolerance к отсутствию поля (backwards compat с `version: 1`);
- `applyFlowSidecarLayoutParams`: наложение params на `DiagramFlowNode.data.layoutParams` и `data.clusters[*].layoutParams` при загрузке;
- `DiagramEditorShell`: context-menu handler'ы вызывают `onNodesChange(updatedNodes)`, а projection-reset `useEffect` уважает локальные layout-param-edits внутри одного projection.revision;
- Regression-тесты: parse/serialize round-trip, backwards compat с v1 (sidecar без `layoutParams`), default fallback, persist→reload survival;
- Синхронизация live SSOT (`SystemArchitecture.md` §6.2/§6.4, `Clusters/Project_Manager.md`) с фактическим CSS Grid контрактом и persisted layout params;
- Release docs (`README.md`, `CHANGELOG.md`).

### Out of scope
- Новые значения layout params (n-колонок > 5, новые aspect ratios) — задача только persist existing values;
- Standalone modules grid grouping intelligence;
- External modules rendering (`kind: "external"`);
- Очистка других упоминаний React Flow / Option(Alt)+drag в SSOT документах, не относящихся к `6.2 Diagram Visual Shell Boundary` / `6.4 Diagram Workflow Stabilization Boundary` / `Clusters/Project_Manager.md §3 Diagram Modules block`.

## 4. Affected surfaces

- `src/client/project-manager/components/diagram-editor/flow-sidecar-types.ts`
- `src/client/project-manager/components/diagram-editor/flow-sidecar-types.test.ts`
- `src/client/project-manager/components/diagram-editor/diagram-editor-shell.tsx`
- `src/client/project-manager/components/diagram-editor/use-diagram-persistence.ts` (read-path if needed)
- `src/client/project-manager/components/diagram-editor/diagram-editor-layout-params.ts` (read-only — default factories reused)
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (§6.2, §6.4)
- `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md` (§3 Diagram Modules bullets)
- `README.md`
- `CHANGELOG.md`

## 5. Implementation contract

### 5.1 Sidecar format v2

`FlowSidecarDocument`:

```
{
  "version": 2,
  "revision": "<rev>",
  "layoutMetricVersion": 4,
  "updated": "<iso>",
  "nodes": { "<nodeId>": { "x": 0, "y": 0 } },
  "layoutParams": {
    "productParts": {
      "<productPartId>": { "columns": "auto" | 2..5, "targetAspectRatio": "landscape"|"wide"|"square" }
    },
    "clusters": {
      "<clusterId>": { "moduleColumns": "auto" | 1 | 2 | 3 }
    }
  },
  "viewport": { ... }
}
```

- Parser принимает оба значения `version: 1` и `version: 2`. Для v1 `layoutParams` отсутствует и трактуется как `{}`.
- Неизвестные enum-значения отбрасываются и возвращаются к defaults (не падение).
- При serialize только те params, которые реально отличаются от defaults, могут писаться (optional оптимизация; допустимо писать всегда для простоты).

### 5.2 Load path

- `applyFlowSidecarLayoutParams(nodes, document)`:
  - для каждой `ProductPartFlowNodeData` смотрит `layoutParams.productParts[productPartId]`, применяет при наличии;
  - внутри `data.clusters` смотрит `layoutParams.clusters[clusterId]`, применяет `moduleColumns`;
  - возвращает **новый** массив nodes; оригинал не мутируется.
- `applyFlowSidecarPositions` остаётся no-op (в соответствии с Session024).
- Использование: `DiagramEditorFacade` или `use-diagram-persistence.ts` — там, где сейчас применяется `applyFlowSidecarPositions`.

### 5.3 Persist path (без race condition)

Текущая проблема Session023: context-menu edit → `onNodesChange` → sidecar write → BroadcastChannel refresh → `projection.revision` bump → `useEffect` resets `nodes` к свежему `projection.nodes`, который ещё не содержит применённый layoutParams, потому что re-load sidecar и adapter merge происходят в другом месте.

Решение:

1. `DiagramEditorShell` хранит локальный ref `pendingLayoutParamEditsRef` (Set of productPartId/clusterId), помечаемый при каждом context-menu edit.
2. `handleProductPartColumnsChange` и аналоги: после `setNodes(updated)` сразу вызывают `onNodesChange(updated)`, чтобы sidecar записался немедленно.
3. `useEffect` на `[initialNodes, projection.nodes, projection.revision]`:
   - если `initialNodes` провайдится родителем (т.е. уже прошёл через `applyFlowSidecarLayoutParams`), используется он;
   - если projection.nodes не содержит ожидаемых layoutParams, а `pendingLayoutParamEditsRef` не пустой — merge локальных pending-edits поверх projection.nodes до next load-through.
4. `pendingLayoutParamEditsRef` очищается, когда входящий `initialNodes` содержит все pending edits (sidecar round-trip завершён).

Альтернатива (проще, выбираем её, если pending-ref логика получится ломкой): `DiagramEditorFacade`/`use-diagram-persistence.ts` применяет `applyFlowSidecarLayoutParams` в том же месте, где строит `initialNodes` для shell, и сам ref становится не нужен — достаточно того, что sidecar write + next projection build дадут консистентный результат.

**Canonical decision:** начинаем с простого варианта (alt): context-menu handler вызывает `onNodesChange`, sidecar записывается, следующий projection rebuild прогоняет nodes через `applyFlowSidecarLayoutParams`, и shell `useEffect` получает уже корректные `initialNodes`. Pending-ref добавляем только если alt в тестах показывает flicker.

### 5.4 Backwards compat

- Workspace с существующим `module-map.flow.json` (v1) обязан продолжить работать: parse → `layoutParams === undefined` → load путь возвращает defaults → UX идентичен release `1.1.921`.
- При первой записи через handler sidecar апгрейдится до v2 автоматически.
- Downgrade: если пользователь откатится на `1.1.921`, старый parser увидит `version: 2` → сейчас он требует ровно `version === 1` → вернёт `null` → fallback к defaults. Это приемлемая деградация (не corrupt), но мы фиксируем это в CHANGELOG.

## 6. Acceptance criteria

1. Sidecar `*.flow.json` после context-menu edit содержит секцию `layoutParams` с выбранными значениями.
2. После полной перезагрузки Project Manager (`Cmd+R` CEF) выбранные `columns` / `targetAspectRatio` / `moduleColumns` возвращаются такими же, какими были до перезагрузки.
3. Workspace с pre-existing v1 sidecar открывается без ошибок; `layoutParams` возвращается к defaults, visual result идентичен `1.1.921`.
4. `parseFlowSidecar` tests покрывают: v1 round-trip, v2 round-trip, v2 с неизвестными enum (fallback to default), v2 без секции `layoutParams`, corrupt JSON.
5. `applyFlowSidecarLayoutParams` tests: ProductPart only, Cluster only, оба вместе, отсутствие match'а → nodes без изменений.
6. Shell regression test подтверждает, что context-menu edit не теряется при BroadcastChannel sidecar-sync event'е.
7. Все quality gates зелёные: architecture check, `npm run lint`, `npm run check:tsprune`, typecheck, duplication gate.
8. SSOT (`SystemArchitecture.md` §6.2/§6.4, `Clusters/Project_Manager.md §3`) отражает CSS Grid layout + persisted layoutParams и **не** описывает React Flow / Option(Alt)+drag / bottom-right minimap / auto-layout chrome как product behavior.
9. `README.md` и `CHANGELOG.md` документируют Sidecar v2 + persisted layout params в релизе `1.1.922`.
10. `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version` проходят; итоговый VSIX установлен и проверен.

## 7. Open risks

- **Race** при комбинации быстрых подряд edits + BroadcastChannel cross-window sync. Mitigation: тест shell на быстрый серии правок.
- **v1 → v2 миграция** существующих user-workspace sidecar файлов. Mitigation: v1 parse path остаётся работающим, layoutParams defaults применяются silently.
- **Serializer stability** — ключи в `Object.fromEntries` могут переупорядочиваться и портить git diff user sidecar файлов. Mitigation: сортировка ключей при serialize (`Object.keys(...).sort()`).
