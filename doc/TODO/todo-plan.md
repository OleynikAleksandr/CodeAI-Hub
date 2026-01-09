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

## Phase 5 — Initiatives + Runs: универсальный вход в Flow (owner: Oleksandr, updated: 2026-01-09)

### Stream: Design baseline

1. [DONE] Зафиксировать MVP архитектуру Initiatives/Runs (модель, пути, API, UI entry) (scope: `doc/Project_Docs/Initiatives_Runs_UI_Entry_Architecture.md`; commit: `docs(architecture): add initiatives and runs entry design`) (date: 2026-01-09)
2. [DONE] Git Commit: `docs(architecture): add initiatives and runs entry design` (hash: e890e7f)

### Stream: Core — Initiatives + Runs storage

3. [DONE] Добавить каноничные пути/утилиты для инициатив и run’ов (slugified имена папок + уникализация `-2/-3/...`) (scope: `packages/initiatives/src/index.ts`; commit: `feat(initiatives): add slug and path utilities`) (date: 2026-01-09)
4. [DONE] Git Commit: `feat(initiatives): add slug and path utilities` (hash: 87e7edf) (date: 2026-01-09)

5. [DONE] Добавить файловое хранилище инициатив (create/list/read/update, displayName/description, currentRunId) (scope: `packages/initiatives/src/initiative-store.ts`; commit: `feat(initiatives): add initiative store`) (date: 2026-01-09)
6. [DONE] Git Commit: `feat(initiatives): add initiative store` (hash: 172febe) (date: 2026-01-09)

7. [DONE] Добавить файловое хранилище run’ов (create/list/read, displayName/description, runSlug folder, select current) (scope: `packages/initiatives/src/run-store.ts`; commit: `feat(initiatives): add run store`) (date: 2026-01-09)
8. [DONE] Git Commit: `feat(initiatives): add run store` (hash: 28caec0) (date: 2026-01-09)

### Stream: Core — HTTP API

9. [DONE] Подключить `@codeai-hub/initiatives` в Core и обновить lockfile (scope: `packages/core/package.json`, `package-lock.json`; commit: `chore(core): add initiatives dependency`) (date: 2026-01-09)
10. [DONE] Git Commit: `chore(core): add initiatives dependency` (hash: da8175f) (date: 2026-01-09)

11. [DONE] Добавить endpoints инициатив: list + create (scope: `packages/core/src/remote-bridge/handlers/http-api-router.ts`, `packages/core/src/remote-bridge/handlers/initiatives-http-handler.ts`; commit: `feat(core): expose initiatives API`) (date: 2026-01-09)
12. [DONE] Git Commit: `feat(core): expose initiatives API` (hash: 080ca82) (date: 2026-01-09)

13. [DONE] Добавить endpoints run’ов: list + create + select-current (scope: `packages/core/src/remote-bridge/handlers/http-api-router.ts`, `packages/core/src/remote-bridge/handlers/runs-http-handler.ts`; commit: `feat(core): expose runs API`) (date: 2026-01-09)
14. [DONE] Git Commit: `feat(core): expose runs API` (hash: 92f099a) (date: 2026-01-09)

### Stream: UI — Initiative bar + split zones (vscode-webview)

15. [TODO] Добавить UI строку контекста над кнопками: dropdown инициативы + dropdown run + `+` (создание инициативы с именем/описанием) + `+ run` (создание run с именем/описанием), хранить выбранный контекст в UI state (scope: `src/client/ui/src/components/action-bar/index.tsx`, `src/client/ui/src/api/orchestrator/initiatives-client.ts`, `src/client/ui/src/api/orchestrator/runs-client.ts`; commit: `feat(ui): add initiative and run selector`) (date: 2026-01-09)
16. [TODO] Git Commit: `feat(ui): add initiative and run selector` (hash: TBD)

17. [TODO] Разделить Action Bar на две зоны: слева `Simple Chat`, справа — Flow buttons (пока: Idea/Spec/Plan/Execute); Flow disabled без `initiative+run` (scope: `src/client/ui/src/components/action-bar/index.tsx`, `media/main-view.css`; commit: `refactor(ui): split action bar into chat and flow zones`) (date: 2026-01-09)
18. [TODO] Git Commit: `refactor(ui): split action bar into chat and flow zones` (hash: TBD)

19. [TODO] Пересобрать webview bundle после изменения Action Bar (scope: `media/react-chat.js`; commit: `chore(webview): rebuild bundle for initiative entry`) (date: 2026-01-09)
20. [TODO] Git Commit: `chore(webview): rebuild bundle for initiative entry` (hash: TBD)

### Stream: Web-client — parity

21. [TODO] Поддержать initiative/run selector и тот же UI entry в standalone `web-client` окружении (scope: `src/client/web-client/environment.ts`, `src/client/ui/src/components/action-bar/index.tsx`; commit: `feat(web-client): add initiative entry parity`) (date: 2026-01-09)
22. [TODO] Git Commit: `feat(web-client): add initiative entry parity` (hash: TBD)

### Stream: Docs

23. [TODO] Обновить системную архитектуру под Initiatives/Runs (пути, API, UI entry) (scope: `doc/Architecture/Architecture.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`; commit: `docs(architecture): document initiatives and runs model`) (date: 2026-01-09)
24. [TODO] Git Commit: `docs(architecture): document initiatives and runs model` (hash: TBD)
