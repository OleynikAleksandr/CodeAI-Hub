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

## Phase 10 — Fix session:created context payload (owner: Oleksandr, updated: 2026-01-10)

### Stream: Idea questionnaire context

1. [DONE] Добавить initiativeSlug/runSlug/stage в payload `session:created` (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; commit: `fix(core): include initiative context in session created`) (date: 2026-01-10)
2. [DONE] Git Commit: `fix(core): include initiative context in session created` (hash: 6b5f48b1) (date: 2026-01-10)
