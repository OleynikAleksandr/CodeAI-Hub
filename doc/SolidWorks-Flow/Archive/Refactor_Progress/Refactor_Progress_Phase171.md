# Refactor Progress — Phase 171 (PM: send + live stream via dialogId)

**Date:** 2026-02-14
**Branch:** codex/phase156-unified-agent-dialog
**Status:** DONE (Phase 171 закрыта, Phase 172 остаётся)

Source of Truth:
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`

---

## 1) Цель Phase 171

Сделать диалоговый режим PM полнофункциональным:
- отправка пользовательского сообщения через `dialog:send` по `dialogId` (без зависимости от runtime sessionId);
- приём live-событий `dialog:message` и merge в snapshots с dedupe;
- корректное поведение при рестарте Core (reconnect + повторный replay истории не дублирует сообщения).

---

## 2) Что сделано

### 2.1 Send via dialogId
- В `ProjectManagerDialogSessionView` включена отправка через `api.dialogs.sendDialogMessage(...)`.
- На входе intent (`pm:dialog:open`) выполняется `workspace:select`, чтобы Core принял `dialog:*` команды даже после cold start / после рестарта.

### 2.2 Live stream by dialogId
- `ProjectManagerDialogSessionView` слушает `dialog:message` и добавляет сообщения в текущий диалог через `appendDedupedSessionMessageToSnapshots`.
- Добавлена обработка `dialog:send:ack` (rejected) с выводом системного сообщения в диалог.

---

## 3) Коммиты Phase 171

- `83b773a2 feat(pm): send via dialogId`
- `7ac94d51 feat(pm): live dialog stream by dialogId`

(Плюс служебные commits для обновления `doc/TODO/todo-plan.md`.)

---

## 4) Проверки (gates)

На каждом микро‑шаге прогонялись:
- `./scripts/check-architecture.sh`
- `npx ultracite check`
- `npx ts-prune`
- `npx jscpd ...`
- `npm run check:links`
- `npm run build:project-manager`

---

## 5) Что осталось

Phase 172:
- прогнать quality gates на чистом дереве;
- `./scripts/build-all.sh` (поднимет версии, соберёт артефакты);
- `./scripts/build-release.sh --use-current-version` (VSIX).
