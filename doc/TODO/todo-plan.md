# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед началом каждого stream открыть: `AGENTS.md`, `doc/Sessions/Session162.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Plans/ThoughtTranslation_GoogleTranslate_Migration.md`
- Каждая микро-задача должна затрагивать не более 3 файлов; если scope разрастается, stream нужно дробить заново
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`
- Husky gates не обходить (`--no-verify` запрещён)
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита
- Перед закрытием каждого stream выполнять таргетные проверки затронутых пакетов/клиентов
- Для Core stream-ов таргетная проверка по умолчанию: `npm run build --workspace=@codeai-hub/core`
- Для PM/UI stream-ов таргетная проверка по умолчанию: `npm run build:webview` + `npm run typecheck:webview`
- `packages/core/src/remote-bridge/handlers/session-request-handler.ts` считается hotspot-файлом; после каждой микро-задачи, которая его меняет, обязателен немедленный `npm run build --workspace=@codeai-hub/core`
- Финальный release stream выполняется только после синхронизации документации и чистого дерева

---

## MVP Outcome

Критерии завершения этого плана:
- Gemini thinking events переводятся через Google Translate API (~100ms) вместо Flash-Lite (1-71s)
- В JSONL записывается одна запись на thought: `role: "assistant"`, `tag: "thinking"`, content = русский перевод
- Английские thinking-оригиналы НЕ записываются в JSONL
- UI показывает переводы как обычную плашку с label "Gemini · Thinking" (не collapsible)
- Порядок записей в JSONL гарантирован буферизацией (переводы всегда перед реальным ответом)
- Весь мусор от Flash-Lite удалён из кодовой базы
- Claude/Codex thinking не затрагиваются

---

## Phase 74 — ThoughtTranslator: Google Translate migration + tag field (owner: Oleksandr, updated: 2026-03-26)

### Stream 1: Replace Flash-Lite with Google Translate API
1. [TODO] Полностью переписать `ThoughtTranslatorService`: убрать `generateContent`, multi-turn prompt, `extractFinalTranslation`, `TRANSLATION_MODEL`. Новая реализация: один `fetch()` к `translate.googleapis.com/translate_a/single?client=gtx`, timeout 3s, парсинг JSON-ответа. (scope: `packages/Gemini_Module/src/messaging/thought-translator-service.ts`; expected commit: `feat(gemini): replace Flash-Lite ThoughtTranslator with Google Translate API`)
2. [TODO] Git Commit: `feat(gemini): replace Flash-Lite ThoughtTranslator with Google Translate API` (hash: TBD)
3. [TODO] Targeted verification — `npm run build --workspace=@codeai-hub/gemini-module`

### Stream 2: Core types — add `tag` field to SessionMessage and storage pipeline
4. [TODO] Добавить `tag?: string` в Core `SessionMessage` type и обновить `appendMessage()` для прокидывания tag. Добавить `tag` в `DialogMessagePayload`. Обновить `appendDialogMessage()` для передачи tag из payload в SessionMessage. (scope: `packages/core/src/session-manager/index.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit: `feat(core): add optional tag field to SessionMessage and dialog pipeline`)
5. [TODO] Git Commit: `feat(core): add optional tag field to SessionMessage and dialog pipeline` (hash: TBD)
6. [TODO] Targeted verification — `npm run build --workspace=@codeai-hub/core` (hotspot file changed)

### Stream 3: MessageProcessor — buffered emit with tag
7. [TODO] Переписать `handleThoughtEvent()`: убрать синхронный emit thinking + fire-and-forget перевод. Новая логика: (a) не эмитить сразу, (b) запустить перевод и сохранить Promise в `pendingTranslations[]`, (c) при завершении перевода — `emitDialogMessage("assistant", russian, { tag: "thinking" })`, (d) fallback на английский при ошибке. Обновить `handleFinishedEvent()`: перед emit реального ответа — `await Promise.allSettled(pendingTranslations)`, затем очистить массив. Обновить `emitDialogMessage` сигнатуру для приёма опционального `tag`. (scope: `packages/Gemini_Module/src/messaging/message-processor.ts`; expected commit: `feat(gemini): buffer thought translations and emit with tag before real response`)
8. [TODO] Git Commit: `feat(gemini): buffer thought translations and emit with tag before real response` (hash: TBD)
9. [TODO] Targeted verification — `npm run build --workspace=@codeai-hub/gemini-module`

### Stream 4: UI — render tagged thoughts as visible "Gemini · Thinking" messages
10. [TODO] Добавить `tag?: string` в UI `SessionMessage` type. Обновить `resolveRoleLabel()`: если `tag === "thinking"` и role === "assistant", вернуть `"${providerLabel} · Thinking"`. Обновить маршрутизацию в `dialog-panel.tsx`: assistant с tag="thinking" рендерится как `StandardMessage` (не `ThinkingMessage`). (scope: `src/types/session.ts`, `src/client/ui/src/session/dialog-panel-message-utils.ts`, `src/client/ui/src/session/dialog-panel.tsx`; expected commit: `feat(ui): render tagged thinking as visible Gemini · Thinking messages`)
11. [TODO] Git Commit: `feat(ui): render tagged thinking as visible Gemini · Thinking messages` (hash: TBD)
12. [TODO] Targeted verification — `npm run build:webview` + `npm run typecheck:webview`

### Stream 5: Codebase cleanup — remove Flash-Lite remnants
13. [TODO] Удалить Flash-Lite binding из `gemini-session-manager.ts` (`ensureThoughtTranslatorBound`, `bindClient` вызов с GeminiClient). Обновить `ThoughtTranslatorService` конструктор/binding — убрать `GeminiClientBridge` type и `clientRef`. Прогнать поиск по кодовой базе: убедиться что нет orphaned imports, references к `TRANSLATION_MODEL`, `extractFinalTranslation`, `GeminiClientBridge`, `generateContent` в контексте перевода. (scope: `packages/Gemini_Module/src/session/gemini-session-manager.ts`, `packages/Gemini_Module/src/messaging/thought-translator-service.ts`; expected commit: `refactor(gemini): remove Flash-Lite translation remnants`)
14. [TODO] Git Commit: `refactor(gemini): remove Flash-Lite translation remnants` (hash: TBD)
15. [TODO] Targeted verification — полный `npm run build --workspace=@codeai-hub/gemini-module` + grep-аудит: `TRANSLATION_MODEL`, `extractFinalTranslation`, `GeminiClientBridge`, `gemini-2.5-flash-lite` — zero results expected

### Stream 6: Documentation sync + Release build
16. [TODO] Обновить `README.md`, `CHANGELOG.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` — отразить замену Flash-Lite на Google Translate, tag field, новый rendering thinking. (scope: `README.md`, `CHANGELOG.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `docs: sync ThoughtTranslator Google Translate migration and tag field`)
17. [TODO] Git Commit: `docs: sync ThoughtTranslator Google Translate migration and tag field` (hash: TBD)
18. [TODO] Release build — `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version`, VSIX packaging, копирование tarball'ов
19. [TODO] Git Commit: `chore(release): bump version to <new_version>` (hash: TBD)
