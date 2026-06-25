# Session UI Panels — Module Inventory

**Status:** Active factual inventory  
**Scope:** фактическое устройство пяти панелей Session UI внутри `Project Manager` на текущем baseline.

## Назначение

Этот набор документов фиксирует **реальное текущее поведение** панелей Session UI.

Он нужен, чтобы:
- не искать заново truth-path каждой панели по коду;
- видеть, какие входы, выходы и side effects уже существуют;
- безопасно готовить будущий рефакторинг `Project Manager` без потери работающего поведения.

Это **не planning-doc**.
Это factual module inventory по текущей реализации.

## Панели

1. `SessionTabs.md` — вкладки сессий (`select` / `close`, active session routing)
2. `SessionIdUsageBar.md` — `providerSessionId` + usage limits
3. `SessionDialogPanel.md` — история диалога, thinking, segment boundaries, file links
4. `SessionInputPanel.md` — textarea, send/stop, wait-copy, timers, lock behavior
5. `SessionStatusPanel.md` — четыре chip ряд (label `Модель:` + provider-tinted кнопки имени модели и reasoning + правая `Токены:` плашка), плюс опциональный token debug summary; рендерится только при готовом Core и наличии `models[0]`

## Важный архитектурный нюанс

Текущий `SessionView` может работать в двух controller-path:
- `runtime mode` — через `ProjectManagerRuntimeSessionView`
- `dialog mode` — через `ProjectManagerDialogSessionView`

Поэтому одинаковая визуальная панель может брать данные из разных truth-channels в зависимости от режима.

`SessionDialogPanel` renders reasoning through a translation-first projection: pending reasoning translation does not show the English source, completed translated text is revealed progressively, and the source transcript remains available only as the fallback/error path.

The same projection contract applies to both controller paths. In `runtime mode`, live `session:message` data may carry `translationState = "pending"`. In `dialog mode`, `dialog:message` is only a trigger to reread `dialog:history:result`, so the history projection must preserve `translationState` as well. Otherwise the dialog can briefly replay English source text before the translated overlay arrives.

When a translated reasoning payload grows block by block, the panel keeps the already visible translated prefix and streams only the new suffix. Previously rendered translated paragraphs must not disappear and replay from the first block.

## Связанные документы

- `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
- `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
- `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
- `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
