# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед началом каждого stream открыть: `AGENTS.md`, `doc/Sessions/Archive/Session163.md`
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

## Phase 75 — COMPLETED (owner: Oleksandr, updated: 2026-03-26)

### Stream 1: Fix rate limits — filter models + display names
1. [DONE] GEMINI_MODEL_DISPLAY_NAMES map + filter. (hash: 945773e7)

### Stream 2: Fix BUG-04 — model switch label (three-layer fix)
2. [DONE] Core broadcast on switch_model. (hash: fd358d23)
3. [DONE] Snapshot ID fallback in useRuntimeModelSync. (hash: 63baf7a8)
4. [DONE] Settings sync guard — hasRuntimeModelOverride. (hash: f39ca3b5)

### Stream 3: Fix BUG-05 — optimistic user message
5. [DONE] appendOptimisticUserMessage + sendMessage integration. (hash: 7f8e41c9)

### Stream 4: Documentation sync + Release
6. [DONE] CHANGELOG/README sync, broken links fix, version heading. (hash: 62b32e3c, 55b755ff, ddf7892c, c12d2f62)
7. [DONE] Release 1.1.818 — build-all + build-release + push to GitHub. (hash: 0f49bd83)
