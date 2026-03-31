# Session 064 — `Debug/Raw` rollout: raw provider log restored, dialog history still empty

**Date:** 2026-03-13 09:59 (CET)  
**Branch:** codex/baseline-gpt54-release  
**Version:** 1.1.721

---

# 1. Work Done in This Session

## Work summary
- Пользователь протестировал baseline release `1.1.721` в `Settings -> General -> Response Mode = Debug/Raw`.
- Подтверждено положительное изменение: native provider rollout для `gpt-5.4` теперь сохраняет полный ход работы с промежуточными `commentary`, то есть upstream provider больше не режется нашим strict structured-output contract.
- Локализован новый downstream regression: в нашем unified-session/dialog JSONL для той же `Description`-сессии остаются только `session-open` и `user`; ни одно agent message не доходит до panel history.
- Выполнена трассировка по цепочке `raw provider rollout -> SDK log -> CodexMessageProcessor -> unified-session storage` без кодовых изменений.
- В `doc/BugRegistry.md` заведена запись `BUG-2026-03-13-01`, а в `doc/TODO/todo-plan.md` добавлена отдельная узкая `Phase 294` под минимальный runtime-fix без трогания PM/UI/core рядом.

## Confirmed findings
- Raw provider rollout содержит корректные `commentary` и `final_answer`:
  - `/Users/oleksandroliinyk/.codeai-hub/providers/codex/home/sessions/2026/03/13/rollout-2026-03-13T09-43-33-019ce65d-8182-7bf2-8220-ecd9080ea4a0.jsonl`
- SDK log для того же turn показывает `sdk:item.completed` с `item.type="agent_message"` и полным `item.text`, значит SDK patch/normalization не теряет сообщения:
  - `/Users/oleksandroliinyk/.codeai-hub/logs/codex/sdk-codex-019ce65d-8182-7bf2-8220-ecd9080ea4a0.jsonl`
- Unified-session/dialog JSONL остаётся пустым от агента:
  - `/Users/oleksandroliinyk/.codeai-hub/sessions/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub-codex-5-4/codexCli/codex-0446deca-91a3-462a-866d-5c356cec5b17-description.jsonl`

## Root cause (confirmed)
- В начале turn `Debug/Raw` реально работает: `runOptionsKeys: []`, `outputSchema` не навязывается.
- Но `StructuredOutputStreamController` запоминает response-mode config по временному `sessionId`, а после `thread.started` `CodexMessageProcessor` переводит active session на реальный `threadId`.
- После этой promotion lookup'и `shouldSuppressCommentary()`, `startTurn()`, `appendChunk()` и `complete()` идут уже по новому `sessionId`, для которого controller не находит `passthrough` config и падает в `DEFAULT_TURN_CONFIG`.
- Следствие двойное:
  - `commentary` снова suppress-ится как internal;
  - `final_answer` начинает ожидаться как structured JSON, но provider уже прислал обычный текст, поэтому `assistantText` пустой и `assistant` event не эмитится.

## Non-causes / boundaries
- Проблема не в `gpt-5.4`: upstream provider и SDK log содержат полный ход работы.
- Проблема не в unified-session storage: в целевом JSONL нет ни одного `assistant`, то есть потеря происходит раньше, в Codex runtime.
- Исправление не требует трогать PM/UI routing, continuity или core persistence; баг локализован в session-promotion path внутри Codex runtime.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через `git show`)
- `e6ddc991 docs(codex): add response mode architecture plan`
- `45318c70 feat(codex): add response mode settings`
- `56d66e2b docs(codex): sync response mode ssot`
- `8fb69fa4 fix(codex): guard structured passthrough extractor`
- `19dc0289 chore(release): build-all v1.1.721`
- `4f7c3ab9 docs(release): record response mode rollout`

> В этой сессии новых git commit не делалось; обновлены только handoff-документы (`BugRegistry`, `todo-plan`, `Session064`).

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/Modules/Codex.md`
5. `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`
6. `doc/BugRegistry.md`
7. `doc/TODO/todo-plan.md`
8. `doc/Sessions/Archive/Session063.md`
9. `doc/Sessions/Archive/Session064.md` (THIS REPORT)

## Plans for next session
- Начать с `Phase 294 / Stream 0` из `todo-plan.md`: минимально починить перенос response-mode config и in-flight structured-output state при `temp session id -> real thread id`.
- Не расширять scope: не трогать PM/UI/core binding слой, не вводить новый протокол и не переделывать общий session lifecycle.
- После runtime-fix добавить один узкий regression guard на сценарий `thread.started` promotion до первого `agent_message`.
- Затем прогнать точечный smoke-check:
  - raw provider rollout содержит commentary;
  - unified-session/dialog JSONL получает `assistant` сообщения;
  - `Debug/Raw` и `Hybrid` больше не деградируют в `DEFAULT_TURN_CONFIG` mid-turn.
