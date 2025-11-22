# План разработки

## Правила выполнения
- Каждая подзадача затрагивает не более 3 файлов. Перед коммитом: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка (`npm run build --workspace <package>` / `npm run build:webview` / `npm run typecheck:webview`). После зелёных проверок — коммит и обновление плана (дата, статус, хеш).
- Если задача требует >3 файлов — дробим. Архитектурные/логические изменения сразу отражаем в документации.

## Фаза 1 — Карточки версий в Settings (owner: Codex, updated: 2025-11-20)
### Stream: Provider versions
1. [DONE] Экспортировать из ядра используемые/глобальные версии и latest (@latest) для Claude (CLI + SDK) и Codex (CLI + SDK); добавить используемую/latest для gemini-cli-core. (scope: core status/API; коммит обязателен, сообщение: "feat: expose provider version status", commit: 483ce6e)
2. [DONE] Отрендерить в Settings версии с предупреждением и карточками; поднять блок версий Claude над “Claude Thinking Settings”; добавить кнопки статусов (up-to-date/Update → target) для Claude/Codex; Gemini — только инфо. (scope: settings UI; коммит обязателен, сообщение: "feat: settings version cards and update UI", commit: 8ca3bbb)
3. [DONE] Реализовать действия обновления для Claude/Codex через `npm install -g ...@latest`, предупредить о закрытии активных сессий; по завершении ядро обновляет провайдер и статус для UI. (scope: core update wiring; коммит обязателен, сообщение: "feat: provider version update actions", commit: 8ca3bbb)
### Stream: Gemini info
4. [DONE] Показать используемую и latest версии gemini-cli-core, указать что обновление выполняют разработчики (без кнопки). (scope: settings UI; коммит обязателен, сообщение: "feat: settings gemini version info", commit: 8ca3bbb)

## Фаза 2 — Fixes & Polish (owner: Antigravity, updated: 2025-11-22)
### Stream: Bugfixes
1. [DONE] Исправить отображение локальной версии Gemini CLI (сейчас "Not detected"). (scope: core/gemini-module)

## Финальные действия
- Выполнить сборку нового пакета по инструкции (перед запуском сборки рабочее дерево должно быть чистым).
