# Session 034 — Plan: Decommission web-client + vscode-webview Settings-only

**Date:** 2026-01-21 15:04 (CET)
**Branch:** main
**Version:** 1.1.464

---

# 1. Work Done in This Session

## Work summary
- Подтверждена стабилизация: после фикса дедупликации `session:created` в `vscode-webview` баг с «пустым дублем сессии» при клике по `Description agent session` больше не воспроизводится (по ручной проверке).
- Принято решение на период активной разработки FLOW:
  - `project-manager` становится единственным активным UI-клиентом Core.
  - `web-client` будет удалён полностью (включая сборку/инсталляторы/манифесты/ссылки), без мёртвого кода.
  - `vscode-webview` будет переведён в режим Settings-only (без сессий/чатов и без работы с Core).
- `doc/TODO/todo-plan.md` заархивирован в `doc/TODO/Archive/todo-plan-phase64-2026-01-21.md`.
- Создан новый `doc/TODO/todo-plan.md` с Phase 65 и Stream’ами под (1) полную зачистку `web-client`, (2) перевод `vscode-webview` в Settings-only, (3) verification build.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `cce56953 docs(todo): archive phase64 plan and start phase65`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/TODO/todo-plan.md` (Phase 65)
3. `doc/TODO/Archive/todo-plan-phase64-2026-01-21.md` (архив предыдущего плана)
4. `doc/Sessions/Session033.md` (контекст фикса vscode-webview + релиз 1.1.464)
5. `README.md` и `CHANGELOG.md` (для релизного контекста 1.1.464)

## Plans for next session
- Реализовать Phase 65 по микрозадачам (≤3 файлов на задачу), строго вычистить все ссылки на `web-client`:
  - удалить `scripts/build-web-client.js` и `build:web-client`.
  - убрать сборку/инсталляцию/артефакты web-client из `scripts/build-all.sh`, `scripts/build-release.sh`, `assets/ui/manifest.json`.
  - удалить `src/client/web-client/` и все ссылки в типах/активации/реестрах/тестах.
- Перевести `vscode-webview` в Settings-only режим и сделать явную маршрутизацию “Use Project Manager” для session/chat действий.
- После каждой микрозадачи прогонять гейты (`check-architecture`, `ultracite`, `ts-prune`, `jscpd`, `check:links`) и таргетные сборки.
