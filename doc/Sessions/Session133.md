# Session 133 — Postmortem: vscode-webview Idea Collector (Codex) artifacts + план фикса Claude

**Date:** 2026-01-17 12:45 CET
**Branch:** main
**Version:** 1.1.434

---

# 1. Work Done in This Session

## Work summary
- Проведена диагностика по JSONL Codex: ответ приходил как `{"answer": "..."}` (дефолтный structured output) и печатался в диалог вместо генерации `artifacts[]`.
- Исправлен пайплайн Idea Collector для `vscode-webview`:
  - follow-up сообщения в сессиях `stage=idea` отправляются с Idea Collector `outputSchema` (Variant B), чтобы модель возвращала `artifacts[]`.
  - сохранение `artifacts[]` больше не зависит от локального active-set (работает после перезапуска UI).
- Собран patch релиз **1.1.434** (VSIX + tarballs).

## Root cause (Codex → "markdown в чат")
**Симптом**
- В `sdk-codex-019bcb97-df87-73a3-9c00-cedc219cf96d.jsonl` (строка 26+) ответ Codex приходит как `{"answer": "..."}`. Это означает, что в turnOptions не был передан Idea Collector schema (Variant B), и модель легитимно вернула дефолтную схему (answer-only), после чего UI показал длинный текст в диалоге.

**Причины**
1) `vscode-webview` при follow-up сообщениях использовал `sendChatMessage(sessionId, content)` без `turnOptions.outputSchema`.
2) `IdeaCollectorService.handleStreamEvent()` раннее игнорировал structured output если `sessionId` не находится в `activeSessions` (что ломалось при перезапуске UI/потере local state): даже если `stream_event structured_output` прилетал, артефакты могли не сохраниться.

## Fix (что именно сделано)
**Code changes**
- `src/client/ui/src/app-host/session-store.ts`
  - Добавлена логика: если `SessionRecord.stage === "idea"`, то message отправляется через `sendChatMessage(sessionId, content, { outputSchema })`.
  - `outputSchema` берётся из кэша (см. файл ниже).
- `src/client/ui/src/services/idea-collector-schema-cache.ts` (новый)
  - Кэширует `Idea Collector schema` через `loadIdeaContract()` (одно значение на runtime), чтобы не делать лишние fetch/parse.
- `src/client/ui/src/services/idea-collector-service.ts`
  - `handleStreamEvent()` больше не требует `activeSessions.has(sessionId)`; если structured output найден — помечает сессию активной и запускает persist.
- `media/react-chat.js`
  - Обновлён как результат сборки webview bundle.

**Release**
- `./scripts/build-all.sh` → bump до `1.1.434` + сборка/установка tarball’ов.
- `./scripts/build-release.sh --use-current-version` → `codeai-hub-1.1.434.vsix`.
- tarball’ы в `doc/tmp/releases/` обновлены до `*1.1.434.tar.bz2`.

## Verification
- Прогонено: `./scripts/check-architecture.sh`, `npx ultracite check`, `npm run build:webview`, `npm run typecheck:webview`.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `6f1264b3 fix(webview): keep idea collector schema on idea sessions`
- `190f85b5 docs: update 1.1.434 release notes`
- `41f4e852 chore(release): bump 1.1.434`
- `3cceaa48 chore(release): package vsix 1.1.434`
- `d9bf8fc8 docs: update todo plan for release 1.1.434`
- `a3f5f381 docs: add session 132 report`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Architecture/Architecture.md`
2. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
3. `doc/TODO/todo-plan.md`
4. `doc/Sessions/Session133.md` (THIS REPORT)

## Plans for next session (Claude: артефакты не переписываются)
**Цель:** добиться того же поведения, что и для Codex: исправления должны приводить к `artifacts[]` → atomic write (с backup) → обновление файлов на диске, без вывода полного markdown в диалог.

1) Диагностика по Claude JSONL
- Открыть соответствующий лог `~/.codeai-hub/logs/claude/sdk-claude-*.jsonl` и найти:
  - есть ли structured output в `result.payload.structured_output` и есть ли `artifacts[]`;
  - приходит ли `suggested_response` и должен ли он появляться в UI как assistant сообщение;
  - есть ли событие `stream_event` с `data.kind="structured_output"` на стороне Core (`session:stream`).

2) Проверка цепочки доставки structured output до сохранения
- Provider (Claude module): гарантировать эмиссию `stream_event structured_output` (Variant B) и отдельного assistant сообщения для `suggested_response`.
- Core RemoteBridge: убедиться, что `session:stream` проксируется без фильтрации/потери payload.
- UI (vscode-webview):
  - `IdeaCollectorService.handleStreamEvent()` должен принять событие и вызвать persist;
  - persist должен дергать `POST /api/v1/orchestrator/artifact-upsert` и Core должен записать slot→path с backup.

3) Унификация поведения Codex/Claude на UI
- Зафиксировать инвариант: для любых провайдеров в `stage=idea` follow-up всегда отправляется с Idea Collector schema, иначе модель может вернуться к `{answer: ...}`.
- Добавить (или расширить) smoke-check: "после замечаний и `ОК/утверждаю` артефакты на диске изменились, а диалог содержит только краткий summary".

4) Релиз (после фикса)
- Обновить `CHANGELOG.md`/`README.md`/арх. доки.
- `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version`.
- Обновить `doc/TODO/todo-plan.md` и создать следующий `doc/Sessions/SessionXXX.md`.
