# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед работой по этому scope открыть: `AGENTS.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/Sessions/Archive/Session153.md`
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`
- Каждая микро-задача должна затрагивать не более 3 файлов; если scope разрастается, stream нужно дробить заново
- Husky gates не обходить (`--no-verify` запрещен)
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита
- Перед закрытием stream выполнять таргетные проверки затронутых пакетов/клиентов
- После закрытия release stream: выполнить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, записать результаты в `doc/Sessions/`

---

## Phase 59 — Post-release cleanup + UX improvements for Diagram Modules (owner: Oleksandr, updated: 2026-03-24)

### Stream 1: Rename stale parser symbols

1. [DONE] **Rename parser internals.** В `diagram-modules-parser.ts`: `INVENTORY_TITLE_RE` → `DIAGRAM_MODULES_LEGACY_TITLE_RE`, `parseModuleInventoryDsl` → `parseDiagramModulesDsl`. В `diagram-modules-staged-part-parser.ts`: `INVENTORY_TITLE_RE` → `DIAGRAM_MODULES_LEGACY_TITLE_RE`. (scope: 2 файла)
2. [DONE] Git Commit: `refactor(core): rename stale inventory parser symbols to diagram-modules naming` (hash: TBD)

### Stream 2: UX / graph format improvements (pending user feedback from 1.1.789 testing)

(Зарезервировано для Phase 59 — UX/формат графа в Project Manager + React Flow)
