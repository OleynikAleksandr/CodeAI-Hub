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

## Phase 6 — Initiatives: auto-runs + новые пути артефактов (owner: Oleksandr, updated: 2026-01-09)

### Stream: Storage root + paths

1. [DONE] Обновить корневой путь инициатив на `.codeai-hub/initiatives` (scope: `packages/initiatives/src/index.ts`; commit: `refactor(initiatives): move initiatives root`) (date: 2026-01-09)
2. [DONE] Git Commit: `refactor(initiatives): move initiatives root` (hash: 8a74e991) (date: 2026-01-09)
3. [DONE] Добавить run-aware output paths для Idea Collector (initiativeSlug + runSlug) (scope: `packages/agents/idea-collector/src/paths/artifact-paths.ts`, `packages/agents/idea-collector/src/contract/contract-builder.ts`; commit: `feat(idea-collector): add run-aware output paths`) (date: 2026-01-09)
4. [DONE] Git Commit: `feat(idea-collector): add run-aware output paths` (hash: c7253728) (date: 2026-01-09)

### Stream: Templates + UI fallback

5. [DONE] Обновить ассеты Idea Collector под новый канон путей (scope: `packages/agents/idea-collector/assets/idea-collector-prompt.md`, `packages/agents/idea-collector/assets/idea-collector-schema.json`, `packages/agents/idea-collector/assets/idea-template.md`; commit: `docs(idea-collector): update artifact paths`) (date: 2026-01-09)
6. [DONE] Git Commit: `docs(idea-collector): update artifact paths` (hash: faf5d987) (date: 2026-01-09)
7. [DONE] Обновить UI fallback prompt/schema/contract paths (scope: `src/client/ui/src/app-host/idea-kickoff-prompt.ts`, `src/client/ui/src/services/idea-collector-fallback-schema.ts`, `src/client/ui/src/services/idea-collector-contract.ts`; commit: `docs(ui): align idea collector paths`) (date: 2026-01-09)
8. [DONE] Git Commit: `docs(ui): align idea collector paths` (hash: 4125f96c) (date: 2026-01-09)

### Stream: Core validators + questionnaire path

9. [DONE] Обновить валидацию путей артефактов и детектор questionnaire (scope: `packages/core/src/remote-bridge/handlers/http-api-router.ts`, `packages/core/src/remote-bridge/handlers/idea-questionnaire-path-detector.ts`; commit: `fix(core): validate run-aware idea paths`) (date: 2026-01-09)
10. [DONE] Git Commit: `fix(core): validate run-aware idea paths` (hash: 53d87102) (date: 2026-01-09)

### Stream: UI — убрать run

11. [DONE] Убрать run selector/форму из Action Bar (scope: `src/client/ui/src/components/action-bar/index.tsx`, `src/client/ui/src/components/action-bar/context-form.tsx`, `media/main-view.css`; commit: `refactor(ui): remove run selector`) (date: 2026-01-09)
12. [DONE] Git Commit: `refactor(ui): remove run selector` (hash: 5f66f59a) (date: 2026-01-09)
13. [DONE] Упростить инициативный контекст (без runs) (scope: `src/client/ui/src/components/action-bar/use-initiative-context.ts`; commit: `refactor(ui): simplify initiative context`) (date: 2026-01-09)
14. [DONE] Git Commit: `refactor(ui): simplify initiative context` (hash: 708f83dc) (date: 2026-01-09)

### Stream: Auto‑runs on stage start

15. [DONE] Расширить модель сессии инициативой/стадией/runSlug (scope: `packages/core/src/session-manager/index.ts`, `packages/core/src/remote-bridge/types.ts`, `src/types/session.ts`; commit: `feat(core): add session initiative context`) (date: 2026-01-09)
16. [DONE] Git Commit: `feat(core): add session initiative context` (hash: f931627c) (date: 2026-01-09)
17. [DONE] Прокинуть initiativeSlug+stage при session:create (scope: `src/client/ui/src/core-bridge/core-bridge.ts`; commit: `feat(ui): send initiative context on session create`) (date: 2026-01-09)
18. [DONE] Git Commit: `feat(ui): send initiative context on session create` (hash: 84ac00e7) (date: 2026-01-09)
19. [DONE] Принять initiativeSlug+stage в core bridge (scope: `packages/core/src/remote-bridge/types.ts`, `packages/core/src/remote-bridge/index.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; commit: `feat(core): accept session create context`) (date: 2026-01-09)
20. [DONE] Git Commit: `feat(core): accept session create context` (hash: 879a69a6) (date: 2026-01-09)
21. [DONE] Автосоздание run с именем `NNN-<model>` при старте стадии (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/handlers/auto-run-service.ts`, `packages/initiatives/src/run-store.ts`; commit: `feat(core): auto-create runs on flow start`) (date: 2026-01-09)
22. [DONE] Git Commit: `feat(core): auto-create runs on flow start` (hash: eda98ace) (date: 2026-01-09)

### Stream: Docs sync

23. [DONE] Обновить системную архитектуру под новые пути/авто‑runs (scope: `doc/Architecture/Architecture.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; commit: `docs(architecture): update auto-run paths`) (date: 2026-01-09)
24. [DONE] Git Commit: `docs(architecture): update auto-run paths` (hash: acc23e81) (date: 2026-01-09)
