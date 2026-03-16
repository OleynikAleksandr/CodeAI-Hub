# Session 083 — Interactive Diagram DSL Architecture & Execution Plan

**Date:** 2026-03-16 20:00 (CET)
**Branch:** main
**Version:** 1.1.730

---

# 1. Work Done in This Session

## Work summary

### Research phase (4 parallel agents)
- Исследован **ELK** (elkjs) — автолейаут движок: алгоритм `layered`, асинхронный API, формат ELK JSON, производительность на 50-100 узлах
- Исследован **React Flow** (`@xyflow/react` v12) — интерактивные диаграммы: controlled mode, кастомные узлы/рёбра, сериализация, интеграция с ELK
- Изучена текущая архитектура workflow: существующие агенты, промпт-шаблоны, watcher/gating, artifact paths, Description agent как reference implementation
- Изучена UI/webview архитектура PM: React 18 + esbuild, компонентная иерархия, WebSocket/HTTP коммуникация с Core

### Architecture design (iterative review)
- Создан архитектурный документ `doc/SolidWorks-WorkFlow/Plans/DiagramSteps_InteractiveDSL_Architecture.md` (19 секций, ~1100 строк)
- Прошли 4 раунда review с замечаниями P1/P2/P3, все закрыты:
  - Migration strategy: атомарная замена `.mmd` без compat bridge
  - Revision computation: sha256 от normalized content без поля Revision (нет цикла)
  - Field ownership: заменён in-memory `userModifiedFields` на **agent baseline file** + **change summary** в prompt pack
  - Relations как единственный SSOT графа (убраны `Depends on` / `Used by`)
  - Parser error policy: strict (duplicate ID = ERROR, blocking)
  - ELK invariant: только first-open + explicit button, без автоматического re-layout
  - Origin transition rule: `agent → merged` при любом semantic patch на agent-owned entity
  - Watcher exclusion: `.agent-baseline.md` полностью исключён из watcher scope
  - D12: React Flow и ELK как инфраструктурные библиотеки (аналогично CEF)
  - Agent Artifact Pack: полный runtime contract для обоих агентов
  - FacadeDomainPatch: симметричный patch union для Facade Map
  - Save status model: единая state machine `saved → unsaved → saving → merged → error → conflict`

### Execution plan
- Архивирован предыдущий todo-plan (`todo-plan-phase3-post-release-publication-rollback-2026-03-16.md`)
- Создан новый `doc/TODO/todo-plan.md` — 5 фаз, каждая с release stream:
  - **Phase 1** — DSL foundation (parser/serializer/baseline diff/agent stubs/path migration/mermaid removal)
  - **Phase 2** — Visual shell (React Flow + ELK, graph adapters, flow.json persistence)
  - **Phase 3** — Semantic editing для Diagram Modules (patch pipeline, UI, conflict handling)
  - **Phase 4** — Semantic editing для Diagram Facades (patch pipeline, UI, conflict handling)
  - **Phase 5** — Hardening, integration tests, UX stabilization
- Прошёл review плана: разбиты крупные микрозадачи до ≤3 файлов, тесты включены в Phase 1, agent assets размещены в `packages/agents/*/assets/`

### Statusline fix
- Исправлен скрипт `~/.claude/statusline_with_tokens.js` — context limit для 1M моделей (Opus 4.6, Sonnet 4) теперь корректный вместо default 158K

## Git commits
- `2b0f2afd docs(workflow): add interactive diagram DSL architecture and execution plan`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `AGENTS.md`
2. `doc/SolidWorks-WorkFlow/README.md`
3. `doc/SolidWorks-WorkFlow/Docs_Index.md`
4. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
5. `doc/SolidWorks-WorkFlow/Plans/DiagramSteps_InteractiveDSL_Architecture.md` (ARCHITECTURE DOC)
6. `doc/TODO/todo-plan.md` (EXECUTION PLAN)
7. `doc/Sessions/Session083.md` (THIS REPORT)

## Plans for next session
- Начать реализацию **Phase 1** из `todo-plan.md`:
  - Stream 1: создать `MarkdownDslParser` с типами и тестами (module map → facade map → strict errors)
  - Stream 2: создать `MarkdownDslSerializer` и `DiagramRevision` с roundtrip тестами
  - Stream 3: реализовать `BaselineDiffService` и `ChangeSummary` types
  - Stream 4: создать agent facade stubs и prompt pack assembly
  - Stream 5: атомарная миграция artifact paths и создание agent asset packs
  - Stream 6: обновить SSOT docs
  - Stream 7: release build и verification
