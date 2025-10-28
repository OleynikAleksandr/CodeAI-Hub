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
- [TODO] Шаг 7: Добавить полнофункциональный сборщик `scripts/build-gemini-module.sh`, манифест `assets/providers/gemini/manifest.json` и обновить `release-utils.sh` (учёт gemini-архивов).
  - Checks: `npx ultracite fix` → `scripts/check-architecture.sh` → `npm run lint` → `npm run check:tsprune`
  - Commit: pending
- [TODO] Шаг 8: Сформировать архив Gemini (скрипт `build-gemini-module.sh --version <semver>`), разложить в `doc/tmp/releases` и `~/.codeai-hub/providers/gemini/<version>`, обновить локальные кеши/манифест.
  - Checks: `npx ultracite fix` → `scripts/check-architecture.sh` → `npm run lint` → `npm run check:tsprune`
  - Commit: pending
- [TODO] Шаг 9: Собрать ядро `codeai-hub-core` версии 0.2.8 (скрипт `build-core.sh --version 0.2.8`), проверить установку в `~/.codeai-hub/core` и актуализацию манифестов.
  - Checks: `npx ultracite fix` → `scripts/check-architecture.sh` → `npm run lint` → `npm run check:tsprune`
  - Commit: pending
- [TODO] Шаг 10: Пересобрать VSIX 1.1.28 (повторный `build-release.sh` после установки Gemini/Core), убедиться, что манифесты ссылок на актуальные артефакты добавлены.
  - Checks: `npx ultracite fix` → `scripts/check-architecture.sh` → `npm run lint` → `npm run check:tsprune`
  - Commit: pending
- [TODO] Шаг 11: Провести e2e-проверку — fresh install VSIX, запуск ядра, создание новой сессии Gemini, получение ответа. Зафиксировать результат и обновить документацию (при необходимости) + коммит.
  - Checks: `npx ultracite fix` → `scripts/check-architecture.sh` → `npm run lint` → `npm run check:tsprune`
  - Commit: pending

## Backlog / Parking Lot
- [TODO] Исследовать подключение Tools API / MCP серверов через `settings.json`
- [TODO] Проработать fallback сценарий с Gemini API key (AI Studio) на случай отсутствия CLI
- [TODO] Рассмотреть Windows-поддержку (PowerShell, пути установки npm)
