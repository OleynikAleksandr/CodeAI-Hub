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

## Phase 8 — Questionnaire path enforcement (owner: Oleksandr, updated: 2026-01-10)

### Stream: UI guards for initiative/run paths

1. [DONE] Останавливать загрузку анкеты без initiative/run контекста и показывать system notice (scope: `src/client/ui/src/app-host/session-region-idea-paths.ts`, `src/client/ui/src/services/idea-questionnaire-service.ts`; commit: `fix(ui): guard questionnaire paths by session context`) (date: 2026-01-10)
2. [DONE] Git Commit: `fix(ui): guard questionnaire paths by session context` (hash: a8144f48) (date: 2026-01-10)
3. [TODO] Останавливать submit анкеты и сохранение артефактов при отсутствии initiative/run контекста (scope: `src/client/ui/src/app-host/session-region.tsx`, `src/client/ui/src/services/idea-collector-service.ts`; commit: `fix(ui): block idea artifacts without run context`)
4. [TODO] Git Commit: `fix(ui): block idea artifacts without run context` (hash: TBD)
