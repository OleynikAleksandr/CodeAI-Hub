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

## Коммиты фазы
- 6691823 — feat: handle provider cli degradation
- aa8f37d — feat: v1.1.156 - provider cli resilience (release build)
- d7c6593 — feat: coordinate core managers and self-test
- fc72157 — feat: v1.1.157 - core manager coordination (release build)
- Pending — новые хэши будут добавляться после каждой задачи
