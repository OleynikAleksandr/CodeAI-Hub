# Session 045 — Questionnaire template bootstrap + planning for Idea Collector refactor

**Date:** 2026-01-04  (CET)
**Branch:** main
**Version:** 1.1.379

---

# 1. Work Done in This Session

## Work summary
- Сформирован новый план рефакторинга Idea Collector под формат анкетирования (Questionnaire UI) вместо «интервью».
- Добавлен bundled шаблон анкеты (cluster/MVP), выровненный по полям `conversation_state.collected` из schema Idea Collector.
- Добавлен installer шаблона: при первом старте расширения создаётся `~/.codeai-hub/templates/full-development-flow/idea/questionnaire-template.md` (если файла нет/он пустой), без перезаписи пользовательских правок.
- Заархивирован старый `doc/TODO/todo-plan.md` и создан новый `doc/TODO/todo-plan.md` под Questionnaire MVP.
- Прогнаны гейты (architecture, ultracite, ts-prune, jscpd, check:links, build:webview, typecheck:webview, tsc).

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `19d326b docs(orchestrator): add questionnaire ui architecture`
- `94027b3 docs(todo): archive old plan and start questionnaire mvp plan`
- `432d14f feat(templates): add idea questionnaire template`
- `1b5aabe feat(extension): install idea questionnaire template on startup`
- `8be0197 docs(todo): record questionnaire bootstrap commit hashes`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/TODO/todo-plan.md`
2. `doc/Project_Docs/IdeaCollector_Questionnaire_UI_Architecture.md`
3. `packages/core/src/remote-bridge/handlers/idea-contract-service.ts`
4. `src/client/ui/src/session/input-panel.tsx`

## Plans for next session
- Начать выполнение `doc/TODO/todo-plan.md` (Questionnaire MVP):
  - закрыть «коммит-строки» для уже сделанных пунктов (архив плана / шаблон / installer) и проставить hash’и;
  - реализовать `idea-contract` расширение: `questionnaire.templateMarkdown` (Core → UI);
  - подготовить UI-рефакторинг `InputPanel` (вынос textarea+dnd для переиспользования в анкете);
  - сделать экран анкеты в webview и связать его с созданием/сохранением `.codeai-hub/.../idea/questionnaire.md`.
