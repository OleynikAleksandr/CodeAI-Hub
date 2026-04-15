# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Localization_TranslationEngine_AnthropicHaiku_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/Localization_TranslationEngine_AnthropicHaiku_Architecture.md`
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

## Phase 1 — Claude provider-owned translation service (owner: Claude, updated: 2026-04-15)

### Stream: Translator instruction
1. [DONE] Добавить category-aware builder для Haiku translator instruction; scope: `packages/Claude_Module/src/translation/claude-haiku-translator-instruction.ts`, `packages/Claude_Module/src/translation/claude-haiku-translator-instruction.test.ts`; expected commit message: `feat: add claude haiku translator instruction builder`
2. [IN_PROGRESS] Git Commit: `feat: add claude haiku translator instruction builder` (hash: TBD)

### Stream: Claude Haiku translation service
3. [TODO] Реализовать provider-owned `claude-haiku-translation-service` с reuse `SDKInstaller` / `SDKAuthManager` и one-shot query profile (`tools: []`, `maxTurns: 1`, `persistSession: false`); scope: `packages/Claude_Module/src/translation/claude-haiku-translation-service.ts`, `packages/Claude_Module/src/translation/claude-haiku-translation-service.test.ts`, `packages/Claude_Module/src/index.ts`; expected commit message: `feat: add claude haiku translation service`
4. [TODO] Git Commit: `feat: add claude haiku translation service` (hash: TBD)

## Phase 2 — Shared translation composition (owner: Claude, updated: 2026-04-15)

### Stream: Default engine factory extraction
5. [TODO] Вынести reusable factory/default built-in engine construction path из shared translation facade; scope: `packages/translation/src/default-translation-engine-factory.ts`, `packages/translation/src/translation-facade.ts`, `packages/translation/src/index.ts`; expected commit message: `refactor: extract default translation engine factory`
6. [TODO] Git Commit: `refactor: extract default translation engine factory` (hash: TBD)

### Stream: Core Claude Haiku engine wiring
7. [TODO] Добавить Core-обёртку для provider-owned Claude Haiku engine и общую factory для Core translation facade; scope: `packages/core/src/translation/claude-haiku-translation-engine.ts`, `packages/core/src/translation/core-translation-facade-factory.ts`, `packages/core/src/index.ts`; expected commit message: `feat: wire claude haiku translation engine in core`
8. [TODO] Git Commit: `feat: wire claude haiku translation engine in core` (hash: TBD)

### Stream: Session translation migration
9. [TODO] Перевести `SessionTranslationFacade` на Core-owned translation factory и покрыть путь инъекции тестом; scope: `packages/core/src/session-translation/session-translation-facade.ts`, `packages/core/src/session-translation/session-translation-facade.test.ts`; expected commit message: `refactor: route session translation through core factory`
10. [TODO] Git Commit: `refactor: route session translation through core factory` (hash: TBD)

### Stream: Engine profile registry
11. [TODO] Зарегистрировать chunk profile для `anthropic-claude-haiku-4-5` и обновить facade tests для нового engine catalog; scope: `packages/translation/src/translation-engine-profile-registry.ts`, `packages/translation/src/translation-facade.test.ts`; expected commit message: `feat: register claude haiku translation profile`
12. [TODO] Git Commit: `feat: register claude haiku translation profile` (hash: TBD)

## Phase 3 — Core-owned localization runtime path (owner: Claude, updated: 2026-04-15)

### Stream: Localization injection path
13. [TODO] Открыть public injection path для custom translation facade в localization facade; scope: `packages/localization/src/localization-contract.ts`, `packages/localization/src/localization-facade.ts`, `packages/localization/src/index.ts`; expected commit message: `refactor: expose localization translation facade injection`
14. [TODO] Git Commit: `refactor: expose localization translation facade injection` (hash: TBD)

### Stream: Core localization factory
15. [TODO] Собрать Core-owned localization facade factory с Haiku-aware translation path и подключить его в Core bridge handlers; scope: `packages/core/src/translation/core-localization-facade-factory.ts`, `packages/core/src/remote-bridge/handlers/settings-request-handler.ts`, `packages/core/src/remote-bridge/handlers/localization-bootstrap-http-handler.ts`; expected commit message: `feat: route localization runtime through core facade`
16. [TODO] Git Commit: `feat: route localization runtime through core facade` (hash: TBD)

### Stream: Extension host bridge migration
17. [TODO] Перевести extension-host localization runtime на Core-backed payload/bootstrap path без локального Haiku materialization; scope: `src/extension-module/settings/localization-runtime-service.ts`, `src/extension-module/message-handlers/settings-message-handler.ts`, `src/extension-module/home-view-provider.ts`; expected commit message: `refactor: consume core-backed localization runtime`
18. [TODO] Git Commit: `refactor: consume core-backed localization runtime` (hash: TBD)

## Phase 4 — UI and localization catalog exposure (owner: Claude, updated: 2026-04-15)

### Stream: Settings UI exposure
19. [TODO] Показать новый engine в Settings и добавить canonical English label в approved source dictionary; scope: `src/client/ui/src/components/settings/use-settings-state-support.ts`, `src/client/ui/src/components/settings/localization-settings-card.tsx`, `assets/localization/source/en/ui_labels.json`; expected commit message: `feat: expose claude haiku localization engine in settings`
20. [TODO] Git Commit: `feat: expose claude haiku localization engine in settings` (hash: TBD)

### Stream: Language catalog support
21. [TODO] Добавить новый engine в localization language catalog и покрыть materializer/runtime тестом; scope: `packages/localization/src/language-catalog.ts`, `packages/localization/src/localization-materializer.test.ts`; expected commit message: `feat: add claude haiku localization language catalog`
22. [TODO] Git Commit: `feat: add claude haiku localization language catalog` (hash: TBD)

## Phase 5 — SSOT sync and validation prep (owner: Claude, updated: 2026-04-15)

### Stream: Module SSOT updates
23. [TODO] Синхронизировать модульные SSOT-доки под provider-owned Claude Haiku translation path; scope: `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`, `doc/SolidWorks-WorkFlow/Modules/Localization.md`, `doc/SolidWorks-WorkFlow/Modules/Claude.md`; expected commit message: `docs: document claude haiku translation modules`
24. [TODO] Git Commit: `docs: document claude haiku translation modules` (hash: TBD)

### Stream: System SSOT updates
25. [TODO] Обновить системный SSOT и индекс документации для активного Haiku translation scope; scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit message: `docs: update architecture index for haiku translation`
26. [TODO] Git Commit: `docs: update architecture index for haiku translation` (hash: TBD)

## Phase 6 — Release build for user validation (owner: Claude, updated: 2026-04-15)

### Stream: Release notes preparation
27. [TODO] Перед release batch обновить будущую версию в user-facing release docs; scope: `README.md`, `CHANGELOG.md`; expected commit message: `docs: prepare haiku translation release notes`
28. [TODO] Git Commit: `docs: prepare haiku translation release notes` (hash: TBD)

### Stream: Script-managed release batch
29. [TODO] На чистом дереве выполнить `./scripts/build-all.sh` и зафиксировать script-managed version bump / provider bundles / release manifests; scope: root version manifests, provider bundle outputs, `doc/tmp/releases/` artifacts; expected commit message: `chore: build haiku translation release`
30. [TODO] Git Commit: `chore: build haiku translation release` (hash: TBD)

### Stream: Final packaging and release handoff
31. [TODO] Выполнить `./scripts/build-release.sh --use-current-version`, проверить `codeai-hub-<version>.vsix` и оформить финальный release session report для пользовательских тестов; scope: root VSIX artifact, `doc/tmp/releases/`, `doc/Sessions/SessionXXX.md`; expected commit message: `docs: record haiku translation release handoff`
32. [TODO] Git Commit: `docs: record haiku translation release handoff` (hash: TBD)
