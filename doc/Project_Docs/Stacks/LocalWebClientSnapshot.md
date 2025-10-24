# Локальный веб-клиент CodeAI Hub — состояние до миграции на CEF

**Версия слепка:** 2025-10-23  
**Назначение:** зафиксировать текущее устройство локального веб-клиента, который открывается в стандартном браузере (Safari на macOS), чтобы на его основе выполнить перенос на Chromium Embedded Framework.

---

## 1. Цепочка запуска
- Команда `codeaiHub.launchWebClient` регистрируется в `package.json` и обработана в `src/extension.ts:21-47`. При вызове собирается путь `media/web-client/dist/index.html`, проверяется наличие файла и открывается через `env.openExternal(Uri.file(...))`, что передаёт управление системному браузеру по умолчанию.
- Вызов команды доступен из:
  - Кнопки `UI Outside` на панели действий webview (`src/client/ui/src/components/action-bar/index.tsx:16-54`).
  - Шортката на рабочем столе, создаваемого модулем `ensureWebClientShortcuts` при активации расширения (`src/extension-module/web-client/shortcut-manager.ts`).
- Модуль ярлыков создаёт платформо-специфичные ссылки на тот же `index.html`:
  - Windows: `.lnk` через COM (`ensureWindowsShortcut`).
  - macOS: мини-приложение `.app`, которое запускает `open file://...`.
  - Linux: `.desktop` в `~/.local/share/applications`, с `xdg-open`.

## 2. Статический бандл
- Исходники локального клиента находятся в `src/client/web-client/`. Точка входа `index.tsx` подключает общие React-компоненты из `src/client/ui/src`.
- Сборка выполняется скриптом `scripts/build-web-client.js` (esbuild). Он помещает результаты в `media/web-client/dist/`, копирует `index.html` из `media/web-client/index.html` и инлайт CSS (`media/main-view.css`, `media/session-view.css`, `media/react-chat.css`).
- Готовый `index.html` содержит базовый лоадер и обработчики ошибок. `app.js` — бандл React-приложения с не минифицированным кодом для отладки.

## 3. Имитация окружения VS Code
- Функция `initializeStandaloneEnvironment` (`src/client/web-client/environment.ts`) создаёт суррогат `acquireVsCodeApi` и `window.vscode`, если клиент запускается вне webview.
- Переопределённый API маршрутизирует сообщения обратно в клиентскую логику вместо Extension Host, сохраняя согласованный контракт сообщений.
- Если клиент запущен внутри webview (реальный `acquireVsCodeApi` существует), переопределение не применится.

## 4. Заглушки провайдеров и сессий
- `ProviderRegistry` (`src/core/providers/provider-registry.ts`) возвращает статические стеки провайдеров с флагом `connected: true`.
- `SessionLauncher` (`src/core/session/session-launcher.ts`) формирует искусственные сессии: генерирует `session-{timestamp}-{sequence}`, устанавливает заголовок `Session {sequence}` и возвращает событие `session:created`.
- Эти компоненты используются в standalone-окружении для эмуляции будущих вызовов Core Orchestrator.

## 5. Обмен сообщениями и UI
- UI-ядро (`src/client/ui/src/app-host.tsx`) слушает события `window.postMessage` через `useWebviewMessageHandler`. Обработка покрывает: `providerPicker:open`, `session:created`, `session:clearAll`, `session:focusLast`, `ui:showSettings`.
- Панель действий отправляет команды (`newSession`, `lastSession`, `launchWebClient`, `oldSessions`) через `postVsCodeMessage`. В standalone-режиме они попадают в локальный роутер (`createStandaloneRouter` из `environment.ts`).
- При выборе провайдеров веб-клиент подтверждает выбор сообщением `providerPicker:confirm`, которое перехватывает локальный роутер, создаёт сессию и возвращает `session:created`. История сообщений не сохраняется.
- Экран настроек (`SettingsView`) открывается через событие `ui:showSettings`, инициированное командой `codeaiHub.openSettings` или `HomeViewProvider.showSettingsPlaceholder()`.

## 6. Ограничения текущего решения
- Нет взаимодействия с реальным Remote UI Bridge: все данные статические, команды не выходят за пределы бандла.
- Запуск зависит от системного браузера, что лишает контроля над версией движка, доступом к файловой системе и окнам.
- Ярлык открывает HTML-файл напрямую; отсутствует механизм обновления или проверки целостности, помимо проверки наличия файла.
- В Safari (и других браузерах) действуют ограничения CSP и origin, что осложняет будущие интеграции (WebSocket, локальные ресурсы).

## 7. Точки интеграции для миграции на CEF
- Команда `codeaiHub.launchWebClient` и функции `ensureWebClientShortcuts` должны запускать CEF-бинарь вместо `index.html`.
- Пакет `media/web-client/dist/` останется источником UI-ресурсов, но необходимо упаковать их внутрь приложения CEF или обслуживать через локальный сервер.
- Модуль `environment.ts` нужно расширить/заменить на интеграцию с будущим Remote UI Bridge, но до его появления сохраняем текущие заглушки.
- Скрипты сборки (`build-web-client.js`) и инфраструктура доставки ресурсов должны учитывать, что UI больше не открывается напрямую в браузере, а грузится CEF-шеллом.
