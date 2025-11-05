# План разработки — Unified Session Storage

## Легенда
- TODO — задача запланирована
- IN_PROGRESS — работа ведётся
- DONE — задача завершена

## Фаза 1 — Запуск storage writer (owner: Codex, обновлено: 2025-11-05)
- [DONE] Спроектировать пути хранения — workspace slug берём из `claudeProjectSlug`, файлы пишем в `~/.codeai-hub/sessions/{slug}/{provider}/{providerSessionId}.jsonl`
- [DONE] Реализовать фасад writer’a — пакет `@codeai-hub/unified-session` создаёт записи `session-open`/`message`/`session-close` и поддерживает JSON-метаданные
- [DONE] Подключить адаптеры провайдеров — RemoteBridge использует `UnifiedSessionStorage`, пишет события user/thinking/assistant после биндинга (Claude, Codex, Gemini)
- Коммит: d658511 — feat: unified session writer

## Фаза 2 — Интеграция чтения и refresh (owner: Codex, обновлено: 2025-11-05)
- [DONE] Реализовать reader API — core выдаёт `/api/v1/sessions/:id/history`, читая JSONL через `UnifiedSessionStorage`
- [DONE] Подключить refresh-флоу — webview после `core:state` подтягивает историю и публикует `session:history`
- [TODO] Добавить smoke-тесты/чек-лист — проверить сохранность истории после перезапуска VS Code и core
- Коммит: — TODO (ожидается: feat: unified-storage-reader)

## Backlog / Следующие типы
- [TODO] Расширить writer/reader дополнительными типами событий (tool, error, system и т.д.)
- [TODO] Собирать объединённые ленты (`combined/` каталоги) после появления мульти-провайдерной оркестрации
