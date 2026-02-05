# Session 92 — План фикса: `turn_state=idle` + seamless handoff lock (без кода)

**Date:** 2026-02-05 16:05 (CET)
**Branch:** main
**Version:** 1.1.513

---

# 1. Work Done in This Session

## Work summary
- Зафиксировали корневую причину бага: UI может продолжать показывать `Agent is working. Please wait.` при свободном вводе, потому что `connectionState="blocked"` «прилипает» и переопределяет `turn_state=idle`, а `InputPanel` не блокирует ввод на `blocked`.
- Подтвердили, как надёжно ловить «конец turn» для Claude:
  - Claude SDK стрим присылает сообщение `type: "result"` → Claude module эмитит `turn_completed`.
  - Core на `turn_completed` транслирует в UI `session:stream` событие `turn_state=idle`.
- Согласовали простой, бесшовный UX для смены сессий (continuity handoff) без новых пользовательских баннеров/сообщений:
  - во время handoff показываем только привычный working‑strip,
  - ввод/отправка блокируются на время handoff,
  - разблокировка строго по явному сигналу Core о готовности новой сессии.
- Обновили `doc/TODO/todo-plan.md`: уточнили Stream реализации (без изменения кода в этой сессии).
- Проверили user templates для continuity в home: присутствуют и актуальны; механизм инсталляции в extension действительно перезаписывает шаблоны при отличиях.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `b9f2fb0b docs(todo): add turn idle + handoff send lock stream`
- `723853dc docs(todo): revise continuity handoff UX approach`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/TODO/todo-plan.md`
2. `doc/Sessions/Session091.md`
3. `doc/Sessions/Session092.md` (THIS REPORT)

## Implementation target (artifacts / files to use)
- TODO Stream: `doc/TODO/todo-plan.md` → `### Stream: turn idle markers (Claude/Codex/Gemini) + seamless handoff lock` (пункты 175–181).

### Provider markers (Claude)
- `packages/Claude_Module/src/messaging/message-processor.ts`
  - `case "result"` → `maybeMarkTurnCompleted(...)` → provider event `turn_completed`.

### Core → UI turn state
- `packages/core/src/remote-bridge/handlers/session-request-handler.ts`
  - `case "turn_completed"` → `emitTurnStateEvent({ state: "idle" })`.

### UI root cause (где залипает состояние)
- `src/client/project-manager/components/sessions/token-usage-stream.ts`
  - текущая логика не даёт `turn_state=idle` «снять» `blocked` (blocked залипает).
- `src/client/ui/src/session/input-panel.tsx`
  - сейчас не блокирует ввод на `connectionState="blocked"` (ввод остаётся свободным).
- `src/client/ui/src/session/session-view-helpers.tsx`
  - вычисление, когда показывать working‑copy/анимацию.

### Continuity templates (must stay in sync with bundled assets)
- Bundled assets (в VSIX): `assets/flow/continuity/*.md`
- Инсталлятор (перезаписывает при отличиях):
  - `src/extension-module/templates/bundled-template-installer.ts`
  - `src/extension-module/templates/flow-node-continuity-template-installer.ts`
  - вызывается в `src/extension.ts` (activate)
- User location (проверено): `/Users/oleksandroliinyk/.codeai-hub/templates/flow/continuity/*.md`

## Acceptance criteria (what to test)
- Когда агент закончил turn и ждёт пользователя (`turn_state=idle`) — working‑strip остаётся в UI, но НЕ показывает `Agent is working. Please wait.` и не анимируется.
- Если агент задал вопрос и ждёт ответа пользователя — ввод свободен, working‑copy снята.
- Во время continuity handoff (смена сессии по инициативе Core):
  - UI показывает только привычный working‑strip,
  - ввод и отправка заблокированы,
  - после готовности новой сессии Core снимает блокировку и working‑copy.
