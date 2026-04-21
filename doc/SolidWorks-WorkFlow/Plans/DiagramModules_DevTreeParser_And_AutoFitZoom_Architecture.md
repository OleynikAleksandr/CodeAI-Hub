# Diagram Modules — Development Tree Parser Stability + Artifacts Auto-Fit Zoom

## Problem 1: Development Tree flaky standalone modules

Sidebar Development Tree для `Diagram Modules` рендерит нестабильную структуру на одном и том же артефакте `product-parts/<part-id>.md`: кластерные модули (`development-tree-sidebar`, `step-intro-and-questionnaire-view`, `provider-picker`, `turn-composer`) периодически всплывают как фантомные standalone-ноды. Любая манипуляция в sidebar (expand/collapse) перезапускает `/workflow-state` fetch и детерминированно чередует правильный и искажённый результат. Canvas-парсер показывает структуру корректно — то есть баг сугубо в Core-side `readDevelopmentTreeSnapshot`.

Root cause split на два независимых дефекта:

1. **Module-level global regex с остаточным `lastIndex`.** `packages/core/src/remote-bridge/handlers/development-tree-snapshot.ts:12` — `const NEXT_SECTION_RE = /^##\s+/gm;` используется через прямой `NEXT_SECTION_RE.exec(body.slice(1))` в `clampSectionBody`. Global regex singleton сохраняет `lastIndex` между вызовами на один процесс Core, поэтому повторные exec'и на том же body чередуют hit / null / hit / null. Когда exec возвращает null, `clampSectionBody` отдаёт body целиком без клампа.
2. **`MODULE_ROW_RE` ловит 4-колоночные Simple Relations rows.** Non-greedy `(.+?)\s*\|\s*$` спокойно съедает вторую, третью и четвёртую колонки в одну группу, поэтому строка `| \`from-id\` | \`to-id\` | type | label |` матчится и `from-id` (backticked) попадает как standalone module id. Когда clamp слетает (см. пункт 1), весь хвост файла с секцией `## Simple Relations` уходит в `extractModuleRows`.

Precedent-фикс `Plans/Archive/DiagramModules_TwoColumnModuleTable_Cleanup_Architecture.md` (релиз 1.2.37) ограничил standalone-body следующим `##`-заголовком, но ограничил через `NEXT_SECTION_RE.exec(...)` на module-level regex — отсюда регрессия нестабильности.

## Problem 2: Artifacts diagram panel не авто-масштабируется

`DiagramEditorFacade` (`src/client/project-manager/components/diagram-editor/diagram-editor-facade.tsx`) применяет `transform: scale(${zoom})` с `zoom` state, который меняется только через Cmd/Ctrl+scroll пользователя и Cmd/Ctrl+0 reset. Авто-подгонка под ширину viewport отсутствует. Реальные intrinsic минимумы композиции (`productPartHeaderStyle` = `auto minmax(240px, 1fr)`, `ModuleCard` = `minWidth: 220`, `repeat(${columns}, 1fr)` в ProductPart) дают минимальную ширину ≈ 700–900 px. При уменьшении ширины Artifacts panel ниже этого порога композиция уходит за правую границу container'а (`overflow: auto`) и visual shell больше не помещает всё целиком.

## Solution

### Phase 1 — Core DevTree parser stability

1. `packages/core/src/remote-bridge/handlers/development-tree-snapshot.ts`:
   - `NEXT_SECTION_RE`, `CLUSTER_HEADER_RE`, `MODULE_ROW_RE`, `STANDALONE_SECTION_RE` — перевести на локальные инстансы на каждый вызов (factory functions) либо заменить прямой `.exec(...)` на `str.search(...)` / локальный regex-инстанс; для `matchAll` оставить global-флаг допустимо (iterator не использует shared lastIndex).
   - `MODULE_ROW_RE` ужесточить до строго 2-column: вторая колонка `[^|\n]+` без вложенных `|`, финальный якорь `\|[ \t]*$`. Этим Simple Relations rows (`| a | b | c | d |`) физически не матчатся.
   - `clampSectionBody` — переписать на форму без побочного эффекта на shared regex state.

2. `packages/core/src/remote-bridge/handlers/development-tree-snapshot.test.ts`:
   - Regression-тест: N последовательных вызовов `readDevelopmentTreeSnapshot` на одном workspace артефакте должны давать идентичный snapshot (идемпотентность).
   - Regression-тест: product-part с непустой секцией `## Simple Relations` не должен выдавать фантомных standalone modules.

### Phase 2 — Artifacts diagram auto-fit zoom

1. `src/client/project-manager/components/diagram-editor/diagram-editor-facade.tsx`:
   - Ввести auto-fit scale через `ResizeObserver` на outer container + measure `scrollWidth` inner composition (содержимое без `scale`, через second inner `div` или off-scale measurement).
   - Effective transform = `max(minAutoFit, min(1, container.clientWidth / composition.naturalWidth)) * userZoom`. При отсутствии user-zoom (`userZoom === 1`) composition всегда помещается по горизонтали; Cmd+scroll накладывается поверх auto-fit базы; Cmd+0 возвращает user-zoom к 1 (auto-fit снова становится effective).
   - Horizontal scrollbar на container при auto-fit не появляется; vertical scroll остаётся.

2. Regression-пункт в уже существующих тестах facade (`diagram-editor-facade.test.tsx`) или отдельный test файл: при уменьшении container width ниже intrinsic min, effective scale уходит ниже 1; при увеличении — возвращается к 1.

## Out of Scope

- Canvas-парсер `diagram-modules-staged-part-parser.ts` — не страдает от global-regex lastIndex (использует `matchAll` + `collectSections`).
- Структура артефакта `product-parts/<part-id>.md` и секция Simple Relations — формат каноничен.
- Browser-side sidebar rendering (`workspace-tree-diagram-branch-nodes.ts`) — потребитель корректного Core snapshot; после фикса Phase 1 sidebar стабилен без локальных правок.
- Манipulations с CSS Grid defaults (`ModuleCard.minWidth`, `productPartHeaderStyle`) — auto-fit zoom решает проблему через scale, трогать layout defaults не нужно.

## Canonical Document Landing

После закрытия цикла planning-doc архивируется в `doc/SolidWorks-WorkFlow/Plans/Archive/`. В `System/SystemArchitecture.md` §6.4 существующий invariant про clamping standalone-body остаётся; добавляется короткая фиксация про regex lastIndex safety в `development-tree-snapshot`. Artifacts auto-fit zoom фиксируется как дополнение к существующему invariant про zoom UX в §6.4 (Cmd/Ctrl+scroll manual zoom сохраняется, auto-fit — дефолтная база, manual поверх неё).
