# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед работой по этому scope открыть: `AGENTS.md`, `doc/SolidWorks-WorkFlow/README.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`, `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_Canonical_ProductPart_Template_And_Prompt_Delivery_Architecture.md`, `doc/Sessions/Session146.md`
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`
- Каждая микро-задача должна затрагивать не более 3 файлов; если scope разрастается, stream нужно дробить заново
- Husky gates не обходить (`--no-verify` запрещен)
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита
- Перед закрытием stream выполнять таргетные проверки затронутых пакетов/клиентов
- После закрытия release stream: выполнить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, записать результаты в `doc/Sessions/`
- **Protected working parts:** не трогать без прямой необходимости уже работающие `product-parts.index.md` parsing, появление `Product Part` плашек, hidden continuation после index write, `Source` availability на index artifact, sequence lock/gating/review boundary и ранний staged graph skeleton. Если нужен compatibility shim, он должен быть строго additive и локальным.

---

## Phase 53 — Diagram Modules Canonical ProductPart Template Contract Stabilization (owner: Oleksandr, updated: 2026-03-23)

### Stream: Planning baseline
1. [DONE] Заархивировать завершённый rollout-план до `Phase 52`, оформить новый planning-doc по canonical `product-parts.index.md` / `product-parts/<part-id>.md` template contract и prompt-delivery chain, затем создать новый active `todo-plan.md` только под этот scope с явной защитой уже работающих частей раннего staged flow (scope: `doc/TODO/Archive/todo-plan-up-to-phase52-2026-03-23.md`, `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_Canonical_ProductPart_Template_And_Prompt_Delivery_Architecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(plan): archive phase52 plan and start canonical product part template scope`).
2. [TODO] Git Commit: `docs(plan): archive phase52 plan and start canonical product part template scope` (hash: TBD)

### Stream: Canonical template SSOT
1. [TODO] Переписать source assets `product-parts-index-template.md` и `product-part-template.md` в один канонический human-readable, parser-safe staged DSL без legacy inventory-first shape, явно отделив semantic sections от optional narrative appendix, но не меняя уже рабочий index parser path вне нужного template contract (scope: `packages/agents/diagram-modules-agent/assets/product-parts-index-template.md`, `packages/agents/diagram-modules-agent/assets/product-part-template.md`, `doc/TODO/todo-plan.md`; expected commit: `fix(diagram-workflow): define canonical staged product part templates`).
2. [TODO] Git Commit: `fix(diagram-workflow): define canonical staged product part templates` (hash: TBD)

### Stream: Prompt path delivery
1. [TODO] Передавать агенту explicit template path текущего `diagram_modules` turn-а: для index turn — canonical index template, для part turn — canonical product-part template; убрать оставшиеся условия, при которых агенту приходится самостоятельно искать или угадывать staged template в runtime contract (scope: `src/client/project-manager/services/prompt-pack-builder.ts`, `packages/core/src/remote-bridge/handlers/idea-contract-service.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix(diagram-workflow): deliver canonical staged template paths`).
2. [TODO] Git Commit: `fix(diagram-workflow): deliver canonical staged template paths` (hash: TBD)

### Stream: Bundled template sync
1. [TODO] Синхронизировать bundled/template-delivery layer под новый canonical staged contract, чтобы live template assets, bundled payload и synced runtime templates перестали расходиться между собой и не откатывались к старому inventory-style shape при сборке релиза (scope: `scripts/generate-bundled-templates.js`, `packages/core/src/templates/template-sync-service.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `test(diagram-workflow): sync canonical staged template delivery`).
2. [TODO] Git Commit: `test(diagram-workflow): sync canonical staged template delivery` (hash: TBD)

### Stream: Parser alignment
1. [TODO] Привести staged `Product Part` parser к чтению именно canonical single-part template и оставить только ограниченный additive compatibility shim для уже созданных drift-файлов вроде `Cluster Ownership` / `### Cluster: ...`, не трогая рабочий `product-parts.index.md` parser и hidden continuation path (scope: `src/client/project-manager/components/diagram-editor/diagram-modules-staged-part-parser.ts`, `src/client/project-manager/components/sessions/use-diagram-modules-orchestration.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix(diagram-workflow): align staged parser with canonical product part template`).
2. [TODO] Git Commit: `fix(diagram-workflow): align staged parser with canonical product part template` (hash: TBD)

### Stream: Semantic validation hardening
1. [TODO] Усилить validation/runtime guards так, чтобы `product-parts/<part-id>.md` не считался успешным semantic artifact только по `Part ID` и `Purpose`: если файл заявляет cluster/module ownership, но parser не materialize-ит ни одной вложенной сущности, runtime должен явно сигнализировать ошибку вместо тихого shallow-success (scope: `packages/core/src/remote-bridge/handlers/http-api-router.ts`, `src/client/project-manager/components/sessions/diagram-modules-aggregate.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix(diagram-workflow): reject semantically-empty product part files`).
2. [TODO] Git Commit: `fix(diagram-workflow): reject semantically-empty product part files` (hash: TBD)

### Stream: Regression coverage
1. [TODO] Добавить targeted regression coverage для canonical product-part template, explicit template-path delivery и semantic validation failure на drift part-files, чтобы следующий retest не чинить снова точечно уже после релиза (scope: `src/client/project-manager/components/sessions/diagram-modules-aggregate.test.ts`, `packages/core/src/remote-bridge/handlers/idea-contract-service.diagram-stages.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `test(diagram-workflow): cover canonical product part contract end-to-end`).
2. [TODO] Git Commit: `test(diagram-workflow): cover canonical product part contract end-to-end` (hash: TBD)

### Stream: Release notes sync
1. [TODO] Перед новым patch release синхронизировать `README.md`, `CHANGELOG.md` и active plan под новый fixed contract: canonical staged templates, explicit template-path delivery, parser/validation alignment и protected early-flow behavior без регрессии для index skeleton / hidden continuation (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): sync canonical product part template contract notes`).
2. [TODO] Git Commit: `docs(release): sync canonical product part template contract notes` (hash: TBD)

### Stream: Release build
1. [TODO] После закрытия contract/template/parser/validation scope выполнить новый release cycle: `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, чтобы отдать пользователю baseline, в котором agent получает канонический template path, part-files parse-ятся детерминированно, а runtime не пропускает semantically-empty ownership docs (scope: release/version manifests and package metadata, `doc/TODO/todo-plan.md`; expected commit: `chore(release): prepare canonical product part template contract release`).
2. [TODO] Git Commit: `chore(release): prepare canonical product part template contract release` (hash: TBD)

### Stream: Session handoff
1. [TODO] После нового релиза синхронизировать active plan фактическими hash-ами и оформить следующий session report по canonical template contract stabilization, prompt-delivery fix, parser/validation hardening и результатам нового release baseline (scope: `doc/TODO/todo-plan.md`, next session report file, related release docs if needed; expected commit: `docs(session): record canonical product part template contract release`).
2. [TODO] Git Commit: `docs(session): record canonical product part template contract release` (hash: TBD)

## Notes
- Archived completed rollout plans:
  - `doc/TODO/Archive/todo-plan-up-to-phase28-2026-03-22.md`
  - `doc/TODO/Archive/todo-plan-up-to-phase30-2026-03-23.md`
  - `doc/TODO/Archive/todo-plan-up-to-phase36-2026-03-23.md`
  - `doc/TODO/Archive/todo-plan-up-to-phase52-2026-03-23.md`
- Active planning docs for this scope:
  - `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_Canonical_ProductPart_Template_And_Prompt_Delivery_Architecture.md`
- User constraints for this scope:
  - `Diagram Modules` остаётся главным graphical review step;
  - шаблон `product-parts/<part-id>.md` обязан быть каноническим и реально передаваться агенту как template текущего turn-а;
  - исправления должны идти по цепочке `template -> prompt delivery -> parser -> validation -> aggregate`, а не точечными parser hotfix-ами по одному live drift-формату;
  - уже восстановленные index skeleton / hidden continuation / Source availability / sequence lock нельзя ломать;
  - не трогать unrelated части кодовой базы, если они не нужны для этого contract scope.
