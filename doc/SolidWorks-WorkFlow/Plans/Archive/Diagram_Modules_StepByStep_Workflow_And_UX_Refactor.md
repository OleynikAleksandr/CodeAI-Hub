# Diagram Modules: Step-by-Step Workflow & UX Refactor

**Status:** Approved
**Created:** 2026-03-24
**Scope:** Diagram Modules workflow orchestration, prompt, graph refresh, auto-layout, sidebar UX

---

## 1. Problem Statement

### 1.1. Auto-continuation подавляет обратную связь
Текущая реализация (`use-diagram-modules-orchestration.ts`) автоматически посылает hidden continuation агенту после каждого completed turn. Агент заканчивает один product part, задаёт вопросы — но ядро заставляет его продолжать, и вопросы остаются без ответов. Пользователь лишён возможности:
- обсудить состав product parts до начала детализации;
- обсудить конкретный product part после его создания;
- влиять на порядок и приоритеты.

### 1.2. Граф не обновляется при создании нового product part
`use-diagram-loader.ts` polling (5 сек) работает только при status `"missing"`. После загрузки index (status `"ready"`) никакой механизм не триггерит перезагрузку при появлении нового part файла. Пользователю приходится переключаться на другой шаг и возвращаться.

### 1.3. Auto-layout не работает корректно при progressive loading
`buildModuleStageNodes` вычисляет правильные позиции, но `applyFlowSidecarPositions` перезаписывает их из `module-map.flow.json`, если sidecar revision совпадает. При skeleton → skeleton + parts: sidecar содержит старые позиции для пустых product parts, новые ноды получают дефолтные координаты → наслоение. После перезагрузки ядра (без stale sidecar) layout корректен.

### 1.4. Sidebar вводит в заблуждение
Артефакт в sidebar называется `module-inventory.md`, хотя реальным результатом шага является граф (ReactFlow). Кнопка Source (`product-parts.index.md`) избыточна — пользователю не нужен промежуточный Markdown, когда есть граф.

---

## 2. Solution

### A. Step-by-step workflow (убрать auto-continuation)

**Новая схема:**
1. **Index turn** — агент создаёт `product-parts.index.md` (список product parts с кратким описанием, БЕЗ спецификации кластеров/модулей). Задаёт вопросы по составу. Пауза — ждёт ответа пользователя.
2. **Part turn N** — пользователь подтверждает список или отдельный part → агент создаёт наполнение одного product part (кластеры, модули). Задаёт вопросы по этому part. Пауза — ждёт подтверждения.
3. Повтор для каждого part, пока пользователь не скажет "продолжай".

**Что меняется:**
- `use-diagram-modules-orchestration.ts`: убрать hidden auto-continuation (`api.sendSessionMessage` с `visibility: "hidden"`). Оставить sequence lock и aggregate compose (они нужны для финализации).
- `module-inventory-prompt.md`: переписать workflow schema — step-by-step вместо one-shot.
- `buildDiagramModulesContinuationPrompt`: убрать.
- Cached template ref: убрать (template теперь отдаётся через contract при каждом обычном turn).

**Финализация (aggregate compose):**
Когда все parts готовы и пользователь говорит "всё", нужен механизм финализации: собрать `module-inventory.md` из всех parts. Это можно:
- Вызвать через explicit user action (кнопка "Finalize" или команда в чате);
- Или оставить текущий aggregate compose, но триггерить его по workflow state `compose_aggregate` — который теперь выставляется явно.

### B. Graph refresh при новом product part

**Механизм:**
- Orchestration hook уже слушает `session:stream` → `turn_completed` / artifact events.
- Нужно при получении artifact event для diagram_modules — диспатчить custom event `pm:diagram:refresh`.
- `DiagramModulesPanel` слушает этот event и инкрементирует `refreshKey`.

Файлы:
- `use-diagram-modules-orchestration.ts` — dispatch refresh event при artifact persist
- `diagram-modules-panel.tsx` — слушать event, инкрементировать refreshKey

### C. Auto-layout fix

#### C.1. Sidecar fallback

**Проблема:** `applyFlowSidecarPositions` применяет sidecar даже если набор нодов изменился (новые ноды не в sidecar → дефолт 0,0 → наслоение).

**Решение:** Если flow.json не содержит ВСЕХ нодов текущей проекции — не применять его (fallback на computed layout).

Файлы: `flow-sidecar-types.ts` / `applyFlowSidecarPositions`

#### C.2. Purpose panel фиксированная ширина

**Проблема:** CSS `gridTemplateColumns: "minmax(0, 1fr) minmax(240px, 320px)"` ограничивает Purpose panel максимум 320px. При широком Product Part текст Purpose сжат вертикально вместо горизонтального распределения.

**Решение:** `minmax(240px, 1fr)` — Purpose растягивается по оставшейся ширине Product Part. Layout алгоритм (`getProductPartHeaderHeight`) пересчитывает `chars-per-line` динамически от реальной ширины Purpose panel.

Файлы: `diagram-editor-facade.tsx`, `module-stage-react-flow.ts`

#### C.3. Систематическая недооценка высот (наслоение модулей и product parts)

**Проблема:** При generated layout (без flow.json) модули и product parts наслаиваются друг на друга. Root cause: алгоритм `buildModuleStageNodes` ЗАНИЖАЕТ высоты контейнеров:
- `chars-per-line` константы (24, 32, 42) не совпадают с реальной шириной CSS контейнеров при font-size 11-14px
- `MODULE_CARD_MIN_HEIGHT = 132px` может быть мало для длинного responsibility текста
- `getClusterHeaderHeight` и `getModuleCardHeight` не учитывают реальные CSS margins/paddings
- Нет safety buffer — любая ошибка в оценке строк → содержимое вылезает за контейнер → наслоение

**Решение:**
1. Audit chars-per-line констант: замерить реальные CSS widths для module card (240px - padding), cluster (288px - padding), purpose panel → вычислить корректный chars-per-line при реальном font-size
2. Пересчитать MIN_HEIGHT значения
3. Добавить safety buffer (~10-15%) к container heights
4. Верифицировать на реальных данных (проект codex-5.4)

Файлы: `module-stage-react-flow.ts`

### D. Sidebar: переименовать артефакт + убрать Source

**Переименование:**
- `workspace-tree-diagram-branch-nodes.ts`: label `"module-inventory.md"` → `"Module Graph"`
- `resolveDiagramStageSyncPayload`: artifact label и path — поскольку артефакт теперь это граф, а не markdown, нужно пересмотреть artifact availability check (граф доступен если index загрузился, а не если module-inventory.md существует).

**Убрать Source:**
- `stage-artifact-mode.ts`: для "Diagram Modules" убрать `"source"` из доступных modes → `["artifacts", "help"]`
- Убрать `resolveDiagramSourcePendingMessage` для Diagram Modules (оставить для Diagram Facades если нужна)
- Убрать связанный Source rendering в diagram panel scaffold

---

## 3. Не затрагиваемые части

- Diagram Facades (отдельный scope)
- Parser (`diagram-modules-staged-part-parser.ts`) — работает
- Aggregate compose logic — оставить, но триггер изменить
- Contract endpoint (`idea-contract-service.ts`, `diagram-contract-prompt-assets.ts`) — prompt delivery через contract остаётся
- Template sync pipeline — не затрагивается

---

## 4. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Prompt change ломает агента | Тестировать prompt вручную перед релизом |
| Aggregate compose не триггерится | Оставить workflow state mechanism, но без hidden continuation |
| Sidebar availability без module-inventory.md | Переключить availability check на index existence |
| Auto-layout regression | Тесты на computed layout vs sidecar |
