# Session 056 — Fix(UI): segment boundary dedupe + restore token summary after restart + patch‑релиз 1.1.603

**Date:** 2026-02-15 11:30 CET
**Branch:** codex/phase156-unified-agent-dialog
**Version:** 1.1.603

---

# 1. Work Done in This Session

## Problem statement
После фикса бесконечной сессии (1 `dialogId` / 1 JSONL) оставались 2 UI бага:
1) В ленте диалога появлялись **два** разделителя “Новая сессия”.
2) После рестартов Core/PM пропадал token summary `#1 (..%) | #2 (..%)`, хотя метаданные уже записаны в `~/.codeai-hub/sessions/**/<dialogId>.jsonl`.

## Root cause
- Двойной divider: в UI существовали **две независимые механики** разделителей:
  - explicit boundary‑сообщение из JSONL (`__CODEAIHUB_SEGMENT_BOUNDARY__`),
  - legacy implicit UI‑хак “divider после thinking”.
  При наличии explicit boundary оба триггерились → получалось два разделителя.
- Пропадающий `#1|#2`: основная SessionView строила summary из runtime continuation chain/snapshots и **не имела fallback** на парсинг JSONL boundary‑meta сообщений, поэтому после рестарта/rehydration summary мог быть пустым.

## Fix implemented
- UI: отключён legacy implicit divider после `thinking`, если в истории уже есть explicit boundary‑сообщения.
- UI: добавлен fallback для token summary в SessionView — если runtime‑summary пустой, строим `#1 (..%) | #2 (..%)` из boundary‑meta сообщений (replay‑safe восстановление).
- Webview: пересобран fallback bundle `media/react-chat.js`, чтобы VSIX‑fallback отражал новые UI изменения.

## Docs updated
- Уточнён UI контракт replay‑safe восстановления: SessionView обязан читать segment meta из JSONL и не использовать implicit divider при наличии explicit boundary.

## Gates / builds
- Пройдены гейты (в т.ч. через pre-commit hooks):
  - `./scripts/check-architecture.sh`
  - `npx ultracite check`
  - `npx ts-prune`
  - `npx jscpd --threshold 3 ...`
  - `npm run check:links`
  - таргетные сборки: `npm run build:core`, `npm run build:project-manager`, `npm run build:webview`, `npm run typecheck:webview`
- Собран patch‑релиз `1.1.603`:
  - `./scripts/build-all.sh` (version bump)
  - `./scripts/build-release.sh --use-current-version` (VSIX)

## Release artefacts (1.1.603)
- VSIX: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.1.603.vsix`
- Tarballs (release cache): `/Users/oleksandroliinyk/.codeai-hub/releases/*-1.1.603.tar.bz2`
- Tarballs (repo copy): `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/tmp/releases/*-1.1.603.tar.bz2`

## Files changed (entry points)
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/src/client/ui/src/session/dialog-panel.tsx`
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/src/client/ui/src/session/session-view.tsx`
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/src/client/ui/src/session/dialog-segment-meta.ts`
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/media/react-chat.js`
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/TODO/todo-plan.md`
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/CHANGELOG.md`

## Git commits
(ВАЖНО: по этим коммитам восстанавливаем контекст через `git show`)
- `69bd804a fix(ui): avoid duplicate segment dividers`
- `319bdd73 fix(ui): restore token summary from segment meta`
- `f56da9f9 docs(flow): clarify replay-safe UI contract`
- `14fb3fc3 docs(todo): update phase187 progress`
- `0d107a36 chore(webview): rebuild bundle`
- `de6062e3 chore(release): build-all for next patch`
- `6949e960 docs(todo): record patch release build (1.1.603)`
- `6ce41c64 docs(todo): finalize release plan status (1.1.603)`
- `f51c8d20 docs(changelog): add 1.1.602-1.1.603 entries`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/Sessions/Session056.md` (THIS REPORT)
2. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/TODO/todo-plan.md` (Phase 187/188)
3. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`

## Manual test plan
1. Открыть бесконечную сессию Reviewer.
2. Создать rollover (лимит контекста) и дождаться записи boundary/meta в `<dialogId>.jsonl`.
3. Убедиться, что в ленте появляется **ровно один** divider “Новая сессия”.
4. Перезапустить Core и/или Project Manager.
5. Убедиться, что token summary `#1 (..%) | #2 (..%)` восстанавливается из JSONL и отображается в Status панели.
