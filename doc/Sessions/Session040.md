# Session 40 — Stop/Continue Input Lock + Codex Stop Abort (1.2.3 → 1.2.6)

**Date:** 2026-04-17 09:30 CEST
**Branch:** main
**Version:** 1.2.6
**Execution Scope Status:** COMPLETED

---

# 1. Work Done in This Session

## 1.1. Стартовая проблема

Пользователь на 1.2.2 retest нашёл: после Stop во время генерации Claude turn и последующей отправки `Продолжай`, resume работает корректно — content приходит, но input panel остаётся разблокированным, wait-copy overlay `Agents is working, please wait...` не показывается. Обычный turn блокирует input правильно; регрессия только в Stop → Continue pipe.

## 1.2. Phase 1 — Core diagnostic release 1.2.3

Статический анализ дал три равновероятных candidate:
1. Stale `turn_failed` от Claude `adapter.closeSession` abort доходит до живой подписки до invalidate.
2. `providerSessionStatus=pending` после rebind блокирует `running` snapshot в PM.
3. `adapter.sendMessage` throws синхронно после rebind, catch эмитит `idle`.

Делать fix вслепую было бы рискованно (Session 039 precedent: xhigh fix потребовал диагностики). Выпустили **1.2.3** — trace-only Core логи в `~/.codeai-hub/logs/core/core.log` с префиксом `stopdiag_`:
- `stop-action.ts` — полный lifecycle (begin, close_done, invalidate_done, emit_idle + lifecycle_pre, finalize_flow_lock);
- `stop-rebind.ts` — gate, begin, create_done с `supportsImmediateBinding`, seed_done, attach_done;
- `message-dispatch.ts` — begin, resolve_binding, emit_running, send_done / send_error;
- `runtime-callbacks.ts` — `emitTurnStateEvent` с truncated stack trace (7 frames) из `new Error().stack`;
- `provider-event-router.ts` — typed_event, handle_typed, turn_failed.

## 1.3. 1.2.3 retest — Codex baseline bug discovery

На Codex Description resume пользователь нажал Stop 9 раз, но ничего не происходило — `adapter.closeSession` висел на `await` до момента, когда Codex сам эмитнул `turn_completed` (2 минуты). Тогда все 9 параллельных `handleStop` разом прогнали cleanup за 15 ms. Это — **отдельная baseline-проблема в Codex**, выделена в scope 1.2.6.

## 1.4. Phase 2 — PM-side diagnostic release 1.2.4

На Claude Stop → Continue retest Core-trace показал: **`turn_state=running` эмитится идеально** (из `dispatchUserMessage`, потом из `turn_started`), никаких перекрывающих `idle` не было. Все три начальные гипотезы опровергнуты.

Но session ID менялся: до Stop активна `0e3f1142`, после Stop появилась `4add602b` с тем же `providerSessionId`, но `pmdiag_dialog_active_session_changed` для swap'а не сработал — значит PM **не переключал** активную session. Стало ясно: root cause на PM стороне.

Выпустили **1.2.4** — PM-side trace через `api.logDiagnostic` в новый файл `~/.codeai-hub/logs/project-manager/project-manager.log` (отдельно от Core/Launcher, с env override `CODEAI_PROJECT_MANAGER_LOG_FILE`):
- `pmdiag_api_stop_session` / `pmdiag_api_send_session_message` на каждый outbound click;
- `pmdiag_workspace_snapshot_apply` с полным per-session summary;
- `pmdiag_active_session_changed` на `setActiveSessionId` transition с truncated stack;
- `pmdiag_dialog_active_session_changed` на swap'е `session.id` в dialog controller.

Core `stopdiag_` логи из 1.2.3 сохранены для correlation.

## 1.5. 1.2.4 retest — root cause подтверждён

В `project-manager.log`:
- До Stop: `pmdiag_dialog_active_session_changed from=null to=0e3f1142`.
- Stop click → `pmdiag_api_stop_session` на `0e3f1142`, turnState=idle, providerSessionId=null.
- **Новая selectionId** `a7cca454` + новая session `4add602b` в snapshot с тем же `providerSessionId=23703e8f`.
- **НЕТ** `pmdiag_dialog_active_session_changed` для `0e3f1142 → 4add602b` swap.
- Continue → snapshot `4add602b` turnState=**running** ✅ (Core работает), но UI смотрит старую `0e3f1142` (idle).

Точка бага: `useProjectManagerDialogSessionController.onSessionCreated` проверял `current.binding.status !== "ready"` для adoption, но `onSessionBinding` обновлял **только** snapshot.binding, не `SessionRecord.binding`, — поэтому `current.binding.status` оставался `"ready"`, `isRestoreMaterialization=false`, shouldAdopt=false → UI не переключался.

## 1.6. Phase 3 — Fix + Cleanup release 1.2.5

- **PM fix**: `useProjectManagerDialogSessionController` теперь:
  1. `onSessionBinding` mirror-ит в `SessionRecord.binding` + snapshot.binding.
  2. Запоминает old `providerSessionId` в `lastProviderSessionIdRef` на момент его reset to null.
  3. `onSessionCreated` получает новую ветку `isPostStopRebindSwap`: adopt если `status !== "ready" + currentProviderSessionId === null + createdProviderSessionId === lastProviderSessionIdRef`.
  4. Placeholder cleanup и ref reset покрывают новую ветку.
- **Cleanup**: весь `stopdiag_` (5 Core файлов) и `pmdiag_` (4 PM файлов) удалён; Core `pm:diag:log` handler вернулся в `logger.info → core.log` (отдельный appender убран).
- **Invariant 28 в SystemArchitecture**: post-stop rebind session adoption контракт зафиксирован.
- **Planning-doc 1.2.3** заархивирован в `Plans/Archive/`.

Retest 1.2.5 на Claude PASSED ✅ — input блокируется корректно после Stop → Continue.

## 1.7. Phase 4 — Codex Stop abort release 1.2.6

Исследовал Codex runtime: `streamCodexExec` в `codex-sdk-patches.ts` spawn-ит `codex exec` через `child_process.spawn` и блокируется в `for await (const line of rl)` на stdout child'а. `adapter.closeSession` до этого просто resolve-ил outer generator с null, но child жил и readline ждал следующей stdout line.

- **Codex subprocess abort**: патч теперь регистрирует `ChildProcess` в module-scoped Map keyed by `threadId`, экспортирует `killActiveCodexProcess(threadId)` → `SIGTERM`. `CodexSessionManager.closeSession` вызывает hook **до** `lifecycle.closeSession` и `processingLoop` await. Exit code `null` (SIGTERM) теперь принимается как clean exit.
- **PM Stop-button debounce**: `InputPanel` получил `stopInFlight` state, сбрасывается когда `agentBusy` → false. `InputPlayStopButton` теперь поддерживает `stopPending` prop (disabled + aria-label `Stopping current turn…`).
- **Core handleStop re-entry guard**: early-return на `hasStopInvalidatedBinding(sessionId)` — belt-and-suspenders.
- **Invariant 24 extended**: добавлено требование actually abort (Codex subprocess kill) + PM debounce. Canon расширен.

Retest 1.2.6 на Codex PASSED ✅ — Stop останавливает моментально, Continue работает как на Claude.

## Git commits

### 1.2.3 Core diagnostic
- `e1205614d chore: add stopdiag logs to session stop-action for 1.2.3`
- `7bfd6f54b chore: add stopdiag logs to session stop-rebind for 1.2.3`
- `0c5476090 chore: add stopdiag logs to session message-dispatch for 1.2.3`
- `a4788c6b0 chore: add stopdiag stack-capturing emit logs for 1.2.3`
- `5ba8fad30 chore: add stopdiag logs to session provider-event-router for 1.2.3`
- `9094331c3 docs: prepare 1.2.3 diagnostic release notes`
- `057adca0a chore: bump version to 1.2.3 for diagnostic release`
- `820aeccc7 docs: close 1.2.3 todo-plan after build`

### 1.2.4 PM-side diagnostic
- `a4425d09f chore: add pmdiag logs to PM api + snapshot apply for 1.2.4`
- `f9b7aa58d chore: write pm:diag:log to project-manager.log instead of core.log`
- `f0e7d7a6a chore: add pmdiag activeSessionId tracker logs for 1.2.4`
- `f98adf205 docs: prepare 1.2.4 PM-side diagnostic release notes`
- `f04b0802b chore: bump version to 1.2.4 for PM diagnostic release`
- `0cf2d1cc2 docs: close 1.2.4 todo-plan phase 2 after build`

### 1.2.5 Fix + Cleanup
- `7370e2f24 fix: adopt post-stop rebind session in PM dialog controller`
- `b781156f0 chore: remove 1.2.3 stopdiag core instrumentation`
- `5dd0e68fa chore: remove 1.2.4 pmdiag instrumentation`
- `fd7a59307 docs: prepare 1.2.5 fix release notes`
- `e1a44e52e docs: promote post-stop session adoption invariant, archive 1.2.3 diag plan`
- `47c912523 chore: bump version to 1.2.5 for fix release`
- `9bf6285c8 docs: close 1.2.5 todo-plan phase 3 after build`

### 1.2.6 Codex Stop Abort
- `802b008d9 docs: archive phase3 todo-plan and open 1.2.6 codex planning cycle`
- `d7636e9f0 fix: abort active codex subprocess on adapter.closeSession`
- `0a706daca fix: debounce PM stop button while close is in flight`
- `9ac4d8823 fix: guard handleStop re-entry when binding already invalidated`
- `0e41e988e docs: prepare 1.2.6 release notes and codex stop invariant`
- `f271b76bd chore: bump version to 1.2.6 for codex stop fix release`
- `432e85003 docs: archive 1.2.6 codex stop planning doc after release`

Все гейты (check-architecture.sh, ultracite, knip, core build, Codex module build, webview build, PM bundle build, typecheck:webview, SDK exclusions, check:links, check:dup) зелёные на каждом commit'е.

## Artifacts
- VSIX `codeai-hub-1.2.6.vsix` (2.3M) в корне (1.2.3/1.2.4/1.2.5 VSIX перезаписаны по ходу сборки).
- Tarballs 1.2.6 в `doc/tmp/releases/` и `~/.codeai-hub/releases/`: claude/codex/gemini-module, core-darwin-arm64, project-manager, vscode-webview, CodeAIHubLauncher-macos-arm64.
- `doc/TODO/Archive/todo-plan-1.2.3-1.2.5-stop-continue-input-lock.md` и `todo-plan-1.2.6-codex-stop-abort.md`.
- `doc/SolidWorks-WorkFlow/Plans/Archive/StopResume_LockRegression_Diagnostic_1.2.3.md` и `Codex_Stop_Abort_And_PM_Debounce_1.2.6.md`.

---

# 2. Instructions for Next Session

**Base SSOT:** `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (важны Invariants 24 — shutdown-safe Stop + actual abort, 25 — live content, 27 — effort parity, 28 — post-stop rebind adoption).
**Scope Discovery Index:** `doc/SolidWorks-WorkFlow/Docs_Index.md`

## Plans for next session

- Активный execution scope отсутствует.
- Следующий агент обязан сначала прочитать `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` как базовый SSOT.
- Затем агент обязан согласовать с пользователем новый scope.
- После этого агент обязан открыть `doc/SolidWorks-WorkFlow/Docs_Index.md`, выбрать релевантные документы для нового scope и только потом формировать новый planning-doc.
- До появления нового planning-doc и нового `doc/TODO/todo-plan.md` навигационной опорой служит `doc/SolidWorks-WorkFlow/Docs_Index.md`.

## Известные кандидаты на следующий цикл

- **Gemini Stop → Continue retest** — не покрыт 1.2.3/1.2.4/1.2.5/1.2.6 retest'ами. Пользователь упомянул его как следующий этап. Возможные варианты:
  - Gemini ведёт себя как Claude (SDK сам abort-ит) → retest PASSED, ничего не трогаем.
  - Gemini ведёт себя как Codex (close не abort-ит underlying stream) → понадобится аналог `killActiveGeminiProcess` в Gemini module.
  - Gemini имеет свой уникальный variant → выпустим новый diagnostic release.

## Процессные заметки

- **Four-release diagnostic → fix cycle**: 1.2.3 (Core trace) → 1.2.4 (PM trace) → 1.2.5 (fix + cleanup diag) → 1.2.6 (Codex abort + PM debounce + guard). Это более длинная цепочка, чем обычный diagnostic → fix двойной релиз (Session 039 precedent был 1.2.0/1.2.1 diag → 1.2.2 fix), но она была оправдана: root cause оказался не в одном слое (Core), а в двух (PM adoption logic + Codex SDK-patch subprocess lifecycle), и попытки фиксить их вслепую были бы серьёзно рискованнее.
- **Отдельные log files по tier'ам**: launcher (native) / core (Node) / project-manager (CEF JS). PM log появился в 1.2.4, но был снят в 1.2.5 после того как fix подтвердил root cause. На будущее — если появится новая PM-layer диагностика, тот же паттерн с appender в `remote-bridge-message-router.ts` + env override `CODEAI_PROJECT_MANAGER_LOG_FILE` сразу готов.
- **PM диагностика через `api.logDiagnostic` транспорт** — proven path (Session 039 его не использовал). Не требует нового WebSocket канала или отдельного hosted logger, пишется через существующий `pm:diag:log` handler в Core.
- **Stack capture через `new Error().stack`** — дешёво и эффективно; 7 frames достаточно для discrimination между `stop-action`, `turn-completion`, `provider-event-router`, `message-dispatch` caller'ами (Core side) или между `setActiveSessionId` call sites (PM side).
- **Codex SDK-patch subprocess ownership**: @openai/codex-sdk 0.53.0 не экспортирует cancel API. CodeAI Hub owns-ит spawn через собственные SDK patches, поэтому abort реализован через module-scoped Map `threadId → ChildProcess` + exported `killActiveCodexProcess`. Если будущее обновление SDK добавит native cancel — текущий hook можно будет заменить на SDK-call.
