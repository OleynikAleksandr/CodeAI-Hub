# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед работой по этому scope открыть: `AGENTS.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/Sessions/Session153.md`
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`
- Каждая микро-задача должна затрагивать не более 3 файлов; если scope разрастается, stream нужно дробить заново
- Husky gates не обходить (`--no-verify` запрещен)
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита
- Перед закрытием stream выполнять таргетные проверки затронутых пакетов/клиентов
- После закрытия release stream: выполнить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, записать результаты в `doc/Sessions/`

---

## Phase 58 — Diagram Modules: purge "module-inventory" naming from agent assets, templates and pipeline (owner: Oleksandr, updated: 2026-03-24)

**Motivation:** В Phase 57 мы удалили `module-inventory.md` как артефакт и aggregate pipeline, но имена файлов agent assets, bundled templates, runtime paths и prompt контент всё ещё содержат "module-inventory". Это вызывает:
- stale ссылки в prompt, из-за которых LLM галлюцинирует "следующие шаги" (Diagram Facades) и `module-inventory.md` как живой артефакт;
- конфликт форматов: `module-inventory-field-reference.md` описывает старый flat формат, а `product-part-template.md` — новый табличный;
- отсутствие guardrails по гранулярности (Codex: 38 модулей, Claude: 22);
- шум на диске: 4 файла с prefix "module-inventory" в templates.

**Scope:** Переименование всех agent assets `module-inventory-*` → `diagram-modules-*`, удаление старого template, rewrite промпта и references, обновление всей pipeline от generate-bundled-templates до UI help text.

### Stream 1: Rewrite content of agent assets (instructions + field reference + merge rules)

1. [DONE] **Rewrite prompt content.** Убраны все 6 упоминаний `module-inventory.md`, убраны "следующий шаг" references, добавлен Granularity Guardrail (3–8 модулей на PP, >10 = пере-декомпозиция, ≤5 = без кластеров), добавлено правило обновления Status → generated.
2. [DONE] Git Commit: `refactor(diagram-modules): purge module-inventory references and add granularity guardrails to prompt` (hash: 8ca62c77)

3. [DONE] **Rewrite field reference for staged format.** Убран старый flat inventory формат, оставлены семантические правила, примеры в табличном формате. Заголовок → "Diagram Modules Field Reference".
4. [DONE] Git Commit: `refactor(diagram-modules): rewrite field reference for staged product-part format` (hash: a95769cd)

5. [DONE] **Rewrite merge rules.** Заменена терминология "inventory" → "staged artifacts" / "product part files". Заголовок → "Diagram Modules Merge Rules".
6. [DONE] Git Commit: `refactor(diagram-modules): update merge rules terminology from inventory to staged artifacts` (hash: 8fd6ed91)

### Stream 2: Rename agent asset files + delete old template

7. [DONE] **Rename agent asset files.** `module-inventory-prompt.md` → `diagram-modules-prompt.md`, `module-inventory-field-reference.md` → `diagram-modules-field-reference.md`, `module-inventory-merge-rules.md` → `diagram-modules-merge-rules.md`. Удалён `module-inventory-template.md`.
8. [DONE] Git Commit: `refactor(diagram-modules): rename agent assets from module-inventory to diagram-modules` (hash: 919aed66)

### Stream 3: Update bundled templates + template sync pipeline

9. [DONE] **Update generate-bundled-templates.js.** Source/dest paths обновлены, entry для module-inventory-template удалён. `bundled-templates.ts` перегенерирован (9 templates, было 10).
10. [DONE] Git Commit: `refactor(build): update bundled template paths from module-inventory to diagram-modules` (hash: 811006c0)

11. [DONE] **Update template-sync-service.** 4 старых пути добавлены в `LEGACY_TEMPLATE_RELATIVE_PATHS`. Тесты обновлены.
12. [DONE] Git Commit: `refactor(templates): add old module-inventory paths to legacy cleanup and update tests` (hash: bde48c52)

### Stream 4: Update runtime path references

13. [DONE] **Update prompt assembly paths.** `diagram-contract-prompt-assets.ts` и `idea-contract-service.ts` обновлены на новые имена.
14. [DONE] Git Commit: `refactor(core): update diagram prompt assembly paths to diagram-modules naming` (hash: 70b4a4e9)

15. [DONE] **Update contract service test.** Template id references обновлены.
16. [DONE] Git Commit: `test(core): update diagram stage test for renamed templates` (hash: 9d8d7ea2)

### Stream 5: Rename parser + update runtime validation

17. [DONE] **Rename parser file.** `module-inventory-parser.ts` → `diagram-modules-parser.ts`. Imports обновлены.
18. [DONE] Git Commit: `refactor(core): rename module-inventory-parser to diagram-modules-parser` (hash: 8564fcc7)

19. [DONE] **Rename validation symbols.** `MODULE_INVENTORY_TITLE_RE` → `DIAGRAM_MODULES_TITLE_RE`, `validateModuleInventoryMarkdown` → `validateDiagramModulesMarkdown`, `MODULE_INVENTORY_MARKDOWN` → `PRODUCT_PART_MARKDOWN`.
20. [DONE] Git Commit: `refactor(core): rename module-inventory validation symbols to diagram-modules` (hash: 16242a08)

### Stream 6: Update UI + remaining references

21. [DONE] **Update help text + remaining test.** `diagram-modules-help.tsx` и `prompt-pack-builder.virtual-simulation.test.ts` обновлены.
22. [DONE] Git Commit: `refactor(ui): update diagram-modules help text and test paths for renamed templates` (hash: 3c0395c0)

### Stream 7: Verification + documentation sync

23. [DONE] **Diagnostic build.** `npm run build --workspace packages/core` и `npm run build:webview` — оба проходят чисто, нет broken references.
24. [SKIP] Нет compilation issues — коммит не нужен.

25. [TODO] **Documentation sync.** Обновить `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` если есть упоминания module-inventory file names. Обновить CHANGELOG.md.
26. [TODO] Git Commit: `docs(architecture): sync diagram-modules template naming in documentation` (hash: TBD)

### Stream 8: Release build

27. [TODO] `./scripts/build-all.sh` → version bump + full build
28. [TODO] `./scripts/build-release.sh --use-current-version` → VSIX
29. [TODO] Session report + todo-plan finalization
