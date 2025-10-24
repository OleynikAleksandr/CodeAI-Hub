# Custom CEF Launcher Build Guide

**Status:** In progress (macOS arm64 automated delivery ready)  
**Last Updated:** 2025-10-23

This document captures the work-in-progress plan for Stage 2 миграции локального клиента — переход с стандартного `cefclient` на собственный лаунчер без браузерных элементов.

## Цели
- Собрать бинарь `CodeAIHubLauncher` на основе CEF, который открывает CodeAI Hub UI без адресной строки и системного меню.
- Распространять бинарь отдельно от VSIX (через публичный репозиторий), а расширение будет скачивать его при установке.
- Сохранить текущую архитектуру: UI бандл по-прежнему лежит в `media/web-client/dist/`, а лаунчер только разворачивает окно и загружает `index.html`.

## Текущий прогресс
- Расширение автоматически вызывает `ensureLauncherInstalled`, который читает `assets/launcher/manifest.json`, скачивает архив лаунчера и разворачивает его в `~/.codeai-hub/cef-launcher/<platform>/<launcherVersion>/` (macOS arm64).
- Реализован fallback: если бинарь уже установлен вручную (через `scripts/build-cef-launcher.sh`), установщик создаёт `install.json` и использует локальный артефакт без повторного скачивания.
- Скрипт `scripts/build-cef-launcher.sh` по-прежнему собирает `CodeAIHubLauncher`, устанавливает его в `~/.codeai-hub/cef-launcher/<platform>/` и складывает копию в `binaries/cef-launcher/<platform>/` для публикации.
- Лаунчер корректно инициализирует CEF: `framework_dir_path` указывает на сам `Chromium Embedded Framework.framework`, `CEF_ICU_DATA_PATH` прокидывается до `icudtl.dat`, хелпер запускается через `browser_subprocess_path`, а флаг `--single-process` удалён.

## Структура размещения
```
~/.codeai-hub/
  cef-launcher/
    manifest.json
    darwin-arm64/
      0.1.0/
        CodeAIHubLauncher.app/             # macOS bundle
        install.json
      downloads/
        codeai-hub-launcher-darwin-arm64.tar.bz2
```
- При запуске команда `Launch Web Client` сначала ищет версию из манифеста. Если каталога `<launcherVersion>/` нет, но присутствует старый путь (`CodeAIHubLauncher.app` без версии), он используется как fallback.
- Для остальных платформ структура будет унифицирована после появления соответствующих артефактов (`<platform>/<launcherVersion>/` + `install.json` + `downloads/`).

## Сборка (предварительный сценарий)
### Скрипт автоматической сборки
В репозитории доступен скрипт `scripts/build-cef-launcher.sh`, который выполняет полный цикл:

```bash
./scripts/build-cef-launcher.sh [--cef-version <версии>] [--force]
```

Скрипт:
1. Скачивает минимальный дистрибутив CEF для текущей платформы.
2. Конфигурирует и собирает официальный пример `cefsimple` через CMake.
3. Копирует артефакты в `~/.codeai-hub/cef-launcher/<platform>/`, переименовывая их в `CodeAIHubLauncher`.

Поддержка macOS (x64/arm64) и Linux x64 реализована. Windows требует отдельной настройки (TODO: запуск из Visual Studio developer prompt).

### Ручной сценарий
1. Скачать официальные minimal-пакеты CEF соответствующей платформы.
2. Сформировать build-директорию и запустить CMake напрямую из каталога CEF, указав `-DPROJECT=cefsimple`.
3. Переименовать собранный `cefsimple` в `CodeAIHubLauncher` и разместить в `~/.codeai-hub/cef-launcher/<platform>/`.
4. Перезапустить `Launch Web Client` — расширение обнаружит новый лаунчер.

## Открытые задачи
- Согласовать переход от временного решения (на базе `cefsimple`) к собственному CMake-проекту (`Stage 11`), когда появится потребность в кастомном UI/окнах.
- Подготовить мультиплатформенные артефакты (macOS x64, Windows x64/arm64, Linux x64), включая упаковку и публикацию.
- Формализовать процесс выпуска бинарей (хостинг, подпись, хранение SHA-1) и автоматизировать обновление `assets/launcher/manifest.json`.
