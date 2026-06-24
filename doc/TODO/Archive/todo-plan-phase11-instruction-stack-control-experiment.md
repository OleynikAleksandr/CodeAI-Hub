# План разработки (Development TODO Plan)

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/Provider_AutoUpdate_And_Claude_Preflight_1.2.78.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Provider_AutoUpdate_And_Claude_Preflight_1.2.78.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_GPT55_Model_Addition_1.2.76.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_Instruction_Stack_StepByStep_Flag_Tests_1.2.75.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_Workflow_MultiAgent_Tool_Profile_Flag_1.2.81.md`
  - `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Instruction_Stack_Control_Experiment_Results/Codex_Workflow_Documentation_Tool_Profile.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):

- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стримов), в каждом Stream — микрозадачи.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Если по факту разработки конкретная подзадача Stream затрагивает больше 3 файлов, задача должна быть разбита на более мелкие и список задач в Stream переписывается.
- **Gates (автоматически через Husky hooks):**
  - `git commit` -> `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` -> `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- Ручной прогон этих команд обычно не нужен, кроме диагностики.
- После добавления модели обязателен новый релизный пакет для пользовательского retest.
- После пользовательского retest Codex анализирует свежие `.jsonl` / `.md` native capture логи и сравнивает `gpt-5.5` provider base/system instructions с уже снятыми `gpt-5.3-codex` и `gpt-5.4`.
- **Commit**: после зеленых gates — Git Commit с максимально релевантным описанием; `todo-plan.md` обновляется сразу после коммита с hash/status.
- Stream закрывается только после проверки лога пользователем и решения по дальнейшей стратегии compact Codex base instructions.
- Phase закрывается на чистом дереве и с актуальным `legacy session report placeholder (removed)`.

## Phase 0 — GPT-5.5 Planning Bootstrap (owner: Codex, updated: 2026-04-25)

### Stream: Planning And Recovery Context

1. [DONE] Create planning doc and active TODO plan for the GPT-5.5 Codex model addition — scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_GPT55_Model_Addition_1.2.76.md`, `doc/TODO/todo-plan.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; commit message: `docs: plan codex gpt 5.5 model addition`
2. [DONE] Git Commit: `docs: plan codex gpt 5.5 model addition` (hash: `618d40984`)

## Phase 1 — Codex GPT-5.5 Model Surface (owner: Codex, updated: 2026-04-25)

### Stream: Registry And Core Defaults

1. [DONE] Add `gpt-5.5` to the shared Codex settings model registry and Core settings/default snapshots — source scope: `src/types/codex-model-registry.ts`, `packages/core/src/config/provider-defaults-resolver.ts`, `packages/core/src/remote-bridge/handlers/settings-persistence-snapshot.ts`; generated bundle: `media/react-chat.js`; verification: `npm run build --workspace=@codeai-hub/core`, `npm run build:webview`, `npm run typecheck:webview`; commit message: `feat: add codex gpt 5.5 model option`
2. [DONE] Git Commit: `feat: add codex gpt 5.5 model option` (hash: `741c9544c`)

## Phase 2 — GPT-5.5 Capture Release (owner: Codex, updated: 2026-04-25)

### Stream: Release Package For User Retest

1. [DONE] Prepare release notes for the next version with the new GPT-5.5 Codex model option — scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; commit message: `docs: prepare codex gpt 5.5 release notes`
2. [DONE] Git Commit: `docs: prepare codex gpt 5.5 release notes` (hash: `ccb749218`)
3. [DONE] Build a new release package and stop for user retest — scope: release-generated version files, `doc/TODO/todo-plan.md`; release target: `1.2.76`; artifacts: `codeai-hub-1.2.76.vsix`, `doc/tmp/releases/codex-module-1.2.76.tar.bz2`, `doc/tmp/releases/codeai-hub-core-darwin-arm64-1.2.76.tar.bz2`, `doc/tmp/releases/project-manager-1.2.76.tar.bz2`, `doc/tmp/releases/vscode-webview-1.2.76.tar.bz2`, `doc/tmp/releases/CodeAIHubLauncher-macos-arm64-1.2.76.tar.bz2`; verification: `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`; commit message: `chore: build codex gpt 5.5 capture release`
4. [DONE] Git Commit: `chore: build codex gpt 5.5 capture release` (hash: `a696a523f`)

## Phase 3 — GPT-5.5 Prompt Inventory (owner: Codex, updated: 2026-04-25)

### Stream: User Capture Analysis

1. [DONE] Analyze user-provided GPT-5.5 native capture logs and compare provider base/system instructions with `gpt-5.3-codex` and `gpt-5.4` — result: `gpt-5.5` has a distinct provider base prompt; evidence: `2026-04-25T10-51-29-554Z` selected/applied `gpt-5.5`, no `thread/start.baseInstructions`, `config.project_doc_max_bytes = 0`, `instructionSources: []`, workflow prompt length/hash `12973` / `90054eee3308614b58dcc59671fa7d117f9e649d558e95e10d205fa492c192a8`, tools count/hash `18` / `a1a33140218a5d234965813f26cb0ac2d1e3edb6044aa7c78bb33c88f2829a33`, base instructions length/hash `21335` / `c2a980bc28af132eb89e0b4c68ae884043faae83a1afd3fd4889f7e8a1ada7b0`; scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_GPT55_Model_Addition_1.2.76.md`, `doc/TODO/todo-plan.md`; commit message: `docs: record codex gpt 5.5 prompt inventory`
2. [DONE] Git Commit: `docs: record codex gpt 5.5 prompt inventory` (hash: `a9becb9f2`)

## Phase 4 — Instruction Stack Experiment Consolidation (owner: Codex, updated: 2026-04-25)

### Stream: Results Bundle And Early Architecture Prompt

1. [DONE] Move Claude/Codex instruction analysis artifacts out of `doc/tmp`, create an experiment result bundle, and rewrite `Codex_My_System_Prompt.md` as a universal early-architecture system prompt candidate for `Description`, `Virtual Simulation`, and `Diagram Modules` — scope: `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Instruction_Stack_Control_Experiment_Results/`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/TODO/todo-plan.md`; commit message: `docs: consolidate instruction stack experiment results`
2. [DONE] Git Commit: `docs: consolidate instruction stack experiment results` (hash: `d415417f6`)
3. [DONE] Add the shared progress-update instruction block to the Codex and Claude custom system prompt candidates — scope: `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Instruction_Stack_Control_Experiment_Results/codex-instruction-analysis/Codex_My_System_Prompt.md`, `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Instruction_Stack_Control_Experiment_Results/claude-instruction-analysis/Claude_My_System_Prompt.md`, `doc/TODO/todo-plan.md`; verification: prompt section grep, Claude JSON fence parse; commit message: `docs: add progress update rules to custom prompts`
4. [DONE] Git Commit: `docs: add progress update rules to custom prompts` (hash: `33935eb2c`)
5. [DONE] Convert `Claude_My_System_Prompt.md` from extracted JSON capture format to a direct Markdown prompt body so it matches the insertable format of `Codex_My_System_Prompt.md` — scope: `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Instruction_Stack_Control_Experiment_Results/claude-instruction-analysis/Claude_My_System_Prompt.md`, `doc/TODO/todo-plan.md`; verification: prompt header/readback and git diff; commit message: `docs: make claude custom prompt insertable`
6. [DONE] Git Commit: `docs: make claude custom prompt insertable` (hash: `5ee7f3e45`)

## Phase 5 — Final Instruction Profile Runtime Release (owner: Codex, updated: 2026-04-25)

### Stream: Runtime Prompt Wiring And Retest Release

1. [DONE] Add the shared Codex early-architecture instruction profile and apply it to diagnostic `thread/start` with `project_doc_max_bytes = 0` — scope: Codex prompt/profile helper, `packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.ts`, `packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.test.ts`; verification: `npm run build --workspace=@codeai-hub/codex-app-server-module`, `node --test packages/Codex_AppServer_Module/dist/diagnostics/codex-native-request-capture-service.test.js`; commit message: `feat: apply codex prompt profile to diagnostics`
2. [DONE] Git Commit: `feat: apply codex prompt profile to diagnostics` (hash: `c9ea96530`)
3. [DONE] Apply the same Codex instruction profile to normal runtime `thread/start` while keeping turn templates in `turn/start.input` — scope: `packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.ts`, `packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.test.ts`, `doc/TODO/todo-plan.md`; verification: `npm run build --workspace=@codeai-hub/codex-app-server-module`, `node --test packages/Codex_AppServer_Module/dist/app-server/codex-app-server-facade.test.js packages/Codex_AppServer_Module/dist/diagnostics/codex-native-request-capture-service.test.js`; commit message: `feat: apply codex prompt profile to runtime`
4. [DONE] Git Commit: `feat: apply codex prompt profile to runtime` (hash: `febecdec3`)
5. [DONE] Add the shared Claude workflow system prompt helper and apply it to diagnostic capture while preserving `settingSources: []` — scope: Claude prompt helper, `packages/Claude_Module/src/diagnostics/claude-native-request-capture-service.ts`, `packages/Claude_Module/src/diagnostics/claude-native-request-capture-service.test.ts`; verification: `npm run build --workspace=@codeai-hub/claude-module`, `node --test packages/Claude_Module/dist/diagnostics/claude-native-request-capture-service.test.js`; commit message: `feat: apply claude prompt profile to diagnostics`
6. [DONE] Git Commit: `feat: apply claude prompt profile to diagnostics` (hash: `65a616f16`)
7. [DONE] Apply the same Claude workflow system prompt to normal SDK query options while preserving `settingSources: []` — scope: `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`, `packages/Claude_Module/src/sdk/claude-sdk-manager.test.ts`, `doc/TODO/todo-plan.md`; verification: `npm run build --workspace=@codeai-hub/claude-module`, `node --test packages/Claude_Module/dist/sdk/claude-sdk-manager.test.js packages/Claude_Module/dist/diagnostics/claude-native-request-capture-service.test.js`; commit message: `feat: apply claude prompt profile to runtime`
8. [DONE] Git Commit: `feat: apply claude prompt profile to runtime` (hash: `e3164b65c`)
9. [DONE] Update SSOT docs, release notes, and targeted verification for the final instruction-profile retest release — scope: `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/SolidWorks-WorkFlow/Modules/Claude.md`, `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Instruction_Stack_Control_Experiment_Results/Experiment_Results.md`, `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; verification: grep for final prompt constants/release notes; commit message: `docs: prepare instruction profile retest release`
10. [DONE] Git Commit: `docs: prepare instruction profile retest release` (hash: `fb972fc96`)
11. [DONE] Build the new release package and stop for user retest — scope: generated version/release artifacts, `doc/TODO/todo-plan.md`, `legacy session report (removed)`; release target: `1.2.77`; artifacts: `codeai-hub-1.2.77.vsix`, `doc/tmp/releases/claude-module-1.2.77.tar.bz2`, `doc/tmp/releases/codex-module-1.2.77.tar.bz2`, `doc/tmp/releases/gemini-module-1.2.77.tar.bz2`, `doc/tmp/releases/codeai-hub-core-darwin-arm64-1.2.77.tar.bz2`, `doc/tmp/releases/project-manager-1.2.77.tar.bz2`, `doc/tmp/releases/vscode-webview-1.2.77.tar.bz2`, `doc/tmp/releases/CodeAIHubLauncher-macos-arm64-1.2.77.tar.bz2`; verification: `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`; commit message: `chore: build instruction profile retest release`
12. [DONE] Git Commit: `chore: build instruction profile retest release` (hash: `a03b8e9f2`)

## Phase 6 — Provider Startup Auto-Update And Claude Preflight (owner: Codex, updated: 2026-04-25)

### Stream: Startup Update Policy And Claude Readiness

1. [DONE] Restore Core startup auto-update from Project Manager settings — scope: `packages/core/src/orchestrator/core-orchestrator.ts`, Core settings/provider-version service files, tests/docs; verification: `npm run build --workspace=@codeai-hub/core`, `node --test packages/core/dist/remote-bridge/handlers/settings-provider-auto-update-service.test.js`; commit message: `fix: restore provider startup auto update`
2. [DONE] Git Commit: `fix: restore provider startup auto update` (hash: `a13385f9d`)
3. [DONE] Make Claude auth preflight use the installed executable path instead of interactive `npx` — scope: `packages/Claude_Module/src/auth/`, Claude SDK/diagnostic/translation call sites, tests; verification: `npm run build --workspace=@codeai-hub/claude-module`, `node --test packages/Claude_Module/dist/sdk/claude-sdk-manager.test.js packages/Claude_Module/dist/diagnostics/claude-native-request-capture-service.test.js packages/Claude_Module/dist/translation/claude-haiku-translation-service.test.js`; commit message: `fix: use installed claude executable for auth preflight`
4. [DONE] Git Commit: `fix: use installed claude executable for auth preflight` (hash: `00a8a78dd`)
5. [DONE] Return `provider_not_ready` for known native-capture providers whose adapter is not initialized — scope: `packages/core/src/provider-network-capture/`, bridge result types/tests; verification: `npm run build --workspace=@codeai-hub/core`, `node --test packages/core/dist/provider-network-capture/native-request-capture-facade.test.js`; commit message: `fix: report provider readiness in native capture`
6. [DONE] Git Commit: `fix: report provider readiness in native capture` (hash: `78cb0deae`)
7. [DONE] Update SSOT docs and release notes for the provider startup readiness release — scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Modules/Claude.md`, `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`, `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; commit message: `docs: prepare provider readiness release`
8. [DONE] Git Commit: `docs: prepare provider readiness release` (hash: `a1f0cd36a`)
9. [DONE] Build the new release package and stop for user retest — scope: generated version/release artifacts, `doc/TODO/todo-plan.md`, `legacy session report (removed)`; release target: `1.2.78`; artifacts: `codeai-hub-1.2.78.vsix`, `doc/tmp/releases/claude-module-1.2.78.tar.bz2`, `doc/tmp/releases/codex-module-1.2.78.tar.bz2`, `doc/tmp/releases/gemini-module-1.2.78.tar.bz2`, `doc/tmp/releases/codeai-hub-core-darwin-arm64-1.2.78.tar.bz2`, `doc/tmp/releases/project-manager-1.2.78.tar.bz2`, `doc/tmp/releases/vscode-webview-1.2.78.tar.bz2`, `doc/tmp/releases/CodeAIHubLauncher-macos-arm64-1.2.78.tar.bz2`; verification: `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`; commit message: `chore: build provider readiness release`
10. [DONE] Git Commit: `chore: bump provider readiness release version` (hash: `92b7c06ef`)

## Phase 7 — Native Capture Markdown Deduplication (owner: Codex, updated: 2026-04-25)

### Stream: Readable Markdown Without Raw Payload Repetition

1. [DONE] Remove repeated large raw payload printing from native-capture Markdown while preserving full JSONL evidence — scope: `packages/core/src/provider-network-capture/native-request-capture-markdown.ts`, writer/facade tests, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; verification: `npm run lint`, `npm run build --workspace=@codeai-hub/core`, `node --test packages/core/dist/provider-network-capture/native-request-capture-writer.test.js packages/core/dist/provider-network-capture/native-request-capture-facade.test.js`; commit message: `fix: dedupe native capture markdown payloads`
2. [DONE] Git Commit: `fix: dedupe native capture markdown payloads` (hash: `ad70fa745b3b04483a73a7bf49fba840f2d0841d`)
3. [DONE] Prepare release notes for native-capture Markdown dedupe retest — scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; release target: `1.2.79`; commit message: `docs: prepare native capture markdown dedupe release`
4. [DONE] Git Commit: `docs: prepare native capture markdown dedupe release` (hash: `10e6de6f0d2b15c06468dd8b4108ee254db2cadc`)
5. [DONE] Build the new release package and stop for user retest — scope: generated version/release artifacts, `doc/TODO/todo-plan.md`, `legacy session report (removed)`; release target: `1.2.79`; artifacts: `codeai-hub-1.2.79.vsix`, `doc/tmp/releases/claude-module-1.2.79.tar.bz2`, `doc/tmp/releases/codex-module-1.2.79.tar.bz2`, `doc/tmp/releases/gemini-module-1.2.79.tar.bz2`, `doc/tmp/releases/codeai-hub-core-darwin-arm64-1.2.79.tar.bz2`, `doc/tmp/releases/project-manager-1.2.79.tar.bz2`, `doc/tmp/releases/vscode-webview-1.2.79.tar.bz2`, `doc/tmp/releases/CodeAIHubLauncher-macos-arm64-1.2.79.tar.bz2`; verification: `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`; commit message: `chore: build native capture markdown dedupe release`
6. [DONE] Git Commit: `chore: bump native capture markdown dedupe release version` (hash: `e3252b47986593e09f1ae62892b9a7b5ce34b5bf`)
7. [DONE] Verify user retest logs for Claude and Codex Markdown dedupe — scope: `/Users/oleksandroliinyk/.codeai-hub/logs/native-request-capture/2026-04-25T14-07-59-765Z-claude-native-request.*`, `/Users/oleksandroliinyk/.codeai-hub/logs/native-request-capture/2026-04-25T14-08-10-831Z-codex-native-request.*`; result: Claude Markdown `# Draft v4` appears once in `Extracted Messages`, Codex custom system prompt appears once in `Extracted System Prompt`, JSONL preserves full captured payloads; commit message: `docs: record native capture markdown dedupe retest`
8. [DONE] Git Commit: `docs: record native capture markdown dedupe retest` (hash: `f23ed1459d9fbc0067ebec845d2228ca05fbe605`)

## Phase 8 — Claude Workflow Tool Profile Allowlist (owner: Codex, updated: 2026-04-25)

### Stream: Remove Agent And Skill Tool Noise From Claude Workflow Requests

1. [DONE] Plan the Claude `tools` allowlist experiment and update navigation docs — scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Claude_Workflow_Tool_Profile_Allowlist_1.2.80.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/TODO/todo-plan.md`; expected retest: Claude native `body.tools` should contain only `Read`, `Write`, `Edit`; commit message: `docs: plan claude workflow tool allowlist test`
2. [DONE] Git Commit: `docs: plan claude workflow tool allowlist test` (hash: `c2f23a718d4a1f49b6a1a4e608015d1661fd6e41`)
3. [DONE] Apply explicit Claude workflow tool profile to runtime and diagnostic capture — scope: `packages/Claude_Module/src/sdk/claude-workflow-system-prompt.ts`, `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`, `packages/Claude_Module/src/diagnostics/claude-native-request-capture-service.ts`; expected commit message: `test: add claude workflow tool allowlist`
4. [DONE] Git Commit: `test: add claude workflow tool allowlist` (hash: `72e2857ce918d2c3de3652be4212ae7ed69c16df`)
5. [DONE] Add targeted tests for the Claude `Read` / `Write` / `Edit` tool profile — scope: `packages/Claude_Module/src/sdk/claude-sdk-manager.test.ts`, `packages/Claude_Module/src/diagnostics/claude-native-request-capture-service.test.ts`; verification: `npm run build --workspace=@codeai-hub/claude-module`, direct node tests for both files; expected commit message: `test: cover claude workflow tool allowlist`
6. [DONE] Git Commit: `test: cover claude workflow tool allowlist` (hash: `3ec42208ef1c98a5c74acf1a71405f005f483d28`)
7. [DONE] Update SSOT docs and release notes for Claude tool allowlist retest — scope: `doc/SolidWorks-WorkFlow/Modules/Claude.md`, `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Instruction_Stack_Control_Experiment_Results/Experiment_Results.md`, `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; release target: `1.2.80`; expected commit message: `docs: prepare claude tool allowlist release`
8. [DONE] Git Commit: `docs: prepare claude tool allowlist release` (hash: `521a23550a9f648f1abf178fd1e686fc292d9bd2`)
9. [DONE] Build the new release package and stop for user retest — scope: generated version/release artifacts, `doc/TODO/todo-plan.md`, `legacy session report (removed)`; release target: `1.2.80`; artifacts: `codeai-hub-1.2.80.vsix`, `doc/tmp/releases/claude-module-1.2.80.tar.bz2`, `doc/tmp/releases/codex-module-1.2.80.tar.bz2`, `doc/tmp/releases/gemini-module-1.2.80.tar.bz2`, `doc/tmp/releases/codeai-hub-core-darwin-arm64-1.2.80.tar.bz2`, `doc/tmp/releases/project-manager-1.2.80.tar.bz2`, `doc/tmp/releases/vscode-webview-1.2.80.tar.bz2`, `doc/tmp/releases/CodeAIHubLauncher-macos-arm64-1.2.80.tar.bz2`; verification: `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`; expected retest: Claude native `body.tools` should contain only `Read`, `Write`, `Edit`
10. [DONE] Git Commit: `chore: bump claude tool allowlist release version` (hash: `1f52e53e9800d5db95ca76b294ff75c6dc88239e`)
11. [DONE] Verify user retest logs for Claude tool allowlist — scope: `/Users/oleksandroliinyk/.codeai-hub/logs/native-request-capture/2026-04-25T14-38-27-844Z-claude-native-request.*`, `doc/SolidWorks-WorkFlow/Plans/Archive/Claude_Workflow_Tool_Profile_Allowlist_1.2.80.md`, `doc/TODO/todo-plan.md`; result: `body.tools` contains only `Edit`, `Read`, `Write`; `Agent`, `Skill`, `ToolSearch`, and subagent wording are absent from tool declarations; expected commit message: `docs: record claude tool allowlist retest`
12. [DONE] Git Commit: `docs: record claude tool allowlist retest` (hash: `b49ee52b2f400b2bbb0f5aef4c39354480f43e8b`)

## Phase 9 — Codex Multi-Agent Tool Profile Flag (owner: Codex, updated: 2026-04-25)

### Stream: Remove Subagent Tool Noise From Codex Workflow Requests

1. [DONE] Plan the Codex `multi_agent` feature flag experiment and update navigation docs — scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_Workflow_MultiAgent_Tool_Profile_Flag_1.2.81.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/TODO/todo-plan.md`; expected retest: Codex native `body.tools` should drop the subagent family `spawn_agent`, `send_input`, `resume_agent`, `wait_agent`, `close_agent`; commit message: `docs: plan codex multi agent tool flag test`
2. [DONE] Git Commit: `docs: plan codex multi agent tool flag test` (hash: `d2bdf270613e1361b11c9bc82c205d4d92a329c4`)
3. [DONE] Start CodeAI Hub Codex App Server with `--disable multi_agent` for runtime and diagnostic capture — scope: `packages/Codex_AppServer_Module/src/app-server/process/codex-app-server-process.ts`, `packages/Codex_AppServer_Module/src/app-server/process/codex-app-server-process.test.ts`, `doc/TODO/todo-plan.md`; verification: `npm run build --workspace=@codeai-hub/codex-app-server-module`, direct node tests for process/facade/diagnostics; expected commit message: `test: disable codex multi agent tool profile`
4. [DONE] Git Commit: `test: disable codex multi agent tool profile` (hash: `f8618dfd8fcaa99608dd71ce6d4fdbf47a1e0644`)
5. [DONE] Update Codex SSOT docs and release notes for the multi-agent tool profile retest — scope: `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Instruction_Stack_Control_Experiment_Results/Experiment_Results.md`, `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; release target: `1.2.81`; expected commit message: `docs: prepare codex multi agent tool flag release`
6. [DONE] Git Commit: `docs: prepare codex multi agent tool flag release` (hash: `45972c0e8fe6f66fdd8e767c3f7374e92cab533e`)
7. [DONE] Build the new release package and stop for user retest — scope: generated version/release artifacts, `doc/TODO/todo-plan.md`, `legacy session report (removed)`; release target: `1.2.81`; artifacts: `codeai-hub-1.2.81.vsix`, `doc/tmp/releases/claude-module-1.2.81.tar.bz2`, `doc/tmp/releases/codex-module-1.2.81.tar.bz2`, `doc/tmp/releases/gemini-module-1.2.81.tar.bz2`, `doc/tmp/releases/codeai-hub-core-darwin-arm64-1.2.81.tar.bz2`, `doc/tmp/releases/project-manager-1.2.81.tar.bz2`, `doc/tmp/releases/vscode-webview-1.2.81.tar.bz2`, `doc/tmp/releases/CodeAIHubLauncher-macos-arm64-1.2.81.tar.bz2`; verification: `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`; expected retest: Codex native `body.tools` should not contain `spawn_agent`, `send_input`, `resume_agent`, `wait_agent`, `close_agent`
8. [DONE] Git Commit: `chore: bump codex multi agent tool flag release version` (hash: `2d9fc1489`)
9. [DONE] Verify user retest logs for Codex `--disable multi_agent` — scope: `/Users/oleksandroliinyk/.codeai-hub/logs/native-request-capture/2026-04-25T14-59-13-002Z-codex-native-request.*`, `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_Workflow_MultiAgent_Tool_Profile_Flag_1.2.81.md`, `doc/TODO/todo-plan.md`; result: `body.tools` dropped from `18` to `13`, removed `spawn_agent`, `send_input`, `resume_agent`, `wait_agent`, `close_agent`; controls stable: base instructions hash `20a9fda290415bad2b2fd0f1fe05fd65f2f34eb4743cf3565eafcf01955f48eb`, workflow prompt hash `90054eee3308614b58dcc59671fa7d117f9e649d558e95e10d205fa492c192a8`, `project_doc_max_bytes = 0`, `instructionSources = []`; expected commit message: `docs: record codex multi agent retest`
10. [DONE] Git Commit: `docs: record codex multi agent retest` (hash: `866f4bb66`)

## Phase 10 — Codex Documentation Tool Profile (owner: Codex, updated: 2026-04-25)

### Stream: Remove Non-Documentation Tools From Codex Requests

1. [DONE] Plan and implement a CodeAI Hub-owned Codex documentation tool profile using only confirmed App Server startup flags/config overrides — scope: `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Instruction_Stack_Control_Experiment_Results/Codex_Workflow_Documentation_Tool_Profile.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `packages/Codex_AppServer_Module/src/app-server/process/codex-app-server-process.ts`, `packages/Codex_AppServer_Module/src/app-server/process/codex-app-server-process.test.ts`, `doc/TODO/todo-plan.md`; target removal: `mcp__playwright__`, `mcp__codex__`, MCP resource tools, `image_generation`, plugin/app surfaces; target keep: `exec_command`, `write_stdin`, `apply_patch`, `update_plan`, `web_search`, `view_image`; note: `request_user_input` has no confirmed removal knob and must be verified by retest; verification: `npm run build --workspace=@codeai-hub/codex-app-server-module`, direct node tests for process/facade/diagnostics; expected commit message: `test: narrow codex documentation tool profile`
2. [DONE] Git Commit: `test: narrow codex documentation tool profile` (hash: `b1d8f8e07`)
3. [DONE] Update Codex SSOT docs and release notes for the documentation tool profile retest — scope: `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; release target: `1.2.82`; verification: release notes and Codex module SSOT updated; expected commit message: `docs: prepare codex documentation tool profile release`
4. [DONE] Git Commit: `docs: prepare codex documentation tool profile release` (hash: `afadc6b75`)
5. [DONE] Build the new release package and stop for user retest — scope: generated version/release artifacts, `doc/TODO/todo-plan.md`, `legacy session report (removed)`; release target: `1.2.82`; artifacts: `codeai-hub-1.2.82.vsix`, `doc/tmp/releases/claude-module-1.2.82.tar.bz2`, `doc/tmp/releases/codex-module-1.2.82.tar.bz2`, `doc/tmp/releases/gemini-module-1.2.82.tar.bz2`, `doc/tmp/releases/codeai-hub-core-darwin-arm64-1.2.82.tar.bz2`, `doc/tmp/releases/project-manager-1.2.82.tar.bz2`, `doc/tmp/releases/vscode-webview-1.2.82.tar.bz2`, `doc/tmp/releases/CodeAIHubLauncher-macos-arm64-1.2.82.tar.bz2`; verification: `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`; expected retest: Codex native `body.tools` should keep shell/patch/plan/web/view-image tools and remove browser/playwright, nested Codex MCP, MCP resources, and image generation if confirmed by provider-native JSONL
6. [DONE] Git Commit: `chore: bump codex documentation tool profile release version` (hash: `7c1fd6636`)
7. [DONE] Verify user retest logs for Codex documentation tool profile — scope: `/Users/oleksandroliinyk/.codeai-hub/logs/native-request-capture/2026-04-25T15-27-58-551Z-codex-native-request.*`, `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Instruction_Stack_Control_Experiment_Results/Codex_Workflow_Documentation_Tool_Profile.md`, `doc/TODO/todo-plan.md`; result: `body.tools` dropped from `13` to `7`; kept `exec_command`, `write_stdin`, `update_plan`, `request_user_input`, `apply_patch`, `web_search`, `view_image`; removed `mcp__playwright__`, `mcp__codex__`, MCP resource tools, and `image_generation`; controls stable: base instructions hash `20a9fda290415bad2b2fd0f1fe05fd65f2f34eb4743cf3565eafcf01955f48eb`, workflow prompt hash `90054eee3308614b58dcc59671fa7d117f9e649d558e95e10d205fa492c192a8`, `project_doc_max_bytes = 0`, `instructionSources = []`; remaining follow-up: investigate `request_user_input`; expected commit message: `docs: record codex documentation tool profile retest`
8. [DONE] Git Commit: `docs: record codex documentation tool profile retest` (hash: `1318ea202`)

## Phase 11 — Instruction Stack Result Bundle Cleanup (owner: Codex, updated: 2026-04-25)

### Stream: Move Codex Tool Profile Evidence Into Experiment Results

1. [DONE] Move the completed Codex documentation tool-profile protocol into the instruction-stack experiment result bundle and record release `1.2.82` as the current Codex documentation-tree baseline — scope: `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Instruction_Stack_Control_Experiment_Results/Codex_Workflow_Documentation_Tool_Profile.md`, `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Instruction_Stack_Control_Experiment_Results/Experiment_Results.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: consolidate codex documentation tool profile results`
2. [DONE] Git Commit: `docs: consolidate codex documentation tool profile results` (hash: `b196dcd0b`)
