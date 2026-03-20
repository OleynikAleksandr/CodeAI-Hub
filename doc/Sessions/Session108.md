# Session 108 — Formal Module/Cluster/Facade Discussion For AI-First Architecture

**Date:** 2026-03-20 12:49 (CET)
**Branch:** main
**Version:** 1.1.753
**HEAD at session start:** `5ed2481a docs(session): record codex resume recovery verification`

---

# 1. Work Done in This Session

## Work summary

- Пользователь подтвердил, что локальный release `1.1.753` протестирован и текущий bugfix recovery/reopen работает корректно.
- Повторно открыт artifact-контекст в mirrored workspace:
  - `questionnaire.md`
  - `Final_Description.md`
  - `virtual-simulation.md`
  - `diagram_modules/module-inventory.md`
- Подтверждено, что `Diagram Modules` visual graph может рендериться даже при отсутствии `module-map.flow.json`: base projection materialize-ится напрямую из `module-inventory.md`, а `*.flow.json` выступает только как optional layout sidecar.
- На пользовательском скриншоте и в коде подтвержден fallback-layout defect:
  - standalone modules накладываются на cluster columns;
  - vertical placement не учитывает variable-height cards;
  - диаграмма на первом открытии выглядит плохо читаемой даже без semantic ошибки в artifact.
- Обсуждение ушло глубже самой раскладки: было зафиксировано, что проблема диаграммы не только visual, но и архитектурная — current `cluster` / `module` semantics слишком слабо materialized в кодовой базе.
- Создан новый planning-doc под user-facing layout/format диаграмм:
  - `doc/SolidWorks-WorkFlow/Plans/Diagram_UserFacing_Layout_And_Format_Architecture.md`
- Создан отдельный planning-doc под формальную grammar платформы:
  - `doc/SolidWorks-WorkFlow/Plans/Formal_Module_Cluster_Facade_Architecture.md`
- Заархивирован завершенный previous execution plan `Phase 17`, а active `todo-plan.md` переключён на `Phase 18`.

## Main discussion outcome

Главный результат этой сессии — не код, а осознанный сдвиг архитектурной позиции.

### Starting question

Обсуждение началось с seemingly-simple вопроса:
- почему visual diagram не имеет sidecar JSON, но всё равно рисуется;
- кто задаёт координаты и размеры node-ов;
- почему некоторые карточки налезают друг на друга.

Это привело к более фундаментальному вопросу:
- почему сама диаграмма, даже когда она рендерится, почти ничего не сообщает пользователю о реальной архитектуре системы.

### Core reasoning path

В диалоге была последовательно пройдена такая цепочка:

1. `Cluster` не должен оставаться чисто смысловой или документной сущностью.
2. Если архитектурная сущность не materialized в кодовой базе, её невозможно уверенно валидировать алгоритмом.
3. Всё, что нельзя валидировать алгоритмом, нельзя надёжно навязать AI-агенту как обязательную дисциплину.
4. Значит для AI-first deterministic platform мягкая "размазанная" modularity недостаточна.
5. Следовательно, и `Module`, и `Cluster` должны иметь materialized facade-based границы.

### Agreed baseline

В конце обсуждения зафиксирован baseline, от которого стоит продолжать следующие сессии:

- `Module` — минимальная формальная архитектурная единица.
- У formal module обязан быть свой `Module Facade`.
- Просто папка с несколькими связанными модулями — это не cluster, а только `Module Group`.
- `Cluster` — только формализованная архитектурная единица более высокого уровня.
- У formal cluster обязан быть свой `Cluster Facade`.
- `boundary.md` или любой текстовый manifest сам по себе слишком слаб как основной носитель границы; документ допустим только как supplementary layer.

Короткая формула, согласованная в этой сессии:

- `нет facade -> нет formal module`
- `нет cluster facade -> нет formal cluster`

## Why this matters for the platform, not only for this repo

Пользователь явно зафиксировал, что цель обсуждения шире текущего проекта:
- строится не только одно приложение;
- строится новая AI-assisted / AI-driven среда разработки;
- этой средой должны пользоваться инженеры, архитекторы и дизайнеры, которые могут не быть программистами;
- поэтому архитектурные сущности должны быть:
  - детерминированы,
  - машинно проверяемы,
  - понятны без догадок,
  - выражены не только в документации, но и в структуре кодовой базы.

Именно это стало основанием для более жёсткой позиции, чем в классических "мягких" трактовках modularity.

## Current repository observations that fed the discussion

Отдельно было подтверждено, что слово `module` уже используется в кодовой базе в нескольких разных смыслах:

- deployable/package modules в `packages/*`;
- внутренние module-like подсистемы внутри `packages/core/src/*`;
- extension-host micro-modules в `src/extension-module/*`;
- UI modules в `src/client/ui/src/modules/*`;
- SSOT document-layer `Modules/*`.

Это важный контекст:
- перед дальнейшим кодом нужно отдельно определить, какой именно смысл слова `Module` станет каноническим для платформенной grammar.

## Files created or updated in this session

Created:

- `doc/SolidWorks-WorkFlow/Plans/Diagram_UserFacing_Layout_And_Format_Architecture.md`
- `doc/SolidWorks-WorkFlow/Plans/Formal_Module_Cluster_Facade_Architecture.md`
- `doc/TODO/Archive/todo-plan-phase17-codex-resume-recovery-2026-03-20.md`

Updated:

- `doc/TODO/todo-plan.md`

## Git commits

- `b0eb2f09 docs(plan): start diagram layout and format scope`

> One final docs/session commit is being prepared to record this report and the finished handoff state.

---

# 2. Zero-Context Recovery For Next Session

## Required documents to open first

1. `AGENTS.md`
2. `doc/Sessions/Session106.md`
3. `doc/Sessions/Session107.md`
4. `doc/Sessions/Session108.md` (THIS REPORT)
5. `doc/SolidWorks-WorkFlow/README.md`
6. `doc/SolidWorks-WorkFlow/Docs_Index.md`
7. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
8. `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
9. `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_UserSurface_Architecture.md`
10. `doc/SolidWorks-WorkFlow/Plans/Diagram_UserFacing_Layout_And_Format_Architecture.md`
11. `doc/SolidWorks-WorkFlow/Plans/Formal_Module_Cluster_Facade_Architecture.md`
12. `doc/TODO/todo-plan.md`

## Mirrored workspace artifacts to reopen

1. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4/description/questionnaire.md`
2. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4/description/Final_Description.md`
3. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4/virtual_simulation/virtual-simulation.md`
4. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4/diagram_modules/module-inventory.md`

## Critical code files to reopen if the discussion continues

1. `src/client/project-manager/components/diagram-editor/use-diagram-loader.ts`
2. `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.ts`
3. `src/client/project-manager/components/diagram-editor/diagram-editor-facade.tsx`
4. `src/client/project-manager/components/diagram-editor/flow-sidecar-types.ts`
5. `src/client/project-manager/components/diagram-editor/use-diagram-persistence.ts`

## The exact state of the discussion at session end

At the end of this session we are still in architecture discussion mode.

Important:
- no production code changes were made yet for the diagram runtime;
- no layout algorithm was changed yet;
- no module/cluster grammar was implemented yet in the codebase;
- the conversation moved from "fix overlapping diagram cards" to "define formal architecture grammar for future AI-driven development".

So the next session should not begin by coding.
It should begin by continuing and finalizing the architectural grammar discussion.

## Key paradigm to preserve

The central paradigm agreed in this session is:

**Formalization enables algorithmization.**  
**Algorithmization enables architectural gates.**  
**Architectural gates are required for reliable AI-first development.**

Practical interpretation:
- soft, document-only entities are too weak;
- anything important enough to govern AI behavior should be materialized in code;
- therefore both modules and clusters likely need facade-based formal gates.

## Concrete next questions to continue from

1. What exactly should count as the canonical meaning of `Module` in the platform grammar?
2. How should package-level modules, internal modules, and UI/extension micro-modules be reconciled or renamed?
3. What exact naming rules should be enforced for:
   - `Module Facade`
   - `Cluster Facade`
4. Must `Cluster Facade` always be one file/class, or can it be a boundary submodule with one clear entry point?
5. How should the future diagram represent only formal entities, not loose analytical labels?
6. After grammar is finalized, should we refactor the current repo toward it, or first adapt diagram generation and planning workflow?

## Recommended next-session opening

If the next session starts from zero context, the safest first prompt to self is:

> We are no longer discussing only a layout bug. We are defining a formal, machine-checkable architecture grammar for an AI-first development platform, starting from the distinction between Module, Module Group, Cluster, Module Facade, and Cluster Facade.

That sentence correctly restores the real level of the discussion.
