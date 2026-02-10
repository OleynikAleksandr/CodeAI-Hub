# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стримов), в каждом Stream — микро-задачи.
- Каждая микро-задача должна затрагивать не более **3 файлов**.
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- После каждой микро-задачи обязательны гейты: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетные сборки.
- После зелёных гейтов — Git Commit и немедленный апдейт статусов/хешей в этом файле.
- Реализованный план переносится в `doc/TODO/Archive/` с префиксом завершённой Phase.

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/Sessions/Session001.md` (архитектурный аудит двойных источников)
3. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 124 — Single Source of Truth Refactor (owner: Oleksandr, updated: 2026-02-10)

**Goal:** устранить двойные источники правды в UI/Runtime/Protocol слоях и закрепить единые канонические контуры для Session UI, Project Manager UI, Settings UI, bundle resolution и workflow протоколов.

### Stream: Architecture Canonicalization (design baseline)
1. [DONE] Создать архитектурный RFC для рефакторинга SSOT и обновить системную карту владения модулями (scope: `doc/SolidWorks-Flow/System/SingleSourceOfTruth_Refactor.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `docs(architecture): define single source of truth refactor baseline`)
2. [DONE] Git Commit: `docs(architecture): define single source of truth refactor baseline` (hash: a12f06a1)

### Stream: UI Source-of-Truth Inventory (all interfaces)
1. [DONE] Зафиксировать матрицу «UI элемент → единственный владелец стиля» для Session/PM/Settings и пометить legacy-контуры на удаление (scope: `doc/SolidWorks-Flow/System/SingleSourceOfTruth_Refactor.md`, `doc/Sessions/Session001.md`; expected commit message: `docs(ui): register source-of-truth matrix for all interface elements`)
2. [DONE] Git Commit: `docs(ui): register source-of-truth matrix for all interface elements` (hash: c96dee4e)

### Stream: Session UI Style Source Unification
1. [DONE] Выбрать один канонический источник стилей SessionView и удалить дублирующие правила из второго контура (scope: `packages/ui/project-manager/styles.css`, `media/session-view.css`, `src/client/ui/src/session/session-view.tsx`; expected commit message: `refactor(ui): unify session style source of truth`)
2. [DONE] Git Commit: `refactor(ui): unify session style source of truth` (hash: d0d19210)

### Stream: Project Manager Build CSS Pipeline Cleanup
1. [DONE] Обновить PM build pipeline так, чтобы стили Session подтягивались только из канонического источника без параллельных инжектов (scope: `scripts/build-project-manager.js`, `packages/ui/project-manager/index.html`; expected commit message: `refactor(build): align project-manager css pipeline with ssot`)
2. [DONE] Git Commit: `refactor(build): align project-manager css pipeline with ssot` (hash: e2ba7ca8)

### Stream: Project Manager Legacy CSS Decommission
1. [DONE] Деактивировать и удалить legacy-контур `layout.css`, закрепив единый источник PM layout-токенов (scope: `src/client/project-manager/styles/layout.css`, `packages/ui/project-manager/styles.css`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `refactor(pm-ui): remove legacy layout css source`)
2. [DONE] Git Commit: `refactor(pm-ui): remove legacy layout css source` (hash: c33d9828)

### Stream: Settings UI Style Token Canonicalization
1. [DONE] Создать единый token-layer для Settings UI и перевести базовые контейнеры на него (scope: `src/client/ui/src/components/settings/style-tokens.ts`, `src/client/ui/src/components/settings-view.tsx`, `src/client/ui/src/app-host/settings-only-host.tsx`; expected commit message: `refactor(settings-ui): introduce canonical style token layer`)
2. [DONE] Git Commit: `refactor(settings-ui): introduce canonical style token layer` (hash: 8b48c710)

### Stream: Settings Cards Style Unification
1. [DONE] Перевести карточки и диалоги Settings на общий набор токенов без дублирования color/border/font в каждом модуле (scope: `src/client/ui/src/components/settings/settings-card.tsx`, `src/client/ui/src/components/settings/shared-model-card-styles.ts`, `src/client/ui/src/components/settings/settings-footer.tsx`; expected commit message: `refactor(settings-ui): unify card and dialog style ownership`)
2. [DONE] Git Commit: `refactor(settings-ui): unify card and dialog style ownership` (hash: 48c9dded)

### Stream: UI Bundle Runtime Layout Unification
1. [DONE] Убрать dual-layout для UI bundle install/resolve и оставить единый runtime layout (scope: `src/extension-module/ui/ui-installer.ts`, `src/extension-module/ui/ui-path-resolver.ts`, `src/extension-module/ui/ui-activation.ts`; expected commit message: `refactor(runtime): unify ui bundle install and resolve layout`)
2. [DONE] Git Commit: `refactor(runtime): unify ui bundle install and resolve layout` (hash: ff2beb5d)

### Stream: Session Event Normalization Consolidation
1. [DONE] Вынести единый нормализатор session event payload и подключить его в UI/PM без двойной логики парсинга (scope: `src/client/ui/src/core-bridge/server-message-handler.ts`, `src/client/project-manager/components/sessions/session-stream.ts`, `src/client/ui/src/core-bridge/normalizers.ts`; expected commit message: `refactor(core-bridge): consolidate session event normalization`)
2. [DONE] Git Commit: `refactor(core-bridge): consolidate session event normalization` (hash: 6cd2f421)

### Stream: Workspace Protocol Cleanup (remove legacy scope handshake)
1. [DONE] Удалить deprecated fallback `workspace:scope:set` и закрепить единственный протокол `workspace:select` + `workspace:select:ack` (scope: `src/client/project-manager/services/workspace-scope-handshake.ts`, `src/client/project-manager/components/layout/workspace-scope-sync.ts`, `src/client/project-manager/api.ts`; expected commit message: `refactor(protocol): remove legacy workspace scope handshake`)
2. [DONE] Git Commit: `refactor(protocol): remove legacy workspace scope handshake` (hash: db4a6f20)

### Stream: Questionnaire Path Policy Canonicalization
1. [DONE] Перевести questionnaire flow на один canonical path policy без legacy-копий записи (scope: `src/client/ui/src/services/idea-questionnaire-paths.ts`, `src/client/ui/src/services/idea-questionnaire-service.ts`, `src/client/project-manager/services/description-questionnaire-service.ts`; expected commit message: `refactor(questionnaire): canonicalize path policy and writes`)
2. [DONE] Git Commit: `refactor(questionnaire): canonicalize path policy and writes` (hash: e8f45908)

### Stream: SSOT Guardrails for UI Styling
1. [DONE] Добавить архитектурный guard, который блокирует появление второго источника для уже канонизированных UI-контуров (scope: `scripts/check-architecture.sh`, `scripts/check-architecture-rules/ui-style-ssot.sh`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `chore(architecture): enforce ui style single source guardrails`)
2. [DONE] Git Commit: `chore(architecture): enforce ui style single source guardrails` (hash: b4e63bbd)

### Stream: QA Gates + Targeted Builds
1. [DONE] Прогнать обязательные гейты и таргетные сборки для затронутых контуров (scope: `scripts/check-architecture.sh`, `src/client/ui`, `src/client/project-manager`; expected commit message: `docs(qa): validate ssot refactor gates and targeted builds`)
2. [DONE] Git Commit: `docs(qa): validate ssot refactor gates and targeted builds` (hash: 8cdc8036)

### Stream: Release Build (Final)
1. [DONE] Выполнить `./scripts/build-all.sh` после завершения всех stream (scope: scripts; expected commit message: `chore(release): run build-all for ssot refactor`)
2. [DONE] Git Commit: `chore(release): run build-all for ssot refactor` (hash: 50b4eb4d)
3. [DONE] Выполнить `./scripts/build-release.sh --use-current-version` и собрать новый VSIX (scope: scripts; expected commit message: `chore(release): build and validate vsix for ssot refactor`)
4. [DONE] Git Commit: `chore(release): build and validate vsix for ssot refactor` (hash: 00842fb4)

---

## Phase 125 — Session ID Bar Limits Placeholder (owner: Oleksandr, updated: 2026-02-10)

**Goal:** зафиксировать `Session ID Bar` на `32px`, добавить справа две placeholder-строки лимитов с progress-bar и выпустить новый релиз после QA.

### Stream: Session ID Bar 32px Placeholder Layout
1. [DONE] Реализовать фиксированную высоту `32px` для `ID`-плашки: слева `ID: f38e9689-...` (14px, выравнивание по левому краю и по центру высоты), справа блок из 2 строк (`5 houers`, `weekly`) с серыми горизонтальными барами `80px x 4px`, выровненными по правому краю и по центру каждой строки (scope: `media/session-view.css`, `src/client/ui/src/session/session-id-bar.tsx`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `feat(session-ui): add fixed 32px id bar with placeholder limit rows`)
2. [DONE] Git Commit: `feat(session-ui): add fixed 32px id bar with placeholder limit rows` (hash: 74210bf8)

### Stream: Release Build (Phase 125)
1. [DONE] Выполнить `./scripts/build-all.sh` после завершения stream-ов фазы (scope: scripts; expected commit message: `chore(release): run build-all for session id bar limits placeholder`)
2. [DONE] Git Commit: `chore(release): run build-all for session id bar limits placeholder` (hash: 506cea20)
3. [DONE] Выполнить `./scripts/build-release.sh --use-current-version` и собрать новый VSIX (scope: scripts; expected commit message: `chore(release): build and validate vsix for session id bar limits placeholder`)
4. [DONE] Git Commit: `chore(release): build and validate vsix for session id bar limits placeholder` (hash: bf85af44)

---

## Phase 126 — Session Hint Color + Limit Label Readability (owner: Oleksandr, updated: 2026-02-10)

**Goal:** повысить читаемость правого блока лимитов в `Session ID Bar`, уменьшить зазоры и унифицировать цвет подсказочного текста на `rgba(140, 140, 140, 1)` для ID/нижних плашек.

### Stream: Session Hint Typography and Color Tune
1. [DONE] Поднять размер правых label в `Session ID Bar` до `9px`, уменьшить вертикальные/горизонтальные зазоры (`gap`, `column-gap`) и применить единый цвет `rgba(140, 140, 140, 1)` для `ID`-плашки, `Press Enter to send...`, `Models: ...`, debug summary справа (scope: `media/session-view.css`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`, `doc/TODO/todo-plan.md`; expected commit message: `fix(session-ui): tune limit labels and unify hint color token`)
2. [DONE] Git Commit: `fix(session-ui): tune limit labels and unify hint color token` (hash: 7fa7a16a)

### Stream: Release Build (Phase 126)
1. [DONE] Выполнить `./scripts/build-all.sh` после завершения stream-ов фазы (scope: scripts; expected commit message: `chore(release): run build-all for session hint color tune`)
2. [DONE] Git Commit: `chore(release): run build-all for session hint color tune` (hash: b22b0786)
3. [DONE] Выполнить `./scripts/build-release.sh --use-current-version` и собрать новый VSIX (scope: scripts; expected commit message: `chore(release): build and validate vsix for session hint color tune`)
4. [DONE] Git Commit: `chore(release): build and validate vsix for session hint color tune` (hash: 1114e269)

---

## Phase 127 — Documentation Synchronization for v1.1.545 (owner: Oleksandr, updated: 2026-02-10)

**Goal:** актуализировать документацию под UI-правки Session Hint/ID Bar и релиз `1.1.545` в `README.md`, `CHANGELOG.md` и документах `doc/SolidWorks-Flow`.

### Stream: Public Release Notes Sync
1. [DONE] Обновить публичные release notes и текущий релиз в корневых документах (`README.md`, `CHANGELOG.md`) и синхронизировать текущие версии/контракты в системном SoT (`doc/SolidWorks-Flow/System/SystemArchitecture.md`) под `v1.1.545` и Phase 126 UI tune (scope: `README.md`, `CHANGELOG.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `docs(release): sync root notes and system architecture for v1.1.545`)
2. [DONE] Git Commit: `docs(release): sync root notes and system architecture for v1.1.545` (hash: 1ee79e52)

### Stream: SolidWorks Index and UI Stack Sync
1. [DONE] Обновить индекс/обзорные документы SolidWorks-Flow и UI stack статус на релиз `1.1.545` (scope: `doc/SolidWorks-Flow/README.md`, `doc/SolidWorks-Flow/System/Docs_Index.md`, `doc/SolidWorks-Flow/Stacks/UI_Modules.md`; expected commit message: `docs(flow): sync index and ui stack metadata for v1.1.545`)
2. [DONE] Git Commit: `docs(flow): sync index and ui stack metadata for v1.1.545` (hash: 50384c9d)

### Stream: SolidWorks Runtime and Launcher Stack Sync
1. [DONE] Обновить runtime/launcher-ориентированные документы SolidWorks-Flow под текущий релиз и актуальные артефактные примеры `1.1.545` (scope: `doc/SolidWorks-Flow/Stacks/Project_Manager.md`, `doc/SolidWorks-Flow/WorkspaceRuntime/WorkspaceRuntime.md`, `doc/SolidWorks-Flow/Stacks/Launcher_CEF_Module.md`; expected commit message: `docs(flow): sync runtime and launcher stack docs for v1.1.545`)
2. [DONE] Git Commit: `docs(flow): sync runtime and launcher stack docs for v1.1.545` (hash: be1f2021)

### Stream: SolidWorks Continuity and Core Stack Metadata
1. [DONE] Актуализировать метаданные release/operational notes в continuity/core/gemini stack документах (scope: `doc/SolidWorks-Flow/SessionContinuity/SessionContinuity.md`, `doc/SolidWorks-Flow/Stacks/CoreOrchestrator.md`, `doc/SolidWorks-Flow/Stacks/Gemini_CLI_Module.md`; expected commit message: `docs(flow): refresh continuity and core stack metadata for v1.1.545`)
2. [DONE] Git Commit: `docs(flow): refresh continuity and core stack metadata for v1.1.545` (hash: 5014c85b)

### Stream: Release Build (Phase 127)
1. [TODO] Выполнить `./scripts/build-all.sh` после завершения stream-ов фазы (scope: scripts; expected commit message: `chore(release): run build-all for documentation sync v1.1.545`)
2. [TODO] Git Commit: `chore(release): run build-all for documentation sync v1.1.545` (hash: TBD)
3. [TODO] Выполнить `./scripts/build-release.sh --use-current-version` и собрать новый VSIX (scope: scripts; expected commit message: `chore(release): build and validate vsix for documentation sync v1.1.545`)
4. [TODO] Git Commit: `chore(release): build and validate vsix for documentation sync v1.1.545` (hash: TBD)
