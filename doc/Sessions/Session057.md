# Session 057 — План: Dialog SSOT (JSONL) для live + рестартов (без реализации)

**Date:** 2026-02-15 12:27 CET
**Branch:** codex/phase156-unified-agent-dialog
**Version:** 1.1.603

---

# 1. Work Done in This Session

## Context / observed failures
- В real-time панели диалога проявляются рассинхронизации: user‑сообщения могут не появляться сразу, но появляются после reload PM.
- После cold start (PM+Core restart) UI может стартовать в “пустой сессии”, пока пользователь не кликнет по агенту/диалогу в дереве.
- Divider “Новая сессия” и token summary `#1 (..%) | #2 (..%) | ...` ведут себя нестабильно из-за смешивания источников (snapshots/virtual conversation vs JSONL marker/meta) и legacy UI‑хаков.
- Есть старый баг: разблокировка ввода может происходить не строго по границе завершения turn’а → риск “отправки в никуда”.

## Decision
Принято направление: **единый источник правды для ленты диалога** = канонический JSONL (`~/.codeai-hub/sessions/**/<dialogId>.jsonl`).
- Любая отрисовка ленты (и live, и после рестартов) должна строиться из одного канала: `history(full)` + `append(tail)`.
- Snapshots/chain используются только для Status (locks/rollover/usage), но не для ленты.

## Docs / planning
- `doc/TODO/todo-plan.md` заархивирован по запросу пользователя в:
  - `doc/TODO/Archive/todo-plan-phase188-release-1.1.603-dialog-jsonl-ssot-2026-02-15.md`
- Создан новый `doc/TODO/todo-plan.md` с фазами 189–193:
  - Phase 189: дизайн/контракты SSOT pipeline;
  - Phase 190: Core history+tail API + cold start resolve + append ordering;
  - Phase 191: PM/UI переход на JSONL feed, дедуп/ID, автоселекция, divider/summary только из JSONL;
  - Phase 192: строгий input lock/unlock по turn boundaries;
  - Phase 193: release stream.

## Git commits
(ВАЖНО: по этим коммитам восстанавливаем контекст через `git show`)
- `cee5e75e docs(todo): archive prior plan and start ssot phases`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/Sessions/Session057.md` (THIS REPORT)
2. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/TODO/todo-plan.md` (Phase 189–193)
3. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`

## Plans for next session
- Выполнить Phase 189 (контракт SSOT pipeline) и начать Phase 190 (Core API history+tail + cold start resolve) — строго микрозадачами ≤3 файлов и с обязательными commit‑шагами.
