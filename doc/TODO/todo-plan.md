# План разработки — устойчивость ядра

## Легенда
- TODO — задача запланирована
- IN_PROGRESS — работа ведётся
- BLOCKED — требуется внешнее действие
- DONE — задача завершена
- Каждая задача завершается отдельным коммитом и сборкой через `./scripts/build-all.sh` для проверки.

## Фаза 1 — Core lifecycle hardening (owner: Codex, обновлено: 2025-11-07)
- [DONE] Обновить стратегию работы с CLI провайдеров: деградация без падения, предупреждения в UI, фоновый retry
  - Notes: перенастроены health-check, UI показывает предупреждения, добавлена кнопка «Перезапустить ядро»
  - Commit: 6691823 — "feat: handle provider cli degradation"
- [DONE] Устранить конкуренцию менеджеров процесса (VS Code extension vs Launcher) и добавить самотест ядра перед активацией
  - Notes: введена блокировка `core-manager.lock`, VS Code больше не держит ядро насильно и запускает self-test перед готовностью
  - Commit: d7c6593 — "feat: coordinate core managers and self-test"
- [DONE] Гарантировать работу ядра при наличии хотя бы одного клиента (extension или launcher), выровнять подсчёт клиентов и managed-mode
  - Notes: core стартует при первом подключении и немедленно останавливается после ухода последнего клиента; больше нет 60-секундной задержки.
  - Commit: fc437ed — `feat: tighten core lifecycle`
- [TODO] Обеспечить единый сторедж сессий для launcher: чтение unified JSONL и отображение истории независимо от источника создания сессии
  - Notes: launcher webview должен использовать тот же механизм восстановления, что и VS Code
- [TODO] Добавить refresh/restore в standalone UI: при потере фокуса и возврате читать локальные JSONL до прихода новых событий
  - Notes: синхронизировать с существующим flow в extension UI
- [TODO] Подготовить UX и документацию: обновить знания о поведении launcher, описать требования к хранению сессий
  - Notes: каждая правка сопровождается релизом и фиксацией хэша в списке коммитов
- [DONE] Внедрить единый реестр версий core/launcher/CEF/VSIX и форсировать переустановку при расхождении
  - Notes: заведён `runtime-registry.json`, `current`-указатели и слежение за версией VSIX; extension и launcher теперь фиксируют фактическую установку перед запуском.
  - Commit: 8464201 — `feat: add runtime registry tracking`
- [DONE] Перестроить lifecycle ядра: запускать core при появлении первого клиента и останавливать сразу после ухода последнего
  - Notes: core проверяет версию `/api/v1/health`, ждёт остановки предыдущего рантайма и немедленно запускает актуальный, а orchestrator отключается сразу после ухода последнего клиента.
  - Commit: fc437ed — `feat: tighten core lifecycle`
- [TODO] Автоматически завершать устаревшие ядра и освобождать порт перед запуском
  - Notes: extension должен отправлять `/api/v1/shutdown`, ждать остановки и при необходимости убивать чужой PID/lock; порт 8080 при занятии переключается на следующий свободный без участия пользователя.
- [TODO] Добавить диагностику CLI/SDK: проверять версии и статус установленных инструментов при запуске
  - Notes: использовать возможности `packages/*_Module` установщиков, поднимать информацию в `RuntimeStatusReporter`/UI (e.g., provider readiness, версия CLI vs latest) и предупреждать о дрейфе.
- [TODO] Изолировать падения CLI: ошибки Claude/Gemini не должны завершать core
  - Notes: ProviderRegistry переводит провайдера в degraded/failed, UI показывает предупреждение, ядро остаётся активным для остальных клиентов.
- [TODO] Защитить выбор рабочего каталога: сохранять только подтверждённые workspace и добавить ручную настройку в UI
  - Notes: не перезаписывать `~/.codeai-hub/state/workspace-path`, если VS Code открыт без проекта; добавить настройку Workspace Path в General Settings лаунчера/extension и синхронизировать state.
- [DONE] Диагностировать регрессию нормализованных JSONL после разделения менеджеров ядра
  - Notes: подтверждена проблема с workspaceSlug — при рестарте ядра из launcher окружение сбрасывалось к `~` и writer уходил в `~/.codeai-hub/sessions/-Users-oleksandroliinyk/*`; требуется закрепить фактический workspace через конфиг/ENV.
  - Commit: c330a1b — `fix: trace normalized jsonl regression`
- [DONE] Восстановить создание norm JSONL в `~/.codeai-hub/sessions/<workspace>/<provider>/`
  - Notes: launcher теперь получает `workspacePath` от extension (`launchCefClient`) и прокидывает его через ENV + config; `EnsureGlobalEnvironment` уважает переданное значение, поэтому writer снова пишет в `.../-Users-oleksandroliinyk-VSCODE-CodeAI-Hub/*`.
  - Commit: 8c9ba88 — `fix: restore normalized session writers`
- [DONE] Провести валидацию и обновить документацию по unified session storage
  - Notes: вручную проверены оба UI, обновлены README/Architecture/CHANGELOG, зафиксированы пути к новым артефактам.
  - Commit: 1715d3d — `chore: document normalized session storage`
- [TODO] Диагностировать регрессию нормализованных JSONL после разделения менеджеров ядра (повторно)
  - Notes: slug по-прежнему откатывается к `-Users-oleksandroliinyk`, writer пишет в неверный каталог; требуется найти фактическую причину (ENV, promote, writer init).
- [TODO] Восстановить создание norm JSONL в `~/.codeai-hub/sessions/<workspace>/<provider>/`
  - Notes: привести `UnifiedSessionStorage`/bootstrap к состоянию, когда и VS Code, и launcher гарантированно создают файлы в slug проекта; подтвердить появление JSONL на свежих сессиях.
- [TODO] Провести валидацию и обновить документацию по unified session storage
  - Notes: после исправления повторно обновить README/knowledge/architecture, зафиксировать реальные пути и смоук-тесты.

## Коммиты фазы
- 6691823 — feat: handle provider cli degradation
- aa8f37d — feat: v1.1.156 - provider cli resilience (release build)
- d7c6593 — feat: coordinate core managers and self-test
- 34791d5 — feat: v1.1.157 - core manager coordination (release build)
- f47101a — fix: persist workspace slug for launcher
- Pending — новые хэши будут добавляться после каждой задачи
