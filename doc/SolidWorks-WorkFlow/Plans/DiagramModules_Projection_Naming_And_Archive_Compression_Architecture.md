# Diagram Modules — Projection Naming Cleanup + Archive Compression Architecture

**Status:** Approved for implementation
**Date:** 2026-04-09
**Owner:** Codex
**Target release:** docs/refactor only, no release build (нет user-visible behavior changes)

## 1. Problem

После удаления React Flow в релизе `1.1.921` и всех связанных cleanup-волн (Phase 1+2 текущей сессии, релиз `1.1.922`) adapter layer внутри `diagram-editor` всё ещё именован вокруг несуществующей технологии.

### 1.1 File naming
- `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.ts`
- `.../adapters/domain-model-to-react-flow.types.ts`
- `.../adapters/module-stage-react-flow.ts`
- `.../adapters/domain-model-to-react-flow.test.ts`
- `.../adapters/domain-model-to-react-flow.product-parts.test.ts`
- `.../adapters/domain-model-to-react-flow.external-boundary.test.ts`
- `.../adapters/domain-model-to-react-flow.standalone-band.test.ts`

### 1.2 Type naming
- `DiagramFlowStage`, `DiagramFlowNodeType`, `DiagramFlowNodeData`, `DiagramFlowNode`, `DiagramFlowProjection`
- `ProductPartFlowNodeData`, `ClusterFlowNodeData`, `ModuleFlowNodeData`

### 1.3 Function naming
- `domainModelToReactFlow()` — реально производит CSS Grid projection, а не React Flow.

### 1.4 Dead links в архиве — отдельная проблема
`doc/SolidWorks-WorkFlow/Plans/Archive/` содержит 76 архивных planning-документов, `doc/TODO/Archive/` — 20 архивных todo-plans. Внутри них живёт ~62 inline-кода reference на файлы по старым путям (до Phase 2 перемещений) и на удалённый код (до Session024 React Flow removal). `check:links` эти ссылки не ловит (они не markdown links, а inline-code), но они замусоривают grep-based dead-code / dead-link аудиты и заставляют будущие сессии читать historical noise.

### 1.5 Что остаётся as-is
- `flow-sidecar-types.ts`, `FlowSidecarDocument`, `FlowSidecarLayoutParams`, `FlowSidecarViewport`, `applyFlowSidecarPositions`, `buildFlowSidecarDocument`, `parseFlowSidecar`, `applyFlowSidecarLayoutParams` — все эти имена отсылают к sidecar файлу `module-map.flow.json` (расширение `.flow.json` — product contract, не React Flow). Keep.

## 2. Decision

Две независимые под-задачи в рамках одной Phase 3:

### 3A — Projection naming cleanup
- Rename adapter файлов с `*react-flow*` → `*projection*`.
- Rename types с `Diagram*Flow*` → `Diagram*Projection*`.
- Rename функции `domainModelToReactFlow()` → `domainModelToProjection()`.
- Обновить все импортёры.
- Чисто косметика: 0 functional changes.

### 3B — Archive compression
- `zip -r Archive.zip Archive/` внутри `doc/SolidWorks-WorkFlow/Plans/` и `doc/TODO/`.
- `git rm -r Archive/` (файлы уходят из рабочего дерева; git history blob'ы сохраняются).
- Добавить `Archive.README.md` в оба места с инструкцией распаковки.
- Update `Docs_Index.md` — заменить отдельные bullets на Plans/Archive/*.md одной ссылкой на `Archive.zip`.
- Никакого impact на `check:links` (все live ссылки указывают на active SSOT, не на архив).

## 3. Scope

### In scope
- 7 файлов под rename в `adapters/`.
- 8 типов под rename в `domain-model-to-react-flow.types.ts`.
- 1 функция под rename.
- Все импортёры (предварительно обнаружено 10 файлов через grep).
- 2 zip операции + 2 placeholder README + 1 docs-index update.

### Out of scope
- Release build: чисто internal refactor + docs, нет user-visible changes, `1.1.922` остаётся current release.
- Rename sidecar-related naming (`flow-sidecar-types.ts`, `FlowSidecarDocument`, и т.д.) — они отсылают к real sidecar file `module-map.flow.json`, не к React Flow.
- Удаление архивных файлов из git history — они остаются доступны через `git log --all` / `git show`.
- Cross-session рефакторинги, не связанные с projection naming.

## 4. Affected surfaces

### 4.1 Renames (source/test files via `git mv`)
```
adapters/domain-model-to-react-flow.ts                         → domain-model-to-projection.ts
adapters/domain-model-to-react-flow.types.ts                   → domain-model-to-projection.types.ts
adapters/module-stage-react-flow.ts                            → module-stage-projection.ts
adapters/domain-model-to-react-flow.test.ts                    → domain-model-to-projection.test.ts
adapters/domain-model-to-react-flow.product-parts.test.ts      → domain-model-to-projection.product-parts.test.ts
adapters/domain-model-to-react-flow.external-boundary.test.ts  → domain-model-to-projection.external-boundary.test.ts
adapters/domain-model-to-react-flow.standalone-band.test.ts    → domain-model-to-projection.standalone-band.test.ts
```

### 4.2 Importers (обновление пути + имена типов/функции)
```
src/client/project-manager/components/diagram-editor/
  detached-diagram-view.tsx
  diagram-editor-facade.tsx
  diagram-editor-shell.tsx
  diagram-modules-progressive-model.ts
  diagram-stage-panel-scaffold.tsx
  flow-sidecar-types.ts
  flow-sidecar-types.test.ts
  use-diagram-loader.ts
  use-diagram-persistence.ts
```

### 4.3 Type renames inside `*.types.ts`
```
DiagramFlowStage        → DiagramProjectionStage
DiagramFlowNodeType     → DiagramProjectionNodeType
DiagramFlowNodeData     → DiagramProjectionNodeData
DiagramFlowNode         → DiagramProjectionNode
DiagramFlowProjection   → DiagramProjection
ProductPartFlowNodeData → ProductPartProjectionNodeData
ClusterFlowNodeData     → ClusterProjectionNodeData
ModuleFlowNodeData      → ModuleProjectionNodeData
```

### 4.4 Function rename inside `*.ts`
```
domainModelToReactFlow() → domainModelToProjection()
```

### 4.5 Archive compression surfaces
- `doc/SolidWorks-WorkFlow/Plans/Archive/` (76 файлов, ~828K) → `Plans/Archive.zip`
- `doc/TODO/Archive/` (20 файлов, ~888K) → `TODO/Archive.zip`
- Два новых `Archive.README.md` файла (один в `Plans/`, один в `TODO/`).
- `doc/SolidWorks-WorkFlow/Docs_Index.md` — секция Plans/Archive сжимается до одной ссылки на zip.

## 5. Implementation contract

### 5.1 Rename strategy

Стандартная политика ≤3 файлов per commit (AGENTS.md §4) **не применима** к file/type rename, где любое разбиение либо ломает компиляцию на промежуточных коммитах, либо требует временных compat re-exports, создающих больше мусора, чем сам rename экономит. Для 3A допустим **один атомарный commit**, покрывающий:

1. `git mv` всех 7 файлов в `adapters/`.
2. Замена всех type names (`DiagramFlow*` → `DiagramProjection*`) в всех файлах, где они встречаются.
3. Замена function name (`domainModelToReactFlow` → `domainModelToProjection`).
4. Обновление import paths во всех импортёрах.

Это будет один большой коммит (~16–17 файлов), но **атомарный и обратимый** (`git revert`). Код компилируется и тесты зелёные до и после. Husky gates (architecture, lint, knip, format) должны пройти — они проверяют размеры/качество, а не количество файлов.

### 5.2 Archive compression strategy

1. `zip -r -q Plans/Archive.zip Plans/Archive/` (внутри `doc/SolidWorks-WorkFlow/`)
2. `git rm -r doc/SolidWorks-WorkFlow/Plans/Archive/`
3. `git add doc/SolidWorks-WorkFlow/Plans/Archive.zip`
4. Создать `doc/SolidWorks-WorkFlow/Plans/Archive.README.md` с инструкцией распаковки.
5. Аналогично для `doc/TODO/Archive/` → `doc/TODO/Archive.zip` + `doc/TODO/Archive.README.md`.
6. Update `Docs_Index.md`: убрать individual `Plans/Archive/*.md` bullets (15+ строк) и заменить одним pointer-bullet на zip.

Zip файлы должны оставаться git-tracked (бинарный blob), но не распаковываться в рабочее дерево. `check:links` продолжит работать: в active docs нет ссылок на архивные файлы, а zip-файл сам по себе не содержит markdown.

## 6. Acceptance criteria

### 6.1 После 3A
1. `grep -rn "react-flow\|DiagramFlowNode\|DiagramFlowProjection\|domainModelToReactFlow" src/ packages/` возвращает 0 matches (кроме `node_modules/` и `dist/`).
2. `npm run typecheck:webview` зелёный.
3. `npm run check:knip` зелёный — 0 unused exports.
4. `npm run lint` зелёный.
5. `npx tsx --test src/client/project-manager/components/diagram-editor/flow-sidecar-types.test.ts` — все 17 тестов проходят.
6. `adapters/` содержит файлы только с `projection` в имени, ни одного `react-flow`.

### 6.2 После 3B
1. `ls doc/SolidWorks-WorkFlow/Plans/Archive/` возвращает `No such file or directory`.
2. `ls doc/SolidWorks-WorkFlow/Plans/Archive.zip` существует, `Archive.README.md` рядом.
3. То же для `doc/TODO/Archive/`.
4. `npm run check:links` зелёный (179+ файлов проверены).
5. `Docs_Index.md` не содержит индивидуальных bullets на Plans/Archive/*.md, только pointer на zip.
6. Unzipping `Plans/Archive.zip` в temp директорию возвращает исходные 76 файлов.

## 7. Open risks

- **Atomic rename commit нарушает ≤3 правило** — оправдано как industry-standard rename best practice. Альтернативы (compat re-exports, поэтапная миграция через alias'ы) создают больше churn.
- **Zip-архивация vs. git history** — файлы уходят из worktree, но git blobs сохраняются навсегда. Это намеренно: будущие сессии смогут `git show` любой архивный файл по hash.
- **`check:dup` noise** — jscpd раньше не сканировал архивные markdown (docs вообще), но если сканирует — после zip noise должен только уменьшиться.
- **Cross-session ссылки из session reports** — старые `doc/Sessions/Session0XX.md` могут ссылаться на архивные пути как inline code. После zip эти ссылки становятся нечитаемыми без распаковки, но они и не были читаемыми в грепе архивов. Не блокирует.

## 8. Rollback

Если rename провалится (unlikely):
- `git revert <rename-commit>` вернёт всё.

Если zip окажется неудобным в практике:
- `cd doc/SolidWorks-WorkFlow/Plans && unzip -q Archive.zip && git rm Archive.zip Archive.README.md && git add Archive/` вернёт директорию.
