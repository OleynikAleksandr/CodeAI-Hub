# Session 113 — Release 1.1.755 Build And Ownership SSOT Sync

**Date:** 2026-03-21 11:34 (CET)
**Branch:** main
**Version:** 1.1.755

---

# 1. Work Done in This Session

## Work summary

- Восстановлен release context после `Session112` и подготовлен pre-release cleanup commit для локального релиза `1.1.755`.
- Докоммичены пропущенные handoff-документы:
  - `doc/Sessions/Archive/Session110.md`
  - `doc/Sessions/Archive/Session111.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Diagram_Modules_ProductPart_Hierarchy_DSL_Architecture.md`
- Удалены больше не нужные prompt/help draft-файлы из `doc/`, потому что их содержимое уже перенесено в runtime assets и user-facing help surface.
- Синхронно обновлены release-facing и SSOT документы:
  - `README.md`
  - `CHANGELOG.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- В `SystemArchitecture.md` зафиксирован новый runtime baseline для `Diagram Modules`:
  - ownership-aware semantic model `Product Part -> Cluster -> Module`
  - dual-read parser migration path с synthetic `default-product-part` для legacy inventories
  - nested React Flow container model
  - инвариант, что `module-map.flow.json` остаётся layout-only sidecar
- Во время `build-all` подтверждён реальный build-breaker в `@codeai-hub/core`:
  - `packages/core/src/workflow/diagram-dsl/markdown-dsl-parser.test.ts` обращался к `result.value.modules` без narrowing по `stage`
  - добавлен минимальный type guard, после чего `npm run build --workspace @codeai-hub/core` снова стал зелёным
- Выполнен unified release cycle для `1.1.755`:
  - provider tarballs собраны для `claude`, `codex`, `gemini`
  - собран core runtime `codeai-hub-core-darwin-arm64-1.1.755.tar.bz2`
  - собраны UI bundles `vscode-webview-1.1.755.tar.bz2` и `project-manager-1.1.755.tar.bz2`
  - собран CEF launcher `CodeAIHubLauncher-macos-arm64-1.1.755.tar.bz2`
  - tarball'ы перенесены в `doc/tmp/releases/`
  - собран VSIX `codeai-hub-1.1.755.vsix`
- Во время `build-release.sh --use-current-version` дополнительно подтверждено:
  - `Verifying SDK exclusions` прошёл успешно
  - `Removing dev dependencies before packaging` выполнен
  - `Package created` выдал итоговый VSIX
- `build-release.sh` показал advisory по broken markdown links в старом `doc/Sessions/Archive/Session106.md`, но это не стало hard blocker для packaging.
- После всех коммитов и сборки рабочее дерево снова чистое.

## Git commits
- `80508f7b docs(release): prepare 1.1.755 ownership notes`
- `b9c7490b chore(release): build 1.1.755 artifacts`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Archive/Session112.md`
6. `doc/Sessions/Archive/Session113.md` (THIS REPORT)

> Далее: открыть нужные planning/SSOT документы из `doc/SolidWorks-WorkFlow/Plans/`, `System/`, `Clusters/`, `Modules/`, `Contracts/` в зависимости от результата greenfield regression.

## Plans for next session
- Прогнать end-to-end greenfield regression на локальном релизе `1.1.755` для цепочки `Description -> Virtual Simulation -> Diagram Modules`.
- Проверить, устраняет ли новый ownership-aware DSL и nested renderer прежнее flattening behavior на реальном user-facing workflow.
- Если regression зелёный, решить:
  - архивировать ли текущий completed `todo-plan.md`
  - нужен ли новый planning-doc / новый execution plan под оставшиеся visual readability issues first-open layout.
