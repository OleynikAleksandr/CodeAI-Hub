# SolidWorks-Flow (CodeAI Hub)

Эта папка — **единый поток документации** для CodeAI Hub с уклоном в FLOW-приложение (Project Manager / Workflow Tree). Здесь живут:
- системная архитектура (source of truth),
- стеки модулей/провайдеров,
- workflow file-first контракты,
- UI/UX и runtime-контракты SolidWorks‑подобного Workflow Tree.

---

## Структура

- `System/` — системные документы (source of truth, навигация, shared контракты)
- `Archive/` — исторические чеклисты/дизайн-черновики (не source of truth)
- `Stacks/` — документация по модулям (Core/Claude/Codex/Gemini/UI/Launcher)
- `Workflow/` — workflow file-first, watcher, шаги
- `Architecture/` — UI/UX архитектура Workflow Tree (узлы, шаги, правила)
- `WorkspaceRuntime/` — wire‑контракты и layered архитектура multi-workspace runtime
- `SessionContinuity/` — continuity/rollover (Core‑контракты + FLOW‑аспекты)
- `knowledge/` — практические руководства и справочники

---

## Быстрый доступ

- Архитектура (source of truth): `doc/SolidWorks-Flow/System/SystemArchitecture.md`
- Стеки: `doc/SolidWorks-Flow/Stacks/`
- Workflow file-first: `doc/SolidWorks-Flow/Workflow/Workflow_CLI_Steps_And_Watcher_Architecture.md`
- Description → Reviewer: `doc/SolidWorks-Flow/Architecture/DescriptionNode_ReviewSession_Architecture.md`
- Workspace Runtime: `doc/SolidWorks-Flow/WorkspaceRuntime/WorkspaceRuntime.md`

---

## Операционные пометки

- Gemini: сценарий `Description(one-shot) -> Reviewer(resume)` подтверждён в `1.1.538`, но дальнейшие Gemini‑расширения заморожены до появления надёжной telemetry remaining context window. Источник правды: `doc/SolidWorks-Flow/Stacks/Gemini_Reviewer_Resume_Architecture.md`.
