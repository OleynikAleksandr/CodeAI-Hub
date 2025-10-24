# Стартовая CEF-обёртка для локального клиента (stub)

**Дата:** 2025-10-23  
**Цель:** описать минимальную реализацию приложения на Chromium Embedded Framework, которое воспроизводит текущий функционал локального веб-клиента CodeAI Hub с заглушками.

> **Примечание:** настоящее значение — Stage 2 (план). Версия 1.0.36 использует официальный `cefclient` как временный лаунчер; спецификация ниже остаётся для будущей реализации собственного контейнера.

---

## 1. Архитектура лаунчера
- Язык реализации: C++17 (поддерживается всеми официальными CEF toolchains).
- Сборка: CMake (используем `cmake/` из CEF-пакета) с отдельными таргетами для Windows, macOS, Linux.
- Структура проекта:
```
launcher/
  CMakeLists.txt
  include/
    app_delegate.h
    browser_client.h
    resource_scheme_handler.h
    stub_bridge.h
  src/
    main_win.cc | main_mac.mm | main_linux.cc
    app_delegate.cc
    browser_client.cc
    resource_scheme_handler.cc
    stub_bridge.cc
  resources/
    Info.plist (macOS)
    codeai-hub.desktop (Linux ярлык)
```
- Рабочий каталог (configurable) — `<install-root>/config.json` определяет пути до UI и режим работы (stub/remote).

## 2. Загрузка UI-ресурсов
- При старте лаунчер читает `config.json` (генерируется расширением) со структурой:
```json
{
  "uiRoot": "{EXTENSION_PATH}/media/web-client/dist",
  "entry": "index.html",
  "bridge": {
    "mode": "stub"
  }
}
```
- Регистрируется кастомная схема `codeaihub://` с помощью `CefSchemeRegistrar`. `resource_scheme_handler` сопоставляет URL-ам файлы из `uiRoot`.
- Основной браузер создаётся по адресу `codeaihub://app/index.html`. Это исключает проблемы с `file://` (CORS, ограничения cookie).
- Файлы с расширением `.js`, `.css`, `.json` и ассеты читаются напрямую с диска, MIME опредёляем по таблице.
- На текущем этапе (macOS arm64) лаунчер продолжает работать с `--url=file://...`, а `config.json` используется для хранения метаданных и подготовки к переходу на `codeaihub://`.

## 3. Конфигурация браузера
- `CefBrowserSettings`:
  - `windowless_frame_rate = 60`
  - `plugins_disabled = true`
  - `background_color = CefColorSetARGB(0xFF, 0x1e, 0x1e, 0x1e)` (совпадает с темой).
  - `javascript = STATE_ENABLED` (по умолчанию).
- Окно:
  - Windows/Linux: создаём стандартное окно 1280x800 с drag-to-resize.
  - macOS: NSWindow с `NSTitledWindowMask` и контролами.
- Заголовок окна: «CodeAI Hub» + активная сессия (обновляется по сообщениям от UI).

## 4. Stub-мост сообщений
- Используем `CefMessageRouterBrowserSide`/`CefMessageRouterRendererSide` для обмена между JS и C++.
- На стороне JS внедряем скрипт при событии `OnContextCreated`:
```js
window.codeaiHub = {
  invoke(command, payload) {
    return window.cefQuery({
      request: JSON.stringify({ command, payload })
    });
  }
};
```
- Дополнительно оставляем нынешний механизм `initializeStandaloneEnvironment`: поскольку он уже обеспечивает заглушки, на этапе stub мы просто предоставляем идентичный API (`postMessage`).
- `stub_bridge` реализует обработчики команда → реакция, повторяя текущую логику (см. `ProviderRegistry`, `SessionLauncher`). Реализация на C++ вызывает те же TypeScript модули? Нет, чтобы избежать дублирования, используем готовый `app.js` (JS). Поэтому мост на C++ отвечает только за обновление заголовка и логирование.
- Для будущей интеграции с Remote UI Bridge `stub_bridge` будет заменён серверным IPC, но интерфейс JS (`window.codeaiHub.invoke`) останется.

## 5. Отображение заглушек
- При запуске лаунчер читает `stub_state.json` (опционально), чтобы восстанавливать список фиктивных сессий, созданных пользователем ранее.
- Сообщения из JS, которые ранее обрабатывались TypeScript-стабами (`providerPicker:confirm`, `providerPicker:cancel`, `newSession`), остаются внутри JS (используются функции из `environment.ts`). Лаунчер только логирует их в консоль CEF.

## 6. Интеграция с shortcuts
- Windows: `.lnk` будет указывать на `CodeAIHubLauncher.exe` и прокидывать `--config` + `--url`. При запуске лаунчер ищет `config/config.json` рядом с бинарём.
- macOS: создаём `.app`, в `Contents/MacOS/CodeAIHubLauncher` лежит бинарь. `Info.plist` настраивает иконку (`icon.icns`).
- Linux: создаём `codeai-hub-launcher` и `.desktop` файл. При первом запуске проверяем наличие зависимостей (`ldd` или предварительный список библиотек).

## 7. Сборка и упаковка
- В репозитории создаём `packages/cef-launcher/` (CMake проект). Скрипт сборки:
```
cmake -B build -DPROJECT_PLATFORM=windows-x64 -DCEF_ROOT=</path/to/cef>
cmake --build build --config Release
```
- Полученные артефакты копируем в `dist/<platform>/launcher/` и архивируем вместе с манифестом.
- Добавляем GitHub Actions (или локальный скрипт) для сборки трёх платформ (кросс-компиляция для macOS/Windows выполняется на соответствующих агентах).

## 8. Режимы запуска
- `--mode=stub` (по умолчанию) — все запросы остаются внутри клиента; используется до появления Remote UI Bridge.
- `--mode=bridge --bridge-url=ws://localhost:6090/ws` — зарезервировано.
- Флаг `--devtools` включает `CefBrowserHost::ShowDevTools` для отладки.

## 9. Логирование и диагностика
- Логи лаунчера пишутся в `~/.codeai-hub/logs/cef-launcher.log` (используем `CefLogSeverity::LOGSEVERITY_INFO`).
- В stub-режиме логируем события `newSession`, `providerPicker:confirm`, `launchWebClient` и ошибки загрузки ресурсов.

## 10. TODO для реализации
1. Подготовить каркас CMake и шаблоны `main_*` для каждой платформы.
2. Реализовать загрузчик конфигурации и регистрацию схемы `codeaihub://`.
3. Подключить `CefMessageRouter` и базовые хендлеры (пока только логирование).
4. Обеспечить открытие DevTools по `Ctrl+Shift+I / Cmd+Option+I` в режиме разработки.
5. Подготовить иконки (PNG → ICO/ICNS/SVG) и обновить ярлыки.
6. Описать инструкции по сборке в `doc/Project_Docs/Build/CEFLauncherBuild.md` (отдельная задача).
