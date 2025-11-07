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
- [TODO] Гарантировать работу ядра при наличии хотя бы одного клиента (extension или launcher), выровнять подсчёт клиентов и managed-mode
  - Notes: core не должен выключаться, пока подключён любой UI
- [TODO] Обеспечить единый сторедж сессий для launcher: чтение unified JSONL и отображение истории независимо от источника создания сессии
  - Notes: launcher webview должен использовать тот же механизм восстановления, что и VS Code
- [TODO] Добавить refresh/restore в standalone UI: при потере фокуса и возврате читать локальные JSONL до прихода новых событий
  - Notes: синхронизировать с существующим flow в extension UI
- [TODO] Подготовить UX и документацию: обновить знания о поведении launcher, описать требования к хранению сессий
  - Notes: каждая правка сопровождается релизом и фиксацией хэша в списке коммитов
- [TODO] Внедрить единый реестр версий core/launcher/CEF/VSIX и форсировать переустановку при расхождении
  - Notes: extension и launcher должны считывать манифесты, сравнивать с `latest`-указателями и инициировать перелинковку до старта клиентов
- [TODO] Перестроить lifecycle ядра: запускать core при появлении первого клиента и останавливать сразу после ухода последнего
  - Notes: убрать 60-секундный grace period, обеспечить корректную координацию менеджеров
- [TODO] Добавить диагностику CLI/SDK: проверять версии и статус установленных инструментов при запуске
  - Notes: surfaced в UI и статус-логах, чтобы частичные обновления не оставались незамеченными
- [TODO] Защитить выбор рабочего каталога: сохранять только подтверждённые workspace и добавить ручную настройку в UI
  - Notes: launcher должен уметь принимать последнее значение от расширения и менять его через General Settings
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
