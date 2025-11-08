# Session 072 — Core reuse & VSIX 1.1.170

**Дата:** 9 ноября 2025 — Madrid (UTC+1) 17:35 – 19:10  
**Ветка:** main  
**Версия:** 1.1.169 → 1.1.170

## Обязательные документы
- `doc/Architecture/Architecture.md`
- `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
- `doc/TODO/todo-plan.md`
- `doc/TODO/todo-critical.md`

## Что произошло
- Добавил проброс существующего ядра: VS Code при старте проверяет `/api/v1/health`, подключается к уже запущенному экземпляру (лаунчер) и запускает core только если явно попросили `Restart Core`.
- В extension-е появился отдельный модуль `core-log-path.ts`, а `CoreProcessManager` + `CorePortManager` теперь умеют отличать `match/mismatch` и не гасить живой процесс.
- Run `./scripts/build-all.sh` → релиз 1.1.170 (VSIX + core/launcher/providers). README/CHANGELOG/todo-plan обновлены, добавлен отчёт.

## Git commits
- `cd50dd3` — fix: reuse running core instead of restarting
- `feat: v1.1.170 - core reuse release` (будет добавлен следующим коммитом)

## Планы на следующую сессию
1. Реализовать детерминированное владение портом/lock (P0 plan).
2. Перенести sticky keepalive/idle grace в лаунчер.
3. Продолжить работу над изоляцией провайдеров и Unified Session slug.
