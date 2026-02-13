# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- Каждая микро-задача затрагивает не более **3 файлов**.
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- После каждой микро-задачи обязательны гейты: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетные сборки.
- После зелёных гейтов — Git Commit и немедленный апдейт статусов/хешей в этом файле.

## Required documents to review before work
1. `doc/Sessions/Session031.md` (THIS REPORT)
2. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
3. `doc/SolidWorks-Flow/Stacks/Codex_SDK_Module.md`
4. `doc/SolidWorks-Flow/Stacks/Claude.md` (как эталон подхода delivery/caching)
5. `src/client/project-manager/components/sessions/usage-limits-stream.ts` (provider-scoped cache и распространение)
6. `src/client/ui/src/session/usage-limits-cache.ts` (provider-scoped storage)
7. `packages/core/src/remote-bridge/handlers/session-request-handler.ts` (re-broadcast `turn_completed` в `session:stream`)

---

## Phase 151 — Codex Usage Limits From Rollout JSONL (owner: Oleksandr, updated: 2026-02-12)

**Goal:** для провайдера Codex доставлять `usage_limits` в том же контракте, что у Claude (`currentSession` + `currentWeekAllModels`, `currentWeekSonnetOnly=null`), и гарантировать, что в любой новой Codex-сессии в `Session ID Bar` сразу отображаются **последние известные** лимиты, независимо от того, в какой сессии они были получены.

**Source of truth:** только provider-home:
- `CODEX_HOME=~/.codeai-hub/providers/codex/home`
- rollouts: `$CODEX_HOME/sessions/**/rollout-*.jsonl`

Пример rollout (smoke-check источник):
- `~/.codeai-hub/providers/codex/home/sessions/2026/02/12/rollout-2026-02-12T19-14-17-019c530f-9938-7331-8354-648600e6ea96.jsonl`

### Stream: Snapshot Parser (rate_limits -> usage_limits)
1. [DONE] Codex: реализовать extractor `usage_limits` из rollout `token_count` событий (использовать `payload.rate_limits.primary/secondary`), с нормализацией `resets_at (unix seconds) -> ISO`, `used_percent -> percentUsed` (clamp/round) (scope: `packages/Codex_Module/src/sdk/codex-usage-limits-snapshot.ts`, `packages/Codex_Module/src/sdk/codex-usage-limits-snapshot.test.ts`; expected commit message: `feat(codex): parse usage limits from rollout rate_limits`)
2. [IN_PROGRESS] Git Commit: `feat(codex): parse usage limits from rollout rate_limits` (hash: TBD)

### Stream: Reader (locate rollout in provider-home)
1. [TODO] Codex: добавить reader, который через существующий `resolveRolloutFilePath()` читает JSONL и возвращает latest `usage_limits` snapshot (throttle + cache по `providerSessionId`) (scope: `packages/Codex_Module/src/sdk/codex-usage-limits-reader.ts`, `packages/Codex_Module/src/sdk/index.ts` (или `packages/Codex_Module/src/index.ts` если уместно), `packages/Codex_Module/src/token-usage/codex-token-usage-resolver.ts`; expected commit message: `feat(codex): add usage limits reader for provider-home rollouts`)
2. [TODO] Git Commit: `feat(codex): add usage limits reader for provider-home rollouts` (hash: TBD)

### Stream: Provider Delivery (stream_event + turn_completed)
1. [TODO] Codex: при `turn_completed` публиковать `usageLimits` (a) в `turn_completed` payload, (b) как `stream_event` (`data.kind=usage_limits`) чтобы PM/UI pipeline записал provider-scoped cache и показал лимиты сразу при старте любой новой Codex-сессии (scope: `packages/Codex_Module/src/messaging/message-processor.ts`, `packages/Codex_Module/src/sdk/codex-usage-limits-reader.ts`, `src/client/project-manager/components/sessions/usage-limits-stream.ts`; expected commit message: `fix(codex): emit usage_limits per turn and keep latest across sessions`)
2. [TODO] Git Commit: `fix(codex): emit usage_limits per turn and keep latest across sessions` (hash: TBD)

### Stream: End-to-End Verification (provider-home only)
1. [TODO] Добавить e2e-smoke чек-лист (без изменения кода): запустить Codex workflow, убедиться что новый rollout появляется в `~/.codeai-hub/providers/codex/home/sessions/**`, что `session/weekly` заполняются сразу в новой сессии и не пустые до ответа агента (scope: `doc/SolidWorks-Flow/System/SystemArchitecture.md`, `doc/SolidWorks-Flow/Stacks/Codex_SDK_Module.md`; expected commit message: `docs(codex): document provider-home rollout + usage limits flow`)
2. [TODO] Git Commit: `docs(codex): document provider-home rollout + usage limits flow` (hash: TBD)

### Stream: Quality Gates + Release Build
1. [TODO] Прогнать обязательные гейты + таргетные сборки затронутых пакетов (Codex module + UI/PM при необходимости), затем обновить release docs и собрать релиз: `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version` (scope: `CHANGELOG.md`, `README.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `docs(release): sync docs for v<next>`)
2. [TODO] Git Commit: `docs(release): sync docs for v<next>` (hash: TBD)
3. [TODO] Git Commit: `chore(release): run build-all for v<next>` (hash: TBD)
4. [TODO] Создать session report по результатам реализации Codex usage limits (scope: `doc/Sessions/Session032.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(session): add session032 codex usage limits report`)
5. [TODO] Git Commit: `docs(session): add session032 codex usage limits report` (hash: TBD)
