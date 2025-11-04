# Session 050 — Raw SDK logging release

**Дата:** 4 ноября 2025 — Madrid (UTC+1)
**Время:** 12:20 – 14:05
**Ветка:** main
**Версии:** 1.1.130 → 1.1.132

---

## Артефакты, обязательные к изучению
- `README.md` (Current Release — v1.1.132)
- `CHANGELOG.md` (entries up to 1.1.132)
- `doc/Architecture/Architecture.md`
- `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
- `doc/Project_Docs/UnifiedSessionArchitecture.md`
- `doc/TODO/todo-plan.md`

## Что сделано
1. Обновлены логгеры провайдеров: файлы теперь называются `sdk-<provider>-<sessionId>.jsonl` и содержат только сырые SDK события без дублирования `assistant/system/result`.
2. Уточнили архитектурные документы под новое разделение логов (сырой `sdk-*`, будущий `norm-*`).
3. Собрали полный релиз `v1.1.132` через `./scripts/build-all.sh`, обновили README/CHANGELOG и манифесты артефактов.

## Текущее состояние
- Ветка `main` содержит релиз `1.1.132`; артефакты пересобраны и версии синхронизированы.
- Провайдерские JSONL файлы фиксируют только исходный SDK поток, что упрощает будущую нормализацию.

## Проблемы / Блокеры
- Исследование SDK стримов (Phase 1 todo-plan) всё ещё не начато; требуется выделить время на сбор матрицы событий.

## План на следующую сессию
1. Завершить Phase 1 из `doc/TODO/todo-plan.md`: собрать логи Claude/Codex/Gemini и оформить event matrix.
2. Подготовить draft формата JSONL v1 и описания mapping для враперов.
3. Спроектировать стратегию записи `norm-*` файлов перед началом Phase 2.

## Git commits
- e4ec3b8 — feat: v1.1.132 - raw sdk log streams
- 98158f5 — fix: provider logs capture raw sdk stream
