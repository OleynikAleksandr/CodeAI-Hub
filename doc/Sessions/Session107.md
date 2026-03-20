# Session 107 — Codex GPT-5.4 Resume Recovery Repair

**Date:** 2026-03-20 09:56 (CET)
**Branch:** main
**Version:** 1.1.753

---

# 1. Work Done in This Session

## Work summary
- Продолжен artifact-driven workflow в mirrored workspace для шага `Diagram Modules` после утверждения `Final_Description.md` и `virtual-simulation.md`.
- Получены и зафиксированы вопросы агента `diagram_modules`; до записи `module-inventory.md` агент успел завершить первый turn вопросами, но сам artifact еще не создал.
- Исследован критичный bug recovery/reopen: после закрытия `Project Manager`, закрытия `VS Code`, остановки `Core` и повторного открытия workspace PM застревает в состоянии `Agent is working… Please wait.`, а ответы пользователя уходят в queue.
- Подтверждено, что проблема не связана с account switch / auth failure; корневая причина локализована в recovery-loop между PM continuity recovery, Core dialog/session recovery и special-case `Codex gpt-5.4 resume => fresh thread`.
- Реализован фикс в трех контурах: `Codex_Module` снова резюмирует `gpt-5.4` thread по обычному reopen path, core немедленно нормализует continuity для freshly rebound runtime session, PM дедуплицирует repeated restore requests по одному continuity entry.
- Выполнены таргетные проверки для `@codeai-hub/codex-module`, `@codeai-hub/core` и PM dialog snapshot replay; локальные regression tests и сборки прошли успешно.
- Синхронизированы release-facing docs и SSOT под новый bugfix release `v1.1.753`: `README`, `CHANGELOG`, `BugRegistry`, `SystemArchitecture`, `todo-plan`, planning/session reports.
- Выполнен `./scripts/build-all.sh`: собраны и упакованы provider modules, core, UI bundles и CEF launcher для `1.1.753`.
- Выполнен `./scripts/build-release.sh --use-current-version`: собран `codeai-hub-1.1.753.vsix`, release tail прошел через `Verifying SDK exclusions`, artefact validation, dev-deps prune/restore и `✅ Package created`.
- Во время первого `build-release` найден и исправлен дополнительный PM type-check regression в `dialog-session-bootstrap.ts` (`ProviderStackId | null` вместо слишком широкого `string | null`).
- Зафиксирован новый planning-doc под срочный bugfix и создан новый `todo-plan.md` (`Phase 17`) под реализацию фикса.
- Предыдущий полностью завершенный execution plan, доведенный до `Phase 16`, заархивирован.

## Investigation context

### Active repositories / workspaces

- Main repo / source of truth:
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub`
- Mirrored workspace for generated workflow artifacts:
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4`
- Mirrored workflow root under that workspace:
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4`
- Global runtime/log roots:
  - `/Users/oleksandroliinyk/.codeai-hub/`

### Workflow artifacts already validated before bug investigation

Mirrored workspace contains approved upstream artifacts:

- `questionnaire.md`:
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4/description/questionnaire.md`
- `Final_Description.md`:
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4/description/Final_Description.md`
- `virtual-simulation.md`:
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4/virtual_simulation/virtual-simulation.md`

`module-inventory.md` for `diagram_modules` is still absent at the end of this session.

### Diagram Modules dialog state at the moment of failure

The first `diagram_modules` turn completed normally and ended with three clarification questions. Evidence:

- Unified session JSONL:
  - `/Users/oleksandroliinyk/.codeai-hub/sessions/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub-codex-5-4/codexCli/codex-6e8d8c0b-d022-4226-9d5b-aa2c31982bcb-diagram-modules.jsonl`
- SDK log:
  - `/Users/oleksandroliinyk/.codeai-hub/logs/codex/sdk-codex-019d0a4a-b2ea-7101-bab2-215d1ca98ceb.jsonl`

Последнее содержательное assistant-message в dialog:

- вопросы по `workflow-state-gating`, `cef-launcher` и persistence split перед созданием `module-inventory.md`

То есть bug относится не к "зависшему provider turn", а к reopen/recovery после уже завершенного turn.

## Confirmed findings

### Finding 1 — account switch is not the root cause

В доступных логах не найдено подтверждений auth/account-specific failure для этого `diagram_modules` dialog:

- нет `401` / `403`
- нет `unauthorized` / `forbidden`
- нет Codex auth error
- нет quota/auth rejection, объясняющего stuck state

Checked logs:

- `/Users/oleksandroliinyk/.codeai-hub/logs/core/core.log`
- `/Users/oleksandroliinyk/.codeai-hub/logs/extension/extension.log`
- `/Users/oleksandroliinyk/.codeai-hub/logs/launcher/launcher.log`
- `/Users/oleksandroliinyk/.codeai-hub/logs/codex/*.jsonl`
- `/Users/oleksandroliinyk/.codeai-hub/providers/codex/home/sessions/2026/03/20/*.jsonl`

Conclusion:

- смена аккаунта совпала по времени, но не выглядит root cause;
- система должна была пережить это действие без infinite recovery loop.

### Finding 2 — PM queue symptom is real, but secondary

`Message queued. Sending as soon as it is ready…` объясняется тем, что PM пытается отправить сообщения до готовности websocket к Core:

- source:
  - `src/client/project-manager/api.ts`
- relevant logic:
  - `Socket not ready, message queued`

Evidence:

- source reference:
  - `src/client/project-manager/api.ts:222`
- PM Chromium log:
  - `/Users/oleksandroliinyk/.codeai-hub/data/project-manager/chrome_debug.log`

Conclusion:

- queueing itself не является root cause;
- это побочный симптом reconnect/cold-start окна.

### Finding 3 — continuity index for `diagram_modules` remains pinned to old provider session

Continuity index entry for `diagram_modules` still points to old provider thread:

- file:
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4/continuity/index.json`
- important values:
  - `stage = diagram_modules`
  - `latestSessionId = 6e8d8c0b-d022-4226-9d5b-aa2c31982bcb`
  - `providerSessionId = 019d0a4a-b2ea-7101-bab2-215d1ca98ceb`

Related chain file:

- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4/continuity/diagram_modules/codex-6e8d8c0b-d022-4226-9d5b-aa2c31982bcb-diagram-modules/chain.json`

### Finding 4 — workflow state file is stale and not aligned with actual current step

`workflow/state.json` in the mirrored workspace still points to `description` as last active stage:

- file:
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4/workflow/state.json`

Important observation:

- runtime reopen for this workspace cannot rely on `workflow/state.json` alone;
- dialog continuity becomes the dominant source for recovery in this scenario.

### Finding 5 — Core repeatedly attempts to resume the same old Codex thread

`core.log` contains repeated lines like:

- `Codex resume skipped for thread 019d0a4a-b2ea-7101-bab2-215d1ca98ceb because defaultModel=gpt-5.4; starting a new thread instead`

This repeats for a long period after Core restart, including around:

- `2026-03-20T08:35:00Z`
- `2026-03-20T08:45:25Z`
- `2026-03-20T08:46:53Z`

Primary evidence:

- `/Users/oleksandroliinyk/.codeai-hub/logs/core/core.log`

This proves:

- recovery is not a single failed attempt;
- Core is stuck in a repeated recovery cycle against the same stale provider session id.

## Root cause

### Short version

Bug is caused by the combination of:

1. PM dialog reopen logic asking Core to restore the old `providerSessionId` from continuity;
2. `Codex_Module` refusing a true resume for `gpt-5.4` and silently creating a fresh thread instead;
3. continuity/runtime reconciliation not normalizing that fresh thread back into the original dialog recovery contract;
4. PM then repeating the same restore request again.

### Relevant code references

#### PM reopen path

When PM opens a dialog and cannot find a runtime session for the continuity entry, it calls `api.createSession(...)` with the old `providerSessionId`:

- `src/client/project-manager/components/sessions/use-project-manager-dialog-core-events.ts:84`

#### Codex `gpt-5.4` special-case

`Codex_Module` contains an unconditional `gpt-5.4` branch in `resumeSession(...)`:

- `packages/Codex_Module/src/sdk/codex-sdk-manager.ts:288`

The logic explicitly says:

- if current default model is `gpt-5.4`, skip resume and start a fresh thread instead

#### Dialog list reconciliation limit

Dialog list reconciliation only helps when runtime sessions still match continuity by the same `providerSessionId`:

- `packages/core/src/remote-bridge/handlers/dialog-list-service.ts:56`

That is insufficient for the current failure mode because PM keeps reopening against the stale continuity `providerSessionId`, while Codex runtime silently substitutes a new thread.

### Why this special-case exists

This branch was introduced as a workaround for an older Codex model-selection problem:

- old Codex thread model was effectively sticky
- simple resume could keep using `gpt-5.3-codex` even when the saved user default had been changed to `gpt-5.4`

Relevant history:

- `doc/BugRegistry.md`
- `doc/Sessions/Session073.md`

The workaround is too broad:

- it is applied whenever `defaultModel = gpt-5.4`
- not only in the real migration case `old thread model != selected model`

Result:

- it breaks continuity/recovery semantics for normal reopen/resume scenarios.

## Important product conclusion

The user hypothesis is plausible:

- sessions without final downstream artifact are especially vulnerable because recovery depends more heavily on dialog continuity than on canonical artifact state.

But the deeper root cause is still:

- `gpt-5.4 fresh-thread-on-resume` workaround + missing continuity normalization + PM reopen retries

not:

- account switch itself
- provider auth problem
- stuck provider turn

## Planning and execution changes created in this session

### New planning doc

Created:

- `doc/SolidWorks-WorkFlow/Plans/Codex_GPT54_Resume_Recovery_Architecture.md`

Purpose:

- formalize the reproduction
- formalize the root cause
- define boundaries and verification scenario
- split implementation into concrete streams

### Previous execution plan archived

Archived completed plan:

- `doc/TODO/Archive/todo-plan-up-to-phase16-inventory-only-diagram-cleanup-2026-03-20.md`

This archived plan represents completed work through `Phase 16` and should not be edited further.

### New execution plan

Created new plan:

- `doc/TODO/todo-plan.md`

Current phase:

- `Phase 17 — Codex GPT-5.4 Resume Recovery Repair`

Streams in new plan:

1. `Planning baseline`
2. `Codex provider resume semantics`
3. `Core continuity normalization`
4. `Project Manager reopen behavior`
5. `Docs and verification`

## Files changed in this session

Created:

- `doc/SolidWorks-WorkFlow/Plans/Codex_GPT54_Resume_Recovery_Architecture.md`
- `doc/TODO/Archive/todo-plan-up-to-phase16-inventory-only-diagram-cleanup-2026-03-20.md` (archived by move from active todo plan path)
- `doc/TODO/todo-plan.md`
- `doc/Sessions/Session106.md`

## Git commits

- `63b66804 fix(codex): restore gpt54 resume semantics`
- `a812549d fix(core): normalize resumed codex continuity state`
- `04cb574a fix(pm): stop stale codex dialog reopen retries`
- `d257ab65 docs(recovery): record codex resume loop fix`
- `9e872284 chore(release): build codex resume recovery release`
- `40332e59 fix(pm): narrow dialog bootstrap provider typing`

Release verification state at the end of this session:

- `build-all` completed successfully for `1.1.753`;
- `build-release --use-current-version` completed successfully;
- VSIX artifact: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.1.753.vsix` (`1.4M`);
- local release caches updated under `~/.codeai-hub/releases/`.

---

# 2. Instructions for Next Session

## Required documents to review before work

1. `AGENTS.md`
2. `doc/SolidWorks-WorkFlow/README.md`
3. `doc/SolidWorks-WorkFlow/Docs_Index.md`
4. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
5. `doc/Sessions/Session106.md`
6. `doc/Sessions/Session107.md` (THIS REPORT)
7. `doc/SolidWorks-WorkFlow/Plans/Codex_GPT54_Resume_Recovery_Architecture.md`
8. `doc/TODO/todo-plan.md`

> Далее: если понадобится повторно разбирать этот bugfix, открыть прежде всего `packages/Codex_Module/src/sdk/`, `packages/core/src/remote-bridge/handlers/`, `src/client/project-manager/components/sessions/`, `doc/BugRegistry.md`, `doc/TODO/todo-plan.md`.

## Critical logs and runtime artifacts to keep in mind

1. Reproduction workspace:
   - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4`
2. Continuity index:
   - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4/continuity/index.json`
3. Workflow state snapshot:
   - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4/workflow/state.json`
4. Diagram Modules unified session JSONL:
   - `/Users/oleksandroliinyk/.codeai-hub/sessions/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub-codex-5-4/codexCli/codex-6e8d8c0b-d022-4226-9d5b-aa2c31982bcb-diagram-modules.jsonl`
5. SDK log for that turn:
   - `/Users/oleksandroliinyk/.codeai-hub/logs/codex/sdk-codex-019d0a4a-b2ea-7101-bab2-215d1ca98ceb.jsonl`
6. Core log with resume loop:
   - `/Users/oleksandroliinyk/.codeai-hub/logs/core/core.log`
7. PM chromium log with queue symptom:
   - `/Users/oleksandroliinyk/.codeai-hub/data/project-manager/chrome_debug.log`

## Release artifacts and critical references

### Release artifact

1. `codeai-hub-1.1.753.vsix`

### Key docs and code touched by the fix

1. `packages/Codex_Module/src/sdk/codex-sdk-manager.ts`
2. `packages/core/src/remote-bridge/handlers/session-request-handler.ts`
3. `src/client/project-manager/components/sessions/dialog-session-bootstrap.ts`
4. `src/client/project-manager/components/sessions/use-project-manager-dialog-core-events.ts`
5. `doc/BugRegistry.md`
6. `doc/TODO/todo-plan.md`
7. `doc/Sessions/Session107.md`

## Current repository state after release build

At the moment of writing this report the release build itself is complete. One final docs/session commit is still being prepared to record these verification results and hashes into `todo-plan` / `BugRegistry` / `Session107`.

## Plans for next session

- Если пользователю нужен live product smoke-check, повторить reproduction в mirrored workspace и убедиться, что reopen `diagram_modules` больше не застревает в perpetual `Agent is working…`.
- Если live smoke-check не требуется, следующий рабочий старт можно делать уже от baseline `v1.1.753` и выбирать новый scope поверх этого bugfix release.
