# Diagram Modules — Auto-Fit Zoom Natural-Width Hotfix

## Problem

Релиз `1.2.40` ввёл auto-fit zoom в `DiagramEditorFacade` через `ResizeObserver` + `scrollWidth`, но попутно выставил на inner composition `width: "max-content"` + `minWidth: "100%"`. На user acceptance (workspace `CodeAI-Hub claude`) выяснилось, что это ломает layout сильнее, чем оригинальный overflow:

- Один `Workflow And Artifact Ui` cluster растягивается на всю natural-max ширину: purpose-проза и title row выносятся в одну unwrappable строку.
- Второй cluster `Session Workspace Ui` и продолжение Product Part уходят настолько вправо, что даже при `Cmd+Ctrl+0 → 100%` auto-fit и `Cmd+scroll → 25%` user-zoom вся композиция всё равно не помещается в viewport.
- Вместо ожидаемого поведения (auto-fit понижает scale ниже 1 — контент fits по горизонтали) пользователь видит overflow независимо от zoom-уровня, потому что natural width разрослась до пределов, которые даже после `× userZoom = 0.25` превышают viewport.

## Root Cause

`width: max-content` на inner grid разрешает любому дочернему элементу тянуть свой "longest possible unwrapped" size. Конкретно:

- `purposePanelStyle` содержит длинную русскую прозу; с `max-content` текст не переносится, ширина = сумма ширин всех слов + пробелов.
- `productPartHeaderStyle: "auto minmax(240px, 1fr)"` — auto-column раскладывается до max-content title текста, minmax становится неограниченным благодаря parent `max-content`.
- `repeat(${columns}, 1fr)` в ProductPart child-grid — `1fr` в `max-content` контексте = `max-content` каждой column, опять без ограничения.

Итог: natural grid width превращается в многих тысячах пикселей, `min(1, container.clientWidth / naturalWidth)` попадает в floor `0.25` мгновенно, а при userZoom ≥ 0.25 composition всё равно шире viewport.

## Insight

`scrollWidth` на обычно сайзнутом grid (`width: 100%` / default auto) уже возвращает overflow-inclusive natural width: когда min-content ProductPart (≈2 cluster × (2 module × 220 + gaps) ≈ 1000+ px) больше container width, grid cell overflow'ится естественно, и `scrollWidth` равен `max(clientWidth, rightmost-child.right)`. Это ровно то natural measurement, которое нужно auto-fit.

Значит `width: max-content` не только не нужен — он активно вреден, потому что переключает measurement'а с "естественный min-content под word-wrap'ом" на "longest unwrappable line".

## Solution

1. `src/client/project-manager/components/diagram-editor/diagram-editor-facade.tsx`:
   - Убрать `width: "max-content"` и `minWidth: "100%"` из inner composition div.
   - Сохранить `transformOrigin`, `transform: scale(effectiveZoom)`, `ResizeObserver` + `scrollWidth` measurement — auto-fit продолжает работать, но на естественном grid sizing, где prose переносится, а grid cell overflow'ится только на реальный min-content cards.
2. `src/client/project-manager/components/diagram-editor/diagram-editor-facade.test.tsx`:
   - Инвертировать assertion на `max-content` → must be `false`. Этот token не должен возвращаться в facade ни как style, ни как textual marker, чтобы auto-fit не деградировал повторно.
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` §6.4:
   - Убрать упоминание `width: max-content + min-width: 100%` из контракта. Формулировка: measurement идёт через `scrollWidth` на естественно-сайзнутой grid, где overflow cluster/module cards поднимает scrollWidth выше clientWidth.

## Out of Scope

- Phase 1 DevTree parser fix (релиз `1.2.40`) остаётся как есть — user acceptance подтвердил стабильный рендер sidebar.
- Layout defaults внутри `ProductPartNode` / `ClusterCard` / `ModuleCard` (`minWidth: 220`, `minmax(240px, 1fr)`) не трогаем: именно они задают реальный min-content boundary, который auto-fit measurement уважает.
- Два baseline-failing source-level тестов в `diagram-editor-facade.test.tsx` (`auto-fill` + product-part hierarchy parser) — не входят в hotfix scope.

## Canonical Document Landing

После закрытия цикла planning-doc архивируется в `doc/SolidWorks-WorkFlow/Plans/Archive/`. В `SystemArchitecture.md` §6.4 исправляется формулировка auto-fit zoom contract (без упоминания `max-content` и `minWidth: 100%`). В `BugRegistry.md` добавляется короткая запись `BUG-2026-04-21-03` с указанием, что это hotfix к релизу `1.2.40` и закрывается релизом `1.2.41`.
