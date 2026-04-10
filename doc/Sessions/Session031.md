# Session 031 — Development Tree Baseline Implementation + Release v1.1.924

**Date:** 2026-04-10 12:00 (CEST)
**Branch:** main
**Version:** 1.1.924
**Execution Scope Status:** ACTIVE

---

# 1. Work Done in This Session

## Work summary

- Phase 1 — Trunk Shell Convergence (CLOSED):
  - Удалён верхний stage toolbar (`toolbar.tsx`, CSS, `useWorkflowToolSelect` hook)
  - Sidebar workspace tree стал единственной navigation surface для trunk stages
  - Убрана redundant eager `setActiveTool("Description")` из MainArea; startup tool resolution переведён на `useMainAreaWorkflowState` + sidebar auto-select event
  - Обновлены regression тесты: no toolbar import/render, no eager Description set, startup tool resolution ownership
  - Checkpoint: `build:project-manager`, `build:webview`, `typecheck:webview` — зелёные

- Phase 2 — Development Tree Read Model (CLOSED):
  - Новый `development-tree-snapshot.ts` в Core читает product-part файлы и строит дерево PP/Cluster/Module
  - Workflow-state API отдаёт `developmentTree` snapshot
  - PM клиент парсит `DevelopmentTreeSnapshot` (типы, parser)
  - Sidebar проецирует development tree как collapsible branch nodes (skeleton=todo, materialized=draft с children)
  - Devtree nodes по умолчанию collapsed; trunk nodes сохраняют default-expanded
  - Тесты: `development-tree-snapshot.test.ts` (core), `workspace-tree-diagram-branch-nodes.test.ts` (PM)
  - Checkpoint: `build:core`, `build:project-manager`, `build:webview`, `typecheck:webview` — зелёные

- Phase 3 — Branch Panel Surfaces (CLOSED, session surfaces deferred):
  - `BranchNodeSelection` type + `pm:branch:selected` event model
  - Клик по dev tree node обновляет panel header title и показывает placeholder surface
  - Branch session surfaces и panel independence tests отложены на post-release (требуют Phase 4 lazy session lifecycle)
  - Checkpoint: `build:project-manager`, `build:webview`, `typecheck:webview` — зелёные

- Phase 4, Phase 5 — DEFERRED to post-release:
  - Lazy session lifecycle, provider inheritance, gating, outdated propagation, counters

- Phase 6 — Release Hardening (PARTIAL):
  - README.md, CHANGELOG.md, SystemArchitecture.md обновлены под v1.1.924
  - `build-all.sh` → v1.1.924 (все providers, core, launcher, UI)
  - `build-release.sh --use-current-version` → `codeai-hub-1.1.924.vsix` (2.0M, 1798 files)
  - Все гейты зелёные. Tarballs скопированы в `doc/tmp/releases/`
  - Visual walkthrough и user feedback ещё НЕ выполнены — запланированы на следующую сессию

## Git commits
(ВАЖНО: при `Execution Scope Status: ACTIVE` следующая сессия обязана просмотреть каждый коммит через `git show --stat <hash>` и `git show <hash>`.)
- `75dbf141f docs(plans): add unified todo-plan for Development Tree rollout + session reports 029/030`
- `0881c253b feat: remove project manager top stage toolbar`
- `2f5152740 feat: make workspace tree the only trunk navigation surface`
- `7425f6eb5 refactor: align main area with sidebar-only workflow routing`
- `d87aab5ef test: cover sidebar-only trunk navigation`
- `f83ae20b9 feat: expose development tree snapshot in workflow state`
- `991c4a92c feat: build development tree nodes from diagram modules artifacts`
- `df2fb1f07 feat: render development tree sidebar states`
- `90928f791 test: cover development tree projection and progressive population`
- `7d4be76b4 feat: add canonical branch node routing`
- `5b1eb58bf feat: add branch artifact surfaces to project manager`
- `7debeead7 docs: document development tree execution baseline`
- `2e05f9e2d chore: bump version to 1.1.924 via build-all.sh`

---

# 2. Instructions for Next Session

**Recovery Owner:** `doc/TODO/todo-plan.md`

## Plans for next session

- Продолжать активный execution scope по `doc/TODO/todo-plan.md`.
- **Первый приоритет**: visual walkthrough v1.1.924 (Phase 6, Stream 3 item 5) — протестировать собранный релиз, зафиксировать все замечания и регрессии.
- **Ожидаемые risk areas**:
  - Удалённый toolbar: trunk stages теперь навигируются только через sidebar. Возможная регрессия: если sidebar auto-select не срабатывает на startup, пользователь увидит пустую правую панель.
  - Development tree nodes: появятся только если workspace прошёл Diagram Modules до генерации product-part файлов. Если Diagram Modules ещё не завершён — дерево не покажется (это by design, не баг).
  - Branch artifact surfaces: показывают placeholder. Это intentional — полные surfaces требуют deferred Phase 4.
- После сбора фидбэка и фиксации багов: закрыть Phase 6 Stream 3 (items 5-8) и решить, переносить ли Phases 4-5 в новый todo-plan или продолжать в текущем.

## Known release artifacts

- VSIX: `codeai-hub-1.1.924.vsix` (корень репо)
- Tarballs: `doc/tmp/releases/*-1.1.924.*`
- Provider runtime: `~/.codeai-hub/providers/*/1.1.924/`
- Core runtime: `~/.codeai-hub/releases/codeai-hub-core-darwin-arm64-1.1.924.tar.bz2`
- Launcher: `~/.codeai-hub/releases/CodeAIHubLauncher-macos-arm64-1.1.924.tar.bz2`
