# Foundation Envelope Visual Projection Architecture

**Status:** Draft for review (2026-04-07)
**Created:** 2026-04-07
**Updated:** 2026-04-07
**Owner:** Oleksandr + Codex
**Scope:** Define the next implementation wave for `Foundation Envelope`: user-facing React Flow visual projection in Project Manager, runtime-owned `foundation-envelope.flow.json`, projection-friendly markdown contract, and required updates to the Foundation Envelope agent instructions.

---

## 1. Problem

Шаг `Foundation Envelope` уже существует как workflow-stage, но пока заканчивается только markdown-документом.

Подтверждённое текущее состояние:

- canonical semantic artifact существует: `.codeai-hub/<workspaceSlug>/foundation_envelope/foundation-envelope.md`;
- в Project Manager шаг рендерится как обычный markdown-view, а не как диаграмма;
- runtime artifact surface пока не допускает `foundation-envelope.flow.json`;
- shared diagram loader/persistence pipeline сейчас жёстко привязан к `diagram_modules`;
- bundled prompt для агента до сих пор прямо говорит, что visual projection является future-step и запрещает рассчитывать на неё в этой wave.

Из-за этого фактический продукт расходится с уже утверждённым направлением workflow:

- `Foundation Envelope` должен завершаться понятной user-facing diagram, а не только prose-файлом;
- непрограммисту сложно быстро увидеть `Application Root`, `Shared Zones`, `Product Parts`, `Integration Seams` и technology status в одной картине;
- markdown артефакт пока не имеет достаточно жёсткого projection-friendly shape, поэтому прямой runtime parser был бы хрупким;
- агентные инструкции ещё удерживают шаг в text-only режиме и не подталкивают `foundation-envelope.md` к стабильной структуре для visual projection.

Следовательно, нужен отдельный implementation scope: довести `Foundation Envelope` до того состояния, которое уже было запланировано в архитектуре шага, но сознательно отложено в первую wave.

---

## 2. Product Goal

После завершения этой wave шаг `Foundation Envelope` должен давать пользователю не только canonical markdown, но и понятную React Flow-диаграмму в `Artifacts`.

Шаг считается успешно доведённым до целевого baseline, когда одновременно выполняются следующие условия:

1. `foundation-envelope.md` остаётся единственным semantic source of truth.
2. По нему runtime строит user-facing визуальную диаграмму для `Foundation Envelope`.
3. Пользователь видит diagram-first surface уже на первом открытии `Artifacts`, даже если `foundation-envelope.flow.json` ещё не существует.
4. Ручная раскладка пользователя сохраняется в `foundation-envelope.flow.json`, но sidecar не становится semantic SSOT.
5. `Foundation Envelope` prompt больше не живёт в markdown-only допущении и требует projection-friendly структуру документа.
6. Диаграмма делает понятными:
   - `Application Root`;
   - `Shared Zones`;
   - `Product Parts`;
   - `Integration Seams`;
   - technology intent / decision status.

Ключевой принцип этой wave:

- меняется user-facing rendering и shape semantic artifact;
- не меняется базовая граница шага: это всё ещё application-assembly step, а не implementation-materialization step.

---

## 3. Non-Goals

Этот scope не должен:

- переносить файловый scaffold, env setup или toolchains в `Foundation Envelope`;
- разрешать агенту создавать `foundation-envelope.flow.json`;
- превращать `.flow.json` в semantic artifact;
- вводить inline semantic editing в canvas;
- требовать отдельный визуальный artifact вместо `foundation-envelope.md`;
- заменять собой `Implementation Foundation` или branch-level design workflow;
- ломать существующие `foundation-envelope.md`, если их можно прочитать по compatibility-path.

---

## 4. Core Decisions

### 4.1. Semantic SSOT остаётся markdown

Канонический semantic artifact шага остаётся:

- `.codeai-hub/<workspaceSlug>/foundation_envelope/foundation-envelope.md`

Диаграмма не должна становиться новой source-of-truth.

### 4.2. `foundation-envelope.flow.json` вводится как runtime-owned sidecar

Новый auxiliary artifact:

- `.codeai-hub/<workspaceSlug>/foundation_envelope/foundation-envelope.flow.json`

Его роль:

- positions;
- viewport;
- revision guard;
- manual user-owned geometry.

Что sidecar не делает:

- не хранит semantic decisions;
- не участвует в workflow gating;
- не должен materialize-иться агентом.

### 4.3. `Artifacts` для `Foundation Envelope` становятся diagram-first surface

`Foundation Envelope` должен следовать product logic, уже принятой для diagram-like stages:

- `Artifacts` показывают визуальную projection layer;
- `Help` показывает guidance по шагу;
- raw markdown остаётся canonical artifact и должен быть доступен через artifact line / viewer, но не как основной пользовательский surface этого шага.

### 4.4. Нужен projection-friendly markdown contract

Текущий prose-heavy стиль `foundation-envelope.md` полезен для чтения, но слишком свободен для надёжного runtime parsing.

Следовательно, агентный output и document shape нужно усилить:

- сохранить human-readable язык;
- добавить стабильные entity headers и field markers;
- сделать markdown одновременно читаемым человеку и parseable для runtime.

### 4.5. Prompt must change in the same scope

Обновление visual projection без обновления prompt создаст постоянный drift.

Следовательно, в этой же wave нужно изменить `foundation-envelope-prompt.md` так, чтобы агент:

- больше не считал visual projection отложенной future-capability;
- строил `foundation-envelope.md` в projection-friendly shape;
- по-прежнему не создавал `foundation-envelope.flow.json`;
- явно разделял semantic decisions и view/layout concerns.

### 4.6. Нужно переиспользовать shared diagram infrastructure

Для `Foundation Envelope` не нужно создавать второй независимый visual subsystem.

Нужно переиспользовать существующие наработки `Diagram Modules`:

- shared diagram panel scaffold;
- shared diagram loader/persistence pipeline;
- shared React Flow shell;
- shared flow sidecar rules.

Но при этом нельзя копировать `Diagram Modules` 1:1, потому что semantic сущности другого шага отличаются.

### 4.7. First-open readability обязательна

Если `foundation-envelope.flow.json` отсутствует, PM всё равно должен построить понятную diagram.

Это значит:

- нужен deterministic fallback layout;
- layout не может зависеть от ручного drag как обязательного шага;
- first-open user experience должен быть readable без sidecar.

### 4.8. Compatibility parser нужен с первого дня

Уже существуют `foundation-envelope.md`, написанные в более свободном стиле.

Поэтому runtime parser должен:

- уметь читать текущий baseline-формат хотя бы по compatibility-path;
- одновременно поддерживать новый projection-friendly contract;
- не требовать ручной миграции всех старых workspace до первого рендера.

---

## 5. Target Architecture

### 5.1. Artifact set

Целевой artifact set шага:

- `.codeai-hub/<workspaceSlug>/foundation_envelope/foundation-envelope.md`
- `.codeai-hub/<workspaceSlug>/foundation_envelope/foundation-envelope.flow.json`

Где:

- `foundation-envelope.md` — canonical semantic artifact;
- `foundation-envelope.flow.json` — layout/view sidecar.

### 5.2. Required semantic zones in markdown

В `foundation-envelope.md` должны остаться те же semantic разделы, но для runtime parsing им нужна более стабильная форма.

Минимальный projection-friendly contract:

1. `## Application Root`
   - `- Title:`
   - `- Summary:`
   - `- Shape:`
2. `## Product Parts`
   - `### Product Part: <part-id>`
   - `- Title:`
   - `- Purpose:`
   - `- Runtime / Platform:`
   - `- Technology:`
   - `- Decision Status:` (`Fixed`, `Proposed`, `Open`)
3. `## Shared Zones`
   - `### Shared Zone: <zone-id>`
   - `- Title:`
   - `- Purpose:`
   - `- Shared With:`
   - `- Primary Owner:`
4. `## Integration Seams`
   - `### Integration Seam: <seam-id>`
   - `- From:`
   - `- To:`
   - `- Kind:`
   - `- Why It Matters:`
   - `- Decision Status:`
5. `## Placement Rules`
6. `## Dependency Rules`
7. `## Open Decisions`

Важно:

- prose остаётся допустимым;
- но entity blocks и ключевые поля должны быть стабильными.

### 5.3. Runtime domain model

Runtime должен materialize-ить отдельную domain model, например `FoundationEnvelopeModel`, в которой есть:

- `applicationRoot`;
- `productParts[]`;
- `sharedZones[]`;
- `integrationSeams[]`;
- revision/meta.

Эта model не заменяет markdown, а derived from markdown.

### 5.4. React Flow projection model

Минимальный visual language:

- один внешний container `Application Root`;
- внутри — bands / containers для `Shared Zones`;
- отдельные карточки `Product Part`;
- labeled edges для `Integration Seams`;
- badges у `Product Part`:
  - runtime/platform;
  - technology;
  - decision status.

Это должна быть не UML и не filesystem-tree.
Это user-facing карта application assembly.

### 5.5. PM integration

Целевой PM path:

- `FoundationEnvelopePanel` больше не рендерит raw markdown как основной `Artifacts` surface;
- panel использует shared `DiagramStagePanelScaffold`;
- loader выбирает stage-specific parser и sidecar path;
- persistence сохраняет только layout в `foundation-envelope.flow.json`.

### 5.6. Validation and gating

Semantic gating продолжает опираться только на `foundation-envelope.md`.

`foundation-envelope.flow.json`:

- должен валидироваться как JSON object;
- не должен влиять на `READY/DONE/OUTDATED`.

### 5.7. Agent instruction changes

Bundled prompt и связанный PM help copy должны быть синхронно обновлены.

Они должны:

- требовать projection-friendly markdown shape;
- объяснять, что diagram строится runtime из markdown;
- запрещать агенту писать `.flow.json`;
- перестать описывать visual projection как future wave.

---

## 6. Current Codebase Audit

### 6.1. `Foundation Envelope` сейчас markdown-only в PM

Текущий panel path:

- `src/client/project-manager/components/foundation-envelope/foundation-envelope-panel.tsx`

Сейчас он:

- читает только `foundation-envelope.md`;
- рендерит `StageArtifactContentView`;
- не использует diagram shell.

### 6.2. Shared diagram pipeline пока жёстко привязан к `diagram_modules`

Текущие точки:

- `src/client/project-manager/components/diagram-editor/diagram-stage-panel-scaffold.tsx`
- `src/client/project-manager/components/diagram-editor/use-diagram-loader.ts`
- `src/client/project-manager/components/diagram-editor/use-diagram-persistence.ts`
- `src/client/project-manager/components/diagram-editor/diagram-modules-progressive-model.ts`

Сейчас там stage-типизация и пути настроены только под `diagram_modules`.

### 6.3. Core artifact surface не знает про FE sidecar

Сейчас `foundation-envelope.flow.json` отсутствует в:

- `packages/core/src/workflow/paths/workflow-paths-types.ts`
- `packages/core/src/workflow/paths/workflow-artifact-paths.ts`
- `packages/core/src/remote-bridge/handlers/http-api-artifact-validation.ts`
- `packages/core/src/remote-bridge/handlers/http-api-system-routes.ts`

### 6.4. Prompt ещё удерживает старую границу шага

`packages/core/src/templates/source/foundation-envelope-prompt.md` сейчас прямо говорит:

- visual projection — future step;
- `foundation-envelope.flow.json` не генерируется в этой wave;
- output фактически описывается как markdown-only result.

Часть про runtime-owned sidecar должна остаться.
Часть про visual-future-step должна быть снята.

---

## 7. Risks And Mitigations

### 7.1. Parser brittleness

Риск:

- текущий markdown слишком свободный для надёжной visual projection.

Смягчение:

- ввести projection-friendly field contract;
- сделать compatibility parser для старого baseline.

### 7.2. Semantic drift between prompt and runtime

Риск:

- prompt пишет одно, runtime ждёт другое.

Смягчение:

- менять prompt, PM help copy и parser в одном execution cycle.

### 7.3. Sidecar starts behaving like semantic truth

Риск:

- `.flow.json` начнёт влиять на workflow semantics.

Смягчение:

- жёстко держать sidecar как layout/view layer only;
- не включать его в semantic gating.

### 7.4. Over-reuse of Diagram Modules assumptions

Риск:

- FE visual projection будет насильно натянута на layout/semantics `Diagram Modules`.

Смягчение:

- переиспользовать shell и persistence;
- но вводить отдельную FE domain model и отдельный adapter to React Flow.

---

## 8. Candidate Execution Slices

### Slice A — Contract activation

- обновить planning/contract docs;
- обновить prompt и help copy;
- зафиксировать `foundation-envelope.flow.json` как runtime-owned sidecar.

### Slice B — Artifact surface and loader generalization

- добавить FE sidecar в workflow artifact surface;
- расширить routing/validation;
- обобщить shared diagram loader на `foundation_envelope`.

### Slice C — FE parser and projection adapter

- ввести FE domain model;
- materialize-ить её из markdown;
- адаптировать model в nodes/edges для React Flow.

### Slice D — PM rendering and persistence

- переключить `FoundationEnvelopePanel` на diagram-first rendering;
- подключить FE sidecar persistence;
- сохранить help fallback и repair path.

### Slice E — Verification

- targeted tests на core artifact surface;
- targeted tests на PM panel parity;
- targeted builds для core/webview.

---

## 9. Verification Target

Этот planning scope считается корректно подготовленным, если после review можно однозначно ответить на вопросы:

1. Какой артефакт остаётся semantic SSOT?
2. Кто владеет `foundation-envelope.flow.json`?
3. Какой markdown contract нужен для runtime projection?
4. Какие visual сущности пользователь увидит в `Artifacts`?
5. Можно ли отрендерить диаграмму без sidecar?
6. Где именно меняются агентные инструкции?
7. Какие shared diagram компоненты переиспользуются, а какие FE-specific?

---

## 10. Expected Outcome

После реализации этой wave CodeAI Hub должен получить завершённый user-facing `Foundation Envelope` step:

- markdown остаётся каноническим semantic artifact;
- Project Manager показывает React Flow-диаграмму application assembly;
- `foundation-envelope.flow.json` хранит только manual layout/view state;
- агент пишет projection-friendly markdown и больше не живёт в text-only допущении;
- пользователь видит понятную картину `Application Root` + `Shared Zones` + `Product Parts` + `Integration Seams` уже на стадии `Foundation Envelope`, до branch-level design и до `Implementation Foundation`.
