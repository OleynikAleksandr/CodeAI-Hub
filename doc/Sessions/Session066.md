# Session 066 — Workflow submit diagnostics release 1.1.716

**Date:** 2026-03-06 21:26 (CET)
**Branch:** main
**Version:** 1.1.716

---

# 1. Work Done in This Session

## Work summary
- Открыт `Phase 292` и реализован сквозной diagnostics trail для workflow submit path Codex: `outboundAttemptId` теперь проходит через Project Manager, Core bridge, Core session handler и Codex transport trace.
- В Core добавлен file-backed JSONL trace `~/.codeai-hub/logs/core/dialog-send-trace.jsonl`, покрывающий:
  - PM lifecycle `pm.dialog_send.clicked/ws_dispatched/ack_received/history_refresh_requested/history_refresh_result`
  - Core routing/delivery stages `core.dialog_send.received/scope_resolved/chain_resolved/session_resolved/handle_message_*/history_append_*/adapter_dispatch_*`
- В Codex transport trace `~/.codeai-hub/logs/codex/sdk-codex-<providerSessionId>.jsonl` добавлены:
  - correlation по `outboundAttemptId` в `outbound.enqueue/dequeue/turn.begin/run_streamed.begin/first_event`
  - child-process boundaries `outbound.child.spawned/stdin_write_started/stdin_write_finished/stdout_first_line/exit/killed`
- В PM добавлен bridge-backed trace helper и regression coverage для одного send-attempt от click до history refresh; это синхронизировано с Core runtime tests.
- Синхронизированы SSOT и release docs:
  - [Codex_Workflow_Submit_Diagnostics.md](../SolidWorks-WorkFlow/Contracts/Codex_Workflow_Submit_Diagnostics.md)
  - [SystemArchitecture.md](../SolidWorks-WorkFlow/System/SystemArchitecture.md)
  - [Docs_Index.md](../SolidWorks-WorkFlow/Docs_Index.md)
  - [Codex.md](../SolidWorks-WorkFlow/Modules/Codex.md)
  - `README.md`
  - `CHANGELOG.md`
- Прогнаны targeted verification и release pipeline:
  - `npm run build:project-manager`
  - `npm run build:core`
  - `npm run build --workspace=@codeai-hub/codex-module`
  - `node --import tsx --test packages/core/src/remote-bridge/handlers/session-request-handler.test.ts packages/core/src/remote-bridge/index.test.ts src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts src/client/project-manager/components/sessions/dialog-send-trace-client.test.ts`
  - `./scripts/build-all.sh`
  - `./scripts/build-release.sh --use-current-version`
- Первый прогон `build-release` упал на `typecheck:webview`: [dialog-send-trace-client.ts](../../src/client/project-manager/services/dialog-send-trace-client.ts) принимал `IncomingMessage.payload` слишком широко. Проблема снята отдельным commit-fix `fix(pm): narrow dialog trace incoming payload types`, после чего `build-release` успешно дошёл до `Verifying SDK exclusions`, `Removing dev dependencies before packaging...` и `✅ Package created`.
- Собраны локальные артефакты релиза:
  - `codeai-hub-1.1.716.vsix`
  - свежие tarball'ы в `~/.codeai-hub/releases/`
  - свежие tarball'ы в `doc/tmp/releases/`
- После релиза пользователь прогнал live smoke `v1.1.716`:
  - в `Description` для Codex не наблюдалось сбоев;
  - infinite session / continuity rollover при пороге `80%` context window отработал штатно и перевёл workflow на новый `providerSessionId`;
  - параллельная workflow-сессия в другом workspace с Claude также отработала без видимых проблем.
- Проведена ручная проверка живых логов:
  - `~/.codeai-hub/logs/core/dialog-send-trace.jsonl` действительно пишет полную PM/Core цепочку для Codex и Claude;
  - `~/.codeai-hub/logs/codex/sdk-codex-<providerSessionId>.jsonl` действительно пишет processor breadcrumbs и child-process boundaries;
  - при этом persisted provider-side trace пока не содержит `outboundAttemptId`, поэтому cross-file join между Core trace и provider trace всё ещё делается по `providerSessionId/threadId + timestamp`, а не по идеальному correlation key.
- По итогам architecture discussion оформлен новый SSOT:
  - [Codex_Workflow_TurnStarted_ACK.md](../SolidWorks-WorkFlow/Contracts/Codex_Workflow_TurnStarted_ACK.md)
  - правило зафиксировано жёстко: единственный runtime truth source для verdict delivered/failed у Codex submit — `sdk:turn.started`; diagnostics JSONL и provider rollout остаются только диагностическими источниками.
- Проведён живой adapter-level эксперимент по обоим провайдерам:
  - Codex resume-path подтвердил, что первый provider feedback после submit — `sdk:thread.started`, а достаточный ACK для начала нового turn — `sdk:turn.started`;
  - Claude resume-path показал, что текущий `turn_started` в модуле эмитится локально до provider feedback и потому не может считаться provider ACK;
  - earliest raw Claude SDK feedback в observed resume-path начинается с `sdk:system (subtype=init)`, а первый пригодный provider-native ACK для начала нового turn приходит как `sdk:stream_event` с `message_start`.
- Для Claude оформлен отдельный SSOT:
  - [Claude_Workflow_TurnStarted_ACK.md](../SolidWorks-WorkFlow/Contracts/Claude_Workflow_TurnStarted_ACK.md)
  - правило зафиксировано жёстко: единственный runtime truth source для verdict delivered/failed у Claude submit — provider-originated `sdk:stream_event(message_start)`; локальный `turn_started`, `sdk:system(init)` и diagnostics trail остаются только вспомогательными сигналами.

## Git commits
- `bd41a123 docs(plan): open phase 292 workflow submit diagnostics`
- `82682d06 feat(trace): add outbound attempt id to dialog send contract`
- `8015c9c4 feat(core): add dialog send trace log`
- `1d3074bd feat(core): trace outbound message handling stages`
- `0c20df56 test(core): cover dialog send trace stages`
- `4203f328 docs(plan): sync phase 292 trace progress`
- `1e2dc939 feat(codex): correlate outbound attempts in sdk trace`
- `e54d7f90 docs(plan): sync phase 292 transport trace progress`
- `3bed35fe feat(codex): trace child process send boundaries`
- `fb95b5d4 docs(plan): sync phase 292 child trace progress`
- `21e6feeb feat(pm): trace dialog send lifecycle to core log`
- `a09aadda test(pm): cover outbound attempt trace flow`
- `372c3416 docs(plan): sync phase 292 pm trace progress`
- `b626e192 docs(trace): sync workflow submit diagnostics contract`
- `0650fafb test(trace): verify workflow submit diagnostics chain`
- `3b550e18 docs(plan): sync phase 292 verification progress`
- `54e17edb docs(release): sync workflow submit diagnostics notes`
- `9ff09ace docs(plan): sync phase 292 release notes progress`
- `b7a2e71f chore(release): build-all v1.1.716 workflow submit diagnostics`
- `e1079c2b docs(plan): sync phase 292 build-all progress`
- `1c742da2 fix(pm): narrow dialog trace incoming payload types`
- `8933c383 chore(release): build-release v1.1.716 workflow submit diagnostics`
- `40c7f0d1 docs(session): record workflow submit diagnostics release`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/Modules/Codex.md`
5. `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_Submit_Diagnostics.md`
6. `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_TurnStarted_ACK.md`
7. `doc/SolidWorks-WorkFlow/Contracts/Claude_Workflow_TurnStarted_ACK.md`
8. `doc/SolidWorks-WorkFlow/Modules/Claude.md`
9. `doc/TODO/Archive/todo-plan-up-to-phase292-2026-03-06.md`
10. `doc/TODO/todo-plan.md`
11. `doc/Sessions/Session066.md` (THIS REPORT)

## Runtime artifacts worth remembering
- `~/.codeai-hub/logs/core/dialog-send-trace.jsonl`
- `~/.codeai-hub/logs/codex/sdk-codex-<providerSessionId>.jsonl`
- `~/.codeai-hub/logs/claude/sdk-claude-<providerSessionId>.jsonl`
- `codeai-hub-1.1.716.vsix`
- `doc/tmp/releases/CodeAIHubLauncher-macos-arm64-1.1.716.tar.bz2`
- `doc/tmp/releases/codeai-hub-core-darwin-arm64-1.1.716.tar.bz2`
- `doc/tmp/releases/codex-module-1.1.716.tar.bz2`

## Plans for next session
- Для Codex использовать новый single-source ACK contract: delivered verdict опирается только на `sdk:turn.started`, без rollout reconciliation в runtime state machine.
- Если будет принято решение делать resend UX, сначала отдельно спроектировать outbox/pending/failed payload contract, а не выводить его автоматически из текущего ACK SSOT.
- Для Claude отдельно решить, как именно пробросить и использовать `sdk:stream_event(message_start)` в Core/PM state machine без смешения с локальным `turn_started`, а затем спроектировать resend UX поверх этого single-source ACK.
