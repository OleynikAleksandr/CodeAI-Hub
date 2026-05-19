# Kimi-Codex Provider Experiment — Planning

**Status:** draft for user review  
**Owner:** Core Orchestrator / Provider Runtime  
**Date:** 2026-05-19  
**Target provider id:** `kimiCodex`  
**User-facing name:** `Kimi-Codex`

## 1. Цель

Создать дополнительный provider line `kimi-codex`, чтобы сравнить поведение Kimi 2.6 в двух разных runtime-условиях:

- текущий native Kimi provider: `kimi` / Kimi CLI / Wire / Kimi default agent behavior;
- экспериментальный `kimi-codex`: Kimi model endpoint через `codex app-server`, с тем же instruction stack, startup flags, tool restrictions, progress-update contract и turn payload shape, которые используются для Codex GPT 5.5.

Цель эксперимента — понять, будет ли Kimi 2.6 лучше соблюдать CodeAI Hub-owned системные инструкции, progress-update cadence, managed workflow prompts и reasoning visibility contract, если убрать Kimi CLI default agent layer и подать модель через Codex App Server.

## 2. Архитектурная гипотеза

Codex App Server уже является проверенным transport/runtime wrapper для агентской работы CodeAI Hub:

- `thread/start` получает `baseInstructions = CODEAI_CODEX_EARLY_ARCHITECTURE_SYSTEM_PROMPT`;
- `config.project_doc_max_bytes = 0` отключает automatic `AGENTS.md` / project docs discovery;
- process startup использует проверенные disabled feature flags;
- `turn/start` несет applied model identity, reasoning effort и reasoning summary policy;
- progress-update требования живут в Codex base instructions и уже настроены для GPT 5.5.

Если Kimi endpoint можно подключить как OpenAI-compatible model provider к Codex CLI/App Server, то Kimi будет получать не Kimi CLI agent prompt, а Codex instruction profile. Это должно дать честное сравнение поведения модели под двумя разными agent shells.

## 3. Target Runtime Contract

`kimi-codex` должен выглядеть для Core/session runtime как отдельный провайдер, а не как модель внутри существующего `codexCli`:

- отдельный provider id: `kimiCodex`;
- отдельный provider home: `~/.codeai-hub/providers/kimi-codex/home`;
- отдельные model choices для Kimi 2.6 через Codex transport;
- отдельная карточка провайдера на запуске `Description`, `Virtual Simulation`, managed technical steps и Development Tree node sessions;
- отдельный provider label/color/status-line identity;
- отдельные session artifacts under logical provider id `kimiCodex`;
- отдельные diagnostics/capture artifacts.

При этом implementation должен переиспользовать Codex transport internals настолько, насколько это не ломает provider isolation:

- `codex app-server` process;
- `CodexAppServerFacade`;
- Codex event normalization;
- Codex workflow instruction profile;
- Codex startup disabled flags;
- Codex turn-level `summary` handling where compatible;
- Codex model/reasoning switch semantics where compatible.

### Settings surface decision

`kimi-codex` не должен дублировать всю Codex Settings страницу. Settings surface должен быть Codex-family reuse:

- в пользовательском Settings можно разместить `Kimi-Codex` как дополнительный model/profile subsection внутри раздела Codex;
- визуально пользователь видит те же настройки reasoning/summary/progress profile, потому что transport и instruction stack совпадают с Codex GPT 5.5;
- persistence при этом должна хранить отдельный provider default для `kimiCodex`, чтобы start cards, provider inheritance, status-line identity и diagnostics не превращались в `codexCli`;
- простое добавление Kimi как еще одной модели обычного `codexCli` допустимо только для локального spike, но не для product integration, потому что тогда теряются provider identity, отдельный home, отдельные artifacts, честное A/B сравнение и возможность показывать `Kimi-Codex` рядом с native `Kimi`.

## 4. Provider-Home Configuration

`kimi-codex` не должен использовать общий `~/.codex` и не должен мутировать текущий `~/.codeai-hub/providers/codex/home`.

Target home:

```text
~/.codeai-hub/providers/kimi-codex/home
```

Target `config.toml` materialization:

```toml
model_provider = "kimi"
model = "kimi-for-coding"
model_reasoning_summary = "none"

[model_providers.kimi]
name = "Kimi"
base_url = "https://api.kimi.com/coding/v1"
env_key = "KIMI_API_KEY"
wire_api = "chat"
env_key_instructions = "Set KIMI_API_KEY in the environment used by CodeAI Hub."
stream_idle_timeout_ms = 300000
stream_max_retries = 5
request_max_retries = 4
```

Initial probe values are based on the local Kimi CLI profile shape and the native Kimi provider defaults already used by CodeAI Hub. The materializer must not copy secrets from `~/.kimi/config.toml`; `kimi-codex` should read `KIMI_API_KEY` only from the CodeAI Hub process environment. `wire_api = "responses"` remains an experiment only if the Kimi endpoint proves compatible with the Codex Responses path.

## 5. Instruction And Flag Parity With GPT 5.5

`kimi-codex` must use the same CodeAI Hub-owned Codex workflow profile as GPT 5.5:

- same `CODEAI_CODEX_EARLY_ARCHITECTURE_SYSTEM_PROMPT`;
- same progress-update instructions;
- same non-terminal commentary requirement;
- same `thread/start.config.project_doc_max_bytes = 0`;
- same disabled startup features:
  - `multi_agent`;
  - `browser_use`;
  - `in_app_browser`;
  - `computer_use`;
  - `image_generation`;
  - `plugins`;
  - `apps`;
  - `tool_search`;
- same `approvalPolicy` / `sandbox` resolution as normal Codex workflow sessions;
- same `persistExtendedHistory = true` for workflow sessions.

The experiment should not introduce Kimi-specific system instructions during the first implementation. Any Kimi-specific prompt tuning must be a later A/B scope, otherwise the comparison against Codex GPT 5.5 instructions becomes noisy.

## 6. Expected Differences From Native Kimi

Expected improvements to test:

- Kimi may produce ordinary user-visible progress messages more like GPT 5.5.
- Kimi may stop exposing huge native thinking blocks if the Codex transport uses summary/none behavior successfully.
- Kimi may follow managed workflow first prompts more consistently because the Kimi CLI default agent layer is bypassed.

Expected risks:

- Kimi OpenAI-compatible endpoint may support only Chat Completions, not Responses API.
- Codex App Server may expect event shapes, reasoning fields, websocket mode, or tool-call semantics that Kimi does not implement.
- `effort`, `summary`, `verbosity`, `outputSchema`, token usage and usage limits may be ignored or fail.
- Codex account usage-limit APIs do not apply to `kimi-codex`; Kimi usage limits must be unavailable or read through a Kimi-specific endpoint later.
- If Kimi endpoint accepts tool calls differently from OpenAI models, Codex normalized tool behavior may need provider-specific compatibility guards.

## 7. Implementation Strategy

### Phase A — Feasibility Spike

Goal: prove `codex app-server` can start with `CODEX_HOME=~/.codeai-hub/providers/kimi-codex/home`, `model_provider="kimi"`, and a Kimi model id.

Tasks:

1. Add a local, non-product probe script or diagnostic path that starts Codex App Server with a temporary Kimi-Codex home.
2. Send one minimal `thread/start` + `turn/start` using the same Codex workflow profile.
3. Capture raw App Server request/response and provider-home rollout evidence.
4. Decide `wire_api = "chat"` vs `wire_api = "responses"` based on evidence.

Exit criteria:

- app-server starts;
- Kimi returns a visible answer;
- errors are classified into auth/config/protocol/model-incompatible categories.

### Phase B — Provider Runtime Shell

Goal: expose `kimiCodex` as a distinct provider adapter while reusing Codex App Server internals.

Tasks:

1. Create a small `KimiCodex` provider facade/module that wraps Codex App Server process/facade with `providerId = "kimiCodex"` and provider-home `kimi-codex`.
2. Add provider descriptor/loader registration and installer artifact packaging.
3. Add model capability registry for Kimi-Codex models, initially conservative.
4. Add typed stale-binding/session lifecycle behavior equivalent to Codex if the reused transport needs it.

Boundary rule: no task should edit more than three files/classes. If reuse requires touching broad Codex internals, first extract a shared Codex-AppServer runtime helper behind a facade, then build `kimi-codex` on that helper.

### Phase C — Core And Settings Integration

Goal: make `kimiCodex` selectable wherever providers are selectable.

Tasks:

1. Add provider id/type support to shared provider contracts and Core settings defaults.
2. Add Settings Codex-family subsection for `Kimi-Codex` defaults without duplicating the full Codex settings page; persist `kimiCodex` separately from `codexCli`.
3. Add launch-card provider option for all workflow starts and Development Tree node starts.
4. Add status-line/session header identity and provider tint.
5. Preserve provider inheritance: if a step starts with `kimiCodex`, the next step defaults to `kimiCodex`.

### Phase D — Telemetry And Diagnostics

Goal: make comparison evidence visible and debuggable.

Tasks:

1. Add native request capture scenario for `kimi-codex` using Codex App Server diagnostic path.
2. Persist normalized session JSONL under `kimiCodex` provider family.
3. Surface context/token usage only if Codex/Kimi returns reliable usage events.
4. Show 5-hour/weekly limits as unavailable until a Kimi-compatible usage source is confirmed.

### Phase E — Verification And Release

Goal: ship a release where user can run the same workflow step with native `Kimi` and `Kimi-Codex`.

Verification:

- unit tests for provider descriptor/model settings;
- targeted build for Kimi-Codex package and Core;
- `npm run build:webview`;
- `npm run typecheck:webview`;
- live smoke test: `Description` first turn with `kimiCodex`;
- diagnostic capture: `thread/start` must show Codex base instructions and Kimi provider config.

Release must follow the standard confirmation gate before `build-all.sh`.

## 8. User-Facing Acceptance Criteria

The scope is accepted when:

- Settings exposes `Kimi-Codex` defaults inside the Codex-family settings surface without duplicating the full Codex page.
- Start cards show both `Kimi` and `Kimi-Codex` as separate providers.
- Start cards show both providers and both can be selected.
- `kimiCodex` starts a workflow session and responds through Codex App Server.
- The session UI labels the provider as `Kimi-Codex`, not `Codex`.
- Provider inheritance preserves `kimiCodex` into the next workflow step.
- Native capture proves `thread/start.baseInstructions` equals the Codex GPT 5.5 workflow instruction profile.
- Native capture proves project docs / `AGENTS.md` discovery is disabled via `project_doc_max_bytes = 0`.
- If Kimi-Codex cannot support reasoning summary/tool semantics, the UI degrades honestly rather than pretending parity.

## 9. Out Of Scope For First Release

- Replacing native Kimi provider.
- Removing Kimi CLI/Wire implementation.
- Kimi-specific prompt tuning on top of Codex GPT 5.5 instructions.
- Kimi usage-limit percentages unless a reliable endpoint is proven.
- Making Kimi-Codex the default provider.
- Deep refactor of all Codex internals unless a narrow shared facade is required for safe reuse.

## 10. Documentation Updates Required During Implementation

- `doc/SolidWorks-WorkFlow/Modules/Codex.md`
- `doc/SolidWorks-WorkFlow/Modules/Codex_ProviderInvocationFlags.md`
- `doc/SolidWorks-WorkFlow/Modules/Kimi.md`
- new module SSOT: `doc/SolidWorks-WorkFlow/Modules/Kimi_Codex.md`
- `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
- `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md`
- `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionIdUsageBar.md`
- `doc/SolidWorks-WorkFlow/Docs_Index.md`
