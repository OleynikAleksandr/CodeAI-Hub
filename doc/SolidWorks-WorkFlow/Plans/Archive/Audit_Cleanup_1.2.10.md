# Audit Cleanup 1.2.10 — Planning Doc

## 1. Problem

После Session043 (1.2.9 release) проведён аудит кодовой базы двумя саб-агентами + baseline-гейтами. Гейты зелёные, но накоплен технический долг, который `knip` / `check:links` / `jscpd` не ловят:

- **99 unused localization keys** в `assets/localization/source/en/*.json` (из 449 всего — 22%). Основные скопления: `pm.description.questionnaire.*` (~27), `pm.confirmation_card.title.*` (~10), settings descriptions (~17 в `ui_helper_text.json`+`ui_labels.json`). Часть — следы удалённых компонентов (`SwitchRecoveryBanner`), часть — "на будущее", часть — переделанный questionnaire.
- **3 stale path** в `doc/SolidWorks-WorkFlow/Docs_Index.md:80-82` на несуществующие templates (`templates/description/questionnaire-template.md` и др). Ломает scope discovery для следующих сессий.
- **knip.json exclusion** на `packages/core/src/workflow/diagram-dsl/diagram-legacy-ownership-parser.ts` без документированной причины; файл реально импортируется.
- **67 duplication clones** (2.06% — ниже порога 3%, но не аудированы по сути). Пользователь: "глупо не переиспользовать код, если технологически возможно."
- **1 TODO** в `packages/agents/spec-creator/dist/contract/contract-builder.d.ts:5` — требует проверки исходника (возможно placeholder).

Это гигиена долга, не bug fix. 1.2.9 stable; retest прошёл.

## 2. Solution

Четыре направления, в одном execution cycle `1.2.10`:

### A. Docs + config fix (S)
- `doc/SolidWorks-WorkFlow/Docs_Index.md:80-82` — обновить на актуальные пути бандлированных шаблонов (`.codeai-hub/codeai-hub/description/*.md` / `description-step.json`). Сначала прочесть реальную структуру templates.
- `knip.json` — проверить `diagram-legacy-ownership-parser` exclusion: снять, если файл нормально импортируется, или оставить с комментарием о причине.
- `packages/agents/spec-creator/src/` — найти исходник `contract-builder`, проверить TODO на актуальность.

### B. Localization cleanup (M)
Scope ограничен **approved dicts** (по memory `feedback-localization-approved-dicts`): `ui_labels.json`, `ui_helper_text.json`, `messages_for_the_user.json`, `artifacts_for_the_user.json`. Legacy dicts shadowed, их не трогаем.

Двухэтапная:
1. **Dry-run.** Для каждого из 99 ключей — grep-partial (по префиксу, по последнему сегменту) чтобы исключить dynamic-usage через variable keys. Составить список confirmed-dead (ожидаемо 80-95 из 99).
2. **Deletion.** Удалить confirmed-dead из source-файлов. Визуально проверить PM/Settings UI в webview dev server перед commit.

### C. Duplication refactor (M, scope-bounded)
Анализ top-20 клонов проведён (233 клона, 3.68% duplicated lines). **17/20 — legitimate** (parallel provider scaffolding + boundary mirrors + diverging domains). **3 конкретных рефактора утверждены:**

- **C1.** Extract `useBootstrapSettings` → новый `src/client/shared/hooks/use-bootstrap-settings.ts`. Убирает клон между `use-project-manager-settings.ts:30-67` и `use-settings-state.ts:74-111`. Scope: 3 файла.
- **C2.** DRY через локальную фабрику `createWorkspaceFileHandler(parsePayload)` в `workspace-file-service.ts`. Убирает within-file клон между строками 107-142 и 166-201. Scope: 1 файл.
- **C3.** Schema-utils консолидация: `idea-collector-schema-utils.ts` импортирует из уже существующих `agents/shared/src/schema-utils/schema-normalizer.ts` + `schema-strictifier.ts`; локальный дубль удаляется. Scope: ≤3 файла.

**Target после C1-C3:** `check:dup` с 3.68% → ~3.2%. Остаток (200+ LEGIT клонов) документируется в SSOT как acceptable parallel provider scaffolding + boundary mirrors. Порог гейта `check:dup` не меняем (остаётся 3%).

**EXTRACT-COMPLEX кандидат #17** (token-usage init между `Codex_Module` и `core`) — откладываем, отдельный scope. Требует рефактор интерфейса usage-limits cross-package.

### D. Process formalization (S)
- Добавить `doc/SolidWorks-WorkFlow/Checklists/PeriodicAudit.md` — чек-лист периодического аудита (dead code, broken links, dup clones, stale TODOs) с указанием когда запускать (каждые 3-5 релизов) и какие sub-agents использовать.
- Обновить `doc/SolidWorks-WorkFlow/Docs_Index.md` — добавить ссылку на новый checklist.

## 3. Structure

Новых классов нет. Направление A-B-D — чисто ассеты/конфиг/доки. Направление C может ввести 1-3 shared helper модуля — они появятся по факту рефакторинга, без заранее утверждённой структуры. Каждый extract — строго один commit, ≤3 файлов, с тестами если helper содержит логику.

## 4. Contracts

- Все 4 approved loc dicts должны после Stream B остаться с 0 unused keys (или документированным исключением на конкретные ключи "reserved for near-future feature X").
- После Stream C: либо `check:dup` ниже 1.5%, либо в `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` короткая запись "N остаточных клонов — acceptable по природе".
- `doc/SolidWorks-WorkFlow/Checklists/PeriodicAudit.md` — готовый к прогону чек-лист, не черновик.

## 5. Release

1.2.10 VSIX + tarballs. Это полный релиз (ассеты меняются → VSIX обязателен), но **не retest-зависимый** — изменения чисто гигиенические.

## 6. Out of scope

- **Strict mode для knip** — слишком большой follow-up, отдельным scope'ом позже.
- **Рефактор 24 файлов в warning zone (400-500 строк)** — architecture gate отслеживает отдельно, не аудит-долг.
- **Legacy dicts cleanup** (shadowed файлы) — они уже неиспользуемые по архитектуре, отдельный decommission scope.
