# Session 070 — VSIX hotfix для CoreKeepAlive и релиз 1.1.168

**Дата:** 9 ноября 2025 — Madrid (UTC+1) 13:20 – 15:00  
**Ветка:** main  
**Версия:** 1.1.167 → 1.1.168

## Обязательные документы
- `doc/Architecture/Architecture.md`
- `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
- `doc/TODO/todo-plan.md`
- `doc/TODO/todo-critical.md`

## Что произошло
- Исправил `.vscodeignore`, чтобы включать `node_modules/ws` в VSIX; без этого `CoreKeepAlive` не загружался и extension падал сразу при активации.
- Прогнал полный `./scripts/build-all.sh`, получил релиз 1.1.168 и убедился, что в `codeai-hub-1.1.168.vsix` действительно лежит `extension/node_modules/ws/**` (проверено через `unzip -l`).
- Обновил README/CHANGELOG/todo-plan/todo-critical, зафиксировал hotfix-коммит `feat: v1.1.168 - keepalive hotfix`.

## Git commits
- `f67d950` — fix: bundle ws runtime dependency
- `71d8c8e` — feat: v1.1.168 - keepalive hotfix

## Планы на следующую сессию
1. Завершить детерминированное владение портом и shutdown flow по `/api/v1/health`.
2. Проверить launcher keepalive/auto-restart и синхронизировать с VSIX.
3. Приступить к задачам из блоков «Изоляция провайдеров» и «Unified Session».
