# Session 075 — Разделение ensure/attach и защита сценария лаунчера

**Дата:** 08 November 2025 — Madrid (UTC+0100) 20:02
**Ветка:** main
**Версия:** 1.1.171 → 1.1.171

## Обязательные документы
- `doc/Architecture/Architecture.md`
- `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
- `doc/TODO/todo-plan.md`
- `doc/TODO/todo-critical.md`

## Что произошло
- Добавил шаги `ensureLauncherDependencies` / `ensureCoreAndProviderComponents` и логику преподготовки, чтобы до запуска ядра и провайдеров всегда сначала пробовать присоединиться к уже активному core нужной версии.
- Расширил `CoreProcessManager`: отслеживание версии (`declaredVersion`), публичный `attachToRunningCore`, и обеспечение подключения без переустановки, плюс мануальный игнор правила `organizeImports`, чтобы команда видела явное расположение импортов.
- Прогнал `npm run compile`, убедился, что Biome/lefthook-проверки проходят, и зафиксировал фиксирующий коммит.

## Git commits
- `d8365e4` — `fix: attach to running core before reinstall`

## План на следующую сессию
1. Выполнить вечерний прогон сценария «лаунчер → VS Code», убедиться, что JSONL/сессии остаются и UI подключается к существующему core, зафиксировать ход и artefact.
2. По результатам прогона обновить документацию сценария (Session report / TODO) и при необходимости скорректировать `doc/TODO/todo-critical.md` (если найдутся новые риски).
