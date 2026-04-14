# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Universal_ChunkedTranslation_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
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

## Phase 1 — Universal chunked translation bootstrap (owner: Codex, updated: 2026-04-14)
### Stream: Scope activation
1. [DONE] Закрыть предыдущий diagnostic planning scope и утвердить `Universal_ChunkedTranslation_Architecture.md` как новый planning source — scope: `doc/SolidWorks-WorkFlow/Plans/Archive.zip`, `doc/SolidWorks-WorkFlow/Plans/Codex_ThinkingTranslation_Diagnostics_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/Universal_ChunkedTranslation_Architecture.md`; ожидаемый commit message: `docs: approve universal chunked translation scope`
2. [DONE] Git Commit: `docs: approve universal chunked translation scope` (hash: `b02e1e358`)
3. [DONE] Архивировать завершённый diagnostic `todo-plan`, открыть tracked active-path для TODO-документов и оформить новый active execution plan для universal chunked translation — scope: `.gitignore`, `doc/TODO/Archive.zip`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `docs: activate universal chunked translation plan`
4. [DONE] Git Commit: `docs: activate universal chunked translation plan` (hash: `4a1d2dbb7`)

### Stream: Shared translation foundation
5. [DONE] Добавить engine-specific chunk policy contract и registry для shared translation boundary — scope: `packages/translation/src/translation-contract.ts`, `packages/translation/src/translation-request-normalizer.ts`, `packages/translation/src/translation-engine-profile-registry.ts`; ожидаемый commit message: `feat: add translation chunk policy profiles`
6. [DONE] Git Commit: `feat: add translation chunk policy profiles` (hash: `750d21b4b`)
7. [DONE] Реализовать safe chunk boundary resolver / planner и подключить per-chunk execution path в `TranslationFacade` — scope: `packages/translation/src/translation-chunk-boundary-resolver.ts`, `packages/translation/src/translation-chunk-planner.ts`, `packages/translation/src/translation-facade.ts`; ожидаемый commit message: `feat: add translation chunk planner primitives`
8. [DONE] Git Commit: `feat: add translation chunk planner primitives` (hash: `664bcb6aa`)
9. [DONE] Синхронизировать SSOT shared runtime translation module и system-level invariants с новым chunked translation contract — scope: `doc/TODO/todo-plan.md`, `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; ожидаемый commit message: `docs: sync chunked translation module contract`
10. [DONE] Git Commit: `docs: sync chunked translation module contract` (hash: `2ae7f8ec4`)

## Phase 2 — Consumer integration and diagnostics (owner: Codex, updated: 2026-04-14)
### Stream: Core live translation path
11. [DONE] Протянуть chunk-level diagnostics в session translation overlay path без изменения transcript contract — scope: `packages/translation/src/translation-facade.ts`, `packages/core/src/session-translation/session-translation-facade.ts`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `chore: trace chunked session translation`
12. [DONE] Git Commit: `chore: trace chunked session translation` (hash: `83f68bc2a`)

### Stream: Localization materialization
13. [DONE] Подключить `LocalizationMaterializer` к shared chunked translation policy и обновить module docs — scope: `packages/localization/src/localization-materializer.ts`, `doc/SolidWorks-WorkFlow/Modules/Localization.md`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `feat: apply chunked translation to localization materializer`
14. [DONE] Git Commit: `feat: apply chunked translation to localization materializer` (hash: `eeb05c000`)

## Phase 3 — Verification and regression coverage (owner: Codex, updated: 2026-04-14)
### Stream: Translation package coverage
15. [TODO] Добавить unit coverage для chunk planning и per-chunk fallback assembly — scope: `packages/translation/src/translation-chunk-planner.test.ts`, `packages/translation/src/translation-facade.test.ts`, `packages/translation/src/translation-chunk-boundary-resolver.test.ts`; ожидаемый commit message: `test: cover chunked translation planning`
16. [DONE] Git Commit: `test: cover chunked translation planning` (hash: `a37698af0`)
17. [DONE] Выполнить таргетные сборки `@codeai-hub/translation`, `@codeai-hub/localization`, `@codeai-hub/core` и зафиксировать результаты verification wave в документации текущего scope — scope: `doc/TODO/todo-plan.md`, `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`, `doc/SolidWorks-WorkFlow/Modules/Localization.md`; ожидаемый commit message: `docs: record chunked translation verification`
18. [TODO] Git Commit: `docs: record chunked translation verification` (hash: TBD)

## Phase 4 — Release packaging and closeout (owner: Codex, updated: 2026-04-14)
### Stream: Release prep
19. [TODO] Подготовить release notes для следующего релиза и обновить активный `todo-plan` под release closeout — scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `docs: prepare chunked translation release notes`
20. [TODO] Git Commit: `docs: prepare chunked translation release notes` (hash: TBD)
21. [TODO] Выполнить `./scripts/build-all.sh`, поднять версии и зафиксировать runtime manifests / package versions — scope: `package.json`, `package-lock.json`, `assets/*/manifest.json`, `packages/*/package.json`; ожидаемый commit message: `build: prepare chunked translation runtime artifacts`
22. [TODO] Git Commit: `build: prepare chunked translation runtime artifacts` (hash: TBD)
23. [TODO] Выполнить `./scripts/build-release.sh --use-current-version`, проверить VSIX/tarballs и завершить execution cycle архивированием planning/todo документов, обновлением индекса и session report — scope: `doc/TODO/todo-plan.md`, `doc/Sessions/Session012.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; ожидаемый commit message: `docs(archive): close chunked translation execution cycle`
24. [TODO] Git Commit: `docs(archive): close chunked translation execution cycle` (hash: TBD)
