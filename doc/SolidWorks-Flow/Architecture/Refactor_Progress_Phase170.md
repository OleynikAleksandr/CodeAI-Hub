# Refactor Progress — Phase 170 (PM: dialog restore via history)

**Date:** 2026-02-14
**Branch:** codex/phase156-unified-agent-dialog
**Status:** DONE (Phase 170 закрыта, Phase 171 остаётся)

Source of Truth:
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`

---

## 1) Цель Phase 170

Стабильно открыть диалог агентной "бесконечной" сессии в Project Manager после рестарта Core (и при пустом runtime session list), используя:
- `dialog:list` для нахождения актуального `dialogId`;
- `dialog:history` для реплея истории из накопительного JSONL;
- клики по дереву (узел `Reviewer <provider>`) должны инициировать открытие диалога независимо от наличия runtime-сессии.

---

## 2) Что сделано

### 2.1 PM WS протокол dialog:* (api + types)
- Добавлены типы `dialog:list/open/history/send` и входящие события `dialog:*:result` + `dialog:message` для Project Manager.
- В `ProjectManagerApi` добавлен namespace `api.dialogs.*` для отправки dialog-команд.

### 2.2 Persistence store (подготовка)
- Добавлен минимальный `localStorage` store для `dialogId`:
  - `openDialogIds[]`
  - `activeDialogId`
  - `treeBindings` (nodeKey -> dialogId)

Примечание: интеграция store в UI (автовосстановление открытых вкладок при холодном старте PM) оставлена на следующий проход, сейчас ключевой фокус был на восстановлении по клику после рестарта Core.

### 2.3 Дерево PM: клик открывает dialog intent
- Узел `Reviewer <provider>` теперь диспатчит `pm:dialog:open` (intent), а не `pm:session:resume`.

### 2.4 Session Panel: dialog:list + dialog:history
- Выполнен рефакторинг `ProjectManagerSessionView`:
  - runtime-реализация вынесена в `ProjectManagerRuntimeSessionView`;
  - добавлен `ProjectManagerDialogSessionView`, который:
    - получает intent (`pm:dialog:open`),
    - запрашивает `dialog:list`,
    - резолвит подходящий `dialogId` по `stage/providerId/providerSessionId`,
    - запрашивает `dialog:history`,
    - отображает восстановленный диалог.

Примечание: в Phase 170 диалоговый режим намеренно сделан read-only (input заблокирован), чтобы не смешивать это с Phase 171 (send/live).

---

## 3) Коммиты Phase 170

- `6bc726d9 feat(pm): add dialog WS commands to api`
- `296d386d feat(pm): persist dialog tabs by dialogId`
- `a0285526 feat(pm): tree click opens dialog intent`
- `881f113d refactor(pm): extract runtime session view`
- `c8b24fd7 feat(pm): restore dialogs via dialog history after core restart`

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

## 5) Ограничения / что осталось

Остаётся Phase 171:
- `dialog:send` (отправка по `activeDialogId`)
- live `dialog:message` -> merge в snapshots (через dedupe)
- снять read-only блокировку ввода в dialog view

Дополнительно (не блокирует):
- интегрировать `dialog-tabs-store` для cold start/restore без клика.
