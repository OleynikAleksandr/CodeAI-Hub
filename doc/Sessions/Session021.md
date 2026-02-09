# Session 021 — Remove RUNS: RunStore cleanup in Core + Initiatives (Phase 63)

**Date:** 2026-01-20 13:23 (CET)
**Branch:** main
**Version:** 1.1.454

---

# 1. Work Done in This Session

## Work summary
- Удален auto-run слой и run-based provider bindings в Core; session:create больше не зависит от runs.
- Убрана синхронизация анкеты через RunStore; legacy run-путь зеркалится в канон `questionnaire.md`.
- Initiatives: удален RunStore/пути runs и `currentRunId` из `initiative.json`.
- API создания инициатив больше не создает initial run.
- `doc/TODO/todo-plan.md` обновлен с прогрессом и хешами.

## Verification
- `./scripts/check-architecture.sh` (PASS with warnings)
- `npx ultracite check` (OK)
- `npx ts-prune` (OK)
- `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"` (OK)
- `npm run check:links` (OK)
- `npm run build --workspace @codeai-hub/core` (OK)
- `npm run build:webview` (OK)
- `npm run typecheck:webview` (OK)

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `d3fc8584 docs(todo): record currentRunId removal`
- `bca3c716 refactor(initiatives): drop currentRunId`
- `db3a260f docs(todo): record run store removal`
- `275b08d1 refactor(initiatives): remove run store`
- `2224a8c1 docs(todo): record session handler cleanup`
- `e75e4f8e refactor(core): drop run store from session handler`
- `b7c22a61 docs(todo): record initial run removal`
- `8fa643ec refactor(core): remove initial run creation`
- `3ecb24fa docs(todo): record questionnaire sync removal`
- `90238eea refactor(core): drop run questionnaire sync`
- `8032def7 docs(todo): record auto-run removal`
- `31cbdd86 refactor(core): remove auto-run service`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/Workflow/Workflow_CLI_Steps_And_Watcher_Architecture.md`
3. `doc/SolidWorks-Flow/QuestionnaireCurator/QuestionnaireCurator_Architecture.md`
4. `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`
5. `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`
6. `doc/SolidWorks-Flow/Architecture/DescriptionNode_ReviewSession_Architecture.md`
7. `doc/SolidWorks-Flow/SessionContinuity/Core/SessionContinuity_Architecture.md`
8. `doc/TODO/todo-plan.md`
9. `doc/Sessions/Session021.md` (THIS REPORT)

## Plans for next session
- Следовать `doc/TODO/todo-plan.md` и закрывать оставшиеся TODO:
  - `Session Continuity` (Core + Project Manager).
  - One-shot промпт Description Agent.
  - Скелет `reviewer-agent`.
  - Persist state шага Description + UI ветка + Continue.
  - Downstream OUTDATED на Edit.
