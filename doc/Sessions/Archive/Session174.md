# Session 174 — Gemini/Core crash investigation and diagnostic release 1.1.823

**Date:** 2026-03-28 13:26 (CET)
**Branch:** main
**Version:** 1.1.823

---

# 1. Work Done in This Session

## Work summary

- Проведено расследование повторяющегося падения Core при работе с workspace `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub gemini` после ответа Gemini provider.
- Проверены логи Core, launcher, extension, Gemini SDK и session history.
- Повторно подтверждено, что сбой воспроизводится не только при ручном запуске Core через внешний script, но и при штатном запуске через Project Manager.
- Выявлено, что Gemini как provider завершает turn успешно, но Core погибает уже после или во время post-turn обработки событий.
- Зафиксирована вторая важная аномалия: одни и те же `thinking`-сообщения Gemini сохраняются в session history по 2-3 раза, хотя в SDK log такого дублирования нет.
- Для следующего диагностического релиза добавлены два внешних контура логирования: `~/.codeai-hub/logs/core/core-fatal.log` для аварийных падений Core и `~/.codeai-hub/logs/observer/bridge-observer.log` для extension-side keepalive/observer событий.
- Собран диагностический релиз `1.1.823`: `build-all.sh` выполнил version bump и tarball packaging, затем `build-release.sh --use-current-version` успешно собрал VSIX `codeai-hub-1.1.823.vsix`.
- `README.md` и `CHANGELOG.md` синхронизированы с релизом `1.1.823` и описывают новый диагностический лог-контур.

## Reproduction summary

1. Workspace: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub gemini`
2. Stage/session:
   - `stage`: `description`
   - `providerId`: `geminiCli`
   - `providerSessionId`: `9dcb0ce6-dd4f-4f6f-b2f6-c27a3f10cbb4`
   - `dialogSessionId`: `gemini-01c6375e-d301-42d0-9a3e-532a7cb30088-description`
3. Симптом:
   - пользователь отправляет сообщение Gemini;
   - Gemini реально генерирует ответ;
   - session continuity/token usage обновляются;
   - Core после этого падает;
   - launcher фиксирует недоступность `127.0.0.1:8080`, но автоматически Core не перезапускает.

## Evidence collected

### Core log
- В первом крэше `core.log` обрывается на Gemini event stream около `2026-03-28T11:27:17.005Z` без stack trace.
- В штатном повторном прогоне через Project Manager Core снова стартует, принимает Gemini message и снова обрывается после нескольких Gemini session events.
- Во втором штатном прогоне:
  - старт нового Core: около `2026-03-28T11:56:57Z`;
  - Gemini session started: `2026-03-28T11:57:05.964Z` и `2026-03-28T11:57:06.015Z`;
  - входящее user message: `2026-03-28T11:57:36.176Z`;
  - дальше идут Gemini session events;
  - после `2026-03-28T11:57:40.858Z` записей о нормальном завершении turn уже нет.

### Launcher log
- Launcher многократно пишет:
  - `Core monitoring detected core is unreachable on 127.0.0.1:8080; core will not be restarted automatically.`
- Для штатного запуска через Project Manager видно:
  - `posix_spawnp failed for codeai-core with status 2`;
  - затем fallback на direct core startup;
  - Core становится ready;
  - после ответа Gemini снова уходит в unreachable.
- Это подтверждает, что auto-restart в текущем launcher path не происходит по дизайну мониторинга.

### Extension log
- Extension log не показывает полезной диагностики по самому падению.
- Есть только обычный startup extension и затем `extension:deactivate` около `2026-03-28T11:55:47.473Z`.

### Gemini SDK log
- Gemini SDK log показывает нормальное завершение turn и финальный ответ модели.
- Для последнего штатного прогона зафиксировано:
  - `content`: `Да, я получил твоё сообщение! Чем могу помочь?`
  - `finished.reason`: `STOP`
  - `totalTokenCount`: `8944`
- Это сильный сигнал, что provider не падает в inference path и завершает turn успешно.

### Session history / continuity
- Session JSONL не совпадает с Gemini SDK log по финальным сообщениям.
- После вопроса пользователя `Ты мое вот это сообщение получил?` в history сохраняются только duplicate `thinking`-messages, а финальный assistant message из SDK log не попадает в persisted history.
- Во втором воспроизведении были сохранены два одинаковых `thinking`-сообщения с одинаковым timestamp `2026-03-28T11:57:40.435Z`.
- В предыдущем воспроизведении были сохранены три одинаковых `thinking`-сообщения с timestamp `2026-03-28T11:50:42.032Z`.
- При этом continuity chain успевает обновить token usage:
  - `used: 8944`
  - `updatedAt: 2026-03-28T11:57:40.914Z`
- Значит Core успевает обработать часть post-turn каскада, но не доживает до нормальной фиксации финального assistant message.

## Main hypotheses

### Hypothesis 1 — crash in post-turn event delivery on Gemini/Core boundary
Наиболее вероятный сценарий сейчас такой:
- Gemini session manager завершает turn корректно;
- часть событий доходит до Core;
- затем один из downstream listeners в Core бросает исключение на финальном каскаде событий (`turn_completed`, token usage, usage limits или соседний route);
- процесс завершается без нормального stack trace в `core.log`.

Подозрительный путь в коде:
- `packages/Gemini_Module/src/provider/gemini-provider-adapter.ts`
- `packages/core/src/remote-bridge/handlers/session-shell-factory.ts`
- `packages/core/src/remote-bridge/handlers/session-provider-event-router.ts`

Рабочая гипотеза:
- `dispatchMessage()` в Gemini provider adapter передает события подписчикам без защитного `try/catch`;
- async listener path потенциально оставляет unhandled rejection / uncaught failure без достаточного логирования.

### Hypothesis 2 — duplicate subscribe/bind on the same Gemini provider session
Повторяющиеся `thinking`-сообщения в history при отсутствии таких дублей в Gemini SDK log очень похожи на множественную подписку на один и тот же provider session.

Подозрительный путь:
- `packages/core/src/remote-bridge/handlers/session-shell-factory.ts`
- повторные `adapter.subscribe(providerSessionId, ...)`
- отсутствие явной dedupe-защиты на bind/attach path

Если один provider event доставляется в Core несколько раз, это может:
- дублировать сохранение assistant `thinking` events;
- запускать конфликтующую post-turn обработку;
- усиливать вероятность падения уже после успешного ответа модели.

### Hypothesis 3 — delayed final assistant message arrives later than crashing post-turn cascade
Дополнительная гипотеза по порядку событий:
- финальный assistant message у Gemini может эмититься позже `thinking` и позже части завершающих событий;
- если Core падает на `turn_completed` / usage updates раньше, финальный assistant message просто не успевает записаться в session history.

Это хорошо согласуется с наблюдаемым расхождением:
- в SDK log финальный `content` есть;
- в persisted JSONL его нет;
- continuity/token usage уже обновлены.

## Important clarification about manual restart path

- Один из прогонов выполнялся не через штатный launcher, а через внешний script:
  - `/Users/oleksandroliinyk/Desktop/codeai-core-control.js`
  - `/Users/oleksandroliinyk/Desktop/CodeAI-Core-Control.command`
- Этот script запускает Core с `stdio: "ignore"` и `detached: true`.
- Он не задает `CODEAI_CORE_LOG_FILE`, поэтому новый Core не пишет в обычный `core.log`.
- Это объясняет отсутствие новых записей в `core.log` в ручном прогоне, но не объясняет сам crash.
- После этого был выполнен повторный штатный запуск через Project Manager, и crash подтвердился уже с нормальным логированием Core.

## Files and logs most important for next session

1. `doc/Sessions/Archive/Session174.md`
2. `/Users/oleksandroliinyk/.codeai-hub/logs/core/core.log`
3. `/Users/oleksandroliinyk/.codeai-hub/logs/launcher/launcher.log`
4. `/Users/oleksandroliinyk/.codeai-hub/logs/extension/extension.log`
5. `/Users/oleksandroliinyk/.codeai-hub/logs/gemini/sdk-gemini-9dcb0ce6-dd4f-4f6f-b2f6-c27a3f10cbb4.jsonl`
6. `/Users/oleksandroliinyk/.codeai-hub/sessions/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub-gemini/geminiCli/gemini-01c6375e-d301-42d0-9a3e-532a7cb30088-description.jsonl`
7. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub gemini/.codeai-hub/codeai-hub-gemini/description/description-step.json`
8. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub gemini/.codeai-hub/codeai-hub-gemini/continuity/description/gemini-01c6375e-d301-42d0-9a3e-532a7cb30088-description/chain.json`
9. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub gemini/.codeai-hub/codeai-hub-gemini/continuity/index.json`

## Git commits

- `99df487c chore: add core crash diagnostics`
- `00c80e54 chore: release 1.1.823`

---

# 2. Instructions for Next Session

## Required documents to review before work

1. `doc/Sessions/Archive/Session174.md` (THIS REPORT)
2. `doc/Sessions/Archive/Session173.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `packages/Gemini_Module/src/provider/gemini-provider-adapter.ts`
5. `packages/core/src/remote-bridge/handlers/session-shell-factory.ts`
6. `packages/core/src/remote-bridge/handlers/session-provider-event-router.ts`
7. `packages/Gemini_Module/src/session/gemini-session-manager.ts`
8. `packages/Gemini_Module/src/messaging/gemini-assistant-event-normalizer.ts`
9. `packages/core/src/index.ts`
10. `src/extension-module/core/core-keep-alive.ts`

## Plans for next session

- Не трогать текущий `doc/TODO/todo-plan.md`: по прямой инструкции пользователя он уже содержит другой scope и должен оставаться без изменений до устранения Gemini crash bug.
- Предметно разобрать Gemini/Core event path после `sendMessage()` до финальных post-turn событий.
- Проверить, где и почему на один `providerSessionId` возникает повторная подписка или повторный bind.
- Снять новый repro уже на релизе `1.1.823` и собрать артефакты из `~/.codeai-hub/logs/core/core-fatal.log` и `~/.codeai-hub/logs/observer/bridge-observer.log`.
- Добавить точечное диагностическое логирование вокруг финального event dispatch path и around post-turn events, если текущих двух контуров окажется недостаточно.
- После локализации точки падения подготовить минимальный фикс без расширения scope за пределы bugfix.
