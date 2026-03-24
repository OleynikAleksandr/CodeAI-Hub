# Session 149 — Diagram Modules Step-by-Step Workflow Planning

**Date:** 2026-03-24 (CET)
**Branch:** main
**Version:** 1.1.777 (no version bump — planning only)

---

# 1. Work Done in This Session

## Work summary

### Retest feedback от пользователя по 1.1.777
- Агент работает корректно, canonical template delivery функционирует
- **Auto-continuation подавляет обратную связь**: агент задаёт вопросы после product part, но ядро заставляет продолжать через hidden continuation — вопросы остаются без ответа. Пользователь хочет step-by-step обсуждение каждого part
- **Граф не обновляется при создании нового product part**: нужно переключаться между шагами. Polling 5s работает только при status "missing"; после index load — обновления прекращаются
- **Auto-layout ломает layout**: при generated layout (без flow.json) модули и product parts наслаиваются друг на друга. Root cause: алгоритм систематически занижает высоты контейнеров (chars-per-line не совпадают с CSS, min-heights слишком малы). Purpose panel ограничена 320px max — текст вытягивается вертикально вместо горизонтального распределения
- После ручного расположения (пользователь создал flow.json) и перезагрузки ядра — граф красивый
- Source кнопка избыточна — markdown артефакты промежуточные, итоговый результат это граф
- Sidebar label `module-inventory.md` вводит в заблуждение — принято название **"Module Graph"**

### Architectural decisions
- **Step-by-step workflow**: убрать hidden auto-continuation; index turn (только список product parts без спецификации) → обсуждение с пользователем → part turns по одному → обсуждение каждого → пользователь подтверждает → следующий
- **Graph refresh**: dispatch `pm:diagram:refresh` event при artifact persist, слушать в panel
- **Auto-layout — sidecar fallback**: если flow.json не содержит всех нодов проекции → fallback на computed layout
- **Auto-layout — Purpose panel**: `minmax(240px, 1fr)` вместо `minmax(240px, 320px)` — Purpose растягивается по ширине Product Part
- **Auto-layout — height fix**: audit chars-per-line, пересчёт MIN_HEIGHT, safety buffer к container heights
- **Sidebar naming**: `module-inventory.md` → `Module Graph`; убрать Source mode для Diagram Modules

### Documentation
- Архивирован `todo-plan.md` Phase 53 → `doc/TODO/Archive/todo-plan-up-to-phase53-2026-03-24.md`
- Создан planning doc: `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_StepByStep_Workflow_And_UX_Refactor.md`
- Создан новый `todo-plan.md` с Phase 54 (10 streams: remove auto-continuation, rewrite prompt, graph refresh, auto-layout sidecar fallback, auto-layout Purpose panel, auto-layout height fix, sidebar rename + remove Source, docs sync, release, session handoff)

## Git commits
(ВАЖНО: для следующей сессии восстановить контекст через `git show --stat <hash>` и `git show <hash>`)
- `89bcf609 docs(plan): archive phase53 and plan step-by-step diagram modules workflow refactor`

---

# 2. Instructions for Next Session

## Required documents to review before work

### Архитектурные и workflow документы
1. `doc/SolidWorks-WorkFlow/README.md` — обзор workflow steps
2. `doc/SolidWorks-WorkFlow/Docs_Index.md` — индекс всех документов
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` — SSOT архитектуры
4. `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_StepByStep_Workflow_And_UX_Refactor.md` — **planning doc для Phase 54** (solution design, root causes, all sub-problems)

### Текущие session/plan
5. `doc/TODO/todo-plan.md` — **Phase 54** (streams 1-8, включая 4/4b/4c)
6. `doc/Sessions/Session149.md` (THIS REPORT)
7. `doc/Sessions/Session148.md` — предыдущая сессия (canonical template contract)

### Ключевые файлы — Stream 1 (remove auto-continuation)
8. `src/client/project-manager/components/sessions/use-diagram-modules-orchestration.ts` — **orchestration hook**: auto-continuation на строке 237 (`api.sendSessionMessage` с `visibility: "hidden"`), `buildDiagramModulesContinuationPrompt` (строки 46-74), `cachedPartTemplateRef` (строка 83), sequence lock, aggregate compose
9. `src/client/project-manager/components/sessions/use-diagram-modules-orchestration.test.ts` — тесты orchestration

### Ключевые файлы — Stream 2 (rewrite prompt)
10. `packages/agents/diagram-modules-agent/assets/module-inventory-prompt.md` — **prompt агента** (269 строк): секции 1-6, инструкции про hidden continuation (убрать), staged workflow (переписать на step-by-step)
11. `packages/core/src/templates/bundled-templates.ts` — bundled templates (перегенерировать после изменения prompt)

### Ключевые файлы — Stream 3 (graph refresh)
12. `src/client/project-manager/components/diagram-modules/diagram-modules-panel.tsx` — **panel**: `refreshKey` prop, `useDiagramLoader` hook
13. `src/client/project-manager/components/diagram-editor/use-diagram-loader.ts` — **diagram loader**: `pollTick` (строки 50-55, polling только при "missing"), `refreshKey` в deps (строка 269)

### Ключевые файлы — Streams 4/4b/4c (auto-layout)
14. `src/client/project-manager/components/diagram-editor/flow-sidecar-types.ts` — **sidecar**: `applyFlowSidecarPositions` (строки 97-116, revision check + per-node position override), `parseFlowSidecar`, `buildFlowSidecarDocument`
15. `src/client/project-manager/components/diagram-editor/adapters/module-stage-react-flow.ts` — **computed layout**: `buildModuleStageNodes` (строка 128), все height/width расчёты, `PRODUCT_PART_PURPOSE_CHARS_PER_LINE = 42`, `MODULE_CARD_MIN_HEIGHT = 132`, `CLUSTER_X_STEP = 320`
16. `src/client/project-manager/components/diagram-editor/diagram-editor-facade.tsx` — **ReactFlow render**: Purpose panel CSS `gridTemplateColumns: "minmax(0, 1fr) minmax(240px, 320px)"` (строка 93), card styles, node types
17. `src/client/project-manager/components/diagram-editor/diagram-modules-progressive-model.ts` — **progressive model**: `loadDiagramModulesProgressiveResult`, `mergeDiagramModulesModels`, `buildDiagramModulesSkeletonFromIndex`, sidecar application (строки 274-293)

### Ключевые файлы — Stream 5 (sidebar rename + remove Source)
18. `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.ts` — **sidebar nodes**: label `"module-inventory.md"` (строка 164), `resolveDiagramStageSyncPayload` (artifact availability check)
19. `src/client/project-manager/components/layout/stage-artifact-mode.ts` — **Source mode**: `DIAGRAM_TOOL_SOURCE` config, `resolveArtifactHeaderModes` → `["artifacts", "source", "help"]` для diagram tools
20. `src/client/project-manager/components/layout/use-diagram-modules-artifact-availability.test.ts` — тесты artifact availability
21. `src/client/project-manager/components/layout/stage-artifact-mode.test.ts` — тесты Source mode

### Контракты
22. `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md` — required reading перед каждым фиксом

## Key context for next session

### Root cause analysis (подробности)
1. **Auto-continuation**: `orchestration.ts:237` — `api.sendSessionMessage(sessionId, prompt, { workflowControl: { visibility: "hidden" } })` посылает hidden continuation после каждого turn_completed. Агент получает `buildDiagramModulesContinuationPrompt` (строки 46-74) с target part ID и canonical template. Убрать: hidden send, continuation prompt builder, cachedPartTemplateRef. Оставить: sequence lock для aggregate compose
2. **Graph no-refresh**: `use-diagram-loader.ts:50-55` — `pollTick` инкрементируется через setTimeout только при `status === "missing"`. После первой загрузки index (status="ready") — нет механизма обновления. `refreshKey` в deps (строка 269) работает, но никто его не инкрементирует при новом artifact
3. **Auto-layout — sidecar stale**: `applyFlowSidecarPositions` (строка 102) проверяет `revision !== params.revision`, но при progressive loading revision остаётся `"product-parts-index"` → sidecar с устаревшими позициями применяется → новые ноды не в sidecar получают computed positions → mixed positions → каша
4. **Auto-layout — height underestimation**: `module-stage-react-flow.ts` — `chars-per-line` константы (24 для title, 32 для responsibility, 42 для purpose) не соответствуют реальным CSS widths. `MODULE_CARD_MIN_HEIGHT = 132` мало для длинных текстов. CSS Purpose panel ограничена 320px max → текст сжат вертикально → header height больше расчётного → кластеры начинаются раньше → вылезают за Product Part → наслоение
5. **Sidebar naming**: `workspace-tree-diagram-branch-nodes.ts:164` — hardcoded `"module-inventory.md"`. Artifact availability check привязан к existence of `module-inventory.md`, а не `product-parts.index.md`

### Что НЕ трогать (Phase 53 — работает)
- Template delivery pipeline (canonical template contract)
- Parser (`diagram-modules-staged-part-parser.ts`)
- Contract endpoint (`idea-contract-service.ts`, `diagram-contract-prompt-assets.ts`)
- Aggregate compose logic (`diagram-modules-aggregate.ts`) — оставить, но триггер через explicit user action
- Sequence lock mechanism — оставить для aggregate

### Пример рабочих данных для верификации auto-layout
- Проект: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/`
- Flow sidecar (ручной layout): `.codeai-hub/codeai-hub-codex-5-4/diagram_modules/module-map.flow.json`
- Скриншот правильного layout: `/Users/oleksandroliinyk/Desktop/Screenshot 2026-03-24 at 08.03.15.png`

## Plans for next session
- Начать реализацию Phase 54 со Stream 1 (remove auto-continuation)
- Далее Stream 2 (rewrite prompt для step-by-step)
- Stream 3 (graph refresh)
- Streams 4/4b/4c (auto-layout: sidecar fallback, Purpose width, height fix)
- Stream 5 (sidebar: Module Graph + remove Source)
- Streams 6-8 (docs sync, release build, session handoff)
