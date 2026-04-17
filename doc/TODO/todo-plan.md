# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Gemini_InlineThoughtSplit_And_PreToolEnglishText_1.2.9.md`
- **Read this context before implementation:**
  - `doc/Sessions/Session042.md` (полный trajectory 1.2.7 retest → 1.2.8 release → 1.2.8 retest → discovery of Bug A/B)
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (Invariant 7 — Provider dialog segment preservation; Invariant 24 — Stop/Resume; Invariant 25 — live content)
  - `doc/SolidWorks-WorkFlow/Modules/Gemini.md`
  - `packages/Gemini_Module/src/messaging/gemini-assistant-event-normalizer.ts` (основной файл для Stream 2 + Stream 3)
  - `packages/Gemini_Module/src/messaging/gemini-stream-event-router.ts` (event dispatch)
  - `packages/Gemini_Module/src/messaging/message-processor.test.ts` (existing assistant tests; добавляем новые в Stream 4)
  - `packages/Gemini_Module/src/session/gemini-turn-runner.ts` (turn lifecycle, tool_call_request boundary)
  - `packages/Gemini_Module/src/messaging/thought-translator-service.ts` (overlay translator re-used в Stream 2 + Stream 3)
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждая подзадача затрагивает не более 3 файлов.
- Каждая подзадача оформляется парой: (1) изменения, (2) `Git Commit: ...`.
- Gates автоматически через Husky (`.husky/pre-commit` + `.husky/pre-push`). Таргетные сборки — перед закрытием Stream.
- Real-time документация: обновляем `doc/SolidWorks-WorkFlow/*` в том же коммите что и код.
- Phase завершается на чистом дереве через `./scripts/build-all.sh` (последний Stream).

## Phase 1 — Gemini Inline-Thought Split + Pre-Tool English Text Handling 1.2.9 (owner: Claude, updated: 2026-04-17)

### Stream 1: README/CHANGELOG pre-bump + planning doc commit
1. [DONE] Обновить README.md / CHANGELOG.md на будущую версию 1.2.9 с описанием Bug A splitter + Bug B pre-tool heuristic; commit planning-doc `Gemini_InlineThoughtSplit_And_PreToolEnglishText_1.2.9.md` (уже создан в Plans/) — scope: 3 файла; ожидаемый commit: `docs: prepare 1.2.9 release notes for Gemini inline-thought split + pre-tool text heuristic`
2. [DONE] Git Commit: `docs: prepare 1.2.9 release notes for Gemini inline-thought split + pre-tool text heuristic` (hash: 12658b8a5)

### Stream 2: Bug A — inline `[Thought: true]` splitter
1. [DONE] В `gemini-assistant-event-normalizer.ts`: добавить helper `splitInlineThoughtMarker(text)` → `{ preMarker, postMarker, hasMarker }` на regex `/\[Thought:\s*(true|false)\]/`. В `handleFinishedEvent` перед `emitDialogMessage` финала: если `hasMarker` → emit pre-marker через thoughtTranslator как thinking bubble (reusing same translation path as `handleThoughtEvent`), затем emit post-marker как assistant; else — оставить как есть. Edge cases: pre-marker empty (trim) → skip thinking emit; post-marker empty → skip final emit. — scope: 1 файл; ожидаемый commit: `fix(gemini): split inline [Thought: true] marker into thinking + final assistant segments`
2. [DONE] Git Commit: `fix(gemini): split inline [Thought: true] marker into thinking + final assistant segments` (hash: f48751a2e)

### Stream 3: Bug B — pre-tool non-target-language heuristic
1. [DONE] В `gemini-assistant-event-normalizer.ts`: расширить `TurnAccumulator` полем `preToolAssistantSegment: string | null` (init null), добавить метод `snapshotPreToolAssistantSegment(accumulator)` (идемпотентен, вызывается системным нормалайзером на первом tool_call_request) и helper `shouldReclassifyAsThinking(text, targetLanguage)`. В `gemini-system-event-normalizer.ts` — принять `assistantEventNormalizer` через конструктор и вызвать `snapshotPreToolAssistantSegment` в `handleToolCallRequestEvent` перед push в `toolRequests`. В `message-processor.ts` — пробросить `this.assistantNormalizer` в `new GeminiSystemEventNormalizer(...)`. В `handleFinishedEvent`: если `preToolAssistantSegment` не null и `shouldReclassifyAsThinking` → emit через thoughtTranslator overlay; иначе prepend в финальный assistant bubble. — scope: 3 файла; ожидаемый commit: `fix(gemini): reroute non-target-language pre-tool text through thinking overlay`
2. [DONE] Git Commit: `fix(gemini): reroute non-target-language pre-tool text through thinking overlay` (hash: 5479d29cf)

### Stream 4: Tests
1. [DONE] Новый test-file `gemini-assistant-event-normalizer.inline-thought.test.ts` (или extend `message-processor.test.ts`): 3 сценария — (a) content events с `[Thought: true]` marker → два dialog_message'а (thinking+assistant); (b) content events без marker → один assistant; (c) empty post-marker → только thinking, no assistant. — scope: 1 файл; ожидаемый commit: `test: verify Gemini inline thought marker splitter`
2. [DONE] Git Commit: `test: verify Gemini inline thought marker splitter` (hash: 5219fb276)
3. [DONE] Extend тот же spec или новый: 3 сценария Bug B — (a) target=ru + English pre-tool text + tool_call → thinking emitted, no assistant; (b) target=ru + Russian pre-tool text → assistant (not thinking); (c) target=en + English pre-tool text → assistant (heuristic off). — scope: 1 файл; ожидаемый commit: `test: verify Gemini pre-tool non-target-language heuristic`
4. [DONE] Git Commit: `test: verify Gemini pre-tool non-target-language heuristic` (hash: 5221f45d6)

### Stream 5: SSOT docs + planning archive
1. [DONE] В `SystemArchitecture.md` Invariant 7 (Provider dialog segment preservation) — добавить bullet про inline `[Thought: true]` split + pre-tool English heuristic в Gemini branch. В `Modules/Gemini.md` — два новых параграфа "Inline [Thought:true] splitting (1.2.9)" и "Pre-tool non-target-language heuristic (1.2.9)" поверх существующих 1.2.7/1.2.8 bullet'ов. — scope: 2 файла; ожидаемый commit: `docs: promote Gemini inline-thought split + pre-tool text heuristic contract`
2. [DONE] Git Commit: `docs: promote Gemini inline-thought split + pre-tool text heuristic contract` (hash: 6c46acd44)
3. [DONE] Planning-doc из `Plans/` → `Plans/Archive/`; обновить `Docs_Index.md` с новой entry. — scope: 2 файла; ожидаемый commit: `docs: archive 1.2.9 Gemini inline-thought planning doc`
4. [DONE] Git Commit: `docs: archive 1.2.9 Gemini inline-thought planning doc` (hash: 08138cd0a)

### Stream 6: Release build 1.2.9
1. [TODO] Verify чистое дерево, запустить `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version`; VSIX `codeai-hub-1.2.9.vsix` в корне + tarballs в `doc/tmp/releases/` и `~/.codeai-hub/releases/`.
2. [TODO] Git Commit: `chore: bump version to 1.2.9 for Gemini inline-thought split + pre-tool text heuristic release` (hash: TBD)
3. [TODO] Archive todo-plan в `doc/TODO/Archive/todo-plan-1.2.9-gemini-inline-thought-split-and-pre-tool-text.md`; reset `doc/TODO/todo-plan.md` к empty-scope placeholder; commit `docs: close 1.2.9 todo-plan after build`.
4. [TODO] Git Commit: `docs: close 1.2.9 todo-plan after build` (hash: TBD)
