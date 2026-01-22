# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream с микрозадачами.
- Каждая микрозадача затрагивает ≤ 3 файлов.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Gates после каждой микрозадачи: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.
- Коммит делаем только после зелёных гейтов; сразу обновляем статусы и hash.

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/TODO/todo-plan.md` (THIS FILE)
3. `doc/Sessions/Session042.md`

---

## Notes

- **Release 1.1.469** собран и протестирован (Session042)
- Phase 68 (Session UI Panels) — завершена и заархивирована
- Phase 69 (Settings propagation) — отложена, требует много файловых изменений
- Phase 70 (Release build) — завершена и заархивирована

---

## Backlog

### Settings Propagation for Models Display (из Phase 69)
**Goal:** Прокинуть settings через компоненты для отображения реальных моделей в StatusPanel.
**Status:** Отложено — требует детального исследования и многофайловых изменений.
**Reference:** `doc/TODO/Archive/todo-plan-phase70.md` — Phase 69

### TodoPanel Removal (опционально)
**Goal:** Полностью удалить TodoPanel вместо текущего комментирования.
**Status:** Низкий приоритет.

---

## Phase 71 — TBD (owner: TBD, updated: YYYY-MM-DD)

_Задачи будут добавлены после определения приоритетов._
