# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Localization_Settings_RestartHydration_Architecture.md`
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

## Phase 1 — Localization translation recovery scope reset (owner: Codex, updated: 2026-04-14)
### Stream: Scope bootstrap
1. [DONE] Зафиксировать новый bugfix scope для restart hydration mismatch между persisted localization settings и Settings UI — scope: `doc/SolidWorks-WorkFlow/Plans/Localization_Settings_RestartHydration_Architecture.md`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `docs: start localization settings hydration scope`
2. [DONE] Git Commit: `docs: start localization settings hydration scope` (hash: `ac96e719a`)

### Stream: Plan realignment
3. [DONE] Переформатировать active scope вокруг blocking localization sync, запрета Project Manager launch во время sync, отключения chunking для интерфейсной локализации и dynamic timeout/retry policy — scope: `doc/SolidWorks-WorkFlow/Plans/Localization_Settings_RestartHydration_Architecture.md`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `docs: realign localization recovery plan`
4. [DONE] Git Commit: `docs: realign localization recovery plan` (hash: `dfccc3137`)

## Phase 2 — Blocking localization sync implementation (owner: Codex, updated: 2026-04-14)
### Stream: Save-path synchronization gate
5. [DONE] Добавить blocking localization sync contract после `Save Changes`, busy-state в Settings UI и host/webview acknowledgement вместо fire-and-forget save — scope: `src/extension-module/message-handlers/settings-message-handler.ts`, `src/client/ui/src/components/settings/use-settings-state.ts`, `src/client/ui/src/components/settings-view.tsx`; ожидаемый commit message: `feat: add blocking localization sync gate`
6. [DONE] Git Commit: `feat: add blocking localization sync gate` (hash: `fc5fe45a7`)

### Stream: Project Manager launch lock
7. [DONE] Заблокировать запуск Project Manager и новых translation-triggering flows, пока localization sync не завершён — scope: `src/extension-module/message-handlers/settings-message-handler.ts`, `src/client/project-manager/api.ts`, `src/client/project-manager/components/layout/main-area-panel-content.tsx`; ожидаемый commit message: `feat: block project manager during localization sync`
8. [DONE] Git Commit: `feat: block project manager during localization sync` (hash: `b28f50171`)

## Phase 3 — Interface localization reliability (owner: Codex, updated: 2026-04-14)
### Stream: Interface translation execution policy
9. [DONE] Убрать chunking из interface/bootstrap localization path и перевести materialization на крупные batched requests с акцентом на completeness, а не latency — scope: `packages/localization/src/localization-materializer.ts`, `packages/localization/src/localization-materializer.test.ts`; ожидаемый commit message: `feat: disable chunking for interface localization`
10. [DONE] Git Commit: `feat: disable chunking for interface localization` (hash: `fa1897694`)

11. [DONE] Добавить dynamic timeout и automatic retry policy для localization bundle translation; timeout использовать только как watchdog against hangs — scope: `packages/localization/src/localization-materializer.ts`, `packages/localization/src/localization-materializer.test.ts`; ожидаемый commit message: `feat: add resilient localization translation retries`
12. [DONE] Git Commit: `feat: add resilient localization translation retries` (hash: `17d788417`)

### Stream: Deterministic bundle completion
13. [DONE] Ввести deterministic category priority (`ui_helper_text` → `messages_for_the_user` → `artifacts_for_the_user` → `ui_labels` → `workflow_terms`) и strict sync-ready completion gate без partial fallback acceptance — scope: `packages/localization/src/localization-facade.ts`, `src/extension-module/settings/localization-runtime-service.ts`, `src/extension-module/message-handlers/settings-message-handler.ts`; ожидаемый commit message: `feat: prioritize required localization bundles`
14. [DONE] Git Commit: `feat: prioritize required localization bundles` (hash: `65f308114`)

## Phase 4 — Live translation stabilization and residual bug triage (owner: Codex, updated: 2026-04-14)
### Stream: Session translation queue
15. [DONE] Добавить queue/concurrency limit для live session translation и запретить ей конкурировать с initial localization sync — scope: `packages/core/src/session-translation/session-translation-facade.ts`, `packages/core/src/session-translation/session-translation-policy-resolver.ts`, `packages/core/src/session-translation/session-translation-dispatcher.ts`; ожидаемый commit message: `feat: serialize live session translation`
16. [DONE] Git Commit: `feat: serialize live session translation` (hash: `f8a3ca464`)

### Stream: Residual regression triage
17. [DONE] Повторно проверить и чинить restart hydration / runtime model label drift только после стабилизации translation path, если баги сохранятся — scope: `src/client/ui/src/components/settings/localization-settings-card.tsx`, `src/client/project-manager/components/sessions/use-runtime-model-sync.ts`; ожидаемый commit message: `fix: resolve remaining localization sync regressions`
18. [DONE] Git Commit: `fix: resolve remaining localization sync regressions` (hash: `2bfe0ae85`)

## Phase 5 — Documentation and release (owner: Codex, updated: 2026-04-14)
### Stream: Documentation sync and targeted verification
19. [DONE] Синхронизировать SSOT и зафиксировать targeted verification после recovery implementation — scope: `doc/TODO/todo-plan.md`, `doc/SolidWorks-WorkFlow/Modules/Localization.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; ожидаемый commit message: `docs: record localization recovery contract`
20. [DONE] Git Commit: `docs: record localization recovery contract` (hash: `cacabd88e`)

### Stream: Release preparation
21. [DONE] Обновить release-facing docs на будущую версию до запуска release scripts — scope: `README.md`, `CHANGELOG.md`, связанные архитектурные документы `doc/`; ожидаемый commit message: `docs: prepare localization recovery release notes`
22. [DONE] Git Commit: `docs: prepare localization recovery release notes` (hash: `297739656`)

### Stream: Release build
23. [IN_PROGRESS] Выполнить release checklist, собрать новый VSIX и свежие runtime artifacts только после зелёных verification streams — scope: `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`, `doc/tmp/releases/`; ожидаемый commit message: `build: prepare localization recovery release artifacts`
24. [TODO] Git Commit: `build: prepare localization recovery release artifacts` (hash: TBD)
