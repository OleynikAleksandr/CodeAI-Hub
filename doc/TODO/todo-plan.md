# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- Каждая микро-задача затрагивает не более **3 файлов**.
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- После каждой микро-задачи обязательны гейты: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетные сборки.
- После зелёных гейтов — Git Commit и немедленный апдейт статусов/хешей в этом файле.

## Required documents to review before work
1. `doc/Sessions/Session029.md`
2. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
3. `doc/SolidWorks-Flow/Stacks/Claude.md`
4. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 147 — Claude Usage Limits Panel Recovery + Probe Logging (owner: Oleksandr, updated: 2026-02-12)

**Goal:** восстановить заполнение `session/weekly` в `Session ID Bar` после туров Claude (включая Reviewer) и добавить отдельный диагностический лог probe-запросов лимитов, чтобы видеть каждый запрос и ответ headers.

### Stream: Header Parsing (utilization -> UI contract)
1. [DONE] Claude: добавить поддержку заголовков `anthropic-ratelimit-unified-5h-utilization` и `anthropic-ratelimit-unified-7d-utilization` (fallback на текущий `limit/remaining` сохранить), чтобы snapshot `usage_limits` не был пустым при `HTTP 200` (scope: `packages/Claude_Module/src/sdk/claude-usage-limits-snapshot.ts`; expected commit message: `fix(claude): parse usage limits from utilization headers`)
2. [DONE] Git Commit: `fix(claude): parse usage limits from utilization headers` (hash: af2e5369)

### Stream: Dedicated Probe Log (separate file)
1. [DONE] Claude: добавить отдельный JSONL лог probe-запросов лимитов (attempt, sessionId, status, ключевые ratelimit headers, parsed snapshot/null, error), чтобы после каждого turn можно было проверить факт запроса и результат (scope: `packages/Claude_Module/src/sdk/claude-usage-limits-reader.ts`, `packages/Claude_Module/src/sdk/claude-usage-limits-probe-log.ts`; expected commit message: `feat(claude): add usage limits probe diagnostics log`)
2. [DONE] Git Commit: `feat(claude): add usage limits probe diagnostics log` (hash: d0ee8e59)

### Stream: Regression Tests (parser + stream)
1. [DONE] Добавить targeted тесты на parser/utilization-headers и non-empty `session/weekly` stream contract (scope: `packages/Claude_Module/src/sdk/claude-usage-limits-snapshot.test.ts`, `packages/Claude_Module/package.json`; expected commit message: `test(claude): cover usage limits utilization and stream mapping`)
2. [DONE] Git Commit: `test(claude): cover usage limits utilization and stream mapping` (hash: 718d697b)

### Stream: Quality Gates + Targeted Build
1. [DONE] Прогнать обязательные гейты + таргетные сборки для затронутых пакетов/клиента; обновить статусы в этом плане (scope: `packages/Claude_Module`, `src/client/project-manager`; expected commit message: `chore(todo): close phase147 usage-limits stream`)
2. [DONE] Git Commit: `chore(todo): close phase147 usage-limits stream` (hash: af46a43a)

---

## Phase 148 — Usage Limits Reset Timezone + Readable Label + Release v1.1.574 (owner: Oleksandr, updated: 2026-02-12)

**Goal:** исправить отображение reset-времени лимитов в локальной timezone пользователя и привести формат к читабельному виду (`Resets Feb 12 at 6pm`), затем собрать новый релиз.

### Stream: Session ID Bar reset formatting
1. [DONE] UI: заменить рендер сырого `resetsAt` на formatter локального времени с форматом `Resets <Mon> <day> at <h><am/pm>`, без потери fallback для нестандартных строк (scope: `src/client/ui/src/session/session-id-bar.tsx`, `src/client/ui/src/session/session-id-bar-reset-format.ts`; expected commit message: `fix(ui): format usage reset times in local timezone`)
2. [DONE] Git Commit: `fix(ui): format usage reset times in local timezone` (hash: ea85dc41)

### Stream: Regression tests for reset formatter
1. [DONE] Добавить targeted тесты для timezone conversion и readable label (`UTC Z`/`(UTC)` -> локальный формат), включая fallback кейсы (scope: `src/client/ui/src/session/session-id-bar-reset-format.test.ts`; expected commit message: `test(ui): cover usage reset local time formatting`)
2. [DONE] Git Commit: `test(ui): cover usage reset local time formatting` (hash: 5cd1a174)

### Stream: Quality gates + release build
1. [DONE] Прогнать обязательные гейты и таргетные сборки затронутых модулей, обновить release docs до `1.1.574`, выполнить `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version` (scope: `CHANGELOG.md`, `README.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `docs(release): sync docs for v1.1.574`)
2. [DONE] Git Commit: `docs(release): sync docs for v1.1.574` (hash: 9d062ff8)
3. [DONE] Git Commit: `chore(release): run build-all for v1.1.574` (hash: 8f32d4b9)
4. [DONE] Создать session report по результатам релиза (scope: `doc/Sessions/Session029.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(session): add session029 release report`)
5. [DONE] Git Commit: `docs(session): add session029 release report` (hash: f8b37c24)
