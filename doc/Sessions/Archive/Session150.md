# Session 150 — Step-by-Step Workflow + Auto-Layout Calibration

**Date:** 2026-03-24 09:00–11:00 (CET)
**Branch:** main
**Version:** 1.1.782

---

# 1. Work Done in This Session

## Work summary

### Phase 54 — Step-by-step workflow (all streams DONE)
- **Stream 1**: Removed hidden auto-continuation from orchestration hook (289→195 lines)
- **Stream 2**: Rewrote agent prompt for step-by-step schema (index turn + part turns)
- **Stream 3**: Graph auto-refresh via `pm:diagram:refresh` custom event
- **Stream 4**: Sidecar fallback when flow.json incomplete
- **Stream 4b**: Purpose panel CSS `auto 1fr` + dynamic chars-per-line
- **Stream 4c**: Height underestimation safety buffer (later reverted)
- **Stream 5**: Sidebar renamed to "Module Graph", Source mode removed
- **Stream 6**: SystemArchitecture.md synced with step-by-step contract
- **Stream 7**: CHANGELOG + release 1.1.778

### Auto-layout calibration (post-release feedback loop)
- **1.1.779**: Compact spacing — all gaps reduced to MODULE_CARD_GAP (12px), safety buffer removed
- **1.1.780**: Separated line height constants (MODULE_RESP_LINE_HEIGHT for responsibility, BODY_LINE_HEIGHT for cluster purpose), standalone X step fixed to CLUSTER_X_STEP
- **1.1.781**: MODULE_CARD_MIN_HEIGHT recalibrated to 136, MODULE_RESP_LINE_HEIGHT=17
- **1.1.782**: **Full CSS-faithful height computation** — replaced ALL static MIN_HEIGHT constants with dynamic calculation from actual CSS font sizes, line heights, margins and paddings. No static minimums.

### Remaining bugs found during retest of 1.1.782
1. **Clusters overlap Purpose panel** — `getProductPartHeaderHeight` doesn't include `productPartCardStyle` padding
2. **N-1 modules visible per cluster** — 3-column table format (`module-id | kind | Responsibility`) not fully compatible with `OUTLINE_MODULE_ROW_RE` parser; title shows "kind" instead of module name

## Git commits
(ВАЖНО: для следующей сессии восстановить контекст через `git show --stat <hash>` и `git show <hash>`)
- `92a429ba refactor(diagram-workflow): remove hidden auto-continuation for part turns`
- `98785429 feat(diagram-workflow): rewrite prompt for step-by-step user-driven workflow`
- `d5b4c22f fix(diagram-modules): refresh graph on new product part artifact`
- `2729197b fix(diagram-modules): fallback to computed layout when sidecar is incomplete`
- `cabb883f fix(diagram-modules): make Purpose panel width dynamic and align layout calculations`
- `2f5f53f4 fix(diagram-modules): fix height calculation to prevent node overlap in auto-layout`
- `84393e2c refactor(sidebar): rename to Module Graph and remove Source mode for Diagram Modules`
- `02c362c8 docs(architecture): reflect step-by-step diagram modules workflow`
- `31726999 docs(release): sync step-by-step diagram modules workflow notes`
- `26680e90 fix(diagram-modules): compact auto-layout with uniform spacing`
- `c246131a fix(diagram-modules): calibrate layout heights and fix standalone overlap`
- `41518f17 fix(diagram-modules): separate module responsibility line height from cluster purpose`
- `462c8856 fix(diagram-modules): compute layout heights from CSS structure instead of static constants`

---

# 2. Instructions for Next Session

## Required documents to review before work

### Архитектурные и workflow документы
1. `doc/SolidWorks-WorkFlow/README.md` — обзор workflow steps
2. `doc/SolidWorks-WorkFlow/Docs_Index.md` — индекс всех документов
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` — SSOT архитектуры
4. `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_StepByStep_Workflow_And_UX_Refactor.md` — planning doc Phase 54
5. `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md` — required reading перед каждым фиксом

### Текущие session/plan
6. `doc/TODO/todo-plan.md` — **Phase 55** (streams 1-3)
7. `doc/Sessions/Archive/Session150.md` (THIS REPORT)

### Ключевые файлы — Stream 1 (product part header height)
8. `src/client/project-manager/components/diagram-editor/adapters/module-stage-react-flow.ts` — **layout computation**: CSS-faithful height calculation (lines 8-50), `getProductPartHeaderHeight` (строки 50-54), все CSS constants (LH11..LH15, MC_*, CL_*, PP_*)
9. `src/client/project-manager/components/diagram-editor/diagram-editor-facade.tsx` — **CSS source of truth**: `productPartCardStyle` (padding), `productPartHeaderStyle` (grid gap:14), `purposePanelStyle` (padding 10px 14px), `nodeCardStyle` (padding 12px 14px), `containerHeaderStyle` (gap:4), `nodeCaptionStyle` (fontSize:11), `purposeTextStyle` (marginTop:6, fontSize:11)

### Ключевые файлы — Stream 2 (3-column module table parser)
10. `src/client/project-manager/components/diagram-editor/diagram-modules-staged-part-parser.ts` — **parser**: `OUTLINE_MODULE_ROW_RE` (строка 29-30), `MODULE_ROW_RE` (строка 27-28), `materializeModuleMapFromProductPartOutline` (строка 32+)
11. `src/client/project-manager/components/diagram-editor/diagram-modules-staged-part-parser-shared.ts` — **shared parser**: `parseModuleRows` (строка 125-139), `parseClusters` (строка 141+)
12. Markdown тест-данные (реальный product part с 3-col таблицей): `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4/diagram_modules/product-parts/standalone-project-manager.md`

### Контекст багов

**Bug 1 — Header height**: `getProductPartHeaderHeight` вычисляет `max(summary, purpose) + 4`, но не добавляет padding самого productPartCardStyle. CSS product part card имеет padding (нужно проверить точное значение), поэтому кластеры, стартующие на `y = headerHeight`, наползают на Purpose panel.

**Bug 2 — Missing modules**: Agent генерирует 3-колоночные таблицы:
```
| `module-id` | `kind` | Responsibility |
| --- | --- | --- |
| `workspace-catalog-browser` | `service` | Показывает... |
```
Parser `OUTLINE_MODULE_ROW_RE` матчит, но:
(a) group 2 ловит `kind` (например "service") вместо module title → title модуля показан как "service"
(b) в каждом кластере видно N-1 модулей — нужно debug `matchAll` результат, чтобы определить точную причину (header row phantom match? cluster section split теряет первую строку? другое?)

Два пути решения:
- **Parser approach**: поддержать 3-col формат, humanize module-id для title, не использовать col2 как title
- **Prompt/template approach**: обязать агент писать 4-col формат с отдельной колонкой Module (title)

## Plans for next session
- Phase 55 Stream 1: fix product part header padding → clusters stop overlapping Purpose
- Phase 55 Stream 2: fix 3-column module table → all modules visible, correct titles
- Phase 55 Stream 3: release build + session handoff
