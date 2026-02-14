# Session 049 — DialogId Refactor: планирование и архитектурная фиксация

**Date:** 2026-02-14 15:35 (CET)
**Branch:** codex/phase156-unified-agent-dialog
**Version:** 1.1.594

**Architecture (source of truth for next sessions):**
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`

---

# 1. Work Done in This Session

## Work summary
- Зафиксирован целевой дизайн “бесконечных” диалогов агентов на ключе `dialogId`.
- Уточнены инварианты:
  - `dialogId` = basename накопительного UI JSONL (`.../<dialogId>.jsonl`).
  - routing user turn: Core берёт `providerSessionId` как `segments[segments.length - 1].providerSessionId` из `chain.json`.
  - `historyJsonlPath` пишет только Core (PM read-only).
  - live stream события обязаны нести `dialogId`, чтобы PM маршрутизировал сообщения в правильный tab.
- Добавлен per-workspace реестр `continuity/index.json` для быстрого `dialog:list`.
- Обновлён план разработки: заархивирован Phase 161 и создан новый `doc/TODO/todo-plan.md` под реализацию рефакторинга (Phases 162–166).

## Git commits (key)
- `e36e2577 docs(flow): draft refactor architecture (dialogs + continuity routing)`
- `c2e59f76 docs(flow): clarify split (show dialog vs send) + mark history restore unstable`
- `ad14137e docs(flow): pin routing to last segments[].providerSessionId`
- `55798a97 docs(flow): make dialogId equal history jsonl basename (key for chain)`
- `7eb184ab docs(flow): define unified pipeline for live + replay (same normalizer/dedupe)`
- `207db558 docs(flow): pin dialogId-only tabs + core-only history writer + tree click binding`
- `1ad5b0e5 docs(flow): add dialogId interfaces + dialogId format + messageId source`
- `5f8ed057 docs(flow): add continuity index.json registry for dialog:list`
- `6dcb1fed docs(todo): archive Phase161; start dialogId refactor plan (Phases 162-166)`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`
2. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/TODO/todo-plan.md`
3. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/Sessions/Session049.md` (THIS REPORT)

## Plans for next session
- Начать реализацию Phase 162 (Core):
  - `continuity/index.json` (dialog registry).
  - `dialog:*` endpoints + `dialog:message` WS event.
- Затем Phase 163–164 (PM): persistence `activeDialogId/openDialogIds/treeBindings`, replay history by `dialogId`, live routing by `dialogId`.
- В конце каждой Phase создавать короткий phase-report (см. `doc/TODO/todo-plan.md`).
