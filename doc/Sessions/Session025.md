# Session 025 — Sidecar v2 + Docs Cleanup + Projection Rename + Release 1.1.923

**Date:** 2026-04-09 15:40 (CEST)
**Branch:** main
**Version:** 1.1.923
**Execution Scope Status:** COMPLETED

---

# 1. Work Done in This Session

Сессия разрослась на три последовательных Phase в рамках одного execution cycle, завершившись двумя релизами (`1.1.922` как основной и `1.1.923` как internal hygiene bump).

## Phase 1 — Sidecar v2 Persisted Layout Params (release 1.1.922)

### Scope discovery and planning
- Восстановлен контекст предыдущей сессии (`Session024`, React Flow removal / release `1.1.921`).
- Прочитаны базовые SSOT (`System/SystemArchitecture.md` §6.2/§6.4, `Clusters/Project_Manager.md` §3, `Docs_Index.md`, `Plans/README.md`).
- Верифицировано чтением кода, что три declarative CSS Grid layout params (`ProductPart.columns`, `ProductPart.targetAspectRatio`, `Cluster.moduleColumns`) хранились только в `useState` внутри `DiagramEditorShell` и терялись при любом `projection.revision` bump / reload / BroadcastChannel sidecar-sync.
- Создан planning-doc `doc/SolidWorks-WorkFlow/Plans/DiagramModules_Sidecar_v2_LayoutParams_Architecture.md`. Старый закрытый `todo-plan.md` перенесён в `doc/TODO/Archive/` (позже весь Archive сжат в Phase 3), создан новый по AGENTS.md §4 шаблону.

### Sidecar v2 schema + parser (Stream 1)
- `FlowSidecarDocument` расширен до `version: 1 | 2` с опциональной секцией `layoutParams`.
- `parseFlowSidecar` принимает обе версии; enum guards на `columns`/`targetAspectRatio`/`moduleColumns`; invalid entries дропаются entry-by-entry.
- `buildFlowSidecarDocument` сериализует `version: 2`, собирает `layoutParams` из nodes, ключи отсортированы для стабильного diff.
- 11 unit-тестов в `flow-sidecar-types.test.ts`.

### Load path (Stream 2)
- `applyFlowSidecarLayoutParams({ nodes, document })` merge productPart + cluster params в `DiagramFlowNode.data.layoutParams` без мутаций.
- Интегрирована в `diagram-modules-progressive-model.ts` read-path.
- 6 новых unit-тестов; всего 17 в файле.

### Persist path (Stream 3)
- Три context-menu handler'а в `diagram-editor-shell.tsx` после `setNodes(next)` вызывают `onNodesChange?.(next)`.
- Fallback `pendingLayoutParamEditsRef` не потребовался — load path возвращает nodes с override'ами поверх projection defaults.
- Shell regression test на три handler'а + `useEffect` prefer `initialNodes`.

### SSOT + release docs (Stream 4)
- `SystemArchitecture.md` §6.2/§6.4 переписаны под CSS Grid + sidecar v2.
- `Clusters/Project_Manager.md` §3 — тот же sync.
- `README.md`: Current Release → v1.1.922. `CHANGELOG.md`: `[1.1.922]` entry с documented downgrade caveat.

### Release 1.1.922 (Stream 5)
- `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version` прошли.
- Итог: `codeai-hub-1.1.922.vsix`, 2.0 M, 1789 файлов.

## Phase 2 — doc/SolidWorks-WorkFlow Documentation Cleanup

Пока пользователь тестировал 1.1.922, провёл полный аудит документации тремя параллельными агентами (System+Plans / Clusters+Modules / Contracts). Аудит выявил устаревшие React Flow references в active SSOT, compat-redirect stubs в `Contracts/` вместо `Plans/Archive/`, draft документы в `System/` вопреки `Plans/README.md §3`, structural asymmetry между провайдерскими модулями и неверные пути в `Modules/Claude.md`.

### Cleanup actions
- **Stream 2.1** — Fix React Flow references в `Contracts/FacadeClassDiagram_DesignAndMaintenance.md` и `Contracts/Workflow_CLI.md`.
- **Stream 2.2** — Archive historical diagram docs из `System/` → `Plans/Archive/` (3 файла): `Diagram_Modules_ReviewStep_And_Autolayout`, `Diagram_UserFacing_Layout_And_Format`, `Diagram_Modules_StepByStep_Workflow_And_UX_Refactor`.
- **Stream 2.3** — Archive `Contracts/Diagram_Modules_ProductPart_Hierarchy_DSL_Architecture.md` → `Plans/Archive/` (целиком построен на React Flow projection pipeline).
- **Streams 2.4 + 2.5** — Delete dead compat-redirect stubs from `Contracts/` (3 + 2 файла, все dead pointers).
- **Stream 2.6** — Archive `System/Greenfield_Architecture_Polygon.md` → `Plans/Archive/` (status «Draft»).
- **Stream 2.7** — Fix `Modules/Claude.md` usage-limits paths (`packages/core/src/provider-usage-limits/providers/claude/…`). Добавлены matching pointers в Codex/Gemini для симметрии.
- **Stream 2.8** — Update `Docs_Index.md` под Phase 2 moves.

### Итог Phase 2
- Удалено 5 dead-pointer compat stubs.
- Архивировано 5 документов.
- Исправлены 3 active SSOT документа.
- `Contracts/` очищен от compat stubs; `System/` содержит только approved SSOT.

## Phase 3 — Projection Naming Cleanup + Archive Compression + Release 1.1.923

После Phase 2 запустил dead-code/dead-links аудит двумя параллельными агентами. Active surface 100% чистый, но выявлено два accumulated issues: (1) `adapters/` папка всё ещё именована вокруг React Flow (cosmetic tech debt); (2) архивные директории содержат ~62 stale inline-refs, замусоривающих grep-based аудиты. Пользователь одобрил оба sub-scope плюс запросил релизную сборку по окончании.

### Projection naming cleanup (Stream 3A — atomic rename)
**Hash `afa7711bb`** — 16 файлов в одном атомарном commit. Justified deviation from ≤3 правила: любое поэтапное разбиение (compat re-exports, staged alias миграция) создаёт больше церемонии, чем сам rename.

**Rename map:**
- Files: `domain-model-to-react-flow.ts*` (6 файлов) + `module-stage-react-flow.ts` → `domain-model-to-projection.ts*` + `module-stage-projection.ts`
- Types: `DiagramFlowStage`, `DiagramFlowNodeType`, `DiagramFlowNodeData`, `DiagramFlowNode`, `DiagramFlowProjection`, `ProductPartFlowNodeData`, `ClusterFlowNodeData`, `ModuleFlowNodeData` → `Diagram*Projection*`
- Function: `domainModelToReactFlow()` → `domainModelToProjection()`
- Residual JSDoc/comments в `module-stage-projection.ts` и `diagram-editor-facade.tsx`

**Preserved on purpose:** `flow-sidecar-types.ts`, `FlowSidecarDocument`, `FlowSidecarLayoutParams`, `FlowSidecarViewport`, `parseFlowSidecar`, `buildFlowSidecarDocument`, `applyFlowSidecarPositions`, `applyFlowSidecarLayoutParams` — все отсылают к on-disk `module-map.flow.json`, не к React Flow.

**Verification:** `grep -rn "react-flow\|DiagramFlowNode\|domainModelToReactFlow" src/` → 0 matches. Typecheck ✅, knip ✅, 36 diagram-editor tests зелёные.

### Archive compression (Stream 3B)
- **`95ba9267e`** — `Plans/Archive/` (77 файлов) → `Plans/Archive.zip` (256 K) + `Plans/Archive.README.md`. Git commit: 78 files changed, 14361 deletions.
- **`3a58f6421`** — `TODO/Archive/` (19 файлов) → `TODO/Archive.zip` (732 K) + `TODO/Archive.README.md`. Git commit: 21 files changed, 1189 deletions.
- **`2a38f4efe`** — `Docs_Index.md` обновлён: ~28 individual bullets заменены одним pointer'ом. `check:links` 87 файлов (от 179), все зелёные.
- Git history сохранена для всех архивных файлов (`git log --all --follow` продолжает работать).
- Оба `Archive.README.md` содержат инструкции по извлечению и процедуру будущей архивации (unzip → add → rm zip → re-zip).

### Release 1.1.923 (Stream 3C)

Обоснование релиза: Stream 3A изменил исходный код (projection rename попадает в webview bundle → VSIX). Без release build пользовательский VSIX остаётся на `1.1.922` и не содержит переименованные файлы. Archive compression и Phase 2 cleanup — чисто worktree hygiene, в runtime не попадают. Release framed honestly как internal hygiene bump без user-visible behavior changes.

- **`63f20c5d5`** — Sync `README.md` и `CHANGELOG.md` под 1.1.923. Current Release переключён с honest "internal hygiene" descriptor. `CHANGELOG.md` получил `[1.1.923]` entry под Changed + явную "Not changed" секцию. `SystemArchitecture.md` и `Clusters/Project_Manager.md` не трогали — контракт диаграммы не менялся.
- **`a05161bea`** — `./scripts/build-all.sh` прошёл: launcher `1.1.923` пересобран, versions bumped во всех 16 manifest'ах (package.json + lock + 6 assets + 8 packages). Tarball'ы в `~/.codeai-hub/releases/` и `doc/tmp/releases/` (`claude-module-1.1.923.tar.bz2`, `codex-module-1.1.923.tar.bz2`, `gemini-module-1.1.923.tar.bz2`, `codeai-hub-core-darwin-arm64-1.1.923.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.1.923.tar.bz2`, `vscode-webview-1.1.923.tar.bz2`, `project-manager-1.1.923.tar.bz2`).
- **`./scripts/build-release.sh --use-current-version`** — `Step 7: Verifying SDK exclusions ✅`, `Removing dev dependencies ✅`, `✅ Package created`, VSIX runtime surface verified, dev dependencies restored. Итог: **`codeai-hub-1.1.923.vsix`, 2.0 M, 1789 файлов**.
- **`e31e246b7`** — финальное закрытие todo-plan с release hashes.
- Smoke verify оставлен пользователю (регрессионная проверка: диаграмма открывается, right-click layout params работают, sidecar v2 persist сохранился — ничего не должно измениться относительно 1.1.922).

## Git commits
(REFERENCE ONLY: этот список сохраняется для исторической трассировки и расследования регрессий; следующая сессия не обязана читать все коммиты по умолчанию.)

### Phase 1 — Sidecar v2 (release 1.1.922) — 15 commits
- `900dac358 docs(plan): open Sidecar v2 persisted layout params execution scope`
- `3055fb78b feat(diagram): extend FlowSidecarDocument type with layoutParams (v2)`
- `b08563758 feat(diagram): parse sidecar v2 layoutParams with enum guards`
- `ee261d71c feat(diagram): serialize sidecar v2 layoutParams with sorted keys`
- `3a86514ea test(diagram): cover sidecar v1/v2 parse, serialize, backwards compat`
- `676a3b6f5 feat(diagram): apply sidecar v2 layoutParams on diagram load`
- `5ead42d5b test(diagram): cover applyFlowSidecarLayoutParams merge cases`
- `d8b582561 feat(diagram): persist context-menu layout params via onNodesChange`
- `e510c19bf test(diagram): shell preserves layout params across projection rebuild`
- `6f314a561 docs(ssot): sync SystemArchitecture §6.2/§6.4 with CSS Grid + sidecar v2`
- `2ddcc3c47 docs(ssot): sync Project_Manager §3 with CSS Grid diagram contract`
- `496916803 docs: update README and CHANGELOG for 1.1.922 release`
- `44e36c906 docs(todo): mark Sidecar v2 streams 1–4 complete with commit hashes`
- `63ded1ead build(release): bump version to 1.1.922`
- `7f65d8222 docs(todo): close Sidecar v2 release stream — 1.1.922 packaged`

### Phase 2 — Documentation Cleanup — 12 commits
- `eceaa4750 docs(plan): open Phase 2 documentation cleanup scope`
- `1871d1657 docs(ssot): drop React Flow/minimap references in FacadeClassDiagram and Workflow_CLI`
- `bc8484181 docs(archive): move Diagram_Modules_ReviewStep_And_Autolayout historical trace to Plans/Archive`
- `f56720b94 docs(archive): move Diagram_UserFacing_Layout_And_Format discussion baseline to Plans/Archive`
- `c97d3e0d6 docs(archive): move Diagram_Modules_StepByStep UX refactor plan to Plans/Archive`
- `03e121081 docs(archive): move Diagram_Modules_ProductPart_Hierarchy_DSL React Flow plan to Plans/Archive`
- `75450880d docs(cleanup): remove dead compat-redirect stubs from Contracts/ (batch 1)`
- `2efd8aae0 docs(cleanup): remove dead compat-redirect stubs from Contracts/ (batch 2)`
- `f8d48eed7 docs(archive): move Greenfield_Architecture_Polygon draft to Plans/Archive`
- `2923bd1de docs(modules): align Claude/Codex/Gemini usage-limits paths and structure`
- `2e7be06ca docs: sync Docs_Index with Phase 2 documentation cleanup moves`
- `128d61499 docs(todo): close Phase 2 documentation cleanup streams with commit hashes`

### Phase 3 — Projection Rename + Archive Zip + Release 1.1.923 — 10 commits
- `2f0808c0d docs(plan): open Phase 3 projection naming cleanup + archive compression scope`
- `afa7711bb refactor(diagram): rename react-flow adapter naming to projection`
- `95ba9267e docs(archive): compress Plans/Archive directory into Archive.zip`
- `3a58f6421 docs(archive): compress TODO/Archive directory into Archive.zip`
- `2a38f4efe docs: point Docs_Index at Plans/Archive.zip after compression`
- `b7a944721 docs(todo): close Phase 3 projection rename + archive compression streams`
- `58b3a3e88 docs(plan): add Stream 3C release build 1.1.923 to Phase 3`
- `63f20c5d5 docs: update README and CHANGELOG for 1.1.923 release`
- `a05161bea build(release): bump version to 1.1.923`
- `e31e246b7 docs(todo): close Phase 3 release stream — 1.1.923 packaged`

**Всего 37 коммитов Session025, все gates зелёные на каждом.**

## Artifacts

- **VSIX 1.1.922**: `codeai-hub-1.1.922.vsix` (2.0 M, 1789 файлов) — основной релиз с Sidecar v2.
- **VSIX 1.1.923**: `codeai-hub-1.1.923.vsix` (2.0 M, 1789 файлов) — internal hygiene bump с projection rename.
- **Plans/Archive.zip** (256 K, 77 историчных planning docs) + **TODO/Archive.zip** (732 K, 19 историчных todo-plans).
- **Tarball'ы** `1.1.922` и `1.1.923` в `~/.codeai-hub/releases/` и `doc/tmp/releases/`.

---

# 2. Instructions for Next Session

**Base SSOT:** `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
**Scope Discovery Index:** `doc/SolidWorks-WorkFlow/Docs_Index.md`

## Plans for next session
- Активный execution scope отсутствует.
- Следующий агент обязан сначала прочитать `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` как базовый SSOT.
- Затем согласовать с пользователем новый scope.
- После этого открыть `doc/SolidWorks-WorkFlow/Docs_Index.md`, выбрать релевантные документы для нового scope и только потом формировать новый planning-doc.
- До появления нового planning-doc и нового `doc/TODO/todo-plan.md` навигационной опорой служит `doc/SolidWorks-WorkFlow/Docs_Index.md`.

## Pending phase closeout (нужно сделать при старте следующего scope)
Процедура архивации описана в `Archive.README.md` обоих директорий (unzip → mv → rm zip → re-zip → commit). При старте нового scope:

1. **Архивировать текущий `doc/TODO/todo-plan.md`** (все три Phase DONE) в `TODO/Archive.zip` как `todo-plan-phase1-2-3-sidecar-v2-docs-cleanup-projection-rename.md`.
2. **Архивировать оба completed planning-doc'а** в `Plans/Archive.zip`:
   - `Plans/DiagramModules_Sidecar_v2_LayoutParams_Architecture.md` (Phase 1)
   - `Plans/DiagramModules_Projection_Naming_And_Archive_Compression_Architecture.md` (Phase 3)
3. **Создать новый пустой `doc/TODO/todo-plan.md`** для следующего scope.
4. **Обновить `Docs_Index.md`** — убрать bullets на архивируемые planning docs.

## Possible next scopes
1. **Smoke verify follow-up по 1.1.923** — если пользователь обнаружит регрессию от projection rename или edge case в sidecar v2, выпустить patch release.
2. **Standalone modules grid grouping intelligence** — более умная группировка standalone модулей в grid.
3. **External modules rendering** — визуальная обработка для `kind: "external"`.
4. **`Contracts/Diagram_Workflow_CompositePrompt_…_Architecture.md`** — проверить статус «Proposed follow-up after user retest of release `1.1.769`».
5. **`Clusters/CoreOrchestrator.md`** — наполнить до SSOT (сейчас 39 строк, обрывается на «Канон:»).
6. **Unified provider thinking/reasoning contract** — вынести дублирующиеся invariants из `Modules/Claude.md`, `Codex.md`, `Gemini.md` в общий `Contracts/Provider_Thinking_And_Reasoning_Display_Contract.md`.
