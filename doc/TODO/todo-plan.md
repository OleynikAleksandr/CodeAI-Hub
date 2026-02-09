# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стримов), в каждом Stream — микро-задачи.
- Каждая микро-задача должна затрагивать не более **3 файлов**.
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- После каждой микро-задачи обязательны гейты: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетные сборки.
- После зелёных гейтов — Git Commit и немедленный апдейт статусов/хешей в этом файле.
- Реализованный план переносится в `doc/TODO/Archive/` с префиксом завершённой Phase.

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/Project_Docs/Stacks/Gemini_CLI_Module.md`
3. `doc/Project_Docs/Stacks/Gemini_Reviewer_Resume_Architecture.md`
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
1. [TODO] Зафиксировать архитектурный контракт Gemini reviewer resume и синхронизировать system docs (scope: `doc/Project_Docs/Stacks/Gemini_Reviewer_Resume_Architecture.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(architecture): define gemini reviewer resume contract`)
2. [TODO] Git Commit: `docs(architecture): define gemini reviewer resume contract` (hash: TBD)

### Stream: Gemini Resume Runtime
1. [TODO] Реализовать `resumeSession` в Gemini adapter/session manager и подключить `argv.resume` для runtime resume-path (scope: `packages/Gemini_Module/src/provider/gemini-provider-adapter.ts`, `packages/Gemini_Module/src/session/gemini-session-manager.ts`, `packages/Gemini_Module/src/session/types.ts`; expected commit: `feat(gemini): add provider resumeSession support for workflow continuity`)
2. [TODO] Git Commit: `feat(gemini): add provider resumeSession support for workflow continuity` (hash: TBD)

### Stream: Reviewer Provider Selection in Core
1. [TODO] Обновить reviewer provider selection/diagnostics, чтобы preferred Gemini корректно выбирался при доступном resume-path (scope: `packages/core/src/workflow/runtime/workflow-runtime.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/provider-registry/index.ts`; expected commit: `fix(core): keep reviewer on preferred gemini provider when resume is supported`)
2. [TODO] Git Commit: `fix(core): keep reviewer on preferred gemini provider when resume is supported` (hash: TBD)

### Stream: Regression Coverage
1. [TODO] Добавить regression-тесты на сценарии `collector(gemini) -> reviewer(gemini)` и fallback при недоступном resume (scope: `packages/Gemini_Module/src/session/gemini-session-manager.test.ts`, `packages/Gemini_Module/src/provider/gemini-provider-adapter.test.ts`, `packages/core/src/workflow/runtime/workflow-runtime.test.ts`; expected commit: `test(gemini-core): cover reviewer resume selection and fallback paths`)
2. [TODO] Git Commit: `test(gemini-core): cover reviewer resume selection and fallback paths` (hash: TBD)

### Stream: QA Gates + Targeted Builds
1. [TODO] Прогнать обязательные гейты и таргетные сборки для затронутых модулей (scope: `doc/TODO/todo-plan.md`; expected commit: `docs(qa): validate gemini reviewer resume gates and targeted builds`)
2. [TODO] Git Commit: `docs(qa): validate gemini reviewer resume gates and targeted builds` (hash: TBD)

### Stream: Release Notes
1. [TODO] Подготовить release docs под Phase 119 hotfix (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): prepare release notes for gemini reviewer resume integration`)
2. [TODO] Git Commit: `docs(release): prepare release notes for gemini reviewer resume integration` (hash: TBD)

### Stream: Release Build (Final)
1. [TODO] Выполнить `./scripts/build-all.sh` и зафиксировать auto-generated version/manifest изменения (scope: `package.json`, `package-lock.json`, `assets/**`; expected commit: `chore(release): run build-all for gemini reviewer resume integration`)
2. [TODO] Git Commit: `chore(release): run build-all for gemini reviewer resume integration` (hash: TBD)
3. [TODO] Выполнить `./scripts/build-release.sh --use-current-version`, проверить VSIX/tarball и smoke сценарий `description(gemini) -> reviewer(gemini)` на чистом runtime (scope: `codeai-hub-<version>.vsix`, `doc/tmp/releases/*`, `doc/Sessions/Session132.md`; expected commit: `chore(release): build and validate vsix for gemini reviewer resume integration`)
4. [TODO] Git Commit: `chore(release): build and validate vsix for gemini reviewer resume integration` (hash: TBD)
