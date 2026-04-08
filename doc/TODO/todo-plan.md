# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/DiagramModules_MeasuredOwnershipReflow_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`
  - `doc/SolidWorks-WorkFlow/System/Diagram_UserFacing_Layout_And_Format_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/DiagramModules_MeasuredOwnershipReflow_Architecture.md`
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
- **Release stream обязателен**: в конце плана всегда идёт новый релизный прогон `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`.

## Phase 0 — Scope Opening And Planning Baseline (owner: Oleksandr + Codex, updated: 2026-04-08)

### Stream: Planning Scope Opening
1. [DONE] Зафиксировать новый corrective scope для measured-first ownership reflow в planning/navigation docs и открыть active execution baseline; scope: `doc/SolidWorks-WorkFlow/Plans/DiagramModules_MeasuredOwnershipReflow_Architecture.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `docs(plan): open measured ownership reflow scope`
2. [DONE] Git Commit: `docs(plan): open measured ownership reflow scope` (hash: `fde825ff4`)

## Phase 1 — Ownership Measurement Contract (owner: Oleksandr + Codex, updated: 2026-04-08)

### Stream: Ownership Header DOM Hooks
1. [DONE] Расширить measured node contract ownership boundary-метрикой и добавить DOM hooks в renderer/bridge для сбора реального `bodyStartY` из ownership header; scope: `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.types.ts`, `src/client/project-manager/components/diagram-editor/diagram-editor-facade.tsx`, `src/client/project-manager/components/diagram-editor/diagram-editor-measured-layout-bridge.tsx`; ожидаемый commit message: `fix(diagram): collect measured ownership header boundaries`
2. [DONE] Git Commit: `fix(diagram): collect measured ownership header boundaries` (hash: `3acacde1e`)

### Stream: Measurement Contract Regression Evidence
1. [DONE] Обновить source-level regression coverage для ownership renderer и measurement bridge contract, чтобы новый measured ownership header path нельзя было потерять без тестового падения; scope: `src/client/project-manager/components/diagram-editor/diagram-editor-ownership-renderer.test.tsx`, `src/client/project-manager/components/diagram-editor/diagram-editor-facade.test.tsx`; ожидаемый commit message: `test(diagram): cover measured ownership measurement contract`
2. [DONE] Git Commit: `test(diagram): cover measured ownership measurement contract` (hash: `3dc4fb952`)

## Phase 2 — Measured-First Ownership Reflow (owner: Oleksandr + Codex, updated: 2026-04-08)

### Stream: Reflow Core
1. [DONE] Перестроить measured layout pass как bottom-up ownership reflow от реальных `Module` heights и measured `bodyStartY`, чтобы `Cluster` и `Product Part` вычислялись из finalized children, а не из guessed heights; scope: `src/client/project-manager/components/diagram-editor/diagram-editor-measured-layout-normalizer.ts`, `src/client/project-manager/components/diagram-editor/diagram-editor-measured-layout-normalizer.test.ts`, `src/client/project-manager/components/diagram-editor/diagram-editor-shell.tsx`; ожидаемый commit message: `fix(diagram): rebuild ownership layout from measured children`
2. [DONE] Git Commit: `fix(diagram): rebuild ownership layout from measured children` (hash: `89c5646d9`)

### Stream: Shell Snapshot And Runtime Evidence
1. [DONE] Синхронизировать shell snapshot contract и таргетную runtime verification wave для measured-first ownership reflow; scope: `src/client/project-manager/components/diagram-editor/diagram-editor-shell.test.ts`, `doc/SolidWorks-WorkFlow/System/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `docs(diagram): record measured ownership reflow evidence`
2. [DONE] Git Commit: `docs(diagram): record measured ownership reflow evidence` (hash: `b91990cc0`)

## Phase 3 — Sidecar Invalidation And Release Preparation (owner: Oleksandr + Codex, updated: 2026-04-08)

### Stream: Flow Sidecar Metric Bump
1. [DONE] Повысить layout metric version для `module-map.flow.json`, чтобы stale geometry from `1.1.908` не применялась поверх measured-first ownership reflow; scope: `src/client/project-manager/components/diagram-editor/flow-sidecar-types.ts`, `src/client/project-manager/components/diagram-editor/flow-sidecar-types.test.ts`; ожидаемый commit message: `fix(diagram): invalidate stale sidecars for ownership reflow`
2. [DONE] Git Commit: `fix(diagram): invalidate stale sidecars for ownership reflow` (hash: `ef2292297`)

### Stream: Release Preparation
1. [DONE] Подготовить release-facing документацию и closeout tracking для measured ownership reflow release; scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `docs(release): prepare measured ownership reflow release`
2. [DONE] Git Commit: `docs(release): prepare measured ownership reflow release` (hash: `7a7401713`)

## Phase 4 — Release Build And Closeout (owner: Oleksandr + Codex, updated: 2026-04-08)

### Stream: Release Build
1. [DONE] Запустить `./scripts/build-all.sh`, принять version/manifest bump для следующего релиза и подготовить чистое дерево под финальную упаковку; scope: `package.json`, `package-lock.json`, `assets/*/manifest.json`, `packages/*/package.json`; ожидаемый commit message: `build(release): capture measured ownership reflow version bump`
2. [DONE] Git Commit: `build(release): capture measured ownership reflow version bump` (hash: `8940d10ca`)
3. [DONE] Запустить `./scripts/build-release.sh --use-current-version`, проверить VSIX/tarball outputs и подготовить release-closeout для measured ownership reflow scope; scope: `release artifacts`, `doc/tmp/releases/`, `release packaging outputs`; ожидаемый commit message: `build(release): package measured ownership reflow release`
4. [TODO] Git Commit: `build(release): package measured ownership reflow release` (hash: TBD)

### Stream: Planning Doc Closeout
1. [TODO] Перенести завершённый measured ownership reflow planning-doc в archive, обновить `Docs_Index.md` и перевести `todo-plan.md` на архивный planning source; scope: `doc/SolidWorks-WorkFlow/Plans/DiagramModules_MeasuredOwnershipReflow_Architecture.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `docs(closeout): archive measured ownership reflow planning docs`
2. [TODO] Git Commit: `docs(closeout): archive measured ownership reflow planning docs` (hash: TBD)

### Stream: Execution Plan Closeout
1. [TODO] Перенести завершённый execution plan в `doc/TODO/Archive/` и оставить активный path пустым до нового scope; scope: `doc/TODO/todo-plan.md`, `doc/TODO/Archive/todo-plan-phase4-measured-ownership-reflow.md`; ожидаемый commit message: `docs(closeout): archive measured ownership reflow execution plan`
2. [TODO] Git Commit: `docs(closeout): archive measured ownership reflow execution plan` (hash: TBD)
