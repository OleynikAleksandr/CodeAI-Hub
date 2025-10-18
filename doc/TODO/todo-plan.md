# План разработки

## Легенда
- TODO — задача запланирована
- IN_PROGRESS — работа ведётся
- BLOCKED — требуется внешнее действие
- DONE — задача завершена

## Фаза 4 — Декомпозиция UI (ответственный: Codex, обновлено: 2025-10-19)
- [DONE] Разбить `src/webview/ui/src/app-host.tsx` (299 линий) на фасад и микрокомпоненты, удержав каждую часть <200 строк.
  - Заметки: Состояние вынесено в хуки `useProviderPickerState`, `useSessionStore`, `useSettingsVisibility`, `useWebviewMessageHandler`.
- [DONE] Декомпозировать `src/webview/ui/src/components/settings-view.tsx` (278 линий), отделив структуру модалки от обработчиков.
  - Заметки: Добавлены `SettingsHeader`, `SettingsFooter`, хук `useSettingsState`.
- [DONE] Упростить `src/webview/ui/src/components/settings/thinking-settings.tsx` (264 линии) через вынос повторяющихся блоков настроек.
  - Заметки: Созданы компоненты `ThinkingToggle`, `ThinkingTokenInput`, `ThinkingProTip` и файл `thinking/constants.ts`.
- [DONE] Разделить `src/extension-module/home-view-message-router.ts` (277 линий) на маршрутизатор и отдельные обработчики сообщений.
  - Заметки: Логика вынесена в `command-handler.ts`, `provider-picker-handler.ts`, `layout-utils.ts`, `message-types.ts`, `serialization.ts`.
- [DONE] Повторно запустить `./scripts/check-architecture.sh` и зафиксировать отсутствие предупреждений.
- Commit: _pending

## Backlog / Parking Lot
- [TODO] Реализовать динамическое определение установленных CLI провайдеров вместо заглушек.
- [TODO] Добавить шаблоны сочетаний провайдеров для мультиагентных сценариев.
