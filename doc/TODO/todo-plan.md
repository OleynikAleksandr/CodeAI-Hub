# План разработки (Development TODO Plan)

## Context Pack For This Cycle

- **Planning source (child):** `doc/SolidWorks-WorkFlow/Plans/Capture_Workbench_UI_Architecture.md` rev4
- **Planning source (parent):** `doc/SolidWorks-WorkFlow/Plans/Provider_Native_Request_Capture_Workbench_Architecture.md` rev6
- **Visual contract:** `doc/tmp/prototypes/capture-workbench.html` rev2
- **Prototype source of UI truth:** `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/tmp/prototypes/capture-workbench.html`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (Invariants 5/14/33/35)
  - `doc/SolidWorks-WorkFlow/Plans/Capture_Workbench_UI_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Provider_Native_Request_Capture_Workbench_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
  - `doc/tmp/prototypes/capture-workbench.html`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)

- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase. В каждой Phase некоторое количество Stream, в каждом Stream — микрозадачи.
- Каждая микрозадача должна затрагивать не более 3 файлов. Если по факту разработки задача разрастается — её нужно разбить на более мелкие и список задач переписать до реализации.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- **Cluster-modular / minimal-touch invariant:** новую логику добавлять в новые micro-services / handlers / components; существующие рабочие файлы трогать только как additive facade/router/type/prop hooks. Не переносить и не переписывать действующий Settings, provider, session или capture flow, если это прямо не указано в конкретной микрозадаче.
- **Facade boundary invariant:** `api.ts`, remote-bridge routers, validators, provider facade и Settings shared components не должны получать новую бизнес-логику. Если hook перестаёт быть thin delegation, перед реализацией разбить микрозадачу и вынести поведение в новый файл.
- **Prototype invariant:** UI Streams 5-9 обязаны воспроизводить структуру, плотность, цвета/tokens и interaction states из `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/tmp/prototypes/capture-workbench.html`; prototype является visual contract, а не справочной иллюстрацией.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
  - Ручной прогон обычно не нужен, только для диагностики.
- **Таргетные сборки** перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`.
- **Real-time документация:** любое изменение архитектуры/логики требует синхронного обновления `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` и/или canonical SSOT-документов до коммита, чтобы изменения попали в тот же Git Commit.
- **Release Build:** перед релизной сборкой обновить README.md и CHANGELOG.md на будущую версию = текущая версия из `package.json` + 1. Затем выполнить release checklist из AGENTS.md.
- **Постоянное обновление:** после каждого коммита обновлять статус задачи и заносить hash в этот `doc/TODO/todo-plan.md`.
- **Ordering invariant:** Stream 0 → Streams 1/2/3 (pre-UI, любой порядок) → Stream 4 (PM bridge/store, после 3; часть Stream 4, зависящая от capture result, также после 1/2) → Stream 5 (detached entry, после 0) → Streams 6/7/8 (UI surface, после 4+5; Stream 7 также после 1/2) → Stream 9 (launcher, после 5) → Stream 10 (release) → Stream 11 (acceptance) → Stream 12 (closeout).

---

## Phase 1 — Capture Workbench MVP (owner: Oleksandr + Codex, updated: 2026-05-02)

### Stream 0 — Parent Phase 3 Pre-Flight Spike (detached transport + localization)

1. [DONE] Выполнить spike по detached `?mode=detached-capture`: подтвердить websocket transport path для `settings:native-request-capture`, `workbench:state:*`, `workbench:artifact:read`; подтвердить delivery `__CODEAI_LOCALIZATION_BOOTSTRAP__`; append-нуть §3.7 «Detached transport & localization plan» в `doc/SolidWorks-WorkFlow/Plans/Provider_Native_Request_Capture_Workbench_Architecture.md` с выбранным mount path и bootstrap delivery (scope: 1 planning-doc; production code не менять; expected commit: `docs: close parent phase 3 detached transport spike`).
2. [DONE] Git Commit: `docs: close parent phase 3 detached transport spike` (hash: 3ef75b22a)

### Stream 1 — Capture Artifact Schema Foundation

1. [DONE] Расширить schema/type surface для captured artifacts: `packages/core/src/provider-network-capture/native-request-capture-types.ts` + `packages/core/src/provider-registry/provider-module-loader.types.ts` — добавить `AppliedInputEnvelope` variants для Claude/Codex, `CaptureMode = "managed" | "vanilla"`, `capture_start.mode`, `capture_start.releaseVersion`, provider-facing callback для emission envelope (scope: 2 файла; expected commit: `feat: add capture artifact envelope and mode contracts`).
2. [DONE] Git Commit: `feat: add capture artifact envelope and mode contracts` (hash: efacdcc55)
3. [DONE] Расширить writer/facade path: `native-request-capture-writer.ts` + `native-request-capture-facade.ts` — writer эмитит `mode`, `releaseVersion`, принимает provider-emitted `applied_input_envelope`; facade передаёт provider callback в `captureNativeRequest` и задаёт `mode: "managed"` для Phase 1 (scope: 2 файла; expected commit: `feat: emit capture envelope, mode and release version`).
4. [DONE] Git Commit: `feat: emit capture envelope, mode and release version` (hash: 64b15c901)
5. [DONE] Обновить tests для writer/facade: `native-request-capture-writer.test.ts` + `native-request-capture-facade.test.ts` — проверка `capture_start.mode`, `releaseVersion`, provider-emitted envelope record, backward-compatible missing envelope path (scope: 2 файла; expected commit: `test: cover capture envelope and mode records`).
6. [DONE] Git Commit: `test: cover capture envelope and mode records` (hash: 39467951c)
7. [DONE] Расширить Claude diagnostic service и тест: `claude-native-request-capture-service.ts` + `claude-native-request-capture-service.test.ts` — сериализовать SDK `query(...)` options в envelope (`settingSources`, `permissionMode`, `cwd`, `allowDangerouslySkipPermissions`, `hasSystemPrompt`, `toolCount`) перед SDK invoke (scope: 2 файла; expected commit: `feat: claude diagnostic capture emits applied envelope`).
8. [DONE] Git Commit: `feat: claude diagnostic capture emits applied envelope` (hash: d7c1cf219)
9. [DONE] Расширить Codex diagnostic capture envelope: `codex-native-request-capture-service.ts` + новый `codex-native-request-capture-applied-envelope.ts` + новый `codex-native-request-capture-applied-envelope.test.ts` — service делает только thin delegation/callback, helper сериализует `processProfileKey`, `approvalPolicy`, `sandbox`, `persistExtendedHistory`, `providerHomeOverrides`, `modelReasoningSummary` перед `turn/start`; существующий 483-line service test не расширять (scope: 3 файла; expected commit: `feat: codex diagnostic capture emits applied envelope`).
10. [DONE] Git Commit: `feat: codex diagnostic capture emits applied envelope` (hash: 0c3b7d5d3)
11. [DONE] Обновить markdown summarizer и тест: `native-request-capture-markdown.ts` + `native-request-capture-markdown.test.ts` (создать test file, если отсутствует) — секция `Applied Input Envelope` под фиксированным заголовком, без credential leakage (scope: 2 файла; expected commit: `feat: render applied envelope in capture markdown`).
12. [DONE] Git Commit: `feat: render applied envelope in capture markdown` (hash: c7af19476)
13. [DONE] Обновить `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` §33: captured artifact schema включает `applied_input_envelope`, `mode`, `releaseVersion`; Phase 1 всегда `mode: "managed"` (scope: 1 файл; expected commit: `docs: document capture artifact schema extensions`).
14. [DONE] Git Commit: `docs: document capture artifact schema extensions` (hash: 78d722dfc)

### Stream 2 — Reasoning Transport Extension

1. [DONE] Расширить Core incoming transport contract: `packages/core/src/remote-bridge/types.ts` + `packages/core/src/remote-bridge/handlers/incoming-message-validator.ts` — добавить и валидировать `reasoning?: string | null` в `settings:native-request-capture` payload (scope: 2 файла; expected commit: `feat: accept capture reasoning override in core transport`).
2. [DONE] Git Commit: `feat: accept capture reasoning override in core transport` (hash: e3441ed1e)
3. [DONE] Прокинуть override в Core capture path: `remote-bridge-message-router.ts`, `native-request-capture-facade.ts`, новый `native-request-capture-reasoning-override.ts` — router читает `payload.reasoning`; facade применяет one-shot override через capture-only helper после resolved appliedTurnConfig; persisted Settings и generic session applied-config resolver не менять, если helper покрывает контракт (scope: 3 файла; expected commit: `feat: apply one-shot reasoning override for capture`).
4. [DONE] Git Commit: `feat: apply one-shot reasoning override for capture` (hash: 483df17da)
5. [DONE] Обновить Core tests: `remote-bridge-message-router.test.ts` + новый `native-request-capture-reasoning-override.test.ts` — router source-contract pass-through для `payload.reasoning`; новый focused test покрывает facade integration/applied config override и отсутствие persisted Settings writes; перегруженный `native-request-capture-facade.test.ts` не расширять (scope: 2 файла; expected commit: `test: cover capture reasoning override in core path`).
6. [DONE] Git Commit: `test: cover capture reasoning override in core path` (hash: 09583e2f3)
7. [DONE] Расширить PM outgoing transport: `src/client/project-manager/core-stream-message-types.ts` + `src/client/project-manager/components/settings/native-request-capture-runner.ts` — options принимают `reasoning?: string | null`; `api.captureNativeRequest(...)` уже pass-through'ит `options` через spread, поэтому 498-line `api.ts` не трогать; существующий Settings runner может не задавать override, Workbench runner задаёт явно (scope: 2 файла; expected commit: `feat: pass capture reasoning override from project manager`).
8. [DONE] Git Commit: `feat: pass capture reasoning override from project manager` (hash: 5abcaf6bc)
9. [DONE] Обновить PM tests для reasoning transport: `native-request-capture-runner.test.ts` + `core-stream-message-validator.test.ts` при необходимости — runner сохраняет старый no-override path и новый override path (scope: ≤2 файла; expected commit: `test: cover project manager capture reasoning override`).
10. [DONE] Git Commit: `test: cover project manager capture reasoning override` (hash: b1da80a24)
11. [DONE] Обновить `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`: capture-scoped reasoning override как explicit diagnostic exception от persisted Settings/session-binding ownership (scope: 1 файл; expected commit: `docs: document capture-scoped reasoning override exception`).
12. [DONE] Git Commit: `docs: document capture-scoped reasoning override exception` (hash: 7ebe9c995)

### Stream 3 — Core Workbench State + Artifact Read Transport

1. [DONE] Создать `packages/core/src/remote-bridge/handlers/workbench-state-types.ts` + `workbench-state-types.test.ts`: `WorkbenchStateKind`, `WorkbenchIndexFile`, `WorkbenchSelectionFile`, `SlotEntryRecord`, `WorkbenchArtifactReadPayload`, validator helpers для persisted workbench state; smoke test нужен, чтобы новый helper не был unused до router wiring (scope: 2 файла; expected commit: `feat: add workbench state and artifact read types`).
2. [DONE] Git Commit: `feat: add workbench state and artifact read types` (hash: 50937a0c5)
3. [DONE] Создать Core persistence/rebuild internals: `workbench-state-persistence-handler.ts` + `workbench-index-rebuilder.ts` + `workbench-state-persistence-handler.test.ts` — load/save `~/.codeai-hub/settings/workbench-index.json` и `capture-workbench.json`; при missing/corrupted index handler rebuild'ит index из `capture_start` JSONL records under `~/.codeai-hub/logs/native-request-capture/`; test нужен, чтобы новые internals не были unused до router wiring (scope: 3 файла; expected commit: `feat: add core workbench state persistence and rebuild`).
4. [DONE] Git Commit: `feat: add core workbench state persistence and rebuild` (hash: 4fe4b1ef8)
5. [DONE] Создать `packages/core/src/remote-bridge/handlers/workbench-artifact-reader.ts` + `workbench-artifact-reader.test.ts`: read-only loader для captured JSONL artifacts by absolute path, path must resolve under `~/.codeai-hub/logs/native-request-capture/`, returns parsed records or typed error; browser/PM layer не читает filesystem напрямую; test нужен до router wiring, чтобы helper не был unused (scope: 2 файла; expected commit: `feat: add core workbench artifact reader`).
6. [DONE] Git Commit: `feat: add core workbench artifact reader` (hash: cd7546380)
7. [DONE] Создать dedicated Core workbench bridge router: `packages/core/src/remote-bridge/remote-bridge-workbench-command-router.ts` + расширить `packages/core/src/remote-bridge/types.ts` событиями/commands `workbench:state:load/save`, `workbench:state:loaded/saved/save-error`, `workbench:artifact:read`, `workbench:artifact:loaded/error`; подключить thin delegate в `packages/core/src/remote-bridge/remote-bridge-message-router.ts`; filesystem logic только в handlers из пунктов 3/5 (scope: 3 файла; expected commit: `feat: add workbench remote command router`).
8. [DONE] Git Commit: `feat: add workbench remote command router` (hash: f08f8b69e)
9. [DONE] Wire validator: `packages/core/src/remote-bridge/handlers/incoming-message-validator.ts` — accept new workbench intents after main router delegate wiring; validation stays structural and reuses Core workbench type guards where possible (scope: 1 файл; expected commit: `feat: validate workbench state and artifact bridge commands`).
10. [IN_PROGRESS] Git Commit: `feat: validate workbench state and artifact bridge commands` (hash: TBD)
11. [TODO] Тесты Core workbench transport: `workbench-state-persistence-handler.test.ts`, `workbench-index-rebuilder.test.ts`, `workbench-artifact-reader.test.ts` — load null, save/write, corrupted index rebuild, artifact path guard, parsed JSONL records (scope: 3 файла; expected commit: `test: cover workbench state persistence and artifact read`).
12. [TODO] Git Commit: `test: cover workbench state persistence and artifact read` (hash: TBD)

### Stream 4 — PM Bridge Client + Index Store

1. [TODO] Расширить PM bridge typing/API: `src/client/project-manager/core-stream-message-types.ts`, `src/client/project-manager/services/core-stream-message-validator.ts`, `src/client/project-manager/api.ts` — outgoing/incoming types, validators, cached event accessors and thin send methods for `workbench:state:*` and `workbench:artifact:*`; PM API не содержит state/index/diff logic (scope: 3 файла; expected commit: `feat: expose workbench state and artifact bridge in project manager`).
2. [TODO] Git Commit: `feat: expose workbench state and artifact bridge in project manager` (hash: TBD)
3. [TODO] Создать `src/client/project-manager/services/workbench-state-client.ts`: promise/subscribe wrapper over `api` methods for `loadIndex`, `saveIndex`, `loadSelection`, `saveSelection`, `readArtifactRecords`; no filesystem access in browser (scope: 1 файл; expected commit: `feat: add project manager workbench state client`).
4. [TODO] Git Commit: `feat: add project manager workbench state client` (hash: TBD)
5. [TODO] Создать `src/client/project-manager/services/workbench-index-store.ts`: slot resolution by `(step, provider, model, reasoning)`, `current → previous` rotation, materialize `SlotEntryRecord` from capture result + loaded `capture_start`; when index is missing/corrupted, call Core load/rebuild path instead of scanning filesystem locally (scope: 1 файл; expected commit: `feat: add workbench index store with slot rotation`).
6. [TODO] Git Commit: `feat: add workbench index store with slot rotation` (hash: TBD)
7. [TODO] Тесты PM bridge/index store: `workbench-state-client.test.ts` + `workbench-index-store.test.ts` — state load/save events, artifact read event, slot rotation, rebuild-loaded index path (scope: 2 файла; expected commit: `test: cover workbench state client and index store`).
8. [TODO] Git Commit: `test: cover workbench state client and index store` (hash: TBD)

### Stream 5 — Detached Workbench Entry

1. [TODO] Расширить detached route и shell: `src/client/project-manager/app.tsx` + `src/client/project-manager/components/capture-workbench/detached-capture-workbench.tsx` — распознать `?mode=detached-capture`, query params `workspaceSlug`/`workspacePath`, shell layout (header/body/footer placeholders) по prototype rev2 grid/header/footer contract (scope: 2 файла; expected commit: `feat: route detached capture workbench shell`).
2. [TODO] Git Commit: `feat: route detached capture workbench shell` (hash: TBD)
3. [TODO] Реализовать api/localization mount path по результату Stream 0: обновить detached entry files так, чтобы окно получало same Core websocket bridge, `LocalizationProvider`, settings/bootstrap runtime; точные файлы зависят от §3.7 parent plan, лимит ≤3 файлов обязателен (scope: ≤3 файла; expected commit: `feat: mount transport and localization in detached capture window`).
4. [TODO] Git Commit: `feat: mount transport and localization in detached capture window` (hash: TBD)
5. [TODO] Тесты detached entry: route resolution, shell render, missing query params fallback, localization/bootstrap path smoke (scope: ≤2 файла; expected commit: `test: cover detached capture workbench entry`).
6. [TODO] Git Commit: `test: cover detached capture workbench entry` (hash: TBD)

### Stream 6 — Selection Bar UI

1. [TODO] Создать `src/client/project-manager/components/capture-workbench/selection-bar.tsx`: orchestration shell для Step/Provider/Model/Reasoning по prototype toolbar layout; sticky load/save через `workbench-state-client`, emits selection including explicit `reasoning` override (scope: 1 файл; expected commit: `feat: add capture workbench selection bar shell`).
2. [TODO] Git Commit: `feat: add capture workbench selection bar shell` (hash: TBD)
3. [TODO] Создать `src/client/project-manager/components/capture-workbench/step-selector.tsx`: dropdown с группировкой `Trunk Workflow` / `Translation` / `Development Tree (disabled future)` (scope: 1 файл; expected commit: `feat: add capture workbench step selector`).
4. [TODO] Git Commit: `feat: add capture workbench step selector` (hash: TBD)
5. [TODO] Создать `src/client/project-manager/components/capture-workbench/provider-selector.tsx`: dropdown с tinted Claude/Codex items, Gemini disabled placeholder с tooltip `Gemini support arrives with parent Phase 2` (scope: 1 файл; expected commit: `feat: add capture workbench provider selector`).
6. [TODO] Git Commit: `feat: add capture workbench provider selector` (hash: TBD)
7. [TODO] Создать `src/client/project-manager/components/capture-workbench/model-reasoning-selectors.tsx`: provider-specific model/reasoning option rendering; no Gemini selectable path in Phase 1 (scope: 1 файл; expected commit: `feat: add capture workbench model and reasoning selectors`).
8. [TODO] Git Commit: `feat: add capture workbench model and reasoning selectors` (hash: TBD)
9. [TODO] Тесты selection UI: `selection-bar.test.tsx` — sticky load/save, four selectors render, Gemini disabled, selected reasoning reaches callback (scope: 1 файл; expected commit: `test: cover capture workbench selection bar behavior`).
10. [TODO] Git Commit: `test: cover capture workbench selection bar behavior` (hash: TBD)

### Stream 7 — Capture Run Orchestration + Snapshot Cards

1. [TODO] Создать `src/client/project-manager/services/capture-workbench-runner.ts`: reusable Workbench runner over existing `buildNativeRequestCaptureScenarioPrompt` + `api.captureNativeRequest`, sends explicit `reasoning`, waits for `settings:native-request-capture:result`, returns artifact paths and metadata to index store; old Settings runner is not duplicated at provider/Core level (scope: 1 файл; expected commit: `feat: add capture workbench managed runner`).
2. [TODO] Git Commit: `feat: add capture workbench managed runner` (hash: TBD)
3. [TODO] Создать `src/client/project-manager/components/capture-workbench/snapshot-card.tsx`: managed/vanilla card layout по prototype snapshot area, file-link buttons use `openProjectManagerFileLink`, Vanilla disabled with tooltip (scope: 1 файл; expected commit: `feat: add capture workbench snapshot card`).
4. [TODO] Git Commit: `feat: add capture workbench snapshot card` (hash: TBD)
5. [TODO] Создать `src/client/project-manager/components/capture-workbench/snapshot-cards-row.tsx`: pair of cards, `Re-capture Managed` wired to Workbench runner, slot rotation via `workbench-index-store` after successful capture (scope: 1 файл; expected commit: `feat: wire managed recapture and slot rotation`).
6. [TODO] Git Commit: `feat: wire managed recapture and slot rotation` (hash: TBD)
7. [TODO] Тесты runner/snapshot cards: `capture-workbench-runner.test.ts` + `snapshot-cards-row.test.tsx` — empty state, successful capture rotates slot, failure leaves previous slot intact, file links call `openProjectManagerFileLink` (scope: 2 файла; expected commit: `test: cover capture workbench runner and snapshot cards`).
8. [TODO] Git Commit: `test: cover capture workbench runner and snapshot cards` (hash: TBD)

### Stream 8 — Diff Data + Renderer

1. [TODO] Создать shared diff model/helpers: `src/client/project-manager/components/capture-workbench/diff-section-model.ts` + `diff-section-normalizer.ts` — section ids/status normalization, byte-for-byte normalized compare, no filesystem reads (scope: 2 файла; expected commit: `feat: add capture workbench diff section model`).
2. [TODO] Git Commit: `feat: add capture workbench diff section model` (hash: TBD)
3. [TODO] Создать provider extractors over loaded records, not file paths: `diff-section-extractor-claude.ts` + `diff-section-extractor-codex.ts` — parse artifact records returned by `workbench:artifact:read` into sections from rev4 taxonomy (scope: 2 файла; expected commit: `feat: add claude and codex diff section extractors`).
4. [TODO] Git Commit: `feat: add claude and codex diff section extractors` (hash: TBD)
5. [TODO] Создать `src/client/project-manager/components/capture-workbench/diff-section.tsx`: one row, collapsed/expanded, side-by-side body, status dot (scope: 1 файл; expected commit: `feat: add capture workbench diff section row`).
6. [TODO] Git Commit: `feat: add capture workbench diff section row` (hash: TBD)
7. [TODO] Создать `src/client/project-manager/components/capture-workbench/diff-renderer.tsx`: mode tabs, `Managed: current vs previous` active, Vanilla modes empty-state, loads JSONL records through `workbench-state-client.readArtifactRecords`, summary, equal-collapsed default; visual hierarchy and spacing follow prototype diff table (scope: 1 файл; expected commit: `feat: add capture workbench diff renderer`).
8. [TODO] Git Commit: `feat: add capture workbench diff renderer` (hash: TBD)
9. [TODO] Тесты diff extractors: `diff-section-extractor-claude.test.ts` + `diff-section-extractor-codex.test.ts` — sample loaded records → expected sections, no Provider-home/Auth in Phase 1 (scope: 2 файла; expected commit: `test: cover provider diff section extractors`).
10. [TODO] Git Commit: `test: cover provider diff section extractors` (hash: TBD)
11. [TODO] Тесты diff renderer: `diff-renderer.test.tsx` — mode tabs, artifact-read client called with absolute JSONL paths, equal-collapsed default, expand/collapse actions (scope: 1 файл; expected commit: `test: cover capture workbench diff renderer modes`).
12. [TODO] Git Commit: `test: cover capture workbench diff renderer modes` (hash: TBD)

### Stream 9 — Settings → General Card Shrink + Launcher

1. [TODO] Обновить shared Settings UI prop contract: `native-request-capture-card.tsx`, `general-settings.tsx`, `settings-view.tsx` — card renders launcher button + one-line description, accepts `onOpenWorkbench`, old selectors/capture buttons/status/artifact list removed from visible Settings surface (scope: 3 файла; expected commit: `feat: shrink native capture settings card to launcher`).
2. [TODO] Git Commit: `feat: shrink native capture settings card to launcher` (hash: TBD)
3. [TODO] Добавить PM launcher owner: `src/client/project-manager/services/capture-workbench-launcher.ts` + `src/client/project-manager/components/settings/use-project-manager-settings-state.ts` — handler builds `?mode=detached-capture&workspaceSlug=...&workspacePath=...` and calls `window.open(..., "popup,width=1280,height=900")`; shared UI does not import PM services directly (scope: 2 файла; expected commit: `feat: wire capture workbench launcher from project manager settings`).
4. [TODO] Git Commit: `feat: wire capture workbench launcher from project manager settings` (hash: TBD)
5. [TODO] Обновить launcher tests: `native-request-capture-card.test.tsx` + `capture-workbench-launcher.test.ts` — launcher button visible, old controls absent, URL/query/features correct (scope: 2 файла; expected commit: `test: cover capture workbench launcher migration`).
6. [TODO] Git Commit: `test: cover capture workbench launcher migration` (hash: TBD)
7. [TODO] Обновить SSOT: `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md` + `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md` — Settings General owns launcher only; detached Capture Workbench is PM diagnostic surface with Core-owned state/artifact read transport (scope: 2 файла; expected commit: `docs: document capture workbench launcher and detached surface`).
8. [TODO] Git Commit: `docs: document capture workbench launcher and detached surface` (hash: TBD)

### Stream 10 — Release Build

1. [TODO] Перед сборкой определить будущую версию из текущего `package.json` + 1; обновить README.md (`Current Release — vX.Y.Z`) и CHANGELOG.md (`## [X.Y.Z]`) на эту будущую версию (scope: 2 файла; expected commit: `docs: prepare capture workbench mvp release`).
2. [TODO] Git Commit: `docs: prepare capture workbench mvp release` (hash: TBD)
3. [TODO] Проверить clean tree, затем запустить `./scripts/build-all.sh`; после успеха убедиться, что tarball'ы лежат в `doc/tmp/releases/`, версии/манифесты обновлены штатным скриптом (scope: command + generated release artifacts; expected commit: `chore: bump release manifests for capture workbench mvp`).
4. [TODO] Git Commit: `chore: bump release manifests for capture workbench mvp` (hash: TBD)
5. [TODO] Запустить `./scripts/build-release.sh --use-current-version`; проверить вывод `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`; обновить `doc/Sessions/SessionXXX.md` как ACTIVE, если acceptance ещё ожидается (scope: release command + session report; expected commit: `docs: record capture workbench mvp release build`).
6. [TODO] Git Commit: `docs: record capture workbench mvp release build` (hash: TBD)

### Stream 11 — User Visual Acceptance Testing

1. [TODO] Установить собранный `codeai-hub-<version>.vsix` в VS Code, открыть workspace.
2. [TODO] Acceptance matrix: открытие detached окна через Settings → General launcher; выбор `(Description, Claude, Sonnet, thinking high)`; sticky-восстановление выбора после reopen; `Re-capture Managed` пишет timestamped artifact pair; slot rotation `current → previous`; UI-кнопки `managed.md` / `managed.jsonl` открывают реальные `markdownPath` / `jsonlPath` из `SlotEntryRecord` в VS Code; diff `Managed: current vs previous` рендерит секции с правильными статусами; пересборка релиза → `Re-capture Managed` показывает обновлённый `releaseVersion` в diff header; Gemini Provider option видим, но disabled с tooltip; пустой workspace без upstream artifacts — capture не падает.
3. [TODO] Зафиксировать результат пользовательского визуального тестирования в `doc/TODO/todo-plan.md` и `doc/Sessions/SessionXXX.md`. Если пользователь не дал explicit acceptance, scope остаётся ACTIVE и Stream 12 не выполняется (scope: 2 docs; expected commit: `docs: record capture workbench visual acceptance`).
4. [TODO] Git Commit: `docs: record capture workbench visual acceptance` (hash: TBD)

### Stream 12 — Scope Closeout

1. [TODO] После explicit user acceptance перенести завершённый active plan в `doc/TODO/Archive/todo-plan-capture-workbench-mvp-<version>.md`; обновить `doc/SolidWorks-WorkFlow/Docs_Index.md`; зафиксировать, какие planning-docs остаются active/deferred/archive: `Capture_Workbench_UI_Architecture.md` и `Provider_Native_Request_Capture_Workbench_Architecture.md` (scope: ≤3 docs; expected commit: `docs: archive capture workbench mvp plan and refresh docs index`).
2. [TODO] Git Commit: `docs: archive capture workbench mvp plan and refresh docs index` (hash: TBD)
3. [TODO] Создать новый reset-state `doc/TODO/todo-plan.md` для отсутствующего active scope (scope: 1 файл; expected commit: `chore: reset todo-plan after capture workbench mvp closeout`).
4. [TODO] Git Commit: `chore: reset todo-plan after capture workbench mvp closeout` (hash: TBD)
5. [TODO] Создать/обновить `doc/Sessions/SessionXXX.md` как Completion Report: `Execution Scope Status: COMPLETED`, реальные commit hashes, explicit user acceptance после визуального тестирования. Session report может остаться единственным незакоммиченным файлом по closeout rules.

---

## Notes

- **Phase 1 first-stream invariant:** Stream 1, Stream 2 и Stream 3 не зависят друг от друга и могут идти параллельно или в любом порядке. Stream 4 требует Stream 3; capture-result/index части Stream 4 также требуют Stream 1/2. Stream 5 требует Stream 0. Streams 6/7/8 требуют Stream 4 + Stream 5; Stream 7 также требует Stream 1/2. Stream 9 требует Stream 5. Stream 10/11/12 идут последовательно после всех остальных.
- **Filesystem boundary:** PM/CEF/browser code не читает и не пишет `~/.codeai-hub` напрямую. Index/selection persistence, lazy rebuild из JSONL и чтение captured artifact records принадлежат Core remote bridge handlers.
- **Minimal-change boundary:** существующий Settings capture runner, provider diagnostic services, native capture writer/facade, PM api и Core routers остаются действующими contracts. В этом plan они получают только новые optional fields/callbacks/delegations; основная Workbench логика живёт в новых `capture-workbench-*`, `workbench-*` и diff files.
- **Prototype boundary:** `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/tmp/prototypes/capture-workbench.html` является обязательным визуальным источником для shell, selection bar, snapshot cards и diff renderer; отклонения допустимы только если они явно зафиксированы в `todo-plan.md` перед реализацией.
- **Out of scope:** Vanilla, Gemini enablement, Development Tree activation, search в Step dropdown, code reference navigation, editable envelope, artifact pruning.
- **Микрозадачи могут быть пересмотрены:** если по факту разработки задача затрагивает >3 файлов, она разбивается на более мелкие, и список задач переписывается до реализации.
