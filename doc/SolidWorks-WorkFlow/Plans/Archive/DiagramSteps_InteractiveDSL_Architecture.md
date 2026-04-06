# Diagram Steps — Interactive DSL Architecture

**Status:** DRAFT — awaiting user approval  
**Date:** 2026-03-16  
**Scope:** Workflow steps `diagram_modules` and `diagram_facades`  
**Related:** `DescriptionStep_SingleAgent.md`, `System/WorkflowSteps_Overview.md`, `Workflow_CLI.md`

---

## 1. Problem Statement

Текущие шаги `diagram_modules` и `diagram_facades` генерируют Mermaid-файлы (`.mmd`), которые:
- Отображаются как текст — нет визуального редактора
- Не поддерживают двустороннюю синхронизацию (UI ↔ файл)
- Не имеют стабильных ID для трассировки module → spec → facade → code
- Хрупки для парсинга и обратной генерации

Нужна архитектура, где:
1. Агент генерирует структурированный текстовый артефакт
2. UI рендерит интерактивную диаграмму из этого артефакта
3. Пользователь может редактировать диаграмму мышкой
4. Изменения из UI синхронно отражаются обратно в текстовый артефакт
5. Каждый модуль/фасад имеет стабильный ID для трассировки через весь pipeline

---

## 2. Key Decisions (agreed)

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | Формат артефакта: **Markdown-DSL** (не Mermaid, не JSON, не свободный markdown) | Человекочитаемый, стабильно парсится, эволюционно расширяем |
| D2 | Три файла на шаг: `*.md` (каноническое описание) + `*.flow.json` (visual sidecar) + `*.agent-baseline.md` (agent baseline для diff) | Семантика, layout и agent ownership разделены |
| D3 | Рендеринг: **React Flow** (`@xyflow/react` v12) | Интерактивные узлы/рёбра, кастомные React-компоненты, controlled mode |
| D4 | Автолейаут: **ELK** (`elkjs`, алгоритм `layered`) | Качественное послойное расположение с ортогональной маршрутизацией рёбер |
| D5 | ELK запускается только при первом открытии (`.flow.json` отсутствует) + по явной кнопке "Auto-layout" | Пользовательская расстановка не перезаписывается автоматически |
| D6 | Debounce autosave (700-1000ms), раздельно для semantic и visual слоёв | Серия правок не вызывает частых записей; два канала записи не конфликтуют |
| D7 | Conflict handling через revision/hash файла | Если `.md` изменился извне, UI делает reparse/rebase, а не silent overwrite |
| D8 | **Agent baseline** + structured **change summary** в prompt pack | Агент получает точный diff "что изменил пользователь" между сессиями; ownership persisted через baseline файл, не in-memory |
| D9 | `Relations` — единственный SSOT для графа зависимостей | Без дублирования `Depends on` / `Used by` в Module/Facade блоках |
| D10 | Mermaid-формат (`.mmd`) полностью удаляется | Атомарная замена: `.mmd` файлы, шаблоны и validation удаляются из кодовой базы |
| D11 | Агент **никогда** не читает и не пишет `*.flow.json` | Visual edits без semantic effect для агента не считаются meaningful change |
| D12 | `React Flow` и `ELK` используются как **готовые внешние библиотеки инфраструктурного уровня**, а не как основа доменной модели | Аналогично тому, как `CEF` уже используется как внешний runtime/container: библиотека заимствуется, но SSOT, domain model, parser/serializer, merge logic и workflow contracts остаются нашими |

---

## 3. Artifact Format: Markdown-DSL

### 3.1 Design principles

- Один документ = одна карта (модулей или фасадов)
- Жёсткие заголовки секций: `## Metadata`, `## Modules`, `## Relations` (или `## Facades`, `## Facade Relations`)
- Сущности: `### Module: <id>`, `### Relation: <id>` (или `### Facade: <id>`, `### Facade Relation: <id>`)
- Поля верхнего уровня: `- Key: Value` (одна строка)
- Многозначные поля: отступ-список под ключом
- Свободный текст: только в `Notes:` и `Rationale:` (многострочные блоки в конце сущности)
- Порядок секций и полей — детерминированный (formatter может пересобрать документ)
- Все значения `Id` — kebab-case, стабильные, не меняются агентом
- `## Relations` — единственный источник истины для графа зависимостей между сущностями; в Module/Facade блоках полей `Depends on` / `Used by` нет

### 3.2 Revision computation

Поле `- Revision:` в `## Metadata` вычисляется как sha256 от **normalized content без строки Revision**:

1. Взять полный markdown-текст файла
2. Удалить строку, матчащую `/^- Revision: .+$/m`
3. Нормализовать: trim, collapse consecutive blank lines to single, LF line endings
4. Вычислить sha256, взять первые 8 hex-символов

Это гарантирует, что revision стабильно вычисляем: сериализация → hash → вставка revision → повторная сериализация не меняет содержимое (revision не входит в собственный hash).

### 3.3 module-map.md — canonical format

```md
# Module Map

## Metadata
- Version: 1
- Stage: diagram_modules
- Revision: a1b2c3d4
- Updated: 2026-03-16T14:00:00Z

## Modules

### Module: auth-service
- Id: auth-service
- Kind: service
- Title: Authentication Service
- Responsibility: User authentication, session issuing, token validation
- Cluster: security
- Inputs:
  - user-credentials
  - refresh-token
- Outputs:
  - access-token
  - auth-events
- Spec Target: specifications/auth-service-spec.md
- Contract Targets:
  - contracts/auth-service-facade.md
- Code Targets:
  - packages/auth-service/
- Origin: agent
- Status: proposed

Notes:
Handles login, refresh, logout, and token verification.
Primary entry point for all authentication flows.

### Module: user-store
- Id: user-store
- Kind: service
- Title: User Storage Service
- Responsibility: CRUD operations on user records
- Cluster: data
- Inputs:
  - user-data
- Outputs:
  - user-record
- Spec Target: specifications/user-store-spec.md
- Contract Targets:
  - contracts/user-store-facade.md
- Code Targets:
  - packages/user-store/
- Origin: agent
- Status: proposed

Notes:
Thin service layer over database; no business logic.

## Relations

### Relation: api-gateway__sync-call__auth-service
- Id: api-gateway__sync-call__auth-service
- From: api-gateway
- To: auth-service
- Type: sync-call
- Label: authenticate()
- Criticality: high
- Origin: agent
- Status: proposed

Notes:
Main authentication entry point from public API.

### Relation: auth-service__sync-call__user-store
- Id: auth-service__sync-call__user-store
- From: auth-service
- To: user-store
- Type: sync-call
- Label: findUser()
- Criticality: high
- Origin: agent
- Status: proposed
```

### 3.4 facade-map.md — canonical format

```md
# Facade Map

## Metadata
- Version: 1
- Stage: diagram_facades
- Revision: e5f6g7h8
- Updated: 2026-03-16T14:00:00Z

## Facades

### Facade: auth-facade
- Id: auth-facade
- Module: auth-service
- Kind: class
- Visibility: public
- Methods:
  - login(credentials): AuthToken
  - refresh(token): AuthToken
  - logout(sessionId): void
- Ports:
  - In: http from api-gateway
  - Out: event to audit-log
- Contract Targets:
  - contracts/auth-facade.md
- Code Targets:
  - packages/auth-service/src/auth-facade.ts
- Origin: agent
- Status: proposed

Notes:
Primary facade for authentication flows.

### Facade: user-store-facade
- Id: user-store-facade
- Module: user-store
- Kind: class
- Visibility: internal
- Methods:
  - findById(id): User
  - findByEmail(email): User
  - create(data): User
  - update(id, data): User
- Ports:
  - In: sync-call from auth-facade
  - Out: sync-call to database-adapter
- Contract Targets:
  - contracts/user-store-facade.md
- Code Targets:
  - packages/user-store/src/user-store-facade.ts
- Origin: agent
- Status: proposed

## Facade Relations

### Facade Relation: api-gateway__sync-call__auth-facade
- Id: api-gateway__sync-call__auth-facade
- From: api-gateway
- To: auth-facade
- Type: sync-call
- Label: POST /login
- Origin: agent
- Status: proposed

### Facade Relation: auth-facade__sync-call__user-store-facade
- Id: auth-facade__sync-call__user-store-facade
- From: auth-facade
- To: user-store-facade
- Type: sync-call
- Label: findByEmail()
- Origin: user
- Status: proposed

Notes:
User added this link during diagram editing session.
```

### 3.5 Entity schema reference

**Module fields:**

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| Id | yes | kebab-case string | Stable unique identifier |
| Kind | yes | `service` / `library` / `adapter` / `gateway` / `store` / `external` | Module archetype |
| Title | yes | string | Human-readable name |
| Responsibility | yes | string | One-line summary |
| Cluster | no | kebab-case string | Logical grouping |
| Inputs | no | list of strings | Data/events consumed |
| Outputs | no | list of strings | Data/events produced |
| Spec Target | no | relative path | Link to future module spec |
| Contract Targets | no | list of relative paths | Links to facade contracts |
| Code Targets | no | list of relative paths | Links to source code directories |
| Origin | yes | `agent` / `user` / `merged` | Who created this entity |
| Status | yes | `proposed` / `accepted` / `deprecated` | Lifecycle state |
| Notes | no | multiline text | Free-form explanation |
| Rationale | no | multiline text | Design reasoning |

**Relation fields:**

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| Id | yes | `<from>__<type>__<to>` | Deterministic composite ID |
| From | yes | module ID | Source module |
| To | yes | module ID | Target module |
| Type | yes | `sync-call` / `async-event` / `shared-data` / `config-ref` | Interaction type |
| Label | no | string | Edge label (method, event name, etc.) |
| Criticality | no | `high` / `medium` / `low` | Business criticality |
| Origin | yes | `agent` / `user` / `merged` | Who created this relation |
| Status | yes | `proposed` / `accepted` / `deprecated` | Lifecycle state |
| Notes | no | multiline text | Free-form explanation |

**Facade fields** — same as Module plus:

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| Module | yes | module ID | Parent module from module-map |
| Visibility | yes | `public` / `internal` | External or intra-cluster |
| Methods | no | list of signatures | Public API surface |
| Ports | no | list of `In/Out: <type> from/to <target>` | Connection points |

**Facade Relation fields** — same as Relation, but `From`/`To` reference facade IDs.

**Graph dependency view:** Relations are the single SSOT for the dependency graph. If downstream code or documentation needs a "depends on" / "used by" view for a module, it is computed from Relations at read time, never stored redundantly in the Module block.

---

## 4. Sidecar Format: *.flow.json

Содержит визуальное состояние редактора. **НЕ содержит семантические данные** (модули, зависимости). Семантика всегда из `.md`.

```json
{
  "version": 1,
  "sourceRevision": "a1b2c3d4",
  "viewport": { "x": 0, "y": 0, "zoom": 1.0 },
  "nodePositions": {
    "auth-service": { "x": 100, "y": 200 },
    "user-store": { "x": 300, "y": 400 }
  },
  "nodeExpanded": {
    "auth-service": true,
    "user-store": false
  },
  "elkLayoutApplied": true
}
```

| Field | Purpose |
|-------|---------|
| `version` | Schema version for future migrations |
| `sourceRevision` | Revision of `.md` file when layout was last synced (conflict detection) |
| `viewport` | Camera position and zoom level |
| `nodePositions` | Map of entity ID → {x, y} coordinates |
| `nodeExpanded` | Map of entity ID → expanded/collapsed state |
| `elkLayoutApplied` | Whether ELK auto-layout was run at least once |

---

## 5. Agent Baseline & Change Summary

### 5.1 Problem

Агент должен понимать, что пользователь изменил в диаграмме между сессиями. In-memory tracking (`userModifiedFields`) не переживает закрытие PM. Нужен persisted механизм.

### 5.2 Agent baseline file

Core автоматически создаёт snapshot `.md` каждый раз, когда агент записывает артефакт:

```
.codeai-hub/<workspaceSlug>/diagram_modules/module-map.md                 ← canonical SSOT
.codeai-hub/<workspaceSlug>/diagram_modules/module-map.flow.json          ← visual sidecar
.codeai-hub/<workspaceSlug>/diagram_modules/module-map.agent-baseline.md  ← last agent-written version
```

**Invariants:**
- `.agent-baseline.md` перезаписывается ТОЛЬКО когда агент записывает `.md` (определяется по source: agent session write vs UI write)
- `.agent-baseline.md` НИКОГДА не модифицируется UI, text editor, или пользователем
- Если `.agent-baseline.md` не существует, агент считает, что весь `.md` создан пользователем
- Агент не читает и не пишет `.agent-baseline.md` напрямую — это делает Core
- **Watcher exclusion:** `.agent-baseline.md` полностью исключён из workflow watcher scope. Запись в этот файл НЕ эмитит `workflow.artifact.written`, НЕ триггерит gating events, НЕ влияет на stage status. Watcher отслеживает только canonical artifact (`module-map.md` / `facade-map.md`). Реализация: watcher фильтрует файлы по exact canonical filename match из `WORKFLOW_STAGE_FILES` map; `.agent-baseline.md` не входит в эту map и игнорируется

### 5.3 Change summary generation

При запуске агентной сессии Core:

1. Читает текущий `module-map.md` → парсит в domain model (current)
2. Читает `module-map.agent-baseline.md` → парсит в domain model (baseline)
3. Если baseline не существует → change summary = "all entities are user-created"
4. Если baseline существует → вычисляет structured diff:

```
Change Summary (generated by Core, included in agent prompt pack):

Added by user:
  - Module: notification-service (Kind: service, Title: Notification Service)
  - Relation: auth-service__async-event__notification-service

Removed by user:
  - Module: legacy-adapter

Modified by user:
  - Module: auth-service — fields changed: Title, Responsibility
  - Relation: api-gateway__sync-call__auth-service — fields changed: Label
```

5. Change summary включается в prompt pack как structured block (не как отдельный файл)

### 5.4 Agent response to change summary

Агент обязан:
- **Preserve** entities added by user (keep `Origin: user`)
- **Preserve** field-level changes on modified entities (don't overwrite user-changed fields)
- **Acknowledge** entities removed by user (don't re-add without justification)
- **Update** only entities/fields that it owns (its own `Origin: agent` entities with unchanged fields)

Эти правила описаны в agent prompt (merge-rules section) и подкреплены change summary в prompt pack.

### 5.5 Lifecycle

```
Agent writes module-map.md
  → Core copies module-map.md → module-map.agent-baseline.md
  → User edits via UI (adds module, renames, connects)
  → UI writes updated module-map.md (Origin: user on new entities)
  → Time passes, PM closed/reopened
  → User triggers agent again
  → Core computes diff: current .md vs .agent-baseline.md
  → Core includes change summary in prompt pack
  → Agent reads summary, preserves user changes, writes updated .md
  → Core overwrites .agent-baseline.md with new agent version
  → Cycle repeats
```

---

## 6. Data Flow Architecture

### 6.1 Four-layer model

```
┌─────────────┐    parse     ┌──────────────┐    transform    ┌─────────────────┐    render    ┌──────────────┐
│  .md file   │ ──────────>  │ Domain Model │ ─────────────>  │ React Flow State│ ──────────> │  Canvas UI   │
│ (canonical) │              │  (in-memory) │                 │ (nodes/edges)   │             │ (interactive)│
└─────────────┘  <──────────  └──────────────┘  <─────────────  └─────────────────┘             └──────────────┘
                  serialize       ↕                  patch
                              ┌──────────────┐
                              │ .flow.json   │
                              │ (positions)  │
                              └──────────────┘
```

### 6.2 Read path (file → screen)

1. UI opens diagram panel
2. Fetch `module-map.md` content via HTTP from Core
3. **Parse**: `MarkdownDslParser.parse(content)` → `DiagramDomainModel`
4. **Load sidecar**: Read `module-map.flow.json` (if exists)
5. **Transform**: `domainModelToReactFlow(model, positions)` → `{ nodes, edges }`
   - If no `.flow.json` exists: run ELK layout, then save positions to `.flow.json`
   - If `.flow.json` exists: use stored positions; nodes without positions get `{x: 0, y: 0}`
6. **Render**: React Flow mounts with nodes/edges

### 6.3 Write path: semantic edits (screen → .md)

User actions: add module, delete module, add relation, rename, change type/label

1. React Flow event → **domain patch** (e.g., `{ type: 'add-module', module: {...} }`)
2. Apply patch to in-memory `DiagramDomainModel`
3. **Origin transition**: if the patched entity has `Origin: agent`, set `Origin: merged` immediately in the in-memory model. This ensures that any subsequent external agent write (section 6.5) will trigger field-level merge instead of blind overwrite. New entities created by user get `Origin: user`.
4. **Debounce** (800ms)
5. **Conflict check**: compute hash of `.md` file on disk, compare with `lastKnownRevision`
   - Match → proceed to write
   - Mismatch → reparse file from disk, rebase pending patches, resolve or enter conflict state
6. **Serialize**: `MarkdownDslSerializer.serialize(model)` → markdown string (revision computed from normalized content excluding Revision field)
7. Write `module-map.md` via Core API
8. Core watcher detects `workflow.artifact.written` → downstream gating
9. `.agent-baseline.md` is **NOT** updated (only agent writes trigger baseline update)

### 6.4 Write path: visual edits (screen → .flow.json)

User actions: drag node, zoom, pan, expand/collapse

1. React Flow `onNodesChange` / `onMove` → position updates
2. **Debounce** (800ms)
3. Collect all `nodePositions`, `viewport`, `nodeExpanded`
4. Write `module-map.flow.json` via Core API
5. No downstream gating triggered (visual-only)

### 6.5 Agent write path

1. Agent writes/overwrites `module-map.md`
2. Core copies new `module-map.md` → `module-map.agent-baseline.md`
3. Core watcher fires `workflow.artifact.written`
4. If UI panel is open: re-fetch `.md`, reparse, diff against current in-memory model
5. Merge strategy for live UI (see section 12.3 for rules):
   - Entities with `Origin: user` → keep UI version entirely
   - Entities with `Origin: agent` (no local edits in this session) → take agent version
   - Entities with `Origin: merged` (transitioned from `agent` by local edit, see 6.3 step 3) → field-level merge using baseline diff
   - New entities from agent → add; nodes without positions get `{x: 0, y: 0}`
   - Entities removed by agent → mark as `deprecated`, don't delete immediately
6. **No automatic ELK re-layout.** New nodes appear at `{0, 0}`. User clicks "Auto-layout" if they want repositioning.

---

## 7. Artifact File Mapping

### 7.1 File triplet per step

| Step | Canonical artifact | Visual sidecar | Agent baseline |
|------|-------------------|----------------|----------------|
| `diagram_modules` | `module-map.md` | `module-map.flow.json` | `module-map.agent-baseline.md` |
| `diagram_facades` | `facade-map.md` | `facade-map.flow.json` | `facade-map.agent-baseline.md` |

### 7.2 File locations

```
.codeai-hub/<workspaceSlug>/diagram_modules/module-map.md
.codeai-hub/<workspaceSlug>/diagram_modules/module-map.flow.json
.codeai-hub/<workspaceSlug>/diagram_modules/module-map.agent-baseline.md
.codeai-hub/<workspaceSlug>/diagram_facades/facade-map.md
.codeai-hub/<workspaceSlug>/diagram_facades/facade-map.flow.json
.codeai-hub/<workspaceSlug>/diagram_facades/facade-map.agent-baseline.md
```

### 7.3 Mermaid removal (complete)

Формат `.mmd` полностью удаляется из кодовой базы. Не deprecated — удалён. Никакого compat-слоя.

Файлы к удалению:
- `packages/core/src/templates/source/modules-diagram-template.mmd`
- `packages/core/src/templates/source/facades-graph-template.mmd`
- Записи `modules-diagram-template` и `facades-graph-template` в `bundled-templates.ts`
- Mermaid validation regex в `diagram-modules-panel.tsx` и `diagram-facades-panel.tsx`

Файлы к замене (содержимое полностью переписывается):
- `modules-diagram-prompt.md` → новый промпт под Markdown-DSL
- `facades-graph-prompt.md` → новый промпт под Markdown-DSL

### 7.4 Code changes for path migration (atomic)

Все изменения ниже применяются в одном Stream и коммитятся вместе, чтобы не было состояния, где runtime ожидает `.mmd`, а агент уже пишет `.md`:

| File | Change |
|------|--------|
| `workflow-paths-types.ts` | Заменить `"modules-diagram.mmd"` → `"module-map.md"`, `"facades-graph.mmd"` → `"facade-map.md"` в `WorkflowArtifactFileName` |
| `workflow-artifact-paths.ts` | Обновить `WORKFLOW_STAGE_FILES` map; добавить sidecar + baseline path resolvers |
| `bundled-templates.ts` | Удалить `.mmd` записи; добавить новые `.md` template записи |
| `diagram-modules-panel.tsx` | Удалить Mermaid validation; заменить на React Flow рендеринг |
| `diagram-facades-panel.tsx` | Удалить Mermaid validation; заменить на React Flow рендеринг |
| `http-api-router.ts` | Обновить artifact serving для новых файлов; добавить baseline write endpoint |
| `System/WorkflowSteps_Overview.md` | Обновить описания шагов 3-4: artifact names, format description |
| `Workflow_CLI.md` | Обновить artifact file references |

---

## 8. Domain Model (TypeScript types)

```typescript
// --- Shared ---

type EntityOrigin = 'agent' | 'user' | 'merged';
type EntityStatus = 'proposed' | 'accepted' | 'deprecated';

// --- Module Map ---

type ModuleKind = 'service' | 'library' | 'adapter' | 'gateway' | 'store' | 'external';
type RelationType = 'sync-call' | 'async-event' | 'shared-data' | 'config-ref';
type Criticality = 'high' | 'medium' | 'low';

type ModuleEntity = {
  readonly id: string;
  readonly kind: ModuleKind;
  readonly title: string;
  readonly responsibility: string;
  readonly cluster?: string;
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
  readonly specTarget?: string;
  readonly contractTargets: readonly string[];
  readonly codeTargets: readonly string[];
  readonly origin: EntityOrigin;
  readonly status: EntityStatus;
  readonly notes?: string;
  readonly rationale?: string;
};

type ModuleRelation = {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly type: RelationType;
  readonly label?: string;
  readonly criticality?: Criticality;
  readonly origin: EntityOrigin;
  readonly status: EntityStatus;
  readonly notes?: string;
};

type ModuleMapModel = {
  readonly version: number;
  readonly stage: 'diagram_modules';
  readonly revision: string;
  readonly updated: string;
  readonly modules: readonly ModuleEntity[];
  readonly relations: readonly ModuleRelation[];
};

// --- Facade Map ---

type FacadeVisibility = 'public' | 'internal';

type FacadePort = {
  readonly direction: 'In' | 'Out';
  readonly type: string;
  readonly target: string;
};

type FacadeEntity = {
  readonly id: string;
  readonly module: string;
  readonly kind: 'class';
  readonly visibility: FacadeVisibility;
  readonly methods: readonly string[];
  readonly ports: readonly FacadePort[];
  readonly contractTargets: readonly string[];
  readonly codeTargets: readonly string[];
  readonly origin: EntityOrigin;
  readonly status: EntityStatus;
  readonly notes?: string;
  readonly rationale?: string;
};

type FacadeRelation = {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly type: RelationType;
  readonly label?: string;
  readonly origin: EntityOrigin;
  readonly status: EntityStatus;
  readonly notes?: string;
};

type FacadeMapModel = {
  readonly version: number;
  readonly stage: 'diagram_facades';
  readonly revision: string;
  readonly updated: string;
  readonly facades: readonly FacadeEntity[];
  readonly relations: readonly FacadeRelation[];
};

// --- Sidecar ---

type FlowSidecar = {
  readonly version: number;
  readonly sourceRevision: string;
  readonly viewport: { readonly x: number; readonly y: number; readonly zoom: number };
  readonly nodePositions: Readonly<Record<string, { readonly x: number; readonly y: number }>>;
  readonly nodeExpanded: Readonly<Record<string, boolean>>;
  readonly elkLayoutApplied: boolean;
};

// --- Domain Patches (Module Map) ---

type ModuleDomainPatch =
  | { readonly type: 'add-module'; readonly module: ModuleEntity }
  | { readonly type: 'delete-module'; readonly moduleId: string }
  | { readonly type: 'update-module'; readonly moduleId: string; readonly fields: Partial<ModuleEntity> }
  | { readonly type: 'add-relation'; readonly relation: ModuleRelation }
  | { readonly type: 'delete-relation'; readonly relationId: string }
  | { readonly type: 'update-relation'; readonly relationId: string; readonly fields: Partial<ModuleRelation> };

// --- Domain Patches (Facade Map) ---

type FacadeDomainPatch =
  | { readonly type: 'add-facade'; readonly facade: FacadeEntity }
  | { readonly type: 'delete-facade'; readonly facadeId: string }
  | { readonly type: 'update-facade'; readonly facadeId: string; readonly fields: Partial<FacadeEntity> }
  | { readonly type: 'add-facade-relation'; readonly relation: FacadeRelation }
  | { readonly type: 'delete-facade-relation'; readonly relationId: string }
  | { readonly type: 'update-facade-relation'; readonly relationId: string; readonly fields: Partial<FacadeRelation> };

// --- Unified patch type for DiagramEditor ---

type DiagramDomainPatch = ModuleDomainPatch | FacadeDomainPatch;

// --- Change Summary (generated by Core for agent prompt pack) ---

type EntityChange = {
  readonly entityType: 'module' | 'relation' | 'facade' | 'facade-relation';
  readonly entityId: string;
  readonly action: 'added' | 'removed' | 'modified';
  readonly modifiedFields?: readonly string[];
  readonly summary?: string;
};

type ChangeSummary = {
  readonly baselineRevision: string;
  readonly currentRevision: string;
  readonly changes: readonly EntityChange[];
};
```

---

## 9. Parser & Serializer

### 9.1 Parser: Markdown-DSL → Domain Model

```
Input: raw markdown string
Output: ModuleMapModel | FacadeMapModel | ParseError

Algorithm:
1. Split content by lines
2. Extract ## sections (Metadata, Modules/Facades, Relations/Facade Relations)
3. Within each section, split by ### headers
4. For each entity block:
   a. Extract header: ### Module: <id> → entity type + id
   b. Parse key-value pairs: /^- (\w[\w\s]*\w?): (.+)$/
   c. Parse list fields: /^  - (.+)$/ (indented items after key)
   d. Parse multiline blocks: Notes:, Rationale: (everything until next ### or ##)
5. Validate required fields per entity type
6. Build typed objects
7. Compute revision: sha256 of normalized content without Revision line, first 8 hex chars
```

### 9.2 Parser error policy (strict)

Канонический DSL — это SSOT. Parser ошибки должны быть детерминированными и блокирующими:

| Error condition | Severity | Behavior |
|----------------|----------|----------|
| Duplicate entity ID | **ERROR** | Parsing stops. Step status = `ERROR`. No autosave. User/agent must fix |
| Missing required field (Id, Kind, Title, etc.) | **ERROR** | Entity is invalid. Step status = `ERROR`. Invalid entity highlighted in UI |
| Unknown `## Section` header | WARNING | Section ignored, logged |
| Unknown field key within entity | IGNORED | Forward compatibility — field skipped silently |
| Unknown `### Entity` header type | WARNING | Block ignored, logged |
| Malformed key-value line | WARNING | Line skipped, logged |
| Empty file | **ERROR** | Step status = `ERROR` |
| Missing `## Metadata` section | **ERROR** | Step status = `ERROR` |

**Invariant:** Parser NEVER silently drops or overwrites data. Duplicate ID = hard error, not "second wins".

### 9.3 Serializer: Domain Model → Markdown-DSL

```
Input: ModuleMapModel | FacadeMapModel
Output: formatted markdown string

Algorithm:
1. Write # header
2. Write ## Metadata (Version, Stage, Updated)
3. Serialize content without Revision line
4. Compute revision hash from step 3 output
5. Insert Revision line into Metadata
6. For each entity (deterministic order by ID):
   a. Write ### header
   b. Write required fields in fixed order
   c. Write optional fields (skip if empty)
   d. Write list fields with indentation
   e. Write multiline blocks (Notes, Rationale) last
7. Write ## Relations section
8. Same entity serialization for relations
```

**Canonical ordering guarantees:**
- Metadata fields: Version, Stage, Revision, Updated
- Module fields: Id, Kind, Title, Responsibility, Cluster, Inputs, Outputs, Spec Target, Contract Targets, Code Targets, Origin, Status, Notes, Rationale
- Facade fields: Id, Module, Kind, Visibility, Methods, Ports, Contract Targets, Code Targets, Origin, Status, Notes, Rationale
- Entities sorted by Id (alphabetical)
- Relations sorted by Id (alphabetical)

---

## 10. React Flow Integration

`React Flow` и `ELK` в этой архитектуре не являются источником истины и не определяют продуктовый контракт шага. Это внешние инфраструктурные зависимости, заимствуемые как готовые библиотеки:
- `React Flow` — UI/editor framework: [reactflow.dev](https://reactflow.dev), [xyflow/xyflow](https://github.com/xyflow/xyflow)
- `ELK` / `elkjs` — layout engine: [eclipse.dev/elk](https://eclipse.dev/elk/), [eclipse-elk/elk](https://github.com/eclipse-elk/elk)

Их роль в системе аналогична роли `CEF` как внешнего runtime/container: библиотека используется как готовый движок, но не становится доменным SSOT. Все продуктовые инварианты остаются в наших слоях:
- Markdown-DSL artifacts
- Domain Model
- Parser / Serializer / Revision rules
- Baseline / Change Summary / Merge logic
- Facades and adapters around editor/layout integration

Следствие для реализации:
- Core / DSL слой не зависит от типов `React Flow`
- `ELK` интегрируется только через наш `DiagramLayoutFacade`
- `React Flow` интегрируется только через `DiagramEditorFacade` и graph adapters
- Замена layout/editor библиотеки в будущем не должна требовать смены формата `*.md`

### 10.1 Custom node types

**ModuleNode** (for diagram_modules):
- Header: module title + kind badge
- Body: responsibility (one line)
- Footer: status badge + origin indicator
- Handles: top (target), bottom (source)
- Visual: cluster-based color coding

**FacadeNode** (for diagram_facades):
- Header: facade title + visibility badge
- Body: methods list (collapsible)
- Footer: module reference link
- Handles: per-port (typed: http, event, ws, etc.)

**ClusterGroup** (for diagram_modules):
- Background container grouping modules by cluster
- Label: cluster name
- Collapsible

### 10.2 Custom edge types

**RelationEdge:**
- Label: relation label (method name, event name)
- Style by type: solid (sync-call), dashed (async-event), dotted (config-ref)
- Color by criticality: red (high), orange (medium), gray (low/default)
- Animated: true for async-event

### 10.3 Component hierarchy

```
<ReactFlowProvider>
  <DiagramEditor
    stage="diagram_modules" | "diagram_facades"
    workspacePath={...}
    workspaceSlug={...}
  >
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={handleNodesChange}
      onEdgesChange={handleEdgesChange}
      onConnect={handleConnect}
      fitView
    >
      <Panel position="top-right">
        <AutoLayoutButton />
        <SaveStatusIndicator />
      </Panel>
      <Panel position="top-left">
        <AddModuleButton />
        <LayoutDirectionToggle />
      </Panel>
      <Background />
      <Controls />
      <MiniMap />
    </ReactFlow>
  </DiagramEditor>
</ReactFlowProvider>
```

### 10.4 State management

Controlled mode with React hooks (no external store for v1):

```typescript
const [domainModel, setDomainModel] = useState<ModuleMapModel | FacadeMapModel>(initialModel);
const [nodes, setNodes] = useState<Node[]>([]);
const [edges, setEdges] = useState<Edge[]>([]);
const [saveStatus, setSaveStatus] = useState<DiagramSaveStatus>('saved');

type DiagramSaveStatus = 'saved' | 'unsaved' | 'saving' | 'merged' | 'error' | 'conflict';
```

Save status transitions:
```
saved → unsaved (user makes semantic or visual edit)
unsaved → saving (debounce fires, write begins)
saving → saved (write succeeded)
saving → merged (external change detected, auto-merge succeeded)
merged → saved (after 2s auto-transition)
saving → error (write failed)
saving → conflict (external change detected, auto-merge failed)
conflict → saved (user resolves conflict)
error → saving (retry)
```

Separation of concerns:
- `useDiagramLoader(stage, workspacePath, workspaceSlug)` — fetch .md + .flow.json, parse, transform
- `useDiagramPersistence(domainModel, flowState)` — debounced save for both layers
- `useElkLayout(nodes, edges)` — auto-layout on demand
- `useDomainPatch(domainModel, setDomainModel)` — apply semantic patches from UI actions

---

## 11. ELK Layout Configuration

```typescript
const ELK_OPTIONS = {
  'elk.algorithm': 'layered',
  'elk.direction': 'DOWN',
  'elk.spacing.nodeNode': '60',
  'elk.layered.spacing.nodeNodeBetweenLayers': '80',
  'elk.spacing.edgeNode': '30',
  'elk.edgeRouting': 'ORTHOGONAL',
  'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
  'elk.padding': '[top=30,left=30,bottom=30,right=30]',
} as const;
```

**When ELK runs (v1 invariant — no exceptions):**
1. First open: `.flow.json` absent → compute full layout → save to `.flow.json`
2. "Auto-layout" button click: recompute all positions → overwrite `.flow.json`

**When ELK does NOT run:**
- Agent adds new modules → nodes appear at `{0, 0}`, no automatic re-layout
- User adds a module via UI → node appears at viewport center, no re-layout
- Any drag/resize/connect operation → no re-layout

**Future (v2, out of scope):** "Layout new nodes only" mode.

---

## 12. Conflict Resolution

### 12.1 Revision tracking

- `Revision` in `.md` Metadata = sha256(normalized content without Revision line), first 8 hex chars
- `sourceRevision` in `.flow.json` = Revision of `.md` when sidecar was last written
- UI keeps `lastKnownRevision` in memory = Revision at the time of last successful load or save

### 12.2 Conflict detection

Before writing `.md` from UI:
1. Read current file from disk
2. Compute its revision hash
3. Compare with `lastKnownRevision`
4. If match → safe to write
5. If mismatch → file was changed externally (agent or text editor)

### 12.3 Merge strategy (baseline-driven)

When external change is detected (mismatch in step 5 above), merge uses `Origin` field and agent baseline diff:

**For each entity, compare by stable `Id`:**

| Entity in UI | Entity on disk | Action |
|-------------|---------------|--------|
| `Origin: user` | Any | **Keep UI version** — user entities are never overwritten |
| `Origin: agent` | Updated on disk | **Take disk version** — agent updated its own entity |
| `Origin: merged` | Updated on disk | **Field-level merge**: compute baseline diff (current .md vs .agent-baseline.md) to determine which fields user changed; preserve user-changed fields, take agent values for rest |
| Present in UI | Absent on disk | **Mark `Status: deprecated`** — don't delete immediately, show visual indicator |
| Absent in UI | Present on disk | **Add from disk** — new entity from agent |

**After merge:**
- Recompute revision from merged model
- Update `lastKnownRevision`
- Write merged `.md` to disk
- Update UI state
- Set `saveStatus: 'merged'` → auto-transition to `'saved'` after 2s

### 12.4 Conflict state (unresolvable)

If automatic merge fails (e.g., same field changed both in UI and on disk with different values, and baseline can't determine winner):
- Set `saveStatus: 'conflict'`
- Show conflict indicator in UI
- User must choose: "Keep mine" / "Take theirs" / "Open in editor"
- No autosave until conflict is resolved

---

## 13. Agent Artifact Pack

### 13.1 Overview

Each diagram step agent receives a **runtime prompt pack** assembled by Core at session creation. The pack contains all files the agent needs to produce a correct Markdown-DSL artifact while respecting user edits.

**Critical invariant:** Agent never reads or writes `*.flow.json` or `*.agent-baseline.md`. Visual layout and baseline management are Core responsibilities. For the agent, these files do not exist.

### 13.2 diagram_modules agent pack

| File | Location | Purpose | When included |
|------|----------|---------|---------------|
| `module-map-prompt.md` | `packages/agents/diagram-modules-agent/assets/` | System prompt: role, algorithm, behavior rules | Always |
| `module-map-template.md` | `packages/agents/diagram-modules-agent/assets/` | Canonical DSL example with all fields | Always |
| `module-map-field-reference.md` | `packages/agents/diagram-modules-agent/assets/` | Grammar card: required/optional fields, allowed values, section ordering | Always |
| `module-map-merge-rules.md` | `packages/agents/diagram-modules-agent/assets/` | Preservation rules: what agent must keep, how to handle Origin, how to treat change summary | Always |
| Change summary block | Generated by Core at runtime (see section 5.3) | Structured diff: what user added/removed/modified since last agent write | Only if `.agent-baseline.md` exists and current `.md` differs from it |
| `Final_Description.md` path | Provided by Core in session message | Upstream SSOT from Description step | Always |
| `virtual-simulation.md` path | Provided by Core in session message | Upstream SSOT from Virtual Simulation step | Always |
| Current `module-map.md` path | Provided by Core in session message | Existing artifact to read and update (if present) | If artifact exists |

### 13.3 diagram_facades agent pack

| File | Location | Purpose | When included |
|------|----------|---------|---------------|
| `facade-map-prompt.md` | `packages/agents/diagram-facades-agent/assets/` | System prompt: role, algorithm, behavior rules | Always |
| `facade-map-template.md` | `packages/agents/diagram-facades-agent/assets/` | Canonical DSL example with all fields | Always |
| `facade-map-field-reference.md` | `packages/agents/diagram-facades-agent/assets/` | Grammar card: required/optional fields, allowed values, section ordering | Always |
| `facade-map-merge-rules.md` | `packages/agents/diagram-facades-agent/assets/` | Preservation rules for user edits | Always |
| Change summary block | Generated by Core at runtime | Structured diff from baseline | Only if baseline exists and differs |
| `Final_Description.md` path | Provided by Core | Upstream SSOT | Always |
| `module-map.md` path | Provided by Core | Upstream module map from previous step | Always |
| Current `facade-map.md` path | Provided by Core | Existing artifact to read and update | If artifact exists |

### 13.4 Agent Workflow Sequence

Both diagram agents follow the same behavioral sequence:

```
1. READ UPSTREAM ARTIFACTS
   - Read Final_Description.md (always)
   - Read virtual-simulation.md (diagram_modules) or module-map.md (diagram_facades)

2. READ CURRENT ARTIFACT (if exists)
   - Read module-map.md / facade-map.md
   - Parse to understand current state

3. READ CHANGE SUMMARY (if provided in prompt pack)
   - Understand what user added, removed, modified
   - This is the agent's window into user intent

4. PRESERVE USER SEMANTICS
   - Entities with Origin: user → do not modify or remove
   - Fields changed by user (from change summary) → do not overwrite
   - Entities removed by user → do not re-add without explicit justification to user

5. ASK CLARIFYING QUESTIONS (1-3 max)
   - About module boundaries, dependencies, contracts
   - Wait for explicit user confirmation (OK/approve)

6. WRITE CANONICAL ARTIFACT
   - Full rewrite of module-map.md / facade-map.md
   - Set Origin: agent on all agent-created entities
   - Preserve Origin: user on user-created entities
   - Set Origin: merged on entities where both contributed
   - Follow canonical field ordering from field-reference
   - Follow Markdown-DSL grammar strictly

7. DO NOT TOUCH
   - *.flow.json (visual layout — not agent's concern)
   - *.agent-baseline.md (managed by Core automatically)
```

### 13.5 Prompt file contents (summary)

**`*-prompt.md`** — system instruction with:
- Agent role and stage identity
- Input file list and how to read them
- Step-by-step algorithm (the sequence above)
- Output format: Markdown-DSL
- File-first principle: write artifact immediately, then iterate
- Resume behavior: read existing artifact, preserve user changes

**`*-template.md`** — complete DSL example:
- Full `## Metadata`, `## Modules`/`## Facades`, `## Relations`/`## Facade Relations` sections
- All required and optional fields shown
- Comments explaining each section's purpose

**`*-field-reference.md`** — grammar card:
- Table of all fields per entity type (required/optional, type, allowed values)
- Section ordering rules
- Id format rules (kebab-case, composite for relations)
- Origin and Status semantics

**`*-merge-rules.md`** — preservation contract:
- Table of Origin values and what agent may/may not do
- How to interpret change summary entries
- What to do when upstream changes invalidate existing entities
- Rule: never silently delete user entities

---

## 14. Migration Strategy

### 14.1 Approach: atomic replacement (no compat bridge)

Mermaid `.mmd` files are fully removed. There is no compatibility layer, no fallback, no bridge that generates `.mmd` from `.md`. The switch happens atomically within a single coordinated set of changes.

### 14.2 Rationale

- No production users depend on `.mmd` artifacts (the steps were stub-only, rendering Mermaid as text)
- A compat bridge would add complexity with zero benefit
- The `.mmd` templates contain trivial placeholder content (`module-a --> module-b`)
- Clean cut is simpler and safer than maintaining two code paths

### 14.3 Atomic changeset

All of the following must be committed together (or in a tightly sequenced Stream where each step builds on the previous):

1. **Delete** `.mmd` template files from `packages/core/src/templates/source/`
2. **Create** new `.md` template files in same directory
3. **Create** agent asset files (prompt, template, field-reference, merge-rules) in agent packages
4. **Rewrite** agent prompt files for Markdown-DSL output
5. **Update** `bundled-templates.ts` — remove `.mmd` entries, add `.md` entries
6. **Update** `workflow-paths-types.ts` — replace `.mmd` file names with `.md`
7. **Update** `workflow-artifact-paths.ts` — update `WORKFLOW_STAGE_FILES` map, add baseline path resolver
8. **Rewrite** `diagram-modules-panel.tsx` and `diagram-facades-panel.tsx` — remove Mermaid regex, add React Flow rendering
9. **Update** SSOT docs: `System/WorkflowSteps_Overview.md`, `Workflow_CLI.md` — new artifact names and format description

### 14.4 Legacy workspace handling

Workspaces created before this migration may contain `.mmd` files:
- `.codeai-hub/<slug>/diagram_modules/modules-diagram.mmd`
- `.codeai-hub/<slug>/diagram_facades/facades-graph.mmd`

These files are **orphaned** — runtime no longer recognizes them. The step will show as `READY` (artifact missing), not `DONE`. User must re-run the agent to generate the new `.md` artifact. This is acceptable because:
- The old `.mmd` files were agent-generated stubs
- No user has manually edited them (there was no editor)
- Re-running the agent produces a richer, more useful artifact

---

## 15. Gating & OUTDATED Propagation

No change in gating semantics. Only file names change:

```
Final_Description.md changed → virtual_simulation = OUTDATED
virtual-simulation.md changed → diagram_modules = OUTDATED
module-map.md changed → diagram_facades = OUTDATED
```

Files that do NOT trigger OUTDATED propagation or any watcher events:
- `*.flow.json` — visual-only sidecar, not a workflow artifact
- `*.agent-baseline.md` — internal Core bookkeeping, excluded from watcher scope entirely (see section 5.2 invariants)

Only canonical artifacts (`module-map.md`, `facade-map.md`) are in the watcher's `WORKFLOW_STAGE_FILES` map.

---

## 16. New Dependencies

| Package | Version | Size (gzipped) | Purpose |
|---------|---------|----------------|---------|
| `@xyflow/react` | ^12 | ~80 KB | Interactive diagram renderer |
| `elkjs` | ^0.9 | ~1.4 MB | Auto-layout engine |

Both installed in the PM webview scope. esbuild bundles them into `app.js`.

**Bundle impact:** Current PM bundle + ~1.5 MB. Acceptable for desktop application (CEF/VS Code webview).

**Direct links:**
- React Flow docs: [https://reactflow.dev](https://reactflow.dev)
- React Flow source: [https://github.com/xyflow/xyflow](https://github.com/xyflow/xyflow)
- ELK docs: [https://eclipse.dev/elk/](https://eclipse.dev/elk/)
- ELK source: [https://github.com/eclipse-elk/elk](https://github.com/eclipse-elk/elk)

---

## 17. Implementation Phases (high-level)

This section outlines scope boundaries for the `todo-plan.md`. Each phase will be detailed there.

### Phase A — Markdown-DSL Parser & Serializer
- `MarkdownDslParser` (parse `.md` → domain model: both Module and Facade variants)
- `MarkdownDslSerializer` (serialize domain model → `.md`: both variants)
- Revision computation (sha256 excluding Revision line)
- Strict error policy (duplicate ID = ERROR, missing required = ERROR)
- Unit tests: roundtrip (parse → serialize → parse = identical), error cases, revision stability
- Location: `packages/core/src/workflow/diagram-dsl/`

### Phase B — Change Summary & Baseline Diffing
- `BaselineDiffService` (diff current `.md` vs `.agent-baseline.md` → `ChangeSummary`)
- Core hook: auto-copy `.md` → `.agent-baseline.md` on agent writes
- Unit tests: baseline diff scenarios (added/removed/modified entities, field-level diff)
- Location: `packages/core/src/workflow/diagram-dsl/`

### Phase C — Path Migration & Mermaid Removal (atomic)
- Delete `.mmd` template files
- Create new `.md` template and agent asset files (prompt, template, field-reference, merge-rules)
- Update `workflow-paths-types.ts`, `workflow-artifact-paths.ts`
- Update `bundled-templates.ts`
- Agent facade stubs (diagram-modules-agent, diagram-facades-agent)
- Update SSOT docs (WorkflowSteps_Overview, Workflow_CLI)

### Phase D — React Flow UI Components
- Install `@xyflow/react`, `elkjs`
- `DiagramEditor` component (shared between modules/facades)
- Custom node types: `ModuleNode`, `FacadeNode`, `ClusterGroup`
- Custom edge type: `RelationEdge`
- Replace current `DiagramModulesPanel` / `DiagramFacadesPanel`

### Phase E — Domain Model ↔ React Flow Transform
- `domainModelToReactFlow()` — model → nodes/edges (both Module and Facade variants)
- `reactFlowToDomainPatches()` — UI changes → `DiagramDomainPatch` (Module + Facade patch types)
- `applyDomainPatch()` — patch → updated model
- ELK layout integration (initial layout + auto-layout button)

### Phase F — Persistence & Conflict Handling
- `useDiagramLoader` hook (fetch + parse + load sidecar)
- `useDiagramPersistence` hook (debounce save, separate semantic/visual)
- Revision/hash conflict detection
- Baseline-driven merge logic
- Save status indicator (full state machine: saved/unsaved/saving/merged/error/conflict)
- Core API: sidecar + baseline file read/write endpoints

### Phase G — Merge/Conflict Invariant Tests
- Unit tests: agent overwrites while UI has pending changes
- Unit tests: external text editor modifies `.md`
- Unit tests: baseline-driven field-level merge
- Unit tests: change summary generation for various edit patterns
- Integration tests: roundtrip UI patch → serialize → parse → verify
- Integration tests: concurrent agent + UI writes

### Phase H — Agent Integration & End-to-End
- Wire agents into runtime (session creation, prompt pack assembly with change summary)
- End-to-end flow: agent writes → baseline created → UI renders → user edits → agent reads changes via summary
- Smoke tests: create workspace, run agent, edit diagram, re-run agent, verify preservation
- Verify gating: module-map.md change → diagram_facades = OUTDATED

---

## 18. Out of Scope (v1)

- Methods/Ports as top-level entities in facade-map (kept inline in Facade block)
- "Layout new nodes only" ELK mode
- Undo/redo in diagram editor
- Collaborative editing (multiple users)
- Export to PNG/SVG/PDF
- `Boundary`, `External`, `DataObject` entity types (future extensions)
- Mermaid compatibility layer (`.mmd` fully removed, see section 14)

---

## 19. Related Documents

- `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md` — pattern for agent contracts
- `doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md` — upstream step contract
- `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md` — gating state machine
- `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md` — all 6 workflow steps
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` — system-level architecture
