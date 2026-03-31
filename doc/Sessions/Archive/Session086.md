# Session 086 — Diagram Contract Corrective Release

**Date:** 2026-03-16 18:22 (CET)
**Branch:** main
**Version:** 1.1.733

---

# 1. Work Done in This Session

## Work summary
- Разобран фидбек по релизу `1.1.732`: установленный runtime не мог корректно обслуживать Diagram Modules / Facades, потому что `build-core.sh` не доставлял diagram agent asset packs в core runtime, а локальный `~/.codeai-hub/templates/**` продолжал хранить legacy Mermaid templates.
- Исправлен release/runtime surface: `build-core.sh` теперь включает `packages/agents/diagram-modules-agent/` и `packages/agents/diagram-facades-agent/` в установленный core runtime. Проверка после таргетной сборки подтвердила наличие `module-map-prompt.md`, `module-map-template.md`, `facade-map-prompt.md`, `facade-map-template.md` в `~/.codeai-hub/core/darwin-arm64/1.1.733/agents/**/assets/`.
- Исправлен template cache cleanup: `TemplateSyncService` теперь удаляет stale legacy files `modules-diagram-prompt.md`, `modules-diagram-template.mmd`, `facades-graph-prompt.md`, `facades-graph-template.mmd`; добавлен unit test на удаление этих файлов.
- Release-facing docs синхронизированы под corrective test release `1.1.733`.
- Выполнен corrective release cycle:
  - `./scripts/build-all.sh` поднял версию до `1.1.733` и пересобрал provider/core/ui/launcher artifacts;
  - `./scripts/build-release.sh --use-current-version` завершился успешно;
  - VSIX собран: `codeai-hub-1.1.733.vsix`.
- После ручной проверки `1.1.733` подтверждено, что `Virtual Simulation` остаётся валидным upstream шагом, но bootstrap новой agent session для `Diagram Modules` всё ещё не стартует. Этот blocker зафиксирован как отложенный: дальнейшая диагностика session bootstrap path переносится после продвижения `Phase 2`.

## Manual verification checklist for 1.1.733
- Установить `codeai-hub-1.1.733.vsix` и полностью перезапустить VS Code, чтобы `TemplateSyncService` отработал на старом home cache.
- Проверить, что файлы `~/.codeai-hub/templates/diagram_modules/modules-diagram-prompt.md`, `~/.codeai-hub/templates/diagram_modules/modules-diagram-template.mmd`, `~/.codeai-hub/templates/diagram_facades/facades-graph-prompt.md`, `~/.codeai-hub/templates/diagram_facades/facades-graph-template.mmd` больше не существуют.
- Открыть Project Manager и проверить, что toolbar step `Diagram Modules` действительно запускает agent session.
- Проверить, что toolbar step `Diagram Facades` тоже стартует по новому Markdown DSL contract.
- Убедиться, что панели/tree по-прежнему открывают `module-map.md` и `facade-map.md`, а не legacy `.mmd`.
- Если старт сессии всё ещё не работает, следующим шагом проверить уже не template assets, а actual session bootstrap path в PM/runtime bridge.

## Git commits
- `9c35f4ad fix(release): ship diagram agent assets with core runtime`
- `d6702846 fix(core): clean up legacy diagram templates`
- `f0a1175b docs(release): prep diagram contract corrective release`
- `60f6c07d chore(release): build diagram contract corrective release`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `AGENTS.md`
2. `doc/SolidWorks-WorkFlow/README.md`
3. `doc/SolidWorks-WorkFlow/Docs_Index.md`
4. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
5. `doc/TODO/todo-plan.md`
6. `doc/Sessions/Archive/Session086.md` (THIS REPORT)
7. `doc/SolidWorks-WorkFlow/Plans/DiagramSteps_InteractiveDSL_Architecture.md`

## Plans for next session
- Ручной feedback по `1.1.733` уже получен: template/runtime fixes дошли, но bootstrap `Diagram Modules` / `Diagram Facades` остаётся сломанным.
- Не тратить следующий стрим на повторную диагностику запуска; продолжить `Phase 2 — visual shell with React Flow and ELK` со stream `Graph adapters`.
- После продвижения visual shell вернуться к session bootstrap blocker и оформить отдельный список багов/недоработок по diagram workflow.
