# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стримов), в каждом Стриме — некоторое кол-во подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Если по факту разработки оказывается, что конкретная подзадача Stream затрагивает больше 3 файлов — такая задача должна быть разбита на более мелкие и список задач в Стриме переписывается.
- **Gates**: после выполнения каждой подзадачи прогоняется Гейт Качества:
  - `scripts/check-architecture.sh`
  - `npx ultracite check`
  - `npx ts-prune`
  - `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`
  - `npm run check:links`
  - Таргетная сборка: `npm run build:project-manager`
- **Commit**: После зелёных гейтов — Git Commit с релевантным описанием и апдейт `todo-plan.md` (дата, статус, хеш).
- **Real-time Документация**: Любое изменение архитектуры/логики требует синхронного обновления документации **ДО** коммита.
- **Phase завершается**: `./scripts/build-all.sh` → `./scripts/build-release.sh --use-current-version` → tarball'ы в `doc/tmp/releases/` → отчёт в `doc/Sessions/`.

---
