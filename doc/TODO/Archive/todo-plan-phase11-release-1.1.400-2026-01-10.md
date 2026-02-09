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

## Phase 11 — Release v1.1.400 (owner: Oleksandr, updated: 2026-01-10)

### Stream: Release build

1. [DONE] Обновить README/CHANGELOG под v1.1.400 (scope: `README.md`, `CHANGELOG.md`; commit: `docs: prepare v1.1.400 release notes`) (date: 2026-01-10)
2. [DONE] Git Commit: `docs: prepare v1.1.400 release notes` (hash: 5dd793b1) (date: 2026-01-10)
3. [DONE] Обновить архитектурные документы под v1.1.400 (scope: `doc/Architecture/Architecture.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; commit: `docs: update architecture for v1.1.400`) (date: 2026-01-10)
4. [DONE] Git Commit: `docs: update architecture for v1.1.400` (hash: 78a499a6) (date: 2026-01-10)
5. [DONE] Выполнить release build v1.1.400 (build-all; scope: auto-generated release manifests + `package.json`/`package-lock.json`; commit: `feat: v1.1.400 - release build`) (date: 2026-01-10)
6. [DONE] Git Commit: `feat: v1.1.400 - release build` (hash: f372508f) (date: 2026-01-10)
7. [DONE] Заархивировать план Phase 11 и создать новый placeholder (scope: `doc/TODO/todo-plan.md`, `doc/TODO/Archive/*`; commit: `docs: archive phase 11 todo plan`) (date: 2026-01-10)
8. [DONE] Git Commit: `docs: archive phase 11 todo plan` (hash: 07bbec6f) (date: 2026-01-10)
