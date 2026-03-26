# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед началом каждого stream открыть: `AGENTS.md`, `doc/Sessions/Session163.md`
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

## Phase 75 — Hotfixes: rate limits + model switch label + optimistic user message (owner: Oleksandr, updated: 2026-03-26)

### Stream 1: Fix rate limits — filter models + display names
1. [DONE] В `gemini-usage-limits-normalizer.ts`: добавить маппинг `GEMINI_MODEL_DISPLAY_NAMES`, фильтровать по известным моделям, использовать displayName.
2. [DONE] Git Commit: `fix(core): filter rate limit buckets by known models and use display names` (hash: 945773e7)
3. [DONE] Targeted verification — core build green

### Stream 2: Fix BUG-04 — broadcast model update on switch_model
4. [DONE] В `session-request-handler.ts` `handleSwitchRequest()`: добавить явный broadcast `session:model:update` после `setModelOverride()`.
5. [DONE] Git Commit: `fix(core): broadcast model update immediately on switch_model` (hash: fd358d23)
6. [DONE] Targeted verification — core build green

### Stream 3: Fix BUG-05 — optimistic user message in PM dialog
7. [DONE] В `session-message-dedupe.ts`: добавить `appendOptimisticUserMessage`. В `use-project-manager-dialog-session-controller.ts` `sendMessage()`: вызвать optimistic add.
8. [DONE] Git Commit: `fix(pm): render optimistic user message immediately on send` (hash: 7f8e41c9)
9. [DONE] Targeted verification — webview build + typecheck green

### Stream 4: Documentation sync + Release build
10. [DONE] Обновить `CHANGELOG.md`, `README.md`.
11. [DONE] Git Commit: `docs: update CHANGELOG and README for hotfix release 1.1.816` (hash: 4a722b24)
12. [DONE] Release build — `build-all.sh` + `build-release.sh`, VSIX 1.1.816 packaged.
13. [DONE] Git Commit: `chore(release): bump version to 1.1.816` (hash: e931ef56)
