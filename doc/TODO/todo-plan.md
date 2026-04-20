# План разработки (Development TODO Plan)

**Execution Scope Status:** ACTIVE
**Started:** 2026-04-20 21:45 CEST
**Last updated:** 2026-04-20 22:15 CEST
**Owner:** Codex

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/UI_And_Reasoning_Translation_Engine_Split_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/UI_And_Reasoning_Translation_Engine_Split_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Localization.md`
  - `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
  - `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream. В каждом Stream каждая подзадача ограничена scope не более чем 3 файла.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Если задача по факту затрагивает больше 3 файлов, Stream нужно разбить на более мелкие задачи до начала фикса.
- **Gates (автоматически через Husky hooks):**
  - `git commit` -> `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` -> `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Targeted verification** перед закрытием Stream/Phase:
  - `npm run build --workspace=@codeai-hub/core`
  - `npm run build --workspace=@codeai-hub/localization`
  - `npm run build:webview`
  - `npm run typecheck:webview`
- **Real-time Документация:** любые архитектурные и логические изменения должны синхронно обновлять соответствующие документы `doc/` в том же commit.
- **Localization authoring rule:** любой новый текст, добавленный в UI или runtime surfaces в этом scope, обязан быть явно промаркирован как `UI Labels`, `UI Helper Text`, `Messages for the User`, `Artifacts for the User` или `Reasoning`; новые ключи добавлять только в approved English dictionaries.
- **Reasoning visibility rule:** hidden `Thinking / Reasoning` не переводить и не пускать в translation queue.
- **Reasoning ownership rule:** `uiEngineId` влияет только на UI localization / bootstrap path; `reasoningEngineId` и `reasoningLanguage` влияют только на visible runtime reasoning translation и не должны запускать blocking localization sync. `Reasoning` — полноценная пятая user-facing category с собственным language selector, но остаётся runtime-only (не bundled dictionary, не входит в browser bootstrap materialization).
- **Boundary cleanup rule:** `Messages for the User` возвращается к каноническому значению (warnings/errors/status/notifications); любое текущее место, где live reasoning overlays trafficked through `Messages`, переносится под `Reasoning` в том же коммите, что и соответствующий runtime/SSOT апдейт.
- **Release closeout:** финальный Stream должен завершиться релизной сборкой через `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`.

## Phase 1 — Settings Contract Split (owner: Codex, updated: 2026-04-20)
### Stream: Persisted Settings Shape
1. [TODO] Ввести persisted split `general.localization.uiEngineId` + `general.localization.reasoningEngineId` + `general.localization.categoryLanguages.reasoning` с legacy-read migration (`engineId -> uiEngineId`, `messagesForTheUserLanguage -> reasoningLanguage`, fresh `reasoningEngineId = google-gtx`); scope: `packages/core/src/remote-bridge/handlers/settings-request-handler.ts`, `packages/core/src/config/provider-settings-snapshot.ts`, `doc/SolidWorks-WorkFlow/Modules/Localization.md`; expected commit: `feat: split ui and reasoning translation settings contract`
2. [TODO] Git Commit: `feat: split ui and reasoning translation settings contract` (hash: TBD)
3. [TODO] Разделить save-impact contract так, чтобы `uiEngineId` и language четырёх UI-owned categories оставались strict localization changes, а `reasoningEngineId` и `reasoningLanguage` стали runtime-only non-blocking changes; scope: `src/extension-module/settings/localization-settings-impact-classifier.ts`, `src/extension-module/settings/localization-runtime-service.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `feat: separate ui and reasoning localization save impact`
4. [TODO] Git Commit: `feat: separate ui and reasoning localization save impact` (hash: TBD)

## Phase 2 — Runtime Routing (owner: Codex, updated: 2026-04-20)
### Stream: Core Reasoning Path
1. [TODO] Переключить Core live reasoning overlay на `reasoningEngineId` + `reasoningLanguage` и сохранить invariant hidden reasoning -> no translation dispatch; scope: `packages/core/src/session-translation/session-translation-policy-resolver.ts`, `packages/core/src/session-translation/session-translation-facade.ts`, `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`; expected commit: `feat: route live reasoning through dedicated engine and language`
2. [TODO] Git Commit: `feat: route live reasoning through dedicated engine and language` (hash: TBD)
3. [TODO] Синхронизировать applied runtime envelope и audit-path для reasoning engine + reasoning language fields без возврата split truth; scope: `packages/core/src/remote-bridge/handlers/session-request-handler-applied-turn-config.ts`, `packages/core/src/remote-bridge/types.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `feat: propagate dedicated reasoning translation metadata`
4. [TODO] Git Commit: `feat: propagate dedicated reasoning translation metadata` (hash: TBD)

### Stream: Provider Runtime Audit
1. [TODO] Перевести remaining provider-local live translation adapters для visible thought/progress copy на `reasoningEngineId` + `reasoningLanguage`; scope: `packages/Claude_Module/src/messaging/claude-thought-translation-adapter.ts`, `packages/Claude_Module/src/provider/claude-applied-turn-config.ts`, `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`; expected commit: `fix: align provider live reasoning translation with dedicated engine and language`
2. [TODO] Git Commit: `fix: align provider live reasoning translation with dedicated engine and language` (hash: TBD)
3. [TODO] Добавить regression coverage на split UI/reasoning routing, reasoning language decoupling от `Messages for the User`, и hidden-thinking skip; scope: `packages/core/src/session-translation/session-translation-policy-resolver.test.ts`, `packages/core/src/session-translation/session-translation-facade.test.ts`, `packages/Claude_Module/src/messaging/message-processor.pretool-thinking.translation.test.ts`; expected commit: `test: cover dedicated reasoning translation contract`
4. [TODO] Git Commit: `test: cover dedicated reasoning translation contract` (hash: TBD)

## Phase 3 — Settings UI And Localization Copy (owner: Codex, updated: 2026-04-20)
### Stream: Settings Controls
1. [TODO] Переименовать существующий selector в `UI Translation Engine`, добавить `Reasoning Translation Engine`, задать деликатный helper/warning copy и дефолт `Google GTX Free`; scope: `src/client/ui/src/components/settings/localization-settings-card.tsx`, `src/client/ui/src/components/settings/general-settings.tsx`, `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`; expected commit: `feat: add dedicated reasoning translation engine control`
2. [TODO] Git Commit: `feat: add dedicated reasoning translation engine control` (hash: TBD)
3. [TODO] Добавить пятую карточку `Reasoning` с собственным language selector и ownership-aware title/description; scope: `src/client/ui/src/components/settings/localization-settings-card.tsx`, `src/client/ui/src/components/settings/general-settings.tsx`, `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`; expected commit: `feat: add dedicated reasoning language settings card`
4. [TODO] Git Commit: `feat: add dedicated reasoning language settings card` (hash: TBD)
5. [TODO] Расширить browser settings state/raw/save handlers под новые поля (`uiEngineId`, `reasoningEngineId`, `reasoningLanguage`) и migration defaults; scope: `src/client/ui/src/components/settings/settings-state-raw.ts`, `src/client/ui/src/components/settings/settings-state-model.ts`, `src/client/ui/src/components/settings/use-settings-state.ts`; expected commit: `feat: wire split translation engine and reasoning language state`
6. [TODO] Git Commit: `feat: wire split translation engine and reasoning language state` (hash: TBD)

### Stream: Localized Source Keys
1. [TODO] Добавить approved English keys для нового `Reasoning Translation Engine` selector label/helper/warning и явно промаркировать ownership новых строк; scope: `src/client/ui/src/components/settings/use-settings-state-support.ts`, `packages/localization/assets/localization/source/en/ui_labels.json`, `packages/localization/assets/localization/source/en/ui_helper_text.json`; expected commit: `feat: localize reasoning translation engine copy`
2. [TODO] Git Commit: `feat: localize reasoning translation engine copy` (hash: TBD)
3. [TODO] Добавить approved English keys для пятой карточки `Reasoning` (title + description) и проставить ownership `UI Labels` / `UI Helper Text`; scope: `src/client/ui/src/components/settings/use-settings-state-support.ts`, `packages/localization/assets/localization/source/en/ui_labels.json`, `packages/localization/assets/localization/source/en/ui_helper_text.json`; expected commit: `feat: localize reasoning settings card copy`
4. [TODO] Git Commit: `feat: localize reasoning settings card copy` (hash: TBD)
5. [TODO] Синхронизировать SSOT для пятой user-facing category `Reasoning`, отделения от `Messages for the User` и runtime-only change-impact contract; scope: `doc/SolidWorks-WorkFlow/Modules/Localization.md`, `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`, `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`; expected commit: `docs: record reasoning category ownership split`
6. [TODO] Git Commit: `docs: record reasoning category ownership split` (hash: TBD)

## Phase 4 — Verification And Release (owner: Codex, updated: 2026-04-20)
### Stream: Targeted Verification
1. [TODO] Прогнать targeted verification по затронутым пакетам/UI и закрыть остаточные регрессии до release stage; scope: `@codeai-hub/core`, `@codeai-hub/localization`, `webview`; expected commit: `fix: close reasoning split verification regressions`
2. [TODO] Git Commit: `fix: close reasoning split verification regressions` (hash: TBD)

### Stream: Release Build
1. [TODO] Подготовить release-facing docs под будущую версию (`README.md`, `CHANGELOG.md`) и синхронизировать релизные архитектурные материалы для этого scope; scope: `README.md`, `CHANGELOG.md`, `doc/SolidWorks-WorkFlow/Modules/Localization.md`; expected commit: `docs: prepare reasoning split release notes`
2. [TODO] Git Commit: `docs: prepare reasoning split release notes` (hash: TBD)
3. [TODO] На чистом дереве выполнить финальный release pipeline: `./scripts/build-all.sh` -> `./scripts/build-release.sh --use-current-version`, зафиксировать VSIX/tarball results и после последнего содержательного commit подготовить отдельный session report closeout; scope: release pipeline / artifacts / final closeout handoff; expected commit: `build: release reasoning split update`
4. [TODO] Git Commit: `build: release reasoning split update` (hash: TBD)
