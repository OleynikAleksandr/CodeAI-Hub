# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- Каждая микро-задача затрагивает не более **3 файлов**.
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- После каждой микро-задачи обязательны гейты: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетные сборки.
- После зелёных гейтов — Git Commit и немедленный апдейт статусов/хешей в этом файле.

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `GEMINI.md` (или `/Users/oleksandroliinyk/.gemini/GEMINI.md`)
3. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 136 — Gemini Provider Token Continuity (owner: Oleksandr, updated: 2026-02-11)

**Goal:** сделать расход токенов Gemini управляемым как у других провайдеров: (1) лимит окна (tokens), (2) порог remaining % для continuity rollover, плюс нормализованный `token_usage` в стриме.

### Stream: Settings Defaults (Core + Extension)
1. [DONE] Core: добавить дефолты Gemini session continuity в persisted settings snapshot (`contextWindowTokenLimit=300000`, `remainingPercentThreshold=30`) + разрешить threshold-ключ `gemini` в Core continuity (scope: `packages/core/src/remote-bridge/handlers/settings-request-handler.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit message: `feat(core): gemini continuity settings and threshold`)
2. [DONE] Git Commit: `feat(core): gemini continuity settings and threshold` (hash: c0f20347)
3. [DONE] Extension: добавить Gemini session continuity defaults в settings snapshot + нормализацию/клампы (scope: `src/extension-module/settings/gemini-settings.ts`; expected commit message: `feat(settings): add gemini continuity defaults`)
4. [DONE] Git Commit: `feat(settings): add gemini continuity defaults` (hash: e5c05bdc)

### Stream: Settings UI (Webview)
1. [DONE] UI: вынести типы `ProviderVersions` в отдельный micro-файл, чтобы не пробить лимит 300 строк (scope: `src/client/ui/src/components/settings/provider-versions-model.ts`; expected commit message: `refactor(ui): extract provider versions model`)
2. [DONE] Git Commit: `refactor(ui): extract provider versions model` (hash: 7c334d84)
3. [DONE] UI: расширить settings model для Gemini session continuity (`contextWindowTokenLimit`, `remainingPercentThreshold`) (scope: `src/client/ui/src/components/settings/settings-state-model.ts`, `src/client/ui/src/components/settings/settings-state-raw.ts`, `src/client/ui/src/components/settings/gemini-mapping.ts`; expected commit message: `feat(ui): add gemini continuity settings model`)
4. [DONE] Git Commit: `feat(ui): add gemini continuity settings model` (hash: e3ff0fad)
5. [DONE] UI: добавить update helpers + handlers в `useSettingsState` для Gemini continuity (scope: `src/client/ui/src/components/settings/settings-state-helpers.ts`, `src/client/ui/src/components/settings/use-settings-state.ts`, `src/client/ui/src/components/settings/use-settings-state-support.ts`; expected commit message: `feat(ui): wire gemini continuity settings state`)
6. [DONE] Git Commit: `feat(ui): wire gemini continuity settings state` (hash: 9f295b16)
7. [DONE] UI: показать Gemini continuity controls в Settings (scope: `src/client/ui/src/components/settings-view.tsx`, `src/client/ui/src/components/settings/session-continuity-card.tsx`; expected commit message: `feat(ui): add gemini continuity controls`)
8. [DONE] Git Commit: `feat(ui): add gemini continuity controls` (hash: 976bdab1)

### Stream: Gemini Provider Token Usage
1. [DONE] Gemini: эмитить нормализованный `token_usage` в stream на основе `usageMetadata.totalTokenCount` и `contextWindowTokenLimit` из settings snapshot (scope: `packages/Gemini_Module/src/session/gemini-session-manager.ts`, `packages/Gemini_Module/src/session/types.ts`; expected commit message: `feat(gemini): emit token usage from totalTokenCount`)
2. [DONE] Git Commit: `feat(gemini): emit token usage from totalTokenCount` (hash: c3b41d34)

### Stream: Release Build (Phase 136)
1. [DONE] Выполнить `./scripts/build-all.sh` (версия: `1.1.556`) (scope: manifests; expected commit message: `chore(release): run build-all for gemini token continuity`)
2. [DONE] Git Commit: `chore(release): run build-all for gemini token continuity` (hash: 0f33d10c)
3. [DONE] Выполнить `./scripts/build-release.sh --use-current-version` и собрать новый VSIX (`codeai-hub-1.1.556.vsix`) (scope: scripts; expected commit message: `chore(release): build and validate vsix for v1.1.556`)
4. [DONE] Git Commit: `chore(release): build and validate vsix for v1.1.556` (hash: 3891af76)
5. [DONE] Синхронизировать `README.md`, `CHANGELOG.md` и `doc/SolidWorks-Flow/System/SystemArchitecture.md` под фактическую версию после `build-all/build-release` (scope: `README.md`, `CHANGELOG.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `docs(release): sync root notes and system architecture for v1.1.556`)
6. [DONE] Git Commit: `docs(release): sync root notes and system architecture for v1.1.556` (hash: 202eb9cc)

---

## Phase 137 — Gemini CLI Workspace Tool Access (owner: Oleksandr, updated: 2026-02-11)

**Goal:** стабилизировать workflow-агентов Gemini (Description/Reviewer) — tool-calls (`read_file`/`write_file`) должны иметь доступ к workspace артефактам `.codeai-hub/**` без ошибок вида `Path not in workspace`.

### Stream: Gemini CLI includeDirectories
1. [DONE] Gemini: добавить `workspacePath` в `includeDirectories` CLI, чтобы tool-calls могли читать/писать `.codeai-hub/**` артефакты (scope: `packages/Gemini_Module/src/session/gemini-session-manager.ts`, `packages/Gemini_Module/src/session/gemini-session-manager.test.ts`; expected commit message: `fix(gemini): allow workspace path in cli includeDirectories`)
2. [DONE] Git Commit: `fix(gemini): allow workspace path in cli includeDirectories` (hash: 175de8fd)
3. [DONE] Выполнить `./scripts/build-all.sh` (версия: `1.1.557`) (scope: manifests; expected commit message: `chore(release): run build-all for gemini workspace tool access`)
4. [DONE] Git Commit: `chore(release): run build-all for gemini workspace tool access` (hash: e2f3764f)
5. [DONE] Выполнить `./scripts/build-release.sh --use-current-version` и собрать новый VSIX (`codeai-hub-1.1.557.vsix`) (scope: scripts; expected commit message: `chore(release): build and validate vsix for v1.1.557`)
6. [DONE] Git Commit: `chore(release): build and validate vsix for v1.1.557` (hash: 15673506)
7. [DONE] Синхронизировать `README.md`, `CHANGELOG.md` и `doc/SolidWorks-Flow/System/SystemArchitecture.md` под фактическую версию `1.1.557` (scope: `README.md`, `CHANGELOG.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `docs(release): sync root notes and system architecture for v1.1.557`)
8. [DONE] Git Commit: `docs(release): sync root notes and system architecture for v1.1.557` (hash: caa96b6e)
9. [DONE] Docs: добавить session report `doc/Sessions/Session013.md` (scope: `doc/Sessions/Session013.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(session): add Session013 for v1.1.557`)
10. [DONE] Git Commit: `docs(session): add Session013 for v1.1.557` (hash: e4217265)
