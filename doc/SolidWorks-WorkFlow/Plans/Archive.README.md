# Plans/Archive

Историческое хранилище planning-доков для уже закрытых execution cycles.

## Структура

`Plans/Archive/` — flat-директория `.md` файлов. Каждый завершённый planning-док переносится сюда без сжатия, чтобы оставаться доступным через обычный `cat` / `Read` / `grep` без распаковки.

## Когда переносить planning-док в Archive

Когда соответствующий execution cycle закрыт И planning-док не превратился в живой SSOT (`System/` / `Clusters/` / `Modules/` / `Contracts/`). См. `doc/SolidWorks-WorkFlow/Plans/README.md` §4.

## Как переносить

```bash
git mv doc/SolidWorks-WorkFlow/Plans/<CompletedPlan>.md \
       doc/SolidWorks-WorkFlow/Plans/Archive/<CompletedPlan>.md
```

Затем обновить `doc/SolidWorks-WorkFlow/Docs_Index.md` — заменить запись в active section на запись в archived section с описанием, в каком релизе план был закрыт и где сейчас живёт canonical SSOT.

## Историческая заметка

В Session 025 (2026-04-09) старый набор archived plans был временно сжат в `Archive.zip`, чтобы убрать grep-fallout из dead-code/dead-links аудитов. Сжатый snapshot устарел уже к Session 028 (2026-04-29), когда количество archived plans значительно превысило содержимое zip. С этого момента zip-based pipeline отменён и единственный поддерживаемый путь — flat-директория `Archive/`.

## Доступ к старому zip-snapshot'у

Содержимое `Archive.zip` полностью покрывается текущими `.md` файлами в `Archive/`. Если по какой-то причине нужна именно старая версия конкретного файла, она доступна через git history:

```bash
git log --all --follow -- doc/SolidWorks-WorkFlow/Plans/Archive/<filename>.md
```
