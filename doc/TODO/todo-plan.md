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
2. [IN_PROGRESS] Git Commit: `docs(architecture): define single source of truth refactor baseline` (hash: TBD)

### Stream: UI Source-of-Truth Inventory (all interfaces)
1. [TODO] Зафиксировать матрицу «UI элемент → единственный владелец стиля» для Session/PM/Settings и пометить legacy-контуры на удаление (scope: `doc/SolidWorks-Flow/System/SingleSourceOfTruth_Refactor.md`, `doc/Sessions/Session001.md`; expected commit message: `docs(ui): register source-of-truth matrix for all interface elements`)
2. [TODO] Git Commit: `docs(ui): register source-of-truth matrix for all interface elements` (hash: TBD)

### Stream: Session UI Style Source Unification
1. [TODO] Выбрать один канонический источник стилей SessionView и удалить дублирующие правила из второго контура (scope: `packages/ui/project-manager/styles.css`, `media/session-view.css`, `src/client/ui/src/session/session-view.tsx`; expected commit message: `refactor(ui): unify session style source of truth`)
2. [TODO] Git Commit: `refactor(ui): unify session style source of truth` (hash: TBD)

### Stream: Project Manager Build CSS Pipeline Cleanup
1. [TODO] Обновить PM build pipeline так, чтобы стили Session подтягивались только из канонического источника без параллельных инжектов (scope: `scripts/build-project-manager.js`, `packages/ui/project-manager/index.html`; expected commit message: `refactor(build): align project-manager css pipeline with ssot`)
2. [TODO] Git Commit: `refactor(build): align project-manager css pipeline with ssot` (hash: TBD)

### Stream: Project Manager Legacy CSS Decommission
1. [TODO] Деактивировать и удалить legacy-контур `layout.css`, закрепив единый источник PM layout-токенов (scope: `src/client/project-manager/styles/layout.css`, `packages/ui/project-manager/styles.css`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `refactor(pm-ui): remove legacy layout css source`)
2. [TODO] Git Commit: `refactor(pm-ui): remove legacy layout css source` (hash: TBD)

### Stream: Settings UI Style Token Canonicalization
1. [TODO] Создать единый token-layer для Settings UI и перевести базовые контейнеры на него (scope: `src/client/ui/src/components/settings/style-tokens.ts`, `src/client/ui/src/components/settings-view.tsx`, `src/client/ui/src/app-host/settings-only-host.tsx`; expected commit message: `refactor(settings-ui): introduce canonical style token layer`)
2. [TODO] Git Commit: `refactor(settings-ui): introduce canonical style token layer` (hash: TBD)

### Stream: Settings Cards Style Unification
1. [TODO] Перевести карточки и диалоги Settings на общий набор токенов без дублирования color/border/font в каждом модуле (scope: `src/client/ui/src/components/settings/settings-card.tsx`, `src/client/ui/src/components/settings/shared-model-card-styles.ts`, `src/client/ui/src/components/settings/settings-footer.tsx`; expected commit message: `refactor(settings-ui): unify card and dialog style ownership`)
2. [TODO] Git Commit: `refactor(settings-ui): unify card and dialog style ownership` (hash: TBD)

### Stream: UI Bundle Runtime Layout Unification
1. [TODO] Убрать dual-layout для UI bundle install/resolve и оставить единый runtime layout (scope: `src/extension-module/ui/ui-installer.ts`, `src/extension-module/ui/ui-path-resolver.ts`, `src/extension-module/ui/ui-activation.ts`; expected commit message: `refactor(runtime): unify ui bundle install and resolve layout`)
2. [TODO] Git Commit: `refactor(runtime): unify ui bundle install and resolve layout` (hash: TBD)

### Stream: Session Event Normalization Consolidation
1. [TODO] Вынести единый нормализатор session event payload и подключить его в UI/PM без двойной логики парсинга (scope: `src/client/ui/src/core-bridge/server-message-handler.ts`, `src/client/project-manager/components/sessions/session-stream.ts`, `src/client/ui/src/core-bridge/normalizers.ts`; expected commit message: `refactor(core-bridge): consolidate session event normalization`)
2. [TODO] Git Commit: `refactor(core-bridge): consolidate session event normalization` (hash: TBD)

### Stream: Workspace Protocol Cleanup (remove legacy scope handshake)
1. [TODO] Удалить deprecated fallback `workspace:scope:set` и закрепить единственный протокол `workspace:select` + `workspace:select:ack` (scope: `src/client/project-manager/services/workspace-scope-handshake.ts`, `src/client/project-manager/components/layout/workspace-scope-sync.ts`, `src/client/project-manager/api.ts`; expected commit message: `refactor(protocol): remove legacy workspace scope handshake`)
2. [TODO] Git Commit: `refactor(protocol): remove legacy workspace scope handshake` (hash: TBD)

### Stream: Questionnaire Path Policy Canonicalization
1. [TODO] Перевести questionnaire flow на один canonical path policy без legacy-копий записи (scope: `src/client/ui/src/services/idea-questionnaire-paths.ts`, `src/client/ui/src/services/idea-questionnaire-service.ts`, `src/client/project-manager/services/description-questionnaire-service.ts`; expected commit message: `refactor(questionnaire): canonicalize path policy and writes`)
2. [TODO] Git Commit: `refactor(questionnaire): canonicalize path policy and writes` (hash: TBD)

### Stream: SSOT Guardrails for UI Styling
1. [TODO] Добавить архитектурный guard, который блокирует появление второго источника для уже канонизированных UI-контуров (scope: `scripts/check-architecture.sh`, `scripts/check-architecture-rules/ui-style-ssot.sh`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `chore(architecture): enforce ui style single source guardrails`)
2. [TODO] Git Commit: `chore(architecture): enforce ui style single source guardrails` (hash: TBD)

### Stream: QA Gates + Targeted Builds
1. [TODO] Прогнать обязательные гейты и таргетные сборки для затронутых контуров (scope: `scripts/check-architecture.sh`, `src/client/ui`, `src/client/project-manager`; expected commit message: `docs(qa): validate ssot refactor gates and targeted builds`)
2. [TODO] Git Commit: `docs(qa): validate ssot refactor gates and targeted builds` (hash: TBD)

### Stream: Release Build (Final)
1. [TODO] Выполнить `./scripts/build-all.sh` после завершения всех stream (scope: scripts; expected commit message: `chore(release): run build-all for ssot refactor`)
2. [TODO] Git Commit: `chore(release): run build-all for ssot refactor` (hash: TBD)
3. [TODO] Выполнить `./scripts/build-release.sh --use-current-version` и собрать новый VSIX (scope: scripts; expected commit message: `chore(release): build and validate vsix for ssot refactor`)
4. [TODO] Git Commit: `chore(release): build and validate vsix for ssot refactor` (hash: TBD)
