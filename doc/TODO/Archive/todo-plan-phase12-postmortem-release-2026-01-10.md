# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стрим), в каждом Stream — набор микро‑задач.
- Каждая микро‑задача должна затрагивать не более 3 файлов.
- Каждая микро‑задача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- После выполнения каждой микро‑задачи прогоняется Гейт Качества:
  - `./scripts/check-architecture.sh`
  - `npx ultracite check`
  - `npx ts-prune`
  - `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`
  - `npm run check:links`
  - затем таргетная сборка (минимально необходимая для затронутого пакета/клиента)
- Коммит делаем только после зелёных гейтов. После коммита сразу обновляем этот файл (статус/дата/хеш).
- Phase завершается на чистом дереве.

---

## Phase 12 — Postmortem + release docs + session report (owner: Oleksandr, updated: 2026-01-10)

### Stream: Postmortem

1. [DONE] Подготовить postmortem по багу анкеты и путей инициатив (scope: `doc/Knowledge/postmortem-questionnaire-paths-2026-01-10.md`, `doc/TODO/todo-plan.md`; commit: `docs: add questionnaire path postmortem`) (date: 2026-01-10)
2. [DONE] Git Commit: `docs: add questionnaire path postmortem` (hash: 8475ba5f) (date: 2026-01-10)
3. [DONE] Актуализировать release-версии в системной архитектуре (scope: `doc/SolidWorks-Flow/System/SystemArchitecture.md`, `doc/TODO/todo-plan.md`; commit: `docs: sync system architecture versions`) (date: 2026-01-10)
4. [DONE] Git Commit: `docs: sync system architecture versions` (hash: e5e85aae) (date: 2026-01-10)
5. [DONE] Обновить отчет сессии (scope: `doc/Sessions/Session082.md`; commit: `docs: add Session082 report`) (date: 2026-01-10)
6. [DONE] Git Commit: `docs: add Session082 report` (hash: ef37d66c) (date: 2026-01-10)
7. [DONE] Заархивировать план Phase 12 и создать новый placeholder (scope: `doc/TODO/todo-plan.md`, `doc/TODO/Archive/*`; commit: `docs: archive phase 12 todo plan`) (date: 2026-01-10)
8. [DONE] Git Commit: `docs: archive phase 12 todo plan` (hash: e2fbe172) (date: 2026-01-10)
