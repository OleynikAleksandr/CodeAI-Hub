# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед началом каждого stream открыть: `AGENTS.md`, `doc/Sessions/Session162.md`
- Каждая микро-задача должна затрагивать не более 3 файлов; если scope разрастается, stream нужно дробить заново
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`
- Husky gates не обходить (`--no-verify` запрещён)
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита
- Перед закрытием каждого stream выполнять таргетные проверки затронутых пакетов/клиентов
- Для Core stream-ов таргетная проверка по умолчанию: `npm run build --workspace=@codeai-hub/core`
- Для PM/UI stream-ов таргетная проверка по умолчанию: `npm run build:webview` + `npm run typecheck:webview`
- Финальный release stream выполняется только после синхронизации документации и чистого дерева

---

## MVP Outcome

Критерии завершения этого плана:
- Rate limits отображают только актуальные модели (Gemini 3.1 Pro / Gemini 3 Flash) с display names
- После switch_model StatusPanel немедленно обновляет label модели
- User message появляется в чате PM dialog sessions сразу при отправке (optimistic rendering)
- Все три бага закрыты, VSIX собран и протестирован

---

## Phase 75 — Hotfixes: rate limits + model switch label + optimistic user message (owner: Oleksandr, updated: 2026-03-26)

### Stream 1: Fix rate limits — filter models + display names
1. [TODO] В `gemini-usage-limits-normalizer.ts`: добавить маппинг `GEMINI_MODEL_DISPLAY_NAMES` (gemini-3.1-pro-preview → "Gemini 3.1 Pro", gemini-3-flash-preview → "Gemini 3 Flash"), в `buildWindowCandidate()` фильтровать bucket'ы по известным моделям, использовать displayName вместо raw modelId в label. (scope: `packages/core/src/provider-usage-limits/providers/gemini/gemini-usage-limits-normalizer.ts`; expected commit: `fix(core): filter rate limit buckets by known models and use display names`)
2. [TODO] Git Commit: `fix(core): filter rate limit buckets by known models and use display names` (hash: TBD)
3. [TODO] Targeted verification — `npm run build --workspace=@codeai-hub/core`

### Stream 2: Fix BUG-04 — broadcast model update on switch_model
4. [TODO] В `session-request-handler.ts` `handleSwitchRequest()`: после `setModelOverride()` добавить явный `this.broadcaster({ type: "session:model:update", payload: { sessionId, providerId, modelId: targetModelId } })` чтобы StatusPanel обновился немедленно. (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit: `fix(core): broadcast model update immediately on switch_model`)
5. [TODO] Git Commit: `fix(core): broadcast model update immediately on switch_model` (hash: TBD)
6. [TODO] Targeted verification — `npm run build --workspace=@codeai-hub/core`

### Stream 3: Fix BUG-05 — optimistic user message in PM dialog
7. [TODO] В `use-project-manager-dialog-session-controller.ts` `sendMessage()`: после вызова `api.dialogs.sendDialogMessage()` добавить optimistic user message в snapshots через `appendDedupedSessionMessageToSnapshots`. (scope: `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts`; expected commit: `fix(pm): render optimistic user message immediately on send`)
8. [TODO] Git Commit: `fix(pm): render optimistic user message immediately on send` (hash: TBD)
9. [TODO] Targeted verification — `npm run build:webview` + `npm run typecheck:webview`

### Stream 4: Documentation sync + Release build
10. [TODO] Обновить `CHANGELOG.md`, `README.md` — отразить три hotfix'а. (scope: `CHANGELOG.md`, `README.md`; expected commit: `docs: update CHANGELOG and README for hotfix release`)
11. [TODO] Git Commit: `docs: update CHANGELOG and README for hotfix release` (hash: TBD)
12. [TODO] Release build — `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version`, VSIX packaging
13. [TODO] Git Commit: `chore(release): bump version to <new_version>` (hash: TBD)
