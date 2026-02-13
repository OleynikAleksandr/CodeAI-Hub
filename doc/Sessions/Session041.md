# Session 041 — Unified Agent Dialog JSONL (UI History Survives Core Restarts)

**Date:** 2026-02-13 17:19 (CET)
**Branch:** codex/phase156-unified-agent-dialog
**Version:** 1.1.585

---

# 1. Work Done in This Session

## Work summary
- Зафиксирована причина потери истории сессии в UI после рестарта Core: `description-step.json` хранит `jsonlPath` на последний сегментный JSONL (`<providerSessionId>.jsonl`), поэтому UI грузит только “последний кусок”.
- Подтверждена текущая модель хранения unified-session: один JSONL на `providerSessionId` в `~/.codeai-hub/sessions/<workspaceKey>/<providerId>/<providerSessionId>.jsonl`.
- Выбран и утверждён новый контракт: один накопительный JSONL на “логический диалог агента” (переживает rollover/resume и рестарты Core) и работает одинаково для всех провайдеров.
- Собран релиз 1.1.585: VSIX `codeai-hub-1.1.585.vsix` в корне репозитория.
- Tarball артефакты: `doc/tmp/releases/*-1.1.585.tar.bz2` и `~/.codeai-hub/releases/*-1.1.585.tar.bz2`.


## Git commits
- `65463ea6 docs(core): agent dialog JSONL storage contract`
- `8adacf55 feat(core): persist dialogSessionId in description step session ref`
- `1ec1105a chore(docs): add Session041 and phase156 plan`
- `c114e4a6 feat(core): support logical unified-session history id`
- `596ef852 chore(docs): update phase156 progress`
- `0f2ee300 fix(core): stable dialog jsonl for description sessions with backfill`
- `5629bed8 chore(docs): update phase156 progress`
- `e0d54a48 chore(release): build-all for next patch`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/Sessions/Session041.md`
2. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/TODO/todo-plan.md`
3. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Stacks/CoreOrchestrator.md`

## Plans for next session
- Протестировать: несколько rollover/resume сегментов у Codex, затем рестарт Core, затем проверка, что UI показывает полный диалог из одного JSONL.
- Проверить backfill: при наличии нескольких `.../<providerSessionId>.jsonl` сообщения объединяются в `.../<dialogSessionId>.jsonl` без дублей по `messageId`.
- Решить, нужно ли расширять контракт `dialogSessionId` на другие flow-ноды/агенты (не только description reviewer).
