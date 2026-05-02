# План разработки (Development TODO Plan)

## Context Pack For This Cycle

- **Planning source (child):** `doc/SolidWorks-WorkFlow/Plans/Capture_Workbench_UI_Architecture.md` rev4
- **Planning source (parent):** `doc/SolidWorks-WorkFlow/Plans/Provider_Native_Request_Capture_Workbench_Architecture.md` rev5
- **Visual contract:** `doc/tmp/prototypes/capture-workbench.html` rev2
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
- **TODO Plan** состоит из Phase. В каждой Phase некоторое количество Stream, в каждом Stream — некоторое количество подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов. Если по факту разработки задача разрастается — её нужно разбить на более мелкие и список задач переписать.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
  - Ручной прогон обычно не нужен (только для диагностики).
- **Таргетные сборки** перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`.
- **Real-time документация:** любое изменение архитектуры/логики требует синхронного обновления `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` и/или canonical SSOT-документов до коммита, чтобы изменения попали в тот же Git Commit.
- **Phase завершение:** запустить `./scripts/build-all.sh` (он повышает версии и вызывает `./scripts/build-release.sh --use-current-version`), перенести tarball'ы в `doc/tmp/releases/`, зафиксировать результаты в `doc/Sessions/`. Перед сборкой релиза обновить README.md и CHANGELOG.md на будущую версию.
- **Постоянное обновление:** после каждого коммита обновлять статус задачи и заносить hash в `doc/TODO/todo-plan.md`.
- **Ordering invariant:** Stream 0 → Streams 1/2/3 (pre-UI, любой порядок) → Stream 4 (PM plumbing, после 1+3) → Stream 5 (detached entry, после 0) → Streams 6/7/8 (UI surface, после 4+5) → Stream 9 (launcher) → Stream 10 (release) → Stream 11 (acceptance) → Stream 12 (closeout).

---

## Phase 1 — Capture Workbench MVP (owner: Oleksandr + Codex, updated: 2026-05-02)

### Stream 0 — Parent Phase 3 Pre-Flight Spike (detached transport + localization)

1. [TODO] Spike: подтвердить websocket transport path для detached `?mode=detached-capture` окна — где именно монтируется `useProjectManagerApi()` / settings hook, чтобы кнопки могли отправить `settings:native-request-capture` и `workbench:state:save`. Проверить через grep+read; результат — заметки. Scope: research only, no production code.
2. [TODO] Spike: подтвердить delivery `__CODEAI_LOCALIZATION_BOOTSTRAP__` для popup-окна — query param vs separate fetch vs postMessage от parent. Scope: research only.
3. [TODO] Записать §3.7 «Detached transport & localization plan» в `doc/SolidWorks-WorkFlow/Plans/Provider_Native_Request_Capture_Workbench_Architecture.md` — короткий append с выбранным mount path и bootstrap delivery (scope: 1 файл).
4. [TODO] Git Commit: `docs: close parent phase 3 detached transport spike` (hash: TBD)

### Stream 1 — Writer + Provider Services Foundation (envelope, releaseVersion, mode)

1. [TODO] Расширить `packages/core/src/provider-network-capture/native-request-capture-types.ts`: добавить `AppliedInputEnvelope` (Claude и Codex варианты, `kind: "applied_input_envelope"`), `CaptureMode = "managed" | "vanilla"`, обновить `capture_start` record type с полями `mode`, `releaseVersion` (scope: 1 файл).
2. [TODO] Git Commit: `feat: add applied-input-envelope and capture mode types to native-request-capture` (hash: TBD)
3. [TODO] Расширить writer (`native-request-capture-writer.ts`): принять `appliedInputEnvelope` параметр, эмитить `applied_input_envelope` record после `capture_start`, добавить `mode` и `releaseVersion` в `capture_start` payload, читать version из `package.json` через injected resolver (scope: 1 файл).
4. [TODO] Git Commit: `feat: writer emits applied_input_envelope, mode, releaseVersion` (hash: TBD)
5. [TODO] Обновить `native-request-capture-writer.test.ts`: тесты на envelope emission, `mode` и `releaseVersion` в `capture_start`, обратная совместимость для отсутствующего envelope (scope: 1 файл).
6. [TODO] Git Commit: `test: cover writer envelope, mode, releaseVersion contract` (hash: TBD)
7. [TODO] Расширить Claude diagnostic service (`packages/Claude_Module/src/diagnostics/claude-native-request-capture-service.ts`): сериализовать SDK `query(...)` options в `AppliedInputEnvelope` (`settingSources`, `permissionMode`, `cwd`, `allowDangerouslySkipPermissions`, `hasSystemPrompt`, `toolCount`) и передать writer'у (scope: 1 файл).
8. [TODO] Git Commit: `feat: claude diagnostic service emits applied input envelope` (hash: TBD)
9. [TODO] Обновить `claude-native-request-capture-service.test.ts`: assertion на envelope shape, проверка что `hasSystemPrompt` и `toolCount` корректны (scope: 1 файл).
10. [TODO] Git Commit: `test: cover claude applied input envelope shape` (hash: TBD)
11. [TODO] Расширить Codex diagnostic service (`packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.ts`): сериализовать `processProfileKey`, `approvalPolicy`, `sandbox`, `persistExtendedHistory`, `providerHomeOverrides`, `modelReasoningSummary` в envelope (scope: 1 файл).
12. [TODO] Git Commit: `feat: codex diagnostic service emits applied input envelope` (hash: TBD)
13. [TODO] Обновить `codex-native-request-capture-service.test.ts`: assertion на envelope shape (scope: 1 файл).
14. [TODO] Git Commit: `test: cover codex applied input envelope shape` (hash: TBD)
15. [TODO] Обновить `native-request-capture-markdown.ts`: добавить секцию `Applied Input Envelope` под фиксированным заголовком, печать ключевых полей envelope в `.md` артефакте (scope: 1 файл).
16. [TODO] Git Commit: `feat: markdown summarizer prints applied input envelope section` (hash: TBD)
17. [TODO] Обновить `native-request-capture-markdown.test.ts` (или создать, если отсутствует) — тесты на новую секцию (scope: 1 файл).
18. [TODO] Git Commit: `test: cover markdown applied input envelope section` (hash: TBD)
19. [TODO] Обновить SystemArchitecture.md §33 (Settings ownership invariant): добавить упоминание `applied_input_envelope`, `mode`, `releaseVersion` как части captured artifact schema. Scope: 1 файл.
20. [TODO] Git Commit: `docs: extend system architecture for capture artifact schema` (hash: TBD)

### Stream 2 — Reasoning Transport Extension

1. [TODO] Расширить `packages/core/src/remote-bridge/types.ts`: добавить `reasoning?: string | null` в `settings:native-request-capture` payload (scope: 1 файл).
2. [TODO] Git Commit: `feat: native-request-capture transport accepts reasoning override` (hash: TBD)
3. [TODO] Расширить `packages/core/src/remote-bridge/handlers/incoming-message-validator.ts`: validator для нового поля `reasoning` (scope: 1 файл).
4. [TODO] Git Commit: `feat: validate reasoning field in native-request-capture payload` (hash: TBD)
5. [TODO] Расширить facade и applied-config resolver (`packages/core/src/provider-network-capture/native-request-capture-facade.ts` + `packages/core/src/remote-bridge/handlers/session-request-handler-applied-turn-config.ts` если нужно ещё там): принять reasoning override и применить к `appliedTurnConfig` для capture-only пути, без записи в persisted Settings (scope: ≤2 файлов).
6. [TODO] Git Commit: `feat: capture facade applies one-shot reasoning override` (hash: TBD)
7. [TODO] Обновить `native-request-capture-facade.test.ts`: override применяется к envelope/wire payload, persisted Settings не меняются (scope: 1 файл).
8. [TODO] Git Commit: `test: cover one-shot reasoning override in capture facade` (hash: TBD)
9. [TODO] Обновить `EffectiveModelIdentity_And_Settings_SSOT.md`: добавить упоминание capture-scoped reasoning override как allowed exception от persisted-binding contract (scope: 1 файл).
10. [TODO] Git Commit: `docs: document capture-scoped reasoning override exception` (hash: TBD)

### Stream 3 — Core Persistence Transport (`workbench:state:*`)

1. [TODO] Добавить типы `WorkbenchStateKind = "index" | "selection"`, `WorkbenchIndexFile`, `WorkbenchSelectionFile`, `SlotEntryRecord` в новый файл `packages/core/src/remote-bridge/handlers/workbench-state-types.ts` (scope: 1 файл).
2. [TODO] Git Commit: `feat: add workbench-state types and slot-entry record schema` (hash: TBD)
3. [TODO] Расширить `packages/core/src/remote-bridge/types.ts`: добавить incoming intents `workbench:state:load` / `workbench:state:save` и outgoing events `workbench:state:loaded` / `workbench:state:saved` / `workbench:state:save-error` (scope: 1 файл).
4. [TODO] Git Commit: `feat: add workbench-state remote-bridge intent types` (hash: TBD)
5. [TODO] Расширить `incoming-message-validator.ts`: validators для `workbench:state:load` и `workbench:state:save` (scope: 1 файл).
6. [TODO] Git Commit: `feat: validate workbench-state load and save payloads` (hash: TBD)
7. [TODO] Создать новый handler `packages/core/src/remote-bridge/handlers/workbench-state-persistence-handler.ts`: `mkdir` + `writeFile` через `node:fs/promises`, два файла под `~/.codeai-hub/settings/`, дискриминатор по `kind` (scope: 1 файл).
8. [TODO] Git Commit: `feat: add workbench-state persistence handler` (hash: TBD)
9. [TODO] Зарегистрировать handler в `packages/core/src/remote-bridge/remote-bridge-message-router.ts` (scope: 1 файл).
10. [TODO] Git Commit: `feat: register workbench-state handler in remote bridge router` (hash: TBD)
11. [TODO] Тесты для handler: load несуществующего файла → null, load валидного файла, save → file written, save corrupted JSON → error event (scope: 1 файл, новый `workbench-state-persistence-handler.test.ts`).
12. [TODO] Git Commit: `test: cover workbench-state persistence load/save/error paths` (hash: TBD)

### Stream 4 — PM-side Index Store + Sticky Selection Plumbing

1. [TODO] Создать `src/client/project-manager/services/workbench-state-client.ts`: thin client поверх websocket bridge, методы `loadIndex()`, `saveIndex(file)`, `loadSelection()`, `saveSelection(value)` (scope: 1 файл).
2. [TODO] Git Commit: `feat: add workbench state client service` (hash: TBD)
3. [TODO] Создать `src/client/project-manager/services/workbench-index-store.ts`: slot resolution by `(step, provider, model, reasoning)`, current→previous rotation, materialize `SlotEntryRecord` from capture result (scope: 1 файл).
4. [TODO] Git Commit: `feat: add workbench index store with slot rotation` (hash: TBD)
5. [TODO] Создать `src/client/project-manager/services/workbench-index-rebuild.ts`: lazy rebuild через scan `~/.codeai-hub/logs/native-request-capture/`, parse `capture_start` JSONL records (scope: 1 файл).
6. [TODO] Git Commit: `feat: add workbench index rebuild from capture_start records` (hash: TBD)
7. [TODO] Тесты для index store: rotation, no-op rebuild при наличии index, rebuild при missing/corrupted index (scope: 1 файл).
8. [TODO] Git Commit: `test: cover workbench index store and rebuild` (hash: TBD)

### Stream 5 — Detached Workbench Entry

1. [TODO] Расширить `src/client/project-manager/app.tsx`: распознать `?mode=detached-capture`, прочитать `workspaceSlug` и `workspacePath` из query params, отрендерить `<DetachedCaptureWorkbench />` вместо `MainLayout` (scope: 1 файл).
2. [TODO] Git Commit: `feat: route detached-capture mode in project manager app` (hash: TBD)
3. [TODO] Создать `src/client/project-manager/components/capture-workbench/detached-capture-workbench.tsx`: shell layout (header, body slot, footer), пустые place-holders для selection/snapshots/diff (scope: 1 файл).
4. [TODO] Git Commit: `feat: add detached capture workbench shell` (hash: TBD)
5. [TODO] Реализовать api/transport mount path для detached окна (per Stream 0 spike результат): `LocalizationProvider` + `useProjectManagerApi()` mount внутри detached entry (scope: ≤2 файла, точные пути зависят от spike).
6. [TODO] Git Commit: `feat: mount api transport and localization in detached capture window` (hash: TBD)
7. [TODO] Реализовать localization bootstrap delivery для popup-окна per spike (scope: ≤2 файла, точные пути зависят от spike).
8. [TODO] Git Commit: `feat: deliver localization bootstrap to detached capture popup` (hash: TBD)
9. [TODO] Тесты: route resolution, shell renders для detached mode, missing query params → fallback (scope: 1 файл).
10. [TODO] Git Commit: `test: cover detached capture workbench routing and shell` (hash: TBD)

### Stream 6 — Selection Bar UI

1. [TODO] Создать `src/client/project-manager/components/capture-workbench/selection-bar.tsx`: layout строки селекторов, sticky-load на mount, sticky-save на change через `workbench-state-client` (scope: 1 файл).
2. [TODO] Git Commit: `feat: add capture workbench selection bar shell` (hash: TBD)
3. [TODO] Создать `src/client/project-manager/components/capture-workbench/step-selector.tsx`: dropdown с группировкой `Trunk Workflow` / `Translation` / `Development Tree (disabled future)` (scope: 1 файл).
4. [TODO] Git Commit: `feat: add capture workbench step selector` (hash: TBD)
5. [TODO] Создать `src/client/project-manager/components/capture-workbench/provider-selector.tsx`: dropdown с tinted Claude/Codex selected items, Gemini disabled placeholder с tooltip `Gemini support arrives with parent Phase 2` (scope: 1 файл).
6. [TODO] Git Commit: `feat: add capture workbench provider selector with gemini placeholder` (hash: TBD)
7. [TODO] Создать `src/client/project-manager/components/capture-workbench/model-reasoning-selectors.tsx`: один компонент-параметризованный (model/reasoning) с provider-specific опциями (scope: 1 файл).
8. [TODO] Git Commit: `feat: add capture workbench model and reasoning selectors` (hash: TBD)
9. [TODO] Тесты selection-bar: sticky load/save, четыре селектора рендерятся, Gemini disabled (scope: 1 файл).
10. [TODO] Git Commit: `test: cover capture workbench selection bar behavior` (hash: TBD)

### Stream 7 — Snapshot Cards UI

1. [TODO] Создать `src/client/project-manager/components/capture-workbench/snapshot-card.tsx`: managed/vanilla layout, file-link buttons использующие `openProjectManagerFileLink`, Vanilla card disabled с tooltip (scope: 1 файл).
2. [TODO] Git Commit: `feat: add capture workbench snapshot card` (hash: TBD)
3. [TODO] Создать `src/client/project-manager/components/capture-workbench/snapshot-cards-row.tsx`: pair of cards, `Re-capture Managed` button wired to existing `native-request-capture-runner`, slot rotation после успешного capture (scope: 1 файл).
4. [TODO] Git Commit: `feat: wire re-capture managed button and slot rotation` (hash: TBD)
5. [TODO] Тесты snapshot cards: empty state, slot rotation после capture, file-link button calls `openProjectManagerFileLink` (scope: 1 файл).
6. [TODO] Git Commit: `test: cover capture workbench snapshot cards and re-capture` (hash: TBD)

### Stream 8 — Diff Renderer

1. [TODO] Создать `src/client/project-manager/components/capture-workbench/diff-section-extractor-claude.ts`: парсит JSONL артефакт, возвращает массив секций (System Prompt / Tools / SDK Isolation / Model & Reasoning / Endpoint / Project Doc Reference / Output Schema) (scope: 1 файл).
2. [TODO] Git Commit: `feat: add claude diff section extractor` (hash: TBD)
3. [TODO] Создать `src/client/project-manager/components/capture-workbench/diff-section-extractor-codex.ts`: то же для Codex (System Prompt / Tools / Process Profile & Sandbox / Model & Reasoning / Endpoint / Project Doc Reference / Output Schema) (scope: 1 файл).
4. [TODO] Git Commit: `feat: add codex diff section extractor` (hash: TBD)
5. [TODO] Создать `src/client/project-manager/components/capture-workbench/diff-section.tsx`: один section row (collapsed/expanded, side-by-side body, status dot) (scope: 1 файл).
6. [TODO] Git Commit: `feat: add capture workbench diff section row` (hash: TBD)
7. [TODO] Создать `src/client/project-manager/components/capture-workbench/diff-renderer.tsx`: orchestration layer, mode tabs (Managed vs Vanilla disabled / Managed current vs previous active / Vanilla current vs previous disabled), summary, equal-collapsed (scope: 1 файл).
8. [TODO] Git Commit: `feat: add capture workbench diff renderer` (hash: TBD)
9. [TODO] Тесты extractors: Claude и Codex sample JSONL → expected sections (scope: ≤2 файла, два отдельных test файла).
10. [TODO] Git Commit: `test: cover claude and codex diff section extractors` (hash: TBD)
11. [TODO] Тесты diff-renderer: mode tabs, equal-collapsed default, expand on click (scope: 1 файл).
12. [TODO] Git Commit: `test: cover capture workbench diff renderer modes` (hash: TBD)

### Stream 9 — Settings → General Card Shrink + Launcher

1. [TODO] Заменить содержимое `src/client/ui/src/components/settings/native-request-capture-card.tsx` на launcher-кнопку `Open Capture Workbench` + одну строку описания. Удалить старые селекторы, кнопки capture, status surface, artifact list (scope: 1 файл).
2. [TODO] Git Commit: `feat: shrink native-request-capture card to workbench launcher` (hash: TBD)
3. [TODO] Wire launcher: `window.open("?mode=detached-capture&workspaceSlug=...&workspacePath=...", "_blank", "popup,width=1280,height=900")` через PM bridge helper (scope: 1 файл, новый `src/client/project-manager/services/capture-workbench-launcher.ts`).
4. [TODO] Git Commit: `feat: wire capture workbench launcher window.open` (hash: TBD)
5. [TODO] Обновить `native-request-capture-card.test.tsx`: проверка launcher button, removal of old controls (scope: 1 файл).
6. [TODO] Git Commit: `test: cover settings card launcher migration` (hash: TBD)
7. [TODO] Обновить SSOT: `Modules/UI_Bundles.md` (Settings General → launcher only) и `Clusters/Project_Manager.md` (detached capture window pattern) (scope: 2 файла).
8. [TODO] Git Commit: `docs: document capture workbench launcher and detached window` (hash: TBD)

### Stream 10 — Release Build

1. [TODO] Перед сборкой обновить README.md (`Current Release — vX.Y.Z`) и CHANGELOG.md (`## [X.Y.Z]`) на будущую версию = текущая `1.2.123` + 1 → `1.2.124` (scope: 2 файла).
2. [TODO] Git Commit: `docs: prepare release 1.2.124 capture workbench mvp` (hash: TBD)
3. [TODO] Запустить `./scripts/build-all.sh` — поднимет версии, пересоберёт provider/core/UI/CEF, соберёт tarball'ы. Перенести tarball'ы в `doc/tmp/releases/`.
4. [TODO] Git Commit: `chore: bump release manifests to 1.2.124` (если build-all не закоммитит сам — обычно он это делает) (hash: TBD)
5. [TODO] Запустить `./scripts/build-release.sh --use-current-version`. Проверить вывод: `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`. Забрать `codeai-hub-1.2.124.vsix`.
6. [TODO] Git Commit: `docs: record release build 1.2.124` (если требуется обновить release docs) (hash: TBD)

### Stream 11 — User Visual Acceptance Testing

1. [TODO] Установить `codeai-hub-1.2.124.vsix` в VS Code, открыть workspace.
2. [TODO] Acceptance matrix: открытие detached окна через Settings → General launcher; выбор `(Description, Claude, Sonnet, thinking high)`; sticky-восстановление выбора после reopen; `Re-capture Managed` пишет два timestamped artifact'а; slot rotation `current → previous`; кнопки `managed.md` / `managed.jsonl` открывают файлы в VS Code; diff `Managed: current vs previous` рендерит секции с правильными статусами; пересборка релиза → `Re-capture Managed` показывает обновлённый `releaseVersion` в diff header; Gemini Provider option видим, но disabled с tooltip; пустой workspace (без upstream artefacts) — capture не падает (bypassUpstreamGuard).
3. [TODO] Зафиксировать результаты приёмочного тестирования и подтверждение пользователя в session report.

### Stream 12 — Scope Closeout

1. [TODO] Перенести завершённый `doc/TODO/todo-plan.md` в `doc/TODO/Archive/todo-plan-capture-workbench-mvp-1.2.124.md`.
2. [TODO] Обсудить со scope owner: какие planning-документы остаются active vs deferred vs archive после Phase 1. Принять решение по каждому затронутому планинг-документу:
   - `Plans/Capture_Workbench_UI_Architecture.md` — переезжает либо в каноничные SSOT (`Clusters/Project_Manager.md`, `Modules/UI_Bundles.md`), либо в `Plans/Archive/Capture_Workbench_UI_Architecture.md`. Решить.
   - `Plans/Provider_Native_Request_Capture_Workbench_Architecture.md` — остаётся active (Phase 2/3/4 deferred).
3. [TODO] Обновить `doc/SolidWorks-WorkFlow/Docs_Index.md`: статусы обоих planning-документов после closeout (scope: 1 файл).
4. [TODO] Git Commit: `docs: archive capture workbench mvp todo-plan and refresh docs index` (hash: TBD)
5. [TODO] Создать новый пустой `doc/TODO/todo-plan.md` в reset-состоянии (как сейчас).
6. [TODO] Git Commit: `chore: reset todo-plan after capture workbench mvp closeout` (hash: TBD)
7. [TODO] Создать session report `doc/Sessions/SessionXXX.md` (тип A — Completion Report, поскольку active scope закрыт).

---

## Notes

- **Phase 1 first-stream invariant:** Stream 1, Stream 2 и Stream 3 не зависят друг от друга и могут идти параллельно или в любом порядке. Stream 4 требует Stream 1 (для `SlotEntryRecord` shape) и Stream 3 (для transport). Stream 5 требует Stream 0 (spike результат). Streams 6/7/8 требуют Stream 4 + Stream 5. Stream 9 требует Stream 5. Stream 10/11/12 идут последовательно после всех остальных.
- **Vanilla, Gemini, Development Tree, search в Step dropdown, code reference navigation, editable envelope** — out of scope этого Phase. Не добавлять микрозадачи.
- **Микрозадачи могут быть пересмотрены:** если по факту разработки задача затрагивает >3 файлов, она разбивается на более мелкие, и список переписывается. Это обязательная процедура из CLAUDE.md.
