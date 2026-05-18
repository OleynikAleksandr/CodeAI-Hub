# Kimi Provider Module — Module (SSOT)

## Назначение
Kimi provider module подключает Kimi Code / Kimi 2.6 к Core как обычного workflow-провайдера CodeAI Hub: Core создаёт и резюмирует provider sessions, отправляет user turns через Wire transport, принимает нормализованные lifecycle/message/request events, управляет model identity через shared settings, а Project Manager остаётся только UI-проекцией provider state.

## Где живёт код
- Provider package: `packages/Kimi_Module/`
- Public Core-facing facade: `packages/Kimi_Module/src/provider/kimi-provider-adapter.ts`
- Public module export: `packages/Kimi_Module/src/index.ts`
- Wire process bridge: `packages/Kimi_Module/src/wire/kimi-wire-process.ts`
- Wire JSON-RPC router: `packages/Kimi_Module/src/wire/kimi-wire-router.ts`
- Session lifecycle: `packages/Kimi_Module/src/session/kimi-session-lifecycle.ts`
- Event/request normalization: `packages/Kimi_Module/src/messaging/`
- Model capability registry: `packages/Kimi_Module/src/types/kimi-model-capabilities.ts`

## Внешний контракт
- Provider id в Core/UI catalog: `kimiCode`.
- User-facing provider label: `Kimi`.
- Default model id: `kimi-for-coding`.
- Status/settings label: `Kimi 2.6 / Kimi Code`.
- Core registry creates the adapter through the provider descriptor/module loader path; external code must enter the module through `KimiProviderAdapter` and must not import Wire/process/session internals directly.
- Kimi model switch in the first release is display-only in Session UI: status-line picker can render the selected Kimi model, but Kimi does not receive a provider-native live switch command until a verified Wire/runtime switch contract exists.

## Provider-home и auth bootstrap
- CodeAI-managed runtime state always lives under `~/.codeai-hub/providers/kimi/home`.
- The runtime process must receive `KIMI_SHARE_DIR=~/.codeai-hub/providers/kimi/home`.
- The runtime process must receive `KIMI_CLI_NO_AUTO_UPDATE=1`; provider updates belong to CodeAI Hub settings/startup policy, not to hidden CLI self-update during workflow turns.
- Existing user auth/config is referenced through `--config-file ~/.kimi/config.toml` unless Core supplies an explicit `workspace.configPath`.
- `~/.kimi` is an auth/config source only. CodeAI runtime/session files must not be written there.
- Local proof from 2026-05-18: `KIMI_SHARE_DIR=~/.codeai-hub/providers/kimi/home kimi --wire --config-file ~/.kimi/config.toml --work-dir <repo>` completed `initialize`, streamed an answer for `2 + 2`, emitted `TurnBegin` / `StepBegin` / `ContentPart` / `StatusUpdate` / `TurnEnd`, and returned `prompt.result.status=finished`.

## Wire transport
- Runtime starts `kimi --wire --config-file <configPath>` with `cwd` resolved to the active workspace.
- `KimiWireProcessBridge` owns `child_process.spawn`, env/args, stdout line framing, stderr warnings, JSON writes, and shutdown cleanup.
- `KimiWireRouter` owns JSON-RPC request/response correlation, provider notifications, provider requests, malformed-frame handling, and dispatch back to the adapter.
- `KimiSessionLifecycle` owns `initialize`, `prompt`, `resume`, `cancel`, logical close, and provider session id capture/restore.
- Lifecycle normalization must surface `turn_started` before visible assistant/progress events and must terminate every send as `turn_completed` or `turn_failed`.

## Event normalization
- Wire `TurnBegin` / `TurnEnd` becomes Core provider lifecycle events.
- Wire content/progress notifications become normalized assistant/progress events on the same provider event surface used by the existing providers.
- Wire provider `request` envelopes are normalized before they reach Core. First release policy is deny-by-default for provider requests until a provider-neutral approval/tool contract is explicitly implemented.
- Auth, quota, service, unsupported-model and stale-session failures must be classified before binding teardown so Core can retry/rebind once or show a provider recovery surface instead of silently dropping the user message.

## Continuity and stale binding
- Kimi participates in the same snapshot-first continuity contract as Claude, Codex and Gemini.
- Restored Core bindings may contain a provider session id that the fresh Kimi adapter process has not hydrated yet.
- In that case `KimiSessionLifecycle` throws `KIMI_SESSION_STALE_BINDING`; Core `SessionRequestHandlerMessageDispatch` treats it as a one-shot stale-binding recovery signal, invalidates the binding, rebinds, and retries the send once.
- Generic `Error` must not be used for this path because generic retryable classification does not preserve the provider session id required for deterministic recovery.

## Effective model identity and settings
- Kimi default model belongs to shared provider settings, not to Project Manager local state.
- Settings persist `providers.kimi.defaultModel` and `providers.kimi.autoUpdate`; UI cards and workflow start cards read/write through the shared settings contract.
- Core-applied turn config remains authoritative for outbound sends. Provider-local defaults are only bootstrap fallback.
- Kimi has no reasoning/thinking effort dimension in the current release. UI surfaces must not synthesize a hidden effort field.

## Project Manager surfaces
- Kimi must be visible anywhere users choose or inspect a provider: Settings provider card, Description submit provider picker, workflow start cards, Development Tree start/fix cards, Session UI status-line/model chip, provider labels, and provider color/theme mapping.
- PM must send raw provider/model intent to Core and render Core-owned snapshots. It must not create a Kimi-specific workflow truth or bypass Core managed stage transitions.
- Kimi provider theme id is `kimi`; CSS/design tokens define its accent/fill/border/soft states for Project Manager and Session UI.

## Usage limits
- Kimi usage limits have no stable official reader in this release.
- `KimiProviderAdapter.refreshUsageLimits(...)` broadcasts a provider-scoped unavailable payload with `providerScopeKey = "kimi:global"`, `usageLimits = null`, and source `kimi_unavailable`.
- Session UI must render this as unavailable, not as indefinite loading.

## Native diagnostic capture
- Kimi diagnostic capture is Wire-evidence based, not TLS MITM based.
- `KimiProviderAdapter.captureNativeRequest(...)` records a Core-owned applied input envelope with provider home, selected model, user config path, and `wire.jsonl` provenance.
- The Core native request capture writer includes Kimi provider diagnostic context in the same `.jsonl` / `.md` artifact family under `~/.codeai-hub/logs/native-request-capture/`.
- Kimi capture must not require OpenSSL/TLS proxy preflight because the useful evidence is the Wire prompt envelope and provider-home `wire.jsonl` provenance.

## Release packaging
- `packages/Kimi_Module` must be built and packaged as a self-contained provider module artifact during release packaging.
- The installed runtime must be able to import the public `src/index.ts` export surface and instantiate `KimiProviderAdapter` without depending on repo-local TypeScript sources.
- Release scripts must not edit provider versions manually; version bumping remains owned by `build-all.sh`.

## Инварианты
- `KIMI_SHARE_DIR` is mandatory on every runtime/probe/capture invocation.
- `~/.kimi/config.toml` may be referenced for already-authorized credentials/config, but CodeAI-managed runtime writes stay in `~/.codeai-hub/providers/kimi/home`.
- `KimiProviderAdapter` is the only public module facade for Core integration.
- Wire/process/router/session classes are module internals.
- Every send must finish with `turn_completed` or `turn_failed`; stuck-working UI is a provider contract violation.
- Kimi usage limits must degrade to explicit unavailable state until a stable official usage endpoint exists.
- Kimi native capture is diagnostic-only and must not mutate workflow state or settings defaults.

## Связанные контракты
- Effective model identity/settings: `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
- Provider failure/recovery: `doc/SolidWorks-WorkFlow/Contracts/ProviderFailure_Recovery_And_ProviderSwitch.md`
- Workspace/lock: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Dialog routing: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- Continuity: `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
- Facade boundary process: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
