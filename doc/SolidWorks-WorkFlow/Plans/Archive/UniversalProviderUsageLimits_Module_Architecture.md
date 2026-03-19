# Universal Provider Usage Limits Module — Architecture

**Status:** Approved planning basis (pre-implementation, non-SSOT)
**Owner:** Core Runtime + Provider Modules
**Date:** 2026-03-14
**Current mainline status:** partially implemented in fragmented form; `Claude` already uses live rate-limit headers, `Codex` still depends on rollout JSONL, `Gemini` has no dedicated limits module yet

---

## 0) Scope

Этот документ описывает целевой модуль получения и нормализации usage limits для provider stack:
- `Codex`
- `Claude Code`
- `Gemini`

Цель модуля:
- при открытии любой runtime/dialog session быстро поднимать актуальные лимиты провайдера;
- не зависеть от внутреннего формата provider JSONL как от primary source;
- публиковать единый snapshot в уже существующий UI contract Session ID bar / PM session stream.

Важно:
- это planning-док для нового scope;
- текущий `main` ещё не содержит универсального модуля limits;
- UI contract `status.usageLimits` уже существует и должен быть использован как compat boundary.

---

## 1) Problem

Текущее состояние асимметрично и хрупко:

- `Codex` usage limits сейчас читаются из rollout JSONL:
  - `packages/Codex_Module/src/sdk/codex-usage-limits-reader.ts`
  - `packages/Codex_Module/src/sdk/codex-usage-limits-snapshot.ts`
- `Claude` limits уже читаются из live HTTP rate-limit headers:
  - `packages/Claude_Module/src/sdk/claude-usage-limits-reader.ts`
  - `packages/Claude_Module/src/sdk/claude-usage-limits-snapshot.ts`
- `Gemini` limits-модуль в текущем `main` отсутствует.

Следствия:

- Любое изменение формата provider rollout / JSONL ломает `Codex` limits.
- Один провайдер использует runtime/API source, другой local-log source, третий не поддержан вовсе.
- Нельзя гарантировать одинаковое поведение при open/resume session.
- UI уже умеет показывать лимиты, но reliability зависит от того, насколько быстро и стабильно provider package сможет их добыть.

Корневая проблема:
- source-of-truth для limits должен быть не локальный лог провайдера, а его живой runtime/API/status surface.

---

## 2) External Reference

Внешний reference implementation:

- GitHub:
  - `https://github.com/steipete/CodexBar`
- Лицензия:
  - `MIT`
- Локальный reference clone, использованный в этой сессии:
  - `/tmp/CodexBar-20260314`

Почему этот репозиторий релевантен:

- Он не полагается на local JSONL как primary source для provider limits.
- Он использует provider-specific live surfaces:
  - `Codex`: RPC `app-server`, PTY `/status`, optional web dashboard, OAuth usage endpoint
  - `Claude`: OAuth/web/CLI probes
  - `Gemini`: quota API через локальные OAuth credentials
- Он нормализует provider data в единый snapshot model (`RateWindow` / `UsageSnapshot`) и только потом рисует UI.

Файлы в `CodexBar`, из которых можно заимствовать подход и частично логику:

- `Sources/CodexBarCore/UsageFetcher.swift`
- `Sources/CodexBarCore/Providers/Codex/CodexStatusProbe.swift`
- `Sources/CodexBarCore/Providers/Codex/CodexCLISession.swift`
- `Sources/CodexBarCore/Providers/Codex/CodexOAuth/CodexOAuthUsageFetcher.swift`
- `Sources/CodexBarCore/Providers/Gemini/GeminiStatusProbe.swift`
- `Sources/CodexBarCore/OpenAIWeb/OpenAIDashboardParser.swift`
- `docs/codex.md`

Что заимствуем:

- архитектурный принцип `provider-specific strategy -> normalize -> emit UI snapshot`;
- fallback chain по источникам;
- idea of `primary/secondary/tertiary windows`;
- PTY / RPC / API probing patterns.
- единый pipeline для всех провайдеров при разных transport/source implementations.

Что не копируем механически:

- Swift/AppKit/WebKit UI layer;
- macOS-specific storage/presentation classes;
- provider labels в их текущем UI виде.

---

## 3) Design Goals

- **Reliability first:** primary source для limits должен быть живой provider surface.
- **Provider-agnostic contract:** единый normalized snapshot независимо от провайдера.
- **Unified pipeline:** для всех провайдеров действует одна схема `reader -> normalizer -> shared snapshot -> compat adapter`; одинаковый принцип не требует одинакового транспорта.
- **Additive migration:** текущий UI contract не ломаем.
- **Fast on open:** при открытии session limits должны появляться сразу из cache или после быстрого background refresh.
- **Fallback-ready:** если основной источник провайдера недоступен, модуль автоматически переходит к следующей стратегии.
- **Closed module:** внешние части системы не знают о деталях PTY/RPC/API probing.
- **Micro-classes:** классы и файлы должны оставаться маленькими, с одной ответственностью.
- **No JSONL dependency as primary:** local rollout/log scanning допускается только как fallback/diagnostic path.

---

## 4) Non-goals

- Не переписываем весь Session UI в этой фазе.
- Не делаем WebKit/browser-cookie scraping в `CodeAI-Hub` v1 для limits, если есть более стабильный provider-native API/RPC surface.
- Не внедряем общий token usage модуль здесь; context-window token usage уже существует и остаётся отдельным треком.
- Не строим provider billing/credits analytics в этом модуле.

---

## 5) Current Compatible Boundary

Текущий UI boundary уже существует:

- `src/types/session.ts`
- `src/client/project-manager/components/sessions/usage-limits-stream.ts`
- `src/client/ui/src/session/session-id-bar.tsx`

Текущий compat payload:

```ts
type SessionStatusUsageLimits = {
  currentSession?: { percentUsed: number; resetsAt?: string | null } | null;
  currentWeekAllModels?: { percentUsed: number; resetsAt?: string | null } | null;
  currentWeekSonnetOnly?: { percentUsed: number; resetsAt?: string | null } | null;
} | null;
```

Это boundary надо сохранить для безболезненной интеграции в существующий UI.

Но внутренний canonical model должен быть более общим.

---

## 6) Target Internal Contract

Внутренний normalized contract модуля:

```ts
type ProviderUsageLimitWindow = {
  id: "primary" | "secondary" | "tertiary";
  label: string;
  percentUsed: number;
  resetsAt: string | null;
  windowKind:
    | "session"
    | "weekly"
    | "daily"
    | "model-weekly"
    | "provider-specific";
};

type ProviderUsageLimitsSnapshot = {
  providerId: "codex" | "claude" | "gemini";
  providerScopeKey: string;
  source:
    | "codex_rpc"
    | "codex_status"
    | "codex_rollout_fallback"
    | "claude_headers"
    | "claude_probe"
    | "gemini_quota_api"
    | "gemini_cli_fallback";
  windows: readonly ProviderUsageLimitWindow[];
  collectedAt: string;
};
```

Compat adapter:
- `ProviderUsageLimitsSnapshot -> SessionStatusInfo["usageLimits"]`

Маппинг до миграции UI:

- `primary` -> `currentSession`
- `secondary` -> `currentWeekAllModels`
- `tertiary` -> `currentWeekSonnetOnly`

Важно:
- поле `currentWeekSonnetOnly` исторически Claude-specific и плохо называется для универсального use-case;
- переименование UI contract возможно только отдельной фазой;
- в первой реализации мы сохраняем текущее имя как compat slot.

---

## 7) Module Placement

Целевой новый закрытый модуль:

- `packages/core/src/provider-usage-limits/`

Единственная внешняя точка входа:

- `packages/core/src/provider-usage-limits/provider-usage-limits-facade.ts`

Примерная внутренняя структура:

- `provider-usage-limits-facade.ts`
- `provider-usage-limits-types.ts`
- `provider-usage-limits-cache.ts`
- `provider-usage-limits-change-detector.ts`
- `provider-usage-limits-compat-adapter.ts`
- `provider-usage-limits-scope-key.ts`
- `provider-usage-limits-stream-event.ts`
- `providers/codex/codex-usage-limits-facade.ts`
- `providers/codex/codex-rpc-usage-limits-reader.ts`
- `providers/codex/codex-status-usage-limits-reader.ts`
- `providers/codex/codex-rollout-usage-limits-reader.ts`
- `providers/codex/codex-usage-limits-normalizer.ts`
- `providers/claude/claude-usage-limits-facade.ts`
- `providers/claude/claude-live-headers-reader.ts`
- `providers/claude/claude-probe-usage-limits-reader.ts`
- `providers/claude/claude-usage-limits-normalizer.ts`
- `providers/gemini/gemini-usage-limits-facade.ts`
- `providers/gemini/gemini-quota-api-reader.ts`
- `providers/gemini/gemini-cli-usage-limits-reader.ts`
- `providers/gemini/gemini-usage-limits-normalizer.ts`

Принцип:
- один provider-specific facade на провайдера;
- внутри provider facade несколько reader strategies;
- общий core facade только оркестрирует и нормализует.

---

## 8) Public Facade Contract

Внешний API фасада:

```ts
type ReadUsageLimitsParams = {
  providerId: "codex" | "claude" | "gemini";
  workspacePath: string;
  runtimeSessionId: string;
  providerSessionId: string | null;
  environment?: NodeJS.ProcessEnv;
  force?: boolean;
};

interface ProviderUsageLimitsFacade {
  read(params: ReadUsageLimitsParams): Promise<SessionStatusInfo["usageLimits"] | null>;
  getCached(params: Pick<ReadUsageLimitsParams, "providerId" | "providerSessionId">): SessionStatusInfo["usageLimits"] | null;
  clearScope(providerId: string, providerSessionId: string): void;
}
```

Обязанности фасада:

- выбрать provider-specific strategy chain;
- выполнить dedupe/in-flight protection;
- вернуть compat snapshot;
- отдать source metadata для логирования;
- не эмитить события сам по себе.

Эмит событий остаётся в provider message processor / session manager.

---

## 9) Provider Strategy Chains

### 9.1 Codex

Target primary:
- `codex app-server` JSON-RPC или другой structured live surface, если он подтверждён в текущей версии CLI

Notes:
- точный RPC method contract должен быть подтверждён во время implementation-phase;
- structured runtime/API surface предпочтительнее, чем text/TUI parsing.

Secondary:
- PTY запуск `codex` и чтение `/status` как live-status fallback

Tertiary:
- rollout JSONL parser как fallback / diagnostic source

Причина:
- `Codex` уже показывает limits через runtime surfaces;
- JSONL должен перестать быть primary source;
- PTY fallback нужен на случай несовместимости `app-server` / RPC.

Кандидаты на заимствование из `CodexBar`:
- `CodexRPCClient` / `account/rateLimits/read`
- `CodexStatusProbe`
- `CodexCLISession`

### 9.2 Claude Code

Primary:
- live rate-limit headers из реального provider response, если текущий SDK/CLI bridge позволяет достать response metadata

Secondary:
- lightweight probe по OAuth token / rate-limit headers

Optional fallback:
- dedicated CLI usage/status strategy, если у провайдера появится стабильный structured endpoint

Причина:
- existing `ClaudeUsageLimitsReader` уже работает через live provider API headers;
- нужно только перевести его из isolated module в общий strategy contract;
- synthetic probe не должен быть единственным путём, если headers можно извлечь из уже состоявшегося turn.

### 9.3 Gemini

Primary:
- quota API через локальные Gemini OAuth credentials

Secondary:
- CLI fallback parsing только если появится стабильный machine-readable endpoint или достаточно устойчивый text status

Причина:
- у `Gemini` limits приходят не из session JSONL, а из quota API;
- модель ограничений provider-native и не совпадает 1-в-1 с `5h + weekly`.

Кандидат на заимствование из `CodexBar`:
- `GeminiStatusProbe`

---

## 10) Normalization Rules

### Codex

- `primary` = `5h session`
- `secondary` = `7d weekly`
- `tertiary` = `null`

### Claude

- `primary` = `5h session`
- `secondary` = `7d weekly`
- `tertiary` = Claude model-specific weekly bucket, если он реально доступен

### Gemini

Provider-native reality:
- у Gemini нет гарантированного аналога `5h session` и `7d weekly`;
- quota surface зависит от tier/model.

Поэтому:

- internal snapshot должен хранить provider-native labels;
- compat layer временно маппит:
  - `primary` = lowest-risk main quota bucket
  - `secondary` = next important quota bucket
  - `tertiary` = optional third bucket

Следствие:
- для Gemini текущий Session ID bar будет показывать данные в legacy двухполосном формате;
- в отдельной будущей фазе UI должен перейти с hardcoded `session/weekly` на provider-aware labels.

---

## 11) Caching, Dedupe, Scope

Модуль обязан иметь:

- per-provider in-flight dedupe;
- minimum refresh interval;
- last-known snapshot cache;
- explicit `force` mode для post-turn refresh;
- scope key, не завязанный на display label.

Текущий UI cache использует `providerSummary` string.
Это недостаточно надёжно.

Канонический scope key:

```ts
providerScopeKey = `${providerId}:${providerSessionId ?? "global"}`
```

Если provider limits account-level и не зависят от конкретного thread/session:
- допускается fallback к `${providerId}:global`

Но внутри одной provider implementation это должно быть явное решение, а не случайный side effect.

---

## 12) Event Contract

После успешного refresh provider module обязан эмитить:

```ts
{
  type: "stream_event",
  provider: "codex" | "claude" | "gemini",
  sessionId,
  providerSessionId?,
  providerScopeKey,
  usageLimits,
  data: {
    kind: "usage_limits",
    usageLimits,
    providerScopeKey,
    source,
    collectedAt
  }
}
```

Требования:

- emit только когда snapshot реально изменился;
- `turn_completed` должен включать `usageLimits`, если force-refresh успел завершиться;
- если refresh не успел по timeout, можно отдать cached snapshot и параллельно сохранить background result;
- UI не должен знать, откуда пришли limits.

---

## 13) Integration Points

### Provider modules

Новые integration points:

- session create
- session resume
- provider session binding ready / `sessionIdChanged`
- turn completed
- manual refresh

Рекомендуемое поведение:

- на `create/resume/open`:
  - background refresh без агрессивного synthetic probing
- на `turn_completed`:
  - `force: true`
- на `session reopen`:
  - сначала cached snapshot, затем stale refresh

### Core / Remote Bridge / UI

Core и UI почти не меняются:

- `packages/core` продолжает ретранслировать `stream_event`;
- `PM` уже умеет применять `usage_limits`;
- `Session ID bar` уже умеет брать `status.usageLimits` и local cache.

Нужны только точечные доработки:

- заменить cache key `providerSummary` на provider scope key;
- добавить source-aware debug logging;
- при желании в будущем перевести UI labels на provider-aware rendering.

---

## 14) Logging and Diagnostics

Для каждой strategy chain нужен structured logging:

- provider id
- runtime session id
- provider session id
- selected source
- attempt order
- failure reason
- timeout
- snapshot hash / changed vs unchanged

Диагностические логи должны объяснять:

- почему выбрали именно этот source;
- почему fallback сработал;
- почему snapshot не был эмитирован.

---

## 15) Security and Side Effects

### Codex

- RPC и PTY probes не должны менять состояние рабочей session;
- preferred path: отдельный short-lived `app-server` process или изолированный status session.

### Claude

- synthetic probe может создавать provider-side request;
- поэтому live response headers должны иметь более высокий приоритет, чем dedicated probe;
- probe надо жёстко дебаунсить и использовать только когда нет свежих headers.

### Gemini

- quota API работает через локальные OAuth creds;
- модуль не должен сохранять access tokens в UI/storage;
- допустим только ephemeral in-memory usage.

---

## 16) Migration Strategy

### Phase A — Contract and Facade

- ввести shared types, `providerScopeKey`, cache, compat adapter и facade boundary;
- не менять provider behavior;
- подготовить общий pipeline для всех провайдеров.

### Phase B — Claude Unification

- обернуть текущий `ClaudeUsageLimitsReader` в shared strategy contract;
- сохранить parity текущего поведения, но перевести `Claude` на общий фасад и общий cache/dedupe contract;
- добавить приоритет live turn headers, если это доступно без сильной переделки provider bridge.

### Phase C — Codex Migration

- внедрить `Codex` strategy chain:
  - structured runtime/API source
  - PTY `/status`
  - rollout fallback
- rollout JSONL оставить только fallback path.

### Phase D — Gemini Support

- реализовать quota API reader;
- нормализовать Gemini windows в shared snapshot.

### Phase E — Scope-Key/UI Hardening

- перевести usage-limits cache и fan-out с `providerSummary` на `providerScopeKey`;
- не менять user-facing labels в этой фазе.

### Phase F — UI Label Generalization

- перевести Session ID bar с hardcoded `session/weekly` на provider-aware labels;
- текущий compat contract оставить до конца миграции.

---

## 17) Suggested Micro-Task Breakdown

Ниже разбивка под ваши execution rules `<= 3 files per task`.

1. Создать planning-approved shared types и facade skeleton без интеграции.
2. Добавить `providerScopeKey`, compat adapter и stream event contract.
3. Обернуть текущий `Claude` reader в новый strategy contract.
4. Перевести `Claude` message processor на shared facade/cache contract.
5. Перевести `Codex` reader contract с JSONL-only на strategy interface.
6. Добавить `Codex` structured runtime/API reader.
7. Добавить `Codex` PTY fallback reader.
8. Собрать `Codex` provider facade и заменить старый direct reader в message processor.
9. Добавить `Gemini` quota API reader.
10. Подключить `Gemini` usage limits emission в session manager/provider adapter.
11. Перевести UI usage-limits cache с `providerSummary` на `providerScopeKey`.
12. Добавить source/debug diagnostics в Session UI / Debug panel.
13. В отдельной фазе сделать provider-aware labels.

---

## 18) Acceptance Criteria

- `Codex` limits больше не зависят от rollout JSONL как primary source.
- `Claude`, `Codex` и `Gemini` используют один и тот же архитектурный pipeline при provider-specific readers.
- `Gemini` начинает эмитить limits в тот же UI pipe.
- На open/resume session пользователь видит last-known limits сразу и refreshed limits shortly after.
- Session ID bar и PM view получают limits одинаково для всех трёх провайдеров.
- При provider format drift в local logs `Codex` limits не теряются, пока живы RPC/PTY surfaces.

---

## 19) Key Risks

- `Codex` RPC surface может меняться между версиями CLI.
- `Claude` synthetic probe может давать лишний provider-side traffic, если не будет дедупа и cache.
- `Gemini` quota semantics не совпадают с legacy `session/weekly` UI labels.
- Попытка сделать полностью универсальный UI contract в ту же фазу раздует scope.

---

## 20) Recommendation

Рекомендованный implementation order:

1. Использовать этот planning-док как approved basis для execution plan.
2. Развернуть отдельный execution `todo-plan.md` только после approval.
3. Сначала ввести общий shared contract/facade и `providerScopeKey`.
4. Затем унифицировать `Claude` как самый низкорисковый existing live-source path.
5. После этого перевести `Codex` на structured runtime/API source с PTY и rollout fallback.
6. Затем добавить `Gemini`.
7. UI label generalization вынести в отдельную фазу, не смешивать с backend/source migration.
