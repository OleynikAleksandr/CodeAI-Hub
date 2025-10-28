# Development TODO Plan — Gemini CLI Module

## Легенда
- TODO — задача запланирована
- IN_PROGRESS — работа ведётся
- BLOCKED — требуется внешнее действие
- DONE — задача завершена

## Gemini CLI Module — Интеграция Google Gemini CLI (owner: Codex, updated: 2025-10-28)
**Цель:** Подключить официальный `@google/gemini-cli` к CodeAI Hub: обнаружение CLI, управление OAuth, потоковая работа через stdin/stdout и единый формат сообщений.

- [DONE] Шаг 1: Подготовить каркас пакета `packages/Gemini_Module` (структура каталогов, `package.json`, `tsconfig.json`, `src/index.ts`, базовые типы и заглушки).
  - Checks: `npx ultracite fix` → `scripts/check-architecture.sh` → `npm run lint` → `npm run check:tsprune`
  - Commit: 851c8d8 — feat: add gemini module skeleton
- [DONE] Шаг 2: Реализовать Gemini CLI Installer (поиск бинаря, проверка версии, валидация OAuth-токена, логирование).
  - Checks: `npx ultracite fix` → `scripts/check-architecture.sh` → `npm run lint` → `npm run check:tsprune`
  - Commit: 4dc3502 — feat: implement gemini installer
- [DONE] Шаг 3: Реализовать `GeminiSessionManager`, JSON message processor и `GeminiProviderAdapter` (запуск `gemini -o json`, подписка на stdout/stderr, преобразование ответов).
  - Checks: `npx ultracite fix` → `scripts/check-architecture.sh` → `npm run lint` → `npm run check:tsprune`
  - Commit: 74a4b3e — feat: implement gemini session pipeline
- [DONE] Шаг 4: Подключить модуль к ядру (`packages/core`): обновить `ProviderRegistry`, конфигурацию и Remote Bridge для работы с Gemini.
  - Checks: `npx ultracite fix` → `scripts/check-architecture.sh` → `npm run lint` → `npm run check:tsprune`
  - Commit: 36dcd0e — feat: register gemini provider in core
- [DONE] Шаг 5: Обновить UI/extension/standalone слои для выбора и отображения статуса Gemini (provider picker, настройки, сообщения).
  - Checks: `npx ultracite fix` → `scripts/check-architecture.sh` → `npm run lint` → `npm run check:tsprune`
  - Commit: 14cbfb3 — feat: surface gemini provider in ui
- [DONE] Шаг 6: Актуализировать документацию и `doc/TODO/todo-plan_Gemini_Module.md` (описания архитектуры, состояние плана, фиксация выполненных шагов и их коммитов).
  - Checks: `npx ultracite fix` → `scripts/check-architecture.sh` → `npm run lint` → `npm run check:tsprune`
  - Commit: aa2708d — docs: document gemini integration
- [DONE] Шаг 7: Добавить полнофункциональный сборщик `scripts/build-gemini-module.sh`, манифест `assets/providers/gemini/manifest.json` и обновить `release-utils.sh` (учёт gemini-архивов).
  - Checks: `npx ultracite fix` → `scripts/check-architecture.sh` → `npm run lint` → `npm run check:tsprune`
  - Commit: 0a225a6 — chore: add gemini module builder
- [DONE] Шаг 8: Сформировать архив Gemini (скрипт `build-gemini-module.sh --version 0.1.0`), разложить в `doc/tmp/releases` и `~/.codeai-hub/providers/gemini/0.1.0`, обновить локальные кеши/манифест.
  - Checks: `npx ultracite fix` → `scripts/check-architecture.sh` → `npm run lint` → `npm run check:tsprune`
  - Commit: 00a6930 — chore: build gemini module v0.1.0
- [DONE] Шаг 9: Собрать ядро `codeai-hub-core` версии 0.2.8 (скрипт `build-core.sh --version 0.2.8`), проверить установку в `~/.codeai-hub/core` и актуализацию манифестов.
  - Checks: `npx ultracite fix` → `scripts/check-architecture.sh` → `npm run lint` → `npm run check:tsprune`
  - Commit: dea4ed3 — chore: build core orchestrator v0.2.8
- [DONE] Шаг 10: Пересобрать VSIX 1.1.27 (ручной `npm run compile` + `npx vsce package` после установки Gemini/Core), убедиться, что манифесты ссылок на актуальные артефакты добавлены.
  - Checks: `npx ultracite fix` → `scripts/check-architecture.sh` → `npm run lint` → `npm run check:tsprune`
  - Commit: packaging-only (изменения в Git не требовались)
- [IN_PROGRESS] Шаг 11: Провести e2e-проверку — fresh install VSIX, запуск ядра, создание новой сессии Gemini, получение ответа. Зафиксировать результат и обновить документацию (при необходимости) + коммит.
  - Notes: CLI `@google/gemini-cli@0.10.0`, модуль `0.1.3`, core `0.2.10`, VSIX 1.1.32. После публикации артефактов повторить ручной прогон UI и задокументировать результат.

## Backlog / Parking Lot
- [TODO] Исследовать подключение Tools API / MCP серверов через `settings.json`
- [TODO] Проработать fallback сценарий с Gemini API key (AI Studio) на случай отсутствия CLI
- [TODO] Рассмотреть Windows-поддержку (PowerShell, пути установки npm)
