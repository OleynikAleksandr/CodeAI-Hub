# Session 066 — Workflow submit diagnostics planning for Codex

**Date:** 2026-03-06 17:02 (CET)
**Branch:** main
**Version:** 1.1.715

---

# 1. Work Done in This Session

## Work summary
- Проведён разбор проблемы "user submit не уходит в Codex workflow session" с разделением на две независимые темы:
  - главная проблема: сообщение пользователя может не дойти до provider-side turn;
  - вторичная проблема: PM dialog может не отобразить уже доставленное сообщение без forced rehydrate.
- Повторно разобран текущий runtime path отправки сообщения:
  - PM `dialog:send` -> Core `handleDialogSend`/`handleMessage`
  - ранняя запись user-message в unified session JSONL
  - передача в Codex adapter / SDK manager / processor queue
  - запуск patched `codex exec --experimental-json` как отдельного child process на каждый turn
  - возврат provider events в Core и повторная запись assistant/thinking в unified session JSONL.
- Зафиксирован архитектурный вывод: для следующей implementation-фазы сначала нужна не логика retry/recovery, а точная сквозная диагностика submit path.
- Создан новый SSOT-контракт диагностического логирования submit path:
  - [Codex_Workflow_Submit_Diagnostics.md](/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_Submit_Diagnostics.md)
  - канонические места записи логов:
    - `~/.codeai-hub/logs/core/dialog-send-trace.jsonl`
    - `~/.codeai-hub/logs/codex/sdk-codex-<providerSessionId>.jsonl`
- Полностью заменён `doc/TODO/todo-plan.md` на новую `Phase 292`, посвящённую только диагностическому trace submit path, без старта реализации.
- Обновлены индексные/системные документы, чтобы следующий сеанс мог стартовать прямо по diagnostics-phase:
  - [SystemArchitecture.md](/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-WorkFlow/System/SystemArchitecture.md)
  - [Docs_Index.md](/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-WorkFlow/Docs_Index.md)
  - [Codex.md](/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-WorkFlow/Modules/Codex.md)
- Код в этой сессии не менялся. Реализация плана не начиналась. Коммиты не делались.

## Current uncommitted workspace state
- Текущее рабочее дерево dirty только из-за документации и планирования:
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/TODO/todo-plan.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_Submit_Diagnostics.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_UserTurn_Delivery.md`
  - `doc/TODO/Archive/todo-plan-up-to-phase291-2026-03-06.md`

## Git commits
(ВАЖНО: В этой сессии git commit не выполнялся; работа существует только в незакоммиченных документах)
- `No commits in this session`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/Modules/Codex.md`
5. `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_Submit_Diagnostics.md`
6. `doc/TODO/todo-plan.md`
7. `doc/Sessions/Session065.md`
8. `doc/Sessions/Session066.md` (THIS REPORT)

## Additional context to read before implementation
1. `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_UserTurn_Delivery.md`
2. `doc/TODO/Archive/todo-plan-up-to-phase291-2026-03-06.md`
3. `packages/core/src/remote-bridge/handlers/session-request-handler.ts`
4. `packages/Codex_Module/src/messaging/message-processor.ts`
5. `packages/Codex_Module/src/sdk/codex-sdk-patches.ts`
6. `packages/Codex_Module/src/provider/codex-provider-adapter.ts`
7. `src/client/project-manager/services/dialog-api.ts`
8. `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts`
9. `src/client/project-manager/components/sessions/use-project-manager-dialog-core-events.ts`

## Runtime artifacts worth remembering
- Проблемный unified session JSONL:
  - `/Users/oleksandroliinyk/.codeai-hub/sessions/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub-codex-5-4/codexCli/codex-6a9110dc-68d5-45ae-8ab1-02071ce5ae05-description.jsonl`
- Проблемный provider rollout JSONL:
  - `/Users/oleksandroliinyk/.codeai-hub/providers/codex/home/sessions/2026/03/06/rollout-2026-03-06T15-07-13-019cc379-4fb3-7652-ad08-4f2e97b2c648.jsonl`
- Проблемный SDK trace:
  - `/Users/oleksandroliinyk/.codeai-hub/logs/codex/sdk-codex-019cc379-4fb3-7652-ad08-4f2e97b2c648.jsonl`

## Plans for next session
- Начать строго с `Phase 292` из `doc/TODO/todo-plan.md`, не переходя к resend/recovery logic раньше завершения diagnostics-phase.
- Первый implementation stream: ввести `outboundAttemptId` и пронести его через PM/Core/Codex path.
- Сразу после этого добавить file-backed trace в `~/.codeai-hub/logs/core/dialog-send-trace.jsonl`.
- Затем расширить существующий Codex trace `~/.codeai-hub/logs/codex/sdk-codex-<providerSessionId>.jsonl`, чтобы видеть `spawn/stdin/first_event/timeout/exit`.
- Только после появления точной диагностики возвращаться к обсуждению фактического исправления доставки и UI resend.
