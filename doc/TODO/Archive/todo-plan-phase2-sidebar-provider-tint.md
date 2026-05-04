# План разработки (Development TODO Plan)

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Sidebar_ProviderTint_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/Sidebar_ProviderTint_Architecture.md`
  - `doc/SolidWorks-WorkFlow/DesignSystem/CorporateDesign.html`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
  - `src/client/project-manager/components/layout/workspace-tree.tsx`
  - `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.ts`
  - `src/client/project-manager/components/layout/workspace-tree-model.ts`
  - `src/client/project-manager/services/workflow-state-client.ts`
  - `packages/ui/project-manager/styles.css` (sidebar tree section + `--pm-accent-strong` references)
  - `media/session-view.css` (`session-status-button--*` reference for token alignment)
  - `doc/tmp/prototypes/development-tree-sidebar.html` (visual reference)
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):

- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество — Stream (стрим), в каждом Стриме — некоторое количество подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Если по факту разработки оказывается, что конкретная подзадача Stream затрагивает больше 3 файлов — такая задача должна быть разбита на более мелкие и список задач в Стриме переписывается.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
  - Ручной прогон этих команд обычно не нужен (только для диагностики).
- **Таргетные сборки** выполняем вручную только когда нужно проверить затронутый пакет/клиент, и обязательно перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`, `npm run build:project-manager`.
- **Commit:** После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт `todo-plan.md` (дата, статус, хеш).
- Stream завершается после того, как все его задачи закрыты таргетными сборками затронутых пакетов/клиентов и коммитами.
- **Real-time Документация:** Любое изменение архитектуры/логики требует синхронного обновления `todo-plan.md` и документации (`doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` и др.) **ДО** коммита — чтоб измененные документы также попали в Git Commit.
- Phase завершается на чистом дереве: запускаем `./scripts/build-all.sh` (он повышает версии и вызывает `./scripts/build-release.sh --use-current-version`), переносим tarball'ы в `doc/tmp/releases/`, фиксируем результаты в legacy session-report archive (removed).
- **doc/TODO/todo-plan.md** необходимо постоянно в риалтайме обновлять; после каждой подзадачи обязательный коммит, после каждого коммита его номер и наименование заносить, статус задачи тут же менять.

## Phase 1 — Sidebar provider-tint binding (owner: UI / Project Manager, updated: 2026-04-29)

### Stream A — Scope opening

1. [DONE] Создать planning-doc `doc/SolidWorks-WorkFlow/Plans/Sidebar_ProviderTint_Architecture.md` и активный `doc/TODO/todo-plan.md` (этот файл) — scope: 2 файла; ожидаемый commit message: `docs: open sidebar provider tint scope`.
2. [DONE] Git Commit: `docs: open sidebar provider tint scope` (hash: 7d66abba8)

### Stream B — Provider resolver hook (combined with Stream D task 1 to satisfy knip)

1. [DONE] Создать `src/client/project-manager/components/layout/use-step-provider-resolver.ts` + unit-тест + workspace-tree wiring (tint trunk rows). Объединено в одном коммите потому что knip требует, чтобы новый hook сразу импортировался live-кодом. Scope: 3 файла; commit message: `feat(pm-sidebar): tint trunk rows by provider via resolver hook`.
2. [DONE] Git Commit: `feat(pm-sidebar): tint trunk rows by provider via resolver hook` (hash: 7a9b26045)

### Stream C — CSS provider-tint scheme variables (combined with Stream F + G)

1. [DONE] В `packages/ui/project-manager/styles.css` добавлен блок `.pm-tree__item[data-provider="claude|codex|gemini"]` с `--row-accent`/`--row-fill`/`--row-fill-hover`/`--row-border`/`--row-soft`; selectors для unselected label, selected fill+border+text, selected hover; type marker overrides (in-progress yellow + done green + has-children outline → provider tokens); PP frame border + cluster connectors + open cluster label tints. Scope: 1 файл; commit message: `feat(pm-sidebar): add provider tint css variables and overrides`.
2. [DONE] Git Commit: `feat(pm-sidebar): add provider tint css variables and overrides` (hash: e56685b00)

### Stream D — Trunk row provider attribution

1. [DONE] Закрыто в Stream B (тот же коммит): `useStepProviderResolver` импортирован в `workspace-tree.tsx`, `data-provider` прокинут в trunk `<li>`-ы.
2. [DONE] Git Commit: см. Stream B (hash: 7a9b26045)
3. [SKIPPED] Расширение `workspace-tree-model.ts` оказалось не нужно — inline-resolve в render layer хватает.

### Stream E — Branch row provider attribution

1. [DONE] В `workspace-tree.tsx` `renderModuleRow` / `renderClusterNode` / `renderPartNode` прокинут `data-provider`. PP wrapper `<li>` тоже получил атрибут (для border открытой PP frame). `TYPE_MARKER_LABELS` + `renderTypeMarker` вынесены в `workspace-tree-type-marker.tsx`, чтобы вернуть файл под 500-line cap (504 → 486). Scope: 2 файла; commit message: `feat(pm-sidebar): tint development tree rows by provider`.
2. [DONE] Git Commit: `feat(pm-sidebar): tint development tree rows by provider` (hash: 00a29f0fc)
3. [SKIPPED] Расширение `workspace-tree-diagram-branch-nodes.ts` оказалось не нужно — resolver вызывается в render layer.

### Stream F — Type marker provider tint

1. [DONE] Закрыто в Stream C (тот же коммит): in-progress `#d9a441` → `var(--row-soft)`, done `--pm-accent-strong` → `var(--row-border)`, has-children outline `--pm-accent-strong` → `var(--row-accent)`.
2. [DONE] Git Commit: см. Stream C (hash: e56685b00)

### Stream G — Connector lines + PP frame provider tint

1. [DONE] Закрыто в Stream C (тот же коммит): `pm-tree__pp-wrapper--open[data-provider]` border, `pm-tree__cluster-children > .pm-tree__item[data-provider]::before/::after` background, open cluster label color — все на provider tokens.
2. [DONE] Git Commit: см. Stream C (hash: e56685b00)

### Stream H — Component tests + verification

1. [DONE] Создан `workspace-tree-provider-tint.test.ts` — 5 source-text assertions покрывают `useStepProviderResolver` импорт, `data-provider` атрибуты на trunk + branch + PP wrapper, mapping таблицу, и CSS scope/legacy-replacement правила. `use-step-provider-resolver.test.ts` обновлён под `WorkflowGatingSnapshot` shape (`gating.blocked` вместо `gating.stages`). Scope: 2 файла; commit message: `test(pm-sidebar): cover provider tint resolver and tree wiring`.
2. [DONE] Git Commit: `test(pm-sidebar): cover provider tint resolver and tree wiring` (hash: d88e558e1)
3. [DONE] Targeted builds: `npm run build:project-manager` ✅, `npm run typecheck:webview` ✅, `npm run build:webview` ✅. Resolver tests (7 cases) и provider-tint tests (5 cases) — все зелёные.

### Stream I — SSOT docs sync

1. [DONE] Обновлены `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (новый Invariant 36 — Sidebar provider tint contract) и `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md` (Workflow Tree provider tint subsection). Scope: 2 файла; commit message: `docs(ssot): document sidebar provider tint contract`.
2. [DONE] Git Commit: `docs(ssot): document sidebar provider tint contract` (hash: f10778a88)
3. [DONE] Обновлены `doc/SolidWorks-WorkFlow/DesignSystem/CorporateDesign.html` (Workflow Tree sidebar отмечен `[DONE 1.2.106]` в §4) и `doc/SolidWorks-WorkFlow/Docs_Index.md` (новая секция `### DesignSystem` + active `Plans/Sidebar_ProviderTint_Architecture.md`). Scope: 2 файла; commit message: `docs(design-system): mark sidebar tint as applied`.
4. [DONE] Git Commit: `docs(design-system): mark sidebar tint as applied` (hash: 0cfb2f4d7)

## Phase 2 — Release 1.2.106 (owner: Build, updated: 2026-04-29)

### Stream J — Pre-build version sync

1. [DONE] Обновлены `README.md` («Current Release — v1.2.106») и `CHANGELOG.md` (новая секция `## [1.2.106]` с описанием sidebar provider tint + corporate design system folder). Scope: 2 файла; commit message: `docs: prepare release 1.2.106`.
2. [DONE] Git Commit: `docs: prepare release 1.2.106` (hash: 944733d12)

### Stream K — Build new release

1. [TODO] Убедиться что `git status` пустой; запустить `./scripts/build-all.sh` (поднимет версии до 1.2.106 и вызовет `build-release.sh --use-current-version`); если что-то падает — исправить причину и перезапустить **только** упавший скрипт. Артефакты: tarballs в `~/.codeai-hub/releases/` + `codeai-hub-1.2.106.vsix` в корне репо. Scope: build artifacts (no code/doc edits in this step); ожидаемый commit message: `chore: build release 1.2.106` (создаётся скриптами автоматически).
2. [TODO] Git Commit: `chore: build release 1.2.106` (hash: TBD)
3. [TODO] Скопировать свежие tarball'ы из `~/.codeai-hub/releases/` в `doc/tmp/releases/`; убедиться что VSIX содержит обновлённые README/CHANGELOG. Scope: artifacts (no source edits expected); ожидаемый commit message: `chore: stage 1.2.106 release tarballs`.
4. [TODO] Git Commit: `chore: stage 1.2.106 release tarballs` (hash: TBD)
5. [TODO] Архивировать `doc/TODO/todo-plan.md` в `doc/TODO/Archive/todo-plan-phase2-sidebar-provider-tint.md`; ревизия `doc/SolidWorks-WorkFlow/Plans/Sidebar_ProviderTint_Architecture.md` (перенести в `Plans/Archive/` или удалить); создать новый no-active-scope shell для `doc/TODO/todo-plan.md`; обновить `doc/SolidWorks-WorkFlow/Docs_Index.md`. Scope: 3 файла + дельта (per-cycle planning ревизия). Ожидаемый commit message: `docs: archive sidebar provider tint scope`.
6. [TODO] Git Commit: `docs: archive sidebar provider tint scope` (hash: TBD)
7. [TODO] Создать `legacy session report (removed)` (Type A — Completion Report или Type B — Continuation Report в зависимости от того, остались ли deferred items). Scope: 1 файл; коммитим только session report незакоммиченным согласно CLAUDE.md правилу.
