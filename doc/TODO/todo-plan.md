# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase — Stream (стрим) с микрозадачами.
- Каждая микрозадача затрагивает **≤ 3 файлов** и **≤ 3 новых классов**.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- После каждой микрозадачи обязательны гейты: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.
- После зелёных гейтов — Git Commit и немедленный апдейт статусов/хешей в этом файле.

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/Project_Docs/Stacks/Gemini_CLI_Runtime_Compatibility_Architecture.md`
3. `doc/Project_Docs/Stacks/Gemini_CLI_Module.md`
4. `doc/Sessions/Session129.md`
5. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 117 — Gemini CLI Core Runtime Compatibility + Release (owner: Oleksandr, updated: 2026-02-09)

**Problem (runtime regression):**
- В установленном провайдере `gemini@1.1.535` инициализация падает с `ERR_MODULE_NOT_FOUND` из-за жёсткой загрузки `nonInteractiveToolExecutor.js`.
- В актуальном `@google/gemini-cli-core@0.27.x` legacy entrypoint удалён, из-за чего провайдер становится `UNAVAILABLE` до этапа auth.

**Target invariant:**
1. Gemini provider успешно инициализируется на `@google/gemini-cli-core` ветках `0.17.x` и `0.27.x`.
2. Tool-call execution идёт через единый фасад с runtime backend detection.
3. Диагностика чётко разделяет `auth/login` и `module compatibility` ошибки.
4. После фикса выполнен полный релизный цикл и smoke-проверка Gemini в установленном runtime.

### Stream: Architecture Contract + Docs Baseline
1. [DONE] Зафиксировать архитектурный контракт совместимости Gemini CLI Core (loader fallback, unified tool-executor facade, error taxonomy) и синхронизировать stack/system docs (scope: `doc/Project_Docs/Stacks/Gemini_CLI_Runtime_Compatibility_Architecture.md`, `doc/Project_Docs/Stacks/Gemini_CLI_Module.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`; expected commit: `docs(architecture): define gemini cli-core runtime compatibility contract`)
2. [DONE] Git Commit: `docs(architecture): define gemini cli-core runtime compatibility contract` (hash: 838de7f1)

### Stream: Runtime Bridge Compatibility Loader
1. [DONE] Внедрить multi-path загрузку backend для tool execution (legacy `nonInteractiveToolExecutor` + scheduler fallback через `coreToolScheduler`) и публиковать выбранный backend в bridge metadata (scope: `packages/Gemini_Module/src/runtime/cli-bridge.ts`, `packages/Gemini_Module/src/runtime/cli-types.ts`, `packages/Gemini_Module/src/session/types.ts`; expected commit: `fix(gemini): support cli-core module layout variants in runtime bridge`)
2. [DONE] Git Commit: `fix(gemini): support cli-core module layout variants in runtime bridge` (hash: c02f7d54)

### Stream: Unified Tool Execution Facade
1. [DONE] Добавить фасад `GeminiToolExecutorFacade` и переключить `GeminiSessionManager` на единый контракт исполнения tool-calls независимо от backend (scope: `packages/Gemini_Module/src/session/gemini-tool-executor-facade.ts`, `packages/Gemini_Module/src/session/gemini-session-manager.ts`, `packages/Gemini_Module/src/runtime/cli-types.ts`; expected commit: `fix(gemini): execute tool calls via compatibility facade across cli-core APIs`)
2. [DONE] Git Commit: `fix(gemini): execute tool calls via compatibility facade across cli-core APIs` (hash: c02f7d54)

### Stream: Installer Safety + Provider Diagnostics
1. [DONE] Ужесточить post-update/self-check и классификацию ошибок в installer/provider, чтобы compatibility mismatch не маскировался под auth issue (scope: `packages/Gemini_Module/src/installer/gemini-installer.ts`, `packages/Gemini_Module/src/provider/gemini-provider-adapter.ts`, `packages/Gemini_Module/src/runtime/cli-bridge.ts`; expected commit: `fix(gemini): harden installer self-check and compatibility diagnostics`)
2. [DONE] Git Commit: `fix(gemini): harden installer self-check and compatibility diagnostics` (hash: c02f7d54)

### Stream: Non-Regression Validation
1. [DONE] Добавить regression-тесты на loader fallback и unified tool execution facade для legacy/new CLI Core API (scope: `packages/Gemini_Module/src/runtime/cli-bridge.test.ts`, `packages/Gemini_Module/src/session/gemini-tool-executor-facade.test.ts`, `packages/Gemini_Module/package.json`; expected commit: `test(gemini): cover runtime loader fallback and unified tool execution`)
2. [DONE] Git Commit: `test(gemini): cover runtime loader fallback and unified tool execution` (hash: 10cd0cfb)
3. [DONE] Прогнать обязательные гейты + таргетные сборки (`@codeai-hub/gemini-module`, `@codeai-hub/core`, `webview/project-manager`) и синхронно обновить доки/план (scope: `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`, `doc/Project_Docs/Stacks/Gemini_CLI_Module.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(qa): validate gemini compatibility gates and targeted builds`; executed: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, `npm run build --workspace @codeai-hub/gemini-module`, `npm run build --workspace @codeai-hub/core`, `npm run build:webview`, `npm run build:project-manager`, `npm run typecheck:webview`)
4. [DONE] Git Commit: `docs(qa): validate gemini compatibility gates and targeted builds` (hash: 7bb4485f)

### Stream: Release Build
1. [DONE] Подготовить release docs перед сборкой (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): prepare release notes for gemini runtime compatibility hotfix`)
2. [DONE] Git Commit: `docs(release): prepare release notes for gemini runtime compatibility hotfix` (hash: 82b4eb82)
3. [DONE] Выполнить `./scripts/build-all.sh` и зафиксировать auto-generated version/manifest изменения (scope: `package.json`, `package-lock.json`, `assets/**`; expected commit: `chore(release): run build-all for gemini runtime compatibility hotfix`)
4. [DONE] Git Commit: `chore(release): run build-all for gemini runtime compatibility hotfix` (hash: 37366687)
5. [DONE] Выполнить `./scripts/build-release.sh --use-current-version`, проверить VSIX/tarball артефакты и smoke Gemini provider в установленном runtime (scope: `codeai-hub-1.1.536.vsix`, `doc/tmp/releases/*`, `doc/Sessions/Session130.md`; expected commit: `chore(release): build and validate vsix for gemini runtime compatibility hotfix`; executed: `./scripts/build-release.sh --use-current-version`, `CODEAI_HUB_GEMINI_CLI_ROOT=/Users/oleksandroliinyk/.npm-global/lib/node_modules/@google/gemini-cli node -e "...loadCliBridgeFromGlobal..."`; result: `OK unknown scheduler_fallback`, VSIX created)
6. [DONE] Git Commit: `chore(release): build and validate vsix for gemini runtime compatibility hotfix` (hash: c5e7696b)

---

## Phase 118 — Launcher Runtime Integrity Hotfix + Clean Install Release (owner: Oleksandr, updated: 2026-02-09)

**Problem (regression):**
- Project Manager `.app` может не стартовать с `Failed to load CEF framework`, если launcher-install считает установку валидной по одному executable, но CEF framework в install dir частично отсутствует/повреждён.
- Дополнительно есть риск некорректного legacy→primary copy при symlink-self-reference, что может приводить к неполной payload-копии при параллельном старте.

**Target invariant:**
1. Reuse launcher-install разрешён только при целостном runtime (executable + CEF framework binary на macOS).
2. Legacy→primary copy не может удалить/перекопировать install dir сам в себя через symlink-path.
3. На чистой установке (`~/.codeai-hub` удалён) Project Manager поднимается без ручных восстановлений runtime.

### Stream: Runtime Integrity Guard
1. [DONE] Внедрить runtime integrity checker для launcher-install (обязательные файлы по платформам) и self-copy guard в legacy migration path (scope: `src/extension-module/cef/launcher-runtime-integrity.ts`, `src/extension-module/cef/launcher-install-helpers.ts`, `src/extension-module/cef/launcher-installer.ts`; expected commit: `fix(launcher): enforce runtime integrity and guard legacy self-copy on macos`)
2. [DONE] Git Commit: `fix(launcher): enforce runtime integrity and guard legacy self-copy on macos` (hash: a1b11b8c)

### Stream: Docs + Validation
1. [DONE] Синхронизировать архитектурные документы по инвариантам launcher runtime integrity (scope: `doc/Project_Docs/Stacks/Launcher_CEF_Module.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(architecture): document launcher runtime integrity guardrails`; note: зафиксировано совместно с кодовым hotfix-коммитом)
2. [DONE] Git Commit: `docs(architecture): document launcher runtime integrity guardrails` (hash: a1b11b8c)
3. [DONE] Прогнать обязательные гейты + таргетные сборки (scope: `doc/TODO/todo-plan.md`; expected commit: `docs(qa): validate launcher integrity hotfix gates and targeted builds`; executed: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, `npm run compile`)
4. [IN_PROGRESS] Git Commit: `docs(qa): validate launcher integrity hotfix gates and targeted builds` (hash: TBD)

### Stream: Release Build
1. [TODO] Подготовить release notes под hotfix (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): prepare release notes for launcher runtime integrity hotfix`)
2. [TODO] Git Commit: `docs(release): prepare release notes for launcher runtime integrity hotfix` (hash: TBD)
3. [TODO] Выполнить `./scripts/build-all.sh` и зафиксировать auto-generated версии/манифесты (scope: `package.json`, `package-lock.json`, `assets/**`; expected commit: `chore(release): run build-all for launcher runtime integrity hotfix`)
4. [TODO] Git Commit: `chore(release): run build-all for launcher runtime integrity hotfix` (hash: TBD)
5. [TODO] Выполнить `./scripts/build-release.sh --use-current-version`, проверить VSIX/tarball и сценарий clean install (`~/.codeai-hub` пустой) + запуск Project Manager (scope: `codeai-hub-<version>.vsix`, `doc/tmp/releases/*`, `doc/Sessions/Session131.md`; expected commit: `chore(release): build and validate vsix for launcher runtime integrity hotfix`)
6. [TODO] Git Commit: `chore(release): build and validate vsix for launcher runtime integrity hotfix` (hash: TBD)
