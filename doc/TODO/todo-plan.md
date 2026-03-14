# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Дополнительно перед стартом этого scope открыть: `AGENTS.md`, `doc/SolidWorks-WorkFlow/README.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Plans/UniversalProviderUsageLimits_Module_Architecture.md`, `doc/Sessions/Session074.md`.
- Execution-plan основан на approved planning-доке `doc/SolidWorks-WorkFlow/Plans/UniversalProviderUsageLimits_Module_Architecture.md`.
- TODO Plan состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стримов), в каждом стриме - микро-задачи.
- Каждая микро-задача затрагивает не более 3 файлов или пакетов.
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`.
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- Husky gates не обходить (`--no-verify` запрещен).
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита.
- Таргетные сборки выполнять перед закрытием затронутого Stream/Phase.

---

## Phase 1 — Shared contract bootstrap (owner: Oleksandr, updated: 2026-03-14)

### Stream: Core facade boundary
1. [DONE] Ввести shared contract для universal usage limits: `provider-usage-limits-types.ts`, `provider-usage-limits-scope-key.ts`, `provider-usage-limits-compat-adapter.ts` (scope: `packages/core/src/provider-usage-limits/provider-usage-limits-types.ts`, `packages/core/src/provider-usage-limits/provider-usage-limits-scope-key.ts`, `packages/core/src/provider-usage-limits/provider-usage-limits-compat-adapter.ts`; expected commit: `feat(core): add provider usage limits shared contract`).
2. [DONE] Git Commit: `feat(core): add provider usage limits shared contract` (hash: `a930f36d`)
3. [DONE] Добавить shared cache/change detector/facade skeleton без provider integration (scope: `packages/core/src/provider-usage-limits/provider-usage-limits-cache.ts`, `packages/core/src/provider-usage-limits/provider-usage-limits-change-detector.ts`, `packages/core/src/provider-usage-limits/provider-usage-limits-facade.ts`; expected commit: `feat(core): add provider usage limits facade skeleton`).
4. [DONE] Git Commit: `feat(core): add provider usage limits facade skeleton` (hash: `59ca3a7a`)
5. [DONE] Ввести shared stream payload helper и canonical `providerScopeKey` emission contract без UI-переключения на новый cache key (scope: `packages/core/src/provider-usage-limits/provider-usage-limits-stream-event.ts`, `packages/core/src/provider-usage-limits/provider-usage-limits-facade.ts`, `packages/core/src/provider-usage-limits/provider-usage-limits-types.ts`; expected commit: `feat(core): add provider usage limits stream contract`).
6. [DONE] Git Commit: `feat(core): add provider usage limits stream contract` (hash: `ca24d723`)

---

## Phase 2 — Claude unification on shared module (owner: Oleksandr, updated: 2026-03-14)

### Stream: Claude shared strategy chain
1. [DONE] Обернуть текущий live/probe path Claude в shared strategy contract и normalizer (scope: `packages/core/src/provider-usage-limits/providers/claude/claude-live-headers-reader.ts`, `packages/core/src/provider-usage-limits/providers/claude/claude-usage-limits-normalizer.ts`, `packages/core/src/provider-usage-limits/providers/claude/claude-usage-limits-facade.ts`; expected commit: `feat(core): add claude usage limits shared facade`).
2. [DONE] Git Commit: `feat(core): add claude usage limits shared facade` (hash: `532c5ec7`)
3. [DONE] Протянуть injection contract shared Claude usage limits facade через boundary `core -> Claude adapter` (scope: `packages/Claude_Module/src/types/index.ts`, `packages/core/src/provider-registry/index.ts`; expected commit: `feat(core): inject claude usage limits facade boundary`).
4. [DONE] Git Commit: `feat(core): inject claude usage limits facade boundary` (hash: `5abbac4a`)
5. [DONE] Перевести `Claude` message processor на injected shared facade и убрать локальные usage-limits cache/in-flight maps из provider-модуля (scope: `packages/Claude_Module/src/provider/claude-provider-adapter.ts`, `packages/Claude_Module/src/messaging/message-processor.ts`; expected commit: `refactor(claude): route usage limits through shared facade`).
6. [DONE] Git Commit: `refactor(claude): route usage limits through shared facade` (hash: `fc29738d`)
7. [DONE] Если Claude SDK runtime отдаёт `SDKRateLimitEvent`, предпочесть этот live runtime signal synthetic probe и оставить probe только fallback path (scope: `packages/Claude_Module/src/messaging/message-processor.ts`, `packages/core/src/provider-registry/index.ts`, `packages/core/src/provider-usage-limits/providers/claude/claude-usage-limits-facade.ts`; expected commit: `feat(claude): prefer sdk rate limit events`).
8. [DONE] Git Commit: `feat(claude): prefer sdk rate limit events` (hash: `74cd1551`)

---

## Phase 3 — Codex live-source migration (owner: Oleksandr, updated: 2026-03-14)

### Stream: Codex strategy chain
1. [DONE] Вынести `Codex` rollout path в shared strategy contract как явный fallback, не primary source (scope: `packages/core/src/provider-usage-limits/providers/codex/codex-rollout-usage-limits-reader.ts`, `packages/core/src/provider-usage-limits/providers/codex/codex-usage-limits-normalizer.ts`, `packages/core/src/provider-usage-limits/providers/codex/codex-usage-limits-facade.ts`; expected commit: `feat(core): add codex rollout usage limits fallback`).
2. [DONE] Git Commit: `feat(core): add codex rollout usage limits fallback` (hash: `31182e9b`)
3. [DONE] Добавить `Codex` structured runtime/API reader как primary candidate и встроить его в strategy order (scope: `packages/core/src/provider-usage-limits/providers/codex/codex-rpc-usage-limits-reader.ts`, `packages/core/src/provider-usage-limits/providers/codex/codex-usage-limits-facade.ts`, `packages/core/src/provider-usage-limits/providers/codex/codex-usage-limits-normalizer.ts`; expected commit: `feat(core): add codex runtime usage limits reader`).
4. [DONE] Git Commit: `feat(core): add codex runtime usage limits reader` (hash: `206da7e1`)
5. [DONE] Подтвердить `codex app-server` JSON-RPC `account/rateLimits/read` и встроить его в `codex_rpc` reader как structured secondary live-source между runtime payload и rollout fallback; PTY `/status` вывести из обязательного scope первой версии (scope: `packages/core/src/provider-usage-limits/providers/codex/codex-rpc-usage-limits-reader.ts`, `packages/core/src/provider-usage-limits/providers/codex/codex-usage-limits-normalizer.ts`; expected commit: `feat(core): add codex app-server rate limits fallback`).
6. [DONE] Git Commit: `feat(core): add codex app-server rate limits fallback` (hash: `f38b96db`)
7. [DONE] Перевести `Codex` message processor на shared facade/runtime payload path и оставить rollout-only reader только compat fallback, если bridge не инжектирован (scope: `packages/Codex_Module/src/types/index.ts`, `packages/Codex_Module/src/provider/codex-provider-adapter.ts`, `packages/Codex_Module/src/messaging/message-processor.ts`; expected commit: `refactor(codex): add shared usage limits facade bridge`).
8. [DONE] Git Commit: `refactor(codex): add shared usage limits facade bridge` (hash: `63930691`)
9. [DONE] Протянуть injection contract `core -> Codex adapter`, чтобы shared `CodexUsageLimitsFacade` реально использовался как runtime-first boundary (scope: `packages/core/src/provider-registry/index.ts`; expected commit: `feat(core): inject codex usage limits facade bridge`).
10. [DONE] Git Commit: `feat(core): inject codex usage limits facade bridge` (hash: `bce0b865`)

---

## Phase 4 — Gemini support on the same contract (owner: Oleksandr, updated: 2026-03-14)

### Stream: Gemini provider chain
1. [TODO] Добавить `Gemini` quota API reader, normalizer и provider facade на shared contract (scope: `packages/core/src/provider-usage-limits/providers/gemini/gemini-quota-api-reader.ts`, `packages/core/src/provider-usage-limits/providers/gemini/gemini-usage-limits-normalizer.ts`, `packages/core/src/provider-usage-limits/providers/gemini/gemini-usage-limits-facade.ts`; expected commit: `feat(core): add gemini usage limits facade`).
2. [TODO] Git Commit: `feat(core): add gemini usage limits facade` (hash: TBD)
3. [TODO] Подключить `Gemini` usage limits emission в provider adapter/session pipeline без UI label rewrite (scope: `packages/Gemini_Module/src/provider/gemini-provider-adapter.ts`, `packages/core/src/provider-usage-limits/providers/gemini/gemini-usage-limits-facade.ts`, `packages/core/src/provider-usage-limits/provider-usage-limits-stream-event.ts`; expected commit: `feat(gemini): emit usage limits through shared contract`).
4. [TODO] Git Commit: `feat(gemini): emit usage limits through shared contract` (hash: TBD)
5. [TODO] Добавить secondary CLI/status fallback только если quota API покажет gaps по стабильности или доступности (scope: `packages/core/src/provider-usage-limits/providers/gemini/gemini-cli-usage-limits-reader.ts`, `packages/core/src/provider-usage-limits/providers/gemini/gemini-usage-limits-facade.ts`, `packages/core/src/provider-usage-limits/providers/gemini/gemini-usage-limits-normalizer.ts`; expected commit: `feat(core): add gemini usage limits fallback`).
6. [TODO] Git Commit: `feat(core): add gemini usage limits fallback` (hash: TBD)

---

## Phase 5 — Scope-key and UI hardening (owner: Oleksandr, updated: 2026-03-14)

### Stream: Replace providerSummary cache coupling
1. [TODO] Протянуть `providerScopeKey` в session status/bridge contract как канонический cache key для usage limits (scope: `src/types/session.ts`, `packages/core/src/provider-usage-limits/provider-usage-limits-stream-event.ts`, `packages/core/src/provider-usage-limits/provider-usage-limits-facade.ts`; expected commit: `feat(core): propagate provider scope key for usage limits`).
2. [TODO] Git Commit: `feat(core): propagate provider scope key for usage limits` (hash: TBD)
3. [TODO] Перевести UI local cache и stream fan-out с `providerSummary` на `providerScopeKey` (scope: `src/client/ui/src/session/usage-limits-cache.ts`, `src/client/project-manager/components/sessions/usage-limits-stream.ts`, `src/client/ui/src/app-host/session-stream-usage-sync.ts`; expected commit: `refactor(ui): use provider scope key for usage limits cache`).
4. [TODO] Git Commit: `refactor(ui): use provider scope key for usage limits cache` (hash: TBD)
5. [TODO] Обновить initial snapshot fallback и Session ID bar на новый cache key без label generalization (scope: `src/client/ui/src/session/helpers.ts`, `src/client/ui/src/session/session-id-bar.tsx`, `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx`; expected commit: `refactor(ui): resolve usage limits by scope key`).
6. [TODO] Git Commit: `refactor(ui): resolve usage limits by scope key` (hash: TBD)

---

## Phase 6 — Diagnostics and future UI generalization (owner: Oleksandr, updated: 2026-03-14)

### Stream: Debuggability and provider-aware UI
1. [TODO] Добавить source-aware diagnostics для usage limits refresh/result/fallback в shared module и provider integrations (scope: `packages/core/src/provider-usage-limits/provider-usage-limits-facade.ts`, `packages/core/src/provider-usage-limits/provider-usage-limits-stream-event.ts`, `packages/Codex_Module/src/messaging/message-processor.ts`; expected commit: `feat(core): add usage limits diagnostics`).
2. [TODO] Git Commit: `feat(core): add usage limits diagnostics` (hash: TBD)
3. [TODO] Перевести Session ID bar с hardcoded `session/weekly` на provider-aware labels, сохранив compat для старых snapshots (scope: `src/client/ui/src/session/session-id-bar.tsx`, `src/client/ui/src/session/usage-limits-cache.ts`, `src/types/session.ts`; expected commit: `feat(ui): generalize provider usage limit labels`).
4. [TODO] Git Commit: `feat(ui): generalize provider usage limit labels` (hash: TBD)

---

## Phase 7 — Release build and packaging (owner: Oleksandr, updated: 2026-03-14)

### Stream: Local release assembly
1. [TODO] Актуализировать release-facing docs перед сборкой: `README.md`, `CHANGELOG.md`, связанные материалы `doc/` и итоговый `doc/Sessions/Session075.md` под фактическую версию/состав релиза (scope: `README.md`, `CHANGELOG.md`, `doc/Sessions/Session075.md`; expected commit: `docs(release): prep universal usage limits release`).
2. [TODO] Git Commit: `docs(release): prep universal usage limits release` (hash: TBD)
3. [TODO] На чистом дереве выполнить полный релизный прогон `./scripts/build-all.sh`, зафиксировать версию/артефакты и при необходимости обновить release-manifest файлы (scope: `package.json`, release manifests/versioned artifacts, `doc/tmp/releases/`; expected commit: `chore(release): build universal usage limits release`).
4. [TODO] Git Commit: `chore(release): build universal usage limits release` (hash: TBD)
5. [TODO] Выполнить `./scripts/build-release.sh --use-current-version`, проверить появление VSIX и зафиксировать результаты в session report и `todo-plan.md` (scope: `codeai-hub-<version>.vsix`, `doc/Sessions/Session075.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(session): record universal usage limits release build`).
6. [TODO] Git Commit: `docs(session): record universal usage limits release build` (hash: TBD)
