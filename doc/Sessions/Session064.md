# Session 064 — GPT-5.4 workflow commentary regression diagnosis and planning

**Date:** 2026-03-06 09:06 (CET)
**Branch:** main
**Version:** 1.1.714

---

# 1. Work Done in This Session

## Work summary
- Выполнена углублённая диагностика регрессии `gpt-5.4` в workflow-сессиях Project Manager: промежуточные commentary messages исчезают из PM dialog, хотя сама модель `gpt-5.4` умеет публиковать `agent_message/commentary` в live Codex session.
- Подтверждено, что проблема находится не в модели как таковой, а в нашем workflow runtime contract: legacy structured-output / `outputSchema` / JSON-only path продолжает навязываться обычным raw workflow turns.
- Зафиксирован design decision: для PM workflow turns нужно вернуть raw conversational contract по умолчанию, structured output оставить только по явному opt-in, а prompt contract уточнить так, чтобы короткие progress commentary были обязательными, а запрет касался только публикации полного markdown-артефакта в чат.
- Создан новый архитектурный SSOT `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_Commentary_Restore.md` под будущий фикс восстановления commentary для `gpt-5.4`.
- Закрытый `Phase 289` вынесен в архив как `doc/TODO/Archive/todo-plan-up-to-phase289-2026-03-06.md`.
- Открыт новый детальный `doc/TODO/todo-plan.md` с `Phase 290`, разбитый на микрозадачи и завершающийся отдельным release stream по стандартной инструкции проекта.

## Validation / checks
- Сверены реальные rollout/session artifacts для `gpt-5.3-codex` и `gpt-5.4`, включая provider/home JSONL, unified dialog JSONL и live Codex rollout в `~/.codex/sessions/...`.
- Подтверждено, что в live `gpt-5.4` session существуют промежуточные `agent_message/commentary`, следовательно regression вызван нашим runtime/prompt contract, а не невозможностью модели публиковать commentary.
- Проверены текущие source prompt templates и runtime точки, связанные с `outputSchema`, JSON-only wrapper и workflow message sending, чтобы новый план опирался на реальные файлы и реальные границы исправления.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через `git show`)
- `No commits in this session yet (design / planning / TODO reset only).`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/Modules/Codex.md`
5. `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_Commentary_Restore.md`
6. `doc/TODO/todo-plan.md`
7. `doc/Sessions/Session063.md`
8. `doc/Sessions/Session064.md` (THIS REPORT)

> Далее: перед реализацией открыть конкретные runtime/prompt/test файлы из нового `Phase 290`, начиная со Stream 0 и не перепрыгивая через release contract.

## Plans for next session
- Начать `Phase 290` со снятия legacy structured-output default path в Codex runtime и PM/Core workflow callers.
- После raw-contract cleanup вернуть промежуточные commentary в message processor и в unified dialog history JSONL.
- Затем уточнить workflow prompts, добавить targeted regression coverage и только после этого идти в release stream по checklist на чистом дереве.
