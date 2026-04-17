# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Gemini_AbortCrash_And_MisroutedThinking_1.2.12.md`
- **Read this context before implementation:**
  - `doc/Sessions/Session043.md`
  - `packages/core/src/index.ts` (Bug A entry point)
  - `packages/Gemini_Module/src/messaging/gemini-assistant-event-normalizer.ts` (Bug B + existing 1.2.9 splitter helpers)
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (Invariant 7 extension; new Invariant 30)
  - `doc/SolidWorks-WorkFlow/Modules/Gemini.md` (provider-side contracts)
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждая подзадача затрагивает не более 3 файлов.
- Gates автоматически через Husky. Таргетные сборки — перед закрытием Stream.
- Real-time документация: обновляем SSOT в том же коммите что и код.

## Phase 1 — Gemini Abort-Crash + Mis-Routed Thinking 1.2.12 (owner: Claude, updated: 2026-04-17)

### Stream 1: Release notes pre-bump to 1.2.12
1. [TODO] Обновить `README.md` (Current Release → v1.2.12, 1.2.11 → "(previous)") и `CHANGELOG.md` ([1.2.12] секция). — scope: 2 файла; ожидаемый commit: `docs: prepare 1.2.12 release notes for Gemini abort-crash suppression + mis-routed thinking reroute`
2. [TODO] Git Commit: `docs: prepare 1.2.12 release notes for Gemini abort-crash suppression + mis-routed thinking reroute` (hash: TBD)

### Stream 2: Direction A — uncaughtException handler for Gemini AbortError
1. [TODO] В `packages/core/src/index.ts`: добавить `process.on("uncaughtException", ...)` handler. Если `error.name === "AbortError"` И stack содержит `@google/gemini-cli-core` → залогировать warning через `appendFatalLog` с event=`core:abortError:suppressed` и **return**. Любая другая uncaughtException — passthrough (Node default crash). — scope: 1 файл; ожидаемый commit: `fix(core): suppress Gemini cli-core AbortError to prevent daemon crash`
2. [TODO] Git Commit: `fix(core): suppress Gemini cli-core AbortError to prevent daemon crash` (hash: TBD)

### Stream 3: Direction B — mis-routed thinking detector
1. [TODO] В `gemini-assistant-event-normalizer.ts`: добавить helper `hasMisroutedThinkingPrefix(text)` проверяющий startsWith одного из маркеров `sthought`, `CRITICAL INSTRUCTION`, `Related tools:`, `Plan:\n`, `Drafting the content`. В `handleFinishedEvent`: после Bug A splitter + Bug B pre-tool heuristic, если финальный assistant segment hasMisroutedThinkingPrefix → маршрутизировать весь segment через `emitInlineThoughtAsThinking` вместо emit assistant bubble. — scope: 1 файл; ожидаемый commit: `fix(gemini): reroute misrouted thinking content (sthought/CRITICAL INSTRUCTION) to thinking overlay`
2. [TODO] Git Commit: `fix(gemini): reroute misrouted thinking content (sthought/CRITICAL INSTRUCTION) to thinking overlay` (hash: TBD)

### Stream 4: SSOT promotion + planning archive
1. [TODO] В `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`: расширить Invariant 7 Gemini branch о mis-routed thinking prefixes. Добавить Invariant 30 "Provider uncaughtException safety" про process-level handler с selective AbortError suppression. В `doc/SolidWorks-WorkFlow/Modules/Gemini.md` — документировать crash-path и detector. — scope: 2 файла; ожидаемый commit: `docs: promote Gemini abort-crash + misrouted-thinking contracts to SSOT`
2. [TODO] Git Commit: `docs: promote Gemini abort-crash + misrouted-thinking contracts to SSOT` (hash: TBD)
3. [TODO] Planning-doc `Gemini_AbortCrash_And_MisroutedThinking_1.2.12.md` → `Plans/Archive/`; обновить `Docs_Index.md`. — scope: 2 файла; ожидаемый commit: `docs: archive 1.2.12 Gemini abort-crash + misrouted-thinking planning doc`
4. [TODO] Git Commit: `docs: archive 1.2.12 Gemini abort-crash + misrouted-thinking planning doc` (hash: TBD)

### Stream 5: Release build 1.2.12
1. [TODO] Verify чистое дерево, запустить `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version`.
2. [TODO] Git Commit: `chore: bump version to 1.2.12 for Gemini abort-crash + misrouted-thinking release` (hash: TBD)
3. [TODO] Archive todo-plan; reset active к empty-scope placeholder.
4. [TODO] Git Commit: `docs: close 1.2.12 todo-plan after build` (hash: TBD)
