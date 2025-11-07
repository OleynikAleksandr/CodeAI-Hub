# Session 059 — Workspace-aware session storage & release 1.1.158

**Дата:** 7 ноября 2025 — Madrid (UTC+1) 11:30 – 13:40  
**Ветка:** main  
**Версия:** 1.1.158

---

## Что сделано
1. **Диагностика регрессии нормализованных JSONL.** Просмотрены `UnifiedSessionStorage`, логи и структура `~/.codeai-hub/sessions/`; выявлено, что launcher запускал ядро с fallback‑путём `~`, поэтому writer писал файлы в неверный slug.
2. **Восстановление записи истории для обоих UI.** Extension теперь передаёт `workspacePath` в `launchCefClient`, launcher сохраняет его в `config.json`, а bootstrap ядра уважает это значение. Благодаря этому JSONL файлы снова появляются в `~/.codeai-hub/sessions/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub/<provider>/` независимо от того, кто управляет ядром.
3. **Документация и база знаний.** README, CHANGELOG, SystemArchitecture и `unified-session-streams.md` обновлены описанием нового поведения; `doc/TODO/todo-plan.md` отражает завершённые задачи с хешами.
4. **Release 1.1.158.** Запущен `./scripts/build-all.sh`, проверены артефакты в `doc/tmp/releases/` и VSIX в корне. Обновлены manifests и версии пакетов, собран `codeai-hub-1.1.158.vsix`.

## Проблемы
- **Конфликт workspace slug после закрытия VS Code.** Launcher не получал путь проекта и сбрасывал writer в `~/.codeai-hub/sessions/-Users-oleksandroliinyk`. Решение: передавать `workspacePath` из extension и читать его в launcher bootstrap до старта ядра.

## План на следующую сессию
1. Завершить работу над удержанием ядра при наличии хотя бы одного клиента (extension/launcher).
2. Реализовать единый сторедж/refresh для standalone UI после восстановления JSONL.
3. Подготовить UX/документацию по launcher с учётом нового механизма хранения.

## Коммиты
- c330a1b — fix: trace normalized jsonl regression
- 8c9ba88 — fix: restore normalized session writers
- 1715d3d — chore: document normalized session storage
- f2ebd79 — chore: sync manifest hashes
- ddbde99 — feat: v1.1.158 - workspace-aware session storage
