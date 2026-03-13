# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`
  - `doc/BugRegistry.md`
  - `doc/Sessions/Session061.md`
  - `doc/Sessions/Session062.md`
  - `doc/Sessions/Session063.md`
- TODO Plan состоит из Phase/Stream; каждая подзадача затрагивает не более 3 файлов или пакетов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`.
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- Husky gates не обходить (`--no-verify` запрещён).
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита.
- Response Mode в `Settings -> General` реализуется только как отдельный модуль со своим фасадом; добавление логики напрямую в существующий `general-settings.tsx` или в монолитный settings-state без выделения модуля запрещено.
- Для диагностики новых моделей raw provider log считается обязательным артефактом; UI/history фильтры не могут быть единственным источником того, что "сказал провайдер".

---

## Phase 290 — Codex response modes: design registration + settings foundation (owner: Oleksandr, updated: 2026-03-13)

### Stream 0: Design registration
1. [DONE] Заархивировать завершённый план до `Phase 289`, зафиксировать архитектурный контракт response modes/raw diagnostics и создать новый execution plan под baseline `gpt-5.4` recovery без подтягивания поздних rollout/refactor-изменений (scope: `doc/TODO/Archive/todo-plan-up-to-phase289-2026-03-13.md`, `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(codex): add response mode architecture plan`).
2. [DONE] Git Commit: `docs(codex): add response mode architecture plan` (hash: `e6ddc991`)

### Stream 1: General settings snapshot contract
3. [DONE] Расширить extension-side `GeneralSettings` и `SettingsSnapshot`: добавить `general.responsePolicy` с default `hybrid` и strict contract fields без поломки существующего `coreControls` snapshot (scope: `src/extension-module/settings/general-settings.ts`, `src/extension-module/settings/types.ts`, `src/extension-module/settings/settings-storage.ts`; expected commit: `feat(settings): add response policy snapshot contract`; actual consolidated commit: `feat(codex): add response mode settings`).
4. [DONE] Git Commit: `feat(codex): add response mode settings` (hash: `45318c70`)
5. [DONE] Синхронизировать core bootstrap/default snapshot для нового `general.responsePolicy`, чтобы `settings.json` рождался с тем же контрактом при cold-start/reset/load-defaults (scope: `packages/core/src/remote-bridge/handlers/settings-request-handler.ts`, `packages/core/src/config/index.ts`; expected commit: `feat(core): seed response policy settings defaults`; actual consolidated commit: `feat(codex): add response mode settings`).
6. [DONE] Git Commit: `feat(codex): add response mode settings` (hash: `45318c70`)

### Stream 2: Extension-module response policy facade
7. [DONE] Создать закрытый settings-модуль `src/extension-module/settings/general-response-mode/` с фасадом как единственной публичной точкой входа для defaults/normalize/validation strict schema contract (scope: `src/extension-module/settings/general-response-mode/general-response-mode-facade.ts`, `src/extension-module/settings/general-response-mode/response-mode-settings.ts`, `src/extension-module/settings/general-response-mode/response-mode-schema.ts`; expected commit: `feat(settings): add general response mode facade`; actual consolidated commit: `feat(codex): add response mode settings`).
8. [DONE] Git Commit: `feat(codex): add response mode settings` (hash: `45318c70`)
9. [DONE] Перевести `general-settings.ts` и storage parsing на использование нового фасада вместо инлайн-нормализации response policy (scope: `src/extension-module/settings/general-settings.ts`, `src/extension-module/settings/settings-storage.ts`; expected commit: `refactor(settings): route response policy through facade`; actual consolidated commit: `feat(codex): add response mode settings`).
10. [DONE] Git Commit: `feat(codex): add response mode settings` (hash: `45318c70`)

### Stream 3: UI General Settings module/facade
11. [DONE] Создать UI-модуль `src/client/ui/src/components/settings/general-response-mode/` и фасад как единственную точку входа новой карточки `Response Mode` в General tab (scope: `src/client/ui/src/components/settings/general-response-mode/general-response-mode-facade.tsx`, `src/client/ui/src/components/settings/general-response-mode/response-mode-card.tsx`, `src/client/ui/src/components/settings/general-response-mode/response-mode-copy.ts`; expected commit: `feat(ui): add general response mode facade`; actual consolidated commit: `feat(codex): add response mode settings`).
12. [DONE] Git Commit: `feat(codex): add response mode settings` (hash: `45318c70`)
13. [DONE] Подключить новый UI facade в `GeneralSettings` и `SettingsView`, сохранив `Restart Core` отдельной карточкой и не смешивая её с response mode controls (scope: `src/client/ui/src/components/settings/general-settings.tsx`, `src/client/ui/src/components/settings-view.tsx`; expected commit: `refactor(ui): compose general tab from response mode facade`; actual consolidated commit: `feat(codex): add response mode settings`).
14. [DONE] Git Commit: `feat(codex): add response mode settings` (hash: `45318c70`)
15. [DONE] Расширить raw/state/helper слой Settings UI под `general.responsePolicy`, mode switching и strict schema editing state (scope: `src/client/ui/src/components/settings/settings-state-raw.ts`, `src/client/ui/src/components/settings/settings-state-model.ts`, `src/client/ui/src/components/settings/settings-state-helpers.ts`; expected commit: `feat(ui): track response policy in settings state`; actual consolidated commit: `feat(codex): add response mode settings`).
16. [DONE] Git Commit: `feat(codex): add response mode settings` (hash: `45318c70`)

---

## Phase 291 — Codex runtime response policy + diagnostics (owner: Oleksandr, updated: 2026-03-13)

### Stream 0: Codex runtime facade
1. [DONE] Создать закрытый runtime-модуль `packages/Codex_Module/src/response-policy/` с фасадом, который превращает persisted settings в turn execution policy (`strict` / `hybrid` / `debug_raw`) (scope: `packages/Codex_Module/src/response-policy/codex-response-policy-facade.ts`, `packages/Codex_Module/src/response-policy/response-policy-types.ts`, `packages/Codex_Module/src/response-policy/response-policy-defaults.ts`; expected commit: `feat(codex): add response policy facade`; actual consolidated commit: `feat(codex): add response mode settings`).
2. [DONE] Git Commit: `feat(codex): add response mode settings` (hash: `45318c70`)
3. [DONE] Пробросить response policy из settings/bootstrap в Codex runtime create/resume path без позднего rollout-кода и без изменения PM/workflow-state слоя (scope: `packages/core/src/config/index.ts`, `packages/Codex_Module/src/sdk/codex-sdk-manager.ts`, `packages/Codex_Module/src/provider/codex-provider-adapter.ts`; expected commit: `feat(codex): wire runtime response policy`; actual consolidated commit: `feat(codex): add response mode settings`).
4. [DONE] Git Commit: `feat(codex): add response mode settings` (hash: `45318c70`)

### Stream 1: Structured output behavior by mode
5. [DONE] Изолировать strict JSON-only behavior за фасадом response policy, чтобы `structured-output-stream-controller` больше не считался универсальным контрактом каждого turn (scope: `packages/Codex_Module/src/messaging/structured-output-stream-controller.ts`, `packages/Codex_Module/src/response-policy/codex-response-policy-facade.ts`, `packages/Codex_Module/src/types/index.ts`; expected commit: `refactor(codex): scope structured output to response policy`; actual consolidated commit: `feat(codex): add response mode settings`).
6. [DONE] Git Commit: `feat(codex): add response mode settings` (hash: `45318c70`)
7. [DONE] Реализовать `hybrid` route: commentary остаётся свободным, а structured contract применяется только к terminal result path (scope: `packages/Codex_Module/src/messaging/message-processor.ts`, `packages/Codex_Module/src/messaging/structured-output-stream-controller.ts`, `packages/Codex_Module/src/response-policy/codex-response-policy-facade.ts`; expected commit: `fix(codex): restore commentary in hybrid mode`; actual consolidated commit: `feat(codex): add response mode settings`).
8. [DONE] Git Commit: `feat(codex): add response mode settings` (hash: `45318c70`)
9. [DONE] Реализовать `debug_raw` route без жёсткой schema injection, но с сохранением совместимости текущего turn lifecycle (scope: `packages/Codex_Module/src/messaging/structured-output-stream-controller.ts`, `packages/Codex_Module/src/sdk/codex-sdk-patches.ts`, `packages/Codex_Module/src/response-policy/codex-response-policy-facade.ts`; expected commit: `feat(codex): add debug raw response mode`; actual consolidated commit: `feat(codex): add response mode settings`).
10. [DONE] Git Commit: `feat(codex): add response mode settings` (hash: `45318c70`)

### Stream 2: Raw provider diagnostics
11. [TODO] Формализовать append-safe raw provider diagnostic writer до UI/history фильтров и сделать его обязательным инвариантом для всех response modes; текущее baseline-изменение закрывает только policy facade и не оформляет отдельный raw diagnostic writer contract (scope: `packages/Codex_Module/src/logging/session-logger.ts`, `packages/Codex_Module/src/messaging/message-processor.ts`, `packages/Codex_Module/src/response-policy/codex-response-policy-facade.ts`; expected commit: `feat(codex): persist raw provider diagnostics`).
12. [TODO] Git Commit: `feat(codex): persist raw provider diagnostics` (hash: TBD)
13. [DONE] Исправить overwrite historical SDK JSONL при `resume` на том же `thread_id` (scope: `packages/Codex_Module/src/logging/session-logger.ts`, `packages/Codex_Module/src/session/session-manager.ts`; expected commit: `fix(codex): preserve sdk logs across resume`; actual consolidated commit: `feat(codex): add response mode settings`).
14. [DONE] Git Commit: `feat(codex): add response mode settings` (hash: `45318c70`)

---

## Phase 292 — UI/history normalization + guards (owner: Oleksandr, updated: 2026-03-13)

### Stream 0: Normalization and persistence
1. [TODO] Прекратить безусловное подавление commentary-path и привести нормализацию turn events к mode-aware схеме без утраты user-facing progress (scope: `packages/Codex_Module/src/messaging/message-processor.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/unified-session/storage.ts`; expected commit: `fix(core): preserve mode-aware commentary normalization`).
2. [TODO] Git Commit: `fix(core): preserve mode-aware commentary normalization` (hash: TBD)
3. [TODO] Добавить fallback progress-layer для случаев, когда модель не присылает commentary, но присылает tool/file activity (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/unified-session/storage.ts`, `src/client/ui/src/components/settings/general-response-mode/response-mode-copy.ts`; expected commit: `feat(core): add progress fallback for response modes`).
4. [TODO] Git Commit: `feat(core): add progress fallback for response modes` (hash: TBD)

### Stream 1: Guards
5. [TODO] Добавить source-level guards на новый settings contract и response policy parsing (scope: `src/extension-module/settings/general-settings.ts`, `src/client/ui/src/components/settings/settings-state-model.ts`, `packages/Codex_Module/src/response-policy/codex-response-policy-facade.ts`; expected commit: `test(settings): guard response policy contract`).
6. [TODO] Git Commit: `test(settings): guard response policy contract` (hash: TBD)
7. [TODO] Добавить regression guards на commentary/raw-log invariant для `strict`, `hybrid` и `debug_raw` (scope: `packages/Codex_Module/src/messaging/message-processor.test.ts`, `packages/Codex_Module/src/logging/session-logger.test.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`; expected commit: `test(codex): guard response modes diagnostics`).
8. [TODO] Git Commit: `test(codex): guard response modes diagnostics` (hash: TBD)

---

## Phase 293 — Docs sync + release validation (owner: Oleksandr, updated: 2026-03-13)

### Stream 0: SSOT sync
1. [DONE] Синхронизировать системные и модульные документы под новый response mode contract и raw diagnostics invariant (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs(codex): sync response mode ssot`).
2. [DONE] Git Commit: `docs(codex): sync response mode ssot` (hash: `56d66e2b`)

### Stream 1: Release prep
3. [DONE] Зафиксировать `Session063` и финальный release handoff для response mode rollout; `README.md` и `CHANGELOG.md` уже синхронизированы в `56d66e2b` под версию `1.1.721` (scope: `doc/Sessions/Session063.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): record response mode rollout`).
4. [DONE] Git Commit: `docs(release): record response mode rollout` (hash: `4f7c3ab9`)
5. [DONE] Выполнить release cycle по чеклисту: `./scripts/build-all.sh` -> clean tree -> `./scripts/build-release.sh --use-current-version` -> проверить `Verifying SDK exclusions`, `Removing dev dependencies...`, `✅ Package created` (scope: release manifests + package versions/manifests; expected commit: `chore(release): build-all vX.Y.Z`).
6. [DONE] Git Commit: `chore(release): build-all v1.1.721` (hash: `19dc0289`)

---

## Phase 294 — Codex response-mode promotion regression (`Debug/Raw` empty dialog) (owner: Oleksandr, updated: 2026-03-13)

### Stream 0: Preserve response policy across session promotion
1. [DONE] Минимально исправить session-promotion path внутри Codex runtime: сохранить response-mode turn config и in-flight structured-output state при переходе `temp session id -> real thread id`, чтобы `Debug/Raw`/`Hybrid` не откатывались в `DEFAULT_TURN_CONFIG` после `thread.started` (scope: `packages/Codex_Module/src/messaging/message-processor.ts`, `packages/Codex_Module/src/messaging/structured-output-stream-controller.ts`; expected commit: `fix(codex): preserve response mode across session promotion`).
2. [DONE] Git Commit: `fix(codex): preserve response mode across session promotion` (hash: `67da3fb6`)
3. [DONE] Добавить узкий regression guard на сценарий `thread.started` promotion до первого `agent_message`: проверить, что при `Debug/Raw` и `Hybrid` commentary и final text после promotion доходят до downstream `assistant` emit без forced JSON parsing (scope: `packages/Codex_Module/src/messaging/structured-output-stream-controller.test.ts`; expected commit: `test(codex): guard response mode session promotion`).
4. [TODO] Git Commit: `test(codex): guard response mode session promotion` (hash: TBD)
