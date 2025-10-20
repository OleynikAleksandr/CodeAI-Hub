# Development TODO Plan

## Legend
- TODO — задача запланирована
- IN_PROGRESS — работа ведётся
- BLOCKED — требуется внешнее действие
- DONE — задача завершена

## Phase 8 — Session chrome polish (owner: Codex, updated: 2025-10-20)
- [DONE] Align Action Bar with webview edges, remove residual gutters and synchronise base background (`rgba(31, 31, 31, 1)`) across HTML, CSS and React bundle.
  - Notes: Action Bar рельсы переведены на двутон `#505356 → #18191B`, `WebviewHtmlGenerator` обновлён, VSIX пересобран.
- [DONE] Refine provider picker actions (status copy aligned left, `Cancel`/`Start session` grouped on the right) and lock session grid to a single column on any width.
  - Notes: обновлены `provider-picker.tsx`, `media/main-view.css`, соответствующие изменения зафиксированы в архитектурной документации.
- [TODO] Redesign empty state imagery to match the refreshed chrome once дизайн-бриф утверждён.
  - Notes: требуется макет; на время ожидания использована прежняя прозрачная заглушка.

## Backlog / Parking Lot
- [TODO] Уточнить roadmap по Thinking UI (новый фокус-паттерн и подсказки) после ревью цветовой схемы.
