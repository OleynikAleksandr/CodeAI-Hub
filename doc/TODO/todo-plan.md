# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/StageConfirmationCard_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md`
  - `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionIdUsageBar.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
  - `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое колличество - Stream (стрим), в каждом Стриме - некоторое кол-во подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Если по факту разработки оказывается, что конкретная подзазача Stream затрагивает больше 3 файлов - такая задача должна быть разбита на более мелкие и список задач в Стриме переписывается.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** выполняем вручную только когда нужно проверить затронутый пакет/клиент, и обязательно перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`.
- **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт `todo-plan.md` (дата, статус, хеш).
- **Real-time Документация**: любое изменение архитектуры/логики требует синхронного обновления `todo-plan.md` и связанных документов из `doc/` до коммита.
- **Phase release**: финальный стрим обязан следовать `Release Build Checklist` из `AGENTS.md`.

## Phase 1 — Provider Override Start Path (owner: Codex, updated: 2026-04-13)
### Stream: Execution Bootstrap
1. [DONE] Зафиксировать active execution cycle по accepted planning-doc и обновить навигацию scope — scope: `doc/TODO/todo-plan.md`, `doc/SolidWorks-WorkFlow/Plans/StageConfirmationCard_Architecture.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; ожидаемый commit message: `docs: start stage confirmation provider override cycle`
2. [DONE] Git Commit: `docs: start stage confirmation provider override cycle` (hash: `c261ada82`)

### Stream: Previous Step Provider Resolver
3. [DONE] Реализовать stage-aware inheritance для previous trunk provider и connected fallback — scope: `src/client/project-manager/services/workflow-provider-resolver.ts`, `src/client/project-manager/services/workflow-provider-resolver.test.ts`; ожидаемый commit message: `fix: inherit previous trunk provider for step start`
4. [TODO] Git Commit: `fix: inherit previous trunk provider for step start` (hash: TBD)

### Stream: Confirmation Card Selector
5. [TODO] Добавить inline provider selector и явный provider forwarding в start path confirmation card — scope: `src/client/project-manager/components/shared/stage-confirmation-card.tsx`, `src/client/project-manager/components/shared/stage-confirmation-card.test.ts`; ожидаемый commit message: `feat: add provider override to stage confirmation card`
6. [TODO] Git Commit: `feat: add provider override to stage confirmation card` (hash: TBD)

### Stream: Confirmation Card Localization
7. [TODO] Синхронизировать localized copy для provider override card — scope: `assets/localization/source/en/ui_labels.json`, `assets/localization/source/en/ui_helper_text.json`, `assets/localization/source/en/messages_for_the_user.json`; ожидаемый commit message: `docs: localize stage confirmation provider override copy`
8. [TODO] Git Commit: `docs: localize stage confirmation provider override copy` (hash: TBD)

## Phase 2 — Runtime Sync and Documentation (owner: Codex, updated: 2026-04-13)
### Stream: Dialog Bootstrap Provider Sync
9. [TODO] Привязать dialog bootstrap к explicit provider intent для model/status и usage-limits surfaces нового step session — scope: `src/client/project-manager/components/sessions/use-project-manager-dialog-core-events.ts`, `src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts`; ожидаемый commit message: `fix: seed dialog bootstrap from chosen step provider`
10. [TODO] Git Commit: `fix: seed dialog bootstrap from chosen step provider` (hash: TBD)

### Stream: Runtime Surface Regression Locks
11. [TODO] Зафиксировать тестами, что status bar и usage refresh продолжают следовать runtime provider path после step start — scope: `src/client/project-manager/components/sessions/project-manager-session-view.test.tsx`, `src/client/ui/src/session/session-id-bar.test.tsx`; ожидаемый commit message: `test: cover provider override runtime sync`
12. [TODO] Git Commit: `test: cover provider override runtime sync` (hash: TBD)

### Stream: Workflow and PM SSOT Sync
13. [TODO] Обновить trunk workflow и PM cluster docs под inline provider override contract — scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`, `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`; ожидаемый commit message: `docs: sync workflow provider override contract`
14. [TODO] Git Commit: `docs: sync workflow provider override contract` (hash: TBD)

### Stream: Session UI Module Sync
15. [TODO] Обновить factual docs для status panel и usage limits bar под chosen-provider start path — scope: `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md`, `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionIdUsageBar.md`; ожидаемый commit message: `docs: sync session ui provider override behavior`
16. [TODO] Git Commit: `docs: sync session ui provider override behavior` (hash: TBD)

## Phase 3 — Release Build (owner: Codex, updated: 2026-04-13)
### Stream: Release Notes Prep
17. [TODO] Подготовить release notes и release-visible docs для следующей версии до build-all — scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `docs: prepare release notes for step provider override`
18. [TODO] Git Commit: `docs: prepare release notes for step provider override` (hash: TBD)

### Stream: Build All Version Bump
19. [TODO] Запустить `./scripts/build-all.sh`, проверить сгенерированные version surfaces и зафиксировать bump — scope: `root release metadata`, `VS Code extension/package manifests`, `bundled provider distributions`; ожидаемый commit message: `chore: bump version via build-all.sh`
20. [TODO] Git Commit: `chore: bump version via build-all.sh` (hash: TBD)

### Stream: Final Release Packaging
21. [TODO] Запустить `./scripts/build-release.sh --use-current-version`, проверить артефакт VSIX, обновить `doc/TODO/todo-plan.md` и подготовить session closeout — scope: `release validation surfaces`, `doc/TODO/todo-plan.md`, `doc/Sessions/Session005.md`; ожидаемый commit message: `docs: record step provider override release validation`
22. [TODO] Git Commit: `docs: record step provider override release validation` (hash: TBD)
