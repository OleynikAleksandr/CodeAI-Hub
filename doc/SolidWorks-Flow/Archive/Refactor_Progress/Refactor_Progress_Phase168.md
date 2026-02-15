# Phase 168 Progress Report — Core: continuity chain + history + index.json

**Date:** 2026-02-14 (CET)

**Architecture (source of truth):**
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`

## Goal (Phase 168)
Подготовить Core к `dialogId-first` архитектуре:
- continuity chain хранит стабильный ключ диалога,
- unified-session история пишется в один накопительный файл,
- есть быстрый реестр `continuity/index.json` для будущего `dialog:list`.

## What Was Implemented
1. **continuity chain поддерживает `dialogId` (backward compatible)**
- В `chain.json` добавлено поле `dialogId` (пока по умолчанию равно `rootSessionId`, чтобы старые chain’ы продолжали читаться).

2. **Core-only writer plumbing для будущего `<dialogId>.jsonl`**
- Добавлен helper для вычисления `workspaceKey` из абсолютного пути.
- Добавлен `DialogHistoryWriter` (обертка над `UnifiedSessionWriter`) как будущая точка записи истории по ключу `(workspaceKey, providerId, dialogId)`.

3. **Стабилизация continuity root на rollover + pin unified-session history id**
- В `SessionRequestHandler` закрепили continuity root для всех sessions в пределах цепочки rollover.
- unified-session `historySessionId` теперь привязан к continuity root (один накопительный файл на цепочку), и `description-step` ref (`jsonlPath`) пишет путь к этому накопительному файлу.

4. **continuity/index.json registry**
- Добавлен `packages/core/src/session-continuity/index-registry.ts`.
- `ContinuityChainStore.save()` теперь обновляет `continuity/index.json` при сохранении chain.

## Git Commits (Phase 168)
- `48a5ad47 feat(core): add dialogId to continuity chain`
- `3f210d69 feat(core): add dialog history writer + workspace key`
- `9a07ae85 feat(core): write continuity index.json on chain save`
- `36467297 fix(core): keep continuity root stable across rollovers`

## Notes / Known Gaps
- В этой фазе `dialogId` еще не стал каноническим UI-ключом (как basename `~/.codeai-hub/sessions/.../<dialogId>.jsonl`). Сейчас он default’ится к `rootSessionId` и служит переходным мостом.
- `dialog:*` API (`dialog:list/open/history/send` + live `dialog:message`) и полный переход PM на `dialogId` будут реализованы в следующих фазах.

## Next (Phase 169)
- Реализовать Core Bridge `dialog:*` handlers и live event по `dialogId`, опираясь на `continuity/index.json` и `chain.json`.
