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

1. [DONE] Зафиксировать MVP архитектуру Initiatives/Runs (модель, пути, API, UI entry) (scope: `doc/SolidWorks-Flow/System/Initiatives_Runs_UI_Entry_Architecture.md`; commit: `docs(architecture): add initiatives and runs entry design`) (date: 2026-01-09)
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

15. [DONE] Добавить UI клиенты инициатив/ранов для Core API (scope: `src/client/ui/src/api/orchestrator/initiatives-client.ts`, `src/client/ui/src/api/orchestrator/runs-client.ts`; commit: `feat(ui): add initiatives and runs clients`) (date: 2026-01-09)
16. [DONE] Git Commit: `feat(ui): add initiatives and runs clients` (hash: 5e81703) (date: 2026-01-09)

17. [DONE] Добавить UI строку контекста над кнопками: dropdown инициативы + dropdown run + `+` (создание инициативы с именем/описанием) + `+ run` (создание run с именем/описанием), хранить выбранный контекст в UI state (scope: `src/client/ui/src/components/action-bar/index.tsx`, `src/client/ui/src/components/action-bar/use-initiative-context.ts`; commit: `feat(ui): add initiative and run selector`) (date: 2026-01-09)
18. [DONE] Git Commit: `feat(ui): add initiative and run selector` (hash: caa7a13) (date: 2026-01-09)

19. [DONE] Разделить Action Bar на две зоны: слева `Simple Chat`, справа — Flow buttons (пока: Idea/Spec/Plan/Execute); Flow disabled без `initiative+run` (scope: `src/client/ui/src/components/action-bar/index.tsx`, `media/main-view.css`, `src/client/ui/src/components/action-bar/context-form.tsx`; commit: `refactor(ui): split action bar into chat and flow zones`) (date: 2026-01-09)
20. [DONE] Git Commit: `refactor(ui): split action bar into chat and flow zones` (hash: 298bdbe) (date: 2026-01-09)

21. [DONE] Пересобрать webview bundle после изменения Action Bar (scope: `media/react-chat.js`; commit: `chore(webview): rebuild bundle for initiative entry`) (date: 2026-01-09)
22. [DONE] Git Commit: `chore(webview): rebuild bundle for initiative entry` (hash: 6a2ae70) (date: 2026-01-09)

### Stream: Web-client — parity

23. [DONE] Пробросить workspacePath в webview core config для Initiatives/Runs (scope: `src/extension.ts`, `src/extension-module/home-view-provider.ts`, `src/core/webview-module/webview-html-generator.ts`; commit: `feat(ui): inject workspace path into webview config`) (date: 2026-01-09)
24. [DONE] Git Commit: `feat(ui): inject workspace path into webview config` (hash: e85801a) (date: 2026-01-09)

25. [DONE] Поддержать initiative/run selector и тот же UI entry в standalone `web-client` окружении (scope: `src/client/web-client/environment.ts`, `src/client/web-client/launcher-config.ts`; commit: `feat(web-client): add initiative entry parity`) (date: 2026-01-09)
26. [DONE] Git Commit: `feat(web-client): add initiative entry parity` (hash: 6f29cc7) (date: 2026-01-09)

### Stream: Docs

27. [DONE] Обновить системную архитектуру под Initiatives/Runs (пути, API, UI entry) (scope: `doc/Architecture/Architecture.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; commit: `docs(architecture): document initiatives and runs model`) (date: 2026-01-09)
28. [DONE] Git Commit: `docs(architecture): document initiatives and runs model` (hash: 2e91cfb) (date: 2026-01-09)
