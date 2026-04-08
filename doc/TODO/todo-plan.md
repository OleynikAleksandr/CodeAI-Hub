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
1. [IN_PROGRESS] Добавить regression fixtures для локализованного dense cluster stack и standalone bottom boundary, воспроизводящие пользовательский сценарий без налезаний; scope: `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.standalone-band.test.ts`, `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.product-parts.test.ts`; ожидаемый commit message: `test(diagram): cover localized autolayout boundaries`
2. [TODO] Git Commit: `test(diagram): cover localized autolayout boundaries` (hash: TBD)

### Stream: Verification Fallout And SSOT Sync
1. [TODO] Прогнать таргетную verification wave для PM diagram surface, устранить возможный fallout и синхронизировать accepted layout contract/evidence в активных документах; scope: `src/client/project-manager/components/diagram-editor/adapters/module-stage-react-flow.ts`, `doc/SolidWorks-WorkFlow/System/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `docs(diagram): record verified autolayout boundary fix`
2. [TODO] Git Commit: `docs(diagram): record verified autolayout boundary fix` (hash: TBD)

## Phase 3 — Release Build And Session Closeout (owner: Oleksandr + Codex, updated: 2026-04-08)

### Stream: Release Preparation
1. [TODO] Подготовить release-facing документацию и closeout tracking перед финальной сборкой этого scope; scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `docs(release): prepare diagram autolayout fix release`
2. [TODO] Git Commit: `docs(release): prepare diagram autolayout fix release` (hash: TBD)

### Stream: Release Build
1. [TODO] Запустить `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`, перенести свежие артефакты в `doc/tmp/releases/` и зафиксировать release результаты в `doc/Sessions/Session013.md`; scope: `release manifests/version artifacts`, `doc/tmp/releases/`, `doc/Sessions/Session013.md`; ожидаемый commit message: `build(release): package diagram autolayout boundary fix release`
2. [TODO] Git Commit: `build(release): package diagram autolayout boundary fix release` (hash: TBD)
