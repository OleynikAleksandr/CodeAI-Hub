# Session 060 — Workspace slug persistence & release 1.1.159

**Дата:** 7 ноября 2025 — Madrid (UTC+1) 14:00 – 16:10  
**Ветка:** main  
**Версия:** 1.1.159

---

## Что сделано
1. **Исправлен slug для standalone ядра.** Extension теперь сохраняет текущий `workspacePath` в `~/.codeai-hub/state/workspace-path` и записывает его в config лаунчера при любой активации. Лаунчер читает этот файл перед запуском core, поэтому даже автономная работа без VS Code создаёт нормализованные JSONL в `~/.codeai-hub/sessions/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub/<provider>/`.
2. **Обновлён launcher bootstrap.** В `core_launcher` добавлен fallback чтения state-файла, а `RegisterWorkspaceFromConfig`/`RegisterWorkspaceFromState` обеспечивают единый slug для всех клиентов.
3. **Документация и knowledge base.** README/CHANGELOG отражают релиз 1.1.159, `unified-session-streams.md` описывает новый state-файл, `doc/TODO/todo-plan.md` пополнен реальным хэшем фикса.
4. **Релиз 1.1.159.** `./scripts/build-all.sh` собрал новые tarball/VSIX; проверены артефакты в `doc/tmp/releases/` и `codeai-hub-1.1.159.vsix` в корне.

## Проблемы
- Падение slug до `~/.codeai-hub/sessions/-Users-oleksandroliinyk/*` при запуске только лаунчера. Причина — отсутствующий config и slug state; исправлено синхронизацией `workspacePath`.

## План на следующую сессию
1. Завершить задачи из фазы Core lifecycle hardening (удержание ядра при наличии клиентов, refresh в standalone UI).
2. Подготовить UX/документацию для launcher с описанием поведения JSONL/refresh.
3. Провести дополнительные smoke-тесты с одновременным VS Code + launcher после фиксов.

## Коммиты
- f47101a — fix: persist workspace slug for launcher
- 4dfee53 — feat: v1.1.159 - workspace slug persistence (release build)
