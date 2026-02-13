# Session 041 — Unified Agent Dialog JSONL (UI History Survives Core Restarts)

**Date:** 2026-02-13 17:19 (CET)
**Branch:** codex/phase156-unified-agent-dialog
**Version:** 1.1.584

---

# 1. Work Done in This Session

## Work summary
- Зафиксирована причина потери истории сессии в UI после рестарта Core: `description-step.json` хранит `jsonlPath` на последний сегментный JSONL (`<providerSessionId>.jsonl`), поэтому UI грузит только “последний кусок”.
- Подтверждена текущая модель хранения unified-session: один JSONL на `providerSessionId` в `~/.codeai-hub/sessions/<workspaceKey>/<providerId>/<providerSessionId>.jsonl`.
- Выбран и утверждён новый контракт: один накопительный JSONL на “логический диалог агента” (переживает rollover/resume и рестарты Core) и работает одинаково для всех провайдеров.

## Git commits
- TBD

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/Sessions/Session041.md`
2. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/TODO/todo-plan.md`
3. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Stacks/CoreOrchestrator.md`

## Plans for next session
- Реализовать стабильный `agentDialogSessionId` для history JSONL, который не меняется при rollover/resume.
- Перепривязать `description-step.json.session.jsonlPath` на накопительный JSONL.
- Добавить backfill/merge: при наличии нескольких сегментных файлов собрать их в один накопительный JSONL (дедуп по `messageId`, сортировка по `timestamp`) для корректного восстановления истории после рестарта.
- Пройти гейты и собрать новый релиз.
