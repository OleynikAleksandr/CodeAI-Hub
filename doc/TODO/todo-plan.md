# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/DiagramModules_Autolayout_HeightMetrics_And_SidecarFingerprint_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`
  - `doc/SolidWorks-WorkFlow/System/Diagram_UserFacing_Layout_And_Format_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/DiagramModules_Autolayout_HeightMetrics_And_SidecarFingerprint_Architecture.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стримов), в каждом Stream — подзадачи.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Если фактический scope подзадачи выходит за предел `≤3` файлов, Stream нужно сразу переписать на более мелкие шаги.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** выполняем вручную только когда нужно проверить затронутый пакет/клиент, и обязательно перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`.
- **Commit**: после зелёных гейтов — Git Commit с максимально релевантным описанием (код + доки) и немедленным апдейтом этого файла.
- **Real-time Документация**: если меняется accepted layout contract или sidecar contract, связанные `doc/`-документы обновляются в том же execution cycle.
- **Phase завершается на чистом дереве**: release stream в конце плана обязателен.

## Phase 0 — Scope Opening And Planning Baseline (owner: Oleksandr + Codex, updated: 2026-04-08)

### Stream: Planning Scope Opening
1. [DONE] Зафиксировать новый corrective scope в planning/navigation docs и открыть execution baseline для текущего цикла; scope: `doc/SolidWorks-WorkFlow/Plans/DiagramModules_Autolayout_HeightMetrics_And_SidecarFingerprint_Architecture.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `docs(plan): open diagram autolayout boundary fix scope`
2. [DONE] Git Commit: `docs(plan): open diagram autolayout boundary fix scope` (hash: `2b44d6626`)

## Phase 1 — Initial Layout Metric Hardening (owner: Oleksandr + Codex, updated: 2026-04-08)

### Stream: Height Budget Contract
1. [DONE] Пересчитать height budget для `Product Part` / `Cluster` / `Module`, исправить budget для purpose text и зафиксировать стабильные header/body boundaries без overlap; при необходимости синхронизировать fallout assertion для shortest-column standalone wrap; scope: `src/client/project-manager/components/diagram-editor/adapters/module-stage-react-flow.ts`, `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.standalone-band.test.ts`; ожидаемый commit message: `fix(diagram): harden initial layout height metrics`
2. [DONE] Git Commit: `fix(diagram): harden initial layout height metrics` (hash: `a9cd3d261`)

### Stream: Flow Sidecar Fingerprint
1. [DONE] Добавить layout metric fingerprint в schema/apply-path `module-map.flow.json`, чтобы legacy geometry не применялась после изменения визуальной метрики; scope: `src/client/project-manager/components/diagram-editor/flow-sidecar-types.ts`, `src/client/project-manager/components/diagram-editor/flow-sidecar-types.test.ts`; ожидаемый commit message: `fix(diagram): invalidate stale flow sidecars after metric changes`
2. [DONE] Git Commit: `fix(diagram): invalidate stale flow sidecars after metric changes` (hash: `765c2ae3d`)

## Phase 2 — Dense Regression Evidence And Docs Sync (owner: Oleksandr + Codex, updated: 2026-04-08)

### Stream: Dense Localized Regression Coverage
1. [DONE] Добавить regression fixtures для локализованного dense cluster stack и standalone bottom boundary, воспроизводящие пользовательский сценарий без налезаний; scope: `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.standalone-band.test.ts`, `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.product-parts.test.ts`; ожидаемый commit message: `test(diagram): cover localized autolayout boundaries`
2. [DONE] Git Commit: `test(diagram): cover localized autolayout boundaries` (hash: `25cf7a41a`)

### Stream: Verification Fallout And SSOT Sync
1. [DONE] Прогнать таргетную verification wave для PM diagram surface, устранить возможный fallout и синхронизировать accepted layout contract/evidence в активных документах; scope: `src/client/project-manager/components/diagram-editor/adapters/module-stage-react-flow.ts`, `doc/SolidWorks-WorkFlow/System/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `docs(diagram): record verified autolayout boundary fix`
2. [DONE] Git Commit: `docs(diagram): record verified autolayout boundary fix` (hash: `cb8572cae`)

## Phase 3 — Release Build And Session Closeout (owner: Oleksandr + Codex, updated: 2026-04-08)

### Stream: Release Preparation
1. [DONE] Подготовить release-facing документацию и closeout tracking перед финальной сборкой этого scope; scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `docs(release): prepare diagram autolayout fix release`
2. [DONE] Git Commit: `docs(release): prepare diagram autolayout fix release` (hash: `56fff330b`)

### Stream: Release Build
1. [DONE] Запустить `./scripts/build-all.sh`, принять version/manifest bump для релиза `1.1.907` и подготовить чистое дерево под финальную упаковку; scope: `package.json`, `package-lock.json`, `assets/*/manifest.json`, `packages/*/package.json`; ожидаемый commit message: `build(release): capture diagram autolayout fix version bump`
2. [TODO] Git Commit: `build(release): capture diagram autolayout fix version bump` (hash: TBD)
3. [TODO] Запустить `./scripts/build-release.sh --use-current-version`, проверить VSIX/tarball outputs и подготовить release-closeout для этого scope; scope: `release artifacts`, `doc/tmp/releases/`, `release packaging outputs`; ожидаемый commit message: `build(release): package diagram autolayout boundary fix release`
4. [TODO] Git Commit: `build(release): package diagram autolayout boundary fix release` (hash: TBD)

## Phase 4 — Planning And Execution Closeout (owner: Oleksandr + Codex, updated: 2026-04-08)

### Stream: Planning Doc Closeout
1. [TODO] Перенести завершённый corrective planning-док в archive и синхронизировать `Docs_Index.md` после успешной release packaging; scope: `doc/SolidWorks-WorkFlow/Plans/DiagramModules_Autolayout_HeightMetrics_And_SidecarFingerprint_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/Archive/`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; ожидаемый commit message: `docs(closeout): archive diagram autolayout planning docs`
2. [TODO] Git Commit: `docs(closeout): archive diagram autolayout planning docs` (hash: TBD)

### Stream: Execution Plan Closeout
1. [TODO] Обновить `doc/TODO/todo-plan.md`, перенести завершённый execution plan в `doc/TODO/Archive/` и оставить активный path пустым до нового scope; scope: `doc/TODO/todo-plan.md`, `doc/TODO/Archive/todo-plan-phase4-diagram-modules-autolayout-boundary-fix.md`; ожидаемый commit message: `docs(closeout): archive diagram autolayout execution plan`
2. [TODO] Git Commit: `docs(closeout): archive diagram autolayout execution plan` (hash: TBD)
