# План доставки и обновления CEF-пакетов

**Дата:** 2025-10-23  
**Контекст:** расширение CodeAI Hub должно скачивать и поддерживать Chromium Embedded Framework для локального клиента, заменяющего запуск в стороннем браузере.

## Текущий статус внедрения
- **Stage 1 (реализовано в v1.0.36):** расширение скачивает официальные `client`-сборки CEF и запускает встроенный `cefclient` с параметром `--url=file://.../index.html`. Ярлыки указывают напрямую на бинарник `cefclient`.
- **Stage 2 (в работе):** для macOS arm64 реализована автоматическая установка `CodeAIHubLauncher` из `assets/launcher/manifest.json`, создание `config.json` и запуск без вмешательства пользователя. Сборки и поставка для остальных платформ остаются в очереди.

---

## 1. Цели и ограничения
- Поставлять три платформы: Windows x64, macOS универсальные (x64+arm64), Linux x64.
- Исключить поставку громоздких бинарей внутри VSIX (лимит Marketplace ~100 МБ).
- Обеспечить автообновление при релизах расширения и возможность принудительной переустановки.
- Обрабатывать отсутствие сети, прерывания скачивания, повреждённые архивы.

## 2. Директория установки
Stage 1 (текущая реализация):
```
~/.codeai-hub/
  cef/
    manifest.json
    win32-x64/
      141.0.10+g1d65b0d+...
        Release/           # содержимое архива client
        Resources/
        install.json
    darwin-arm64/
      141.0.10+g1d65b0d+...
        Release/
        install.json
    linux-x64/
      142.0.4+g8cfb2b2+...
        Release/
        install.json
```
- `install.json` фиксирует платформу, версию и дату установки.

Stage 2 (текущая реализация для macOS arm64 / план для остальных платформ):
```
~/.codeai-hub/
  cef/
    manifest.json
    windows-x64/
      141.0.10/
        cef/            # распакованный архив
        launcher/       # кастомный exe + вспомогательные файлы
    macos-universal/
      141.0.10+g1d65b0d+...
        cef/
  cef-launcher/
    manifest.json
    darwin-arm64/
      0.1.0/
        CodeAIHubLauncher.app/
        install.json
    linux-x64/
      142.0.4-beta/
        cef/
        launcher/
```
- После адаптации остальных платформ структура `cef-launcher/<platform>/<launcherVersion>/` будет унифицирована (Windows exe + ресурсы, Linux бинарь + зависимости).

## 3. Манифест версий
```json
{
  "schema": 1,
  "platforms": {
    "windows-x64": {
      "cefVersion": "141.0.10+g1d65b0d",
      "channel": "stable",
      "download": {
        "url": "https://cef-builds.spotifycdn.com/cef_binary_141.0.10+g1d65b0d+chromium-141.0.7390.123_windows64_minimal.tar.bz2",
        "sha1": "f41e11020344dbbebda8da469d45ebcb63238dd7",
        "size": 149034936
      },
      "launcherVersion": "0.1.0"
    },
    "macos-universal": {
      "cefVersion": "141.0.10+g1d65b0d",
      "channel": "stable",
      "download": {
        "url": "https://cef-builds.spotifycdn.com/cef_binary_141.0.10+g1d65b0d+chromium-141.0.7390.123_macosx64_minimal.tar.bz2",
        "sha1": "79fde774738422b81b32319cf8723c0f2c8ceb38",
        "size": 118925695
      },
      "launcherVersion": "0.1.0"
    },
    "linux-x64": {
      "cefVersion": "142.0.4+g8cfb2b2",
      "channel": "beta",
      "download": {
        "url": "https://cef-builds.spotifycdn.com/cef_binary_142.0.4+g8cfb2b2+chromium-142.0.7444.34_linux64_beta_minimal.tar.bz2",
        "sha1": "e7753675b454729d6b5d3f344a80b40ea62005f7",
        "size": 390350785
      },
      "launcherVersion": "0.1.0"
    }
  }
}
```
- Манифест хранится в репозитории (например, `assets/cef/manifest.json`) и копируется в VSIX.
- Обновление версий выполняется в рамках релиза расширения (обновляется `package.json` и этот манифест).

### Launcher Manifest
- Файл `assets/launcher/manifest.json` описывает доступные сборки `CodeAIHubLauncher` (версия, имя архива, SHA-1, размер) и сейчас указывает на артефакты GitHub Releases (`https://github.com/OleynikAleksandr/CodeAI-Hub/releases/...`).
- Установщик `ensureLauncherInstalled` читает манифест, скачивает архив в `~/.codeai-hub/cef-launcher/<platform>/downloads/` и разворачивает его в `<platform>/<launcherVersion>/`.
- Для локальной разработки допускается fallback: если бинарь уже установлен вручную (выход `scripts/build-cef-launcher.sh`), установщик пропускает скачивание и только создаёт `install.json`.

## 4. Поток установки
1. **Trigger**: post-install hook расширения или первый запуск команды `codeaiHub.launchWebClient`.
2. Определить платформу (`process.platform`, `process.arch`). Соответствие:
   - `win32 + x64` → `windows-x64`
   - `darwin + x64/arm64` → `macos-universal`
   - `linux + x64` → `linux-x64`
3. Проверить локальное состояние:
   - Существует ли директория `<platform>/<version>/cef`?
   - Совпадает ли `manifest.json` (сравнить `cefVersion`/`launcherVersion`).
4. Если отсутствует или версия отличается:
   - Создать временный каталог `downloads/<timestamp>`.
   - Скачивать архив потоково, отображая прогресс через `window.withProgress`.
   - После скачивания проверить SHA-1.
   - Распаковать (`tar -xjf` для `.tar.bz2` или встроенная библиотека Node).
   - Переместить распакованный каталог в целевую директорию (`cef/`).
   - Установить лаунчер (см. §5).
5. Обновить локальный `manifest.json` (копия из VSIX + фактический статус: дата установки, путь, успешные проверки).
6. Очистить временный каталог. При ошибке удалить частично загруженные файлы и показать понятное уведомление.

## 5. Локальный лаунчер *(Stage 2)*
- Планируется хранить вне VSIX; скачивание/установка выполняется скриптами и (в будущем) загрузчиком, а расширение использует бинарь из `~/.codeai-hub/cef-launcher/<platform>/`.
- После внедрения автоматической доставки ожидается структура `<platform>/<launcherVersion>/` для версионирования.
- Для Windows: `.exe` + `.pdb` (опционально). Для macOS: `.app` структура с Info.plist. Для Linux: исполняемый `codeai-hub-launcher`.
- Лаунчеру потребуется конфиг `config.json`:
```json
{
  "uiRoot": "{EXTENSION_PATH}/media/web-client/dist",
  "bridge": {
    "mode": "stub"
  }
}
```
- Конфиг генерируется расширением, чтобы учесть фактический путь до ресурсов (при обновлениях VSIX).

## 6. Интеграция с расширением
- Добавить модуль `src/extension-module/cef/bootstrap.ts`, который реализует шаги из §4.
- Команда `codeaiHub.launchWebClient` меняет поведение:
  1. `await ensureCefInstalled();`
  2. `await launchCefClient();` — запускает бинарь из `<platform>/<version>/launcher/`.
- Модуль ярлыков (`shortcut-manager.ts`) обновить так, чтобы ярлык обращался к лаунчеру, а не к `index.html`.
- Для UI в VS Code добавить нотификации прогресса (скачивание, распаковка) и ошибки.

## 7. Обновления и откат
- При выпуске новой версии расширения сравниваем `cefVersion` и `launcherVersion` с локальными данными. Если отличаются — запускаем установку.
- Старые каталоги `<platform>/<старый>/` удаляются после успешной установки новой версии (оставляем одну предыдущую как резерв? решение TBD).
- Предусмотреть команду `codeaiHub.cef.reinstall` для ручного сброса (скачивание заново).

## 8. Безопасность и валидация
- Использовать SHA-1 из официального манифеста CEF (публикуется вместе с файлами). При несовпадении хэша — удалять архив и сообщать об ошибке.
- Для Linux документировать необходимость установки SUID-бита на `chrome-sandbox`. Устанавливать автоматически с предупреждением.
- Поддерживать опцию `--no-sandbox` (fallback) с явным предупреждением, если SUID не удалось поставить.

## 9. Оповещения пользователя
- Прогресс скачивания (проценты + размер) через `withProgress`.
- По завершении — уведомление «CEF 141.0.10 installed successfully». При ошибке — предложение повторить.
- Логирование в `~/.codeai-hub/logs/cef-installer.log`.

## 10. Следующие шаги
- Исполнять `scripts/build-cef-launcher.sh` для генерации артефактов: скрипт размещает бинарии в `binaries/cef-launcher/<platform>/` и в `~/.codeai-hub/cef-launcher/<platform>/`.
- Реализовать кэширование скачанного архива для повторного использования.
- Добавить в архитектурную документацию ссылки на данный план.
