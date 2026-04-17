# Session 43 — Gemini Inline Thought Split + Pre-Tool Heuristic (1.2.9 closed)

**Date:** 2026-04-17 13:35 CEST
**Branch:** main
**Version:** 1.2.9 (released and retest-verified)
**Execution Scope Status:** COMPLETED

---

# 1. Work Done in This Session

## Work summary

### 1.1. Context recovery (from Session042)
1.2.8 retest закрыл Stop/Resume триаду (Claude/Codex/Gemini) полностью, но вскрыл два новых бага в Gemini assistant output:
- **Bug A.** Post-tool follow-up turn пакует thought-like английский summary + литеральный `[Thought: true]` + финальный target-language ответ в один `content`-поток без сопровождающих `ptype: "thought"` events. Нормалайзер конкатенировал всё в один assistant bubble.
- **Bug B.** На старте сессии первый-второй Gemini turn эмитит английский `"I will read the questionnaire..."` как `content` перед `tool_call_request`. При target=ru этот текст оседал в финальном assistant bubble.

Планирующий документ `Gemini_InlineThoughtSplit_And_PreToolEnglishText_1.2.9.md` и 6-стримовый `todo-plan.md` для 1.2.9 были заложены в конце Session042 одним коммитом `559f17e2c`.

### 1.2. 1.2.9 implementation (6 streams, 14 commits)

**Stream 1 — release notes prep**
- `12658b8a5` docs: prepare 1.2.9 release notes (README "Current Release" → v1.2.9, 1.2.8 демоут до "(previous)", CHANGELOG [1.2.9] Fixed + Contracts).

**Stream 2 — Bug A splitter** (scope: 1 файл)
- `f48751a2e` fix(gemini): split inline [Thought: true] marker. Добавлены `INLINE_THOUGHT_MARKER_REGEX`, `splitInlineThoughtMarker`, `emitInlineThoughtAsThinking` (использует synthetic `ThoughtSummaryLike` для `thought-translator-service` — тот же overlay path что и native `ptype: "thought"` events). Литеральный токен дропается.

**Stream 3 — Bug B heuristic** (scope: 3 файла)
- `5479d29cf` fix(gemini): reroute non-target-language pre-tool text through thinking overlay. `TurnAccumulator.preToolAssistantSegment: string | null`, idempotent `snapshotPreToolAssistantSegment` (clears `currentAssistantChunks`), приватный `shouldReclassifyAsThinking` (Cyrillic-family target `ab/be/bg/kk/ky/mk/mn/ru/sr/tg/uk` + zero U+0400..U+052F). Wiring: `GeminiSystemEventNormalizer` принимает `assistantEventNormalizer` через constructor и вызывает snapshot в `handleToolCallRequestEvent`; `GeminiMessageProcessor` пробрасывает `this.assistantNormalizer` в system normalizer.

**Stream 4 — unit tests** (scope: 1 новый файл, два commit'а)
- `5219fb276` test: verify Gemini inline thought marker splitter (3 сценария Bug A — marker present / absent / empty post-marker).
- `5221f45d6` test: verify Gemini pre-tool non-target-language heuristic (3 сценария Bug B — ru+English → thinking / ru+Russian → assistant / en+English → assistant heuristic off).
- Новый spec `gemini-assistant-event-normalizer.inline-thought.test.ts`, 6/6 PASS. Отдельный pre-existing flaky тест `GeminiSessionManager flushes delayed translated thinking` был сломан до моих изменений (подтверждено через `git stash` + прогон) — не блокирует 1.2.9.

**Stream 5 — SSOT promotion + planning archive** (scope: 4 файла, два commit'а)
- `6c46acd44` docs: promote Gemini inline-thought split + pre-tool text heuristic contract. Invariant 7 (SystemArchitecture) расширен Gemini-specific bullet о provider-side quirks без `ptype: "thought"`. В `Modules/Gemini.md` добавлены два новых параграфа "Inline [Thought: true] splitting (1.2.9)" и "Pre-tool non-target-language heuristic (1.2.9)".
- `08138cd0a` docs: archive 1.2.9 planning doc в `Plans/Archive/` + обновлён `Docs_Index.md`.

**Stream 6 — release build** (scope: 4 коммита)
- `ede29ca23` docs: mark streams 1-5 DONE in todo-plan.
- `ddcd5a759` chore: bump version to 1.2.9 (все workspaces + manifests через `./scripts/build-all.sh`).
- После `./scripts/build-release.sh --use-current-version` получен `codeai-hub-1.2.9.vsix` (2.2M) + 7 tarballs в `doc/tmp/releases/` и `~/.codeai-hub/releases/`.
- `1c6bfa316` docs: close 1.2.9 todo-plan after build (архив в `doc/TODO/Archive/todo-plan-1.2.9-gemini-inline-thought-split-and-pre-tool-text.md`; active todo-plan сброшен к empty-scope placeholder).

### 1.3. 1.2.9 retest — VERIFIED

Пользователь протестировал 1.2.9 на Gemini. Вердикт: **все исправлено, все работает как должно**. Both Bug A (inline marker split) и Bug B (pre-tool English на старте сессии с Cyrillic target) закрыты. 1.2.9 pushed to GitHub as part of this closeout.

## Git commits
(REFERENCE ONLY: этот список сохраняется для исторической трассировки и расследования регрессий; следующая сессия не обязана читать все коммиты по умолчанию.)
- `12658b8a5 docs: prepare 1.2.9 release notes for Gemini inline-thought split + pre-tool text heuristic`
- `f48751a2e fix(gemini): split inline [Thought: true] marker into thinking + final assistant segments`
- `5479d29cf fix(gemini): reroute non-target-language pre-tool text through thinking overlay`
- `5219fb276 test: verify Gemini inline thought marker splitter`
- `5221f45d6 test: verify Gemini pre-tool non-target-language heuristic`
- `6c46acd44 docs: promote Gemini inline-thought split + pre-tool text heuristic contract`
- `08138cd0a docs: archive 1.2.9 Gemini inline-thought planning doc`
- `ede29ca23 docs: mark 1.2.9 streams 1-5 DONE in todo-plan; ready for release build`
- `ddcd5a759 chore: bump version to 1.2.9 for Gemini inline-thought split + pre-tool text heuristic release`
- `1c6bfa316 docs: close 1.2.9 todo-plan after build`

---

# 2. Instructions for Next Session

**Base SSOT:** `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
**Scope Discovery Index:** `doc/SolidWorks-WorkFlow/Docs_Index.md`

## Plans for next session
- Активный execution scope отсутствует.
- Следующий агент обязан сначала прочитать `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` как базовый SSOT.
- Затем агент обязан согласовать с пользователем новый scope.
- После этого агент обязан открыть `doc/SolidWorks-WorkFlow/Docs_Index.md`, выбрать релевантные документы для нового scope и только потом формировать новый planning-doc.
- До появления нового planning-doc и нового `doc/TODO/todo-plan.md` навигационной опорой служит `doc/SolidWorks-WorkFlow/Docs_Index.md`.

## Artifacts из 1.2.9

- VSIX `codeai-hub-1.2.9.vsix` (2.2M) в корне репозитория (released, retest passed).
- Tarballs 1.2.9 в `doc/tmp/releases/` и `~/.codeai-hub/releases/`:
  - `claude-module-1.2.9.tar.bz2`, `codex-module-1.2.9.tar.bz2`, `gemini-module-1.2.9.tar.bz2`
  - `codeai-hub-core-darwin-arm64-1.2.9.tar.bz2`
  - `CodeAIHubLauncher-macos-arm64-1.2.9.tar.bz2`
  - `vscode-webview-1.2.9.tar.bz2`, `project-manager-1.2.9.tar.bz2`
- `doc/TODO/Archive/todo-plan-1.2.9-gemini-inline-thought-split-and-pre-tool-text.md` (1.2.9 closed).
- `doc/SolidWorks-WorkFlow/Plans/Archive/Gemini_InlineThoughtSplit_And_PreToolEnglishText_1.2.9.md` (1.2.9 closed).

## Процессные заметки

- **Two-bug cycle as clean follow-up to 1.2.8 retest.** 1.2.8 закрыл Stop/Resume триаду полностью; 1.2.9 стал первым релизом в новой теме "Gemini assistant output hygiene" (provider-side quirks в boundaries между content/thought events без sentinel-событий). Паттерн может повториться для других провайдеров — при похожих находках reuse overlay-path `emitInlineThoughtAsThinking` + heuristic по target language остаётся каноничным.
- **Pre-existing flaky test не блокирует release.** `GeminiSessionManager flushes delayed translated thinking` в `src/session/gemini-session-manager.test.ts` падает с `TypeError: Cannot set properties of undefined (setting 'translateThought')` (доступ к `manager.thoughtTranslator` через `as unknown as {...}` — поле больше не на уровне manager, оно сейчас на turn-runner). Существует до Session042; фикс — отдельный scope, не релевантен 1.2.9.
- **PostToolUse formatter ведёт себя стабильно.** Ultracite не удалял unused imports между Edit'ами в 1.2.9 (в отличие от 1.2.8 case в `gemini-provider-adapter.ts`). Правило "import + usage в одном Edit'е" держалось.
- **Release без clean wipe.** 1.2.9 не меняет installer layout — user'у не нужно чистить `~/.codeai-hub/`. Tarballs 1.2.8 в `doc/tmp/releases/` перезаписаны build-all.sh на 1.2.9 как обычно.
