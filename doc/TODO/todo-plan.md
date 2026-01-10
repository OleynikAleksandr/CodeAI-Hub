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

## Phase 7 — Fix Idea questionnaire paths + Action Bar UI (owner: Oleksandr, updated: 2026-01-10)

### Stream: Idea questionnaire path fix

1. [DONE] Пробросить initiativeSlug/runSlug/stage из Core в UI session records (scope: `src/client/ui/src/core-bridge/types.ts`, `src/client/ui/src/core-bridge/normalizers.ts`; commit: `fix(ui): preserve session context slugs`) (date: 2026-01-10)
2. [DONE] Git Commit: `fix(ui): preserve session context slugs` (hash: d546954e) (date: 2026-01-10)
3. [DONE] Убрать legacy fallback пути `full-development-flow/001-default` из Idea contract (scope: `src/client/ui/src/services/idea-collector-contract.ts`; commit: `fix(ui): remove legacy idea fallback paths`) (date: 2026-01-10)
4. [DONE] Git Commit: `fix(ui): remove legacy idea fallback paths` (hash: 476fa189) (date: 2026-01-10)
5. [TODO] Обновить дефолтные output paths в Idea Collector package без legacy slugs (scope: `packages/agents/idea-collector/src/paths/artifact-paths.ts`, `packages/agents/idea-collector/src/contract/contract-builder.ts`; commit: `fix(idea-collector): drop legacy default slugs`)
6. [TODO] Git Commit: `fix(idea-collector): drop legacy default slugs` (hash: TBD)

### Stream: Action Bar UI tweaks

7. [DONE] Переместить кнопку создания Initiative в одну строку с селектором и переименовать в `New` (scope: `src/client/ui/src/components/action-bar/index.tsx`, `media/main-view.css`; commit: `refactor(ui): align initiative action button`)
8. [DONE] Git Commit: `refactor(ui): align initiative action button` (hash: 18a4c718)
