# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Localization_IncrementalSync_And_ThinkingVisibility_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Localization.md`
  - `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Modules/Gemini.md`
  - `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое колличество - Stream (стрим), в каждом Стриме - некоторое кол-во подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Если по факту разработки оказывается, что конкретная подзазача Stream затрагивает больше 3 файлов - такая задача должна быть разбита на более мелкие и список задач в Стриме переписывается.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- Ручной прогон этих команд обычно не нужен (только для диагностики).
- **Таргетные сборки** выполняем вручную только когда нужно проверить затронутый пакет/клиент, и обязательно перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`.
- **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт `todo-plan.md` (дата, статус, хеш).
- Stream завершается после того, как все его задачи закрыты таргетными сборками затронутых пакетов/клиентов и коммитами. Для серийных задач допускается диагностический прогон `npm run build --workspace <package>` по цепочке, чтобы локализовать ошибки без запуска `build-all`.
- **Real-time Документация:** любое изменение архитектуры/логики требует синхронного обновления и `todo-plan.md`, и релевантной документации из `doc/` **до** коммита, чтобы измененные документы также попали в Git Commit.
- Phase завершается на чистом дереве: запускаем `./scripts/build-all.sh`, переносим tarball’ы в `doc/tmp/releases/`, фиксируем результаты в `doc/Sessions/`.
- **doc/TODO/todo-plan.md** необходимо постоянно в риалтайме обновлять: после каждой подзадачи обязательный коммит, после каждого коммита его hash и статус задачи тут же заносить сюда.
- **Планируемый релиз этого scope:** `1.1.985` (текущая версия `1.1.984` + 1). Если в ходе выполнения scope версия изменится по внешним причинам, release stream ниже нужно синхронно обновить.

## Phase 1 — Incremental Settings Save Sync (owner: Oleksandr + Codex, updated: 2026-04-15)
### Stream: Save impact classification
1. [DONE] Добавить классификатор влияния настроек на локализацию и убрать blocking localization sync для provider-only / response-policy / continuity save-path — scope: `src/extension-module/message-handlers/`, `src/extension-module/settings/`, `doc/SolidWorks-WorkFlow/Modules/Localization.md`; ожидаемый commit message: `fix: skip localization sync for provider-only settings saves`
2. [DONE] Git Commit: `fix: skip localization sync for provider-only settings saves` (hash: dc4f9e6fa)
3. [DONE] Ввести selective strict sync planning для save-path: engine change = rebuild всех неанглийских групп, single-category change = rebuild только затронутого runtime bundle set — scope: `src/extension-module/settings/`, `src/extension-module/message-handlers/`, `doc/SolidWorks-WorkFlow/Plans/Localization_IncrementalSync_And_ThinkingVisibility_Architecture.md`; ожидаемый commit message: `feat: add selective localization sync planning`
4. [DONE] Git Commit: `feat: add selective localization sync planning` (hash: 8aaf692cb)
5. [DONE] Добавить selective-rebuild контракт в LocalizationFacade (carry-forward для незатронутых bundles, force-strict для аффектных) — scope: `packages/localization/src/localization-facade.ts`, `packages/localization/src/localization-selective-sync.ts`, `packages/localization/src/index.ts`; ожидаемый commit message: `feat: support selective runtime bundle materialization`
6. [DONE] Git Commit: `feat: support selective runtime bundle materialization` (hash: 15a5aacc1)
7. [DONE] Пробросить selective plan из Settings save-path в runtime-service и обновить Localization SSOT под новое поведение — scope: `src/extension-module/settings/localization-runtime-service.ts`, `src/extension-module/message-handlers/settings-message-handler.ts`, `doc/SolidWorks-WorkFlow/Modules/Localization.md`; ожидаемый commit message: `feat: rebuild only affected localization bundles`
8. [DONE] Git Commit: `feat: rebuild only affected localization bundles` (hash: 551e74465)

## Phase 2 — Messaging Ownership And Visible Thinking Gate (owner: Oleksandr + Codex, updated: 2026-04-15)
### Stream: Messages for the User contract
1. [DONE] Явно зафиксировать в локализационном контракте и пользовательских пояснениях, что `Messages for the User` включает visible `Thinking / Reasoning` — scope: `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`, `doc/SolidWorks-WorkFlow/Modules/Localization.md`, `src/client/ui/src/components/settings/localization-settings-card.tsx`; ожидаемый commit message: `docs: classify visible thinking under messages for the user`
2. [DONE] Git Commit: `docs: classify visible thinking under messages for the user` (hash: TBD)
3. [DONE] Подтянуть Settings helper copy и busy/sync messaging к новой модели incremental rebuild без ложного обещания полной пересборки интерфейса при любом save — scope: `src/client/ui/src/components/settings-view.tsx`, `src/client/project-manager/components/layout/main-area-panel-content.tsx`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; ожидаемый commit message: `docs: clarify incremental localization sync messaging`
4. [DONE] Git Commit: `docs: clarify incremental localization sync messaging` (hash: TBD)

## Phase 3 — Thinking/Reasoning Visibility And Translation Eligibility (owner: Oleksandr + Codex, updated: 2026-04-15)
### Stream: Forward-only thinking visibility
1. [DONE] Ввести emission-time policy для visible thinking/reasoning, чтобы hidden Claude/Gemini thinking не попадал в translation queue; Codex path остается provider-owned — scope: `packages/core/src/session-translation/session-translation-policy-resolver.ts`, `packages/core/src/session-translation/session-translation-facade.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.ts` (Shared_RuntimeTranslation_Module.md SSOT update moved to Phase 3.5); ожидаемый commit message: `fix: gate thinking translation by visible session policy`
2. [DONE] Git Commit: `fix: gate thinking translation by visible session policy` (hash: 8e0eb1bfe)
3. [DONE] Phase 3.3a: запикать immutable emission-time visibility на persisted `SessionMessage` (`SessionMessageEmissionVisibility`) и резолвить её через `SessionTranslationFacade.resolveThinkingVisibilityForProvider` на emit path, чтобы UI/PM мог позже фильтровать строго по emission-time состоянию — scope: `packages/core/src/session-manager/index.ts`, `packages/core/src/session-translation/session-translation-facade.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.ts`; ожидаемый commit message: `feat: persist emission-time thinking visibility`
4. [DONE] Git Commit: `feat: persist emission-time thinking visibility` (hash: 058e9d3b6)
5. [DONE] Phase 3.3b: протянуть emission-time visibility через UI wire contract (`SessionMessage`, `ServerSessionMessage`, `sanitizeMessage`), чтобы UI знал immutable decision каждого thinking message — scope: `src/types/session.ts`, `src/client/ui/src/core-bridge/types.ts`, `src/client/ui/src/core-bridge/normalizers.ts`; ожидаемый commit message: `feat: carry emission-time visibility through session bridge`
6. [DONE] Git Commit: `feat: carry emission-time visibility through session bridge` (hash: 050bfd626)
7. [DONE] Phase 3.3c: ввести `shouldHideThinkingMessage` helper и заменить replay-time settings filter на emission-time check в Session view и virtual-conversation pipeline, чтобы re-enable `Thinking in dialog` / `Reasoning in dialog` действовал только вперёд — scope: `src/client/ui/src/session/helpers.ts`, `src/client/ui/src/session/session-view-helpers.tsx`, `src/client/ui/src/session/virtual-conversation-message-utils.ts`; ожидаемый commit message: `fix: keep hidden thinking forward-only after re-enable`
8. [DONE] Git Commit: `fix: keep hidden thinking forward-only after re-enable` (hash: 8917737d0)
9. [DONE] Phase 3.3d: зафиксировать новый инвариант emission-time visibility в базовом SSOT (`SystemArchitecture.md`) — scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; ожидаемый commit message: `docs: record emission-time thinking visibility invariant`
10. [DONE] Git Commit: `docs: record emission-time thinking visibility invariant` (hash: f1cd54c10)
11. [DONE] Синхронизировать provider SSOT для Claude/Codex/Gemini с новым правилом: hidden visible-thinking не переводится, а re-enable не backfill-ит старые reasoning/thinking — scope: `doc/SolidWorks-WorkFlow/Modules/Claude.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/SolidWorks-WorkFlow/Modules/Gemini.md`; ожидаемый commit message: `docs: sync thinking visibility and translation contract`
12. [DONE] Git Commit: `docs: sync thinking visibility and translation contract` (hash: 032323876)

## Phase 4 — Regression Coverage And Targeted Validation (owner: Oleksandr + Codex, updated: 2026-04-15)
### Stream: Targeted regression proof
1. [DONE] Добавить regression coverage для provider-only saves, engine/category selective rebuild и forward-only emission-time thinking visibility — scope: `src/extension-module/settings/localization-settings-impact-classifier.test.ts`, `src/extension-module/settings/localization-selective-sync-planner.test.ts`, `src/client/ui/src/session/thinking-display-policy.test.tsx`; ожидаемый commit message: `test: cover incremental localization sync and thinking visibility`
2. [DONE] Git Commit: `test: cover incremental localization sync and thinking visibility` (hash: TBD)
3. [TODO] Закрыть таргетные сборки и type/test verification для затронутых пакетов/клиентов (`@codeai-hub/localization`, `@codeai-hub/core`, UI/PM) и, если validation потребует правок, внести их в узком scope с синхронной документацией — scope: `packages/localization/`, `packages/core/`, `src/client/`; ожидаемый commit message: `fix: close localization incremental sync regressions`
4. [TODO] Git Commit: `fix: close localization incremental sync regressions` (hash: TBD)

## Phase 5 — Release Build 1.1.985 (owner: Oleksandr + Codex, updated: 2026-04-15)
### Stream: Release assembly and scope closeout
1. [TODO] Подготовить release-facing документы для `1.1.985` и синхронизировать финальные scope docs перед сборкой (`README.md`, `CHANGELOG.md`, релевантные SSOT/Plans/Docs_Index`) — scope: `README.md`, `CHANGELOG.md`, `doc/`; ожидаемый commit message: `docs: prepare release 1.1.985 notes`
2. [TODO] Git Commit: `docs: prepare release 1.1.985 notes` (hash: TBD)
3. [TODO] Выполнить release wave: чистое дерево, `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, зафиксировать release artefacts и устранить release-only blockers в самом узком scope — scope: `scripts/`, `doc/tmp/releases/`, репозиторий release artefacts; ожидаемый commit message: `build: prepare release 1.1.985 artifacts`
4. [TODO] Git Commit: `build: prepare release 1.1.985 artifacts` (hash: TBD)
5. [TODO] Закрыть execution scope: архивировать `doc/TODO/todo-plan.md`, провести обязательный Plans closeout review, синхронизировать `Docs_Index`, `doc/Sessions/`, release итоги и оставить чистое дерево — scope: `doc/TODO/`, `doc/SolidWorks-WorkFlow/Plans/`, `doc/Sessions/`; ожидаемый commit message: `docs: close incremental localization sync scope`
6. [TODO] Git Commit: `docs: close incremental localization sync scope` (hash: TBD)
