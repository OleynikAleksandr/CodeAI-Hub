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
- [TODO] Шаг 5: Обновить UI/extension/standalone слои для выбора и отображения статуса Gemini (provider picker, настройки, сообщения).
  - Checks: `npx ultracite fix` → `scripts/check-architecture.sh` → `npm run lint` → `npm run check:tsprune`
  - Commit: pending
- [TODO] Шаг 6: Актуализировать документацию и `doc/TODO/todo-plan_Gemini_Module.md` (описания архитектуры, состояние плана, фиксация выполненных шагов и их коммитов).
  - Checks: `npx ultracite fix` → `scripts/check-architecture.sh` → `npm run lint` → `npm run check:tsprune`
  - Commit: pending

## Backlog / Parking Lot
- [TODO] Исследовать подключение Tools API / MCP серверов через `settings.json`
- [TODO] Проработать fallback сценарий с Gemini API key (AI Studio) на случай отсутствия CLI
- [TODO] Рассмотреть Windows-поддержку (PowerShell, пути установки npm)
