# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/HaikuTranslation_PostReleaseBugfixes_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/HaikuTranslation_PostReleaseBugfixes_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Localization_TranslationEngine_AnthropicHaiku_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
  - `doc/SolidWorks-WorkFlow/Modules/Localization.md`
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждая подзадача должна затрагивать не более 3 файлов или 3 явно ограниченных script-managed scope buckets.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Если по факту задача начинает затрагивать больше 3 файлов, она должна быть немедленно дроблена, а этот файл переписан до продолжения работы.
- После каждого коммита сразу обновлять `doc/TODO/todo-plan.md`: статус, дата, hash.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** выполнять вручную перед закрытием затронутого Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`
- **Real-time документация:** любое изменение архитектуры/логики должно попасть в релевантные SSOT-доки в том же execution cycle и до финального release-stream.
- Финальный release-stream выполняется только на чистом дереве: сначала `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`.

## Phase 1 — Runtime wiring and fail-closed engine resolution (owner: Claude, updated: 2026-04-15)

### Stream: Live Haiku service injection
1. [DONE] Подключить provider-owned `claudeHaikuTranslationService` в live session translation path Core через lazy getter на `ClaudeProviderAdapter`; scope: `packages/Claude_Module/src/provider/claude-provider-adapter.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core.test.ts`; expected commit message: `fix: wire haiku service into live session translation`
2. [DONE] Git Commit: `fix: wire haiku service into live session translation` (hash: `cfd8d5343`)

### Stream: Reject silent engine substitution
3. [DONE] Убрать silent fallback на default engine при explicit `anthropic-claude-haiku-4-5` и покрыть это regression tests; scope: `packages/translation/src/translation-engine-registry.ts`, `packages/translation/src/translation-facade.ts`, `packages/translation/src/translation-facade.test.ts`; expected commit message: `fix: prevent silent translation engine fallback`
4. [DONE] Git Commit: `fix: prevent silent translation engine fallback` (hash: `a036a48d5`)

## Phase 2 — Core-owned localization repair (owner: Claude, updated: 2026-04-15)

### Stream: Core localization Haiku wiring
5. [DONE] Подключить provider-owned Haiku service в Core localization facade и bootstrap handlers; scope: `packages/core/src/translation/core-localization-facade-factory.ts`, `packages/core/src/remote-bridge/handlers/settings-request-handler.ts`, `packages/core/src/remote-bridge/handlers/localization-bootstrap-http-handler.ts`; expected commit message: `fix: wire haiku service into core localization`
6. [DONE] Git Commit: `fix: wire haiku service into core localization` (hash: `bf7078ad0`)

### Stream: Remove extension-side downgrade
7. [DONE] Сделать Core localization bootstrap endpoint authoritative для Haiku: строить strict snapshot из текущего `settings.json`, а не читать только persisted cache; scope: `packages/core/src/remote-bridge/handlers/settings-request-handler.ts`, `packages/core/src/remote-bridge/handlers/localization-bootstrap-http-handler.ts`, `packages/core/src/remote-bridge/handlers/http-api-router.ts`; expected commit message: `fix: rebuild localization bootstrap via core`
8. [DONE] Git Commit: `fix: rebuild localization bootstrap via core` (hash: `679688421`)

### Stream: Extension uses Core-backed Haiku localization
9. [DONE] Перевести extension-side bootstrap/save для core-only Haiku engine на Core-backed bootstrap path и убрать локальный `resolveRuntimePayload()` downgrade; scope: `src/extension-module/settings/localization-runtime-service.ts`, `src/extension-module/home-view-provider.ts`; expected commit message: `fix: restore core-owned haiku localization sync`
10. [DONE] Git Commit: `fix: restore core-owned haiku localization sync` (hash: `ca0a55809`)

### Stream: Category regression coverage
11. [DONE] Добавить regression coverage для сценария `uiLabels=en`, `user_guidance/system_feedback/artifacts=ru`, чтобы helper/help copy не оставалась silently source-English; scope: `packages/localization/src/localization-materializer.test.ts`, `packages/core/src/translation/core-localization-facade-factory.test.ts`; expected commit message: `test: cover haiku localization category routing`
12. [DONE] Git Commit: `test: cover haiku localization category routing` (hash: `6d61ed161`)

## Phase 3 — Persistence and diagnostics (owner: Claude, updated: 2026-04-15)

### Stream: Native JSONL persistence
13. [DONE] Отменить `persistSession: false` для Haiku translation slug и обновить service-level tests под native Claude JSONL persistence; scope: `packages/Claude_Module/src/translation/claude-haiku-translation-service.ts`, `packages/Claude_Module/src/translation/claude-haiku-translation-service.test.ts`; expected commit message: `fix: persist haiku translation jsonl traces`
14. [TODO] Git Commit: `fix: persist haiku translation jsonl traces` (hash: TBD)

### Stream: Runtime diagnostics hardening
15. [TODO] Усилить diagnostics так, чтобы requested/resolved engine mismatch и provider-owned execution metadata были явно видны в логах и тестах; scope: `packages/core/src/session-translation/session-translation-facade.ts`, `packages/core/src/session-translation/session-translation-facade.test.ts`, `packages/core/src/translation/claude-haiku-translation-engine.ts`; expected commit message: `fix: add haiku translation runtime diagnostics`
16. [TODO] Git Commit: `fix: add haiku translation runtime diagnostics` (hash: TBD)

## Phase 4 — SSOT synchronization (owner: Claude, updated: 2026-04-15)

### Stream: Module SSOT updates
17. [TODO] Синхронизировать модульные SSOT-доки под fail-fast localization path и новую persistence policy; scope: `doc/SolidWorks-WorkFlow/Modules/Claude.md`, `doc/SolidWorks-WorkFlow/Modules/Localization.md`, `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`; expected commit message: `docs: sync haiku bugfix module ssot`
18. [TODO] Git Commit: `docs: sync haiku bugfix module ssot` (hash: TBD)

### Stream: System SSOT updates
19. [TODO] Обновить системный SSOT и индекс навигации под post-release Haiku bugfix scope; scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit message: `docs: update haiku bugfix architecture index`
20. [TODO] Git Commit: `docs: update haiku bugfix architecture index` (hash: TBD)

## Phase 5 — Release build for retest (owner: Claude, updated: 2026-04-15)

### Stream: Release notes preparation
21. [TODO] Подготовить user-facing release notes под bugfix release после `1.1.986`; scope: `README.md`, `CHANGELOG.md`; expected commit message: `docs: prepare haiku bugfix release notes`
22. [TODO] Git Commit: `docs: prepare haiku bugfix release notes` (hash: TBD)

### Stream: Script-managed release batch
23. [TODO] На чистом дереве выполнить `./scripts/build-all.sh` и зафиксировать version bump / provider bundles / release manifests для bugfix релиза; scope: root version manifests, provider bundle outputs, `doc/tmp/releases/` artifacts; expected commit message: `chore: build haiku bugfix release`
24. [TODO] Git Commit: `chore: build haiku bugfix release` (hash: TBD)

### Stream: Final packaging and retest handoff
25. [TODO] Выполнить `./scripts/build-release.sh --use-current-version`, проверить новый VSIX и оформить release handoff для повторного пользовательского теста; scope: root VSIX artifact, `doc/tmp/releases/`, `doc/Sessions/SessionXXX.md`; expected commit message: `docs: record haiku bugfix release handoff`
26. [TODO] Git Commit: `docs: record haiku bugfix release handoff` (hash: TBD)
