# Session 020

- Date (Madrid): 2025-10-25 17:00 - 19:40
- Version: 1.0.43 → 1.1.6
- Branch: main
- Mandatory documents reviewed before start:
  - doc/Sessions/Session019.md
  - doc/Architecture/Architecture.md
  - doc/Project_Docs/SystemArchitecture/SystemArchitecture.md
  - doc/TODO/todo-plan_11.md
  - doc/Project_Docs/Stacks/CoreOrchestrator_Specification.md

## Work Summary
- Завершён минимальный запуск автономного ядра: добавлены конфиг-лоадер, Session Manager, Provider Registry, Remote Bridge и Telemetry logger; ядро собирается в `codeai-hub-core` и запускается автоматически при активации расширения.
- Пересобран установочный пайплайн (CEF/Launcher/Core) — все артефакты скачиваются из GitHub Releases/latest, проверяются по SHA-1 и устанавливаются в `~/.codeai-hub/**`.
- Внедрён `core-bridge` во webview и standalone UI: клиенты подключаются к локальному ядру по HTTP/WS, создают mock-сессии и синхронно стримят сообщения.
- Обновлён CSP webview и документация (README, Architecture, SystemArchitecture, CHANGELOG, todo-plan_11) — зафиксированы новые потоки и известное ограничение (нет синхронизации удаления сессий).
- Выпущен VSIX `codeai-hub-1.1.6` (скрипт `./scripts/build-release.sh 1.1.6`), проверены все ультра-гейты, очищены временные файлы и подготовлены артефакты для релиза.

## Git Commits
- e02af37 — "feat: release v1.1.6 with autonomous core bridge"

## Technical Notes
- При установке расширение скачивает CEF с официального CDN, лаунчер и ядро — из GitHub Releases/latest. Убедитесь, что в релизе лежат `codeai-hub-1.1.6.vsix`, `CodeAIHubLauncher-macos-arm64-1.0.43.tar.bz2` и `codeai-hub-core-darwin-arm64-0.1.0.tar.bz2`.
- Здоровье ядра можно проверить командой `curl http://127.0.0.1:8080/api/v1/health`; как только webview/launcher подключены, процесс виден через `ps aux | grep codeai-hub-core`.
- CSP webview теперь позволяет `connect-src http://127.0.0.1:* ws://127.0.0.1:*`, поэтому клиенты без проблем подключаются к локальному серверу.

## Open Issues
- Удаление сессии в VS Code webview не транслируется во внешний клиент — требуется доработка broadcast в Phase 11. Creation и сообщения синхронизируются.

## Next Steps
1. Реализовать событие `session:deleted` в ядре и пробросить его в оба клиента.
2. Добавить smoke-тест на удаление сессии (webview ↔️ CEF) перед сборкой следующего релиза.
3. Расширить core-bridge (resync снапшотов после reconnect) и начать работу над персистентностью Phase 12.
