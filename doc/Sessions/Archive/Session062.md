# Session 062 — Baseline Codex 5.4 commentary regression analysis

**Date:** 2026-03-13 08:56 (CET)  
**Branch:** codex/baseline-gpt54-release  
**Version:** 1.1.720

---

# 1. Work Done in This Session

## Work summary
- Выполнен аналитический разбор baseline-релиза `1.1.720`, где на стабильной линии `1.1.712` модель `gpt-5.2` была заменена на `gpt-5.4` без подтягивания поздних rollout/refactor-изменений из основной ветки.
- Сопоставлены реальные артефакты двух запусков: `gpt-5.4` и `gpt-5.3-codex`, включая raw provider JSONL, наши dialog-history JSONL и сырой desktop Codex log.
- Подтверждено, что проблема “`gpt-5.4` показывает только финальный ответ в турне” не является одной локальной ошибкой. Она складывается из двух слоёв: жёсткого shaping через `outputSchema` и нашего downstream-filtering/suppression.
- Сформулирована целевая архитектурная линия: structured output должен стать policy для terminal-result, а не обязательным контрактом всего живого workflow turn.
- Зафиксировано отдельное наблюдение по SDK logging: исторический session log может затираться при повторном resume на том же `thread_id`.

## Verified evidence
- `gpt-5.4` raw provider:
  - `/Users/oleksandroliinyk/.codeai-hub/providers/codex/home/sessions/2026/03/12/rollout-2026-03-12T20-13-29-019ce377-dcc8-7222-9288-c24561e9d784.jsonl`
- `gpt-5.4` dialog history:
  - `/Users/oleksandroliinyk/.codeai-hub/sessions/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub-codex-5-4/codexCli/codex-9bbbba18-d53d-436d-89d9-6bcdaa830518-description.jsonl`
- `gpt-5.3-codex` raw provider:
  - `/Users/oleksandroliinyk/.codeai-hub/providers/codex/home/sessions/2026/03/13/rollout-2026-03-13T08-04-40-019ce602-f84b-7791-8e79-780a820b9d1e.jsonl`
- `gpt-5.3-codex` dialog history:
  - `/Users/oleksandroliinyk/.codeai-hub/sessions/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub-codex-5-3/codexCli/codex-2da54220-cb87-4f6b-80d5-c26624e563dd-description.jsonl`
- Raw desktop Codex reference:
  - `/Users/oleksandroliinyk/.codex/sessions/2026/03/12/rollout-2026-03-12T15-16-31-019ce267-fd31-73d2-aeca-9643a7653e4b.jsonl`

## Facts proven by the data
- Для `gpt-5.4` в raw provider JSONL не найдено `assistant/commentary`. Наблюдаются `reasoning`, tool calls/results и один `assistant` с `phase=final_answer`.
- Для `gpt-5.3-codex` в raw provider JSONL найдены промежуточные `assistant/commentary` и один финальный `assistant/final_answer`.
- Наши dialog-history файлы отражают именно это:
  - `gpt-5.4` dialog file содержит только `session-open`, `user`, `assistant`.
  - `gpt-5.3-codex` dialog file содержит несколько assistant-сообщений внутри turn.
- В desktop Codex reference промежуточные и финальные assistant-сообщения имеют одинаковую оболочку. Различие только в `phase`:
  - строки `1188`, `1200` — `commentary`
  - строки `1208`, `1209` — `final_answer`
- Следствие: промежуточный пользовательский progress не должен описываться внутри final JSON schema. Он живёт отдельным фазовым каналом.

## Root-cause breakdown
- Проблема состоит из двух независимых уровней.

1. **Upstream shaping**
- Мы меняем сам turn, когда навешиваем `outputSchema` и prompt в стиле `Return only JSON, no extra text.`.
- Это влияет не на отображение, а на то, что провайдер вообще сгенерирует.
- Поэтому при текущем baseline-контракте мы не видим контрфактический ответ: что `gpt-5.4` прислала бы без столь жёсткого ограничения.

2. **Downstream filtering**
- Даже уже пришедшие сигналы дополнительно режутся нашим pipeline:
  - `phase="commentary"` подавляется в `packages/Codex_Module/src/messaging/message-processor.ts`
  - `stream_event` не сохраняется в history JSONL и живёт только в live-broadcast в `packages/core/src/remote-bridge/handlers/session-request-handler.ts`
  - placeholder-thinking записи отбрасываются на уровне `packages/core/src/unified-session/storage.ts`
- Поэтому даже если новая модель меняет форму progress-событий, наш display layer не обладает достаточной устойчивостью и может потерять часть сигнала.

## Additional finding: SDK log overwrite
- В каталоге `/Users/oleksandroliinyk/.codeai-hub/logs/codex/` был обнаружен странный случай:
  - лог `sdk-codex-019ce377-dcc8-7222-9288-c24561e9d784.jsonl` имеет размер `102B`
  - свежий `gpt-5.3-codex` лог имеет нормальный размер
- По коду наиболее сильная гипотеза такая:
  - resumed session стартует логгер уже на реальном `threadId`
  - logger переоткрывает тот же JSONL-файл через `flag: "w"`
  - в результате исторический SDK log может затираться повторным запуском/resume на том же `thread_id`
- Это отдельный диагностический дефект: он не вызывает текущую commentary-регрессию напрямую, но сильно ухудшает расследование подобных кейсов.

## Files confirmed as relevant
- Structured-output injection:
  - `packages/Codex_Module/src/messaging/structured-output-stream-controller.ts`
  - `packages/Codex_Module/src/messaging/message-processor.ts`
- Commentary suppression / parsing:
  - `packages/Codex_Module/src/messaging/message-processor.ts`
- Session history persistence / replay:
  - `packages/core/src/remote-bridge/handlers/session-request-handler.ts`
  - `packages/core/src/unified-session/storage.ts`
- SDK logging / resume:
  - `packages/Codex_Module/src/logging/session-logger.ts`
  - `packages/Codex_Module/src/session/session-manager.ts`
  - `packages/Codex_Module/src/sdk/codex-sdk-manager.ts`

## Main conclusions
- Structured output не нужно удалять полностью.
- Но его нельзя оставлять жёстким контрактом всего workflow turn.
- Текущая реализация делает систему хрупкой при смене модели, потому что смешивает три разных слоя:
  - живой пользовательский commentary/progress
  - terminal machine-readable result
  - display/history фильтры приложения
- Правильная целевая модель:
  - raw provider log пишется до наших фильтров и остаётся неизменяемым диагностическим источником правды
  - commentary обрабатывается как отдельный канал прогресса
  - structured output описывает только terminal result
  - UI/history строятся поверх нормализованного потока, а не являются единственным источником того, что “вообще прислал провайдер”

## What must be done to restore normal `gpt-5.4` behavior
- Не тащить старый rollout-код из поздних веток. Работать поверх baseline-линии.
- Разделить commentary channel и final structured result на уровне контракта turn.
- Убрать предположение, что весь user-facing turn обязан быть JSON-only.
- Сохранить structured output как инструмент, но сузить его до terminal stage.
- Добавить режим, в котором можно наблюдать raw provider output без потерь и без скрытия диагностических сигналов.
- Перестать затирать SDK JSONL при resume, иначе будущие расследования снова останутся без истории.

## Recommended product direction for future model experiments
- Вынести response policy в `Settings -> General`.
- Добавить три режима:
  - `Strict`
  - `Hybrid`
  - `Debug/Raw`
- Ожидаемая семантика:
  - `Strict`: жёсткая terminal schema, editable schema/prompt contract, оптимизация токенов
  - `Hybrid`: свободный commentary + structured final result
  - `Debug/Raw`: schema injection отключена или максимально прозрачна, raw provider log сохраняется полностью, фильтрация минимальна
- Рекомендуемый default для workflow-сценариев: `Hybrid`
- Критический invariant для всех режимов:
  - raw provider log должен сохраняться до наших фильтров
  - потеря сигнала в UI/history не должна означать потерю диагностического источника правды

## Anti-patterns to avoid in the next implementation
- Не повторять полный отказ от structured output без новой архитектуры turn contract.
- Не пытаться чинить только UI/history, если upstream shaping по-прежнему заставляет модель отвечать в жёстком JSON-only стиле.
- Не считать отсутствие commentary в UI доказательством, что провайдер его не прислал.
- Не оставлять единственный источник диагностики в SDK-log файлах, которые могут быть перезаписаны при resume.

## Git commits
(ВАЖНО: список для восстановления контекста в следующей сессии через `git show`)
- `No new commits in this session (analysis-only session).`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Sessions/Archive/Session061.md`
2. `doc/Sessions/Archive/Session062.md` (THIS REPORT)
3. `doc/TODO/todo-plan.md`
4. `doc/SolidWorks-WorkFlow/README.md`
5. `doc/SolidWorks-WorkFlow/Docs_Index.md`
6. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
7. `doc/SolidWorks-WorkFlow/Modules/Codex.md`

## Code/files to reopen immediately
1. `packages/Codex_Module/src/messaging/structured-output-stream-controller.ts`
2. `packages/Codex_Module/src/messaging/message-processor.ts`
3. `packages/core/src/remote-bridge/handlers/session-request-handler.ts`
4. `packages/core/src/unified-session/storage.ts`
5. `packages/Codex_Module/src/logging/session-logger.ts`
6. `packages/Codex_Module/src/session/session-manager.ts`

## Historical commits that remain essential context
- Из `Session061` обязательно повторно открыть через `git show --stat` и `git show`:
  - `2978ba51 feat(codex): switch baseline general model to gpt-5.4`
  - `b4a38d48 docs(todo): capture baseline gpt-5.4 prep progress`
  - `0a5de467 chore(release): seed baseline version line to v1.1.719`
  - `56f86371 chore(release): build-all v1.1.720`
  - `8b8f1677 docs(session): record baseline gpt-5.4 release build`

## Plans for next session
- Сначала оформить и согласовать архитектурный документ под response/runtime policy:
  - `Strict / Hybrid / Debug-Raw`
  - terminal-only structured output
  - raw-provider-log invariant
- Затем обновить `doc/TODO/todo-plan.md` под микро-задачи не более 3 файлов на шаг.
- Первая техническая цель: восстановить полноценный user-facing progress для `gpt-5.4` без возврата к поздним `workflow-state` refactor-изменениям.
- Вторая техническая цель: сделать платформу устойчивой к будущим моделям, которые меняют метрики, phases или форму progress-сообщений.
- Минимальный ожидаемый implementation plan:
  1. response mode setting в `Settings -> General`
  2. отделение commentary-канала от terminal schema
  3. raw provider log как обязательный неизменяемый диагностический артефакт
  4. корректировка parser/filter layer под новую нормализацию
  5. fix SDK log overwrite on resume
- После проектного решения переходить к реализации только через новый Phase/Stream в `todo-plan.md`.
