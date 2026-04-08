# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/DiagramModules_MeasuredAutolayout_MinGap_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`
  - `doc/SolidWorks-WorkFlow/System/Diagram_UserFacing_Layout_And_Format_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/DiagramModules_MeasuredAutolayout_MinGap_Architecture.md`
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
1. [DONE] Зафиксировать новый corrective scope для measured autolayout min-gap enforcement в planning/navigation docs и открыть active execution baseline; scope: `doc/SolidWorks-WorkFlow/Plans/DiagramModules_MeasuredAutolayout_MinGap_Architecture.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `docs(plan): open measured diagram gap enforcement scope`
2. [DONE] Git Commit: `docs(plan): open measured diagram gap enforcement scope` (hash: `27a2bd089`)

## Phase 1 — Measured Layout Normalization (owner: Oleksandr + Codex, updated: 2026-04-08)

### Stream: Measured Gap Normalizer Core
1. [DONE] Добавить pure measured-layout normalizer с hard `MIN_SAFE_GAP = 4px` и расширить node typing для measured width/height, чтобы controlled React Flow state мог работать по реальным box sizes; scope: `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.types.ts`, `src/client/project-manager/components/diagram-editor/diagram-editor-measured-layout-normalizer.ts`, `src/client/project-manager/components/diagram-editor/diagram-editor-measured-layout-normalizer.test.ts`; ожидаемый commit message: `fix(diagram): add measured gap normalizer`
2. [DONE] Git Commit: `fix(diagram): add measured gap normalizer` (hash: `e7f2957f4`)

### Stream: React Flow Measurement Bridge
1. [DONE] Считать фактические размеры узлов после first render через React Flow hooks и прокинуть measured layout callback в shell без возврата к старым auto-layout controls; scope: `src/client/project-manager/components/diagram-editor/diagram-editor-measured-layout-bridge.tsx`, `src/client/project-manager/components/diagram-editor/diagram-editor-facade.tsx`, `src/client/project-manager/components/diagram-editor/diagram-editor-facade.test.tsx`; ожидаемый commit message: `fix(diagram): bridge measured node sizes from react flow`
2. [DONE] Git Commit: `fix(diagram): bridge measured node sizes from react flow` (hash: `1dc79f914`)

### Stream: Shell Measured Normalization Apply
1. [DONE] Применить measured normalization pass в `diagram-editor-shell.tsx`, чтобы first-open layout автоматически перепаковывался по фактическим box sizes ещё до ручного drag workflow; scope: `src/client/project-manager/components/diagram-editor/diagram-editor-shell.tsx`, `src/client/project-manager/components/diagram-editor/diagram-editor-shell.test.ts`; ожидаемый commit message: `fix(diagram): normalize measured diagram layout in shell`
2. [DONE] Git Commit: `fix(diagram): normalize measured diagram layout in shell` (hash: `14badd074`)

## Phase 2 — Sidecar Invalidation And Regression Evidence (owner: Oleksandr + Codex, updated: 2026-04-08)

### Stream: Flow Sidecar Metric Bump
1. [DONE] Повысить layout metric version для `module-map.flow.json`, чтобы pre-measured geometry не применялась поверх нового measured contract; scope: `src/client/project-manager/components/diagram-editor/flow-sidecar-types.ts`, `src/client/project-manager/components/diagram-editor/flow-sidecar-types.test.ts`; ожидаемый commit message: `fix(diagram): invalidate stale sidecars for measured layout`
2. [DONE] Git Commit: `fix(diagram): invalidate stale sidecars for measured layout` (hash: `f3140441f`)

### Stream: Verification Evidence And SSOT Sync
1. [DONE] Прогнать таргетную verification wave для нового measured gap contract и синхронизировать accepted docs/evidence; scope: `doc/SolidWorks-WorkFlow/System/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `docs(diagram): record measured min-gap autolayout fix`
2. [DONE] Git Commit: `docs(diagram): record measured min-gap autolayout fix` (hash: `3b093e234`)

## Phase 3 — Release Build And Session Closeout (owner: Oleksandr + Codex, updated: 2026-04-08)

### Stream: Release Preparation
1. [DONE] Подготовить release-facing документацию и closeout tracking для measured min-gap fix release; scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `docs(release): prepare measured diagram gap fix release`
2. [DONE] Git Commit: `docs(release): prepare measured diagram gap fix release` (hash: `52c88127a`)

### Stream: Release Build
1. [DONE] Запустить `./scripts/build-all.sh`, принять version/manifest bump для следующего релиза и подготовить чистое дерево под финальную упаковку; scope: `package.json`, `package-lock.json`, `assets/*/manifest.json`, `packages/*/package.json`; ожидаемый commit message: `build(release): capture measured diagram gap fix version bump`
2. [DONE] Git Commit: `build(release): capture measured diagram gap fix version bump` (hash: `d0f0574ce`)
3. [DONE] Запустить `./scripts/build-release.sh --use-current-version`, проверить VSIX/tarball outputs и подготовить release-closeout для measured gap scope; scope: `release artifacts`, `doc/tmp/releases/`, `release packaging outputs`; ожидаемый commit message: `build(release): package measured diagram gap fix release`
4. [DONE] Git Commit: `build(release): package measured diagram gap fix release` (hash: `aef93540b`)

## Phase 4 — Planning And Execution Closeout (owner: Oleksandr + Codex, updated: 2026-04-08)

### Stream: Closeout Plan Re-Slicing
1. [DONE] Переписать post-release closeout на отдельные микрозадачи `≤3 файлов`, чтобы archive/update шаги не перескакивали обязательные commit-points и real-time tracking в `todo-plan.md`; scope: `doc/TODO/todo-plan.md`; ожидаемый commit message: `docs(plan): split measured gap release closeout steps`
2. [DONE] Git Commit: `docs(plan): split measured gap release closeout steps` (hash: `8c959cc58`)

### Stream: Planning Doc Closeout
1. [DONE] Перенести завершённый measured-gap planning-doc в archive, обновить `Docs_Index.md` и перевести `todo-plan.md` на архивный planning source; scope: `doc/SolidWorks-WorkFlow/Plans/DiagramModules_MeasuredAutolayout_MinGap_Architecture.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `docs(closeout): archive measured diagram gap planning docs`
2. [TODO] Git Commit: `docs(closeout): archive measured diagram gap planning docs` (hash: TBD)

### Stream: Execution Plan Closeout
1. [TODO] Перенести завершённый execution plan в `doc/TODO/Archive/` и оставить активный path пустым до нового scope; scope: `doc/TODO/todo-plan.md`, `doc/TODO/Archive/todo-plan-phase4-measured-diagram-gap-fix.md`; ожидаемый commit message: `docs(closeout): archive measured diagram gap execution plan`
2. [TODO] Git Commit: `docs(closeout): archive measured diagram gap execution plan` (hash: TBD)
