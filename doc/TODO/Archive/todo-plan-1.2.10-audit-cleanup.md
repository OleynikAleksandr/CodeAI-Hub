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
1. [DONE] Script `/tmp/audit-loc-keys.py` проходит по всем 278 ключам из 4 approved dicts (`ui_labels.json`, `ui_helper_text.json`, `messages_for_the_user.json`, `artifacts_for_the_user.json`). Для каждого ключа три этапа: (a) exact match через `rg -F`, (b) parent-prefix match, (c) last-segment match. Исключаем `assets/localization/`, `dist/`, `**/*.json`, `doc/`, `node_modules`. **Результат: 204 alive, 67 suspicious, 7 certainly-dead.** Исходная оценка "99 unused" включала dynamic-usage false positives; реальный actionable scope — только 7 ключей. Отчёт: `doc/SolidWorks-WorkFlow/Plans/Audit_Cleanup_1.2.10_DryRun_LocKeys.md`. — scope: 1 файл (новый md); ожидаемый commit: `docs: record 1.2.10 localization cleanup dry-run report`
2. [DONE] Git Commit: `docs: record 1.2.10 localization cleanup dry-run report` (hash: 8315cbcb8)

### Stream 4: Direction B actual deletion — approved dicts cleanup
1. [DONE] Удалили 7 certainly-dead ключей: 2 в `ui_labels.json` (`workflow_terms_policy.keep_english_label/translate_label`) + 5 в `ui_helper_text.json` (`do_not_translate_terms.validation.latin_letter/reserved_sequence/too_long` + `workflow_terms_policy.keep_english_description/translate_description`). Paranoid prefix-check не нашёл traces ни в одном non-legacy файле. `npm run build:webview` прошёл зелёным после удаления. 67 suspicious keys оставлены как есть. — scope: 2 файла; ожидаемый commit: `chore(loc): remove 7 certainly-dead localization keys from approved dicts`
2. [DONE] Git Commit: `chore(loc): remove 7 certainly-dead localization keys from approved dicts` (hash: 98a662b1d)

### Stream 5: Direction C1 — useBootstrapSettings extract
1. [DONE] `src/client/shared/hooks/use-bootstrap-settings.ts` создан; `use-project-manager-settings.ts` и `use-settings-state.ts` импортируют из нового helper; локальные копии удалены. `check:dup` 67→66 clones, 2.06% → 1.98% (на `src/`). — scope: 3 файла
2. [DONE] Git Commit: `refactor(client): extract useBootstrapSettings to shared hook` (hash: a41f14422)

### Stream 6: Direction C2 — workspace-file-service DRY
1. [DONE] `createWorkspaceFileHandler<TPayload>({ parsePayload, execute, errorLogMessage, errorResponse })` фабрика инлайн в `workspace-file-service.ts`; `handleWorkspaceFileRead` и `handleWorkspaceFileWrite` теперь — тонкие вызовы фабрики. Signature callers не меняется. `npm run build --workspace packages/core` clean. — scope: 1 файл
2. [DONE] Git Commit: `refactor(core): DRY workspace-file-service handlers via createWorkspaceFileHandler factory` (hash: 23fd8a874)

### Stream 7: Direction C3 — schema-utils consolidation
1. [DONE] `idea-collector-schema-utils.ts` с 181 до 44 строк: импорт `isRecord`+`normalizeSchema` из `packages/agents/shared/src/schema-utils`; локальный `injectTemplateIntoSchema` сохранён (client-specific hardcoded path). `normalizeIdeaCollectorSchema(schema, template)` API неизменно. `check:dup` 66→65 clones, 1.98% → 1.97%. — scope: 1 файл
2. [DONE] Git Commit: `refactor(client): consolidate schema-utils imports from agents/shared` (hash: 6e9368b54)

### Stream 8: Direction D — PeriodicAudit checklist
1. [DONE] Новый `doc/SolidWorks-WorkFlow/Checklists/PeriodicAudit.md` (95 строк): cadence, parallel audit-pass workflow, 6-категорийный rubric, three-pass grep протокол для loc keys, scope-approval flow, out-of-scope, track record с 1.2.10 precedent. `Docs_Index.md` получил новую секцию "Checklists". — scope: 2 файла
2. [DONE] Git Commit: `docs: add PeriodicAudit checklist for recurring codebase hygiene` (hash: 3e1f13a85)

### Stream 9: SSOT promotion + planning archive
1. [DONE] SystemArchitecture Invariant 29 `Acceptable parallel-scaffolding duplication` добавлен. Детализирует три LEGIT категории (PROVIDER/BOUNDARY/SIMILAR-BUT-DIVERGING) + fix-правила только для EXTRACT-*/WITHIN-FILE-BUG. — scope: 1 файл
2. [DONE] Git Commit: `docs: promote acceptable-duplication invariant to SSOT` (hash: aeccdc602)
3. [DONE] Planning-doc `Audit_Cleanup_1.2.10.md` + dry-run appendix `Audit_Cleanup_1.2.10_DryRun_LocKeys.md` перенесены в `Plans/Archive/`; `Docs_Index.md` получил 2 новые архивные entries. — scope: 3 файла (2 rename + index)
4. [DONE] Git Commit: `docs: archive 1.2.10 audit cleanup planning doc + dry-run appendix` (hash: b533a01db)

### Stream 10: Release build 1.2.10
1. [TODO] Verify чистое дерево, запустить `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version`; VSIX `codeai-hub-1.2.10.vsix` в корне + tarballs в `doc/tmp/releases/` и `~/.codeai-hub/releases/`.
2. [TODO] Git Commit: `chore: bump version to 1.2.10 for audit cleanup release` (hash: TBD)
3. [TODO] Archive todo-plan в `doc/TODO/Archive/todo-plan-1.2.10-audit-cleanup.md`; reset `doc/TODO/todo-plan.md` к empty-scope placeholder; commit `docs: close 1.2.10 todo-plan after build`.
4. [TODO] Git Commit: `docs: close 1.2.10 todo-plan after build` (hash: TBD)
