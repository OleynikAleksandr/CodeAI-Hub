# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Audit_Cleanup_1.2.10.md`
- **Read this context before implementation:**
  - `doc/Sessions/Session043.md` (1.2.9 closeout; audit-findings дискуссия)
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (для C-финального SSOT-апдейта об acceptable duplication)
  - `doc/SolidWorks-WorkFlow/Docs_Index.md` (A: template paths fix; D: index update)
  - `knip.json` (A: exclusion review)
  - `packages/agents/spec-creator/src/` (A: TODO source check)
  - `assets/localization/source/en/ui_labels.json` / `ui_helper_text.json` / `messages_for_the_user.json` / `artifacts_for_the_user.json` (B: approved dicts cleanup)
  - `src/client/project-manager/components/settings/use-project-manager-settings.ts` + `src/client/ui/src/components/settings/use-settings-state.ts` (C1: bootstrap hook)
  - `packages/core/src/remote-bridge/handlers/workspace-file-service.ts` (C2: within-file DRY)
  - `src/client/ui/src/services/idea-collector-schema-utils.ts` + `packages/agents/shared/src/schema-utils/schema-normalizer.ts` + `schema-strictifier.ts` (C3: consolidation)
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждая подзадача затрагивает не более 3 файлов.
- Каждая подзадача оформляется парой: (1) изменения, (2) `Git Commit: ...`.
- Gates автоматически через Husky (`.husky/pre-commit` + `.husky/pre-push`). Таргетные сборки — перед закрытием Stream.
- Real-time документация: обновляем `doc/SolidWorks-WorkFlow/*` в том же коммите что и код.
- Phase завершается на чистом дереве через `./scripts/build-all.sh` (последний Stream).

## Phase 1 — Audit Cleanup 1.2.10 (owner: Claude, updated: 2026-04-17)

### Stream 1: Release notes pre-bump to 1.2.10
1. [DONE] Обновить `README.md` (Current Release → v1.2.10, 1.2.9 → "(previous)") и `CHANGELOG.md` ([1.2.10] секция с Changed/Fixed описывающая audit cleanup) — scope: 2 файла; ожидаемый commit: `docs: prepare 1.2.10 release notes for audit cleanup`
2. [DONE] Git Commit: `docs: prepare 1.2.10 release notes for audit cleanup` (hash: a84a43490)

### Stream 2: Direction A — Docs + config fix
1. [DONE] Определить актуальную структуру `.codeai-hub/` templates. **Вердикт после расследования:** три audit-flag'a не являются code bug'ами. (1) Docs_Index:80-82 bundled-template paths корректны — они описывают `destinationRelativePath` в `bundled-templates.ts`. Расширили секцию списком per-workspace instances чтобы не путаться. (2) knip.json exclusion для diagram-dsl parsers — intentional: chain используется только через `diagram-editor-facade.test.tsx`. Оставляем. (3) TODO в `spec-creator/dist/*.d.ts` — чужой published пакет, нет `src/`. Not actionable. README/CHANGELOG обновлены с правильным описанием Direction A outcome. — scope: 3 файла (Docs_Index, README, CHANGELOG); ожидаемый commit: `chore: direction A audit verification — document bundled vs per-workspace template layers`
2. [DONE] Git Commit: `chore: direction A audit verification — document bundled vs per-workspace template layers` (hash: 237fa47b8)

### Stream 3: Direction B dry-run — localization keys partial-usage verification
1. [DONE] Script `/tmp/audit-loc-keys.py` проходит по всем 278 ключам из 4 approved dicts (`ui_labels.json`, `ui_helper_text.json`, `messages_for_the_user.json`, `artifacts_for_the_user.json`). Для каждого ключа три этапа: (a) exact match через `rg -F`, (b) parent-prefix match, (c) last-segment match. Исключаем `assets/localization/`, `dist/`, `**/*.json`, `doc/`, `node_modules`. **Результат: 204 alive, 67 suspicious, 7 certainly-dead.** Agent'ская исходная оценка "99 unused" включала dynamic-usage false positives; реальный actionable scope — только 7 ключей. Отчёт: `doc/SolidWorks-WorkFlow/Plans/Audit_Cleanup_1.2.10_DryRun_LocKeys.md`. — scope: 1 файл (новый md); ожидаемый commit: `docs: record 1.2.10 localization cleanup dry-run report`
2. [DONE] Git Commit: `docs: record 1.2.10 localization cleanup dry-run report` (hash: TBD)

### Stream 4: Direction B actual deletion — approved dicts cleanup
1. [TODO] По результатам Stream 3 dry-run удалить все certainly-dead ключи из 4 approved source-файлов. Прогнать webview targeted build (`npm run build:webview`) + визуально проверить PM/Settings UI (через `Launch Web Client` если доступно) на отсутствие регрессий по отображению текстов. — scope: до 4 файлов (4 json); ожидаемый commit: `chore(loc): remove confirmed-dead localization keys from approved dicts`
2. [TODO] Git Commit: `chore(loc): remove confirmed-dead localization keys from approved dicts` (hash: TBD)

### Stream 5: Direction C1 — useBootstrapSettings extract
1. [TODO] Создать `src/client/shared/hooks/use-bootstrap-settings.ts` (новый файл) с общей логикой bootstrap settings builder. Переключить `src/client/project-manager/components/settings/use-project-manager-settings.ts` и `src/client/ui/src/components/settings/use-settings-state.ts` на импорт из нового helper-а; удалить локальные копии. — scope: 3 файла; ожидаемый commit: `refactor(client): extract useBootstrapSettings to shared hook`
2. [TODO] Git Commit: `refactor(client): extract useBootstrapSettings to shared hook` (hash: TBD)

### Stream 6: Direction C2 — workspace-file-service DRY
1. [TODO] В `packages/core/src/remote-bridge/handlers/workspace-file-service.ts`: ввести локальную фабрику `createWorkspaceFileHandler(parsePayload, handler)` которая генерирует request-handler; переиспользовать её для workspace-file-read и workspace-file-write. — scope: 1 файл; ожидаемый commit: `refactor(core): DRY workspace-file-service handlers via createWorkspaceFileHandler factory`
2. [TODO] Git Commit: `refactor(core): DRY workspace-file-service handlers via createWorkspaceFileHandler factory` (hash: TBD)

### Stream 7: Direction C3 — schema-utils consolidation
1. [TODO] В `src/client/ui/src/services/idea-collector-schema-utils.ts` удалить локальные копии `pruneSchemaKeys`/`sanitizeSchemaProperties`/`sanitizeSchemaItems`/`sanitizeSchemaKeywords` и `schema-strictifier`-логики; импортировать из `@codeai-hub/agents-shared` (либо через правильный package-alias, либо через relative путь если пакет не экспортирует). Проверить что types совпадают и нет missing re-exports в `packages/agents/shared/src/schema-utils/index.ts`. — scope: ≤3 файла; ожидаемый commit: `refactor(client): consolidate schema-utils imports from agents/shared`
2. [TODO] Git Commit: `refactor(client): consolidate schema-utils imports from agents/shared` (hash: TBD)

### Stream 8: Direction D — PeriodicAudit checklist
1. [TODO] Создать `doc/SolidWorks-WorkFlow/Checklists/PeriodicAudit.md` — чек-лист периодического аудита: когда запускать (каждые 3-5 релизов), какие sub-agents использовать (dead code + broken links + duplication), формат отчёта, как принимать решения (extract vs legit), ссылка на текущий 1.2.10 как reference precedent. Обновить `doc/SolidWorks-WorkFlow/Docs_Index.md` — добавить entry о новом checklist'е. — scope: 2 файла; ожидаемый commit: `docs: add PeriodicAudit checklist for recurring codebase hygiene`
2. [TODO] Git Commit: `docs: add PeriodicAudit checklist for recurring codebase hygiene` (hash: TBD)

### Stream 9: SSOT promotion + planning archive
1. [TODO] В `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` добавить Invariant о "Acceptable parallel-scaffolding duplication" — ~200 клонов в parallel provider modules (Claude/Codex/Gemini) + client↔core boundary mirrors считаются acceptable, рефакторить такие клоны НЕ следует (потеря модульной изоляции > gain по LOC). Fix правила применимы только к within-module / cross-domain клонам. — scope: 1 файл; ожидаемый commit: `docs: promote acceptable-duplication invariant to SSOT`
2. [TODO] Git Commit: `docs: promote acceptable-duplication invariant to SSOT` (hash: TBD)
3. [TODO] Planning-doc `Audit_Cleanup_1.2.10.md` из `Plans/` → `Plans/Archive/`; обновить `Docs_Index.md` entry. — scope: 2 файла; ожидаемый commit: `docs: archive 1.2.10 audit cleanup planning doc`
4. [TODO] Git Commit: `docs: archive 1.2.10 audit cleanup planning doc` (hash: TBD)

### Stream 10: Release build 1.2.10
1. [TODO] Verify чистое дерево, запустить `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version`; VSIX `codeai-hub-1.2.10.vsix` в корне + tarballs в `doc/tmp/releases/` и `~/.codeai-hub/releases/`.
2. [TODO] Git Commit: `chore: bump version to 1.2.10 for audit cleanup release` (hash: TBD)
3. [TODO] Archive todo-plan в `doc/TODO/Archive/todo-plan-1.2.10-audit-cleanup.md`; reset `doc/TODO/todo-plan.md` к empty-scope placeholder; commit `docs: close 1.2.10 todo-plan after build`.
4. [TODO] Git Commit: `docs: close 1.2.10 todo-plan after build` (hash: TBD)
