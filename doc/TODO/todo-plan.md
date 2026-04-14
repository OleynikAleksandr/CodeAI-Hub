# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Localization_InterfaceBatching_And_PMBlankScreen_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Localization.md`
  - `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стрим), в каждом Stream — микро-задачи.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Если по факту разработки задача требует больше 3 файлов, её нужно разбить и переписать Stream до начала правок.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** выполняем вручную только когда нужно проверить затронутый пакет/клиент, и обязательно перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`.
- **Commit**: после зелёных гейтов — Git Commit с максимально релевантным описанием (код + доки) и немедленный апдейт `todo-plan.md` (статус + hash).
- **Real-time Документация**: любое изменение архитектуры/логики требует синхронного обновления `todo-plan.md` и релевантной документации `doc/` до коммита.

## Phase 1 — Post-release scope bootstrap (owner: Codex, updated: 2026-04-14)
### Stream: Scope reset
1. [DONE] Зафиксировать новый post-release hotfix scope для bundle-level interface localization batching и PM blank-screen recovery — scope: `doc/SolidWorks-WorkFlow/Plans/Localization_InterfaceBatching_And_PMBlankScreen_Architecture.md`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `docs: start localization batching hotfix scope`
2. [DONE] Git Commit: `docs: start localization batching hotfix scope` (hash: `81338ff36`)

## Phase 2 — Project Manager blank-screen recovery (owner: Codex, updated: 2026-04-14)
### Stream: Busy-state render safety
3. [DONE] Убрать hook-order violation в PM main-area blocking path, чтобы busy -> ready transition не ронял renderer после localization sync — scope: `src/client/project-manager/components/layout/main-area-panel-content.tsx`, targeted test under `src/client/project-manager/components/layout/`; ожидаемый commit message: `fix: prevent project manager blank screen after localization sync`
4. [DONE] Git Commit: `fix: prevent project manager blank screen after localization sync` (hash: `f628cdf61`)

## Phase 3 — Interface localization performance recovery (owner: Codex, updated: 2026-04-14)
### Stream: Bundle-level localization batching
5. [DONE] Перевести interface localization с per-entry translation на structured bundle-level batch requests без semantic chunk planner — scope: `packages/localization/src/localization-materializer.ts`, `packages/localization/src/localization-materializer.test.ts`, один translation helper при необходимости; ожидаемый commit message: `feat: batch interface localization bundles`
6. [DONE] Git Commit: `feat: batch interface localization bundles` (hash: `27cb566e1`)

### Stream: Codex translation runtime warm bootstrap
7. [IN_PROGRESS] Убрать повторный plugin bootstrap в temp Codex translation runtime через reuse provider-home artifacts — scope: `packages/translation/src/codex-translation-runtime-home-facade.ts`, optional translation test, `doc/TODO/todo-plan.md`; ожидаемый commit message: `perf: reuse codex translation runtime bootstrap artifacts`
8. [TODO] Git Commit: `perf: reuse codex translation runtime bootstrap artifacts` (hash: TBD)

## Phase 4 — Documentation sync and verification (owner: Codex, updated: 2026-04-14)
### Stream: SSOT and targeted checks
9. [TODO] Синхронизировать SSOT по bundle-level interface batching и PM blocked-state safety, затем зафиксировать targeted verification — scope: `doc/SolidWorks-WorkFlow/Modules/Localization.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `docs: record localization batching hotfix contract`
10. [TODO] Git Commit: `docs: record localization batching hotfix contract` (hash: TBD)
