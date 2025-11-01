# Session 041 — Standalone bootstrap fix & release 1.1.95

**Дата:** 1 ноября 2025 — Madrid (UTC+1)
**Время:** 12:45 – 14:10
**Ветка:** main
**Версии:** 1.1.94 → 1.1.95

---

## Артефакты, обязательные к изучению перед стартом следующей сессии
- `README.md` (Current Release — v1.1.95)
- `CHANGELOG.md` (entry 1.1.95)
- `doc/Architecture/Architecture.md`
- `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
- `assets/launcher/manifest.json`
- `doc/TODO/todo-plan_.md`

---

## Что сделано
1. Реализован `codeai::launcher::EnsureCoreProcessRunning`, который находит установленный core, устанавливает переменные окружения и стартует Node runtime для автономного клиента (см. `packages/cef-launcher/src/core_launcher.cc`).
2. Лаунчер вызывает новый bootstrap перед созданием webview, поэтому standalone UI снимает оверлей и не требует активного VS Code (`packages/cef-launcher/src/launcher_app.cc`).
3. Выпущен CEF launcher 1.0.49 и VSIX 1.1.95; обновлены README, CHANGELOG, системные документы и манифесты.

---

## Текущее состояние
- `CodeAI Hub Web Client.app` самостоятельно поднимает core и видит провайдерные модули, даже если VS Code не запущен.
- Лаунчер манифест указывает на `CodeAIHubLauncher-macos-arm64-1.0.49.tar.bz2`; VSIX `codeai-hub-1.1.95.vsix` доступен в корне репозитория.
- TODO Phase 1 (CLI health-check) остаётся в работе — проверки CLI пока не реализованы.

---

## Проблемы / Блокеры
- Health-check CLI провайдеров всё ещё отсутствует; UI отображает только загрузочный прогресс без статусов `installed` / `missing`.

---

## План на следующую сессию
1. Добавить сервис health-check провайдеров и прокинуть статусы в RemoteBridge/UI.
2. Расширить Settings UI инструкциями по ручной установке CLI и действиями (`Open instructions`, `Disable provider`).
3. Подготовить автотесты/моки и документацию, затем пересобрать Core/модули при необходимости.

---

## Git commits
- 5d4f436 — feat: v1.1.95 - standalone bootstrap
