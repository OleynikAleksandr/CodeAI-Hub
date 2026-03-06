# Session 067 — Provider ACK contracts and retry-plan preparation

**Date:** 2026-03-06 21:38 (CET)
**Branch:** main
**Version:** 1.1.716

---

# 1. Work Done in This Session

## Work summary
- Продолжена архитектурная разборка workflow submit delivery после `Session066`, но без перехода к коду: фокус смещён на жёсткое разделение между ACK-контрактом и ещё не утверждённым resend/outbox UX.
- Для Codex подтверждён single-source подход: runtime verdict delivered/failed должен опираться только на [Codex_Workflow_TurnStarted_ACK.md](../SolidWorks-WorkFlow/Contracts/Codex_Workflow_TurnStarted_ACK.md), где источник истины зафиксирован как `sdk:turn.started`.
- Для Claude повторно перепроверен живой adapter-level submit path и исправлена прежняя слишком жёсткая интерпретация: provider-native ACK у Claude существует, но имеет другую форму. Первый пригодный provider signal для начала нового turn — `sdk:stream_event` с `message_start`, а не локальный `turn_started`.
- На этой основе оформлен отдельный симметричный SSOT:
  - [Claude_Workflow_TurnStarted_ACK.md](../SolidWorks-WorkFlow/Contracts/Claude_Workflow_TurnStarted_ACK.md)
  - правило зафиксировано жёстко: runtime verdict delivered/failed для Claude submit опирается только на provider-originated `sdk:stream_event(message_start)`.
- Приведены в консистентное состояние связанные документы:
  - [Docs_Index.md](../SolidWorks-WorkFlow/Docs_Index.md)
  - [SystemArchitecture.md](../SolidWorks-WorkFlow/System/SystemArchitecture.md)
  - [Claude.md](../SolidWorks-WorkFlow/Modules/Claude.md)
  - [Codex.md](../SolidWorks-WorkFlow/Modules/Codex.md)
  - [todo-plan.md](../TODO/todo-plan.md)
  - [Session066.md](./Session066.md)
- По прямому решению пользователя удалён преждевременный документ `Codex_Workflow_UserTurn_Delivery.md`, потому что он фиксировал outbox/pending/resend решения, которые ещё не были реально обсуждены и утверждены.
- После удаления вычищены все ссылки на этот delivery-док из SSOT и рабочих документов; в архитектуре остались только утверждённые ACK-контракты и diagnostics contract.
- Коммиты в этой сессии не создавались; рабочее дерево осталось dirty только в части doc-правок, подготовленных к следующему осмысленному коммиту.

## Git commits
- Коммитов в этой сессии пока нет; изменения остаются в рабочем дереве как незакоммиченные обновления документации.

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/Modules/Codex.md`
5. `doc/SolidWorks-WorkFlow/Modules/Claude.md`
6. `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_TurnStarted_ACK.md`
7. `doc/SolidWorks-WorkFlow/Contracts/Claude_Workflow_TurnStarted_ACK.md`
8. `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_Submit_Diagnostics.md`
9. `doc/TODO/todo-plan.md`
10. `doc/Sessions/Session066.md`
11. `doc/Sessions/Session067.md` (THIS REPORT)

> Далее: при переходе к планированию retry UX открыть только нужные документы в `doc/SolidWorks-WorkFlow/Contracts/` и не проектировать outbox/resend поведение заранее без явного отдельного обсуждения.

## Plans for next session
- Сначала подготовить архитектурный документ под кнопку `Повторить отправку сообщения` как отдельную design phase, без немедленной реализации.
- В этом документе явно решить общий для Codex и Claude набор вопросов:
  - где хранится payload недоставленного submit;
  - как выглядит pending/failed bubble в PM;
  - что именно считается основанием для показа `Повторить отправку` у Codex и у Claude;
  - как не допустить duplicate delivered user message после retry.
- После утверждения этого документа нарезать новый `todo-plan.md` под реализацию retry-button UX сразу для двух провайдеров:
  - Codex на основе `sdk:turn.started`;
  - Claude на основе `sdk:stream_event(message_start)`.
- Только после этого переходить к коду Core/PM/provider modules.
