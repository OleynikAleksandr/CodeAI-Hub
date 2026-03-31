# Session 201 — Gemini Upstream Instability Assessment And Pause

**Date:** 2026-03-30 18:58 (CEST)
**Branch:** main
**Version:** 1.1.850

---

# 1. Work Done in This Session

## Work summary
- Выполнена пост-релизная ручная диагностика `1.1.850` на реальном `Description` flow с Gemini. Несмотря на fixes из `Session200`, один из прогонов снова завершился системным сообщением `Provider turn failed: Gemini stream stalled after 120s without progress.`
- По runtime-логам подтверждён новый наблюдаемый сценарий: Gemini отдаёт первый progress-ответ, затем запрашивает `read_file`, после чего nested `post_tool` continuation больше не эмитит ни одного нового raw event и умирает по stalled timeout. В этом прогоне `Final_Description.md` не materialize-ился.
- Подняты и сверены диагностические артефакты:
  - `~/.codeai-hub/logs/gemini/sdk-gemini-0eee67bc-1dcc-41c3-9ee4-a366cf7e5cd3.jsonl`
  - `~/.codeai-hub/logs/core/core.log`
  - `~/.codeai-hub/logs/observer/bridge-observer.log`
  - `~/.codeai-hub/sessions/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub-gemini/geminiCli/gemini-28363fa8-d59f-44de-b307-84ae5c4f7607-description.jsonl`
- Выполнено сравнение с нативным Gemini CLI на модели `gemini-3-flash-preview`:
  - первый прямой прогон через CLI завис без output tokens и завершился только после ручной отмены;
  - повторный прогон тем же CLI позже отработал успешно, включая `read_file`, `write_file(Final_Description.md)` и финальный ответ с вопросами;
  - это показало не детерминированный локальный баг, а нестабильное поведение upstream path у Google/Gemini CLI.
- Зафиксирован дополнительный пользовательский контекст: аналогичные зависания наблюдались и в обычном Gemini CLI вне приложения, затем поведение менялось после повторных попыток и переключений аккаунта/проекта авторизации. Это усилило гипотезу об upstream-инциденте, а не о новой локальной регрессии в `CodeAI Hub`.
- Выполнен внешний мониторинг свежих публичных сигналов по Gemini CLI:
  - найдено официальное обсуждение команды Gemini CLI о traffic prioritization / abuse mitigation в конце марта 2026;
  - найден свежий кластер issue на GitHub и жалоб в Reddit на mid-turn hangs, infinite waits, `429`/`High Demand`, деградацию OAuth/subscription detection и нестабильный terminal path.
- Рабочее решение по итогам сессии: остановить дальнейшее углубление в Gemini как в локальную кодовую проблему, не тратить следующий цикл на новые Gemini-фиксы без явного нового сигнала, и временно исключить Gemini из ручного тестирования и активной разработки до стабилизации upstream.
- Код, `todo-plan.md`, release-доки и архитектурные документы в этой сессии не менялись. Сессия закрыта как исследовательская/диагностическая.

## Git commits
- В этой сессии новых git commit не создавалось.

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `AGENTS.md`
2. `doc/Sessions/Session200.md`
3. `doc/Sessions/Session201.md` (THIS REPORT)
4. `doc/TODO/todo-plan.md`
5. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`

## Plans for next session
- Не возвращаться к Gemini remediation по умолчанию: текущая рабочая позиция проекта — считать Gemini нестабильным upstream dependency и держать провайдер на паузе в тестах/разработке.
- Если пользователь позже решит возобновить Gemini-трек, начинать не с нового кода, а с повторной проверки внешней обстановки: GitHub issues, Discussions Gemini CLI, Reddit и прямой CLI smoke-test на `gemini-3-flash-preview`.
- Если возобновление всё же потребуется, поднять сначала артефакты из этой сессии и `Session200`, затем отдельно оценить, нужен ли вообще runtime-side resilience layer или проблему уже устранил Google.
- Следующий продуктивный scope лучше выбирать вне Gemini, чтобы не тратить релизный цикл на нестабильный внешний провайдер.
