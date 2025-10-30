# Development TODO Plan — Gemini Module (Node 20 + CLI Bridge)

## Legend
- TODO — задача запланирована
- IN_PROGRESS — работа ведётся
- BLOCKED — требуется внешнее действие
- DONE — задача завершена

## Status Overview
- Module version: `@codeai-hub/gemini-module@0.3.1`
- Core version: `@codeai-hub/core@0.2.21`
- VSIX version: `codeai-hub@1.1.73`
- Runtime staging: `~/.codeai-hub/providers/gemini/0.3.1` (dist + vendor), официальные CLI пакеты подтягиваются при инициализации

## Phase 1 — Architecture Reset (owner: Codex, updated: 2025-10-30)
- [DONE] Выделить новую архитектуру: чистый CJS-модуль, поставка Node 20 runtime, хранение всех артефактов в `~/.codeai-hub`. (docs обновлены)

## Phase 2 — Adapter & Installer (owner: Codex, updated: 2025-10-30)
- [DONE] Адаптер переписан на CJS, взаимодействует с CLI bridge.
- [DONE] Инсталлятор качает официальные `@google/gemini-cli(-core)` в `vendor/node_modules`, манифесты указывают на локальный `file://` кеш.

## Phase 3 — Core & Extension Integration (owner: Codex, updated: 2025-10-30)
- [DONE] Core запускается через Node20 (JS bundle + runtime). Extension пробрасывает пути и окружение.

## Phase 4 — Validation & Outstanding Issues (owner: Codex, updated: 2025-10-30)
- [DONE] Реализован асинхронный мост на динамическом `import()`, CLI и CLI Core подтягиваются в CJS за счёт `Function(\"return import(...)\")`.
- [DONE] Инсталлятор теперь устанавливает зависимости `npm install --omit=dev`, что позволяет ESM-модулям корректно тянуть `yargs`, `@opentelemetry/*` и др.
- [TODO] Повторить e2e (fresh VSIX → автоустановка CLI → сессия Gemini) после реализации моста.
- [TODO] Добавить автоматическую проверку зависимостей CLI перед запуском ядра (health-check).

## Backlog / Parking Lot
- [TODO] Реализовать worker-процесс для ESM в отдельном Node20 или полноценный bundle CLI Core в CJS.
- [TODO] Автоматизировать проверку обновлений CLI через npm registry.
- [TODO] Расширить документацию по инсталлятору и Node runtime в SystemArchitecture.
