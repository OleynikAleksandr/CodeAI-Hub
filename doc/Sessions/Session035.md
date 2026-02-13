# Session 035 — Continuity Report Ack/Retry + Unblock UI (Plan Kickoff)

**Date:** 2026-02-13 10:46 (CET)
**Branch:** main
**Version:** 1.1.579

---

# 1. Work Done in This Session

## Work summary
- Разобран критичный баг зависания Session UI: после ответа агента Core оставляет состояние `Agent is working… Please wait.` и блокирует ввод.
- По фактам (core.log + provider-home rollout JSONL) установлено, что в проблемном случае Core инициирует internal continuity-turn `Flow Node Continuity — Create Report`, но инструкция **не доходит** до провайдера (в Codex rollout отсутствует), после чего Core 60s ждёт отсутствующий report-файл и остаётся в `working`.
- Сформулировано требование к надёжности: Core обязан иметь явное подтверждение доставки/старта internal continuity-turn (ack), делать retry в той же provider session, а при 2 неуспешных попытках снимать блокировку и показывать ошибку в UI (универсально для всех провайдеров).
- TODO-план Phase 151 заархивирован, создан новый `doc/TODO/todo-plan.md` под Phase 152 (continuity ack/retry + `continuity_failed` в UI) и добавлен docs-стрим с фокусом на `doc/SolidWorks-Flow/Stacks/CoreOrchestrator.md`.

## Evidence (key paths)
- Core log: `/Users/oleksandroliinyk/.codeai-hub/logs/core/core.log` (таймаут ожидания report-файла).
- Codex rollout (problem case): `/Users/oleksandroliinyk/.codeai-hub/providers/codex/home/sessions/2026/02/13/rollout-2026-02-13T09-35-43-019c5624-4572-72e1-8067-4375e98a955a.jsonl` (нет `Create Report`).
- Codex rollout (success case): `/Users/oleksandroliinyk/.codeai-hub/providers/codex/home/sessions/2026/02/13/rollout-2026-02-13T09-27-55-019c561d-21f6-7cd0-8be1-f4cd354bcfdf.jsonl` (есть `Create Report`, есть file-write, есть `Ready to continue working.`).
- Continuity reports:
  - success: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/.codeai-hub/codeai-hub/flow/nodes/description-reviewer/continuity/reports/2026-02-13T08-35-06-222Z-Reviewer-codexCli.md`
  - missing (hang): `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/.codeai-hub/codeai-hub/flow/nodes/description-reviewer/continuity/reports/2026-02-13T08-42-53-392Z-Reviewer-codexCli.md`

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `d15c429c docs(todo): archive phase151 plan and start phase152 continuity ack/retry`
- `28734670 docs(todo): add core orchestrator docs stream and keep release stream last`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Sessions/Session035.md` (THIS REPORT)
2. `doc/TODO/todo-plan.md`
3. `doc/SolidWorks-Flow/Stacks/CoreOrchestrator.md`
4. `doc/SolidWorks-Flow/System/SystemArchitecture.md`

## Plans for next session
- Реализовать Phase 152:
  - Core: handshake (requestId + ack stage) для internal `Create Report`.
  - Core: retry policy (2 attempts) и событие `continuity_failed` + гарантированное снятие `working`.
  - UI: показать ошибку `continuity_failed` и разблокировать ввод.
  - Docs: синхронизировать архитектуру/стэки (особенно CoreOrchestrator) и собрать релиз.
