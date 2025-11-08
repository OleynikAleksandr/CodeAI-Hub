# Session 071 — Focus-stable keepalive и релиз 1.1.169

**Дата:** 9 ноября 2025 — Madrid (UTC+1) 15:05 – 17:30  
**Ветка:** main  
**Версия:** 1.1.168 → 1.1.169

## Обязательные документы
- `doc/Architecture/Architecture.md`
- `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
- `doc/TODO/todo-plan.md`
- `doc/TODO/todo-critical.md`

## Что произошло
- Убрал `ensureStarted()` из webview lifecycle и перестал обновлять connection info, если порт не меняется, чтобы VS Code не перезапускал ядро при смене фокуса.
- В core добавлен idle grace timer (`shutdownGracePeriodMs`): orchestrator ждёт перед `idle` shutdown, так что краткие разрывы websocket’ов не гасят процесс.
- Прогнал `./scripts/build-all.sh`, выпустил 1.1.169 (VSIX + tarball’ы), обновил README/CHANGELOG/архитектуру/план и задокументировал подход.

## Git commits
- `b2d8ef3` — fix: keep core running across ui focus changes
- `f82b9b4` — feat: v1.1.169 - focus-stable keepalive

## Планы на следующую сессию
1. Реализовать детерминированное владение портами/lock (см. `doc/TODO/todo-critical.md`).
2. Привести лаунчер к тем же sticky keepalive правилам.
3. Перейти к задачам по изоляции провайдеров и Unified Session slug.
