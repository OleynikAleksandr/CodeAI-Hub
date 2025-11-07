# План разработки — устойчивость ядра

## Легенда
- TODO — задача запланирована
- IN_PROGRESS — работа ведётся
- BLOCKED — требуется внешнее действие
- DONE — задача завершена
- Каждая задача завершается отдельным коммитом и сборкой через `./scripts/build-all.sh` для проверки.

## Critical Fixes — P0 (owner: Codex, updated: 2025-11-07)
- [TODO][P0] Автоматический shutdown и очистка lock перед запуском
  - Notes: перед стартом core отправлять `/api/v1/shutdown`, ждать остановки, при необходимости убивать PID/lock; исключить залипание старых версий.
- [TODO][P0] Автопереназначение CORE_PORT без участия пользователя
  - Notes: если 8080 занят (другим приложением/старым core), автоматически выбрать следующий свободный порт, зафиксировать его в runtime registry и использовать во всех клиентах.
- [TODO][P0] Изолировать провайдерные падения (Claude/Gemini)
  - Notes: любые ошибки CLI должны переводить провайдера в `degraded/failed`, а не завершать orchestrator; UI показывает предупреждение, ядро остаётся активным.
- [TODO][P0] Диагностировать slug/JSONL-регрессию повторно
  - Notes: writer всё ещё пишет в `-Users-oleksandroliinyk`; нужно проследить slug chain (ENV → registry → UnifiedSessionStorage) и подтвердить появление файлов в slug проекта.
- [TODO][P0] Восстановить создание norm JSONL после фикса
  - Notes: синхронизировать bootstrap VSIX и launcher, убедиться, что новые сессии оба UI пишут в `~/.codeai-hub/sessions/<workspace>/<provider>/`.

## Ongoing Development — P1/P2 (owner: Codex, updated: 2025-11-07)
- [TODO][P1] Обеспечить единый сторедж сессий для launcher
  - Notes: launcher webview должен читать unified JSONL и показывать историю независимо от источника.
- [TODO][P1] Добавить refresh/restore в standalone UI
  - Notes: при потере фокуса читать локальные JSONL до прихода новых событий.
- [TODO][P1] Подготовить UX и документацию по хранению сессий
  - Notes: обновить гайды после правок, описать требования к slug/JSONL.
- [TODO][P1] Добавить диагностику CLI/SDK в UI
  - Notes: использовать данные установщиков (`packages/*_Module`) и выводить статус/версию в RuntimeStatusReporter.
- [TODO][P1] Защитить выбор рабочего каталога и добавить ручную настройку
  - Notes: не перезаписывать `workspace-path` пустыми окнами, добавить настройку Workspace Path в VSIX/launcher.

## Completed
- [DONE] Обновить стратегию работы с CLI провайдеров: деградация без падения, предупреждения в UI, фоновый retry
  - Commit: 6691823 — "feat: handle provider cli degradation"
- [DONE] Устранить конкуренцию менеджеров процесса и добавить self-test
  - Commit: d7c6593 — "feat: coordinate core managers and self-test"
- [DONE] Гарантировать работу ядра при наличии хотя бы одного клиента
  - Commit: fc437ed — `feat: tighten core lifecycle`
- [DONE] Внедрить runtime registry и `current`-указатели
  - Commit: 8464201 — `feat: add runtime registry tracking`
- [DONE] Диагностировать регрессию нормализованных JSONL (первая итерация)
  - Commit: c330a1b — `fix: trace normalized jsonl regression`
- [DONE] Восстановить создание norm JSONL (первая итерация)
  - Commit: 8c9ba88 — `fix: restore normalized session writers`
- [DONE] Провести валидацию и обновить документацию по unified session storage
  - Commit: 1715d3d — `chore: document normalized session storage`

## Коммиты фазы
- 6691823 — feat: handle provider cli degradation
- aa8f37d — feat: v1.1.156 - provider cli resilience (release build)
- d7c6593 — feat: coordinate core managers and self-test
- 34791d5 — feat: v1.1.157 - core manager coordination (release build)
- f47101a — fix: persist workspace slug for launcher
- Pending — новые хэши будут добавляться после каждой задачи
