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
- Phase завершается на чистом дереве: запускаем `./scripts/build-all.sh` (он повышает версии и вызывает `./scripts/build-release.sh --use-current-version`), переносим tarball'ы в `doc/tmp/releases/`, фиксируем результаты в `doc/Sessions/`.
- **doc/TODO/todo-plan.md** необходимо постоянно в риалтайме обновлять; после каждой подзадачи обязательный коммит, после каждого коммита его номер и наименование заносить, статус задачи тут же менять.

## Phase 1 — Sidebar provider-tint binding (owner: UI / Project Manager, updated: 2026-04-29)

### Stream A — Scope opening

1. [DONE] Создать planning-doc `doc/SolidWorks-WorkFlow/Plans/Sidebar_ProviderTint_Architecture.md` и активный `doc/TODO/todo-plan.md` (этот файл) — scope: 2 файла; ожидаемый commit message: `docs: open sidebar provider tint scope`.
2. [TODO] Git Commit: `docs: open sidebar provider tint scope` (hash: TBD)

### Stream B — Provider resolver hook

1. [TODO] Создать `src/client/project-manager/components/layout/use-step-provider-resolver.ts` — `useStepProviderResolver(...)`, `SidebarProviderId`, `PROVIDER_STACK_TO_DESIGN_ID` mapping (claudeCodeCli/codexCli/geminiCli → claude/codex/gemini), resolution chain trunk → branch (Diagram-Modules-inherited) → settings default; добавить `defaultProviderId` argument resolution через consumer (или через нативный hook потребителя). Scope: 1 файл (≤80 lines); ожидаемый commit message: `feat(pm-sidebar): add step provider resolver`.
2. [TODO] Git Commit: `feat(pm-sidebar): add step provider resolver` (hash: TBD)
3. [TODO] Добавить unit-тест `src/client/project-manager/components/layout/use-step-provider-resolver.test.ts` — coverage по chain'ам (trunk done/in-progress, branch fallback, idle fallback, unmappable provider). Scope: 1 файл; ожидаемый commit message: `test(pm-sidebar): cover step provider resolver`.
4. [TODO] Git Commit: `test(pm-sidebar): cover step provider resolver` (hash: TBD)

### Stream C — CSS provider-tint scheme variables

1. [TODO] В `packages/ui/project-manager/styles.css` добавить блок per-row provider-tint: `.pm-tree__item[data-provider="claude"|"codex"|"gemini"]` с `--row-accent`, `--row-fill`, `--row-fill-hover`, `--row-border`, `--row-soft`; селекторы для unselected label, selected fill+border+text, selected hover, selected toggle/counter color; comment-блок «values mirror doc/SolidWorks-WorkFlow/DesignSystem/CorporateDesign.html». Scope: 1 файл; ожидаемый commit message: `feat(pm-sidebar): add provider tint css variables`.
2. [TODO] Git Commit: `feat(pm-sidebar): add provider tint css variables` (hash: TBD)

### Stream D — Trunk row provider attribution

1. [TODO] В `src/client/project-manager/components/layout/workspace-tree.tsx` подключить `useStepProviderResolver`, прокинуть `data-provider={resolver.forStage(stage)}` в каждый trunk `<li>`. Scope: 1 файл; ожидаемый commit message: `feat(pm-sidebar): tint trunk rows by provider`.
2. [TODO] Git Commit: `feat(pm-sidebar): tint trunk rows by provider` (hash: TBD)
3. [TODO] Опционально: расширить `workspace-tree-model.ts` типом `providerId?: SidebarProviderId` если потребуется проброс через `TreeNode` (если inline-resolve в render layer хватает — пропустить эту задачу). Scope: 1 файл; ожидаемый commit message: `refactor(pm-sidebar): thread provider id through tree node model`.
4. [TODO] Git Commit: `refactor(pm-sidebar): thread provider id through tree node model` (hash: TBD, may be skipped)

### Stream E — Branch row provider attribution

1. [TODO] В `workspace-tree.tsx` `renderPartNode` / `renderClusterNode` / `renderModuleRow` прокинуть `data-provider={resolver.forBranchPart(...)}` etc на сам row `<div className="pm-tree__item">` и одновременно на родительский `<li className="pm-tree__pp-wrapper">` (чтобы border открытой PP frame подхватывал provider tint). Scope: 1 файл; ожидаемый commit message: `feat(pm-sidebar): tint development tree rows by provider`.
2. [TODO] Git Commit: `feat(pm-sidebar): tint development tree rows by provider` (hash: TBD)
3. [TODO] Если потребуется — расширить `workspace-tree-diagram-branch-nodes.ts` пробросом providerId через node-builder. Если resolver вызывается в render layer и достаточен — пропустить. Scope: 1 файл; ожидаемый commit message: `refactor(pm-sidebar): thread provider id through dev-tree node builder`.
4. [TODO] Git Commit: `refactor(pm-sidebar): thread provider id through dev-tree node builder` (hash: TBD, may be skipped)

### Stream F — Type marker provider tint (replace yellow + green hardcodes)

1. [TODO] В `packages/ui/project-manager/styles.css` добавить overrides:
   - `.pm-tree__item[data-provider].pm-tree__item--in-progress .pm-tree__type-marker { background: var(--row-soft); color: #1a1207; }` — заменяет жёлтый `#d9a441`.
   - `.pm-tree__item[data-provider].pm-tree__item--done .pm-tree__type-marker { background: var(--row-border); color: #cfcfcf; }` — заменяет зелёный `--pm-accent-strong` на provider tint.
   - `.pm-tree__item[data-provider] .pm-tree__type-marker--has-children { outline-color: var(--row-accent); }` — заменяет зелёный outline.
   Внутри файла оставить inline-комментарий «provider-tint overrides; legacy yellow/green rules above remain as fallback for missing data-provider». Scope: 1 файл; ожидаемый commit message: `feat(pm-sidebar): tint type markers by provider`.
2. [TODO] Git Commit: `feat(pm-sidebar): tint type markers by provider` (hash: TBD)

### Stream G — Connector lines + PP frame provider tint

1. [TODO] В `packages/ui/project-manager/styles.css` добавить:
   - `.pm-tree__pp-wrapper--open[data-provider] { border-color: var(--row-border); }` — провайдерская рамка PP.
   - `.pm-tree__cluster-children > .pm-tree__item[data-provider]::before, ...::after { background: var(--row-soft); }` — провайдерские connector lines.
   - `.pm-tree__cluster-wrapper--open > .pm-tree__item.pm-tree__item--type-cl[data-provider] .pm-tree__label { color: var(--row-accent); }` — open cluster label.
   Scope: 1 файл; ожидаемый commit message: `feat(pm-sidebar): tint pp frame and cluster connectors by provider`.
2. [TODO] Git Commit: `feat(pm-sidebar): tint pp frame and cluster connectors by provider` (hash: TBD)

### Stream H — Component tests + visual retest

1. [TODO] Создать или расширить `src/client/project-manager/components/layout/workspace-tree.test.tsx` — render с mocked snapshot, assert `data-provider` на trunk и branch `<li>`-ах, assert selected/in-progress/done classes сосуществуют с `data-provider`. Scope: 1 файл; ожидаемый commit message: `test(pm-sidebar): cover provider-tinted tree rendering`.
2. [TODO] Git Commit: `test(pm-sidebar): cover provider-tinted tree rendering` (hash: TBD)
3. [TODO] Прогнать таргетные сборки: `npm run build:project-manager`, `npm run typecheck:webview`, `npm run build:webview`. Если зелёные — пометить Stream H зелёным; если падают — починить и вернуться. Scope: 0 файлов (verification); ожидаемый commit message: only if fixes required.
4. [TODO] Git Commit (only if fixes were needed): `chore: address pm-sidebar build feedback` (hash: TBD, may be skipped)

### Stream I — SSOT docs sync

1. [TODO] Обновить `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` — добавить инвариант о sidebar provider-tint contract (ссылка на CorporateDesign.html и на `useStepProviderResolver`); обновить `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md` — раздел про Workflow Tree sidebar. Scope: 2 файла; ожидаемый commit message: `docs(ssot): document sidebar provider tint contract`.
2. [TODO] Git Commit: `docs(ssot): document sidebar provider tint contract` (hash: TBD)
3. [TODO] Обновить `doc/SolidWorks-WorkFlow/DesignSystem/CorporateDesign.html` — отметить «Workflow Tree sidebar» в §4 как реализованное; обновить `doc/SolidWorks-WorkFlow/Docs_Index.md` если требуется добавить новый planning-doc-путь в каталог. Scope: 2 файла; ожидаемый commit message: `docs(design-system): mark sidebar tint as applied`.
4. [TODO] Git Commit: `docs(design-system): mark sidebar tint as applied` (hash: TBD)

## Phase 2 — Release 1.2.106 (owner: Build, updated: 2026-04-29)

### Stream J — Pre-build version sync

1. [TODO] Обновить `README.md` («Current Release — v1.2.106») и `CHANGELOG.md` (новая секция `## [1.2.106]`) с кратким описанием sidebar provider tint scope. Scope: 2 файла; ожидаемый commit message: `docs: prepare release 1.2.106`.
2. [TODO] Git Commit: `docs: prepare release 1.2.106` (hash: TBD)

### Stream K — Build new release

1. [TODO] Убедиться что `git status` пустой; запустить `./scripts/build-all.sh` (поднимет версии до 1.2.106 и вызовет `build-release.sh --use-current-version`); если что-то падает — исправить причину и перезапустить **только** упавший скрипт. Артефакты: tarballs в `~/.codeai-hub/releases/` + `codeai-hub-1.2.106.vsix` в корне репо. Scope: build artifacts (no code/doc edits in this step); ожидаемый commit message: `chore: build release 1.2.106` (создаётся скриптами автоматически).
2. [TODO] Git Commit: `chore: build release 1.2.106` (hash: TBD)
3. [TODO] Скопировать свежие tarball'ы из `~/.codeai-hub/releases/` в `doc/tmp/releases/`; убедиться что VSIX содержит обновлённые README/CHANGELOG. Scope: artifacts (no source edits expected); ожидаемый commit message: `chore: stage 1.2.106 release tarballs`.
4. [TODO] Git Commit: `chore: stage 1.2.106 release tarballs` (hash: TBD)
5. [TODO] Архивировать `doc/TODO/todo-plan.md` в `doc/TODO/Archive/todo-plan-phase2-sidebar-provider-tint.md`; ревизия `doc/SolidWorks-WorkFlow/Plans/Sidebar_ProviderTint_Architecture.md` (перенести в `Plans/Archive/` или удалить); создать новый no-active-scope shell для `doc/TODO/todo-plan.md`; обновить `doc/SolidWorks-WorkFlow/Docs_Index.md`. Scope: 3 файла + дельта (per-cycle planning ревизия). Ожидаемый commit message: `docs: archive sidebar provider tint scope`.
6. [TODO] Git Commit: `docs: archive sidebar provider tint scope` (hash: TBD)
7. [TODO] Создать `doc/Sessions/Session029.md` (Type A — Completion Report или Type B — Continuation Report в зависимости от того, остались ли deferred items). Scope: 1 файл; коммитим только session report незакоммиченным согласно CLAUDE.md правилу.
