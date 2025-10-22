# Provider Picker — диалог выбора стэков провайдеров

## Назначение
- Обеспечить старт новой сессии с одним или несколькими AI-провайдерами в CodeAI Hub.
- Давать пользователю прозрачную обратную связь о том, какие CLI подключены (сейчас используются stub-дескрипторы Claude Code CLI, Codex CLI, Gemini CLI).
- Подготовить почву для будущих multi-agent сценариев, сохраняя UI и core контракты неизменными.

## Архитектурные аспекты
- **Core**: `ProviderRegistry` (`src/core/providers/provider-registry.ts`) отдаёт список доступных стеков и статусы подключения. `SessionLauncher` (`src/core/session/session-launcher.ts`) получает список выбранных ID и возвращает результат запуска (пока stub c текстовым summary, но уже нормализует ID и обеспечивает уникальность).
- **Extension**: `HomeViewMessageRouter` перехватывает команду `newSession`, запрашивает список стеков у `ProviderRegistry` и отправляет webview сообщение `providerPicker:open`. После подтверждения UI данные валидируются и передаются в `SessionLauncher`.
- **Webview**: React-бандл `media/react-chat.js` (собирается через `npm run build:webview`) монтирует компонент `ProviderPicker` (`src/client/ui/src/provider-picker.tsx`), который отображает чекбоксы, считает выбранные стеки и отправляет `providerPicker:confirm/cancel`.
- **Статика**: панель кнопок остаётся в `media/main-view.*`; новый диалог рендерится под панелью, соблюдая стили и a11y-ограничения (фокус на первом чекбоксе, `role="status"` для подсказок).

## Поток взаимодействий
1. Пользователь кликает `New Session` (панель `main-view`).
2. Extension получает команду, извлекает список подключённых стеков и отправляет webview payload `providers`.
3. React-компонент сбрасывает прошлый выбор, фокусирует первый чекбокс и отображает список.
4. После подтверждения webview отправляет `providerPicker:confirm` с массивом ID (эпизодические комбинации).
5. Extension валидирует ID, вызывает `SessionLauncher`. Сейчас это заканчивается toast-сообщением; позже будет инициироваться полноценный сценарий создания сессии.
6. Любой отказ (`Cancel` или пустой выбор) приводит к `providerPicker:cancel` и информационному toast.

## Дальнейшие шаги
- Подключить реальный discovery CLI (вместо статических заглушек) и расширить дескриптор статусами `installed/authenticated`.
- Передавать из `SessionLauncher` более богатый контракт (ID вкладки, параметры orchestration) в будущий Session Orchestrator.
- Покрыть компонент тестами после подключения полноценного React-пайплайна (например, Vitest + testing-library).
