# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Дополнительно перед стартом этого scope открыть: `AGENTS.md`, `doc/SolidWorks-WorkFlow/README.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/Sessions/Session075.md`, `doc/Sessions/Session076.md`.
- Execution-plan основан на planning-доке `doc/SolidWorks-WorkFlow/Plans/Gemini_DialogSegmentation_Architecture.md`.
- TODO Plan состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стримов), в каждом стриме - микро-задачи.
- Каждая микро-задача затрагивает не более 3 файлов или пакетов.
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`.
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- Husky gates не обходить (`--no-verify` запрещен).
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита.
- Таргетные сборки выполнять перед закрытием затронутого Stream/Phase.

---

## Phase 1 — Gemini dialog segmentation fix (owner: Oleksandr, updated: 2026-03-15)

### Stream: Preserve assistant segment boundaries
1. [DONE] Перестроить `GeminiMessageProcessor`, чтобы `content` chunks накапливались до `finished`, а затем флашились отдельным `dialog_message(role=\"assistant\")` вместо немого accumulation до конца turn-а (scope: `packages/Gemini_Module/src/messaging/message-processor.ts`, `packages/Gemini_Module/src/messaging/message-processor.test.ts`; expected commit: `fix(gemini): flush assistant segments on finished`).
2. [DONE] Git Commit: `fix(gemini): flush assistant segments on finished` (hash: `1a49e794`)
3. [DONE] Обновить `GeminiSessionManager`, чтобы final single-block `assistant` emit использовался только как fallback при отсутствии streamed assistant segments, без склейки всех реплик в единственный диалоговый блок (scope: `packages/Gemini_Module/src/session/gemini-session-manager.ts`, `packages/Gemini_Module/src/session/gemini-session-manager.test.ts`; expected commit: `refactor(gemini): preserve segmented assistant delivery`).
4. [DONE] Git Commit: `refactor(gemini): preserve segmented assistant delivery` (hash: `8ae29b23`)
5. [DONE] Синхронизировать документацию и провести таргетную верификацию по Gemini path: подтвердить, что unified session log теперь повторяет несколько assistant segments из raw SDK feedback, а `thinking`, `token_usage`, `usage_limits` и `turn_completed` не регрессировали (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/Sessions/Session076.md`, `doc/Sessions/Session077.md`; expected commit: `docs(session): record gemini dialog segmentation fix`).
6. [DONE] Git Commit: `docs(session): record gemini dialog segmentation fix` (hash: `05be9e28`)

---

## Phase 2 — Gemini dialog segmentation release build (owner: Oleksandr, updated: 2026-03-15)

### Stream: Local release assembly after segmentation fix
1. [DONE] После закрытия всех Gemini микро-задач актуализировать release-facing docs под новый локальный релиз `1.1.729`, синхронизировать `README.md`, `CHANGELOG.md` и execution-plan перед сборкой (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): prep gemini dialog segmentation release`).
2. [DONE] Git Commit: `docs(release): prep gemini dialog segmentation release` (hash: `21747bae`)
3. [DONE] На чистом дереве выполнить `./scripts/build-all.sh`, зафиксировать новый unified/workspace version `1.1.729`, обновлённые manifests и release tarball-артефакты (scope: `package.json`, workspace `package.json`, `assets/**/manifest.json`, `doc/tmp/releases/`; expected commit: `chore(release): build gemini dialog segmentation release`).
4. [DONE] Git Commit: `chore(release): build gemini dialog segmentation release` (hash: `5b28048c`)
5. [DONE] Выполнить `./scripts/build-release.sh --use-current-version`, проверить появление нового `codeai-hub-1.1.729.vsix`, синхронизировать session report и execution-plan по финальному релизному состоянию; подтверждены `Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`, собран `codeai-hub-1.1.729.vsix`, advisory duplication check снова показал `3.12% > 3%`, но release pipeline не упал (scope: `codeai-hub-<version>.vsix`, `doc/Sessions/Session077.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(session): record gemini dialog segmentation release`).
6. [DONE] Git Commit: `docs(session): record gemini dialog segmentation release` (hash: `00ca51a3`)
