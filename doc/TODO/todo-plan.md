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

## Phase 13 — Idea artifacts + questionnaire reuse (owner: Oleksandr, updated: 2026-01-10)

### Stream: Idea Collector stability

1. [DONE] Починить сохранение артефактов Idea при рассинхроне контекста (scope: `src/client/ui/src/services/idea-collector-service.ts`, `doc/TODO/todo-plan.md`; commit: `fix(ui): stabilize idea artifact save context`) (date: 2026-01-10)
2. [DONE] Git Commit: `fix(ui): stabilize idea artifact save context` (hash: 4f7a6e00) (date: 2026-01-10)
3. [TODO] Добавить reuse анкеты между run-ами через initiative-level кеш (scope: `src/client/ui/src/services/idea-questionnaire-service.ts`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`, `doc/TODO/todo-plan.md`; commit: `feat(ui): reuse idea questionnaire across runs`)
4. [TODO] Git Commit: `feat(ui): reuse idea questionnaire across runs` (hash: TBD)
