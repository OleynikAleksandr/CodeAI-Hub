# Session 039 — Runtime status overlay & release 1.1.94

**Дата:** 1 ноября 2025 — Madrid (UTC+1)
**Время:** 10:00 – 12:30
**Ветка:** main
**Версии:** 1.1.89 → 1.1.94

---

## Артефакты, обязательные к изучению перед стартом следующей сессии
- `README.md` (раздел Current Release — v1.1.94)
- `CHANGELOG.md` (запись 1.1.94)
- `doc/Architecture/Architecture.md`
- `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
- `doc/Project_Docs/Stacks/Gemini_CLI_Module.md`
- `doc/Project_Docs/knowledge/ProviderSetupGuide.md`
- `doc/TODO/todo-plan_.md`

---

## Что сделано
1. Переписан стартовый оверлей: теперь показываем циклические дружелюбные сообщения (core/Claude/Codex/Gemini), Action Bar заблокирован до финального статуса, оверлей исчезает мгновенно после готовности.
2. Убраны всплывающие уведомления VS Code — подготовка CEF, лаунчера, core и модулей теперь полностью тихая, прогресс транслируется только в webview.
3. Обновлён `RuntimeStatusReporter` и инсталляторы Claude/Codex/Gemini: события `progress` и `firstRun` продолжают идти в RemoteBridge, UI подстраивает текст под их значения.
4. Скрипты `build-*-module.sh` и `build-core.sh` чистят старые версии, публикуют артефакты только в `~/.codeai-hub/releases/` и не создают мусор в `doc/tmp`.
5. Обновлена документация (README, CHANGELOG, Architecture, SystemArchitecture, Gemini stack, todo-plan) и собран релиз `codeai-hub-1.1.94.vsix` плюс свежие tar.bz2 для core и модулей.

---

## Текущее состояние
- UI последовательно показывает прогресс и скрывает оверлей сразу после готовности (релиз 1.1.94 протестирован локально).
- Модули провайдеров и core обновлены (0.1.8 / 0.1.2 / 0.3.5 и 0.2.22) и лежат только в `~/.codeai-hub/releases/`.
- TODO Phase 1 остаётся активной: health-check сервисы и текстовые инструкции все ещё в работе.

---

## Проблемы / Блокеры
- Автоматический health-check и текстовые инструкции по отсутствующим инструментам ещё не готовы.

---

## План на следующую сессию
1. Реализовать health-check провайдеров в ядре (детект отсутствующих инструментов/аутентификации) и прокинуть статусы в `/status`.
2. Отобразить диагностику в Settings/Provider Setup (UI) и подготовить инструкцию по установке.
3. Дополнить тестовый контур (моки на отсутствие инструментов) и обновить документацию/релизные артефакты.

---

## Git commits
- (pending — изменения не закоммичены)
