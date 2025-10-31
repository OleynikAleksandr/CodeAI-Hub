# Development TODO Plan — Provider CLI Verification & Release Workflow

## Legend
- TODO — задача запланирована
- IN_PROGRESS — работа ведётся
- BLOCKED — требуется внешнее действие
- DONE — задача завершена

## Phase 1 — CLI Presence Detection (owner: Codex, updated: 2025-10-31)
**Цель:** перед запуском модулей убедиться, что пользователь уже установил официальные CLI/SDK и прошёл аутентификацию.
- [TODO] Сформировать перечень минимальных требований по каждому провайдеру (Anthropic Claude, OpenAI Codex, Google Gemini) — пути, бинарники, конфиги, команды проверки.
- [TODO] Реализовать сервис проверки (`packages/core` + `packages/*_Module`): асинхронный health-check, возвращающий статус `installed/authenticated/missing`.
- [TODO] Добавить в ядро обработку статуса провайдера при инициализации и в ответах `/health` / `/metrics`.
- [TODO] Расширить RemoteBridge сообщениями предупреждений для UI (webview + CEF) с конкретными инструкциями.
- [TODO] Подготовить пользовательское руководство "Manual Provider Setup" (описание установки CLI, команд аутентификации, tip по отказу от провайдера).

## Phase 2 — Settings Integration & Provider Management (owner: Codex, updated: 2025-10-31)
**Цель:** предоставить UI для управления доступными провайдерами и реакции на отсутствие CLI.
- [TODO] Добавить раздел `Provider Setup` в Settings UI c индикаторами статуса (`Installed`, `Auth required`, `Disabled`).
- [TODO] Реализовать кнопки «Показать инструкцию» / «Отключить провайдера»; хранить состояние деактивации в конфигурации ядра.
- [TODO] В `ProviderRegistry` поддержать динамическое включение/исключение провайдеров на основании состояния пользовательских настроек.
- [TODO] Обновить документацию (`Architecture.md`, `SystemArchitecture.md`, модульные файлы) и knowledge base с новыми пользовательскими сценариями.

## Phase 3 — Quality Gate & Release Pipeline (owner: Codex, updated: 2025-10-31)
**Цель:** обеспечить строгий процесс релиза после изменений по проверкам CLI.
- [TODO] Подготовить автоматические тесты/скрипты (в том числе моковые), которые проверяют реакции системы на отсутствие CLI.
- [TODO] Обновить линтеры/скрипты (Ultracite, архитектурный чек) чтобы контролировать наличие инструкций и статусов.
- [TODO] По завершении фичи пересобрать все изменённые модули (`build-claude-module.sh`, `build-codex-module.sh`, `build-gemini-module.sh`, `build-core.sh`, `build-cef-launcher.sh`) с инкрементом версий и обновлением манифестов.
- [TODO] Выполнить финальный релиз VSIX через `./scripts/build-release.sh <new-version>` и задокументировать результаты (CHANGELOG, Sessions report).

## Backlog / Parking Lot
- [TODO] Проработать расширение списка провайдеров (Anthropic Claude, OpenAI Codex, Google Gemini — базовый набор) и подготовить шаблон для будущих интеграций.
- [TODO] Исследовать автоматическую диагностику типичных ошибок CLI (например, истёкшие токены) и предложить рекомендации в UI.
- [TODO] Создать wizard/assistant, который пошагово проведёт пользователя по установке CLI при желании (без автоматической установки).
