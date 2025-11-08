# Session 073 — Outdated core shutdown и релиз 1.1.171

**Дата:** 9 ноября 2025 — Madrid (UTC+1) 19:15 – 21:00  
**Ветка:** main  
**Версия:** 1.1.170 → 1.1.171

## Обязательные документы
- `doc/Architecture/Architecture.md`
- `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
- `doc/TODO/todo-plan.md`
- `doc/TODO/todo-critical.md`

## Что произошло
- Исправил lifecycle VS Code: при старте проверяем `/api/v1/health`, и если ядро уже запущено (та же версия) — просто подключаемся; если версия устарела (наша), запрашиваем `/shutdown`/kill по PID и запускаем свежую на том же порту; чужие процессы остаются нетронутыми (переходим на следующий порт).
- Вынес helper’ы (`core-workspace.ts`, `core-port-candidates.ts`), чтобы соблюсти лимиты по размеру файлов.
- Прогнал `./scripts/build-all.sh`, получил релиз 1.1.171 (VSIX + tarball’ы); README/CHANGELOG/todo-plan обновлены.

## Git commits
- `7209735` — fix: stop outdated cores before launching
- `feat: v1.1.171 - outdated core shutdown` (текущий коммит)

## Планы на следующую сессию
1. Реализовать детерминированное владение портом/lock (P0).
2. Добавить sticky keepalive/idle grace в лаунчер.
3. Переключиться на блок Isolation + Unified Session.
