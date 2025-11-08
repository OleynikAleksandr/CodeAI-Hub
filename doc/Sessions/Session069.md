# Session 069 — Sticky keepalive для core и релиз 1.1.167

**Дата:** 9 ноября 2025 — Madrid (UTC+1) 11:00 – 13:10  
**Ветка:** main  
**Версия:** 1.1.166 → 1.1.167

## Обязательные документы
- `doc/Architecture/Architecture.md`
- `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
- `doc/TODO/todo-plan.md`
- `doc/TODO/todo-critical.md`

## Что произошло
- Обновил critical-план: sticky keepalive/auto-restart задачи отмечены как IN_PROGRESS, зафиксирован отдельный коммит.
- Реализовал `CoreKeepAlive` + события в `CoreProcessManager`, обновил webview provider и команду запуска лаунчера, чтобы любой UI удерживал ядро и автоматически перезапускал его при падениях.
- Обновил README, Architecture/SystemArchitecture, todo-plan, CHANGELOG; собрал полный релиз через `./scripts/build-all.sh`, получил артефакты 1.1.167 (VSIX, core, launcher, provider tarballs) и закоммитил `feat: v1.1.167 - sticky keepalive`.

## Git commits
- `d1bbeb6` — feat: v1.1.167 - sticky keepalive
- `330b2c7` — feat: add extension core keepalive
- `c79909b` — docs: refresh critical todo plan

## Планы на следующую сессию
1. Завершить оставшиеся задачи по владению портом: проверка `/api/v1/health`, аккуратное выключение устаревших процессов и предупреждения при чужих службах на 8080.
2. Расширить launcher flow: sticky keepalive/auto-restart на macOS клиенте и синхронизация статуса с VSIX.
3. Приступить к следующему блоку из `doc/TODO/todo-critical.md` — деградация провайдеров и валидация Unified Session slug.
