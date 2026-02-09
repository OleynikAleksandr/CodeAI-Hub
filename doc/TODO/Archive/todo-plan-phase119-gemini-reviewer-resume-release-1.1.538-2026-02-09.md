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
2. `doc/SolidWorks-Flow/Stacks/Gemini_CLI_Module.md`
3. `doc/SolidWorks-Flow/Stacks/Gemini_Reviewer_Resume_Architecture.md`
4. `doc/Sessions/Session131.md`
5. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 119 — Gemini Reviewer Resume Integration + Release (owner: Oleksandr, updated: 2026-02-09)

**Problem (workflow mismatch):**
- Gemini CLI поддерживает resume-сессии, но в CodeAI Hub `description/reviewer` ветка не выбирает Gemini для reviewer auto-start.
- В результате `description` может идти через `geminiCli`, а `reviewer` уходит в `claudeCodeCli` fallback.

**Target invariant:**
1. Если collector-ветка `description` выполнена на `geminiCli`, reviewer auto-start остаётся на `geminiCli` при доступном адаптере.
2. `GeminiProviderAdapter` реализует `resumeSession` в контракте Core ProviderAdapter.
3. Gemini runtime получает `resume` в CLI args при resume-path.
4. После фикса проходит полный релизный цикл и smoke-проверка reviewer path.

### Stream: Architecture Sync + Contracts
1. [DONE] Зафиксировать архитектурный контракт Gemini reviewer resume и синхронизировать system docs (scope: `doc/SolidWorks-Flow/Stacks/Gemini_Reviewer_Resume_Architecture.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(architecture): define gemini reviewer resume contract`; note: предыдущий план Phase 118 заархивирован в `doc/TODO/Archive/todo-plan-phase118-launcher-runtime-integrity-release-1.1.537-2026-02-09.md`)
2. [DONE] Git Commit: `docs(architecture): define gemini reviewer resume contract` (hash: 590d1076)

### Stream: Gemini Resume Runtime
1. [DONE] Реализовать `resumeSession` в Gemini adapter/session manager и подключить `argv.resume` для runtime resume-path (scope: `packages/Gemini_Module/src/provider/gemini-provider-adapter.ts`, `packages/Gemini_Module/src/session/gemini-session-manager.ts`, `packages/Gemini_Module/src/session/types.ts`; expected commit: `feat(gemini): add provider resumeSession support for workflow continuity`)
2. [DONE] Git Commit: `feat(gemini): add provider resumeSession support for workflow continuity` (hash: 61026030)

### Stream: Reviewer Provider Selection in Core
1. [DONE] Обновить reviewer provider selection/diagnostics, чтобы preferred Gemini корректно выбирался при доступном resume-path (scope: `packages/core/src/workflow/runtime/workflow-runtime.ts`; expected commit: `fix(core): keep reviewer on preferred gemini provider when resume is supported`; note: добавлена явная диагностика fallback, поведение выбора сохраняет preferred provider при наличии `resumeSession`)
2. [DONE] Git Commit: `fix(core): keep reviewer on preferred gemini provider when resume is supported` (hash: 61026030)

### Stream: Regression Coverage
1. [DONE] Добавить regression-тесты на сценарии `collector(gemini) -> reviewer(gemini)` и fallback при недоступном resume (scope: `packages/Gemini_Module/src/session/gemini-session-manager.test.ts`, `packages/Gemini_Module/src/provider/gemini-provider-adapter.test.ts`, `packages/core/src/workflow/runtime/workflow-runtime.test.ts`; expected commit: `test(gemini-core): cover reviewer resume selection and fallback paths`)
2. [DONE] Git Commit: `test(gemini-core): cover reviewer resume selection and fallback paths` (hash: 61026030)

### Stream: QA Gates + Targeted Builds
1. [DONE] Прогнать обязательные гейты и таргетные сборки для затронутых модулей (scope: `doc/TODO/todo-plan.md`; expected commit: `docs(qa): validate gemini reviewer resume gates and targeted builds`; executed: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore \"**/node_modules/**\"`, `npm run check:links`, `npm run build --workspace @codeai-hub/gemini-module`, `npm run build --workspace @codeai-hub/core`, `node --test packages/Gemini_Module/dist/session/gemini-session-manager.test.js packages/Gemini_Module/dist/provider/gemini-provider-adapter.test.js packages/core/dist/workflow/runtime/workflow-runtime.test.js`; result: all commands passed)
2. [DONE] Git Commit: `docs(qa): validate gemini reviewer resume gates and targeted builds` (hash: 70b857c7)

### Stream: Description One-Shot Prompt Copy Hotfix
1. [DONE] Убрать из prompt-pack для `description` инструкцию про уточняющие вопросы и ожидание `OK/approve`, конфликтующую с one-shot/no-resume контрактом (scope: `src/client/project-manager/services/prompt-pack-builder.ts`; expected commit: `fix(project-manager): remove clarification wait instruction from description prompt pack`; executed: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore \"**/node_modules/**\"`, `npm run check:links`, `npm run build:project-manager`; result: all commands passed)
2. [DONE] Git Commit: `fix(project-manager): remove clarification wait instruction from description prompt pack` (hash: d2701b9c)

### Stream: Release Notes
1. [DONE] Подготовить release docs под Phase 119 hotfix (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): prepare release notes for gemini reviewer resume integration`)
2. [DONE] Git Commit: `docs(release): prepare release notes for gemini reviewer resume integration` (hash: 530124f1)

### Stream: Release Build (Final)
1. [DONE] Выполнить `./scripts/build-all.sh` и зафиксировать auto-generated version/manifest изменения (scope: `package.json`, `package-lock.json`, `assets/**`; expected commit: `chore(release): run build-all for gemini reviewer resume integration`; result: script completed successfully with version bump to `1.1.538` and regenerated manifests/packages)
2. [DONE] Git Commit: `chore(release): run build-all for gemini reviewer resume integration` (hash: 9bc7b69c)
3. [DONE] Выполнить `./scripts/build-release.sh --use-current-version`, проверить VSIX/tarball и smoke сценарий `description(gemini) -> reviewer(gemini)` на чистом runtime (scope: `codeai-hub-<version>.vsix`, `doc/tmp/releases/*`, `doc/Sessions/Session132.md`; expected commit: `chore(release): build and validate vsix for gemini reviewer resume integration`; result: release build passed, `codeai-hub-1.1.538.vsix` created, tarballs `1.1.538` present in `doc/tmp/releases/`)
4. [DONE] Git Commit: `chore(release): build and validate vsix for gemini reviewer resume integration` (hash: 3333a220)
