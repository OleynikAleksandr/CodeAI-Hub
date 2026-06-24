# План разработки (Development TODO Plan)

**Plan ID:** `TL-001`  
**Status:** `COMPLETED` — выполнен из planned-файла по прямой команде пользователя и заархивирован после release `1.2.100`; активный `doc/TODO/todo-plan.md` не создавался  
**Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_TranslationOnly_Profile_Hardening_Architecture.md`  
**Created:** 2026-04-28  
**Started:** 2026-04-28  
**Completed:** 2026-04-28  
**Release:** `1.2.100` (`codeai-hub-1.2.100.vsix`)  

> Execution note: пользователь явно выбрал planned-файл как execution owner. После успешного release build файл перенесён в `doc/TODO/Archive/`.

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_TranslationOnly_Profile_Hardening_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex_ProviderInvocationFlags.md`
  - `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
  - `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Instruction_Stack_Control_Experiment_Results/Codex_Workflow_Documentation_Tool_Profile.md`
- Только этот список является источником документов для восстановления контекста этого queued execution cycle после активации.

## Правила выполнения (Execution Rules)
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждая подзадача должна затрагивать не более 3 файлов или пакетов.
- Каждая подзадача оформляется парой пунктов: реализация/изменения и отдельный `Git Commit: ...`.
- Если по факту задача затрагивает больше 3 файлов/пакетов, перед реализацией разбить ее на более мелкие пункты.
- Гейты запускаются через Husky на `git commit`; не обходить hooks.
- Таргетные проверки для этого плана: `npm run build --workspace @codeai-hub/codex-app-server-module`, `npm run build --workspace @codeai-hub/core`; при изменении UI/Settings capture path добавить `npm run build:webview` и `npm run typecheck:webview`.
- После каждого коммита обновить статус пункта и hash в execution owner file; финальный owner path: `doc/TODO/Archive/todo-plan-TL-001-codex-translation-only.md`.

## Release Result
- `./scripts/build-all.sh`: DONE, собраны provider/core/UI/launcher tarballs версии `1.2.100` в `~/.codeai-hub/releases/`.
- `./scripts/build-release.sh --use-current-version`: DONE, создан `codeai-hub-1.2.100.vsix` (2.5M), VSIX runtime package surface verification passed.

## Phase 1 — Codex Translation-Only Hardening (owner: Codex, updated: 2026-04-28)

### Stream: Evidence Baseline
1. [DONE] Зафиксировать текущий translation tool/profile baseline перед изменениями — scope: `packages/Codex_AppServer_Module/src/diagnostics/codex-native-translation-capture-profile.ts`, `packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.test.ts`, `doc/SolidWorks-WorkFlow/Modules/Codex_ProviderInvocationFlags.md`; verification: `npm run build --workspace @codeai-hub/codex-app-server-module` + `node --test packages/Codex_AppServer_Module/dist/diagnostics/codex-native-request-capture-service.test.js`; expected commit message: `test: document codex translation tool baseline`.
2. [DONE] Git Commit: `test: document codex translation tool baseline` (hash: `b19cb4372`)

### Stream: Translation Prompt Contract
3. [DONE] Сделать Codex translation prompt минимальным translator-only contract — scope: `packages/Codex_AppServer_Module/src/translation/codex-translation-prompt-profile.ts`, `packages/Codex_AppServer_Module/src/translation/codex-translation-prompt-profile.test.ts`, `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`; verification: `npm run build --workspace @codeai-hub/codex-app-server-module` + `node --test packages/Codex_AppServer_Module/dist/translation/codex-translation-prompt-profile.test.js` + `node --test packages/Codex_AppServer_Module/dist/diagnostics/codex-native-request-capture-service.test.js`; expected commit message: `feat: harden codex translation prompt profile`.
4. [DONE] Git Commit: `feat: harden codex translation prompt profile` (hash: `cbd1ed8ab`)

### Stream: Translation Process Profile
5. [DONE] Выделить самостоятельный `codex:translation` process/tool profile и проверить Spark summary omission — scope: `packages/Codex_AppServer_Module/src/app-server/process/codex-app-server-process-profile.ts`, `packages/Codex_AppServer_Module/src/translation/codex-app-server-translation-service.test.ts`, `doc/SolidWorks-WorkFlow/Modules/Codex_ProviderInvocationFlags.md`; verification: `npm run build --workspace @codeai-hub/codex-app-server-module` + `node --test packages/Codex_AppServer_Module/dist/translation/codex-app-server-translation-service.test.js`; expected commit message: `feat: isolate codex translation process profile`.
6. [DONE] Git Commit: `feat: isolate codex translation process profile` (hash: `645c86443`)

### Stream: Core Invocation Profile Alignment
7. [DONE] Синхронизировать Core `translation` invocation profile с новым Codex translation-only profile — scope: `packages/core/src/model-invocation/model-invocation-profile-resolver.ts`, `packages/core/src/model-invocation/model-invocation-profile-resolver.smoke.test.ts`, `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`; verification: `npm run build --workspace @codeai-hub/core` + `node --test packages/core/dist/model-invocation/model-invocation-profile-resolver.smoke.test.js`; expected commit message: `feat: align codex translation invocation profile`.
8. [DONE] Git Commit: `feat: align codex translation invocation profile` (hash: `b72248d21`)

### Stream: Native Capture Verification
9. [DONE] Проверить `Translation` native request capture и зафиксировать provider-visible result — scope: `packages/core/src/provider-network-capture/native-request-capture-facade.test.ts`, `packages/Codex_AppServer_Module/src/diagnostics/codex-native-translation-capture-profile.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; verification: `npm run build --workspace @codeai-hub/codex-app-server-module` + `npm run build --workspace @codeai-hub/core` + `node --test packages/core/dist/provider-network-capture/native-request-capture-facade.test.js` + `node --test packages/Codex_AppServer_Module/dist/diagnostics/codex-native-request-capture-service.test.js` + `node --test packages/core/dist/model-invocation/model-invocation-profile-resolver.smoke.test.js`; expected commit message: `test: verify codex translation capture profile`.
10. [DONE] Git Commit: `test: verify codex translation capture profile` (hash: `7ce4d58f5`)

### Stream: Targeted Builds And Closeout
11. [DONE] Прогнать таргетные сборки Codex/Core, обновить этот execution plan результатами и закрыть scope — scope: `@codeai-hub/codex-app-server-module`, `@codeai-hub/core`, `doc/TODO/Archive/todo-plan-TL-001-codex-translation-only.md`; verification: `npm run build --workspace @codeai-hub/codex-app-server-module` + `npm run build --workspace @codeai-hub/core`; expected commit message: `chore: verify codex translation-only profile`.
12. [DONE] Git Commit: `chore: verify codex translation-only profile` (hash: `6a0c5c1ee`)
