# Session 055 — Fix: resume не должен создавать новый `dialogId` + patch‑релиз 1.1.602

**Date:** 2026-02-15 10:30 CET
**Branch:** codex/phase156-unified-agent-dialog
**Version:** 1.1.602

---

# 1. Work Done in This Session

## Problem statement (what broke)
- После rollover (триггер порога окна контекста) следующий новый запрос мог приводить к созданию **нового** `dialogId`, из‑за чего появлялись:
  - новый JSONL `~/.codeai-hub/sessions/.../<newDialogId>.jsonl` вместо дописывания в старый;
  - новая continuity‑папка `.codeai-hub/<ws>/continuity/<stage>/<newDialogId>/chain.json`.
- Это ломало инвариант «у агента (Reviewer/Description) один бесконечный диалог (1 `dialogId`)».

## Root cause
- В пути `session:create`/resume по `providerSessionId` при отсутствии явного `rootSessionId` Core генерировал новый `dialogId` из **нового** `session.id`.
- Этот путь не пытался привязаться к уже существующему continuity root (по `chain.json`), поэтому новые сообщения и chain писались в новый `dialogId`.

## Fix implemented
- Core: при `session:create`/resume по `providerSessionId` и наличии контекста `initiativeSlug+stage` Core пытается найти существующий continuity root по workspace chains (`chain.json`) и использует его как root (`dialogId`).
  - unified-session `historySessionId` пинится к старому `dialogId` → JSONL продолжает дописываться в тот же файл.
  - continuity chain продолжает обновляться в старой папке.
- Core: если `runSlug` отсутствует, роль для `dialogId` берётся из `stage` (например `description`), чтобы description‑сессия не называлась `*-agent`.

## Docs updated
- Уточнён контракт `dialogId` по derivation `agentRole`: `runSlug` → иначе `stage` → иначе `agent`.

## Gates / builds
- Гейты пройдены (в т.ч. через pre-commit hooks):
  - `./scripts/check-architecture.sh`
  - `npx ultracite check`
  - `npx ts-prune`
  - `npx jscpd --threshold 3 ...`
  - `npm run check:links`
  - таргетная сборка: `npm run build:core`
- Собран patch‑релиз `1.1.602`:
  - `./scripts/build-all.sh --allow-dirty` (version bump)
  - `./scripts/build-release.sh --use-current-version --allow-dirty` (VSIX)

## Release artefacts (1.1.602)
- VSIX: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.1.602.vsix`
- Tarballs (release cache): `/Users/oleksandroliinyk/.codeai-hub/releases/*-1.1.602.tar.bz2`
- Tarballs (repo copy): `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/tmp/releases/*-1.1.602.tar.bz2`

## Files changed (entry points)
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/packages/core/src/remote-bridge/handlers/session-request-handler.ts`
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/TODO/todo-plan.md`

## Git commits
(ВАЖНО: по этим коммитам восстанавливаем контекст через `git show`)
- `14bc2096 fix(core): reuse dialogId for provider session resumes`
- `ce127f74 docs(flow): clarify dialogId role derivation`
- `7566aba3 chore(release): build-all for next patch`
- `ac8733a8 docs(todo): record patch release build (1.1.602)`
- `07049711 docs(todo): finalize release plan status (1.1.602)`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/Sessions/Session055.md` (THIS REPORT)
2. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/TODO/todo-plan.md` (Phase 185/186)
3. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`

## Manual test plan
1. Открыть Reviewer (description) → довести до rollover (порог окна).
2. После rollover сделать новый turn.
3. Проверить, что:
   - не создаётся новый `<newDialogId>.jsonl`;
   - дописывание идёт в исходный `<dialogId>.jsonl`;
   - continuity chain остаётся в исходной папке `<dialogId>/chain.json`.
4. Для Description writer (без `runSlug`): убедиться, что новый `dialogId` заканчивается на `-description`, а не `-agent`.
