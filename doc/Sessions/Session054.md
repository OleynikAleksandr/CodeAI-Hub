# Session 054 — Design-only: fix questionnaire submit ordering + pre-read auto-attach plan

**Date:** 2026-01-05 11:05 (CET)
**Branch:** main
**Version:** 1.1.384

---

# 1. Work Done in This Session

## Work summary
- Проведена диагностика бага: после отправки анкеты Idea Collector иногда просит `/read questionnaire.md`, хотя анкета создана и auto-attach должен был сработать.
- Подтверждено, что это связано с отправкой **двух сообщений подряд** из UI (два turn’а), что противоречит требованиям «неинтерактивного» поведения Codex exec на старте.
- Сформирован план исправлений на следующую сессию: 1) сделать первый submit одним сообщением/одним turn’ом, 2) внедрить детерминированный pre-read auto-attach по секции 0 анкеты, 3) пересмотреть лимиты auto-attach (байты vs токены).

## Key findings (evidence)
1) **Два user_message → два turn’а → гонка**
- В UI логика отправки разделена на два `sendChatMessage()` вызова:
  - `src/client/ui/src/services/idea-collector-service.ts:94` (`beginQuestionnaireReview`) отправляет:
    1) `prompt` (Idea Collector system prompt)
    2) `content` (инструкция «review questionnaire.md ...»)
- В реальном Codex CLI JSONL видно 2 `user_message` и 2 `agent_message`:
  - `~/.codeai-hub/providers/codex/home/sessions/2026/01/05/rollout-2026-01-05T14-22-04-019b8e52-6963-7132-a1d0-55b974a32036.jsonl`
  - Первый ответ агента: «не вижу questionnaire.md».
  - Второй ответ агента: уже корректно извлекает `title` и прочие поля из анкеты (значит attach был, но поздно).

2) **Auto-attach анкеты сработал, но на “втором” сообщении**
- Core пишет лог: `Auto-attached workspace files to provider message` для пути анкеты:
  - `~/.codeai-hub/logs/core/core.log` (пример: sessionId `7e1005fa-8d71-404a-9b6b-bdbfd63417a8`)
- В том же rollout JSONL видно сообщение пользователя с preamble и блоком:
  - `[FILE: .codeai-hub/full-development-flow/initiatives/full-development-flow/idea/questionnaire.md] ...`

3) **Секция 0 анкеты (pre-read docs) сейчас НЕ гарантирует attach**
- Текущий Core auto-attach сканирует только *текст сообщения* на наличие trigger-слов и путей:
  - `packages/core/src/remote-bridge/handlers/workspace-auto-attach-extractor.ts`
  - Требование: в message есть trigger (например, «прочитай/изучи/ознакомься») и `"/"`.
- Пути внутри уже прикреплённой анкеты **не сканируются**, поэтому документы из секции 0 не будут attach’иться автоматически.

4) **Лимит 60k не “выдуман” — он зашит в коде как байтовый лимит**
- Core auto-attach: `packages/core/src/remote-bridge/handlers/workspace-auto-attach.ts` → `maxBytes: 60_000` (на файл)
- Core read file endpoint: `packages/core/src/remote-bridge/handlers/workspace-file-service.ts`:
  - `DEFAULT_MAX_BYTES = 60_000`
  - `MAX_MAX_BYTES = 500_000`
- UI `/read`: `src/client/ui/src/services/idea-collector-workspace-context.ts` → `DEFAULT_MAX_BYTES = 60_000` (на файл)
- Это байты, потому что чтение реализовано через `stat/readFileHead`:
  - `packages/core/src/remote-bridge/handlers/workspace-file-utils.ts`

---

# 2. Plan for Next Session (Implementation Plan)

## Goal
Сделать отправку анкеты детерминированной:
1) **Первый submit** (после заполнения анкеты) должен приводить к **одному** provider turn’у (без гонок и промежуточных ответов).
2) Документы из секции 0 (`pre_read_documents`) должны attach’иться **всегда** (без необходимости trigger-слов и без участия пользователя).
3) Пересмотреть лимиты auto-attach: увеличить `maxBytes`, добавить управление общим бюджетом/защитой от слишком больших сообщений.

## Scope / files to change (exact targets)

### A) Fix “two messages” → one message / one turn
**Primary location:** `src/client/ui/src/services/idea-collector-service.ts`
- Метод: `beginQuestionnaireReview(sessionId, content)`
- Сейчас: отправляет 2 сообщения (`prompt` и `content`) через `sendChatMessage`.
- Нужно:
  1) Сформировать **одно** сообщение: `combined = prompt + "\n\n" + content` (или более строгий формат).
  2) Отправить **один** `sendChatMessage(sessionId, combined, { outputSchema })`.
  3) Важно: не ломать последующие сообщения в диалоге; “prompt” должен применяться на первом turn’е.

**Secondary check:** `src/client/ui/src/app-host/session-region.tsx`
- Хэндлер submit: `handleQuestionnaireSubmit()`.
- Сейчас: вызывает `ideaCollector.beginQuestionnaireReview(..., submissionMessage)` после `flushSave`.
- Оставить вызов, но после изменения A) “submissionMessage” будет объединён с prompt.

### B) Add deterministic pre-read auto-attach based on section 0
**Primary location:** `packages/core/src/remote-bridge/handlers/session-request-handler.ts`
- Сейчас: перед `adapter.sendMessage(...)` делает:
  - `autoAttachWorkspaceFiles(session.workspacePath, content)`
- Нужно расширить pipeline:
  1) Если message содержит attach анкеты (или хотя бы путь анкеты), прочитать `questionnaire.md` из workspace.
  2) Извлечь из анкеты список путей из поля секции 0:
     - поле: `pre_read_documents` внутри markdown между `<!-- field:pre_read_documents -->` и `<!-- /field -->`
     - в этом блоке искать пути (каждая строка, или маркдаун-листы; допустить plain paths).
  3) Прочитать и attach **все** найденные пути (с разумной защитой от опасных путей/расширений, используя существующий allowlist reader).
  4) Встроить эти attach’и **перед** основной анкетой/сообщением, чтобы агент “видел” документы как источник истины.

**New micro-classes to add (recommended to keep files < 300 lines):**
- `packages/core/src/remote-bridge/handlers/idea-questionnaire-pre-read-extractor.ts`
  - API: `extractPreReadPathsFromQuestionnaire(markdown: string): readonly string[]`
  - Ответ: relative paths (без кавычек, без punctuation), dedupe.
- `packages/core/src/remote-bridge/handlers/idea-questionnaire-pre-read-attacher.ts`
  - API: `attachPreReadDocuments(workspaceRoot: string, questionnairePath: string, options: { maxFiles?: number; maxBytes?: number; totalBudgetBytes?: number }): Promise<{ contentPrefix: string; attachedPaths: string[] }>`
  - Использовать существующий reader:
    - `packages/core/src/remote-bridge/handlers/workspace-auto-attach-reader.ts`
  - Плюс использовать `resolveWorkspaceFilePath`/`readFileHead` через `workspace-file-utils.ts`.

**Where to plug:**
- В `SessionRequestHandler.handleMessage()`:
  - до `autoAttachWorkspaceFiles(...)`:
    - если сообщение содержит path анкеты (см. C ниже), получить `contentPrefix` и затем делать:
      `providerContent = contentPrefix + "\n" + providerContentResult.content`.

### C) Make questionnaire path detection explicit and reliable
**Problem:** auto-attach extractor требует trigger+slash; это ненадёжно.

**New helper (Core):** `packages/core/src/remote-bridge/handlers/idea-questionnaire-path-detector.ts`
- API: `detectQuestionnairePath(message: string): string | null`
- Правило:
  - Если встречается `.codeai-hub/full-development-flow/initiatives/.../idea/questionnaire.md` → вернуть его.
  - Либо если встречается `questionnaire.md` и есть контекст инициативы → определить canonical path.

**Alternative (UI-side):** вместо детектора, всегда включать в message явный маркер:
- Например строка: `ATTACH: .codeai-hub/.../idea/questionnaire.md`
- Но предпочтительнее Core-side parsing, чтобы UI был проще.

### D) Increase auto-attach size limits (60k) “substantially”
**Where current limit is defined:**
- Core auto-attach: `packages/core/src/remote-bridge/handlers/workspace-auto-attach.ts` (`DEFAULT_OPTIONS.maxBytes = 60_000`)
- Core /workspace-file endpoint: `packages/core/src/remote-bridge/handlers/workspace-file-service.ts` (`DEFAULT_MAX_BYTES = 60_000`, max cap 500_000)
- UI /read: `src/client/ui/src/services/idea-collector-workspace-context.ts` (`DEFAULT_MAX_BYTES = 60_000`)

**What to change (proposal):**
- Increase Core auto-attach per-file limit from `60_000` to e.g. `300_000` or `500_000`.
- Add “total budget” protection at attach preamble builder level (new option):
  - e.g. `totalBudgetBytes = 1_200_000` (sum of all attachments), otherwise truncate/downgrade.
- Update `/workspace-file` cap if needed (already max 500k; raise only if truly required).
- Update UI `/read` limit if we want `/read` to fetch bigger files too.

**Important:** even if we lift byte limits, token limits still exist (model context); therefore implement:
- explicit truncation notices (already exists),
- optional “attach only heads” for very large docs,
- and a deterministic priority: questionnaire + pre-read docs first.

### E) Ensure “single message” still creates correct Codex session/thread binding
- Ensure session-turn serialization: UI should not issue 2 turns; but also Core should ideally have a per-session send lock.
- Where to enforce if needed:
  - `packages/core/src/provider-registry/...` or provider adapter’s `sendMessage` queue.
  - (Existing in Codex module there is startup lock for thread_id, but it is about thread binding, not about multiple user turns from UI.)

---

# 3. Acceptance Criteria (Next Session)

1) После нажатия «Отправить анкету»:
- В Codex CLI JSONL появляется **один** `user_message` (не два подряд), и первый `agent_message` больше не просит `/read questionnaire.md`.

2) Документы из секции 0 анкеты:
- Автоматически прикрепляются в provider message как `[FILE: <path>]` блоки без необходимости писать «прочитай/изучи».

3) Лимиты:
- Auto-attach больше не режет файлы на 60k (используется новый повышенный лимит), при этом присутствует защита от чрезмерного общего размера.

---

# 4. Instructions for Next Session (Zero-context restore)

## Commits to inspect
- `236fd6f chore(release): prepare 1.1.384`
- `740e551 fix(ui): show questionnaire hints below questions`
- `5ee1602 docs(session): add Session053 report`

## Logs / evidence files
- Core log: `~/.codeai-hub/logs/core/core.log`
- Codex SDK log: `~/.codeai-hub/logs/codex/sdk-codex-019b8e52-6963-7132-a1d0-55b974a32036.jsonl`
- Codex CLI session JSONL (evidence of 2 turns):
  - `~/.codeai-hub/providers/codex/home/sessions/2026/01/05/rollout-2026-01-05T14-22-04-019b8e52-6963-7132-a1d0-55b974a32036.jsonl`

## Code entry points
- UI send path:
  - `src/client/ui/src/app-host/session-region.tsx` (`handleQuestionnaireSubmit`)
  - `src/client/ui/src/services/idea-collector-service.ts` (`beginQuestionnaireReview`)  ← fix here
  - `src/client/ui/src/core-bridge/core-bridge.ts` (`sendChatMessage`)
- Core message pipeline:
  - `packages/core/src/remote-bridge/handlers/session-request-handler.ts` (`handleMessage`) ← add deterministic pre-read attach here
  - `packages/core/src/remote-bridge/handlers/workspace-auto-attach.ts`
  - `packages/core/src/remote-bridge/handlers/workspace-auto-attach-extractor.ts`
  - `packages/core/src/remote-bridge/handlers/workspace-auto-attach-reader.ts`
  - `packages/core/src/remote-bridge/handlers/workspace-file-service.ts` (limits)

