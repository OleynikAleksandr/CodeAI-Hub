# Session 023 — CSS Grid Diagram Modules Layout

**Date:** 2026-04-08 17:00 (CEST)
**Branch:** main
**Version:** 1.1.917
**Execution Scope Status:** COMPLETED

---

# 1. Work Done in This Session

## Work summary

### Предыстория
7 сессий (013-021) пытались починить самописный autolayout для Diagram Modules. Все 7 волн лечили локальные симптомы: min-gap, measured reflow, shared bounds, hierarchical packing, overlap-aware packing, shadow allowance, live measurement stabilization. Ни одна не заменила базовый layout model. Session022 зафиксировала этот pattern of failure и рекомендовала архитектурный разрыв.

### Исследование (начало сессии)
- Изучены все 7 corrective wave по коммитам и дифам (agent deep-dive)
- Исследованы алгоритмы layout в интернете: ELK.js, dagre, WebCola, Kiwi.js, yFiles
- ELK.js детально проверен: обнаружены документированные баги с compound nodes (Issue #166 padding, #311 width override, #88 children out of bounds), отсутствие DOM-измерений, необходимость 3-4 проходов рендеринга для 4 уровней вложенности
- Решение: CSS Grid layout внутри React Flow nodes (браузер сам считает все размеры)

### Реализация

**Phase 1 — Kill Old Layout (~1350 строк удалено):**
- Удалены 7 файлов: `layout-bounds.ts`, `initial-autolayout-packer.ts`, `measured-layout-normalizer.ts`, `manual-layout-normalizer.ts`, `measured-layout-bridge.tsx` + 2 теста
- Shell очищен от normalizer imports/calls
- Facade очищена от measured-layout-bridge integration
- Все `data-diagram-container-header-id` и `data-diagram-body-start-offset` DOM-атрибуты удалены

**Phase 2 — CSS-Native Layout:**
- Создан `diagram-editor-layout-params.ts`: типы (`ProductPartLayoutParams`, `ClusterLayoutParams`), auto-columns algorithm (`resolveProductPartColumns`)
- Переписаны типы: `DiagramFlowNodeType` теперь только `"productPart"`, удалены `ContainerConstraints`, `DiagramFlowNodeMeasuredSize`, edges, `layoutSource`
- `ProductPartFlowNodeData` теперь содержит nested `clusters` (с `modules` внутри) и `standaloneModules`
- Adapter (`module-stage-react-flow.ts`): emit один ProductPart node per product-part; удалены ВСЕ height estimation функции (~60 констант + 8 функций)
- Facade (`diagram-editor-facade.tsx`): `ProductPartNode` с CSS Grid body, `ClusterCard` и `ModuleCard` как обычные React-компоненты (не React Flow nodes)

**Phase 3 — Context Menu:**
- Создан `diagram-editor-context-menu.tsx`: positioned overlay menu
- ProductPart: Columns (Auto/2/3/4/5), Aspect Ratio (Landscape/Wide/Square)
- Cluster: Module Columns (Auto/1/2/3)
- Wired через React Context (ContextMenuContext) для прокидки callbacks в custom nodes
- Shell управляет state и применяет layout param overrides к node data in-place

**Phase 4 — Build + Release:**
- README и CHANGELOG обновлены
- `build-all.sh` — все packages собраны (1.1.917)
- `build-release.sh --use-current-version` — VSIX `codeai-hub-1.1.917.vsix` собран
- Все quality gates зелёные: architecture check, lint, knip, duplication < 3%

### Ключевые архитектурные изменения
- **Module и Cluster больше НЕ являются React Flow nodes** — они обычные React-компоненты внутри ProductPartNode
- **Только ProductPart — React Flow node** (draggable по canvas через Alt+drag)
- **CSS Grid считает все размеры** — zero JS layout code, zero settle loops
- **Sidecar всё ещё v1 формат** — хранит per-node x/y позиции; context menu layout params НЕ persist через перезагрузку (будет в sidecar v2)
- **Edges удалены** с диаграммы (подтверждено пользователем)

## Git commits
(REFERENCE ONLY)
- `0b48a3ad0 refactor(diagram): strip shell of layout normalizer wiring`
- `3838d8c45 refactor(diagram): strip facade and delete legacy layout engine (~1350 lines)`
- `03ce9d805 feat(diagram): add layout-params types and auto-columns algorithm`
- `1ea2f2afa feat(diagram): rewrite types, adapter and facade for CSS Grid layout`
- `59e86b129 feat(diagram): add context menu for layout param overrides`
- `041e544aa docs: update README and CHANGELOG for CSS Grid layout release`
- `fb4187af1 docs(session): add Session022 report from previous session`
- `bb7ccaaf7 build(release): package CSS Grid layout release 1.1.917`
- `6426e36bc fix(diagram): update remaining tests for CSS Grid node types`
- `6c4f655ec docs(session): record CSS Grid layout release closeout`

---

# 2. Instructions for Next Session

**Base SSOT:** `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
**Scope Discovery Index:** `doc/SolidWorks-WorkFlow/Docs_Index.md`

## Документы для прочтения перед следующей сессией
- `doc/Sessions/Session023.md` — этот отчёт (обзор всех изменений)
- `src/client/project-manager/components/diagram-editor/diagram-editor-facade.tsx` — CSS Grid ProductPartNode, ClusterCard, ModuleCard
- `src/client/project-manager/components/diagram-editor/diagram-editor-shell.tsx` — state management, context menu wiring
- `src/client/project-manager/components/diagram-editor/diagram-editor-context-menu.tsx` — context menu component
- `src/client/project-manager/components/diagram-editor/diagram-editor-layout-params.ts` — auto-columns algorithm, layout param types
- `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.types.ts` — новые типы (nested data)
- `src/client/project-manager/components/diagram-editor/adapters/module-stage-react-flow.ts` — adapter (ProductPart-only nodes)
- `src/client/project-manager/components/diagram-editor/flow-sidecar-types.ts` — текущий sidecar v1 (будет переписан в v2)

## Plans for next session
- Активный execution scope отсутствует.
- Следующая сессия начинается с визуального тестирования: пользователь открывает диаграмму и даёт обратную связь по CSS Grid layout.
- Возможные направления работы (после обратной связи):
  1. **Visual polish** — настройка gap/padding/proportions по результатам визуального review
  2. **Sidecar v2** — persist context menu layout params через перезагрузку (columns, aspect ratio, module columns)
  3. **Auto-columns tuning** — доработка алгоритма выбора колонок на основе реальных данных
  4. **External modules rendering** — сейчас external modules (kind: "external") рендерятся как standalone modules внутри ProductPart; возможно нужна отдельная визуальная обработка
