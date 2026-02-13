# Session 042 — Per-Agent Dialog JSONL + UI Dedupe (Collector vs Reviewer)

**Date:** 2026-02-13 18:32 (CET)
**Branch:** codex/phase156-unified-agent-dialog
**Version:** 1.1.585

---

# 1. Work Done in This Session

## Work summary
- Подтверждена новая регрессия после введения `dialogSessionId` как стабильного имени unified-session JSONL: **Description collector** и **Description reviewer** (оба в stage=`description`) могут писать историю в **один и тот же** файл UI-истории.
- Зафиксирована проблема отображения дублей в UI: визуально дублируются сообщения (например, `User: Подтверждаю` и `assistant: Файл финального артефакта записан...`), при этом в unified-session JSONL **нет дублей по `messageId`** и нет дублей по `(role,timestamp,content)`.
  - Факт: в `~/.codeai-hub/sessions/.../codex-...jsonl` найдено “шумовое” наполнение (`thinking: <!-- -->`, `Ready to continue working.`), но не найдено прямых дублей по `messageId`.
  - Вывод: часть дублей возникает на уровне **UI merge** (history + live stream / reconnect), поэтому требуется dedupe по `messageId` в UI.
- Обновлены SolidWorks-Flow документы, чтобы закрепить канон `dialogSessionId` как стабильного UI Session ID и требование применять это для всех следующих агентов.
- Обновлён `doc/TODO/todo-plan.md`: добавлен Phase 158 (Agent Dialog Separation + UI Dedupe) + стрим сборки нового релиза.

## Git commits
- `296c8fc5 chore(docs): update session report`
- `87b222c1 docs(flow): unify session history via dialogSessionId`
- `1644fe89 docs(flow): document dialogSessionId in provider/system docs`
- `a66ccff5 docs(flow): require dialogSessionId for future agents`
- `e64e9a67 docs(flow): update docs index for dialogSessionId`
- `1aa86c78 docs(flow): document dialogSessionId as stable UI session id`
- `854aee4c docs(todo): plan phase 158 agent dialog separation and UI dedupe`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/Sessions/Session042.md`
2. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/TODO/todo-plan.md`
3. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/SessionContinuity/SessionContinuity.md`
4. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`
5. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Stacks/CoreOrchestrator.md`

## Plans for next session
- Phase 158 / Stream 1 (Core): сделать **1 агент = 1 dialogSessionId = 1 unified-session JSONL** для stage=`description`:
  - разводим `dialogSessionId` для collector vs reviewer (даже если `providerSessionId` совпадает из-за resume);
  - step-state должен хранить оба session ref (по agent identity), чтобы после рестарта Core можно было корректно восстанавливать UI историю.
  - ключевые файлы: `packages/core/src/workflow/description/description-step-types.ts`, `packages/core/src/workflow/description/description-step-store.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`.
- Phase 158 / Stream 2 (Core): миграция/backfill смешанного диалога в per-agent файлы (если уже есть mixed JSONL).
- Phase 158 / Stream 3 (Core): фильтровать “шумовые” unified-session сообщения (например `thinking` с пустым/`<!-- -->` контентом) до записи.
- Phase 158 / Stream 4 (PM/UI): dedupe сообщений по `messageId` при merge history + live stream и при reconnect/restore.
- Phase 158 / Stream Release: прогнать гейты и собрать новый patch release через `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`.
