# Effective Model Identity And Settings SSOT - Contract (SSOT)

**Status:** Implemented on `main`
**Updated:** 2026-03-31
**Owner:** Oleksandr + Codex
**Validated on:** `main` (`v1.1.854`)

---

## 1. Назначение

Этот контракт фиксирует single source of truth для следующего turn-а и для effective model identity во всём runtime stack CodeAI Hub.

Ключевая идея:

- `modelId` в transport/runtime/UI contract означает полную effective model identity, а не только base model.
- `reasoning` и `thinking` являются частью identity, а не декоративным metadata.
- единственным source of truth для next-turn identity остаётся persisted settings snapshot в `~/.codeai-hub/settings/settings.json`.

Этот документ применим ко всем provider-цепочкам, где Core вычисляет applied turn config и передаёт его provider runtime на следующий turn.

---

## 2. Scope

Контракт покрывает:

- resolution effective identity из persisted settings snapshot;
- delivery applied turn config от Core к provider modules;
- runtime/UI sync для label/model display;
- provider-specific last-mile adaptation без локального ownership над identity.

Контракт не покрывает:

- provider-native raw reasoning stream shape;
- UI layout;
- session continuity rollout mechanics;
- translation/localization logic;
- provider debugging telemetry beyond applied identity semantics.

---

## 3. Canonical Terms

### 3.1. `baseModelId`

Provider baseline identifier, который может быть использован как часть effective identity, но не является полной identity itself.

### 3.2. `modelId`

Canonical runtime identity. Должен включать всё, что меняет фактическое поведение следующего turn-а:

- base model;
- reasoning level;
- thinking level;
- любой provider-specific payload, который реально меняет next-turn behavior.

### 3.3. `applied turn config`

Provider-neutral payload, вычисленный Core-ом из settings snapshot и отправленный в provider path как authoritative next-turn instruction.

### 3.4. `settings snapshot`

Persisted user-facing settings state, из которого Core вычисляет next-turn identity.  
Provider modules могут читать local settings только как fallback/continuity helper, но не как source of truth.

---

## 4. Runtime Contract

### 4.1. Core owns resolution

Core обязана вычислять effective turn config из `~/.codeai-hub/settings/settings.json` через `provider-turn-config-resolver.ts`.

Core then:

- attaches applied config to outbound provider send path;
- emits `session:model:update` with the effective identity that the provider will actually use next;
- сохраняет публичный `modelId` как effective identity;
- не требует от UI или provider module догадок о следующем turn-е.

### 4.2. Providers are last-mile adapters

Provider modules получают already-resolved applied turn config and may only:

- stage it into provider-native runtime shape;
- apply provider-specific compatibility adjustments;
- preserve effective identity semantics in their own logs/traces.

Provider modules must not:

- become an alternate source of truth for next-turn identity;
- derive authoritative identity from local settings reads when Core already supplied applied config;
- rewrite `modelId` back into base-model-only form.

### 4.3. UI/PM sync

Project Manager и shared UI должны отображать applied config, а не собственную догадку.

Это означает:

- label sync происходит после Core-confirmed applied config events;
- `session:model:update` используется как runtime identity signal;
- display logic не восстанавливает `reasoning/thinking` из локального speculation path.

### 4.4. Provider-specific examples

- **Codex**: `reasoningByModel` may require per-turn thread refresh, but the refresh still consumes Core-applied identity.
- **Gemini**: `thinking` входит в effective identity; `gpt-5.3-codex reasoning:xhigh` и `gpt-5.3-codex reasoning:high` are different runtime identities.

---

## 5. Invariants

1. `settings.json` is the single source of truth for the next turn.
2. `modelId` always means full effective identity.
3. `baseModelId` is auxiliary metadata and must not replace `modelId` in runtime contracts.
4. Reasoning/thinking changes are identity changes, not cosmetic decorations.
5. Core owns effective turn config resolution; providers only consume applied config.
6. UI must display Core-confirmed applied identity, not a locally guessed future state.
7. Provider-native runtime traces remain the proof of what was actually applied.

---

## 6. Code Map

- Core settings resolution:
  - `packages/core/src/config/provider-turn-config-resolver.ts`
  - `packages/core/src/config/provider-defaults-resolver.ts`
- Core outbound bridge:
  - `packages/core/src/remote-bridge/handlers/session-request-handler-applied-turn-config.ts`
  - `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts`
  - `packages/core/src/remote-bridge/types.ts`
- Provider adapters:
  - `packages/Codex_Module/src/messaging/codex-applied-turn-config.ts`
  - `packages/Gemini_Module/src/provider/gemini-applied-turn-config.ts`
  - `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`
- UI sync:
  - `src/client/project-manager/components/sessions/use-runtime-model-sync.ts`
  - `src/client/ui/src/app-host/use-settings-models-sync.ts`

---

## 7. Related Docs

- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Modules/Codex.md`
- `doc/SolidWorks-WorkFlow/Modules/Gemini.md`
- `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
