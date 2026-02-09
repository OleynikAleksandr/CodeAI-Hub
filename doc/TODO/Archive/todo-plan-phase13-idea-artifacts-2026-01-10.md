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
3. [DONE] Добавить reuse анкеты между run-ами через initiative-level кеш (scope: `src/client/ui/src/services/idea-questionnaire-service.ts`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`, `doc/TODO/todo-plan.md`; commit: `feat(ui): reuse idea questionnaire across runs`) (date: 2026-01-10)
4. [DONE] Git Commit: `feat(ui): reuse idea questionnaire across runs` (hash: 1930b199) (date: 2026-01-10)
5. [DONE] Трекинг последнего вопроса агента для анкеты (scope: `src/client/ui/src/services/idea-collector-service.ts`, `src/client/ui/src/app-host/use-idea-collector.ts`, `doc/TODO/todo-plan.md`; commit: `feat(ui): track idea collector questions`) (date: 2026-01-10)
6. [DONE] Git Commit: `feat(ui): track idea collector questions` (hash: bb6ef934) (date: 2026-01-10)
7. [DONE] Авто-добавление ответов на уточнения в анкету (scope: `src/client/ui/src/services/idea-questionnaire-service.ts`, `src/client/ui/src/app-host/use-idea-collector.ts`, `doc/TODO/todo-plan.md`; commit: `feat(ui): append idea clarifications to questionnaire`) (date: 2026-01-10)
8. [DONE] Git Commit: `feat(ui): append idea clarifications to questionnaire` (hash: d89d4869) (date: 2026-01-10)
9. [DONE] Документировать авто-дополнение анкеты уточнениями (scope: `doc/SolidWorks-Flow/System/SystemArchitecture.md`, `doc/TODO/todo-plan.md`; commit: `docs: document idea questionnaire sync`) (date: 2026-01-10)
10. [DONE] Git Commit: `docs: document idea questionnaire sync` (hash: 91a4e558) (date: 2026-01-10)
