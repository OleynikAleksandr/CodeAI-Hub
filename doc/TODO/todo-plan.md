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

---

## Phase 138 — Settings UX: Manual Numeric Inputs for Continuity (owner: Oleksandr, updated: 2026-02-11)

**Goal:** улучшить UX ввода continuity thresholds в Settings: вместо стрелок (spinner) — ручной ввод с контролем пределов (клампы) и нормализацией.

### Stream: Settings UI (Webview) — Continuity Inputs
1. [DONE] UI: заменить `type="number"` на ручной ввод без spinner для `remainingPercentThreshold` (все провайдеры) + применить bounded/clamp на commit (blur/Enter) (scope: `src/client/ui/src/components/settings/session-continuity-card.tsx`; expected commit message: `fix(ui): manual continuity percent input without spinners`)
2. [DONE] Git Commit: `fix(ui): manual continuity percent input without spinners` (hash: e3366c1a)
3. [DONE] UI (Gemini): сделать ручной ввод без spinner для `contextWindowTokenLimit` (tokens) + bounded/clamp на commit (blur/Enter) (scope: `src/client/ui/src/components/settings/session-continuity-card.tsx`; expected commit message: `fix(ui): manual gemini context window limit input without spinners`)
4. [DONE] Git Commit: `fix(ui): manual gemini context window limit input without spinners` (hash: 72b3b206)

### Stream: Release Build (Phase 138)
1. [DONE] Выполнить `./scripts/build-all.sh` (версия: `1.1.558`) (scope: manifests; expected commit message: `chore(release): run build-all for manual continuity inputs`)
2. [DONE] Git Commit: `chore(release): run build-all for manual continuity inputs` (hash: 0c00b109)
3. [DONE] Выполнить `./scripts/build-release.sh --use-current-version` и собрать новый VSIX (`codeai-hub-1.1.558.vsix`) (scope: scripts; expected commit message: `chore(release): build and validate vsix for v1.1.558`)
4. [DONE] Git Commit: `chore(release): build and validate vsix for v1.1.558` (hash: bf118c75)
5. [DONE] Синхронизировать `README.md`, `CHANGELOG.md` и `doc/SolidWorks-Flow/System/SystemArchitecture.md` под фактическую версию после `build-all/build-release` (scope: `README.md`, `CHANGELOG.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `docs(release): sync root notes and system architecture for v1.1.558`)
6. [DONE] Git Commit: `docs(release): sync root notes and system architecture for v1.1.558` (hash: 0dc5b521)

---

## Phase 139 — Gemini UX: Human-Readable Stream Errors + Release (owner: Oleksandr, updated: 2026-02-11)

**Goal:** исправить системные сообщения вида `[geminiCli] [object Object]` — извлекать человеко-читаемую ошибку из nested payload (`{ error: { message } }`).

### Stream: Gemini Stream Error Formatting
1. [DONE] Gemini: нормализовать сообщение stream error (nested `error.message` → строка), чтобы в UI отображалась реальная причина (scope: `packages/Gemini_Module/src/messaging/message-processor.ts`, `packages/Gemini_Module/src/messaging/message-processor.test.ts`; expected commit message: `fix(gemini): render nested stream error messages`)
2. [DONE] Git Commit: `fix(gemini): render nested stream error messages` (hash: ea8857ba)

### Stream: Release Build (Phase 139)
1. [DONE] Выполнить `./scripts/build-all.sh` (версия: `1.1.559`) (scope: manifests; expected commit message: `chore(release): run build-all for gemini stream error messaging`)
2. [DONE] Git Commit: `chore(release): run build-all for gemini stream error messaging` (hash: 1df7d0b3)
3. [DONE] Выполнить `./scripts/build-release.sh --use-current-version` и собрать новый VSIX (`codeai-hub-1.1.559.vsix`) (scope: scripts; expected commit message: `chore(release): build and validate vsix for v1.1.559`)
4. [DONE] Git Commit: `chore(release): build and validate vsix for v1.1.559` (hash: a432af87)
5. [DONE] Синхронизировать `README.md`, `CHANGELOG.md` и `doc/SolidWorks-Flow/System/SystemArchitecture.md` под фактическую версию после `build-all/build-release` (scope: `README.md`, `CHANGELOG.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `docs(release): sync root notes and system architecture for v1.1.559`)
6. [DONE] Git Commit: `docs(release): sync root notes and system architecture for v1.1.559` (hash: 05779dfa)

### Stream: Session Report (Phase 139)
1. [DONE] Docs: добавить session report `doc/Sessions/Session015.md` + обновить статус Phase 139 в `doc/TODO/todo-plan.md` (scope: `doc/Sessions/Session015.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(session): add Session015 for v1.1.559`)
2. [DONE] Git Commit: `docs(session): add Session015 for v1.1.559` (hash: fa080c05)

---

## Phase 140 — Description Flow Cleanup: Remove Curator + RU Prompts + Release (owner: Oleksandr, updated: 2026-02-11)

**Goal:** полностью удалить `Questionnaire Curator` из runtime, убрать побочные внутренние Gemini-сессии, и зафиксировать явное требование русского языка для `Description Agent` и `Reviewer Agent` (и артефакты, и ответы пользователю).

### Stream: Core Cleanup — Remove Questionnaire Curator
1. [DONE] Core: удалить интеграцию curator из session handler (без finalize-trigger side effects) (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit message: `refactor(core): remove questionnaire curator hook from session handler`)
2. [DONE] Git Commit: `refactor(core): remove questionnaire curator hook from session handler` (hash: 2d3ea787)
3. [DONE] Core: удалить runtime-классы curator (facade/service/provider runner) (scope: `packages/core/src/remote-bridge/handlers/questionnaire-curator-facade.ts`, `packages/core/src/remote-bridge/handlers/questionnaire-curator-service.ts`, `packages/core/src/remote-bridge/handlers/questionnaire-curator-provider-runner.ts`; expected commit message: `refactor(core): remove questionnaire curator runtime services`)
4. [DONE] Git Commit: `refactor(core): remove questionnaire curator runtime services` (hash: 777c445c)
5. [DONE] Core: удалить утилиты curator + шаблон curator (scope: `packages/core/src/remote-bridge/handlers/questionnaire-curator-append-sanitizer.ts`, `packages/core/src/remote-bridge/handlers/questionnaire-curator-transcript.ts`, `packages/agents/description-agent/assets/questionnaire-curator.md`; expected commit message: `refactor(core): remove questionnaire curator artifacts and helpers`)
6. [DONE] Git Commit: `refactor(core): remove questionnaire curator artifacts and helpers` (hash: abc23ddd)
7. [DONE] Core: убрать bundled template `description-questionnaire-curator` (scope: `packages/core/src/templates/bundled-templates.ts`; expected commit message: `refactor(core): drop bundled description questionnaire curator template`)
8. [DONE] Git Commit: `refactor(core): drop bundled description questionnaire curator template` (hash: 98bb643f)

### Stream: RU Language Contract for Description/Reviewer
1. [IN_PROGRESS] Prompts: добавить явное требование русского языка (коммуникация + артефакты) в prompts Description/Reviewer (scope: `packages/agents/description-agent/assets/description-collector-prompt.md`, `packages/agents/reviewer-agent/assets/reviewer-prompt.md`; expected commit message: `feat(agents): enforce russian language in description and reviewer prompts`)
2. [TODO] Git Commit: `feat(agents): enforce russian language in description and reviewer prompts` (hash: TBD)
3. [TODO] Core: усилить fallback reviewer prompt явным RU-требованием (scope: `packages/core/src/workflow/runtime/workflow-runtime.ts`; expected commit message: `feat(core): enforce russian language in reviewer fallback prompt`)
4. [TODO] Git Commit: `feat(core): enforce russian language in reviewer fallback prompt` (hash: TBD)
5. [TODO] Core: обновить bundled prompts после изменений шаблонов (scope: `packages/core/src/templates/bundled-templates.ts`; expected commit message: `chore(core): refresh bundled description and reviewer prompts`)
6. [TODO] Git Commit: `chore(core): refresh bundled description and reviewer prompts` (hash: TBD)

### Stream: Verification + Release Build (Phase 140)
1. [TODO] Прогнать обязательные гейты и таргетные сборки по затронутым пакетам (scope: `packages/core`, `packages/agents/description-agent`, `packages/agents/reviewer-agent`; expected commit message: `chore(checks): pass gates for phase 140 cleanup`)
2. [TODO] Git Commit: `chore(checks): pass gates for phase 140 cleanup` (hash: TBD)
3. [TODO] Выполнить `./scripts/build-all.sh` (ожидаемая версия: `1.1.560`) (scope: manifests; expected commit message: `chore(release): run build-all for phase 140 cleanup`)
4. [TODO] Git Commit: `chore(release): run build-all for phase 140 cleanup` (hash: TBD)
5. [TODO] Выполнить `./scripts/build-release.sh --use-current-version` и собрать новый VSIX (scope: scripts; expected commit message: `chore(release): build and validate vsix for v1.1.560`)
6. [TODO] Git Commit: `chore(release): build and validate vsix for v1.1.560` (hash: TBD)
7. [TODO] Синхронизировать `README.md`, `CHANGELOG.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md` и сессионный отчет (scope: `README.md`, `CHANGELOG.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`, `doc/Sessions/Session016.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(release): sync docs and session report for v1.1.560`)
8. [TODO] Git Commit: `docs(release): sync docs and session report for v1.1.560` (hash: TBD)
